import { z } from 'zod';
import { Id, NonNegPaise, Paise, OrderType, TaxClassKey } from './primitives';

/** Tax class definition. Rates are basis points (500 = 5 percent). */
export const TaxClassDefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('gst'), rateBp: z.number().int().min(0).max(10_000) }),
  z.object({ kind: z.literal('vat'), rateBp: z.number().int().min(0).max(10_000) }),
  z.object({ kind: z.literal('none') }),
]);
export type TaxClassDef = z.infer<typeof TaxClassDefSchema>;

/** Standard class keys created from the `tax` setting and the state table. */
export const TAX_CLASS_STANDARD = 'standard';
export const TAX_CLASS_ALCOHOL = 'alcohol_vat';

export const DiscountSchema = z.object({
  id: Id,
  /** Code or rule name, shown on the bill. */
  label: z.string().min(1),
  kind: z.enum(['percent', 'amount']),
  /** percent: basis points (1000 = 10 percent). amount: paise. */
  value: z.number().int().min(0),
  /** 'tab' applies to every line. Otherwise only the named lines. */
  scope: z.union([z.literal('tab'), z.object({ lineIds: z.array(Id).min(1) })]),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const TipInputSchema = z.union([
  z.object({ kind: z.literal('amount'), paise: NonNegPaise }),
  /** Percent of the discounted, pre-tax value. Basis points. */
  z.object({ kind: z.literal('percent'), bp: z.number().int().min(0).max(10_000) }),
]);
export type TipInput = z.infer<typeof TipInputSchema>;

export const CHARGE_TYPES = [
  'discount',
  'service_charge',
  'cgst',
  'sgst',
  'vat',
  'tip',
  'round_off',
] as const;
export const ChargeSchema = z.object({
  type: z.enum(CHARGE_TYPES),
  label: z.string(),
  /** Signed: discounts and negative round off are below zero. */
  amount: Paise,
  taxClass: TaxClassKey.optional(),
  /** Tax already inside the line prices (inclusive pricing). Shown on the bill, not added again. */
  included: z.boolean().optional(),
});
export type Charge = z.infer<typeof ChargeSchema>;

export const PricedLineSchema = z.object({
  lineId: Id,
  itemId: Id,
  name: z.string(),
  qty: z.number().int(),
  /** Base (or takeaway) price plus every selected option delta, per unit. */
  unitPrice: Paise,
  baseUnitPrice: Paise,
  optionsUnitTotal: Paise,
  /** unitPrice x qty, before discounts. */
  lineTotal: Paise,
  discount: NonNegPaise,
  /** lineTotal minus its share of discounts. Tax-inclusive when prices are inclusive. */
  net: Paise,
  taxClass: TaxClassKey,
  mrp: z.boolean(),
});
export type PricedLine = z.infer<typeof PricedLineSchema>;

export const TaxLineSchema = z.object({
  taxClass: TaxClassKey,
  kind: z.enum(['gst', 'vat']),
  rateBp: z.number().int(),
  /** Taxable value for the class, including service charge on that class. */
  taxableValue: Paise,
  cgst: Paise.optional(),
  sgst: Paise.optional(),
  vat: Paise.optional(),
  tax: Paise,
});
export type TaxLine = z.infer<typeof TaxLineSchema>;

export const PricedTabSchema = z.object({
  currency: z.literal('INR'),
  orderType: OrderType,
  lines: z.array(PricedLineSchema),
  /** Sum of lineTotal over live lines. */
  subtotal: Paise,
  discountTotal: NonNegPaise,
  serviceCharge: NonNegPaise,
  taxLines: z.array(TaxLineSchema),
  cgstTotal: Paise,
  sgstTotal: Paise,
  vatTotal: Paise,
  /** All tax on the bill, including tax that is inside inclusive prices. */
  taxTotal: Paise,
  taxInclusive: z.boolean(),
  /** The part of taxTotal added on top of the prices. */
  taxAdded: Paise,
  /** Included in `total`. */
  tip: NonNegPaise,
  /** Signed. Shown as its own line (docs/15 section 1). */
  roundOff: Paise,
  /** Always a whole number of rupees (a multiple of 100 paise). */
  total: NonNegPaise,
  /** Set when the store is a composition-scheme taxpayer (docs/15 section 2). */
  taxNotice: z.literal('composition').nullable(),
  /**
   * The flat list written to the charge table (docs/17 section 3). Identity:
   * subtotal + sum of charges that are not `included` = total.
   */
  charges: z.array(ChargeSchema),
});
export type PricedTab = z.infer<typeof PricedTabSchema>;
