import { describe, it, expect } from 'vitest';
import {
  StoreConfigSchema,
  SettingsSchema,
  SETTING_KEYS,
  SETTING_GROUPS,
  SETTINGS_BUDGET,
  FEATURE_KEYS,
  PRESETS,
  PRESETS_FULL,
  PRESET_SETTINGS,
  createStoreConfig,
  deriveFromAddress,
  reapplyPreset,
  presetFeatures,
  DEFAULT_FACTS,
  type Preset,
} from '../src';

const address = { line1: '12 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' };
const make = (preset: Preset, extra = {}) => createStoreConfig({ name: 'Kebab Corner', address, preset, ...extra });

describe('StoreConfig schema: the settings list in docs/04', () => {
  it('has exactly the 18 settings, in the order and groups the doc gives, within the budget of 20', () => {
    expect(SETTING_KEYS).toEqual([
      'name', 'address', 'logo', 'theme', 'coverMedia',
      'serviceStyle', 'orderTypes', 'payTiming', 'openingHours',
      'tax', 'serviceCharge', 'paymentMethods', 'payoutAccount',
      'guestLogin', 'languages',
      'stations',
      'reviewLink', 'receiptContact',
    ]);
    expect(SETTING_KEYS).toHaveLength(18);
    expect(SETTINGS_BUDGET).toBe(20);
    expect(Object.values(SETTING_GROUPS).flat()).toEqual(SETTING_KEYS);
    expect(Object.fromEntries(Object.entries(SETTING_GROUPS).map(([k, v]) => [k, v.length]))).toEqual({
      'Identity and look': 5, Service: 4, Money: 4, Guest: 2, Kitchen: 1, 'After the order': 2,
    });
  });

  it('is strict: an unknown setting or feature key is rejected (no dead settings)', () => {
    const cfg = make('hybrid');
    expect(StoreConfigSchema.safeParse({ ...cfg, settings: { ...cfg.settings, brandColor: '#fff' } }).success).toBe(false);
    expect(StoreConfigSchema.safeParse({ ...cfg, features: { ...cfg.features, flagForStore7: true } }).success).toBe(false);
    expect(StoreConfigSchema.safeParse({ ...cfg, extra: 1 }).success).toBe(false);
  });

  it('rejects a missing feature switch', () => {
    const cfg = make('hybrid');
    const { ordering: _o, ...rest } = cfg.features;
    expect(StoreConfigSchema.safeParse({ ...cfg, features: rest }).success).toBe(false);
  });

  it('checks the cross-field rules: pay timing matches the offered order types', () => {
    const cfg = make('hybrid');
    const bad = (settings: object) => StoreConfigSchema.safeParse({ ...cfg, settings: { ...cfg.settings, ...settings } }).success;
    expect(bad({ orderTypes: ['dine_in'] })).toBe(false); // takeaway timing left behind
    expect(bad({ payTiming: { dine_in: 'at_end' } })).toBe(false); // takeaway offered, no timing
    expect(bad({ orderTypes: ['dine_in', 'dine_in'] })).toBe(false);
    expect(bad({ orderTypes: [] })).toBe(false);
    expect(bad({ orderTypes: ['dine_in'], payTiming: { dine_in: 'at_end' } })).toBe(true);
  });

  it('checks value ranges and shapes', () => {
    const cfg = make('hybrid');
    const bad = (settings: object) => StoreConfigSchema.safeParse({ ...cfg, settings: { ...cfg.settings, ...settings } }).success;
    expect(bad({ serviceCharge: -1 })).toBe(false);
    expect(bad({ guestLogin: 'sometimes' })).toBe(false);
    expect(bad({ theme: { look: 'x', accent: 'green', appearance: 'light' } })).toBe(false);
    expect(bad({ tax: { registration: 'unregistered', ratePercent: 5, inclusive: false } })).toBe(false);
    expect(bad({ openingHours: { mode: 'schedule', weekly: { mon: [{ open: '25:00', close: '23:00' }] }, exceptions: [] } })).toBe(false);
    expect(bad({ openingHours: { mode: 'schedule', weekly: { mon: [{ open: '12:00', close: '23:30' }] }, exceptions: [{ date: '2026-11-08', intervals: [] }] } })).toBe(true);
    expect(bad({ stations: { stations: [{ id: 'kitchen', name: 'Kitchen' }], routing: { drinks: 'bar' } } })).toBe(false);
    expect(bad({ reviewLink: { type: 'url', url: 'not a url' } })).toBe(false);
    expect(bad({ reviewLink: { type: 'place_id', placeId: 'ChIJ_example' } })).toBe(true);
  });
});

describe('defaults from docs/04 section 2', () => {
  const s = make('hybrid').settings;
  it.each([
    ['logo', null],
    ['coverMedia', null],
    ['openingHours', { mode: 'always' }],
    ['serviceCharge', 0],
    ['paymentMethods', ['cash', 'upi_counter']],
    ['payoutAccount', null],
    ['guestLogin', 'optional'],
    ['reviewLink', null],
  ] as const)('%s defaults to %j', (key, value) => {
    expect(s[key]).toEqual(value);
  });
  it('one station called Kitchen', () => {
    expect(s.stations).toEqual({ stations: [{ id: 'kitchen', name: 'Kitchen' }], routing: {} });
  });
  it('tax defaults to registered GST at 5 percent, exclusive (docs/15 section 2)', () => {
    expect(s.tax).toEqual({ registration: 'registered', ratePercent: 5, inclusive: false });
  });
  it('the address derives country, state, currency, timezone and languages (English plus the state language)', () => {
    expect(deriveFromAddress(s.address)).toMatchObject({ country: 'IN', state: 'Delhi', currency: 'INR', timezone: 'Asia/Kolkata', consentDefault: 'opt_in', languages: ['en', 'hi'] });
    expect(s.languages).toEqual(['en', 'hi']);
    expect(deriveFromAddress({ ...address, state: 'Tamil Nadu' }).languages).toEqual(['en', 'ta']);
    expect(deriveFromAddress({ ...address, state: 'Somewhere' }).languages).toEqual(['en']);
    expect(() => deriveFromAddress({ ...address, country: 'US' })).toThrow(/country profile/);
  });
  it('receipt contact is the owner phone when onboarding has one', () => {
    expect(make('hybrid', { ownerPhone: '+919810000000' }).settings.receiptContact).toEqual({ type: 'phone', value: '+919810000000' });
    expect(s.receiptContact).toBeNull();
  });
  it('the GST question has three answers; only a registered store has a rate', () => {
    expect(make('hybrid', { gst: 'composition' }).settings.tax).toMatchObject({ registration: 'composition', ratePercent: 0 });
    expect(make('hybrid', { gst: 'unregistered' }).settings.tax).toMatchObject({ registration: 'unregistered', ratePercent: 0 });
    expect(make('hybrid', { gst: 'registered', gstRatePercent: 18 }).settings.tax.ratePercent).toBe(18);
  });
  it('an owner who never opens Settings still has a complete, valid config', () => {
    for (const p of PRESETS) expect(StoreConfigSchema.safeParse(make(p)).success).toBe(true);
  });
});

describe('presets (docs/04 section 4)', () => {
  it('counter: dine-in and takeaway, both pay before kitchen', () => {
    expect(PRESET_SETTINGS.counter).toEqual({ serviceStyle: 'counter', orderTypes: ['dine_in', 'takeaway'], payTiming: { dine_in: 'before_kitchen', takeaway: 'before_kitchen' } });
  });
  it('table: dine-in only, pay at end, takeaway n/a', () => {
    expect(PRESET_SETTINGS.table).toEqual({ serviceStyle: 'table', orderTypes: ['dine_in'], payTiming: { dine_in: 'at_end' } });
  });
  it('hybrid: dine-in and takeaway, both pay before kitchen', () => {
    expect(PRESET_SETTINGS.hybrid).toEqual({ serviceStyle: 'hybrid', orderTypes: ['dine_in', 'takeaway'], payTiming: { dine_in: 'before_kitchen', takeaway: 'before_kitchen' } });
  });
  it('each preset fills every setting default (except name and address, which come from onboarding) and every feature switch', () => {
    for (const p of PRESETS) {
      const full = PRESETS_FULL[p];
      expect(Object.keys(full.settings).sort()).toEqual(SETTING_KEYS.filter((k) => k !== 'name' && k !== 'address').sort());
      expect(Object.keys(full.features).sort()).toEqual([...FEATURE_KEYS].sort());
      expect(Object.values(full.features).every((v) => typeof v === 'boolean')).toBe(true);
      const parsed = SettingsSchema.safeParse({ ...full.settings, name: 'x', address });
      expect(parsed.success, p).toBe(true);
    }
  });
  it('features that differ: counter has split bill, tips, call waiter and party size off; hybrid has party size off; table has all on (except rewards, which is off in every preset)', () => {
    const f = (p: Preset) => presetFeatures(p, DEFAULT_FACTS);
    const off = (p: Preset) => FEATURE_KEYS.filter((k) => !f(p)[k]);
    // With nothing connected yet, the conditional features start off too. List only the unconditional ones.
    const unconditional = (p: Preset) => off(p).filter((k) => !['scanToPay', 'stories', 'reviewPrompt', 'whatsappReceipts'].includes(k));
    expect(unconditional('counter').sort()).toEqual(['callWaiter', 'partySize', 'rewards', 'splitBill', 'tips']);
    expect(unconditional('hybrid').sort()).toEqual(['partySize', 'rewards']);
    expect(unconditional('table')).toEqual(['rewards']);
  });
  it('conditional features switch on once their condition holds', () => {
    const on = presetFeatures('table', { ...DEFAULT_FACTS, paymentsConnected: true, storiesExist: true, hasReviewLink: true, messagingConnected: true });
    expect(on).toMatchObject({ scanToPay: true, stories: true, reviewPrompt: true, whatsappReceipts: true });
    const free = presetFeatures('hybrid', { ...DEFAULT_FACTS, freeMenuStart: true });
    expect(free.ordering).toBe(false); // a store starting on the free menu has ordering off
    expect(presetFeatures('hybrid', DEFAULT_FACTS).ordering).toBe(true);
  });
  it('changing service style re-applies the preset values and every feature switch', () => {
    const cfg = make('counter');
    const next = reapplyPreset(cfg, 'table');
    expect(next.settings.serviceStyle).toBe('table');
    expect(next.settings.orderTypes).toEqual(['dine_in']);
    expect(next.settings.payTiming).toEqual({ dine_in: 'at_end' });
    expect(next.features.callWaiter).toBe(true);
    expect(next.settings.name).toBe(cfg.settings.name); // other settings are kept
    expect(StoreConfigSchema.safeParse(next).success).toBe(true);
  });
});
