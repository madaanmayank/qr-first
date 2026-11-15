import type { Item, MenuIndex, StockState } from '@qr-first/contracts';
import { defaultSimilarItems, type Cart } from './stock';

export type VerdictFact =
  | { kind: 'kcal_lighter'; itemId: string; kcal: number }
  | { kind: 'protein_higher'; itemId: string; proteinG: number }
  | { kind: 'kcal_about_same' };

export interface Verdict {
  /** The one-line verdict, or null when either item has no stored numbers. */
  text: string | null;
  facts: VerdictFact[];
}

/** Calories are rounded to the nearest 10 and protein to the nearest gram, always "about". */
const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * The one-line verdict on the compare screen (docs/05 section 1d), built from the stored
 * calories and protein only.
 *
 * - It states differences in those two numbers and nothing else. No attribute, ingredient or
 *   health claim is invented.
 * - It never says one dish is healthier, better or best overall.
 * - "Lighter" refers to calories only, as in the doc's example.
 * - If either dish has no numbers there is no verdict (`text: null`), because a verdict cannot
 *   be written from nothing.
 * - Differences that round to zero are left out; if nothing is left it says the dishes are
 *   about the same on calories and protein.
 *
 * Example: "Galouti Kebab is about 80 kcal lighter. Seekh Kebab has about 6 g more protein."
 * The facts are returned too, so the client can translate the sentence.
 */
export function compareVerdict(a: Item, b: Item): Verdict {
  if (a.id === b.id || !a.nutrition || !b.nutrition) return { text: null, facts: [] };
  const facts: VerdictFact[] = [];
  const sentences: string[] = [];

  const dK = round10(Math.abs(a.nutrition.kcal - b.nutrition.kcal));
  if (dK > 0) {
    const lighter = a.nutrition.kcal < b.nutrition.kcal ? a : b;
    facts.push({ kind: 'kcal_lighter', itemId: lighter.id, kcal: dK });
    sentences.push(`${lighter.name} is about ${dK} kcal lighter.`);
  }
  const dP = Math.round(Math.abs(a.nutrition.proteinG - b.nutrition.proteinG));
  if (dP > 0) {
    const higher = a.nutrition.proteinG > b.nutrition.proteinG ? a : b;
    facts.push({ kind: 'protein_higher', itemId: higher.id, proteinG: dP });
    sentences.push(`${higher.name} has about ${dP} g more protein.`);
  }
  if (facts.length === 0) {
    facts.push({ kind: 'kcal_about_same' });
    sentences.push('Both have about the same calories and protein.');
  }
  return { text: sentences.join(' '), facts };
}

/**
 * The default second item for compare: same course and diet, in stock, closest price first, so
 * comparing takes one tap (docs/05 section 1d). It prefers an item that has numbers to compare.
 */
export function defaultCompareWith(item: Item, menu: MenuIndex, stock: StockState, orderType: Cart['orderType'] = 'dine_in'): Item | undefined {
  const ranked = defaultSimilarItems({ item, menu, stock, cart: { orderType, lines: [] } });
  return ranked.find((c) => c.nutrition) ?? ranked[0];
}
