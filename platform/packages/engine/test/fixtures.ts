import {
  createStoreConfig,
  type CartLine,
  type Category,
  type Item,
  type MenuIndex,
  type OptionGroup,
  type Preset,
  type Selection,
  type StoreConfig,
} from '@qr-first/contracts';
import type { EngineContext } from '../src';

export const STORE = 'store_kebab_corner';
export const NOW = '2026-11-14T13:00:00.000Z';

/** Delhi address, as docs/24 style stores would have. */
export function makeConfig(
  preset: Preset = 'hybrid',
  patch: {
    tax?: Partial<StoreConfig['settings']['tax']>;
    serviceCharge?: number;
    features?: Partial<StoreConfig['features']>;
    gst?: 'registered' | 'composition' | 'unregistered';
  } = {},
): StoreConfig {
  const base = createStoreConfig({
    name: 'Kebab Corner',
    address: { line1: '12 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
    preset,
    ...(patch.gst ? { gst: patch.gst } : {}),
  });
  return {
    ...base,
    settings: {
      ...base.settings,
      tax: { ...base.settings.tax, ...patch.tax },
      serviceCharge: patch.serviceCharge ?? base.settings.serviceCharge,
    },
    features: { ...base.features, ...patch.features },
  };
}

const cat = (id: string, name: string, sort: number): Category => ({ id, storeId: STORE, name, sort });

function item(p: Partial<Item> & Pick<Item, 'id' | 'name' | 'basePrice' | 'categoryId'>): Item {
  return {
    storeId: STORE,
    taxClass: 'standard',
    dietaryType: 'veg',
    tags: [],
    station: 'kitchen',
    soldOut: false,
    optionGroupIds: [],
    ...p,
  };
}

const group = (id: string, name: string, min: number, max: number, options: OptionGroup['options']): OptionGroup => ({
  id,
  storeId: STORE,
  name,
  min,
  max,
  options,
});
const opt = (id: string, name: string, priceDelta = 0, extra: Partial<OptionGroup['options'][number]> = {}) => ({
  id,
  name,
  priceDelta,
  soldOut: false,
  ...extra,
});

export function makeMenu(): MenuIndex {
  const items: Item[] = [
    item({ id: 'galouti', name: 'Galouti Kebab', basePrice: 42000, takeawayPrice: 40000, dietaryType: 'non_veg', course: 'starter', categoryId: 'starters' }),
    item({ id: 'seekh', name: 'Seekh Kebab', basePrice: 38000, dietaryType: 'non_veg', course: 'starter', categoryId: 'starters' }),
    item({ id: 'paneer_tikka', name: 'Paneer Tikka', basePrice: 32000, course: 'starter', categoryId: 'starters' }),
    item({ id: 'hara_bhara', name: 'Hara Bhara Kebab', basePrice: 30000, course: 'starter', categoryId: 'starters' }),
    item({ id: 'samosa', name: 'Samosa', basePrice: 4500, course: 'snack', categoryId: 'starters' }),
    item({ id: 'pakora', name: 'Onion Pakora', basePrice: 5000, course: 'snack', categoryId: 'starters' }),
    item({ id: 'jalebi', name: 'Jalebi', basePrice: 5100, course: 'dessert', categoryId: 'starters' }),
    item({ id: 'butter_chicken', name: 'Butter Chicken', basePrice: 46000, dietaryType: 'non_veg', course: 'main', categoryId: 'mains', optionGroupIds: ['g_portion'] }),
    item({ id: 'dal_makhani', name: 'Dal Makhani', basePrice: 28000, course: 'main', categoryId: 'mains' }),
    item({ id: 'nihari', name: 'Nalli Nihari', basePrice: 52000, dietaryType: 'non_veg', course: 'main', categoryId: 'mains', optionGroupIds: ['g_bread'] }),
    item({ id: 'thali', name: 'Veg Thali', basePrice: 34000, course: 'main', categoryId: 'mains', optionGroupIds: ['g_thali_main'] }),
    item({ id: 'naan', name: 'Butter Naan', basePrice: 6000, course: 'bread', categoryId: 'breads' }),
    item({ id: 'rumali', name: 'Rumali Roti', basePrice: 5000, course: 'bread', categoryId: 'breads' }),
    item({ id: 'chai', name: 'Masala Chai', basePrice: 8000, course: 'drink', categoryId: 'drinks' }),
    item({ id: 'cold_coffee', name: 'Cold Coffee', basePrice: 18000, course: 'drink', categoryId: 'drinks', optionGroupIds: ['g_size', 'g_milk', 'g_addons'] }),
    item({ id: 'water', name: 'Packaged Water 1L', basePrice: 2000, course: 'drink', categoryId: 'drinks', tags: ['mrp'] }),
    item({ id: 'beer', name: 'Kingfisher Strong 650ml', basePrice: 35000, taxClass: 'alcohol_vat', course: 'drink', categoryId: 'bar', dietaryType: 'veg', tags: ['contains_alcohol'] }),
    item({
      id: 'kebab_combo',
      name: 'Kebab Combo',
      basePrice: 69900,
      takeawayPrice: 65000,
      dietaryType: 'non_veg',
      categoryId: 'combos',
      optionGroupIds: ['g_combo_starter', 'g_combo_main', 'g_combo_bread'],
    }),
  ];
  const groups: OptionGroup[] = [
    group('g_portion', 'Portion', 1, 1, [opt('o_half', 'Half', -9000), opt('o_full', 'Full', 0)]),
    group('g_bread', 'Choose your bread', 1, 1, [opt('o_rumali', 'Rumali roti', 0), opt('o_naan', 'Butter naan', 1000)]),
    group('g_size', 'Size', 1, 1, [opt('o_size_s', 'Small', 0), opt('o_size_m', 'Medium', 3000), opt('o_size_l', 'Large', 6000)]),
    group('g_milk', 'Milk', 0, 1, [opt('o_oat', 'Oat milk', 4000), opt('o_almond', 'Almond milk', 5000), opt('o_whole', 'Whole milk', 0)]),
    group('g_addons', 'Add-ons', 0, 2, [opt('o_shot', 'Extra shot', 3000), opt('o_syrup', 'Syrup', 2500), opt('o_cream', 'Whipped cream', 2000)]),
    group('g_thali_main', 'Choose your main', 1, 1, [
      opt('o_t_paneer', 'Shahi paneer', 0, { optionGroupIds: ['g_t_spice'] }),
      opt('o_t_dal', 'Dal tadka', 0),
    ]),
    group('g_t_spice', 'Spice level', 1, 1, [opt('o_mild', 'Mild'), opt('o_hot', 'Hot')]),
    group('g_combo_starter', 'Choose your starter', 1, 1, [
      opt('o_cs_galouti', 'Galouti Kebab', 0, { linkedItemId: 'galouti' }),
      opt('o_cs_seekh', 'Seekh Kebab', 0, { linkedItemId: 'seekh' }),
      opt('o_cs_paneer', 'Paneer Tikka', 0, { linkedItemId: 'paneer_tikka' }),
    ]),
    group('g_combo_main', 'Choose your main', 1, 1, [
      opt('o_cm_bc', 'Butter Chicken', 0, { linkedItemId: 'butter_chicken', optionGroupIds: ['g_bc_extras'] }),
      opt('o_cm_dal', 'Dal Makhani', 0, { linkedItemId: 'dal_makhani' }),
    ]),
    group('g_bc_extras', 'Extras', 0, 1, [opt('o_extra_butter', 'Extra butter', 3000)]),
    group('g_combo_bread', 'Choose your bread', 1, 1, [
      opt('o_cb_naan', 'Butter Naan', 1500, { linkedItemId: 'naan' }),
      opt('o_cb_rumali', 'Rumali Roti', 0, { linkedItemId: 'rumali' }),
    ]),
  ];
  return {
    storeId: STORE,
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    optionGroups: Object.fromEntries(groups.map((g) => [g.id, g])),
    categories: Object.fromEntries(
      [cat('starters', 'Starters', 1), cat('mains', 'Mains', 2), cat('breads', 'Breads', 3), cat('drinks', 'Drinks', 4), cat('bar', 'Bar', 5), cat('combos', 'Combos', 6)].map((c) => [c.id, c]),
    ),
  };
}

export function makeCtx(over: { config?: StoreConfig; menu?: MenuIndex; stateVatRateBp?: number | null } = {}): EngineContext {
  return {
    config: over.config ?? makeConfig(),
    menu: over.menu ?? makeMenu(),
    ...(over.stateVatRateBp === null ? {} : { stateVatRateBp: over.stateVatRateBp ?? 2000 }),
    now: NOW,
  };
}

/** One line. `selections` is a compact form: [groupId, optionId, ...] pairs or full Selections. */
export function line(lineId: string, itemId: string, qty = 1, selections: Selection[] = []): CartLine {
  return { lineId, itemId, qty, selections };
}

export const pick = (groupId: string, ...optionIds: string[]): Selection => ({ groupId, options: optionIds.map((optionId) => ({ optionId })) });
export const pickWith = (groupId: string, optionId: string, children: Selection[]): Selection => ({ groupId, options: [{ optionId, children }] });

/** The three-part combo from the pricing brief: starter, main with a nested extra, bread. */
export function comboSelections(): Selection[] {
  return [
    pick('g_combo_starter', 'o_cs_galouti'),
    pickWith('g_combo_main', 'o_cm_bc', [pick('g_bc_extras', 'o_extra_butter')]),
    pick('g_combo_bread', 'o_cb_naan'),
  ];
}
