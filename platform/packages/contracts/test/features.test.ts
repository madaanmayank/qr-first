import { describe, it, expect } from 'vitest';
import {
  defineFeature,
  FEATURES,
  FEATURE_KEYS,
  FEATURE_LIST,
  FEATURE_GROUPS,
  DEFAULT_FACTS,
  unmetRequirements,
  featureDefault,
  PLANS,
} from '../src';

describe('feature registry (docs/25 section 3, docs/04 section 3)', () => {
  it('registers the 22 features in the doc order', () => {
    expect(FEATURE_KEYS).toEqual([
      'ordering', 'scanToPay', 'choices', 'combos', 'kitchenNote', 'splitBill', 'tips', 'autoAccept',
      'personalWelcome', 'suggestions', 'playMode', 'waiter', 'vegFilter', 'stories', 'rewards',
      'callWaiter', 'partySize',
      'ratings', 'reviewPrompt', 'whatsappReceipts',
      'nutrition', 'compare',
    ]);
    expect(FEATURE_LIST).toHaveLength(22);
  });

  it('every entry declares key, English and Hindi name, explanation, group, preset defaults, requires, surfaces, preview and plan', () => {
    for (const f of FEATURE_LIST) {
      expect(f.name.en.length, f.key).toBeGreaterThan(0);
      expect(f.name.hi.length, f.key).toBeGreaterThan(0);
      expect(f.explain.en.endsWith('.'), `${f.key} explanation is one plain sentence`).toBe(true);
      expect(FEATURE_GROUPS).toContain(f.group);
      expect(Object.keys(f.default).sort()).toEqual(['counter', 'hybrid', 'table']);
      expect(f.surfaces.length).toBeGreaterThan(0);
      expect(f.surfaces, `${f.key} preview target is one of its surfaces`).toContain(f.preview);
      expect(PLANS).toContain(f.plan);
    }
  });

  it('is keyed by feature key', () => {
    for (const k of FEATURE_KEYS) expect(FEATURES[k].key).toBe(k);
  });

  it('defineFeature rejects a preview that is not one of the feature surfaces', () => {
    expect(() =>
      defineFeature({
        key: 'bad', name: { en: 'Bad', hi: 'ख़राब' }, explain: { en: 'Bad.' }, group: 'at_the_table',
        default: { counter: false, table: false, hybrid: false }, requires: [], surfaces: ['guest.menu'], preview: 'guest.cart', plan: 'free',
      }),
    ).toThrow(/preview/);
  });

  it('defineFeature rejects a malformed key, a missing Hindi name and an unknown group', () => {
    const ok = { key: 'okKey', name: { en: 'Ok', hi: 'ठीक' }, explain: { en: 'Ok.' }, group: 'at_the_table', default: { counter: true, table: true, hybrid: true }, requires: [], surfaces: ['guest.menu'], preview: 'guest.menu', plan: 'free' } as const;
    expect(defineFeature(ok).key).toBe('okKey');
    expect(() => defineFeature({ ...ok, key: 'Bad_Key' })).toThrow();
    expect(() => defineFeature({ ...ok, name: { en: 'Ok', hi: '' } })).toThrow();
    expect(() => defineFeature({ ...ok, group: 'nowhere' as never })).toThrow();
  });

  it('defineFeature returns a frozen entry', () => {
    expect(Object.isFrozen(FEATURES.callWaiter)).toBe(true);
  });

  it('a feature has no sub-options: the entry carries no value field', () => {
    for (const f of FEATURE_LIST) expect(Object.keys(f).sort()).toEqual(['default', 'explain', 'group', 'key', 'name', 'plan', 'preview', 'requires', 'surfaces'].concat('defaultWhen' in f ? ['defaultWhen'] : []).sort());
  });

  it('matches the example in docs/25 for call waiter', () => {
    expect(FEATURES.callWaiter).toMatchObject({
      name: { en: 'Call waiter', hi: 'वेटर बुलाएँ' },
      group: 'at_the_table',
      default: { counter: false, table: true, hybrid: true },
      requires: ['tableSpots'],
      surfaces: ['guest.orderStatus', 'guest.menu', 'staff.floor'],
      preview: 'guest.menu',
    });
  });

  it('shows a feature as unavailable with a reason when a requirement is unmet', () => {
    expect(unmetRequirements('callWaiter', DEFAULT_FACTS)).toEqual([{ requirement: 'tableSpots', reason: 'Needs at least one table.' }]);
    expect(unmetRequirements('callWaiter', { ...DEFAULT_FACTS, tableSpots: 8 })).toEqual([]);
    expect(unmetRequirements('personalWelcome', { ...DEFAULT_FACTS, guestLogin: 'off' })).toHaveLength(1);
    expect(unmetRequirements('personalWelcome', { ...DEFAULT_FACTS, guestLogin: 'required' })).toEqual([]);
  });

  it('features are independent: no feature requires another feature', () => {
    for (const f of FEATURE_LIST) for (const r of f.requires) expect((FEATURE_KEYS as readonly string[]).includes(r), `${f.key} requires ${r}`).toBe(false);
  });

  it('featureDefault respects conditional defaults', () => {
    expect(featureDefault('whatsappReceipts', 'table', DEFAULT_FACTS)).toBe(false);
    expect(featureDefault('whatsappReceipts', 'table', { ...DEFAULT_FACTS, messagingConnected: true })).toBe(true);
    expect(featureDefault('splitBill', 'counter', DEFAULT_FACTS)).toBe(false);
    expect(featureDefault('splitBill', 'hybrid', DEFAULT_FACTS)).toBe(true);
  });
});
