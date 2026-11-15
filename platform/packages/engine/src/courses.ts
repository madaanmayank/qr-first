import { TAG_CONTAINS_ALCOHOL, type Course, type CartLine, type Item, type MenuIndex, type Selection, type StockState } from '@qr-first/contracts';
import { isItemSoldOut, isOptionSoldOut } from './validate-line';
import type { Cart } from './stock';

/**
 * Why a course is missing. These are reason codes, not copy: the client turns them into a true
 * line in the diner's language (docs/05 section 1a, rule "reasons are true").
 */
export type GapReason = 'main_without_drink' | 'meal_without_dessert' | 'single_course';

export interface CompletionGap {
  course: Course;
  reason: GapReason;
}

/** Items a line stands for: the item itself, or for a combo the linked items the guest picked. */
function linkedItemIds(menu: MenuIndex, selections: readonly Selection[]): string[] {
  const out: string[] = [];
  for (const sel of selections) {
    const group = menu.optionGroups[sel.groupId];
    for (const pick of sel.options) {
      const option = group?.options.find((o) => o.id === pick.optionId);
      if (option?.linkedItemId) out.push(option.linkedItemId);
      if (pick.children) out.push(...linkedItemIds(menu, pick.children));
    }
  }
  return out;
}

/**
 * Courses on the table. A combo has no course of its own and takes the courses of its parts
 * (docs/03 section 3). Items with no course add nothing.
 */
export function coursesInCart(cart: Pick<Cart, 'lines'>, menu: MenuIndex): Set<Course> {
  const out = new Set<Course>();
  for (const line of cart.lines) {
    const item = menu.items[line.itemId];
    if (!item) continue;
    if (item.course) out.add(item.course);
    for (const id of linkedItemIds(menu, line.selections)) {
      const part = menu.items[id];
      if (part?.course) out.add(part.course);
    }
  }
  return out;
}

/** Item ids already on the table, including combo parts, so a suggestion never repeats them. */
export function itemIdsInCart(cart: Pick<Cart, 'lines'>, menu: MenuIndex): Set<string> {
  const out = new Set<string>();
  for (const line of cart.lines) {
    out.add(line.itemId);
    for (const id of linkedItemIds(menu, line.selections)) out.add(id);
  }
  return out;
}

/** What most tables add next when the cart holds one course only. Starting points, see NOTES.md. */
const SINGLE_COURSE_NEXT: Record<Course, Course> = {
  starter: 'main',
  main: 'drink',
  side: 'main',
  bread: 'main',
  rice: 'main',
  dessert: 'main',
  drink: 'main',
  snack: 'drink',
};

/**
 * The courses a table is missing, most useful first (docs/05 section 1f):
 *
 * 1. A main and no drink: a drink.
 * 2. Starters and mains and no sweet: a dessert. (When to offer it is the caller's choice, see
 *    `suggestNext`.)
 * 3. The whole cart is one course: the course most tables add next.
 *
 * Pure. An empty cart has no gaps.
 */
export function completionGaps(cart: Pick<Cart, 'lines'>, menu: MenuIndex): CompletionGap[] {
  const have = coursesInCart(cart, menu);
  if (have.size === 0) return [];
  const gaps: CompletionGap[] = [];
  if (have.has('main') && !have.has('drink')) gaps.push({ course: 'drink', reason: 'main_without_drink' });
  if (have.has('starter') && have.has('main') && !have.has('dessert')) gaps.push({ course: 'dessert', reason: 'meal_without_dessert' });
  if (have.size === 1 && gaps.length === 0) {
    const only = [...have][0]!;
    gaps.push({ course: SINGLE_COURSE_NEXT[only], reason: 'single_course' });
  }
  return gaps;
}

export interface SuggestContext {
  /** The guest is known to be vegetarian (or chose the veg filter): veg items only, always. */
  diet?: 'veg' | 'any';
  /**
   * Where the guest is. A dessert is offered late: near sending, or at the bill for table
   * stores (docs/05 section 1f). Default `cart`.
   */
  stage?: 'cart' | 'late' | 'bill';
  /** Orders per item from the store's own data, used to rank. Absent means no ranking data. */
  popularity?: Readonly<Record<string, number>>;
  /** The `suggestions` feature switch. Off means no suggestion at all. Default on. */
  suggestionsOn?: boolean;
}

export interface Suggestion {
  itemId: string;
  course: Course;
  /** The true reason, as a code. Copy is built by the client. */
  reason: { code: GapReason; course: Course };
  /** The guest must open the item sheet first (a required choice). */
  needsChoices: boolean;
}

/** An item a guest can actually add now: not sold out, and every required choice has enough options left. */
export function isOrderable(menu: MenuIndex, stock: StockState, item: Item): boolean {
  if (isItemSoldOut(menu, stock, item.id)) return false;
  for (const gid of item.optionGroupIds) {
    const g = menu.optionGroups[gid];
    if (!g) return false;
    if (g.min > 0 && g.options.filter((o) => !isOptionSoldOut(menu, stock, o)).length < g.min) return false;
  }
  return true;
}

function needsChoices(menu: MenuIndex, item: Item): boolean {
  return item.optionGroupIds.some((gid) => (menu.optionGroups[gid]?.min ?? 0) > 0);
}

/** Candidates for a course, best first. Same rules as `suggestNext`. */
function candidates(cart: Cart, menu: MenuIndex, stock: StockState, ctx: SuggestContext, course: Course): Item[] {
  const inCart = itemIdsInCart(cart, menu);
  const pop = ctx.popularity ?? {};
  return (Object.values(menu.items) as Item[])
    .filter(
      (i) =>
        i.storeId === menu.storeId &&
        i.course === course &&
        !inCart.has(i.id) &&
        // Alcohol needs an age check and may be off on a dry day, so it is never suggested by itself.
        !i.tags.includes(TAG_CONTAINS_ALCOHOL) &&
        isOrderable(menu, stock, i) &&
        (ctx.diet !== 'veg' || i.dietaryType === 'veg'),
    )
    .sort((a, b) => (pop[b.id] ?? 0) - (pop[a.id] ?? 0) || a.basePrice - b.basePrice || a.id.localeCompare(b.id));
}

/**
 * One suggestion that makes sense for the table (docs/05 sections 1c and 1f), or null.
 *
 * Guarantees, each with a test:
 * - Never a sold-out item, nor an item whose required choices are all sold out.
 * - Never an item already in the cart, including a part of a combo in the cart.
 * - A vegetarian guest sees veg items only.
 * - A dessert gap is offered only at stage `late` or `bill`.
 * - Recomputed from live stock each call, so a suggestion that sells out disappears and the next
 *   best takes its place.
 *
 * This is a skeleton: the gap rules are in `completionGaps`. Shareable dishes for big tables and
 * time-window popularity (docs/05 section 1f) are not built yet.
 */
export function suggestNext(cart: Cart, menu: MenuIndex, stock: StockState, ctx: SuggestContext = {}): Suggestion | null {
  if (ctx.suggestionsOn === false) return null;
  const stage = ctx.stage ?? 'cart';
  for (const gap of completionGaps(cart, menu)) {
    if (gap.reason === 'meal_without_dessert' && stage === 'cart') continue;
    const best = candidates(cart, menu, stock, ctx, gap.course)[0];
    if (best) {
      return { itemId: best.id, course: gap.course, reason: { code: gap.reason, course: gap.course }, needsChoices: needsChoices(menu, best) };
    }
  }
  return null;
}

export type { CartLine };
