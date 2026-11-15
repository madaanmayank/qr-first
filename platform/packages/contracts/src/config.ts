import { z } from 'zod';
import {
  ClockTime,
  ORDER_TYPES,
  OrderType,
  PayTiming,
  Preset,
  Weekday,
  WEEKDAYS,
  type PayTiming as PayTimingT,
  type Preset as PresetT,
} from './primitives';
import {
  DEFAULT_FACTS,
  FEATURE_KEYS,
  presetFeatures,
  type FeatureKey,
  type StoreFacts,
} from './features';

/* -------------------------------------------------------------------------- */
/* Settings: the complete list is docs/04 section 2. Budget 20, count 18.      */
/* -------------------------------------------------------------------------- */

const MediaRef = z.object({ assetKey: z.string().min(1) });

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  /** State name as the country profile spells it, for example "Delhi". */
  state: z.string().min(1),
  postalCode: z.string().min(3),
  /** ISO 3166 alpha-2. India is the launch country. */
  country: z.string().length(2),
});
export type Address = z.infer<typeof AddressSchema>;

export const ThemeSchema = z.object({
  /** Id of a curated look. Fonts, sizes and layout belong to the look. */
  look: z.string().min(1),
  /** The one brand colour, hex. */
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  appearance: z.enum(['light', 'dark', 'follow_device']),
});

export const CoverMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  assetKey: z.string().min(1),
});

/** Per order type. A type the store does not offer has no entry ("n/a"). */
export const PayTimingMapSchema = z.object({
  dine_in: PayTiming.optional(),
  takeaway: PayTiming.optional(),
});

const Interval = z
  .object({ open: ClockTime, close: ClockTime })
  .refine((i) => i.open !== i.close, { message: 'open and close must differ' });

export const OpeningHoursSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('always') }),
  z.object({
    mode: z.literal('schedule'),
    weekly: z.partialRecord(Weekday, z.array(Interval)),
    exceptions: z.array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        intervals: z.array(Interval),
      }),
    ),
  }),
]);

export const TaxSettingSchema = z.object({
  /** The GST question at onboarding has three answers (docs/15 section 2). */
  registration: z.enum(['registered', 'composition', 'unregistered']),
  /** Percent, for example 5 or 18. Only used when registered. */
  ratePercent: z.number().min(0).max(40),
  inclusive: z.boolean(),
});

export const PAYMENT_METHODS = [
  'cash',
  'upi_counter',
  'card_machine',
  'upi',
  'card',
  'wallet',
  'netbanking',
] as const;
export const PaymentMethodKey = z.enum(PAYMENT_METHODS);

export const PayoutAccountSchema = z
  .object({
    provider: z.string().min(1),
    accountRef: z.string().min(1),
    status: z.enum(['pending', 'verified']),
  })
  .nullable();

export const StationsSchema = z.object({
  stations: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
  /** Category id to station id. A category with no entry goes to the first station. */
  routing: z.record(z.string(), z.string()),
});

export const ReviewLinkSchema = z
  .union([
    z.object({ type: z.literal('url'), url: z.url() }),
    z.object({ type: z.literal('place_id'), placeId: z.string().min(1) }),
  ])
  .nullable();

export const ReceiptContactSchema = z
  .object({ type: z.enum(['phone', 'email']), value: z.string().min(3) })
  .nullable();

export const SettingsSchema = z
  .object({
    // Identity and look (5)
    name: z.string().min(1),
    address: AddressSchema,
    logo: MediaRef.nullable(),
    theme: ThemeSchema,
    coverMedia: CoverMediaSchema.nullable(),
    // Service (4)
    serviceStyle: Preset,
    orderTypes: z.array(OrderType).min(1),
    payTiming: PayTimingMapSchema,
    openingHours: OpeningHoursSchema,
    // Money (4)
    tax: TaxSettingSchema,
    /** Percent. Default 0. In India it is optional and removable (docs/15 section 5). */
    serviceCharge: z.number().min(0).max(100),
    paymentMethods: z.array(PaymentMethodKey),
    payoutAccount: PayoutAccountSchema,
    // Guest (2)
    guestLogin: z.enum(['off', 'optional', 'required']),
    languages: z.array(z.string().min(2)).min(1),
    // Kitchen (1)
    stations: StationsSchema,
    // After the order (2)
    reviewLink: ReviewLinkSchema,
    receiptContact: ReceiptContactSchema,
  })
  .strict();
export type Settings = z.infer<typeof SettingsSchema>;
export type SettingKey = keyof Settings;

export const SETTING_KEYS = Object.keys(SettingsSchema.shape) as SettingKey[];

/** Group and order exactly as docs/04 lists them. */
export const SETTING_GROUPS: Record<string, readonly SettingKey[]> = {
  'Identity and look': ['name', 'address', 'logo', 'theme', 'coverMedia'],
  Service: ['serviceStyle', 'orderTypes', 'payTiming', 'openingHours'],
  Money: ['tax', 'serviceCharge', 'paymentMethods', 'payoutAccount'],
  Guest: ['guestLogin', 'languages'],
  Kitchen: ['stations'],
  'After the order': ['reviewLink', 'receiptContact'],
};

/** Hard cap from docs/04. Adding a setting needs the five tests there. */
export const SETTINGS_BUDGET = 20;

/* -------------------------------------------------------------------------- */
/* Features block, generated from the registry.                                */
/* -------------------------------------------------------------------------- */

export const FeaturesSchema = z
  .object(Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean()])) as Record<FeatureKey, z.ZodBoolean>)
  .strict();
export type Features = Record<FeatureKey, boolean>;

/* -------------------------------------------------------------------------- */
/* StoreConfig: one typed, versioned document per store (AGENTS rule 2).       */
/* -------------------------------------------------------------------------- */

export const StoreConfigSchema = z
  .object({
    /** Shape version of this document. Bumped only by a forward migration. */
    schemaVersion: z.literal(1),
    /** Document version, incremented on every write. History keeps each one. */
    version: z.number().int().min(1),
    settings: SettingsSchema,
    features: FeaturesSchema,
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const { orderTypes, payTiming } = cfg.settings;
    if (new Set(orderTypes).size !== orderTypes.length) {
      ctx.addIssue({ code: 'custom', path: ['settings', 'orderTypes'], message: 'duplicate order type' });
    }
    for (const t of ORDER_TYPES) {
      const offered = orderTypes.includes(t);
      const timing = payTiming[t];
      if (offered && !timing) {
        ctx.addIssue({ code: 'custom', path: ['settings', 'payTiming', t], message: `pay timing missing for ${t}` });
      }
      if (!offered && timing) {
        ctx.addIssue({ code: 'custom', path: ['settings', 'payTiming', t], message: `pay timing set for ${t}, which is not offered` });
      }
    }
    const { stations } = cfg.settings.stations;
    const ids = new Set(stations.map((s) => s.id));
    if (ids.size !== stations.length) {
      ctx.addIssue({ code: 'custom', path: ['settings', 'stations'], message: 'duplicate station id' });
    }
    for (const [cat, st] of Object.entries(cfg.settings.stations.routing)) {
      if (!ids.has(st)) {
        ctx.addIssue({ code: 'custom', path: ['settings', 'stations', 'routing', cat], message: 'unknown station' });
      }
    }
    if (cfg.settings.tax.registration !== 'registered' && cfg.settings.tax.ratePercent !== 0) {
      ctx.addIssue({ code: 'custom', path: ['settings', 'tax', 'ratePercent'], message: 'only a registered store charges GST' });
    }
  });
export type StoreConfig = z.infer<typeof StoreConfigSchema>;

/* -------------------------------------------------------------------------- */
/* Presets (docs/04 section 4).                                                */
/* -------------------------------------------------------------------------- */

export const PRESET_OWNED_SETTINGS = ['serviceStyle', 'orderTypes', 'payTiming'] as const;

interface PresetSettings {
  serviceStyle: PresetT;
  orderTypes: OrderType[];
  payTiming: { dine_in?: PayTimingT; takeaway?: PayTimingT };
}

export const PRESET_SETTINGS: Record<PresetT, PresetSettings> = {
  counter: {
    serviceStyle: 'counter',
    orderTypes: ['dine_in', 'takeaway'],
    payTiming: { dine_in: 'before_kitchen', takeaway: 'before_kitchen' },
  },
  table: {
    serviceStyle: 'table',
    orderTypes: ['dine_in'],
    payTiming: { dine_in: 'at_end' },
  },
  hybrid: {
    serviceStyle: 'hybrid',
    orderTypes: ['dine_in', 'takeaway'],
    payTiming: { dine_in: 'before_kitchen', takeaway: 'before_kitchen' },
  },
};

/** Spots created for a preset (docs/04 section 4). Spots are content, not settings. */
export const PRESET_SPOTS: Record<PresetT, { counters: number; pickups: number; tables: 'none' | '1_to_N' }> = {
  counter: { counters: 1, pickups: 1, tables: 'none' },
  table: { counters: 0, pickups: 0, tables: '1_to_N' },
  hybrid: { counters: 1, pickups: 0, tables: '1_to_N' },
};

/** The three presets, each filling every setting default and every feature switch. */
export const PRESETS_FULL: Record<PresetT, { settings: Omit<Settings, 'name' | 'address'>; features: Features }> = {
  counter: presetBundle('counter'),
  table: presetBundle('table'),
  hybrid: presetBundle('hybrid'),
};

function presetBundle(preset: PresetT): { settings: Omit<Settings, 'name' | 'address'>; features: Features } {
  return {
    settings: { ...baseDefaults(), ...structuredClone(PRESET_SETTINGS[preset]) },
    features: presetFeatures(preset, DEFAULT_FACTS),
  };
}

/** Defaults that do not depend on the preset (docs/04 section 2). */
function baseDefaults(): Omit<Settings, 'name' | 'address' | 'serviceStyle' | 'orderTypes' | 'payTiming'> {
  return {
    logo: null,
    // Placeholder until the look is chosen (decision D17). "Match my brand" replaces it at onboarding.
    theme: { look: 'default', accent: '#1F6F4A', appearance: 'follow_device' },
    coverMedia: null,
    openingHours: { mode: 'always' },
    tax: { registration: 'registered', ratePercent: 5, inclusive: false },
    serviceCharge: 0,
    paymentMethods: ['cash', 'upi_counter'],
    payoutAccount: null,
    guestLogin: 'optional',
    languages: ['en'],
    stations: { stations: [{ id: 'kitchen', name: 'Kitchen' }], routing: {} },
    reviewLink: null,
    receiptContact: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Onboarding: address and answers become a complete config.                   */
/* -------------------------------------------------------------------------- */

export interface Derived {
  country: string;
  state: string;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  /** Consent control starts unchecked. Country rule (docs/15 section 6). */
  consentDefault: 'opt_in';
  languages: string[];
}

const STATE_LANGUAGE: Record<string, string> = {
  delhi: 'hi',
  'uttar pradesh': 'hi',
  haryana: 'hi',
  rajasthan: 'hi',
  maharashtra: 'mr',
  gujarat: 'gu',
  'tamil nadu': 'ta',
  telangana: 'te',
  'andhra pradesh': 'te',
  karnataka: 'kn',
  kerala: 'ml',
  'west bengal': 'bn',
  punjab: 'pa',
};

/** Country, state, currency, timezone, consent rule and languages from the address (docs/04 section 1). */
export function deriveFromAddress(address: Address): Derived {
  if (address.country.toUpperCase() !== 'IN') {
    throw new Error(`No country profile for ${address.country}. India is the launch country (docs/15).`);
  }
  const main = STATE_LANGUAGE[address.state.trim().toLowerCase()];
  return {
    country: 'IN',
    state: address.state,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    consentDefault: 'opt_in',
    languages: main && main !== 'en' ? ['en', main] : ['en'],
  };
}

export interface Onboarding {
  name: string;
  address: Address;
  preset: PresetT;
  /** The GST question. Defaults to registered. */
  gst?: 'registered' | 'composition' | 'unregistered';
  /** Percent, for a registered store. Default 5. */
  gstRatePercent?: number;
  ownerPhone?: string;
  reviewLink?: z.infer<typeof ReviewLinkSchema>;
  facts?: Partial<StoreFacts>;
}

/** A complete, valid StoreConfig from the onboarding answers. */
export function createStoreConfig(o: Onboarding): StoreConfig {
  const derived = deriveFromAddress(o.address);
  const facts: StoreFacts = {
    ...DEFAULT_FACTS,
    ...o.facts,
    hasReviewLink: Boolean(o.reviewLink) || Boolean(o.facts?.hasReviewLink),
  };
  const bundle = PRESETS_FULL[o.preset];
  const gst = o.gst ?? 'registered';
  const settings: Settings = {
    ...structuredClone(bundle.settings),
    name: o.name,
    address: o.address,
    languages: derived.languages,
    tax: {
      registration: gst,
      ratePercent: gst === 'registered' ? (o.gstRatePercent ?? 5) : 0,
      inclusive: false,
    },
    reviewLink: o.reviewLink ?? null,
    receiptContact: o.ownerPhone ? { type: 'phone', value: o.ownerPhone } : null,
  };
  return StoreConfigSchema.parse({
    schemaVersion: 1,
    version: 1,
    settings,
    features: presetFeatures(o.preset, facts),
  });
}

/**
 * Changing the service style re-applies the preset-owned settings and every feature
 * switch (docs/04 section 2, `serviceStyle`). The caller shows a preview first.
 */
export function reapplyPreset(config: StoreConfig, preset: PresetT, facts: StoreFacts = DEFAULT_FACTS): StoreConfig {
  return StoreConfigSchema.parse({
    ...config,
    settings: { ...config.settings, ...structuredClone(PRESET_SETTINGS[preset]) },
    features: presetFeatures(preset, facts),
  });
}

export { WEEKDAYS };
