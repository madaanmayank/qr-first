import {
  QrError,
  TAX_CLASS_ALCOHOL,
  TAX_CLASS_STANDARD,
  TAG_MRP,
  type Charge,
  type Discount,
  type MenuIndex,
  type OrderType,
  type PricedLine,
  type PricedTab,
  type Selection,
  type StoreConfig,
  type TaxClassDef,
  type TaxLine,
  type TipInput,
  type CartLine,
  type LineSnapshot,
} from '@qr-first/contracts';
import { allocate, percentToBp, roundDiv, roundToRupee } from './money';
import type { PricingContext } from './context';

/** Tax class table from the `tax` setting (docs/15 section 2) and the state VAT rate. */
export function defaultTaxClasses(config: StoreConfig, stateVatRateBp?: number): Record<string, TaxClassDef> {
  const { registration, ratePercent } = config.settings.tax;
  const table: Record<string, TaxClassDef> = {
    [TAX_CLASS_STANDARD]:
      registration === 'registered' ? { kind: 'gst', rateBp: percentToBp(ratePercent) } : { kind: 'none' },
  };
  if (stateVatRateBp !== undefined) table[TAX_CLASS_ALCOHOL] = { kind: 'vat', rateBp: stateVatRateBp };
  return table;
}

/** A line as the engine prices it. `snapshot` wins over the menu: sent lines keep their send-time price. */
export interface PriceLineInput extends CartLine {
  voided?: boolean;
  snapshot?: LineSnapshot | undefined;
}

export interface PriceTabInput {
  orderType: OrderType;
  lines: readonly PriceLineInput[];
  discounts?: readonly Discount[];
  tip?: TipInput | undefined;
  /** Remove the optional service charge with one tap (docs/15 section 5). */
  serviceChargeWaived?: boolean;
}

export interface ResolvedLine {
  lineId: string;
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  baseUnitPrice: number;
  taxClass: string;
  mrp: boolean;
}

function optionDeltaOf(menu: MenuIndex, selections: readonly Selection[], itemId: string): number {
  let total = 0;
  for (const sel of selections) {
    const group = menu.optionGroups[sel.groupId];
    if (!group) throw new QrError('OPTION_GROUP_UNKNOWN', undefined, { itemId, groupId: sel.groupId });
    for (const picked of sel.options) {
      const option = group.options.find((o) => o.id === picked.optionId);
      if (!option) throw new QrError('OPTION_UNKNOWN', undefined, { itemId, groupId: sel.groupId, optionId: picked.optionId });
      total += option.priceDelta;
      if (picked.children) total += optionDeltaOf(menu, picked.children, itemId);
    }
  }
  return total;
}

/** Price of one line: takeaway-aware base price plus every selected option delta, nested ones included. */
export function resolveLine(menu: MenuIndex, line: PriceLineInput, orderType: OrderType): ResolvedLine {
  if (!Number.isInteger(line.qty) || line.qty < 1) {
    throw new QrError('QUANTITY_INVALID', undefined, { lineId: line.lineId, qty: line.qty });
  }
  if (line.snapshot) {
    const s = line.snapshot;
    return {
      lineId: line.lineId,
      itemId: line.itemId,
      name: s.name,
      qty: line.qty,
      unitPrice: s.unitPrice,
      baseUnitPrice: s.baseUnitPrice,
      taxClass: s.taxClass,
      mrp: s.mrp,
    };
  }
  const item = menu.items[line.itemId];
  if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: line.itemId });
  if (item.storeId !== menu.storeId) throw new QrError('STORE_MISMATCH', undefined, { itemId: item.id });
  const base = orderType === 'takeaway' && item.takeawayPrice !== undefined ? item.takeawayPrice : item.basePrice;
  const delta = optionDeltaOf(menu, line.selections, item.id);
  return {
    lineId: line.lineId,
    itemId: item.id,
    name: item.name,
    qty: line.qty,
    unitPrice: base + delta,
    baseUnitPrice: base,
    taxClass: item.taxClass,
    mrp: item.tags.includes(TAG_MRP),
  };
}

/** Snapshot to store on a line when its round is sent (docs/17 section 3). */
export function snapshotLine(menu: MenuIndex, line: PriceLineInput, orderType: OrderType): LineSnapshot {
  const r = resolveLine(menu, line, orderType);
  const item = menu.items[line.itemId];
  return {
    name: r.name,
    unitPrice: r.unitPrice,
    baseUnitPrice: r.baseUnitPrice,
    taxClass: r.taxClass,
    mrp: r.mrp,
    ...(item ? { station: item.station } : {}),
  };
}

interface ClassBucket {
  key: string;
  def: TaxClassDef;
  /** Sum of net line values (tax-inclusive when prices are inclusive). */
  net: number;
  /** Net of MRP lines, which carry no service charge. */
  netMrp: number;
}

/**
 * The one server function that prices a tab (docs/03 section 5). Pure, integer paise.
 *
 * Order of work:
 * 1. Line totals: (base or takeaway price + option deltas) x qty. Voided lines are skipped.
 * 2. Discounts, in order, each clamped to what is left, spread over lines by largest remainder.
 * 3. Net values grouped by tax class. Inclusive prices are split into taxable value and tax.
 * 4. Optional service charge on the taxable value of non-MRP lines, per class, taxed with its class.
 * 5. Tax per class: GST as CGST plus SGST, state VAT as one line.
 * 6. Tip, outside the taxable value.
 * 7. Round off to the nearest rupee as its own line.
 */
export function priceTab(tab: PriceTabInput, ctx: PricingContext): PricedTab {
  const { config, menu } = ctx;
  const { registration, inclusive } = config.settings.tax;
  const table = ctx.taxClasses ?? defaultTaxClasses(config, ctx.stateVatRateBp);

  // 1. Lines
  const live = tab.lines.filter((l) => !l.voided).map((l) => resolveLine(menu, l, tab.orderType));
  const lineTotals = live.map((l) => l.unitPrice * l.qty);
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);

  // 2. Discounts
  const remaining = [...lineTotals];
  const discountCharges: Charge[] = [];
  let discountTotal = 0;
  const perLineDiscount = live.map(() => 0);
  for (const d of tab.discounts ?? []) {
    const eligible = live
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => d.scope === 'tab' || d.scope.lineIds.includes(l.lineId));
    const base = eligible.reduce((a, { i }) => a + remaining[i]!, 0);
    const wanted = d.kind === 'percent' ? roundDiv(base * d.value, 10_000) : d.value;
    const amount = Math.min(wanted, base);
    if (amount <= 0) continue;
    const shares = allocate(amount, eligible.map(({ i }) => remaining[i]!));
    eligible.forEach(({ i }, k) => {
      remaining[i]! -= shares[k]!;
      perLineDiscount[i]! += shares[k]!;
    });
    discountTotal += amount;
    discountCharges.push({ type: 'discount', label: d.label, amount: -amount });
  }

  // 3. Group by tax class
  const buckets = new Map<string, ClassBucket>();
  live.forEach((l, i) => {
    const def = table[l.taxClass];
    if (!def) throw new QrError('TAX_CLASS_UNKNOWN', `No tax class "${l.taxClass}" is defined for this store.`, { taxClass: l.taxClass, lineId: l.lineId });
    // A store that is not GST registered never charges GST, whatever the table says.
    const effective: TaxClassDef = def.kind === 'gst' && registration !== 'registered' ? { kind: 'none' } : def;
    const b = buckets.get(l.taxClass) ?? { key: l.taxClass, def: effective, net: 0, netMrp: 0 };
    b.net += remaining[i]!;
    if (l.mrp) b.netMrp += remaining[i]!;
    buckets.set(l.taxClass, b);
  });

  const serviceBp = tab.serviceChargeWaived ? 0 : percentToBp(config.settings.serviceCharge);
  const taxLines: TaxLine[] = [];
  const taxCharges: Charge[] = [];
  let serviceCharge = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let vatTotal = 0;
  let taxAdded = 0;
  let taxableLinesTotal = 0;

  for (const b of buckets.values()) {
    const rateBp = b.def.kind === 'none' ? 0 : b.def.rateBp;
    const taxed = b.def.kind !== 'none';
    const toTaxable = (gross: number) => (inclusive && taxed ? roundDiv(gross * 10_000, 10_000 + rateBp) : gross);

    const taxableLines = toTaxable(b.net);
    const lineTax = inclusive && taxed ? b.net - taxableLines : 0;
    taxableLinesTotal += taxableLines;

    // 4. Service charge, on the taxable value of non-MRP lines in this class.
    const scBase = toTaxable(b.net - b.netMrp);
    const sc = serviceBp > 0 ? roundDiv(scBase * serviceBp, 10_000) : 0;
    serviceCharge += sc;

    if (!taxed) continue;

    // 5. Tax on lines plus service charge
    const taxable = taxableLines + sc;
    const scTax = roundDiv(sc * rateBp, 10_000);
    if (b.def.kind === 'gst') {
      let cgst: number;
      let sgst: number;
      let tax: number;
      if (inclusive) {
        // Tax inside the prices is shown but not added. Tax on the service charge is added.
        const cgstL = roundDiv(lineTax, 2);
        const cgstS = roundDiv(scTax, 2);
        cgst = cgstL + cgstS;
        sgst = lineTax - cgstL + (scTax - cgstS);
        tax = lineTax + scTax;
        taxAdded += scTax;
        taxCharges.push(
          { type: 'cgst', label: `CGST ${rateBp / 200}% (included)`, amount: cgstL, taxClass: b.key, included: true },
          { type: 'sgst', label: `SGST ${rateBp / 200}% (included)`, amount: lineTax - cgstL, taxClass: b.key, included: true },
        );
        if (scTax > 0) {
          taxCharges.push(
            { type: 'cgst', label: `CGST ${rateBp / 200}% on service charge`, amount: cgstS, taxClass: b.key },
            { type: 'sgst', label: `SGST ${rateBp / 200}% on service charge`, amount: scTax - cgstS, taxClass: b.key },
          );
        }
      } else {
        cgst = roundDiv(taxable * rateBp, 20_000);
        sgst = cgst;
        tax = cgst + sgst;
        taxAdded += tax;
        taxCharges.push(
          { type: 'cgst', label: `CGST ${rateBp / 200}%`, amount: cgst, taxClass: b.key },
          { type: 'sgst', label: `SGST ${rateBp / 200}%`, amount: sgst, taxClass: b.key },
        );
      }
      cgstTotal += cgst;
      sgstTotal += sgst;
      taxLines.push({ taxClass: b.key, kind: 'gst', rateBp, taxableValue: taxable, cgst, sgst, tax });
    } else {
      const tax = inclusive ? lineTax + scTax : roundDiv(taxable * rateBp, 10_000);
      vatTotal += tax;
      taxLines.push({ taxClass: b.key, kind: 'vat', rateBp, taxableValue: taxable, vat: tax, tax });
      if (inclusive) {
        taxAdded += scTax;
        taxCharges.push({ type: 'vat', label: `VAT ${rateBp / 100}% (included)`, amount: lineTax, taxClass: b.key, included: true });
        if (scTax > 0) taxCharges.push({ type: 'vat', label: `VAT ${rateBp / 100}% on service charge`, amount: scTax, taxClass: b.key });
      } else {
        taxAdded += tax;
        taxCharges.push({ type: 'vat', label: `VAT ${rateBp / 100}%`, amount: tax, taxClass: b.key });
      }
    }
  }

  const taxTotal = cgstTotal + sgstTotal + vatTotal;

  // 6. Tip
  const tip = !tab.tip
    ? 0
    : tab.tip.kind === 'amount'
      ? tab.tip.paise
      : roundDiv(taxableLinesTotal * tab.tip.bp, 10_000);

  // 7. Round off
  const beforeRound = subtotal - discountTotal + serviceCharge + taxAdded + tip;
  const roundOff = roundToRupee(beforeRound) - beforeRound;
  const total = beforeRound + roundOff;

  const lines: PricedLine[] = live.map((l, i) => ({
    lineId: l.lineId,
    itemId: l.itemId,
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
    baseUnitPrice: l.baseUnitPrice,
    optionsUnitTotal: l.unitPrice - l.baseUnitPrice,
    lineTotal: lineTotals[i]!,
    discount: perLineDiscount[i]!,
    net: remaining[i]!,
    taxClass: l.taxClass,
    mrp: l.mrp,
  }));

  const charges: Charge[] = [...discountCharges];
  if (serviceCharge > 0) charges.push({ type: 'service_charge', label: 'Service charge (optional)', amount: serviceCharge });
  charges.push(...taxCharges);
  if (tip > 0) charges.push({ type: 'tip', label: 'Tip', amount: tip });
  if (roundOff !== 0) charges.push({ type: 'round_off', label: 'Round off', amount: roundOff });

  return {
    currency: 'INR',
    orderType: tab.orderType,
    lines,
    subtotal,
    discountTotal,
    serviceCharge,
    taxLines,
    cgstTotal,
    sgstTotal,
    vatTotal,
    taxTotal,
    taxInclusive: inclusive,
    taxAdded,
    tip,
    roundOff,
    total,
    taxNotice: registration === 'composition' ? 'composition' : null,
    charges,
  };
}
