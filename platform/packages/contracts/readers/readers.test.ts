import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FEATURE_KEYS, SETTING_KEYS } from '../src';
import { featureReaders, settingReaders } from './readers';

const platformRoot = resolve(__dirname, '../../..');

describe('feature readers', () => {
  it('has a reader entry for every registered feature, and no extras', () => {
    expect(Object.keys(featureReaders).sort()).toEqual([...FEATURE_KEYS].sort());
  });
  for (const key of FEATURE_KEYS) {
    const entry = featureReaders[key];
    if (entry.status === 'placeholder') {
      // Replace with a real on and off test when production code reads features.<key>.
      it.todo(`features.${key} is read by production code (on and off tests)`);
    } else {
      it(`features.${key} is read in ${entry.file}`, () => {
        const file = resolve(platformRoot, entry.file);
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file, 'utf8')).toContain(key);
      });
    }
  }
});

describe('setting readers', () => {
  it('has a reader entry for every setting key, and no extras', () => {
    expect(Object.keys(settingReaders).sort()).toEqual([...SETTING_KEYS].sort());
  });
  for (const key of SETTING_KEYS) {
    const entry = settingReaders[key];
    if (entry.status === 'placeholder') {
      it.todo(`settings.${key} is read by production code`);
    } else {
      it(`settings.${key} is read in ${entry.file}`, () => {
        const file = resolve(platformRoot, entry.file);
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file, 'utf8')).toContain(key);
      });
    }
  }
});
