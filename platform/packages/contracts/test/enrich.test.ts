import { describe, it, expect } from 'vitest';
import {
  mergeAiTag,
  tagFrom,
  executeCommand,
  runSequence,
  getCommand,
  createStoreConfig,
  DEFAULT_FACTS,
  WAITER_TOOLS,
  WAITER_TOOL_NAMES,
  COMMAND_TYPES,
  SERVICE_REQUEST_REASONS,
  describeWaiterTools,
  waiterToolsAreNotCommands,
  ItemSchema,
  type CommandEnvelope,
  type CommandState,
  type Nutrition,
} from '../src';

const STORE = 'store_1';
const address = { line1: '12 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' };
const nut = (kcal: number, proteinG: number, source: 'ai' | 'owner'): Nutrition => ({ kcal, proteinG, per: 'serving', source, confidence: 0.6, updatedAt: '2026-11-14T10:00:00.000Z' });

function state(): CommandState {
  const base = { storeId: STORE, taxClass: 'standard', dietaryType: 'non_veg' as const, tags: [], station: 'kitchen', soldOut: false, optionGroupIds: [] };
  return {
    config: createStoreConfig({ name: 'Kebab Corner', address, preset: 'hybrid' }),
    menu: {
      storeId: STORE,
      categories: { starters: { id: 'starters', storeId: STORE, name: 'Starters', sort: 1 } },
      optionGroups: {},
      items: {
        galouti: { ...base, id: 'galouti', categoryId: 'starters', name: 'Galouti Kebab', basePrice: 42000, course: 'starter', courseSource: 'ai', nutrition: nut(340, 22, 'ai') },
        seekh: { ...base, id: 'seekh', categoryId: 'starters', name: 'Seekh Kebab', basePrice: 38000 },
      },
    },
    facts: DEFAULT_FACTS,
  };
}

const person = { kind: 'staff' as const, id: 'asha' };
const run = (type: string, payload: unknown, s = state(), mode: 'apply' | 'preview' = 'apply') =>
  executeCommand({ type, storeId: STORE, payload, actor: person, mode, idempotencyKey: 'cmd-key-0001' } as CommandEnvelope, s, { role: 'manager' });
const applied = (type: string, payload: unknown, s = state()) => {
  const out = run(type, payload, s);
  if (!out.ok || out.status !== 'applied') throw new Error(`not applied: ${JSON.stringify(out)}`);
  return out;
};
const content = (s: CommandState) => structuredClone(s.menu);

describe('mergeAiTag: an owner value is never overwritten by an AI value', () => {
  it('uses the AI value when nothing is stored, and marks it as AI', () => {
    expect(mergeAiTag(undefined, { value: 'main', source: 'ai' })).toEqual({ value: 'main', source: 'ai' });
  });
  it('replaces an earlier AI value with a newer AI value', () => {
    expect(mergeAiTag({ value: 'starter', source: 'ai' }, { value: 'snack', source: 'ai' })).toEqual({ value: 'snack', source: 'ai' });
  });
  it('keeps the owner value exactly, whatever the AI says', () => {
    const owner = { value: 'starter', source: 'owner' as const };
    const out = mergeAiTag(owner, { value: 'dessert', source: 'ai' });
    expect(out).toBe(owner);
    expect(out).toEqual({ value: 'starter', source: 'owner' });
  });
  it('an AI value can never become an owner value, even if it claims to be', () => {
    expect(mergeAiTag(undefined, { value: 'main', source: 'owner' }).source).toBe('ai');
    expect(mergeAiTag({ value: 'x', source: 'ai' }, { value: 'y', source: 'owner' }).source).toBe('ai');
  });
  it('works on nutrition, which carries its own source', () => {
    const owner = nut(420, 28, 'owner');
    expect(mergeAiTag(owner, nut(100, 1, 'ai'))).toBe(owner);
    expect(mergeAiTag(nut(340, 22, 'ai'), nut(350, 23, 'ai'))).toMatchObject({ kcal: 350, source: 'ai' });
    expect(mergeAiTag(undefined, nut(350, 23, 'ai'))).toMatchObject({ kcal: 350, source: 'ai' });
  });
  it('does not mutate its inputs', () => {
    const existing = { value: 'starter', source: 'ai' as const };
    const ai = { value: 'main', source: 'owner' as const };
    mergeAiTag(existing, ai);
    expect(existing).toEqual({ value: 'starter', source: 'ai' });
    expect(ai).toEqual({ value: 'main', source: 'owner' });
  });
  it('a stored value with no provenance counts as the owner, so it is protected', () => {
    expect(tagFrom('starter', undefined)).toEqual({ value: 'starter', source: 'owner' });
    expect(tagFrom(undefined, 'ai')).toBeUndefined();
    expect(mergeAiTag(tagFrom('starter', undefined), { value: 'main', source: 'ai' })).toEqual({ value: 'starter', source: 'owner' });
  });
});

describe('item contract: course, spice, nutrition and house note (docs/03 section 3)', () => {
  const item = state().menu.items.galouti!;
  it('accepts the documented fields', () => {
    expect(ItemSchema.safeParse({ ...item, spice: 'medium', spiceSource: 'ai', houseNote: 'Slow cooked for six hours.' }).success).toBe(true);
  });
  it('rejects an unknown course, spice or nutrition shape', () => {
    expect(ItemSchema.safeParse({ ...item, course: 'brunch' }).success).toBe(false);
    expect(ItemSchema.safeParse({ ...item, spice: 'volcanic' }).success).toBe(false);
    expect(ItemSchema.safeParse({ ...item, nutrition: { kcal: 300 } }).success).toBe(false);
    expect(ItemSchema.safeParse({ ...item, nutrition: { ...nut(1, 1, 'ai'), per: '100g' } }).success).toBe(false);
  });
  it('a combo may omit course', () => {
    const { course: _c, courseSource: _s, ...combo } = item;
    expect(ItemSchema.safeParse(combo).success).toBe(true);
  });
});

describe('menu.item.setCourse', () => {
  it('is low risk, has a plain description, and sets the course as an owner choice', () => {
    const def = getCommand('menu.item.setCourse')!;
    expect(def.risk).toBe('low');
    expect(def.description.length).toBeGreaterThan(40);
    const out = applied('menu.item.setCourse', { itemId: 'seekh', course: 'starter' });
    expect(out.state.menu.items.seekh).toMatchObject({ course: 'starter', courseSource: 'owner' });
    expect(out.risk).toBe('low');
    expect(out.preview.summary).toBe('I will set the course of "Seekh Kebab" to starter.');
  });
  it('an owner choice survives a later AI run, an AI value is replaced by a newer AI value', () => {
    const owner = applied('menu.item.setCourse', { itemId: 'galouti', course: 'main' }).state;
    const ai = applied('menu.item.setCourse', { itemId: 'galouti', course: 'dessert', source: 'ai', ifNotOwner: true }, owner);
    expect(ai.state.menu.items.galouti).toMatchObject({ course: 'main', courseSource: 'owner' });
    expect(ai.preview.noop).toBe(true);
    const aiOnly = applied('menu.item.setCourse', { itemId: 'galouti', course: 'snack', source: 'ai', ifNotOwner: true });
    expect(aiOnly.state.menu.items.galouti).toMatchObject({ course: 'snack', courseSource: 'ai' });
  });
  it('an item with a course and no recorded source is treated as the owner\'s', () => {
    const s = state();
    delete s.menu.items.galouti!.courseSource;
    const ai = applied('menu.item.setCourse', { itemId: 'galouti', course: 'dessert', source: 'ai', ifNotOwner: true }, s);
    expect(ai.state.menu.items.galouti?.course).toBe('starter');
  });
  it('undo restores the exact previous value and source, even an AI value over an owner edit', () => {
    const s = state();
    const out = applied('menu.item.setCourse', { itemId: 'galouti', course: 'main' }, s);
    expect(out.state.menu.items.galouti).toMatchObject({ course: 'main', courseSource: 'owner' });
    expect(content(runSequence(out.inverse, out.state).state)).toEqual(content(s));
    const none = applied('menu.item.setCourse', { itemId: 'seekh', course: 'main' }, s);
    expect(content(runSequence(none.inverse, none.state).state)).toEqual(content(s)); // field goes back to absent
    const cleared = applied('menu.item.setCourse', { itemId: 'galouti', course: null }, s);
    expect(cleared.state.menu.items.galouti).not.toHaveProperty('course');
    expect(content(runSequence(cleared.inverse, cleared.state).state)).toEqual(content(s));
  });
  it('refuses an unknown item or course', () => {
    expect(run('menu.item.setCourse', { itemId: 'ghost', course: 'main' }).ok).toBe(false);
    expect(run('menu.item.setCourse', { itemId: 'seekh', course: 'brunch' }).ok).toBe(false);
  });
  it('never changes a price', () => {
    const s = state();
    const out = applied('menu.item.setCourse', { itemId: 'galouti', course: 'main' }, s);
    expect(out.state.menu.items.galouti?.basePrice).toBe(42000);
    expect(out.preview.changes.every((c) => !c.path.includes('Price'))).toBe(true);
  });
});

describe('menu.item.setNutrition', () => {
  it('is low risk and sets the estimate, shown in plain words', () => {
    expect(getCommand('menu.item.setNutrition')!.risk).toBe('low');
    const out = applied('menu.item.setNutrition', { itemId: 'seekh', nutrition: nut(420, 28, 'ai') });
    expect(out.state.menu.items.seekh?.nutrition).toEqual(nut(420, 28, 'ai'));
    expect(out.preview.summary).toBe('I will set the nutrition of "Seekh Kebab" to about 420 kcal and 28 g protein (AI estimate).');
  });
  it('the owner confirming the numbers is an owner value that the AI path never overwrites', () => {
    const confirmed = applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: nut(340, 22, 'owner') }).state;
    expect(applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: nut(999, 99, 'ai'), ifNotOwner: true }, confirmed).state.menu.items.galouti?.nutrition).toEqual(nut(340, 22, 'owner'));
    // The AI path replaces an AI estimate, and marks the result as AI even if the payload says owner.
    const refreshed = applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: nut(350, 23, 'owner'), ifNotOwner: true });
    expect(refreshed.state.menu.items.galouti?.nutrition).toMatchObject({ kcal: 350, source: 'ai' });
  });
  it('clears with null, and the AI path cannot clear an owner value', () => {
    expect(applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: null }).state.menu.items.galouti).not.toHaveProperty('nutrition');
    const owner = applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: nut(340, 22, 'owner') }).state;
    expect(applied('menu.item.setNutrition', { itemId: 'galouti', nutrition: null, ifNotOwner: true }, owner).state.menu.items.galouti?.nutrition?.source).toBe('owner');
  });
  it('undo restores the previous numbers and source exactly', () => {
    const s = state();
    for (const payload of [
      { itemId: 'galouti', nutrition: nut(340, 22, 'owner') },
      { itemId: 'seekh', nutrition: nut(420, 28, 'ai') },
      { itemId: 'galouti', nutrition: null },
    ]) {
      const out = applied('menu.item.setNutrition', payload, s);
      expect(content(runSequence(out.inverse, out.state).state)).toEqual(content(s));
    }
  });
  it('refuses bad numbers and an unknown item', () => {
    expect(run('menu.item.setNutrition', { itemId: 'seekh', nutrition: { ...nut(1, 1, 'ai'), kcal: -5 } }).ok).toBe(false);
    expect(run('menu.item.setNutrition', { itemId: 'seekh', nutrition: { ...nut(1, 1, 'ai'), confidence: 3 } }).ok).toBe(false);
    expect(run('menu.item.setNutrition', { itemId: 'ghost', nutrition: nut(1, 1, 'ai') }).ok).toBe(false);
  });
});

describe('menu.item.setHouseNote', () => {
  it('is low risk, sets and clears a note, and undoes exactly', () => {
    expect(getCommand('menu.item.setHouseNote')!.risk).toBe('low');
    const s = state();
    const out = applied('menu.item.setHouseNote', { itemId: 'galouti', houseNote: 'Slow cooked for six hours.' }, s);
    expect(out.state.menu.items.galouti?.houseNote).toBe('Slow cooked for six hours.');
    expect(content(runSequence(out.inverse, out.state).state)).toEqual(content(s));
    const withNote = out.state;
    const cleared = applied('menu.item.setHouseNote', { itemId: 'galouti', houseNote: null }, withNote);
    expect(cleared.state.menu.items.galouti).not.toHaveProperty('houseNote');
    expect(content(runSequence(cleared.inverse, cleared.state).state)).toEqual(content(withNote));
  });
  it('refuses an empty note, a note over 280 characters and an unknown item', () => {
    expect(run('menu.item.setHouseNote', { itemId: 'galouti', houseNote: '   ' }).ok).toBe(false);
    expect(run('menu.item.setHouseNote', { itemId: 'galouti', houseNote: 'x'.repeat(281) }).ok).toBe(false);
    expect(run('menu.item.setHouseNote', { itemId: 'ghost', houseNote: 'x' }).ok).toBe(false);
    expect(run('menu.item.setHouseNote', { itemId: 'galouti', houseNote: 'x'.repeat(280) }).ok).toBe(true);
  });
  it('an agent may apply all three, because they are low risk', () => {
    const agent = { kind: 'agent' as const, keyId: 'enrich-bot' };
    for (const [type, payload] of [
      ['menu.item.setCourse', { itemId: 'seekh', course: 'starter', source: 'ai', ifNotOwner: true }],
      ['menu.item.setNutrition', { itemId: 'seekh', nutrition: nut(420, 28, 'ai'), ifNotOwner: true }],
      ['menu.item.setHouseNote', { itemId: 'seekh', houseNote: 'Charcoal grilled.' }],
    ] as const) {
      const out = executeCommand({ type, storeId: STORE, payload, actor: agent, mode: 'apply', idempotencyKey: 'cmd-key-0001' } as CommandEnvelope, state());
      expect(out.ok && out.status, type).toBe('applied');
    }
  });
  it('is in the catalogue with the other menu commands', () => {
    for (const t of ['menu.item.setCourse', 'menu.item.setNutrition', 'menu.item.setHouseNote']) expect(COMMAND_TYPES).toContain(t);
  });
});

describe('waiter tool list (docs/26 section 5)', () => {
  it('is the fixed list of seven tools', () => {
    expect(WAITER_TOOL_NAMES).toEqual(['search_menu', 'explain_dish', 'compare_items', 'suggest_meal', 'propose_cart_change', 'show_order_status', 'call_human']);
    expect(new Set(WAITER_TOOL_NAMES).size).toBe(WAITER_TOOLS.length);
  });
  it('contains no store command and nothing that changes prices or discounts', () => {
    expect(waiterToolsAreNotCommands()).toBe(true);
    const json = JSON.stringify(describeWaiterTools()).toLowerCase();
    for (const banned of ['setprice', 'discount', 'refund', 'payout', 'setting.set', 'feature.set']) expect(json).not.toContain(banned);
  });
  it('anything that changes the cart or creates a request waits for one guest tap', () => {
    for (const t of WAITER_TOOLS) if (t.proposesChange) expect(t.needsGuestTap, t.name).toBe(true);
    expect(WAITER_TOOLS.filter((t) => t.proposesChange).map((t) => t.name)).toEqual(['propose_cart_change', 'call_human']);
  });
  it('validates inputs: search filters, compare pair, cart proposals and fixed service request reasons', () => {
    const tool = (n: string) => WAITER_TOOLS.find((t) => t.name === n)!.input;
    expect(tool('search_menu').parse({ course: 'starter', diet: 'veg', sortBy: 'protein' })).toMatchObject({ availableOnly: true, limit: 3 });
    expect(tool('search_menu').safeParse({ course: 'brunch' }).success).toBe(false);
    expect(tool('search_menu').safeParse({ limit: 50 }).success).toBe(false);
    expect(tool('compare_items').safeParse({ itemIdA: 'galouti' }).success).toBe(false);
    expect(tool('compare_items').safeParse({ itemIdA: 'galouti', itemIdB: 'seekh' }).success).toBe(true);
    expect(tool('propose_cart_change').safeParse({ kind: 'add', itemId: 'seekh' }).success).toBe(true);
    expect(tool('propose_cart_change').safeParse({ kind: 'delete_everything' }).success).toBe(false);
    expect(tool('call_human').safeParse({ reason: 'allergen_question' }).success).toBe(true);
    expect(tool('call_human').safeParse({ reason: 'chat' }).success).toBe(false);
    expect(SERVICE_REQUEST_REASONS).toEqual(expect.arrayContaining(['water', 'bill', 'help', 'allergen_question', 'complaint', 'payment_trouble']));
  });
  it('is described as JSON for the model', () => {
    for (const t of describeWaiterTools()) {
      expect(t.description.length).toBeGreaterThan(40);
      expect(t.inputSchema).toBeTypeOf('object');
    }
  });
});
