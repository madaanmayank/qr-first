import { z } from 'zod';

/** Opaque id. No id encodes a parent (docs/09 section 4). */
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

/** Integer money in paise. No floating point anywhere (docs/09 section 4). */
export const Paise = z.number().int().min(-9_000_000_000_000).max(9_000_000_000_000);
export type Paise = z.infer<typeof Paise>;
export const NonNegPaise = Paise.min(0);

export const PRESETS = ['counter', 'table', 'hybrid'] as const;
export const Preset = z.enum(PRESETS);
export type Preset = z.infer<typeof Preset>;

export const ORDER_TYPES = ['dine_in', 'takeaway'] as const;
export const OrderType = z.enum(ORDER_TYPES);
export type OrderType = z.infer<typeof OrderType>;

export const PAY_TIMINGS = ['before_kitchen', 'at_end'] as const;
export const PayTiming = z.enum(PAY_TIMINGS);
export type PayTiming = z.infer<typeof PayTiming>;

/** Key into the store's tax class table (docs/15 section 2). */
export const TaxClassKey = z.string().min(1);
export type TaxClassKey = z.infer<typeof TaxClassKey>;

/** UTC instant, ISO 8601 with a trailing Z (docs/09 section 4). */
export const UtcInstant = z.iso.datetime();
export type UtcInstant = z.infer<typeof UtcInstant>;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const Weekday = z.enum(WEEKDAYS);
export type Weekday = z.infer<typeof Weekday>;

export const ClockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
