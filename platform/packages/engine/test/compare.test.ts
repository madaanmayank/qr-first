import { describe, it, expect } from 'vitest';
import type { Item, Nutrition } from '@qr-first/contracts';
import { compareVerdict, defaultCompareWith } from '../src';
import { makeMenu } from './fixtures';

const nut = (kcal: number, proteinG: number, source: 'ai' | 'owner' = 'ai'): Nutrition => ({ kcal, proteinG, per: 'serving', source, confidence: 0.7, updatedAt: '2026-11-14T10:00:00.000Z' });
const menu = makeMenu();
const dish = (id: string, name: string, n?: Nutrition): Item => ({ ...menu.items.galouti!, id, name, ...(n ? { nutrition: n } : { nutrition: undefined }) });

const galouti = dish('galouti', 'Galouti Kebab', nut(340, 22));
const seekh = dish('seekh', 'Seekh Kebab', nut(420, 28));

describe('compareVerdict (docs/05 section 1d)', () => {
  it('builds the one-line verdict from the stored numbers', () => {
    const v = compareVerdict(galouti, seekh);
    expect(v.text).toBe('Galouti Kebab is about 80 kcal lighter. Seekh Kebab has about 6 g more protein.');
    expect(v.facts).toEqual([
      { kind: 'kcal_lighter', itemId: 'galouti', kcal: 80 },
      { kind: 'protein_higher', itemId: 'seekh', proteinG: 6 },
    ]);
  });
  it('gives the same verdict whichever dish is on the left', () => {
    expect(compareVerdict(seekh, galouti)).toEqual(compareVerdict(galouti, seekh));
  });
  it('when one dish is both lighter and higher in protein it says both about that dish', () => {
    const v = compareVerdict(dish('a', 'Dish A', nut(300, 30)), dish('b', 'Dish B', nut(400, 20)));
    expect(v.text).toBe('Dish A is about 100 kcal lighter. Dish A has about 10 g more protein.');
  });
  it('rounds calories to the nearest 10 and protein to the nearest gram, and leaves out differences that round to zero', () => {
    expect(compareVerdict(dish('a', 'A', nut(300, 20)), dish('b', 'B', nut(384, 20))).text).toBe('A is about 80 kcal lighter.');
    expect(compareVerdict(dish('a', 'A', nut(300, 20)), dish('b', 'B', nut(386, 20))).text).toBe('A is about 90 kcal lighter.');
    expect(compareVerdict(dish('a', 'A', nut(300, 20)), dish('b', 'B', nut(304, 20.4))).text).toBe('Both have about the same calories and protein.');
    expect(compareVerdict(dish('a', 'A', nut(300, 20)), dish('b', 'B', nut(300, 20.5))).text).toBe('B has about 1 g more protein.');
  });
  it('says only that they are about the same when the numbers match', () => {
    const v = compareVerdict(dish('a', 'A', nut(300, 20)), dish('b', 'B', nut(300, 20)));
    expect(v).toEqual({ text: 'Both have about the same calories and protein.', facts: [{ kind: 'kcal_about_same' }] });
  });
  it('writes no verdict when either dish has no stored numbers, rather than inventing one', () => {
    expect(compareVerdict(galouti, dish('x', 'X'))).toEqual({ text: null, facts: [] });
    expect(compareVerdict(dish('x', 'X'), galouti)).toEqual({ text: null, facts: [] });
    expect(compareVerdict(dish('x', 'X'), dish('y', 'Y'))).toEqual({ text: null, facts: [] });
  });
  it('writes no verdict when a dish is compared with itself', () => {
    expect(compareVerdict(galouti, galouti).text).toBeNull();
  });
  it('never claims which is healthier, better or best overall, across a grid of numbers', () => {
    const banned = /health|better|best|worse|good|bad|ideal|recommend|choose|diet|clean|fit|should/i;
    for (const k1 of [0, 90, 340, 341, 800]) {
      for (const k2 of [0, 85, 420, 1200]) {
        for (const p1 of [0, 5, 22, 22.4, 60]) {
          for (const p2 of [0, 5.6, 28, 90]) {
            const t = compareVerdict(dish('a', 'Dish A', nut(k1, p1)), dish('b', 'Dish B', nut(k2, p2))).text;
            expect(t).not.toBeNull();
            expect(t).not.toMatch(banned);
          }
        }
      }
    }
  });
  it('uses only the stored numbers and the dish names: every figure in the text comes from a fact, and "lighter" goes to the lower-calorie dish', () => {
    for (const [k1, k2] of [[100, 300], [300, 100], [330, 340], [500, 515]] as [number, number][]) {
      const a = dish('a', 'Dish A', nut(k1, 10));
      const b = dish('b', 'Dish B', nut(k2, 10));
      const v = compareVerdict(a, b);
      const figures = (v.text ?? '').match(/\d+/g) ?? [];
      const fromFacts = v.facts.flatMap((f) => (f.kind === 'kcal_lighter' ? [String(f.kcal)] : f.kind === 'protein_higher' ? [String(f.proteinG)] : []));
      expect(figures).toEqual(fromFacts);
      const lighter = v.facts.find((f) => f.kind === 'kcal_lighter');
      if (lighter && lighter.kind === 'kcal_lighter') expect(lighter.itemId).toBe(k1 < k2 ? 'a' : 'b');
    }
  });
  it('is the same for AI estimates and owner-confirmed numbers, and does not change the dishes', () => {
    const owner = dish('galouti', 'Galouti Kebab', nut(340, 22, 'owner'));
    expect(compareVerdict(owner, seekh).text).toBe(compareVerdict(galouti, seekh).text);
    const before = JSON.stringify([galouti, seekh]);
    compareVerdict(galouti, seekh);
    expect(JSON.stringify([galouti, seekh])).toBe(before);
  });
});

describe('defaultCompareWith', () => {
  const m = makeMenu();
  const none = { soldOutItemIds: [], soldOutOptionIds: [] };
  it('suggests a second item from the same course and diet', () => {
    expect(defaultCompareWith(m.items.galouti!, m, none)?.id).toBe('seekh');
  });
  it('prefers an item that has numbers to compare', () => {
    const m2 = makeMenu();
    m2.items.seekh = { ...m2.items.seekh!, soldOut: false };
    expect(defaultCompareWith(m2.items.paneer_tikka!, m2, none)?.id).toBe('hara_bhara');
    m2.items.hara_bhara = { ...m2.items.hara_bhara!, basePrice: 50000 };
    m2.items.paneer_tikka = { ...m2.items.paneer_tikka! };
    // The closest-priced veg starter has no numbers; there is only one candidate, so it is still offered.
    expect(defaultCompareWith(m2.items.paneer_tikka!, m2, none)?.id).toBe('hara_bhara');
  });
  it('never offers a sold-out item', () => {
    expect(defaultCompareWith(m.items.galouti!, m, { soldOutItemIds: ['seekh'], soldOutOptionIds: [] })).toBeUndefined();
  });
});
