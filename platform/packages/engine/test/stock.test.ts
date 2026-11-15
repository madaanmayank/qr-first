import { describe, it, expect } from 'vitest';
import type { StockState } from '@qr-first/contracts';
import {
  checkStock,
  priceCartWithStock,
  swapItem,
  swapOption,
  removeLine,
  holdForCart,
  releaseHold,
  expireHolds,
  isHoldActive,
  DEFAULT_HOLD_MS,
  linesNeedingAttention,
  type Cart,
} from '../src';
import { comboSelections, line, makeCtx, makeMenu, pick } from './fixtures';

const stockOf = (items: string[] = [], options: string[] = []): StockState => ({ soldOutItemIds: items, soldOutOptionIds: options });
const noStock = stockOf();

describe('checkStock: the per-line results from docs/09', () => {
  const menu = makeMenu();

  it('item sold out in the cart names the item and offers similar items with the price difference', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'chai')] };
    const results = checkStock(cart, stockOf(['galouti']), menu);
    expect(results[1]).toEqual({ lineId: 'l2', status: 'ok' });
    expect(results[0]).toMatchObject({ lineId: 'l1', status: 'ITEM_SOLD_OUT' });
    const alts = (results[0] as { alternatives: unknown[] }).alternatives;
    // Same course (starter) and same diet (non-veg): only the seekh kebab. Never a veg item.
    expect(alts).toEqual([{ kind: 'item', itemId: 'seekh', name: 'Seekh Kebab', priceDifference: -4000, needsChoices: false }]);
  });

  it('option sold out inside a customised line names the choice, not the item', () => {
    const cart: Cart = {
      orderType: 'dine_in',
      lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_size_m'), pick('g_milk', 'o_oat'), pick('g_addons', 'o_shot')])],
    };
    const [r] = checkStock(cart, stockOf([], ['o_oat']), menu);
    expect(r).toMatchObject({ lineId: 'l1', status: 'OPTION_SOLD_OUT', optionId: 'o_oat' });
    // Swaps in the same group, closest price first, with the difference to the sold-out option.
    expect((r as { alternatives: unknown[] }).alternatives).toEqual([
      { kind: 'option', groupId: 'g_milk', optionId: 'o_almond', name: 'Almond milk', priceDifference: 1000, needsChoices: false },
      { kind: 'option', groupId: 'g_milk', optionId: 'o_whole', name: 'Whole milk', priceDifference: -4000, needsChoices: false },
    ]);
  });

  it('both breads sold out: the choice is named and there is nothing to swap to', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'nihari', 1, [pick('g_bread', 'o_rumali')])] };
    const [r] = checkStock(cart, stockOf([], ['o_rumali', 'o_naan']), menu);
    expect(r).toEqual({ lineId: 'l1', status: 'OPTION_SOLD_OUT', optionId: 'o_rumali', alternatives: [] });
  });

  it('restock: when the item or option comes back the line is ok again', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'nihari', 1, [pick('g_bread', 'o_naan')])] };
    const out = checkStock(cart, stockOf(['galouti'], ['o_naan']), menu);
    expect(out.map((r) => r.status)).toEqual(['ITEM_SOLD_OUT', 'OPTION_SOLD_OUT']);
    const back = checkStock(cart, stockOf(), menu);
    expect(back.map((r) => r.status)).toEqual(['ok', 'ok']);
    expect(linesNeedingAttention(back)).toBe(0);
  });

  it('item sold out wins over a sold-out choice on the same line', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'nihari', 1, [pick('g_bread', 'o_naan')])] };
    const [r] = checkStock(cart, stockOf(['nihari'], ['o_naan']), menu);
    expect(r?.status).toBe('ITEM_SOLD_OUT');
  });

  it('finds a sold-out choice nested inside a combo part', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'kebab_combo', 1, comboSelections())] };
    const [r] = checkStock(cart, stockOf([], ['o_extra_butter']), menu);
    expect(r).toMatchObject({ status: 'OPTION_SOLD_OUT', optionId: 'o_extra_butter', alternatives: [] });
  });

  it('a combo part whose linked item is sold out is a sold-out choice with the other parts as swaps', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'kebab_combo', 1, comboSelections())] };
    const [r] = checkStock(cart, stockOf(['galouti']), menu);
    expect(r).toMatchObject({ status: 'OPTION_SOLD_OUT', optionId: 'o_cs_galouti' });
    expect((r as { alternatives: { optionId: string }[] }).alternatives.map((a) => a.optionId)).toEqual(['o_cs_seekh', 'o_cs_paneer']);
  });

  it('flags the first sold-out choice when several are out, and the next after it is fixed', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_size_m'), pick('g_milk', 'o_oat')])] };
    const stock = stockOf([], ['o_size_m', 'o_oat']);
    expect(checkStock(cart, stock, menu)[0]).toMatchObject({ optionId: 'o_size_m' });
    const fixed = swapOption(cart, 'l1', 'o_size_m', { kind: 'option', groupId: 'g_size', optionId: 'o_size_s', name: 'Small', priceDifference: -3000, needsChoices: false });
    expect(checkStock(fixed, stock, menu)[0]).toMatchObject({ optionId: 'o_oat' });
  });

  it('accepts a similar-item hook', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti')] };
    const [r] = checkStock(cart, stockOf(['galouti']), menu, { similarItems: ({ menu: m }) => [m.items.paneer_tikka!] });
    expect((r as { alternatives: { itemId: string }[] }).alternatives.map((a) => a.itemId)).toEqual(['paneer_tikka']);
  });

  it('does not suggest an item that is already in the cart or is sold out itself', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'paneer_tikka'), line('l2', 'hara_bhara')] };
    const [r] = checkStock(cart, stockOf(['paneer_tikka', 'hara_bhara']), menu);
    expect((r as { alternatives: unknown[] }).alternatives).toEqual([]);
  });
});

describe('priceCartWithStock: a sold-out line stays in the cart and is left out of the total', () => {
  const ctx = makeCtx();

  it('excludes the sold-out line from the total and keeps its struck-through price', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'chai')] };
    const s = priceCartWithStock(cart, stockOf(['galouti']), ctx);
    expect(s.excludedLineIds).toEqual(['l1']);
    expect(s.struckThrough).toEqual([{ lineId: 'l1', lineTotal: 42000 }]);
    expect(s.priced.lines.map((l) => l.lineId)).toEqual(['l2']);
    expect(s.priced.total).toBe(8400); // chai only: 8000 plus 5 percent GST
    expect(s.needsAttention).toBe(1);
    expect(cart.lines).toHaveLength(2); // never removed silently
  });

  it('with no stock problem the total is the plain total', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'chai')] };
    const s = priceCartWithStock(cart, noStock, ctx);
    expect(s.needsAttention).toBe(0);
    expect(s.priced.total).toBe(52500);
  });

  it('swap changes the total correctly: item swap', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'chai')] };
    const stock = stockOf(['galouti']);
    const before = priceCartWithStock(cart, stock, ctx);
    const [r] = before.results;
    const alt = (r as { alternatives: { kind: 'item'; itemId: string; priceDifference: number; name: string; needsChoices: boolean }[] }).alternatives[0]!;
    const swapped = swapItem(cart, 'l1', alt);
    const after = priceCartWithStock(swapped, stock, ctx);
    expect(after.needsAttention).toBe(0);
    expect(swapped.lines.map((l) => l.itemId)).toEqual(['seekh', 'chai']);
    // 38000 + 8000 = 46000, GST 1150 each, 48300. The full-cart price before the sold-out was 52500.
    expect(after.priced.total).toBe(48300);
    expect(after.priced.total - 52500).toBe(alt.priceDifference + Math.round(alt.priceDifference / 20));
  });

  it('swap changes the total correctly: choice swap', () => {
    const cart: Cart = {
      orderType: 'dine_in',
      lines: [line('l1', 'cold_coffee', 1, [pick('g_size', 'o_size_m'), pick('g_milk', 'o_oat')]), line('l2', 'chai')],
    };
    const stock = stockOf([], ['o_oat']);
    const before = priceCartWithStock(cart, stock, ctx);
    expect(before.priced.total).toBe(8400); // the coffee line is out of the total
    const alt = (before.results[0] as { alternatives: Parameters<typeof swapOption>[3][] }).alternatives[0]!;
    const swapped = swapOption(cart, 'l1', 'o_oat', alt);
    const after = priceCartWithStock(swapped, stock, ctx);
    expect(after.needsAttention).toBe(0);
    // Coffee 18000 + medium 3000 + almond 5000 = 26000, plus chai 8000 = 34000. GST 850 each. Total 35700.
    expect(after.priced.subtotal).toBe(34000);
    expect(after.priced.total).toBe(35700);
    // The other selection in the line is untouched.
    expect(swapped.lines[0]?.selections.find((s) => s.groupId === 'g_size')).toEqual(pick('g_size', 'o_size_m'));
  });

  it('remove is a one-line change; nothing else moves', () => {
    const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'chai')] };
    const next = removeLine(cart, 'l1');
    expect(next.lines.map((l) => l.lineId)).toEqual(['l2']);
    expect(cart.lines).toHaveLength(2);
  });

  it('takeaway carts use the takeaway price for struck-through and for swaps', () => {
    const cart: Cart = { orderType: 'takeaway', lines: [line('l1', 'galouti')] };
    const s = priceCartWithStock(cart, stockOf(['galouti']), ctx);
    expect(s.struckThrough[0]?.lineTotal).toBe(40000);
    expect((s.results[0] as { alternatives: { priceDifference: number }[] }).alternatives[0]?.priceDifference).toBe(-2000); // 38000 - 40000
  });
});

describe('soft hold for pay-first tabs (decision D21)', () => {
  const menu = makeMenu();
  const cart: Cart = { orderType: 'dine_in', lines: [line('l1', 'galouti'), line('l2', 'nihari', 1, [pick('g_bread', 'o_naan')])] };
  const T0 = 1_000_000;

  it('defaults to 5 minutes', () => {
    expect(DEFAULT_HOLD_MS).toBe(300_000);
    const r = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    expect(r.ok && r.hold.expiresAt - r.hold.startedAt).toBe(300_000);
  });

  it('a held line stays ok when stock changes during payment', () => {
    const started = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    if (!started.ok) throw new Error('expected a hold');
    const stock = stockOf(['galouti'], ['o_naan']);
    expect(checkStock(cart, stock, menu).map((r) => r.status)).toEqual(['ITEM_SOLD_OUT', 'OPTION_SOLD_OUT']);
    const held = checkStock(cart, stock, menu, { holds: [started.hold], now: T0 + 60_000 });
    expect(held.map((r) => r.status)).toEqual(['ok', 'ok']);
  });

  it('the hold ends at 5 minutes: after that the stock check applies again', () => {
    const started = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    if (!started.ok) throw new Error('expected a hold');
    const stock = stockOf(['galouti']);
    expect(isHoldActive(started.hold, T0 + 299_999)).toBe(true);
    expect(isHoldActive(started.hold, T0 + 300_000)).toBe(false);
    const late = checkStock(cart, stock, menu, { holds: [started.hold], now: T0 + 300_000 });
    expect(late[0]?.status).toBe('ITEM_SOLD_OUT');
    const [expired] = expireHolds([started.hold], T0 + 300_000);
    expect(expired).toMatchObject({ state: 'expired', releaseReason: 'timeout' });
  });

  it('release on failure frees the stock at once', () => {
    const started = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    if (!started.ok) throw new Error('expected a hold');
    const released = releaseHold(started.hold, 'payment_failed');
    expect(released).toMatchObject({ state: 'released' });
    expect(checkStock(cart, stockOf(['galouti']), menu, { holds: [released], now: T0 + 1000 })[0]?.status).toBe('ITEM_SOLD_OUT');
    expect(releaseHold(releaseHold(started.hold, 'sent'), 'timeout').state).toBe('consumed'); // terminal states stay put
  });

  it('is refused when a line already fails the stock check', () => {
    const r = holdForCart(cart, stockOf(['galouti']), menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.results[0]?.status).toBe('ITEM_SOLD_OUT');
  });

  it('a replay with the same idempotency key returns the first hold', () => {
    const first = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    if (!first.ok) throw new Error('expected a hold');
    const again = holdForCart(cart, noStock, menu, { id: 'h2', idempotencyKey: 'pay-key-0001', now: T0 + 5000 }, [first.hold]);
    expect(again.ok && again.hold.id).toBe('h1');
    expect(again.ok && again.replayed).toBe(true);
  });

  it('an edited line is not covered by the hold', () => {
    const started = holdForCart(cart, noStock, menu, { id: 'h1', idempotencyKey: 'pay-key-0001', now: T0 });
    if (!started.ok) throw new Error('expected a hold');
    const edited: Cart = { ...cart, lines: [line('l1', 'galouti'), line('l2', 'nihari', 1, [pick('g_bread', 'o_rumali')])] };
    const out = checkStock(edited, stockOf([], ['o_rumali']), menu, { holds: [started.hold], now: T0 + 1000 });
    expect(out[1]?.status).toBe('OPTION_SOLD_OUT');
  });
});
