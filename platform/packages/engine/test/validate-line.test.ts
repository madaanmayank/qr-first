import { describe, it, expect } from 'vitest';
import { validateLine, assertValidLine, menuDepthProblems } from '../src';
import type { OptionGroup, Selection } from '@qr-first/contracts';
import { comboSelections, makeMenu, pick, pickWith, STORE } from './fixtures';

const codes = (r: ReturnType<typeof validateLine>) => r.issues.map((i) => i.code);

describe('validateLine (invariant 7: min and max are enforced on the server)', () => {
  const menu = makeMenu();

  it('accepts an item with no groups', () => {
    expect(validateLine(menu, { itemId: 'chai', selections: [] }).ok).toBe(true);
  });

  it('requires a group with min 1 and names it', () => {
    const r = validateLine(menu, { itemId: 'butter_chicken', selections: [] });
    expect(codes(r)).toEqual(['OPTION_MIN_NOT_MET']);
    expect(r.issues[0]).toMatchObject({ groupId: 'g_portion', path: ['butter_chicken', 'g_portion'] });
  });

  it('accepts an optional group left out', () => {
    expect(validateLine(menu, { itemId: 'cold_coffee', selections: [pick('g_size', 'o_size_s')] }).ok).toBe(true);
  });

  it('rejects more than max in a single-select group', () => {
    const r = validateLine(menu, { itemId: 'butter_chicken', selections: [pick('g_portion', 'o_half', 'o_full')] });
    expect(codes(r)).toEqual(['OPTION_MAX_EXCEEDED']);
  });

  it('rejects more than max in a multi-select group, accepts exactly max', () => {
    const base = [pick('g_size', 'o_size_s')];
    expect(codes(validateLine(menu, { itemId: 'cold_coffee', selections: [...base, pick('g_addons', 'o_shot', 'o_syrup', 'o_cream')] }))).toEqual(['OPTION_MAX_EXCEEDED']);
    expect(validateLine(menu, { itemId: 'cold_coffee', selections: [...base, pick('g_addons', 'o_shot', 'o_syrup')] }).ok).toBe(true);
  });

  it('rejects a group the item does not carry', () => {
    const r = validateLine(menu, { itemId: 'chai', selections: [pick('g_size', 'o_size_s')] });
    expect(codes(r)).toEqual(['OPTION_GROUP_UNKNOWN']);
  });

  it('rejects an option that is not in the group, and a duplicate pick', () => {
    expect(codes(validateLine(menu, { itemId: 'cold_coffee', selections: [pick('g_size', 'o_oat')] }))).toContain('OPTION_UNKNOWN');
    const dup = validateLine(menu, { itemId: 'cold_coffee', selections: [pick('g_size', 'o_size_s'), pick('g_addons', 'o_shot', 'o_shot')] });
    expect(codes(dup)).toContain('OPTION_DUPLICATE');
  });

  it('rejects the same group chosen twice', () => {
    const r = validateLine(menu, { itemId: 'butter_chicken', selections: [pick('g_portion', 'o_half'), pick('g_portion', 'o_full')] });
    expect(codes(r)).toContain('OPTION_DUPLICATE');
  });

  it('reports every problem, not just the first', () => {
    const r = validateLine(menu, { itemId: 'cold_coffee', qty: 0, selections: [pick('g_addons', 'o_shot', 'o_syrup', 'o_cream')] });
    expect(codes(r).sort()).toEqual(['OPTION_MAX_EXCEEDED', 'OPTION_MIN_NOT_MET', 'QUANTITY_INVALID']);
  });

  it('an unknown item is an error', () => {
    expect(codes(validateLine(menu, { itemId: 'nope', selections: [] }))).toEqual(['ITEM_UNKNOWN']);
  });
});

describe('validateLine: nested groups (depth 2)', () => {
  const menu = makeMenu();

  it('requires the nested group once the parent option is picked', () => {
    const missing = validateLine(menu, { itemId: 'thali', selections: [pick('g_thali_main', 'o_t_paneer')] });
    expect(codes(missing)).toEqual(['OPTION_MIN_NOT_MET']);
    expect(missing.issues[0]?.path).toEqual(['thali', 'g_thali_main', 'o_t_paneer', 'g_t_spice']);
    const ok = validateLine(menu, { itemId: 'thali', selections: [pickWith('g_thali_main', 'o_t_paneer', [pick('g_t_spice', 'o_hot')])] });
    expect(ok.ok).toBe(true);
  });

  it('does not ask for nested groups of an option that was not picked', () => {
    expect(validateLine(menu, { itemId: 'thali', selections: [pick('g_thali_main', 'o_t_dal')] }).ok).toBe(true);
  });

  it('rejects nested picks under an option that carries no groups', () => {
    const r = validateLine(menu, { itemId: 'thali', selections: [pickWith('g_thali_main', 'o_t_dal', [pick('g_t_spice', 'o_hot')])] });
    expect(codes(r)).toEqual(['OPTION_GROUP_UNKNOWN']);
  });

  it('enforces max inside the nested group', () => {
    const r = validateLine(menu, { itemId: 'thali', selections: [pickWith('g_thali_main', 'o_t_paneer', [pick('g_t_spice', 'o_hot', 'o_mild')])] });
    expect(codes(r)).toEqual(['OPTION_MAX_EXCEEDED']);
  });

  it('refuses a third level of groups', () => {
    const m = makeMenu();
    const extra: OptionGroup = { id: 'g_deep', storeId: STORE, name: 'Deeper', min: 0, max: 1, options: [{ id: 'o_deep', name: 'Deep', priceDelta: 0, soldOut: false }] };
    m.optionGroups.g_deep = extra;
    m.optionGroups.g_t_spice!.options[0] = { ...m.optionGroups.g_t_spice!.options[0]!, optionGroupIds: ['g_deep'] };
    const sel: Selection[] = [pickWith('g_thali_main', 'o_t_paneer', [pickWith('g_t_spice', 'o_mild', [pick('g_deep', 'o_deep')])])];
    expect(codes(validateLine(m, { itemId: 'thali', selections: sel }))).toContain('OPTION_DEPTH_EXCEEDED');
    expect(menuDepthProblems(m).some((p) => p.includes('deeper than 2'))).toBe(true);
    expect(menuDepthProblems(menu)).toEqual([]);
  });
});

describe('validateLine: linked items for combos', () => {
  const menu = makeMenu();

  it('accepts a full three-part combo including a nested extra', () => {
    expect(validateLine(menu, { itemId: 'kebab_combo', selections: comboSelections() }).ok).toBe(true);
  });

  it('requires every part of the combo', () => {
    const r = validateLine(menu, { itemId: 'kebab_combo', selections: [pick('g_combo_starter', 'o_cs_seekh')] });
    expect(r.issues.map((i) => i.groupId).sort()).toEqual(['g_combo_bread', 'g_combo_main']);
  });

  it('refuses a combo part whose linked item is missing from the menu', () => {
    const m = makeMenu();
    delete m.items.seekh;
    const r = validateLine(m, { itemId: 'kebab_combo', selections: [pick('g_combo_starter', 'o_cs_seekh'), pick('g_combo_main', 'o_cm_dal'), pick('g_combo_bread', 'o_cb_naan')] });
    expect(codes(r)).toContain('ITEM_UNKNOWN');
  });

  it('treats a sold-out linked item as a sold-out option', () => {
    const m = makeMenu();
    m.items.galouti = { ...m.items.galouti!, soldOut: true };
    const r = validateLine(m, { itemId: 'kebab_combo', selections: comboSelections() });
    expect(r.issues).toMatchObject([{ code: 'OPTION_SOLD_OUT', optionId: 'o_cs_galouti' }]);
  });
});

describe('validateLine: sold out', () => {
  const menu = makeMenu();
  it('flags a sold-out item from the live stock set', () => {
    const r = validateLine(menu, { itemId: 'galouti', selections: [] }, { stock: { soldOutItemIds: ['galouti'], soldOutOptionIds: [] } });
    expect(codes(r)).toEqual(['ITEM_SOLD_OUT']);
  });
  it('flags a sold-out option from the live stock set and from the menu flag', () => {
    const stock = { soldOutItemIds: [], soldOutOptionIds: ['o_oat'] };
    const sel = [pick('g_size', 'o_size_s'), pick('g_milk', 'o_oat')];
    expect(validateLine(menu, { itemId: 'cold_coffee', selections: sel }, { stock }).issues).toMatchObject([{ code: 'OPTION_SOLD_OUT', optionId: 'o_oat' }]);
    const m = makeMenu();
    m.optionGroups.g_milk!.options[0]!.soldOut = true;
    expect(codes(validateLine(m, { itemId: 'cold_coffee', selections: sel }))).toEqual(['OPTION_SOLD_OUT']);
  });
  it('assertValidLine throws the first issue as a QrError', () => {
    expect(() => assertValidLine(menu, { itemId: 'butter_chicken', selections: [] })).toThrowError(/OPTION_MIN_NOT_MET/);
  });
});
