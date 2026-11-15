import { z } from 'zod';
import {
  Id,
  NonNegPaise,
  OrderType,
  PayTiming,
  TaxClassKey,
  UtcInstant,
} from './primitives';
import { CartLineSchema } from './menu';
import { DiscountSchema, TipInputSchema } from './pricing';

/** A line once sent: the cart line plus the name and price copied at send time (docs/17 section 3). */
export const LineSnapshotSchema = z.object({
  name: z.string(),
  /** Per unit, option deltas and takeaway price already applied. */
  unitPrice: NonNegPaise,
  baseUnitPrice: NonNegPaise,
  taxClass: TaxClassKey,
  mrp: z.boolean(),
  station: Id.optional(),
});
export type LineSnapshot = z.infer<typeof LineSnapshotSchema>;

export const LineSchema = CartLineSchema.extend({
  storeId: Id,
  snapshot: LineSnapshotSchema.optional(),
  voided: z.boolean().default(false),
  voidReason: z.string().optional(),
});
export type Line = z.infer<typeof LineSchema>;

export const ROUND_STATES = ['draft', 'sent', 'accepted', 'ready', 'served', 'void'] as const;
export const RoundState = z.enum(ROUND_STATES);
export type RoundState = z.infer<typeof RoundState>;

export const RoundSchema = z.object({
  id: Id,
  storeId: Id,
  tabId: Id,
  state: RoundState,
  lines: z.array(LineSchema),
  sentAt: UtcInstant.optional(),
  source: z.enum(['guest', 'staff']),
  idempotencyKey: z.string().min(8),
  voidReason: z.string().optional(),
  voidedBy: Id.optional(),
});
export type Round = z.infer<typeof RoundSchema>;

export const TAB_STATES = ['open', 'closed', 'void'] as const;
export const TabState = z.enum(TAB_STATES);
export type TabState = z.infer<typeof TabState>;

export const TabSchema = z.object({
  id: Id,
  storeId: Id,
  spotId: Id,
  spotType: z.enum(['table', 'counter', 'pickup']),
  orderType: OrderType,
  /** Copied from the store config when the tab opens (docs/03 section 5). */
  payTiming: PayTiming,
  state: TabState,
  /** Short daily counter, automatic. */
  number: z.number().int().min(1),
  partySize: z.number().int().min(1).optional(),
  guestId: Id.optional(),
  openedBy: Id,
  openedAt: UtcInstant,
  closedAt: UtcInstant.optional(),
  discounts: z.array(DiscountSchema),
  tip: TipInputSchema.optional(),
  /** Service charge can be removed with one tap (docs/15 section 5). */
  serviceChargeWaived: z.boolean(),
  voidReason: z.string().optional(),
});
export type Tab = z.infer<typeof TabSchema>;

export const PAYMENT_STATES = ['pending', 'succeeded', 'failed', 'refunded'] as const;
export const PaymentState = z.enum(PAYMENT_STATES);
export type PaymentState = z.infer<typeof PaymentState>;

export const PaymentSchema = z.object({
  id: Id,
  storeId: Id,
  tabId: Id,
  /** Paise applied to the balance. Includes the tip share, see NOTES.md. */
  amount: NonNegPaise,
  method: z.string().min(1),
  state: PaymentState,
  /** The part of `amount` that is tip. Informational. */
  tip: NonNegPaise,
  idempotencyKey: z.string().min(8),
  /** 'guest' or a staff member id. */
  takenBy: Id,
});
export type Payment = z.infer<typeof PaymentSchema>;
