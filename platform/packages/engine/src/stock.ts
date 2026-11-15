import {
  QrError,
  type Alternative,
  type CartLine,
  type Item,
  type LineStockResult,
  type MenuIndex,
  type OrderType,
  type PricedTab,
  type Selection,
  type StockState,
} from '@qr-first/contracts';
import { priceTab, resolveLine, type PriceTabInput } from './pricing';
import type { PricingContext } from './context';
import { isItemSoldOut, isOptionSoldOut } from './validate-line';
import { isHoldActive, lineSignature, startHold, type StartHoldInput, type StartHoldResult, type StockHold } from './hold';

export interface Cart {
  orderType: OrderType;
  lines: readonly CartLine[];
}

/** Hook that proposes similar items when an item is sold out (docs/05 section 1c, one-tap fixes). */
export type SimilarItemsHook = (ctx: {
  item: Item;
  menu: MenuIndex;
  stock: StockState;
  cart: Cart;
}) => Item[];

export interface CheckStockOptions {
  similarItems?: SimilarItemsHook;
  /** Active holds cover their lines even if stock changes during payment (decision D21). */
  holds?: readonly StockHold[];
  /** Epoch milliseconds. Needed to judge whether a hold is still active. */
  now?: number;
  /** Most alternatives of each kind to return. Default 3. */
  maxAlternatives?: number;
}

const needsChoices = (menu: MenuIndex, groupIds: readonly string[] | undefined) =>
  (groupIds ?? []).some((gid) => (menu.optionGroups[gid]?.min ?? 0) > 0);

function basePrice(item: Item, orderType: OrderType): number {
  return orderType === 'takeaway' && item.takeawayPrice !== undefined ? item.takeawayPrice : item.basePrice;
}

/**
 * Default similar-item rule: same course (or same category when no course is set), same dietary
 * type, in stock, not already in the cart, closest price first. A combo has no course, so it
 * matches other combos by category.
 */
export const defaultSimilarItems: SimilarItemsHook = ({ item, menu, stock, cart }) => {
  const inCart = new Set(cart.lines.map((l) => l.itemId));
  const sameKind = (c: Item) => (item.course ? c.course === item.course : c.categoryId === item.categoryId);
  return (Object.values(menu.items) as Item[])
    .filter(
      (c) =>
        c.id !== item.id &&
        c.storeId === item.storeId &&
        sameKind(c) &&
        c.dietaryType === item.dietaryType &&
        !isItemSoldOut(menu, stock, c.id) &&
        !inCart.has(c.id),
    )
    .sort(
      (a, b) =>
        Math.abs(basePrice(a, cart.orderType) - basePrice(item, cart.orderType)) -
          Math.abs(basePrice(b, cart.orderType) - basePrice(item, cart.orderType)) || a.name.localeCompare(b.name),
    );
};

function itemAlternatives(cart: Cart, item: Item, menu: MenuIndex, stock: StockState, o: CheckStockOptions): Alternative[] {
  const hook = o.similarItems ?? defaultSimilarItems;
  const max = o.maxAlternatives ?? 3;
  return hook({ item, menu, stock, cart })
    .filter((c) => !isItemSoldOut(menu, stock, c.id))
    .slice(0, max)
    .map((c) => ({
      kind: 'item' as const,
      itemId: c.id,
      name: c.name,
      priceDifference: basePrice(c, cart.orderType) - basePrice(item, cart.orderType),
      needsChoices: needsChoices(menu, c.optionGroupIds),
    }));
}

function optionAlternatives(
  menu: MenuIndex,
  stock: StockState,
  groupId: string,
  soldOutOptionId: string,
  pickedInGroup: readonly string[],
  max: number,
): Alternative[] {
  const group = menu.optionGroups[groupId];
  if (!group) return [];
  const gone = group.options.find((o) => o.id === soldOutOptionId);
  const goneDelta = gone?.priceDelta ?? 0;
  return group.options
    .filter((o) => o.id !== soldOutOptionId && !pickedInGroup.includes(o.id) && !isOptionSoldOut(menu, stock, o))
    .map((o, order) => ({ o, order }))
    .sort((a, b) => Math.abs(a.o.priceDelta - goneDelta) - Math.abs(b.o.priceDelta - goneDelta) || a.order - b.order)
    .slice(0, max)
    .map(({ o }) => ({
      kind: 'option' as const,
      groupId,
      optionId: o.id,
      name: o.name,
      priceDifference: o.priceDelta - goneDelta,
      needsChoices: needsChoices(menu, o.optionGroupIds),
    }));
}

/** First sold-out pick in a selection tree, in group order, with the group it sits in. */
function firstSoldOutPick(
  menu: MenuIndex,
  stock: StockState,
  selections: readonly Selection[],
): { groupId: string; optionId: string; pickedInGroup: string[] } | undefined {
  for (const sel of selections) {
    const group = menu.optionGroups[sel.groupId];
    if (!group) continue;
    for (const pick of sel.options) {
      const option = group.options.find((o) => o.id === pick.optionId);
      if (option && isOptionSoldOut(menu, stock, option)) {
        return { groupId: sel.groupId, optionId: option.id, pickedInGroup: sel.options.map((p) => p.optionId) };
      }
      if (pick.children) {
        const nested = firstSoldOutPick(menu, stock, pick.children);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

/**
 * Per-line stock result for a cart, exactly as docs/09 "Stock in real time" describes:
 * `{ lineId, status: 'ok' | 'ITEM_SOLD_OUT' | 'OPTION_SOLD_OUT', optionId?, alternatives? }`.
 *
 * - An item sold out wins over a choice sold out on the same line.
 * - When several choices on one line are out, the first in group order is named. Fix it and
 *   re-check to reach the next.
 * - `alternatives` lists available swaps with their price difference. For a choice, the other
 *   options in the same group. For an item, similar items from the hook.
 * - A line covered by an active hold is `ok` even if stock changed since the hold started.
 *
 * Nothing is removed or changed. The caller decides what to show.
 */
export function checkStock(cart: Cart, stock: StockState, menu: MenuIndex, options: CheckStockOptions = {}): LineStockResult[] {
  const max = options.maxAlternatives ?? 3;
  const activeHolds = (options.holds ?? []).filter((h) => options.now !== undefined && isHoldActive(h, options.now));
  return cart.lines.map((line): LineStockResult => {
    const item = menu.items[line.itemId];
    if (!item) throw new QrError('ITEM_UNKNOWN', undefined, { itemId: line.itemId, lineId: line.lineId });
    const sig = lineSignature(line);
    if (activeHolds.some((h) => h.lines.some((l) => l.lineId === line.lineId && l.signature === sig))) {
      return { lineId: line.lineId, status: 'ok' };
    }
    if (isItemSoldOut(menu, stock, item.id)) {
      return { lineId: line.lineId, status: 'ITEM_SOLD_OUT', alternatives: itemAlternatives(cart, item, menu, stock, options) };
    }
    const hit = firstSoldOutPick(menu, stock, line.selections);
    if (hit) {
      return {
        lineId: line.lineId,
        status: 'OPTION_SOLD_OUT',
        optionId: hit.optionId,
        alternatives: optionAlternatives(menu, stock, hit.groupId, hit.optionId, hit.pickedInGroup, max),
      };
    }
    return { lineId: line.lineId, status: 'ok' };
  });
}

/** How many lines need the guest's attention. Drives "1 item needs a look". */
export const linesNeedingAttention = (results: readonly LineStockResult[]) => results.filter((r) => r.status !== 'ok').length;

export interface StockedPrice {
  results: LineStockResult[];
  /** Lines left out of the total because of a stock problem. They stay in the cart. */
  excludedLineIds: string[];
  /** What each excluded line would have cost, to show struck through. */
  struckThrough: { lineId: string; lineTotal: number }[];
  /** The truthful total: sold-out lines are not in it. */
  priced: PricedTab;
  needsAttention: number;
}

/**
 * Price a cart with live stock. A line with a stock problem is never removed or changed. It is
 * left out of the total so the total is always truthful (docs/05 section 1c, Cart).
 */
export function priceCartWithStock(
  cart: Cart,
  stock: StockState,
  ctx: PricingContext,
  extras: Omit<PriceTabInput, 'orderType' | 'lines'> = {},
  options: CheckStockOptions = {},
): StockedPrice {
  const results = checkStock(cart, stock, ctx.menu, options);
  const bad = new Set(results.filter((r) => r.status !== 'ok').map((r) => r.lineId));
  const kept = cart.lines.filter((l) => !bad.has(l.lineId));
  const priced = priceTab({ ...extras, orderType: cart.orderType, lines: kept }, ctx);
  const struckThrough = cart.lines
    .filter((l) => bad.has(l.lineId))
    .map((l) => {
      const r = resolveLine(ctx.menu, l, cart.orderType);
      return { lineId: l.lineId, lineTotal: r.unitPrice * r.qty };
    });
  return { results, excludedLineIds: [...bad], struckThrough, priced, needsAttention: bad.size };
}

/** One-tap fix: swap a sold-out choice for an available one in the same group. Returns a new cart. */
export function swapOption(cart: Cart, lineId: string, soldOutOptionId: string, alt: Extract<Alternative, { kind: 'option' }>): Cart {
  const swap = (selections: readonly Selection[]): Selection[] =>
    selections.map((sel) => ({
      groupId: sel.groupId,
      options: sel.options.map((p) =>
        p.optionId === soldOutOptionId && sel.groupId === alt.groupId
          ? { optionId: alt.optionId }
          : { optionId: p.optionId, ...(p.children ? { children: swap(p.children) } : {}) },
      ),
    }));
  const lines = cart.lines.map((l) => (l.lineId === lineId ? { ...l, selections: swap(l.selections) } : l));
  return { ...cart, lines };
}

/**
 * One-tap fix: swap the item for a similar one. Choices are cleared because they belong to the old
 * item; quantity and note are kept. If `needsChoices` is true the guest picks next.
 */
export function swapItem(cart: Cart, lineId: string, alt: Extract<Alternative, { kind: 'item' }>): Cart {
  return {
    ...cart,
    lines: cart.lines.map((l) => (l.lineId === lineId ? { ...l, itemId: alt.itemId, selections: [] } : l)),
  };
}

/** One-tap fix: remove the line. The rest of the cart is untouched. */
export function removeLine(cart: Cart, lineId: string): Cart {
  return { ...cart, lines: cart.lines.filter((l) => l.lineId !== lineId) };
}

/**
 * Start the soft hold for a pay-first tab when payment starts (decision D21). Refused, with the
 * per-line results, when any line already fails the stock check. See `startHold`.
 */
export function holdForCart(
  cart: Cart,
  stock: StockState,
  menu: MenuIndex,
  input: Omit<StartHoldInput, 'lines'>,
  existing: readonly StockHold[] = [],
  options: CheckStockOptions = {},
): StartHoldResult {
  return startHold(
    { ...input, lines: cart.lines },
    (lines) => checkStock({ ...cart, lines }, stock, menu, options),
    existing,
  );
}
