import { z } from 'zod';
import { QrError } from './errors';
import { ActorSchema, type Actor } from './events';
import {
  FEATURE_KEYS,
  FEATURES,
  unmetRequirements,
  type FeatureKey,
  type StoreFacts,
  type Surface,
} from './features';
import {
  SETTING_KEYS,
  SettingsSchema,
  StoreConfigSchema,
  PRESET_SETTINGS,
  reapplyPreset,
  type SettingKey,
  type StoreConfig,
} from './config';
import { mergeAiTag, tagFrom } from './enrich';
import {
  Course,
  DietaryType,
  ItemSchema,
  NutritionSchema,
  OptionGroupSchema,
  type Item,
  type MenuIndex,
  type OptionGroup,
} from './menu';
import { Id, NonNegPaise, TaxClassKey, type Preset } from './primitives';
import { TAX_CLASS_STANDARD } from './pricing';

/* -------------------------------------------------------------------------- */
/* Envelope (docs/25 section 5)                                                */
/* -------------------------------------------------------------------------- */

export const RISK_TIERS = ['low', 'medium', 'high'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const ROLES = ['owner', 'manager', 'staff'] as const;
export type Role = (typeof ROLES)[number];
const ROLE_RANK: Record<Role, number> = { staff: 1, manager: 2, owner: 3 };

/** Who may send a command: a person, the assistant for a person, or an agent key. */
export const CommandActorSchema = z.discriminatedUnion('kind', [
  ActorSchema.options[0], // staff (a person)
  ActorSchema.options[2], // assistant
  ActorSchema.options[3], // agent
]);
export type CommandActor = z.infer<typeof CommandActorSchema>;

export const COMMAND_MODES = ['preview', 'apply'] as const;

/** The state the commands read and write. One store. */
export interface CommandState {
  config: StoreConfig;
  menu: MenuIndex;
  facts: StoreFacts;
}

export interface Change {
  path: string;
  before: unknown;
  after: unknown;
}

export interface Preview {
  /** Plain words, for a person and for a model. */
  summary: string;
  /** The exact diff. */
  changes: Change[];
  /** Guest and staff surfaces the change touches. */
  affectedSurfaces: Surface[];
  /** The live preview renders this proposed state. Nothing is saved. */
  draft: CommandState;
  noop: boolean;
}

export interface InverseCommand {
  type: string;
  payload: unknown;
}

/* -------------------------------------------------------------------------- */
/* defineCommand                                                               */
/* -------------------------------------------------------------------------- */

export interface CommandDef<T extends string = string, S extends z.ZodType = z.ZodType> {
  type: T;
  area: 'settings' | 'features' | 'menu' | 'choices';
  /** What it does, when to use it and what it affects. Written for people and models. */
  description: string;
  schema: S;
  requiredRole: Role;
  risk: RiskTier | ((payload: z.infer<S>) => RiskTier);
  /** Guest and staff surfaces the command touches. */
  surfaces: readonly Surface[];
  /** Plain-words summary of what will happen. */
  summarise: (payload: z.infer<S>, state: CommandState) => string;
  /** Pure. Returns the new state or throws a QrError. Does not bump the config version. */
  apply: (payload: z.infer<S>, state: CommandState) => CommandState;
  /** Commands that undo this one from the given prior state. Applied in order. */
  inverse: (payload: z.infer<S>, state: CommandState) => InverseCommand[];
  /** Compound commands expand into basic ones. */
  expand?: (payload: z.infer<S>, state: CommandState) => InverseCommand[];
}

export function defineCommand<const T extends string, S extends z.ZodType>(
  def: CommandDef<T, S>,
): CommandDef<T, S> {
  if (!/^[a-z]+(\.[A-Za-z]+)+$/.test(def.type)) throw new Error(`Bad command type ${def.type}`);
  if (def.description.trim().length < 20) throw new Error(`Command ${def.type} needs a plain description`);
  return def;
}

export function riskOf<S extends z.ZodType>(def: CommandDef<string, S>, payload: z.infer<S>): RiskTier {
  return typeof def.risk === 'function' ? def.risk(payload) : def.risk;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const clone = <T>(x: T): T => structuredClone(x);

function parseConfig(config: unknown): StoreConfig {
  const r = StoreConfigSchema.safeParse(config);
  if (!r.success) {
    throw new QrError('CONFIG_INVALID', 'The change would leave the store config invalid.', {
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return r.data;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Diff two values. Stops at the first level that differs for arrays and scalars. */
export function diffValues(before: unknown, after: unknown, path = ''): Change[] {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].flatMap((k) => diffValues(before[k], after[k], path ? `${path}.${k}` : k));
  }
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ path, before, after }];
}

export function diffState(before: CommandState, after: CommandState): Change[] {
  return [
    ...diffValues(before.config.settings, after.config.settings, 'settings'),
    ...diffValues(before.config.features, after.config.features, 'features'),
    ...diffValues(before.menu.items, after.menu.items, 'menu.items'),
    ...diffValues(before.menu.optionGroups, after.menu.optionGroups, 'menu.optionGroups'),
  ];
}

/** Settings change in a safe replay order: style, order types, pay timing, then the rest. */
const SETTING_REPLAY_ORDER: SettingKey[] = ['serviceStyle', 'orderTypes', 'payTiming'];

/** Inverse of any change to config, built from the before and after states. */
function configInverse(before: CommandState, after: CommandState): InverseCommand[] {
  const out: InverseCommand[] = [];
  const keys = [
    ...SETTING_REPLAY_ORDER,
    ...SETTING_KEYS.filter((k) => !SETTING_REPLAY_ORDER.includes(k)),
  ];
  for (const key of keys) {
    if (JSON.stringify(before.config.settings[key]) !== JSON.stringify(after.config.settings[key])) {
      out.push({
        type: 'setting.set',
        payload: { key, value: clone(before.config.settings[key]), reapplyPreset: false },
      });
    }
  }
  for (const key of FEATURE_KEYS) {
    if (before.config.features[key] !== after.config.features[key]) {
      out.push({ type: 'feature.set', payload: { key, enabled: before.config.features[key] } });
    }
  }
  return out;
}

function findOption(menu: MenuIndex, optionId: string) {
  for (const g of Object.values(menu.optionGroups)) {
    const o = g.options.find((x) => x.id === optionId);
    if (o) return { group: g, option: o };
  }
  return undefined;
}

/** Depth of a group graph: a group with no nested groups is depth 1. Detects cycles. */
function groupDepth(menu: MenuIndex, groupId: string, seen: string[] = []): number {
  if (seen.includes(groupId)) {
    throw new QrError('COMMAND_INVALID', 'Option groups cannot contain themselves.', { groupId });
  }
  const g = menu.optionGroups[groupId];
  if (!g) throw new QrError('COMMAND_INVALID', 'Unknown option group.', { groupId });
  let deepest = 0;
  for (const o of g.options) {
    for (const child of o.optionGroupIds ?? []) {
      deepest = Math.max(deepest, groupDepth(menu, child, [...seen, groupId]));
    }
  }
  return 1 + deepest;
}

const MAX_GROUP_DEPTH = 2;

function checkGroup(menu: MenuIndex, group: OptionGroup, isNew: boolean): void {
  if (group.storeId !== menu.storeId) throw new QrError('STORE_MISMATCH', undefined, { groupId: group.id });
  if (isNew && menu.optionGroups[group.id]) {
    throw new QrError('COMMAND_INVALID', 'An option group with this id already exists.', { groupId: group.id });
  }
  const ids = new Set<string>();
  for (const o of group.options) {
    if (ids.has(o.id)) throw new QrError('COMMAND_INVALID', 'Duplicate option id in group.', { optionId: o.id });
    ids.add(o.id);
    const clash = findOption(menu, o.id);
    if (clash && clash.group.id !== group.id) {
      throw new QrError('COMMAND_INVALID', 'Option ids must be unique in the store.', { optionId: o.id });
    }
    if (o.linkedItemId && !menu.items[o.linkedItemId]) {
      throw new QrError('ITEM_UNKNOWN', 'Linked item does not exist.', { itemId: o.linkedItemId });
    }
    for (const child of o.optionGroupIds ?? []) {
      if (!menu.optionGroups[child]) throw new QrError('COMMAND_INVALID', 'Nested group does not exist.', { groupId: child });
    }
  }
  if (group.min > group.options.length) {
    throw new QrError('COMMAND_INVALID', 'min is larger than the number of options.', { groupId: group.id });
  }
  const trial: MenuIndex = { ...menu, optionGroups: { ...menu.optionGroups, [group.id]: group } };
  // Every group in the store, as an item's group or as a nested group, stays within depth 2.
  for (const g of Object.values(trial.optionGroups)) {
    if (groupDepth(trial, g.id) > MAX_GROUP_DEPTH) {
      throw new QrError('OPTION_DEPTH_EXCEEDED', 'Nested choices go two levels deep at most.', { groupId: g.id });
    }
  }
}

/** Item -> its groups -> nested groups. The item itself is level 0. */
function checkItemDepth(menu: MenuIndex, groupIds: string[]): void {
  for (const gid of groupIds) {
    if (!menu.optionGroups[gid]) throw new QrError('COMMAND_INVALID', 'Unknown option group.', { groupId: gid });
    if (groupDepth(menu, gid) > MAX_GROUP_DEPTH) {
      throw new QrError('OPTION_DEPTH_EXCEEDED', 'Nested choices go two levels deep at most.', { groupId: gid });
    }
  }
}

function checkItem(state: CommandState, item: Item, isNew: boolean): void {
  const { menu, config } = state;
  if (item.storeId !== menu.storeId) throw new QrError('STORE_MISMATCH', undefined, { itemId: item.id });
  if (isNew && menu.items[item.id]) throw new QrError('COMMAND_INVALID', 'An item with this id already exists.', { itemId: item.id });
  if (!menu.categories[item.categoryId]) throw new QrError('COMMAND_INVALID', 'Unknown category.', { categoryId: item.categoryId });
  if (!config.settings.stations.stations.some((s) => s.id === item.station)) {
    throw new QrError('COMMAND_INVALID', 'Unknown station.', { station: item.station });
  }
  checkItemDepth(menu, item.optionGroupIds);
}

function setSettingValue(state: CommandState, key: SettingKey, value: unknown): CommandState {
  const next = clone(state);
  (next.config.settings as Record<string, unknown>)[key] = value;
  if (key === 'orderTypes') {
    // Pay timing follows the offered order types: new types take the preset's timing.
    const types = value as string[];
    const timing: Record<string, string> = {};
    const presetTiming = PRESET_SETTINGS[next.config.settings.serviceStyle].payTiming as Record<string, string | undefined>;
    for (const t of types) {
      timing[t] = (next.config.settings.payTiming as Record<string, string | undefined>)[t] ?? presetTiming[t] ?? 'before_kitchen';
    }
    (next.config.settings as Record<string, unknown>).payTiming = timing;
  }
  next.config = parseConfig(next.config);
  return next;
}

/* -------------------------------------------------------------------------- */
/* setting.set                                                                 */
/* -------------------------------------------------------------------------- */

const SettingSetVariants = SETTING_KEYS.map((key) =>
  z.object({
    key: z.literal(key),
    value: SettingsSchema.shape[key],
    /** serviceStyle only: re-apply the preset's values. Default true. */
    reapplyPreset: z.boolean().optional(),
  }),
) as unknown as [z.ZodObject<{ key: z.ZodLiteral<SettingKey>; value: z.ZodType; reapplyPreset: z.ZodOptional<z.ZodBoolean> }>, ...z.ZodObject[]];

export const SettingSetPayload = z.discriminatedUnion('key', SettingSetVariants as never) as unknown as z.ZodType<{
  key: SettingKey;
  value: unknown;
  reapplyPreset?: boolean | undefined;
}>;
export type SettingSetPayload = z.infer<typeof SettingSetPayload>;

const HIGH_SETTINGS: SettingKey[] = ['tax', 'paymentMethods', 'payoutAccount'];
const LOW_SETTINGS: SettingKey[] = ['logo', 'coverMedia', 'theme', 'languages', 'reviewLink'];

const SETTING_SURFACES: Partial<Record<SettingKey, Surface[]>> = {
  name: ['guest.menu', 'guest.storePage'],
  address: ['guest.storePage', 'guest.cart'],
  logo: ['guest.menu', 'guest.storePage'],
  theme: ['guest.menu', 'guest.itemSheet', 'guest.cart'],
  coverMedia: ['guest.menu'],
  serviceStyle: ['guest.menu', 'guest.cart', 'guest.payment', 'staff.pos'],
  orderTypes: ['guest.cart', 'staff.pos'],
  payTiming: ['guest.cart', 'guest.payment', 'guest.orderStatus'],
  openingHours: ['guest.menu'],
  tax: ['guest.cart', 'guest.orderStatus', 'guest.payment'],
  serviceCharge: ['guest.cart', 'guest.payment'],
  paymentMethods: ['guest.payment', 'staff.pos'],
  payoutAccount: ['dashboard.home'],
  guestLogin: ['guest.welcome', 'guest.cart'],
  languages: ['guest.menu'],
  stations: ['staff.kds'],
  reviewLink: ['guest.orderStatus'],
  receiptContact: ['dashboard.home'],
};

function applySettingSet(p: SettingSetPayload, s: CommandState): CommandState {
  let next = setSettingValue(s, p.key, p.value);
  if (p.key === 'serviceStyle' && p.reapplyPreset !== false) {
    next = { ...next, config: reapplyPreset(next.config, p.value as Preset, s.facts) };
  }
  return next;
}

export const settingSet = defineCommand({
  type: 'setting.set',
  area: 'settings',
  description:
    'Set one store setting from the settings list, such as guest login (off, optional, required), service charge, opening hours, theme or tax. ' +
    'Use it for any value the owner chooses. Changing serviceStyle re-applies the preset values for order types, pay timing and features after a preview. ' +
    'It affects every surface that reads that setting.',
  schema: SettingSetPayload,
  requiredRole: 'manager',
  risk: (p) => (HIGH_SETTINGS.includes(p.key) ? 'high' : LOW_SETTINGS.includes(p.key) ? 'low' : 'medium'),
  surfaces: [...new Set(Object.values(SETTING_SURFACES).flat())] as Surface[],
  summarise: (p, s) => {
    const before = JSON.stringify(s.config.settings[p.key]);
    return `I will change ${p.key} from ${before} to ${JSON.stringify(p.value)}.${
      p.key === 'serviceStyle' && p.reapplyPreset !== false ? ' The preset values for order types, pay timing and features will be re-applied.' : ''
    }`;
  },
  apply: applySettingSet,
  inverse: (p, s) => configInverse(s, applySettingSet(p, s)),
});

/* -------------------------------------------------------------------------- */
/* feature.set                                                                 */
/* -------------------------------------------------------------------------- */

export const FeatureSetPayload = z.object({
  key: z.enum(FEATURE_KEYS as [FeatureKey, ...FeatureKey[]]),
  enabled: z.boolean(),
});

function applyFeatureSet(p: z.infer<typeof FeatureSetPayload>, s: CommandState): CommandState {
  const next = clone(s);
  if (p.enabled && !s.config.features[p.key]) {
    const unmet = unmetRequirements(p.key, s.facts);
    if (unmet.length > 0) {
      throw new QrError('FEATURE_REQUIREMENT_UNMET', unmet.map((u) => u.reason).join(' '), {
        feature: p.key,
        unmet: unmet.map((u) => u.requirement),
      });
    }
  }
  next.config.features[p.key] = p.enabled;
  next.config = parseConfig(next.config);
  return next;
}

export const featureSet = defineCommand({
  type: 'feature.set',
  area: 'features',
  description:
    'Switch one feature on or off, for example call waiter, tips, play to order or ratings. A feature is on or off and has no sub-options. ' +
    'Off removes every trace of it for guests and staff. Switching on is refused with a reason when a requirement is unmet, such as having no table.',
  schema: FeatureSetPayload,
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: [...new Set(FEATURE_KEYS.flatMap((k) => FEATURES[k].surfaces))] as Surface[],
  summarise: (p) => {
    const f = FEATURES[p.key];
    return `I will turn ${p.enabled ? 'on' : 'off'} "${f.name.en}". ${f.explain.en}`;
  },
  apply: applyFeatureSet,
  inverse: (p, s) => configInverse(s, applyFeatureSet(p, s)),
});

/* -------------------------------------------------------------------------- */
/* menu.item.setSoldOut                                                        */
/* -------------------------------------------------------------------------- */

export const SoldOutPayload = z.object({
  target: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('item'), itemId: Id }),
    z.object({ kind: z.literal('option'), optionId: Id }),
  ]),
  soldOut: z.boolean(),
});

export const menuItemSetSoldOut = defineCommand({
  type: 'menu.item.setSoldOut',
  area: 'menu',
  description:
    'Mark an item, or one choice inside an item, sold out or back in stock. Use it when the kitchen runs out. ' +
    'Every open guest screen shows the change within 2 seconds and carts keep the line with a named tag.',
  schema: SoldOutPayload,
  requiredRole: 'staff',
  risk: 'low',
  surfaces: ['guest.menu', 'guest.itemSheet', 'guest.cart', 'staff.pos', 'staff.kds'],
  summarise: (p, s) => {
    const word = p.soldOut ? 'sold out' : 'back in stock';
    if (p.target.kind === 'item') return `I will mark "${s.menu.items[p.target.itemId]?.name ?? p.target.itemId}" ${word}.`;
    const found = findOption(s.menu, p.target.optionId);
    return `I will mark the choice "${found?.option.name ?? p.target.optionId}" ${word}.`;
  },
  apply: (p, s) => {
    const next = clone(s);
    if (p.target.kind === 'item') {
      const item = next.menu.items[p.target.itemId];
      if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: p.target.itemId });
      item.soldOut = p.soldOut;
    } else {
      const found = findOption(next.menu, p.target.optionId);
      if (!found) throw new QrError('COMMAND_INVALID', 'Unknown option.', { optionId: p.target.optionId });
      found.option.soldOut = p.soldOut;
    }
    return next;
  },
  inverse: (p, s) => {
    const prior =
      p.target.kind === 'item'
        ? s.menu.items[p.target.itemId]?.soldOut
        : findOption(s.menu, p.target.optionId)?.option.soldOut;
    if (prior === undefined) throw new QrError('COMMAND_INVALID', 'Unknown target.');
    return [{ type: 'menu.item.setSoldOut', payload: { target: p.target, soldOut: prior } }];
  },
});

/* -------------------------------------------------------------------------- */
/* Course, nutrition and house note (docs/03 section 3, docs/25 section 5)     */
/* -------------------------------------------------------------------------- */

const ENRICH_SURFACES: Surface[] = ['guest.menu', 'guest.itemSheet', 'guest.compare', 'dashboard.menu'];

function getItem(s: CommandState, itemId: string): Item {
  const item = s.menu.items[itemId];
  if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId });
  return item;
}

function setOrDelete<K extends keyof Item>(item: Item, key: K, value: Item[K] | undefined): void {
  if (value === undefined) delete item[key];
  else item[key] = value;
}

export const menuItemSetCourse = defineCommand({
  type: 'menu.item.setCourse',
  area: 'menu',
  description:
    'Set the course of an item (starter, main, side, bread, rice, dessert, drink or snack), or clear it with null. Use it when the owner corrects a course. ' +
    'Courses drive suggestions, filters, compare and the waiter. An owner choice is final: with ifNotOwner true (the AI path) it never overwrites a value the owner set.',
  schema: z.object({
    itemId: Id,
    course: Course.nullable(),
    /** Who is setting it. A person sets owner values; an AI run sets ai values. */
    source: z.enum(['ai', 'owner']).default('owner'),
    /** AI path: keep the owner's value when there is one. */
    ifNotOwner: z.boolean().default(false),
  }),
  requiredRole: 'manager',
  risk: 'low',
  surfaces: ENRICH_SURFACES,
  summarise: (p, s) => `I will ${p.course ? `set the course of "${s.menu.items[p.itemId]?.name ?? p.itemId}" to ${p.course}` : `clear the course of "${s.menu.items[p.itemId]?.name ?? p.itemId}"`}.`,
  apply: (p, s) => {
    const item = getItem(s, p.itemId);
    const next = clone(s);
    const target = next.menu.items[p.itemId]!;
    if (p.ifNotOwner && p.course !== null) {
      const merged = mergeAiTag(tagFrom(item.course, item.courseSource), { value: p.course, source: 'ai' });
      setOrDelete(target, 'course', merged.value);
      setOrDelete(target, 'courseSource', merged.source);
    } else if (p.course === null) {
      if (p.ifNotOwner && tagFrom(item.course, item.courseSource)?.source === 'owner') return next;
      setOrDelete(target, 'course', undefined);
      setOrDelete(target, 'courseSource', undefined);
    } else {
      setOrDelete(target, 'course', p.course);
      setOrDelete(target, 'courseSource', p.source);
    }
    return next;
  },
  inverse: (p, s) => {
    const item = getItem(s, p.itemId);
    // Exact restore: set directly, not through the AI merge.
    return [{ type: 'menu.item.setCourse', payload: { itemId: p.itemId, course: item.course ?? null, source: item.courseSource ?? 'owner', ifNotOwner: false } }];
  },
});

const NutritionInput = NutritionSchema.nullable();

export const menuItemSetNutrition = defineCommand({
  type: 'menu.item.setNutrition',
  area: 'menu',
  description:
    'Set the calories and protein estimate of an item (per serving), or clear it with null. Use it when the owner confirms or edits the numbers; set source to owner. ' +
    'Numbers are always shown as about. With ifNotOwner true (the AI path) it never overwrites numbers the owner set. It never changes prices.',
  schema: z.object({
    itemId: Id,
    nutrition: NutritionInput,
    ifNotOwner: z.boolean().default(false),
  }),
  requiredRole: 'manager',
  risk: 'low',
  surfaces: ENRICH_SURFACES,
  summarise: (p, s) => {
    const name = s.menu.items[p.itemId]?.name ?? p.itemId;
    return p.nutrition
      ? `I will set the nutrition of "${name}" to about ${p.nutrition.kcal} kcal and ${p.nutrition.proteinG} g protein (${p.nutrition.source === 'owner' ? 'confirmed by the restaurant' : 'AI estimate'}).`
      : `I will clear the nutrition of "${name}".`;
  },
  apply: (p, s) => {
    const item = getItem(s, p.itemId);
    const next = clone(s);
    const target = next.menu.items[p.itemId]!;
    if (p.ifNotOwner) {
      if (p.nutrition === null) {
        if (item.nutrition?.source === 'owner') return next;
        setOrDelete(target, 'nutrition', undefined);
      } else {
        setOrDelete(target, 'nutrition', mergeAiTag(item.nutrition, p.nutrition));
      }
    } else {
      setOrDelete(target, 'nutrition', p.nutrition ?? undefined);
    }
    return next;
  },
  inverse: (p, s) => {
    const item = getItem(s, p.itemId);
    return [{ type: 'menu.item.setNutrition', payload: { itemId: p.itemId, nutrition: item.nutrition ?? null, ifNotOwner: false } }];
  },
});

export const menuItemSetHouseNote = defineCommand({
  type: 'menu.item.setHouseNote',
  area: 'menu',
  description:
    'Set the short house note of an item, a line from the owner that the waiter character may use when it explains the dish (up to 280 characters), or clear it with null. ' +
    'It changes no price and no stock.',
  schema: z.object({ itemId: Id, houseNote: z.string().trim().min(1).max(280).nullable() }),
  requiredRole: 'manager',
  risk: 'low',
  surfaces: ['guest.itemSheet', 'guest.menu', 'dashboard.menu'],
  summarise: (p, s) => `I will ${p.houseNote ? 'set' : 'clear'} the house note of "${s.menu.items[p.itemId]?.name ?? p.itemId}".`,
  apply: (p, s) => {
    getItem(s, p.itemId);
    const next = clone(s);
    setOrDelete(next.menu.items[p.itemId]!, 'houseNote', p.houseNote ?? undefined);
    return next;
  },
  inverse: (p, s) => [{ type: 'menu.item.setHouseNote', payload: { itemId: p.itemId, houseNote: getItem(s, p.itemId).houseNote ?? null } }],
});

/* -------------------------------------------------------------------------- */
/* Supporting commands: basic ones that combo.create expands into              */
/* -------------------------------------------------------------------------- */

export const menuItemCreate = defineCommand({
  type: 'menu.item.create',
  area: 'menu',
  description:
    'Create one menu item with its price, tax class, veg mark, station and attached choice groups. Use it to add a dish or drink. ' +
    'It appears in the draft menu and goes live on the next publish.',
  schema: z.object({ item: ItemSchema }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.menu', 'dashboard.menu'],
  summarise: (p) => `I will add "${p.item.name}" at ${p.item.basePrice / 100} rupees.`,
  apply: (p, s) => {
    checkItem(s, p.item, true);
    const next = clone(s);
    next.menu.items[p.item.id] = clone(p.item);
    return next;
  },
  inverse: (p) => [{ type: 'menu.item.delete', payload: { itemId: p.item.id } }],
});

export const menuItemDelete = defineCommand({
  type: 'menu.item.delete',
  area: 'menu',
  description:
    'Delete one menu item. Use it for a dish that is no longer served. It is refused while the item is a part of a combo. Undo recreates it exactly.',
  schema: z.object({ itemId: Id }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.menu', 'dashboard.menu'],
  summarise: (p, s) => `I will delete "${s.menu.items[p.itemId]?.name ?? p.itemId}".`,
  apply: (p, s) => {
    if (!s.menu.items[p.itemId]) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: p.itemId });
    for (const g of Object.values(s.menu.optionGroups)) {
      if (g.options.some((o) => o.linkedItemId === p.itemId)) {
        throw new QrError('COMMAND_INVALID', 'The item is part of a combo. Remove it from the combo first.', { itemId: p.itemId, groupId: g.id });
      }
    }
    const next = clone(s);
    delete next.menu.items[p.itemId];
    return next;
  },
  inverse: (p, s) => {
    const item = s.menu.items[p.itemId];
    if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: p.itemId });
    return [{ type: 'menu.item.create', payload: { item: clone(item) } }];
  },
});

export const choicesGroupCreate = defineCommand({
  type: 'choices.group.create',
  area: 'choices',
  description:
    'Create a reusable choice group with a name, a rule (minimum and maximum) and options. Options have a name and a price change, or point to another item. ' +
    'Use it for sizes, add-ons, spice level or the parts of a combo. Attach it to items with choices.attach.',
  schema: z.object({ group: OptionGroupSchema }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.itemSheet', 'guest.cart', 'dashboard.menu'],
  summarise: (p) => `I will create the choice group "${p.group.name}" with ${p.group.options.length} options (choose ${p.group.min} to ${p.group.max}).`,
  apply: (p, s) => {
    checkGroup(s.menu, p.group, true);
    const next = clone(s);
    next.menu.optionGroups[p.group.id] = clone(p.group);
    return next;
  },
  inverse: (p) => [{ type: 'choices.group.delete', payload: { groupId: p.group.id } }],
});

export const choicesGroupDelete = defineCommand({
  type: 'choices.group.delete',
  area: 'choices',
  description:
    'Delete one choice group. Use it when a group is no longer wanted. It is refused while the group is attached to an item or nested in an option. Undo recreates it.',
  schema: z.object({ groupId: Id }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.itemSheet', 'dashboard.menu'],
  summarise: (p, s) => `I will delete the choice group "${s.menu.optionGroups[p.groupId]?.name ?? p.groupId}".`,
  apply: (p, s) => {
    if (!s.menu.optionGroups[p.groupId]) throw new QrError('COMMAND_INVALID', 'Unknown option group.', { groupId: p.groupId });
    const usedBy = Object.values(s.menu.items).find((i) => i.optionGroupIds.includes(p.groupId));
    const nestedIn = Object.values(s.menu.optionGroups).find((g) => g.options.some((o) => (o.optionGroupIds ?? []).includes(p.groupId)));
    if (usedBy || nestedIn) {
      throw new QrError('COMMAND_INVALID', 'The group is still in use. Detach it first.', { groupId: p.groupId });
    }
    const next = clone(s);
    delete next.menu.optionGroups[p.groupId];
    return next;
  },
  inverse: (p, s) => {
    const g = s.menu.optionGroups[p.groupId];
    if (!g) throw new QrError('COMMAND_INVALID', 'Unknown option group.', { groupId: p.groupId });
    return [{ type: 'choices.group.create', payload: { group: clone(g) } }];
  },
});

export const choicesAttach = defineCommand({
  type: 'choices.attach',
  area: 'choices',
  description: 'Attach an existing choice group to an item so the item sheet shows it. Use it after choices.group.create. Groups are reusable, so edit once and it updates everywhere.',
  schema: z.object({ itemId: Id, groupId: Id, index: z.number().int().min(0).optional() }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.itemSheet', 'guest.cart'],
  summarise: (p, s) => `I will add the choice group "${s.menu.optionGroups[p.groupId]?.name ?? p.groupId}" to "${s.menu.items[p.itemId]?.name ?? p.itemId}".`,
  apply: (p, s) => {
    const item = s.menu.items[p.itemId];
    if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: p.itemId });
    if (item.optionGroupIds.includes(p.groupId)) throw new QrError('COMMAND_INVALID', 'Already attached.', { groupId: p.groupId });
    checkItemDepth(s.menu, [p.groupId]);
    const next = clone(s);
    const target = next.menu.items[p.itemId]!;
    const at = Math.min(p.index ?? target.optionGroupIds.length, target.optionGroupIds.length);
    target.optionGroupIds.splice(at, 0, p.groupId);
    return next;
  },
  inverse: (p) => [{ type: 'choices.detach', payload: { itemId: p.itemId, groupId: p.groupId } }],
});

export const choicesDetach = defineCommand({
  type: 'choices.detach',
  area: 'choices',
  description: 'Detach a choice group from an item. The group stays available for other items. Use it to remove a choice from one dish without deleting the group.',
  schema: z.object({ itemId: Id, groupId: Id }),
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.itemSheet', 'guest.cart'],
  summarise: (p, s) => `I will remove the choice group "${s.menu.optionGroups[p.groupId]?.name ?? p.groupId}" from "${s.menu.items[p.itemId]?.name ?? p.itemId}".`,
  apply: (p, s) => {
    const item = s.menu.items[p.itemId];
    if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: p.itemId });
    if (!item.optionGroupIds.includes(p.groupId)) throw new QrError('COMMAND_INVALID', 'Not attached.', { groupId: p.groupId });
    const next = clone(s);
    const target = next.menu.items[p.itemId]!;
    target.optionGroupIds = target.optionGroupIds.filter((g) => g !== p.groupId);
    return next;
  },
  inverse: (p, s) => {
    const index = s.menu.items[p.itemId]?.optionGroupIds.indexOf(p.groupId) ?? 0;
    return [{ type: 'choices.attach', payload: { itemId: p.itemId, groupId: p.groupId, index } }];
  },
});

/* -------------------------------------------------------------------------- */
/* combo.create (compound)                                                     */
/* -------------------------------------------------------------------------- */

export const ComboPartSchema = z.object({
  groupId: Id,
  /** Group name shown on the item sheet, for example "Choose your main". */
  name: z.string().min(1),
  /** Which items or categories to choose from. */
  from: z.object({ itemIds: z.array(Id).default([]), categoryIds: z.array(Id).default([]) }),
  /** How many the guest picks. */
  count: z.number().int().min(1),
});

export const ComboCreatePayload = z.object({
  itemId: Id,
  categoryId: Id,
  name: z.string().min(1),
  /** The combo price, in paise. Linked items add no price of their own. */
  comboPrice: NonNegPaise,
  taxClass: TaxClassKey.optional(),
  parts: z.array(ComboPartSchema).min(1),
});

function comboCandidates(s: CommandState, part: z.infer<typeof ComboPartSchema>): Item[] {
  const ids = new Set<string>(part.from.itemIds ?? []);
  for (const item of Object.values(s.menu.items)) {
    if ((part.from.categoryIds ?? []).includes(item.categoryId)) ids.add(item.id);
  }
  return [...ids].map((id) => {
    const item = s.menu.items[id];
    if (!item) throw new QrError('ITEM_UNKNOWN', 'A combo part points to an item that does not exist.', { itemId: id });
    return item;
  });
}

function expandCombo(p: z.infer<typeof ComboCreatePayload>, s: CommandState): InverseCommand[] {
  const cmds: InverseCommand[] = [];
  const linked: Item[] = [];
  for (const part of p.parts) {
    const candidates = comboCandidates(s, part);
    if (candidates.length === 0 || part.count > candidates.length) {
      throw new QrError('COMMAND_INVALID', `"${part.name}" needs at least ${part.count} items to choose from.`, { groupId: part.groupId });
    }
    linked.push(...candidates);
    const group: OptionGroup = {
      id: part.groupId,
      storeId: s.menu.storeId,
      name: part.name,
      min: part.count,
      max: part.count,
      options: candidates.map((i) => ({
        id: `${part.groupId}:${i.id}`,
        name: i.name,
        priceDelta: 0,
        soldOut: false,
        linkedItemId: i.id,
      })),
    };
    cmds.push({ type: 'choices.group.create', payload: { group } });
  }
  const dietary = linked.some((i) => i.dietaryType === 'non_veg')
    ? 'non_veg'
    : linked.some((i) => i.dietaryType === 'egg')
      ? 'egg'
      : 'veg';
  const item: Item = {
    id: p.itemId,
    storeId: s.menu.storeId,
    categoryId: p.categoryId,
    name: p.name,
    basePrice: p.comboPrice,
    taxClass: p.taxClass ?? TAX_CLASS_STANDARD,
    dietaryType: DietaryType.parse(dietary),
    tags: [],
    station: linked[0]!.station,
    soldOut: false,
    optionGroupIds: p.parts.map((x) => x.groupId),
  };
  cmds.push({ type: 'menu.item.create', payload: { item } });
  return cmds;
}

export const comboCreate = defineCommand({
  type: 'combo.create',
  area: 'choices',
  description:
    'Create a combo: an item whose choice groups hold other items. It asks three things: which items or categories to choose from, how many, and the combo price. ' +
    'It expands into choices.group.create and menu.item.create, so undo removes all of it.',
  schema: ComboCreatePayload,
  requiredRole: 'manager',
  risk: 'medium',
  surfaces: ['guest.menu', 'guest.itemSheet', 'guest.cart', 'dashboard.menu'],
  summarise: (p, s) => {
    const parts = p.parts.map((x) => `${x.count} from ${comboCandidates(s, x).map((i) => i.name).join(', ')}`);
    return `I will create the combo "${p.name}" at ${p.comboPrice / 100} rupees: ${parts.join('; ')}.`;
  },
  expand: expandCombo,
  apply: (p, s) => runSequence(expandCombo(p, s), s).state,
  inverse: (p, s) => runSequence(expandCombo(p, s), s).inverse,
});

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export const COMMANDS = [
  settingSet,
  featureSet,
  menuItemSetSoldOut,
  choicesGroupCreate,
  comboCreate,
  // Menu enrichment: course, nutrition, house note (low risk, never touch prices)
  menuItemSetCourse,
  menuItemSetNutrition,
  menuItemSetHouseNote,
  // Supporting commands: the basic ones combo.create expands into, and the inverses.
  menuItemCreate,
  menuItemDelete,
  choicesGroupDelete,
  choicesAttach,
  choicesDetach,
] as const;

export type CommandType = (typeof COMMANDS)[number]['type'];
export const COMMAND_TYPES = COMMANDS.map((c) => c.type) as readonly CommandType[];

/** The five commands the first catalogue was asked to carry. */
export const FIRST_CATALOGUE: readonly CommandType[] = [
  'setting.set',
  'feature.set',
  'menu.item.setSoldOut',
  'choices.group.create',
  'combo.create',
];

const BY_TYPE = new Map<string, CommandDef<string, z.ZodType>>(
  COMMANDS.map((c) => [c.type, c as unknown as CommandDef<string, z.ZodType>]),
);

export function getCommand(type: string): CommandDef<string, z.ZodType> | undefined {
  return BY_TYPE.get(type);
}

export const CommandEnvelopeSchema = z.object({
  type: z.enum(COMMAND_TYPES as [CommandType, ...CommandType[]]),
  storeId: Id,
  payload: z.unknown(),
  actor: CommandActorSchema,
  mode: z.enum(COMMAND_MODES),
  idempotencyKey: z.string().min(8),
});
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;

/** What `GET /v1/commands` returns: every command with its JSON schema, description and required role. */
export function describeCatalogue() {
  return COMMANDS.map((c) => ({
    type: c.type,
    area: c.area,
    description: c.description,
    risk: typeof c.risk === 'function' ? 'varies by payload' : c.risk,
    requiredRole: c.requiredRole,
    compound: Boolean(c.expand),
    schema: z.toJSONSchema(c.schema),
  }));
}

/* -------------------------------------------------------------------------- */
/* Running commands                                                            */
/* -------------------------------------------------------------------------- */

/** Apply commands in order, collecting inverses so the whole sequence can be undone. */
export function runSequence(
  cmds: readonly InverseCommand[],
  state: CommandState,
): { state: CommandState; inverse: InverseCommand[] } {
  let current = state;
  const inverses: InverseCommand[][] = [];
  for (const c of cmds) {
    const def = getCommand(c.type);
    if (!def) throw new QrError('COMMAND_INVALID', `Unknown command ${c.type}`);
    const payload = def.schema.parse(c.payload);
    inverses.push(def.inverse(payload, current));
    current = def.apply(payload, current);
  }
  return { state: current, inverse: inverses.reverse().flat() };
}

export type Gate = 'allow' | 'needs_approval' | 'forbid';

/**
 * Approval rules (docs/25 section 8). Low applies directly. Medium applies directly for a
 * person and needs approval for an agent by default. High needs the owner in the dashboard
 * and is never available to agents.
 */
export function gate(risk: RiskTier, actor: Actor | CommandActor): Gate {
  if (actor.kind === 'agent') return risk === 'low' ? 'allow' : risk === 'medium' ? 'needs_approval' : 'forbid';
  if (actor.kind === 'assistant') return risk === 'high' ? 'needs_approval' : 'allow';
  return 'allow';
}

export type CommandOutcome =
  | { ok: true; status: 'previewed'; preview: Preview; risk: RiskTier }
  | { ok: true; status: 'applied'; preview: Preview; risk: RiskTier; state: CommandState; inverse: InverseCommand[] }
  | { ok: true; status: 'needs_approval'; preview: Preview; risk: RiskTier }
  | { ok: false; error: QrError };

/** Validate, preview and apply one command (docs/25 section 5 lifecycle). Pure. */
export function executeCommand(
  envelope: CommandEnvelope,
  state: CommandState,
  options: { role?: Role } = {},
): CommandOutcome {
  try {
    const env = CommandEnvelopeSchema.parse(envelope);
    if (env.storeId !== state.menu.storeId) throw new QrError('STORE_MISMATCH');
    const def = getCommand(env.type)!;
    const parsed = def.schema.safeParse(env.payload);
    if (!parsed.success) {
      throw new QrError('COMMAND_INVALID', 'The payload does not match the command schema.', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const payload = parsed.data;
    const risk = riskOf(def, payload);
    const verdict = gate(risk, env.actor);
    if (verdict === 'forbid') {
      throw new QrError('COMMAND_RISK_FORBIDDEN', 'This command is not available to agents.', { type: env.type, risk });
    }
    if (env.actor.kind === 'staff') {
      const role = options.role ?? 'staff';
      const needed: Role = risk === 'high' ? 'owner' : def.requiredRole;
      if (ROLE_RANK[role] < ROLE_RANK[needed]) {
        throw new QrError('COMMAND_RISK_FORBIDDEN', `This command needs the ${needed} role.`, { type: env.type, risk, needed });
      }
    }
    const draft = def.apply(payload, state);
    const changes = diffState(state, draft);
    const preview: Preview = {
      summary: def.summarise(payload, state),
      changes,
      affectedSurfaces: changes.length === 0 ? [] : [...def.surfaces],
      draft,
      noop: changes.length === 0,
    };
    if (env.mode === 'preview') return { ok: true, status: 'previewed', preview, risk };
    if (verdict === 'needs_approval') return { ok: true, status: 'needs_approval', preview, risk };
    return { ok: true, status: 'applied', preview, risk, state: draft, inverse: def.inverse(payload, state) };
  } catch (e) {
    if (e instanceof QrError) return { ok: false, error: e };
    if (e instanceof z.ZodError) {
      return { ok: false, error: new QrError('COMMAND_INVALID', 'The command envelope is invalid.', { issues: e.issues.map((i) => i.message) }) };
    }
    throw e;
  }
}
