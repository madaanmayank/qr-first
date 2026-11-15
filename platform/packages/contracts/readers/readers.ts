import { FEATURE_KEYS, SETTING_KEYS, type FeatureKey, type SettingKey } from '../src';

/**
 * Reader manifest (AGENTS rule 4, docs/04 section 9, docs/25 section 3 rule 6).
 *
 * Every setting key and every feature key must have an entry. A new key without an entry
 * fails the type check and `check-docs`. While no production code reads the key yet, the
 * entry is a placeholder and `readers.test.ts` carries a todo test for it. When production
 * code reads it, change the entry to `read` with the file, and replace the todo with a real
 * on and off test.
 */
export type ReaderEntry = { status: 'placeholder' } | { status: 'read'; file: string };

const placeholder: ReaderEntry = { status: 'placeholder' };

export const featureReaders: Record<FeatureKey, ReaderEntry> = {
  ordering: placeholder,
  scanToPay: placeholder,
  choices: placeholder,
  combos: placeholder,
  kitchenNote: placeholder,
  splitBill: placeholder,
  tips: placeholder,
  autoAccept: placeholder,
  personalWelcome: placeholder,
  suggestions: placeholder,
  playMode: placeholder,
  waiter: placeholder,
  vegFilter: placeholder,
  stories: placeholder,
  rewards: placeholder,
  callWaiter: placeholder,
  partySize: placeholder,
  ratings: placeholder,
  reviewPrompt: placeholder,
  whatsappReceipts: placeholder,
  nutrition: placeholder,
  compare: placeholder,
};

export const settingReaders: Record<SettingKey, ReaderEntry> = {
  name: placeholder,
  address: placeholder,
  logo: placeholder,
  theme: placeholder,
  coverMedia: placeholder,
  serviceStyle: placeholder,
  orderTypes: placeholder,
  payTiming: placeholder,
  openingHours: placeholder,
  tax: placeholder,
  serviceCharge: placeholder,
  paymentMethods: placeholder,
  payoutAccount: placeholder,
  guestLogin: placeholder,
  languages: placeholder,
  stations: placeholder,
  reviewLink: placeholder,
  receiptContact: placeholder,
};

export const READER_FEATURE_KEYS: readonly string[] = FEATURE_KEYS;
export const READER_SETTING_KEYS: readonly string[] = SETTING_KEYS;
