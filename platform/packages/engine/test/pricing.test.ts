import { describe, it, expect } from 'vitest';
import { QrError, type Discount, type PricedTab } from '@qr-first/contracts';
import { priceTab, resolveLine, roundDiv, roundToRupee, allocate, type PriceTabInput } from '../src';
import { comboSelections, line, makeConfig, makeCtx, makeMenu, pick } from './fixtures';

type Run = {
  name: string;
  lines: ReturnType<typeof line>[];
  orderType?: 'dine_in' | 'takeaway';
  cfg?: Parameters<typeof makeConfig>[1];
  discounts?: Discount[];
  tip?: PriceTabInput['tip'];
  waived?: boolean;
  noVat?: boolean;
  expect: Partial<{
    subtotal: number;
    discountTotal: number;
    serviceCharge: number;
    taxTotal: number;
    taxAdded: number;
    cgstTotal: number;
    sgstTotal: number;
    vatTotal: number;
    tip: number;
    roundOff: number;
    total: number;
  }>;
};

const pct = (id: string, bp: number, scope: Discount['scope'] = 'tab'): Discount => ({ id, label: id, kind: 'percent', value: bp, scope });
const flat = (id: string, paise: number, scope: Discount['scope'] = 'tab'): Discount => ({ id, label: id, kind: 'amount', value: paise, scope });

function run(c: Run): PricedTab {
  const ctx = makeCtx({ config: makeConfig('hybrid', c.cfg) });
  return priceTab(
    { orderType: c.orderType ?? 'dine_in', lines: c.lines, discounts: c.discounts ?? [], tip: c.tip, serviceChargeWaived: c.waived ?? false },
    ctx,
  );
}

/**
 * Every expected number below is worked out by hand in paise, not taken from the code.
 * GST 5 percent exclusive unless the case says otherwise: CGST = SGST = round half up of taxable / 40.
 */
const CASES: Run[] = [
  { name: '01 one chai', lines: [line('l1', 'chai')], expect: { subtotal: 8000, taxTotal: 400, cgstTotal: 200, sgstTotal: 200, roundOff: 0, total: 8400 } },
  { name: '02 galouti', lines: [line('l1', 'galouti')], expect: { subtotal: 42000, taxTotal: 2100, roundOff: 0, total: 44100 } },
  { name: '03 quantity two', lines: [line('l1', 'seekh', 2)], expect: { subtotal: 76000, taxTotal: 3800, total: 79800 } },
  { name: '04 two lines', lines: [line('l1', 'galouti'), line('l2', 'chai')], expect: { subtotal: 50000, taxTotal: 2500, total: 52500 } },
  { name: '05 round off down (26 paise)', lines: [line('l1', 'samosa')], expect: { taxTotal: 226, roundOff: -26, total: 4700 } },
  { name: '06 round off, exactly 50 paise rounds up', lines: [line('l1', 'pakora')], expect: { taxTotal: 250, roundOff: 50, total: 5300 } },
  { name: '07 round off up (44 paise)', lines: [line('l1', 'jalebi')], expect: { taxTotal: 256, roundOff: 44, total: 5400 } },
  {
    name: '08 options: large size and oat milk',
    lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_size_l'), pick('g_milk', 'o_oat')])],
    expect: { subtotal: 28000, taxTotal: 1400, total: 29400 },
  },
  {
    name: '09 two coffees with two add-ons, half rounds up',
    lines: [line('l1', 'cold_coffee', 2, [pick('g_size', 'o_size_s'), pick('g_addons', 'o_shot', 'o_syrup')])],
    expect: { subtotal: 47000, taxTotal: 2350, roundOff: 50, total: 49400 },
  },
  { name: '10 half portion has a negative delta', lines: [line('l1', 'butter_chicken', 1, [pick('g_portion', 'o_half')])], expect: { subtotal: 37000, taxTotal: 1850, roundOff: 50, total: 38900 } },
  { name: '11 takeaway price', orderType: 'takeaway', lines: [line('l1', 'galouti')], expect: { subtotal: 40000, taxTotal: 2000, total: 42000 } },
  { name: '12 takeaway with no takeaway price uses the base price', orderType: 'takeaway', lines: [line('l1', 'seekh')], expect: { subtotal: 38000, total: 39900 } },
  {
    name: '13 takeaway keeps option deltas',
    orderType: 'takeaway',
    lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_size_m')])],
    expect: { subtotal: 21000, taxTotal: 1050, roundOff: 50, total: 22100 },
  },
  { name: '14 ten percent discount', lines: [line('l1', 'galouti')], discounts: [pct('d1', 1000)], expect: { discountTotal: 4200, taxTotal: 1890, roundOff: 10, total: 39700 } },
  {
    name: '15 flat discount split by largest remainder',
    lines: [line('l1', 'seekh'), line('l2', 'chai')],
    discounts: [flat('d1', 5000)],
    expect: { subtotal: 46000, discountTotal: 5000, taxTotal: 2050, roundOff: 50, total: 43100 },
  },
  { name: '16 discount cannot exceed the tab', lines: [line('l1', 'chai')], discounts: [flat('d1', 100000)], expect: { discountTotal: 8000, taxTotal: 0, total: 0 } },
  {
    name: '17 discount on one line only',
    lines: [line('l1', 'galouti'), line('l2', 'chai')],
    discounts: [pct('d1', 5000, { lineIds: ['l2'] })],
    expect: { discountTotal: 4000, taxTotal: 2300, total: 48300 },
  },
  { name: '18 two discounts stack in order', lines: [line('l1', 'galouti')], discounts: [pct('d1', 1000), flat('d2', 1000)], expect: { discountTotal: 5200, taxTotal: 1840, roundOff: -40, total: 38600 } },
  { name: '19 service charge 10 percent is taxed with the food', cfg: { serviceCharge: 10 }, lines: [line('l1', 'galouti')], expect: { serviceCharge: 4200, taxTotal: 2310, roundOff: -10, total: 48500 } },
  { name: '20 service charge waived with one tap', cfg: { serviceCharge: 10 }, waived: true, lines: [line('l1', 'galouti')], expect: { serviceCharge: 0, total: 44100 } },
  { name: '21 MRP item carries no service charge', cfg: { serviceCharge: 10 }, lines: [line('l1', 'water'), line('l2', 'chai')], expect: { serviceCharge: 800, taxTotal: 540, roundOff: -40, total: 11300 } },
  {
    name: '22 service charge is worked on the discounted value',
    cfg: { serviceCharge: 10 },
    lines: [line('l1', 'galouti')],
    discounts: [pct('d1', 1000)],
    expect: { discountTotal: 4200, serviceCharge: 3780, taxTotal: 2080, roundOff: 40, total: 43700 },
  },
  { name: '23 inclusive GST on chai', cfg: { tax: { inclusive: true } }, lines: [line('l1', 'chai')], expect: { subtotal: 8000, taxTotal: 381, cgstTotal: 191, sgstTotal: 190, taxAdded: 0, roundOff: 0, total: 8000 } },
  { name: '24 inclusive GST on galouti', cfg: { tax: { inclusive: true } }, lines: [line('l1', 'galouti')], expect: { taxTotal: 2000, cgstTotal: 1000, sgstTotal: 1000, taxAdded: 0, total: 42000 } },
  {
    name: '25 inclusive GST with service charge: only the tax on the charge is added',
    cfg: { tax: { inclusive: true }, serviceCharge: 10 },
    lines: [line('l1', 'galouti')],
    expect: { serviceCharge: 4000, taxTotal: 2200, taxAdded: 200, cgstTotal: 1100, sgstTotal: 1100, total: 46200 },
  },
  { name: '26 inclusive with a discount', cfg: { tax: { inclusive: true } }, lines: [line('l1', 'galouti')], discounts: [flat('d1', 2100)], expect: { discountTotal: 2100, taxTotal: 1900, total: 39900 } },
  { name: '27 unregistered store charges no GST', cfg: { gst: 'unregistered', tax: { registration: 'unregistered', ratePercent: 0 } }, lines: [line('l1', 'galouti')], expect: { taxTotal: 0, total: 42000 } },
  { name: '28 composition store shows no tax line', cfg: { gst: 'composition', tax: { registration: 'composition', ratePercent: 0 } }, lines: [line('l1', 'galouti')], expect: { taxTotal: 0, total: 42000 } },
  { name: '29 GST at 18 percent', cfg: { tax: { ratePercent: 18 } }, lines: [line('l1', 'galouti')], expect: { taxTotal: 7560, cgstTotal: 3780, sgstTotal: 3780, roundOff: 40, total: 49600 } },
  { name: '30 alcohol on its own state VAT class', lines: [line('l1', 'beer')], expect: { subtotal: 35000, vatTotal: 7000, cgstTotal: 0, taxTotal: 7000, total: 42000 } },
  { name: '31 food and alcohol on one tab', lines: [line('l1', 'galouti'), line('l2', 'beer')], expect: { subtotal: 77000, cgstTotal: 1050, sgstTotal: 1050, vatTotal: 7000, taxTotal: 9100, total: 86100 } },
  {
    name: '32 service charge on food and alcohol, each taxed with its class',
    cfg: { serviceCharge: 10 },
    lines: [line('l1', 'galouti'), line('l2', 'beer')],
    expect: { serviceCharge: 7700, cgstTotal: 1155, sgstTotal: 1155, vatTotal: 7700, taxTotal: 10010, roundOff: -10, total: 94700 },
  },
  { name: '33 tip as an amount', lines: [line('l1', 'chai')], tip: { kind: 'amount', paise: 1000 }, expect: { tip: 1000, taxTotal: 400, total: 9400 } },
  { name: '34 tip as a percent of the pre-tax value', lines: [line('l1', 'galouti')], tip: { kind: 'percent', bp: 1000 }, expect: { tip: 4200, taxTotal: 2100, total: 48300 } },
  { name: '35 tip is rounded with the total', lines: [line('l1', 'chai')], tip: { kind: 'amount', paise: 1234 }, expect: { tip: 1234, roundOff: -34, total: 9600 } },
  { name: '36 three-part combo with a nested option', lines: [line('l1', 'kebab_combo', 1, comboSelections())], expect: { subtotal: 74400, taxTotal: 3720, roundOff: -20, total: 78100 } },
  { name: '37 combo quantity two', lines: [line('l1', 'kebab_combo', 2, comboSelections())], expect: { subtotal: 148800, taxTotal: 7440, roundOff: -40, total: 156200 } },
  { name: '38 combo takeaway price with nested option', orderType: 'takeaway', lines: [line('l1', 'kebab_combo', 1, comboSelections())], expect: { subtotal: 69500, taxTotal: 3476, roundOff: 24, total: 73000 } },
  { name: '39 combo plus an alcohol line', lines: [line('l1', 'kebab_combo', 1, comboSelections()), line('l2', 'beer')], expect: { subtotal: 109400, cgstTotal: 1860, sgstTotal: 1860, vatTotal: 7000, taxTotal: 10720, roundOff: -20, total: 120100 } },
  { name: '40 empty tab', lines: [], expect: { subtotal: 0, taxTotal: 0, roundOff: 0, total: 0 } },
  { name: '41 voided line is left out', lines: [line('l1', 'galouti'), { ...line('l2', 'chai'), voided: true } as never], expect: { subtotal: 42000, total: 44100 } },
];

describe('priceTab, table driven', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = run(c);
      for (const [k, v] of Object.entries(c.expect)) expect(r[k as keyof PricedTab], k).toBe(v);

      // Properties that hold for every case.
      expect(r.total % 100, 'total is a whole number of rupees').toBe(0);
      expect(r.cgstTotal + r.sgstTotal + r.vatTotal).toBe(r.taxTotal);
      const additive = r.charges.filter((x) => !x.included).reduce((a, x) => a + x.amount, 0);
      expect(r.subtotal + additive, 'subtotal plus additive charges equals total').toBe(r.total);
      expect(r.lines.reduce((a, l) => a + l.net, 0) + r.discountTotal).toBe(r.subtotal);
      expect(r.total).toBeGreaterThanOrEqual(0);
    });
  }

  it('has at least 30 cases', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(30);
  });
});

describe('priceTab details', () => {
  it('shows round off as its own signed line and omits it when zero', () => {
    const r = run({ name: 'x', lines: [line('l1', 'samosa')], expect: {} });
    expect(r.charges.find((c) => c.type === 'round_off')?.amount).toBe(-26);
    const clean = run({ name: 'x', lines: [line('l1', 'chai')], expect: {} });
    expect(clean.charges.some((c) => c.type === 'round_off')).toBe(false);
  });

  it('groups tax lines by class and splits GST into CGST and SGST', () => {
    const r = run({ name: 'x', lines: [line('l1', 'galouti'), line('l2', 'beer')], expect: {} });
    expect(r.taxLines.map((t) => [t.taxClass, t.kind, t.rateBp, t.taxableValue])).toEqual([
      ['standard', 'gst', 500, 42000],
      ['alcohol_vat', 'vat', 2000, 35000],
    ]);
    expect(r.taxLines[0]).toMatchObject({ cgst: 1050, sgst: 1050, tax: 2100 });
    expect(r.taxLines[1]).toMatchObject({ vat: 7000, tax: 7000 });
  });

  it('labels the optional service charge and defaults it to zero', () => {
    const none = run({ name: 'x', lines: [line('l1', 'galouti')], expect: {} });
    expect(none.serviceCharge).toBe(0);
    const some = run({ name: 'x', cfg: { serviceCharge: 5 }, lines: [line('l1', 'galouti')], expect: {} });
    expect(some.charges.find((c) => c.type === 'service_charge')?.label).toContain('optional');
  });

  it('flags composition stores for the bill', () => {
    const r = run({ name: 'x', cfg: { gst: 'composition', tax: { registration: 'composition', ratePercent: 0 } }, lines: [line('l1', 'chai')], expect: {} });
    expect(r.taxNotice).toBe('composition');
    expect(run({ name: 'x', lines: [line('l1', 'chai')], expect: {} }).taxNotice).toBeNull();
  });

  it('never charges GST to an unregistered store even if the class table says gst', () => {
    const ctx = makeCtx({ config: makeConfig('hybrid', { gst: 'unregistered', tax: { registration: 'unregistered', ratePercent: 0 } }) });
    const r = priceTab({ orderType: 'dine_in', lines: [line('l1', 'chai')] }, { ...ctx, taxClasses: { standard: { kind: 'gst', rateBp: 500 } } });
    expect(r.taxTotal).toBe(0);
  });

  it('keeps the send-time snapshot price even if the menu price changes later', () => {
    const ctx = makeCtx();
    const snap = { name: 'Masala Chai', unitPrice: 9000, baseUnitPrice: 9000, taxClass: 'standard', mrp: false };
    const r = priceTab({ orderType: 'dine_in', lines: [{ ...line('l1', 'chai'), snapshot: snap }] }, ctx);
    expect(r.subtotal).toBe(9000);
    expect(r.lines[0]?.unitPrice).toBe(9000);
  });

  it('reports the per-line breakdown: base, options and discount share', () => {
    const r = run({
      name: 'x',
      lines: [line('l1', 'cold_coffee', 2, [pick('g_size', 'o_size_l'), pick('g_milk', 'o_oat')])],
      discounts: [flat('d', 1000)],
      expect: {},
    });
    expect(r.lines[0]).toMatchObject({ baseUnitPrice: 18000, optionsUnitTotal: 10000, unitPrice: 28000, lineTotal: 56000, discount: 1000, net: 55000 });
  });

  it('refuses an alcohol line when no state VAT rate is known', () => {
    const ctx = makeCtx({ stateVatRateBp: null });
    expect(() => priceTab({ orderType: 'dine_in', lines: [line('l1', 'beer')] }, ctx)).toThrowError(QrError);
    try {
      priceTab({ orderType: 'dine_in', lines: [line('l1', 'beer')] }, ctx);
    } catch (e) {
      expect((e as QrError).code).toBe('TAX_CLASS_UNKNOWN');
    }
  });

  it('rejects a quantity below one and unknown options or items', () => {
    const ctx = makeCtx();
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as QrError).code;
      }
      return 'none';
    };
    expect(code(() => priceTab({ orderType: 'dine_in', lines: [line('l1', 'chai', 0)] }, ctx))).toBe('QUANTITY_INVALID');
    expect(code(() => priceTab({ orderType: 'dine_in', lines: [line('l1', 'nope')] }, ctx))).toBe('ITEM_UNKNOWN');
    expect(code(() => priceTab({ orderType: 'dine_in', lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_nope')])] }, ctx))).toBe('OPTION_UNKNOWN');
    expect(code(() => priceTab({ orderType: 'dine_in', lines: [line('l1', 'cold_coffee', 1, [pick('g_nope', 'o_size_l')])] }, ctx))).toBe('OPTION_GROUP_UNKNOWN');
  });

  it('resolveLine rejects an item from another store', () => {
    const menu = makeMenu();
    menu.items.chai = { ...menu.items.chai!, storeId: 'someone_else' };
    expect(() => resolveLine(menu, line('l1', 'chai'), 'dine_in')).toThrowError(/STORE_MISMATCH/);
  });
});

describe('money helpers', () => {
  it('roundDiv rounds half away from zero', () => {
    expect([roundDiv(5, 2), roundDiv(4, 2), roundDiv(7, 2), roundDiv(-5, 2), roundDiv(-7, 2), roundDiv(1, 3), roundDiv(2, 3)]).toEqual([3, 2, 4, -3, -4, 0, 1]);
  });
  it('roundToRupee rounds 50 paise up', () => {
    expect([roundToRupee(4949), roundToRupee(4950), roundToRupee(5000), roundToRupee(-26), roundToRupee(-50)]).toEqual([4900, 5000, 5000, 0, -100]);
  });
  it('allocate loses and invents no paise', () => {
    for (const [total, w] of [[5000, [38000, 8000]], [1, [1, 1, 1]], [100, [3, 3, 3]], [0, [5, 5]], [7, [0, 0]]] as const) {
      const parts = allocate(total, w);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(w.every((x) => x === 0) ? 0 : total);
    }
    expect(allocate(5000, [38000, 8000])).toEqual([4130, 870]);
  });
});
