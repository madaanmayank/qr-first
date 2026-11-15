import { z } from 'zod';
import { type Preset } from './primitives';

export const FEATURE_GROUPS = [
  'ordering_and_paying',
  'personal_and_engaging',
  'at_the_table',
  'after_the_meal',
  'know_your_food',
] as const;
export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

/** Screens a feature touches, and where the live preview can jump (docs/25 section 3). */
export const SURFACES = [
  'guest.menu',
  'guest.itemSheet',
  'guest.cart',
  'guest.payment',
  'guest.orderStatus',
  'guest.welcome',
  'guest.storePage',
  'guest.compare',
  'staff.floor',
  'staff.pos',
  'staff.kds',
  'dashboard.menu',
  'dashboard.home',
] as const;
export type Surface = (typeof SURFACES)[number];

/** Store facts a feature can depend on. Shown as unavailable with a reason when unmet. */
export const REQUIREMENTS = [
  'tableSpots',
  'paymentsConnected',
  'reviewLink',
  'messagingConnected',
  'storiesContent',
  'guestLogin',
] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

export const REQUIREMENT_REASON: Record<Requirement, string> = {
  tableSpots: 'Needs at least one table.',
  paymentsConnected: 'Connect payments first.',
  reviewLink: 'Add your review link first.',
  messagingConnected: 'Connect WhatsApp messaging first.',
  storiesContent: 'Add a story first.',
  guestLogin: 'Guest login must not be off.',
};

/** Conditions that turn a preset default on. Otherwise the default starts off. */
export const DEFAULT_CONDITIONS = [
  'paymentsConnected',
  'storiesExist',
  'reviewLinkExists',
  'messagingConnected',
  'notFreeMenuStart',
] as const;
export type DefaultCondition = (typeof DEFAULT_CONDITIONS)[number];

export const PLANS = ['free', 'pay', 'full', 'addon'] as const;
export type Plan = (typeof PLANS)[number];

const Localised = z.object({ en: z.string().min(1), hi: z.string().min(1).optional() });

const FeatureInputSchema = z.object({
  key: z.string().regex(/^[a-z][A-Za-z0-9]*$/, 'camelCase'),
  name: Localised.extend({ hi: z.string().min(1) }),
  explain: Localised,
  group: z.enum(FEATURE_GROUPS),
  default: z.object({ counter: z.boolean(), table: z.boolean(), hybrid: z.boolean() }),
  defaultWhen: z.enum(DEFAULT_CONDITIONS).optional(),
  requires: z.array(z.enum(REQUIREMENTS)),
  surfaces: z.array(z.enum(SURFACES)).min(1),
  preview: z.enum(SURFACES),
  plan: z.enum(PLANS),
});

export interface FeatureInput<K extends string> {
  key: K;
  name: { en: string; hi: string };
  explain: { en: string; hi?: string };
  group: FeatureGroup;
  default: Record<Preset, boolean>;
  defaultWhen?: DefaultCondition;
  requires: readonly Requirement[];
  surfaces: readonly Surface[];
  preview: Surface;
  plan: Plan;
}

export type FeatureDef<K extends string = string> = Readonly<FeatureInput<K>>;

/**
 * Registration is the only step (docs/25 section 3). A feature is on or off and has no
 * sub-options, so this schema has no field for one. The preview target must be one of
 * the feature's own surfaces.
 */
export function defineFeature<const K extends string>(input: FeatureInput<K>): FeatureDef<K> {
  const parsed = FeatureInputSchema.parse(input);
  if (!parsed.surfaces.includes(parsed.preview)) {
    throw new Error(`Feature ${parsed.key}: preview ${parsed.preview} is not one of its surfaces`);
  }
  return Object.freeze({ ...input }) as FeatureDef<K>;
}

export const FEATURE_LIST = [
  // Ordering and paying
  defineFeature({
    key: 'ordering',
    name: { en: 'Order from the phone', hi: 'फ़ोन से ऑर्डर करें' },
    explain: { en: 'Guests add items and send orders. Off gives a menu-only store.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    defaultWhen: 'notFreeMenuStart',
    requires: [],
    surfaces: ['guest.menu', 'guest.cart', 'guest.orderStatus', 'staff.pos', 'staff.kds'],
    preview: 'guest.menu',
    plan: 'full',
  }),
  defineFeature({
    key: 'scanToPay',
    name: { en: 'Pay the bill by QR', hi: 'QR से बिल चुकाएँ' },
    explain: { en: 'Guests pay their bill by UPI from the phone.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    defaultWhen: 'paymentsConnected',
    requires: ['paymentsConnected'],
    surfaces: ['guest.orderStatus', 'guest.payment'],
    preview: 'guest.payment',
    plan: 'pay',
  }),
  defineFeature({
    key: 'choices',
    name: { en: 'Customisation', hi: 'पसंद के विकल्प' },
    explain: { en: 'Sizes, add-ons and other choices on items.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.itemSheet', 'guest.cart', 'dashboard.menu'],
    preview: 'guest.itemSheet',
    plan: 'free',
  }),
  defineFeature({
    key: 'combos',
    name: { en: 'Combos', hi: 'कॉम्बो' },
    explain: { en: 'Items made of other items.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.itemSheet', 'guest.cart', 'dashboard.menu'],
    preview: 'guest.itemSheet',
    plan: 'free',
  }),
  defineFeature({
    key: 'kitchenNote',
    name: { en: 'Notes to the kitchen', hi: 'रसोई के लिए नोट' },
    explain: { en: 'A short note per item.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.itemSheet', 'guest.cart', 'staff.kds', 'staff.pos'],
    preview: 'guest.itemSheet',
    plan: 'full',
  }),
  defineFeature({
    key: 'splitBill',
    name: { en: 'Split the bill', hi: 'बिल बाँटें' },
    explain: { en: 'Equal, by item or by amount.' },
    group: 'ordering_and_paying',
    default: { counter: false, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.payment', 'guest.orderStatus', 'staff.pos'],
    preview: 'guest.payment',
    plan: 'full',
  }),
  defineFeature({
    key: 'tips',
    name: { en: 'Tips', hi: 'टिप' },
    explain: { en: 'Tip choices at payment.' },
    group: 'ordering_and_paying',
    default: { counter: false, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.payment', 'staff.pos'],
    preview: 'guest.payment',
    plan: 'pay',
  }),
  defineFeature({
    key: 'autoAccept',
    name: { en: 'Accept orders automatically', hi: 'ऑर्डर अपने-आप स्वीकारें' },
    explain: { en: 'Off adds a staff accept step.' },
    group: 'ordering_and_paying',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['staff.pos', 'staff.kds', 'guest.orderStatus'],
    preview: 'guest.orderStatus',
    plan: 'full',
  }),
  // Personal and engaging
  defineFeature({
    key: 'personalWelcome',
    name: { en: 'Personal welcome', hi: 'व्यक्तिगत स्वागत' },
    explain: { en: 'Greets known diners by name, shows their usual and last order.' },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    requires: ['guestLogin'],
    surfaces: ['guest.welcome', 'guest.menu'],
    preview: 'guest.welcome',
    plan: 'free',
  }),
  defineFeature({
    key: 'suggestions',
    name: { en: 'Personal suggestions', hi: 'आपके लिए सुझाव' },
    explain: { en: "Suggestions with a reason, from the diner's taste and the store's data." },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.menu', 'guest.cart'],
    preview: 'guest.menu',
    plan: 'free',
  }),
  defineFeature({
    key: 'playMode',
    name: { en: 'Play to order', hi: 'खेलकर ऑर्डर करें' },
    explain: { en: 'A game-like way to choose a meal.' },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.menu'],
    preview: 'guest.menu',
    plan: 'free',
  }),
  defineFeature({
    key: 'waiter',
    name: { en: 'Waiter assistant', hi: 'वेटर सहायक' },
    explain: {
      en: 'A friendly character guests can ask about dishes, compare items with and get suggestions from.',
    },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.menu', 'guest.itemSheet', 'guest.cart', 'guest.compare', 'guest.orderStatus'],
    preview: 'guest.menu',
    plan: 'free',
  }),
  defineFeature({
    key: 'vegFilter',
    name: { en: 'Vegetarian filter', hi: 'शाकाहारी फ़िल्टर' },
    explain: { en: 'A veg-only switch on the menu, remembered per diner.' },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.menu'],
    preview: 'guest.menu',
    plan: 'free',
  }),
  defineFeature({
    key: 'stories',
    name: { en: 'Stories', hi: 'स्टोरीज़' },
    explain: { en: 'Short photos and videos with tagged dishes.' },
    group: 'personal_and_engaging',
    default: { counter: true, table: true, hybrid: true },
    defaultWhen: 'storiesExist',
    requires: ['storiesContent'],
    surfaces: ['guest.menu', 'guest.storePage'],
    preview: 'guest.menu',
    plan: 'free',
  }),
  defineFeature({
    key: 'rewards',
    name: { en: 'Visit stamps', hi: 'विज़िट स्टैम्प' },
    explain: { en: 'A simple reward the owner defines.' },
    group: 'personal_and_engaging',
    default: { counter: false, table: false, hybrid: false },
    requires: ['guestLogin'],
    surfaces: ['guest.orderStatus', 'guest.welcome'],
    preview: 'guest.orderStatus',
    plan: 'addon',
  }),
  // At the table
  defineFeature({
    key: 'callWaiter',
    name: { en: 'Call waiter', hi: 'वेटर बुलाएँ' },
    explain: { en: 'Guests at a table can ask for water, the bill or help.' },
    group: 'at_the_table',
    default: { counter: false, table: true, hybrid: true },
    requires: ['tableSpots'],
    surfaces: ['guest.orderStatus', 'guest.menu', 'staff.floor'],
    preview: 'guest.menu',
    plan: 'full',
  }),
  defineFeature({
    key: 'partySize',
    name: { en: 'Ask party size', hi: 'कितने लोग हैं, पूछें' },
    explain: { en: 'One question when the first order is sent.' },
    group: 'at_the_table',
    default: { counter: false, table: true, hybrid: false },
    requires: ['tableSpots'],
    surfaces: ['guest.cart', 'staff.floor'],
    preview: 'guest.cart',
    plan: 'full',
  }),
  // After the meal
  defineFeature({
    key: 'ratings',
    name: { en: 'Ratings', hi: 'रेटिंग' },
    explain: { en: 'One-tap rating after the visit.' },
    group: 'after_the_meal',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.orderStatus'],
    preview: 'guest.orderStatus',
    plan: 'free',
  }),
  defineFeature({
    key: 'reviewPrompt',
    name: { en: 'Public review prompt', hi: 'पब्लिक रिव्यू का सुझाव' },
    explain: { en: 'Happy guests are offered the review link.' },
    group: 'after_the_meal',
    default: { counter: true, table: true, hybrid: true },
    defaultWhen: 'reviewLinkExists',
    requires: ['reviewLink'],
    surfaces: ['guest.orderStatus'],
    preview: 'guest.orderStatus',
    plan: 'free',
  }),
  defineFeature({
    key: 'whatsappReceipts',
    name: { en: 'WhatsApp receipts', hi: 'व्हाट्सऐप रसीद' },
    explain: { en: 'Receipt sent on WhatsApp at payment.' },
    group: 'after_the_meal',
    default: { counter: true, table: true, hybrid: true },
    defaultWhen: 'messagingConnected',
    requires: ['messagingConnected'],
    surfaces: ['guest.orderStatus'],
    preview: 'guest.orderStatus',
    plan: 'pay',
  }),
  // Know your food
  defineFeature({
    key: 'nutrition',
    name: { en: 'Nutrition at a glance', hi: 'पोषण एक नज़र में' },
    explain: {
      en: 'Shows about how many calories and how much protein a dish has, as soon as a guest opens it.',
    },
    group: 'know_your_food',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.itemSheet', 'guest.compare'],
    preview: 'guest.itemSheet',
    plan: 'free',
  }),
  defineFeature({
    key: 'compare',
    name: { en: 'Compare dishes', hi: 'व्यंजनों की तुलना' },
    explain: { en: 'Guests put two dishes side by side.' },
    group: 'know_your_food',
    default: { counter: true, table: true, hybrid: true },
    requires: [],
    surfaces: ['guest.menu', 'guest.itemSheet', 'guest.compare'],
    preview: 'guest.compare',
    plan: 'free',
  }),
] as const;

export type FeatureKey = (typeof FEATURE_LIST)[number]['key'];
export const FEATURE_KEYS = FEATURE_LIST.map((f) => f.key) as readonly FeatureKey[];

function buildRegistry(): Readonly<Record<FeatureKey, FeatureDef<FeatureKey>>> {
  const registry = {} as Record<string, FeatureDef>;
  for (const f of FEATURE_LIST) {
    if (registry[f.key]) throw new Error(`Duplicate feature key ${f.key}`);
    registry[f.key] = f;
  }
  return Object.freeze(registry) as Readonly<Record<FeatureKey, FeatureDef<FeatureKey>>>;
}

/** The registry, keyed by feature key. */
export const FEATURES = buildRegistry();

export function isFeatureKey(k: string): k is FeatureKey {
  return Object.prototype.hasOwnProperty.call(FEATURES, k);
}

/** Facts a store can answer, used to resolve conditional defaults and requirements. */
export interface StoreFacts {
  tableSpots: number;
  paymentsConnected: boolean;
  messagingConnected: boolean;
  storiesExist: boolean;
  hasReviewLink: boolean;
  guestLogin: 'off' | 'optional' | 'required';
  /** The store started on the free menu (ordering off at first). */
  freeMenuStart: boolean;
}

export const DEFAULT_FACTS: StoreFacts = {
  tableSpots: 0,
  paymentsConnected: false,
  messagingConnected: false,
  storiesExist: false,
  hasReviewLink: false,
  guestLogin: 'optional',
  freeMenuStart: false,
};

function conditionMet(c: DefaultCondition, facts: StoreFacts): boolean {
  switch (c) {
    case 'paymentsConnected':
      return facts.paymentsConnected;
    case 'storiesExist':
      return facts.storiesExist;
    case 'reviewLinkExists':
      return facts.hasReviewLink;
    case 'messagingConnected':
      return facts.messagingConnected;
    case 'notFreeMenuStart':
      return !facts.freeMenuStart;
  }
}

export function requirementMet(r: Requirement, facts: StoreFacts): boolean {
  switch (r) {
    case 'tableSpots':
      return facts.tableSpots > 0;
    case 'paymentsConnected':
      return facts.paymentsConnected;
    case 'reviewLink':
      return facts.hasReviewLink;
    case 'messagingConnected':
      return facts.messagingConnected;
    case 'storiesContent':
      return facts.storiesExist;
    case 'guestLogin':
      return facts.guestLogin !== 'off';
  }
}

/** Unmet requirements in plain words. Empty means the feature can be switched on. */
export function unmetRequirements(
  key: FeatureKey,
  facts: StoreFacts,
): { requirement: Requirement; reason: string }[] {
  return FEATURES[key].requires
    .filter((r) => !requirementMet(r, facts))
    .map((requirement) => ({ requirement, reason: REQUIREMENT_REASON[requirement] }));
}

/** The default switch value for a preset, after conditional defaults. */
export function featureDefault(key: FeatureKey, preset: Preset, facts: StoreFacts): boolean {
  const f = FEATURES[key];
  const base = f.default[preset];
  if (!base) return false;
  return f.defaultWhen ? conditionMet(f.defaultWhen, facts) : true;
}

export function presetFeatures(preset: Preset, facts: StoreFacts = DEFAULT_FACTS): Record<FeatureKey, boolean> {
  const out = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_KEYS) out[key] = featureDefault(key, preset, facts);
  return out;
}

