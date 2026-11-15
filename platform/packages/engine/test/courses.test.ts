import { describe, it, expect } from 'vitest';
import type { Course, MenuIndex, StockState } from '@qr-first/contracts';
import { completionGaps, coursesInCart, itemIdsInCart, suggestNext, isOrderable, type Cart } from '../src';
import { comboSelections, line, makeMenu } from './fixtures';

const menu = makeMenu();
const noStock: StockState = { soldOutItemIds: [], soldOutOptionIds: [] };
const stockOf = (items: string[] = [], options: string[] = []): StockState => ({ soldOutItemIds: items, soldOutOptionIds: options });
const cartOf = (...ids: string[]): Cart => ({ orderType: 'dine_in', lines: ids.map((id, i) => line(`l${i}`, id)) });
const gaps = (...ids: string[]) => completionGaps(cartOf(...ids), menu).map((g) => [g.course, g.reason]);

describe('completionGaps (docs/05 section 1f)', () => {
  it('an empty cart has no gaps', () => {
    expect(gaps()).toEqual([]);
  });
  it('a main with no drink is missing a drink', () => {
    expect(gaps('dal_makhani')).toEqual([['drink', 'main_without_drink']]);
  });
  it('a main with a drink is complete', () => {
    expect(gaps('dal_makhani', 'chai')).toEqual([]);
  });
  it('starters and mains with no drink and no sweet: the drink first, then the dessert', () => {
    expect(gaps('galouti', 'dal_makhani')).toEqual([['drink', 'main_without_drink'], ['dessert', 'meal_without_dessert']]);
  });
  it('starters, mains and a drink with no sweet are missing a dessert', () => {
    expect(gaps('galouti', 'dal_makhani', 'chai')).toEqual([['dessert', 'meal_without_dessert']]);
  });
  it('a full table has no gaps', () => {
    expect(gaps('galouti', 'dal_makhani', 'chai', 'jalebi')).toEqual([]);
  });
  it('a main and a dessert but no starter and no drink is only missing a drink', () => {
    expect(gaps('dal_makhani', 'jalebi')).toEqual([['drink', 'main_without_drink']]);
  });
  it.each<[string, Course]>([
    ['galouti', 'main'], // all starters
    ['chai', 'main'],
    ['samosa', 'drink'],
    ['naan', 'main'],
    ['jalebi', 'main'],
  ])('a cart of one course (%s) is missing the course most tables add next: %s', (id, next) => {
    expect(gaps(id)).toEqual([[next, 'single_course']]);
  });
  it('the cart course set takes the courses of a combo\'s parts, since a combo has none of its own', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('c1', 'kebab_combo', 1, comboSelections())] };
    expect([...coursesInCart(cart, menu)].sort()).toEqual(['bread', 'main', 'starter']);
    expect(completionGaps(cart, menu).map((g) => g.course)).toEqual(['drink', 'dessert']);
  });
  it('items with no course add nothing', () => {
    const m: MenuIndex = { ...menu, items: { ...menu.items, chai: { ...menu.items.chai!, course: undefined } } };
    expect(completionGaps(cartOf('chai'), m)).toEqual([]);
  });
  it('is pure: the cart and menu are not changed', () => {
    const cart = cartOf('galouti', 'dal_makhani');
    const before = JSON.stringify([cart, menu]);
    completionGaps(cart, menu);
    expect(JSON.stringify([cart, menu])).toBe(before);
  });
});

describe('suggestNext', () => {
  const pop = { chai: 50, cold_coffee: 40, water: 1 };

  it('suggests a drink for a main, with a true reason code', () => {
    const s = suggestNext(cartOf('dal_makhani'), menu, noStock, { popularity: pop });
    expect(s).toEqual({ itemId: 'chai', course: 'drink', reason: { code: 'main_without_drink', course: 'drink' }, needsChoices: false });
  });

  it('ranks by the store\'s own orders, then price, then id', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, noStock, { popularity: { cold_coffee: 99 } })?.itemId).toBe('cold_coffee');
    expect(suggestNext(cartOf('dal_makhani'), menu, noStock)?.itemId).toBe('water'); // cheapest when there is no data
  });

  it('never returns a sold-out item, and the next best takes its place', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, stockOf(['chai']), { popularity: pop })?.itemId).toBe('cold_coffee');
    expect(suggestNext(cartOf('dal_makhani'), menu, stockOf(['chai', 'cold_coffee']), { popularity: pop })?.itemId).toBe('water');
  });

  it('never returns an item whose required choices are all sold out', () => {
    const noSizes = stockOf(['chai'], ['o_size_s', 'o_size_m', 'o_size_l']);
    expect(suggestNext(cartOf('dal_makhani'), menu, noSizes, { popularity: pop })?.itemId).toBe('water');
    expect(isOrderable(menu, noSizes, menu.items.cold_coffee!)).toBe(false);
    expect(isOrderable(menu, stockOf([], ['o_size_s', 'o_size_m']), menu.items.cold_coffee!)).toBe(true); // one size left is enough
    expect(isOrderable(menu, noStock, menu.items.cold_coffee!)).toBe(true);
  });

  it('flags an item that needs the item sheet', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, stockOf(['chai']), { popularity: pop })).toMatchObject({ itemId: 'cold_coffee', needsChoices: true });
  });

  it('returns null when everything for the missing course is sold out', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, stockOf(['chai', 'cold_coffee', 'water']), { popularity: pop })).toBeNull();
  });

  it('never suggests alcohol on its own', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, stockOf(['chai', 'cold_coffee', 'water']))).toBeNull(); // the beer is the only drink left
  });

  it('property: whatever is in the cart or sold out, the suggestion is orderable and not already on the table', () => {
    const ids = Object.keys(menu.items);
    for (const first of ids) {
      for (const second of ids) {
        const cart = cartOf(first, second);
        for (const stock of [noStock, stockOf(['chai', 'jalebi']), stockOf(['dal_makhani'], ['o_size_s', 'o_size_m', 'o_size_l', 'o_rumali', 'o_naan'])]) {
          for (const stage of ['cart', 'late', 'bill'] as const) {
            const s = suggestNext(cart, menu, stock, { stage });
            if (!s) continue;
            const item = menu.items[s.itemId]!;
            expect(itemIdsInCart(cart, menu).has(s.itemId), `${first}+${second} repeats ${s.itemId}`).toBe(false);
            expect(isOrderable(menu, stock, item), `${first}+${second} suggests unorderable ${s.itemId}`).toBe(true);
            expect(stock.soldOutItemIds).not.toContain(s.itemId);
            expect(item.tags).not.toContain('contains_alcohol');
          }
        }
      }
    }
  });

  it('itemIdsInCart includes the parts of a combo, so a part is never suggested back', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('c1', 'kebab_combo', 1, comboSelections())] };
    expect([...itemIdsInCart(cart, menu)].sort()).toEqual(['butter_chicken', 'galouti', 'kebab_combo', 'naan']);
    const s = suggestNext(cart, menu, noStock, { stage: 'late' });
    expect(s?.course).toBe('drink');
  });

  it('a vegetarian guest sees veg items only', () => {
    const cart = cartOf('galouti');
    expect(suggestNext(cart, menu, noStock, { popularity: { butter_chicken: 99 } })?.itemId).toBe('butter_chicken');
    const veg = suggestNext(cart, menu, noStock, { diet: 'veg', popularity: { butter_chicken: 99, nihari: 98 } });
    expect(menu.items[veg!.itemId]?.dietaryType).toBe('veg');
    // With every veg main sold out, a veg guest gets nothing rather than a non-veg dish.
    expect(suggestNext(cart, menu, stockOf(['dal_makhani', 'thali']), { diet: 'veg' })).toBeNull();
  });

  it('offers a dessert late, not in the cart', () => {
    const cart = cartOf('galouti', 'dal_makhani', 'chai');
    expect(suggestNext(cart, menu, noStock)).toBeNull();
    expect(suggestNext(cart, menu, noStock, { stage: 'cart' })).toBeNull();
    expect(suggestNext(cart, menu, noStock, { stage: 'late' })).toMatchObject({ itemId: 'jalebi', reason: { code: 'meal_without_dessert' } });
    expect(suggestNext(cart, menu, noStock, { stage: 'bill' })?.itemId).toBe('jalebi');
    expect(suggestNext(cart, menu, stockOf(['jalebi']), { stage: 'late' })).toBeNull();
  });

  it('the drink comes before the dessert, and the dessert waits for its stage', () => {
    const cart = cartOf('galouti', 'dal_makhani');
    expect(suggestNext(cart, menu, noStock, { stage: 'cart' })?.course).toBe('drink');
    // No drink is available at all: at the cart stage there is nothing, late falls through to the dessert.
    const noDrinks = stockOf(['chai', 'cold_coffee', 'water']);
    expect(suggestNext(cart, menu, noDrinks, { stage: 'cart' })).toBeNull();
    expect(suggestNext(cart, menu, noDrinks, { stage: 'late' })?.course).toBe('dessert');
  });

  it('gives nothing when the suggestions feature is off, or the cart is empty or complete', () => {
    expect(suggestNext(cartOf('dal_makhani'), menu, noStock, { suggestionsOn: false })).toBeNull();
    expect(suggestNext(cartOf(), menu, noStock)).toBeNull();
    expect(suggestNext(cartOf('galouti', 'dal_makhani', 'chai', 'jalebi'), menu, noStock, { stage: 'bill' })).toBeNull();
  });

  it('gives one suggestion, never a list', () => {
    expect(Array.isArray(suggestNext(cartOf('dal_makhani'), menu, noStock))).toBe(false);
  });
});
