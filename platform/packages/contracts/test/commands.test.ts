import { describe, it, expect } from 'vitest';
import {
  COMMANDS,
  COMMAND_TYPES,
  ComboCreatePayload,
  FIRST_CATALOGUE,
  CommandEnvelopeSchema,
  describeCatalogue,
  executeCommand,
  getCommand,
  riskOf,
  gate,
  runSequence,
  createStoreConfig,
  DEFAULT_FACTS,
  type CommandEnvelope,
  type CommandState,
  type MenuIndex,
  type Item,
} from '../src';

const STORE = 'store_1';
const address = { line1: '12 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' };

const item = (id: string, name: string, categoryId: string, basePrice: number, p: Partial<Item> = {}): Item => ({
  id, storeId: STORE, categoryId, name, basePrice, taxClass: 'standard', dietaryType: 'veg', tags: [], station: 'kitchen', soldOut: false, optionGroupIds: [], ...p,
});

function menu(): MenuIndex {
  return {
    storeId: STORE,
    categories: {
      starters: { id: 'starters', storeId: STORE, name: 'Starters', sort: 1 },
      mains: { id: 'mains', storeId: STORE, name: 'Mains', sort: 2 },
      drinks: { id: 'drinks', storeId: STORE, name: 'Drinks', sort: 3 },
      combos: { id: 'combos', storeId: STORE, name: 'Combos', sort: 4 },
    },
    items: Object.fromEntries(
      [
        item('galouti', 'Galouti Kebab', 'starters', 42000, { dietaryType: 'non_veg' }),
        item('seekh', 'Seekh Kebab', 'starters', 38000, { dietaryType: 'non_veg' }),
        item('paneer', 'Paneer Tikka', 'starters', 32000),
        item('dal', 'Dal Makhani', 'mains', 28000),
        item('chai', 'Masala Chai', 'drinks', 8000),
      ].map((i) => [i.id, i]),
    ),
    optionGroups: {
      g_milk: { id: 'g_milk', storeId: STORE, name: 'Milk', min: 0, max: 1, options: [{ id: 'o_oat', name: 'Oat milk', priceDelta: 4000, soldOut: false }, { id: 'o_whole', name: 'Whole milk', priceDelta: 0, soldOut: false }] },
    },
  };
}

const state = (preset: 'counter' | 'table' | 'hybrid' = 'hybrid', facts = {}): CommandState => ({
  config: createStoreConfig({ name: 'Kebab Corner', address, preset }),
  menu: menu(),
  facts: { ...DEFAULT_FACTS, ...facts },
});

const person = { kind: 'staff' as const, id: 'asha' };
const env = (type: string, payload: unknown, over: Partial<CommandEnvelope> = {}): CommandEnvelope =>
  ({ type, storeId: STORE, payload, actor: person, mode: 'apply', idempotencyKey: 'cmd-key-0001', ...over }) as CommandEnvelope;

/** State with the version removed: undo restores content, a later write bumps the version. */
const content = (s: CommandState) => structuredClone({ config: { ...s.config, version: 0 }, menu: s.menu });

/** Apply a command, then its inverse, and expect the original content back exactly. */
function roundTrip(s: CommandState, type: string, payload: unknown, role: 'owner' | 'manager' | 'staff' = 'owner') {
  const out = executeCommand(env(type, payload), s, { role });
  if (!out.ok || out.status !== 'applied') throw new Error(`not applied: ${JSON.stringify(out)}`);
  const undo = runSequence(out.inverse, out.state);
  expect(content(undo.state)).toEqual(content(s));
  return out;
}

describe('command catalogue (docs/25 sections 5 and 9)', () => {
  it('has the first catalogue of five, each with schema, plain description, risk tier, preview and inverse', () => {
    expect(FIRST_CATALOGUE).toEqual(['setting.set', 'feature.set', 'menu.item.setSoldOut', 'choices.group.create', 'combo.create']);
    for (const t of FIRST_CATALOGUE) {
      const c = getCommand(t)!;
      expect(c, t).toBeDefined();
      expect(c.schema).toBeDefined();
      expect(c.description.length).toBeGreaterThan(40);
      expect(['low', 'medium', 'high']).toContain(typeof c.risk === 'function' ? 'low' : c.risk);
      expect(typeof c.summarise).toBe('function'); // plain-words preview
      expect(typeof c.apply).toBe('function'); // draft for the live preview
      expect(typeof c.inverse).toBe('function');
    }
  });
  it('every command in the catalogue has these, and types are unique', () => {
    expect(new Set(COMMAND_TYPES).size).toBe(COMMANDS.length);
    for (const c of COMMANDS) {
      expect(c.description.length, c.type).toBeGreaterThan(20);
      expect(c.surfaces.length, c.type).toBeGreaterThan(0);
    }
  });
  it('combo.create is compound: it expands into basic commands', () => {
    expect(getCommand('combo.create')?.expand).toBeTypeOf('function');
    expect(getCommand('setting.set')?.expand).toBeUndefined();
  });
  it('is described as JSON for GET /v1/commands', () => {
    const cat = describeCatalogue();
    expect(cat.map((c) => c.type)).toEqual([...COMMAND_TYPES]);
    for (const c of cat) {
      expect('oneOf' in c.schema || (c.schema as { type?: string }).type === 'object').toBe(true);
      expect(c.requiredRole).toBeTruthy();
    }
    expect(JSON.stringify(cat)).toContain('guestLogin');
  });
  it('risk tiers follow docs/25 section 8', () => {
    const s = (key: string, value: unknown) => ({ key, value }) as never;
    const risk = (key: string, value: unknown) => riskOf(getCommand('setting.set') as never, s(key, value));
    expect(risk('tax', {})).toBe('high');
    expect(risk('paymentMethods', [])).toBe('high');
    expect(risk('payoutAccount', null)).toBe('high');
    expect(risk('serviceCharge', 5)).toBe('medium');
    expect(risk('theme', {})).toBe('low');
    expect(riskOf(getCommand('feature.set') as never, {} as never)).toBe('medium');
    expect(riskOf(getCommand('menu.item.setSoldOut') as never, {} as never)).toBe('low');
  });
});

describe('envelope', () => {
  it('requires type, storeId, payload, actor, mode and an idempotency key', () => {
    expect(CommandEnvelopeSchema.safeParse(env('feature.set', {})).success).toBe(true);
    for (const missing of ['type', 'storeId', 'actor', 'mode', 'idempotencyKey']) {
      const e: Record<string, unknown> = { ...env('feature.set', {}) };
      delete e[missing];
      expect(CommandEnvelopeSchema.safeParse(e).success, missing).toBe(false);
    }
  });
  it('accepts a person, the assistant for a person, or an agent key, and nothing else', () => {
    for (const actor of [person, { kind: 'assistant', onBehalfOf: 'asha' }, { kind: 'agent', keyId: 'pricing-bot' }]) {
      expect(CommandEnvelopeSchema.safeParse(env('feature.set', {}, { actor } as never)).success).toBe(true);
    }
    expect(CommandEnvelopeSchema.safeParse(env('feature.set', {}, { actor: { kind: 'guest_session', id: 'x' } } as never)).success).toBe(false);
    expect(CommandEnvelopeSchema.safeParse(env('feature.set', {}, { mode: 'dry' } as never)).success).toBe(false);
    expect(CommandEnvelopeSchema.safeParse(env('menu.wipe', {})).success).toBe(false); // the assistant can only produce catalogue commands
  });
});

describe('setting.set', () => {
  it('turns login off, makes it required, and each undoes exactly', () => {
    const s = state();
    const off = roundTrip(s, 'setting.set', { key: 'guestLogin', value: 'off' });
    expect(off.state.config.settings.guestLogin).toBe('off');
    expect(off.preview.summary).toContain('guestLogin');
    expect(off.preview.changes).toEqual([{ path: 'settings.guestLogin', before: 'optional', after: 'off' }]);
    const required = roundTrip(s, 'setting.set', { key: 'guestLogin', value: 'required' });
    expect(required.state.config.settings.guestLogin).toBe('required');
  });
  it('validates the value against that setting only', () => {
    const bad = executeCommand(env('setting.set', { key: 'guestLogin', value: 'always' }), state(), { role: 'owner' });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error.code).toBe('COMMAND_INVALID');
    expect(executeCommand(env('setting.set', { key: 'brandColor', value: '#fff' }), state(), { role: 'owner' }).ok).toBe(false);
  });
  it('changes the look to dark and undoes it', () => {
    const s = state();
    const dark = roundTrip(s, 'setting.set', { key: 'theme', value: { ...s.config.settings.theme, appearance: 'dark' } });
    expect(dark.state.config.settings.theme.appearance).toBe('dark');
  });
  it('orderTypes keeps pay timing consistent and undoes exactly', () => {
    const s = state('table');
    const out = roundTrip(s, 'setting.set', { key: 'orderTypes', value: ['dine_in', 'takeaway'] });
    expect(out.state.config.settings.payTiming).toEqual({ dine_in: 'at_end', takeaway: 'before_kitchen' });
  });
  it('changing service style re-applies the preset after a preview, and undo restores the customised features', () => {
    const s = state('counter');
    s.config.features.suggestions = false; // the owner had customised this
    s.config.features.playMode = false;
    const prev = executeCommand(env('setting.set', { key: 'serviceStyle', value: 'table' }, { mode: 'preview' }), s, { role: 'owner' });
    expect(prev.ok && prev.status).toBe('previewed');
    if (!prev.ok) throw new Error();
    expect(prev.preview.summary).toContain('re-applied');
    expect(prev.preview.draft.config.settings.serviceStyle).toBe('table');
    expect(prev.preview.draft.config.features.callWaiter).toBe(true);
    expect(s.config.settings.serviceStyle).toBe('counter'); // preview saves nothing
    const out = roundTrip(s, 'setting.set', { key: 'serviceStyle', value: 'table' });
    expect(out.state.config.features.suggestions).toBe(true); // the preset reset it
    // Undo put back the owner's own choices, which the plain preset would not.
  });
  it('the inverse of a serviceStyle change does not re-apply a preset', () => {
    const s = state('counter');
    s.config.features.suggestions = false;
    const out = executeCommand(env('setting.set', { key: 'serviceStyle', value: 'table' }), s, { role: 'owner' });
    if (!out.ok || out.status !== 'applied') throw new Error();
    const first = out.inverse[0] as { payload: { key: string; reapplyPreset: boolean } };
    expect(first.payload).toMatchObject({ key: 'serviceStyle', reapplyPreset: false });
  });
});

describe('feature.set', () => {
  it('switches call waiter on when there is a table, and undoes it', () => {
    const s = state('counter', { tableSpots: 6 });
    expect(s.config.features.callWaiter).toBe(false);
    const out = roundTrip(s, 'feature.set', { key: 'callWaiter', enabled: true });
    expect(out.state.config.features.callWaiter).toBe(true);
    expect(out.preview.summary).toContain('Call waiter');
    expect(out.preview.affectedSurfaces).toEqual(expect.arrayContaining(['guest.menu', 'staff.floor']));
  });
  it('refuses to switch it on with no table, saying why', () => {
    const out = executeCommand(env('feature.set', { key: 'callWaiter', enabled: true }), state('counter'), { role: 'owner' });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.code).toBe('FEATURE_REQUIREMENT_UNMET');
      expect(out.error.message).toBe('Needs at least one table.');
    }
  });
  it('turning a feature off always works, and undo restores it', () => {
    const s = state('table', { tableSpots: 8 });
    expect(s.config.features.callWaiter).toBe(true);
    const out = roundTrip(s, 'feature.set', { key: 'callWaiter', enabled: false });
    expect(out.state.config.features.callWaiter).toBe(false);
  });
  it('rejects an unknown feature key', () => {
    expect(executeCommand(env('feature.set', { key: 'flagForStore7', enabled: true }), state(), { role: 'owner' }).ok).toBe(false);
  });
  it('a no-op is previewed as a no-op', () => {
    const out = executeCommand(env('feature.set', { key: 'ratings', enabled: true }, { mode: 'preview' }), state(), { role: 'owner' });
    expect(out.ok && out.status === 'previewed' && out.preview.noop).toBe(true);
  });
});

describe('menu.item.setSoldOut', () => {
  it('marks an item sold out and back, undoing exactly', () => {
    const s = state();
    const out = roundTrip(s, 'menu.item.setSoldOut', { target: { kind: 'item', itemId: 'galouti' }, soldOut: true }, 'staff');
    expect(out.state.menu.items.galouti?.soldOut).toBe(true);
    expect(out.preview.summary).toBe('I will mark "Galouti Kebab" sold out.');
    expect(out.preview.changes).toEqual([{ path: 'menu.items.galouti.soldOut', before: false, after: true }]);
  });
  it('marks one choice sold out', () => {
    const out = roundTrip(state(), 'menu.item.setSoldOut', { target: { kind: 'option', optionId: 'o_oat' }, soldOut: true }, 'staff');
    expect(out.state.menu.optionGroups.g_milk?.options[0]?.soldOut).toBe(true);
    expect(out.preview.summary).toContain('Oat milk');
  });
  it('is low risk, so staff may apply it', () => {
    const out = executeCommand(env('menu.item.setSoldOut', { target: { kind: 'item', itemId: 'chai' }, soldOut: true }), state(), { role: 'staff' });
    expect(out.ok && out.status).toBe('applied');
    expect(out.ok && out.risk).toBe('low');
  });
  it('refuses an unknown item or option', () => {
    const bad = (target: unknown) => executeCommand(env('menu.item.setSoldOut', { target, soldOut: true }), state(), { role: 'owner' });
    expect(bad({ kind: 'item', itemId: 'nope' }).ok).toBe(false);
    expect(bad({ kind: 'option', optionId: 'nope' }).ok).toBe(false);
  });
});

describe('choices.group.create', () => {
  const sizes = {
    id: 'g_size', storeId: STORE, name: 'Size', min: 1, max: 1,
    options: [{ id: 'o_s', name: 'Small', priceDelta: 0, soldOut: false }, { id: 'o_l', name: 'Large', priceDelta: 6000, soldOut: false }],
  };
  it('creates a group and undoes it', () => {
    const out = roundTrip(state(), 'choices.group.create', { group: sizes });
    expect(out.state.menu.optionGroups.g_size?.options).toHaveLength(2);
    expect(out.preview.summary).toContain('Size');
    expect(out.inverse).toEqual([{ type: 'choices.group.delete', payload: { groupId: 'g_size' } }]);
  });
  it('adds a size choice to an item with attach, and undoes both', () => {
    const s = state();
    const a = executeCommand(env('choices.group.create', { group: sizes }), s, { role: 'owner' });
    if (!a.ok || a.status !== 'applied') throw new Error();
    const b = executeCommand(env('choices.attach', { itemId: 'chai', groupId: 'g_size' }), a.state, { role: 'owner' });
    if (!b.ok || b.status !== 'applied') throw new Error();
    expect(b.state.menu.items.chai?.optionGroupIds).toEqual(['g_size']);
    const undone = runSequence([...b.inverse, ...a.inverse], b.state);
    expect(content(undone.state)).toEqual(content(s));
  });
  it('refuses duplicates, min above the option count, unknown links and a third nesting level', () => {
    const run = (group: unknown, s = state()) => executeCommand(env('choices.group.create', { group }), s, { role: 'owner' });
    expect(run({ ...sizes, id: 'g_milk' }).ok).toBe(false); // id exists
    expect(run({ ...sizes, min: 3, max: 3 }).ok).toBe(false); // min above option count
    expect(run({ ...sizes, min: 2, max: 1 }).ok).toBe(false); // min above max
    expect(run({ ...sizes, options: [{ ...sizes.options[0]!, linkedItemId: 'ghost' }] }).ok).toBe(false);
    expect(run({ ...sizes, options: [{ ...sizes.options[0]!, id: 'o_oat' }] }).ok).toBe(false); // option id used in another group
    const nestedOnce = { ...sizes, id: 'g_outer', options: [{ id: 'o_x', name: 'X', priceDelta: 0, soldOut: false, optionGroupIds: ['g_milk'] }] };
    const s2 = state();
    const ok = executeCommand(env('choices.group.create', { group: nestedOnce }), s2, { role: 'owner' });
    expect(ok.ok).toBe(true);
    if (!ok.ok || ok.status !== 'applied') throw new Error();
    const tooDeep = { ...sizes, id: 'g_top', options: [{ id: 'o_y', name: 'Y', priceDelta: 0, soldOut: false, optionGroupIds: ['g_outer'] }] };
    const bad = executeCommand(env('choices.group.create', { group: tooDeep }), ok.state, { role: 'owner' });
    expect(!bad.ok && bad.error.code).toBe('OPTION_DEPTH_EXCEEDED');
  });
  it('a group still in use cannot be deleted', () => {
    const s = state();
    s.menu.items.chai = { ...s.menu.items.chai!, optionGroupIds: ['g_milk'] };
    const out = executeCommand(env('choices.group.delete', { groupId: 'g_milk' }), s, { role: 'owner' });
    expect(out.ok).toBe(false);
  });
});

describe('combo.create', () => {
  const payload = {
    itemId: 'combo_1',
    categoryId: 'combos',
    name: 'Kebab Combo',
    comboPrice: 69900,
    parts: [
      { groupId: 'g_cs', name: 'Choose your starter', from: { categoryIds: ['starters'] }, count: 1 },
      { groupId: 'g_cm', name: 'Choose your main', from: { itemIds: ['dal'] }, count: 1 },
    ],
  };
  it('creates a combo from two categories or item lists, expanding into basic commands', () => {
    const s = state();
    const out = executeCommand(env('combo.create', payload), s, { role: 'owner' });
    if (!out.ok || out.status !== 'applied') throw new Error(JSON.stringify(out));
    const combo = out.state.menu.items.combo_1!;
    expect(combo).toMatchObject({ name: 'Kebab Combo', basePrice: 69900, optionGroupIds: ['g_cs', 'g_cm'], dietaryType: 'non_veg', station: 'kitchen' });
    const starters = out.state.menu.optionGroups.g_cs!;
    expect(starters).toMatchObject({ min: 1, max: 1 });
    expect(starters.options.map((o) => [o.linkedItemId, o.priceDelta])).toEqual([['galouti', 0], ['seekh', 0], ['paneer', 0]]);
    const expanded = getCommand('combo.create')!.expand!(ComboCreatePayload.parse(payload), s);
    expect(expanded.map((c) => c.type)).toEqual(['choices.group.create', 'choices.group.create', 'menu.item.create']);
    expect(out.preview.summary).toContain('Galouti Kebab, Seekh Kebab, Paneer Tikka');
  });
  it('undo removes the combo item and every group', () => {
    roundTrip(state(), 'combo.create', payload);
  });
  it('refuses a part with too few items, an unknown item, or an existing id', () => {
    const run = (p: unknown) => executeCommand(env('combo.create', p), state(), { role: 'owner' });
    expect(run({ ...payload, parts: [{ ...payload.parts[1]!, count: 2 }] }).ok).toBe(false);
    expect(run({ ...payload, parts: [{ ...payload.parts[1]!, from: { itemIds: ['ghost'] } }] }).ok).toBe(false);
    expect(run({ ...payload, itemId: 'chai' }).ok).toBe(false);
  });
  it('an item that is part of a combo cannot be deleted until it is removed from it', () => {
    const out = executeCommand(env('combo.create', payload), state(), { role: 'owner' });
    if (!out.ok || out.status !== 'applied') throw new Error();
    expect(executeCommand(env('menu.item.delete', { itemId: 'dal' }), out.state, { role: 'owner' }).ok).toBe(false);
  });
});

describe('lifecycle and approval rules (docs/25 sections 5 and 8)', () => {
  it('preview mode returns the diff, the surfaces and a draft, and saves nothing', () => {
    const s = state();
    const out = executeCommand(env('setting.set', { key: 'guestLogin', value: 'off' }, { mode: 'preview' }), s, { role: 'owner' });
    if (!out.ok || out.status !== 'previewed') throw new Error();
    expect(out.preview.changes).toHaveLength(1);
    expect(out.preview.affectedSurfaces).toContain('guest.welcome');
    expect(out.preview.draft.config.settings.guestLogin).toBe('off');
    expect(s.config.settings.guestLogin).toBe('optional');
  });
  it('a high-tier command sent with an agent key is refused', () => {
    const agent = { kind: 'agent' as const, keyId: 'pricing-bot' };
    const out = executeCommand(env('setting.set', { key: 'tax', value: { registration: 'registered', ratePercent: 18, inclusive: false } }, { actor: agent }), state(), { role: 'owner' });
    expect(!out.ok && out.error.code).toBe('COMMAND_RISK_FORBIDDEN');
  });
  it('a medium command from an agent waits for approval, low applies directly', () => {
    const agent = { kind: 'agent' as const, keyId: 'pricing-bot' };
    const med = executeCommand(env('feature.set', { key: 'ratings', enabled: false }, { actor: agent }), state());
    expect(med.ok && med.status).toBe('needs_approval');
    const low = executeCommand(env('menu.item.setSoldOut', { target: { kind: 'item', itemId: 'chai' }, soldOut: true }, { actor: agent }), state());
    expect(low.ok && low.status).toBe('applied');
  });
  it('the assistant applies medium for a person, and a high command waits for the owner', () => {
    const assistant = { kind: 'assistant' as const, onBehalfOf: 'asha' };
    expect(executeCommand(env('feature.set', { key: 'ratings', enabled: false }, { actor: assistant }), state()).ok && true).toBe(true);
    const out = executeCommand(env('setting.set', { key: 'payoutAccount', value: null }, { actor: assistant }), state());
    expect(out.ok && out.status).toBe('needs_approval');
  });
  it('gate() is the single table of those rules', () => {
    expect([gate('low', { kind: 'agent', keyId: 'k' }), gate('medium', { kind: 'agent', keyId: 'k' }), gate('high', { kind: 'agent', keyId: 'k' })]).toEqual(['allow', 'needs_approval', 'forbid']);
    expect([gate('low', person), gate('medium', person), gate('high', person)]).toEqual(['allow', 'allow', 'allow']);
  });
  it('a person needs the role: staff cannot change settings, only an owner can change tax', () => {
    const set = (key: string, value: unknown, role: 'owner' | 'manager' | 'staff') => executeCommand(env('setting.set', { key, value }), state(), { role });
    expect(set('guestLogin', 'off', 'staff').ok).toBe(false);
    expect(set('guestLogin', 'off', 'manager').ok).toBe(true);
    const tax = { registration: 'registered', ratePercent: 18, inclusive: false };
    expect(set('tax', tax, 'manager').ok).toBe(false);
    expect(set('tax', tax, 'owner').ok).toBe(true);
  });
  it('refuses a command for another store', () => {
    const out = executeCommand(env('feature.set', { key: 'ratings', enabled: false }, { storeId: 'someone_else' }), state());
    expect(!out.ok && out.error.code).toBe('STORE_MISMATCH');
  });
  it('a bad payload comes back as COMMAND_INVALID with the issues, not a crash', () => {
    const out = executeCommand(env('feature.set', { key: 'ratings' }), state());
    expect(!out.ok && out.error.code).toBe('COMMAND_INVALID');
    expect(!out.ok && out.error.details?.issues).toBeDefined();
  });
  it('a change that would make the config invalid is refused with CONFIG_INVALID', () => {
    const out = executeCommand(env('setting.set', { key: 'stations', value: { stations: [{ id: 'kitchen', name: 'Kitchen' }], routing: { drinks: 'bar' } } }), state(), { role: 'owner' });
    expect(!out.ok && out.error.code).toBe('CONFIG_INVALID');
  });
});
