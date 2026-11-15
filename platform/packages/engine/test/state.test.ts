import { describe, it, expect } from 'vitest';
import { QrError, ROUND_STATES, TAB_STATES, PAYMENT_STATES, type Preset, type Tab, type Round } from '@qr-first/contracts';
import {
  ROUND_TRANSITIONS,
  TAB_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  canTransitionRound,
  canTransitionTab,
  canTransitionPayment,
  openTab,
  joinOrOpenTab,
  newAggregate,
  createRound,
  sendRound,
  sendCoveredRounds,
  advanceRound,
  editDraftRound,
  discardDraftRound,
  voidRound,
  voidLine,
  createPayment,
  settlePayment,
  closeTab,
  voidTab,
  tabBalance,
  priceAggregate,
  invariantProblems,
  spotInvariantProblems,
  publishSnapshot,
  verifySnapshot,
  sha256Hex,
  type TabAggregate,
  type StaffActor,
} from '../src';
import { line, makeConfig, makeCtx, makeMenu, NOW, pick, STORE } from './fixtures';

const guest = { kind: 'guest_session' as const, id: 'sess_1' };
const cashier: StaffActor = { kind: 'staff', id: 'staff_asha', role: 'staff' };
const manager: StaffActor = { kind: 'staff', id: 'staff_ravi', role: 'manager' };

function setup(preset: Preset = 'table', cfg: Parameters<typeof makeConfig>[1] = {}, spotType: Tab['spotType'] = 'table') {
  const ctx = makeCtx({ config: makeConfig(preset, cfg) });
  const tab = openTab(
    [],
    { id: 'tab_1', storeId: STORE, spotId: spotType === 'table' ? 'table_12' : 'counter_1', spotType, orderType: 'dine_in', number: 7, openedBy: 'guest', openedAt: NOW },
    ctx,
  );
  return { ctx, agg: newAggregate(tab) };
}

const send = (agg: TabAggregate, ctx: ReturnType<typeof makeCtx>, id: string, lines = [line(`${id}_l1`, 'chai')], key = `key-${id}-0001`) =>
  createRound(agg, ctx, { id, lines, source: 'guest', idempotencyKey: key, actor: guest });

const code = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof QrError) return e.code;
    throw e;
  }
  return 'no error';
};

describe('state machine tables (docs/03 section 5)', () => {
  it('round: draft, sent, accepted, ready, served; void only from sent onward', () => {
    expect(ROUND_TRANSITIONS).toEqual({
      draft: ['sent'],
      sent: ['accepted', 'void'],
      accepted: ['ready', 'void'],
      ready: ['served', 'void'],
      served: ['void'],
      void: [],
    });
    const legal = new Set(Object.entries(ROUND_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}>${to}`)));
    for (const from of ROUND_STATES) for (const to of ROUND_STATES) expect(canTransitionRound(from, to), `${from}>${to}`).toBe(legal.has(`${from}>${to}`));
  });
  it('tab: open to closed or void, both terminal', () => {
    for (const from of TAB_STATES) for (const to of TAB_STATES) expect(canTransitionTab(from, to)).toBe(from === 'open' && to !== 'open');
    expect(TAB_TRANSITIONS.closed).toEqual([]);
  });
  it('payment: pending to succeeded or failed, succeeded to refunded', () => {
    expect(PAYMENT_TRANSITIONS.pending).toEqual(['succeeded', 'failed']);
    expect(canTransitionPayment('succeeded', 'refunded')).toBe(true);
    for (const to of PAYMENT_STATES) expect(canTransitionPayment('failed', to)).toBe(false);
  });
  it('rounds cannot skip steps or go backwards', () => {
    const { ctx, agg } = setup('table');
    const { aggregate, result } = send(agg, ctx, 'r1');
    expect(result.state).toBe('accepted');
    expect(code(() => advanceRound(aggregate, ctx, 'r1', 'served', cashier))).toBe('ROUND_TRANSITION_ILLEGAL');
    const ready = advanceRound(aggregate, ctx, 'r1', 'ready', cashier);
    const served = advanceRound(ready.aggregate, ctx, 'r1', 'served', cashier);
    expect(served.result.state).toBe('served');
    expect(code(() => advanceRound(served.aggregate, ctx, 'r1', 'ready', cashier))).toBe('ROUND_TRANSITION_ILLEGAL');
    expect(code(() => sendRound(served.aggregate, ctx, 'r1', cashier))).toBe('ROUND_TRANSITION_ILLEGAL');
  });
});

describe('invariant 1: one store only', () => {
  it('the engine refuses a tab, menu or item from another store', () => {
    const { ctx, agg } = setup('table');
    const otherMenu = { ...makeMenu(), storeId: 'other_store' };
    expect(code(() => send(agg, { ...ctx, menu: otherMenu }, 'r1'))).toBe('STORE_MISMATCH');
    expect(code(() => openTab([{ ...agg.tab, storeId: 'other_store' }], { id: 't2', storeId: STORE, spotId: 's', spotType: 'counter', orderType: 'dine_in', number: 1, openedBy: 'x', openedAt: NOW }, ctx))).toBe('STORE_MISMATCH');
  });
  it('invariantProblems finds a round, line or payment with a foreign store id', () => {
    const { ctx, agg } = setup('table');
    const { aggregate } = send(agg, ctx, 'r1');
    expect(invariantProblems(aggregate, ctx)).toEqual([]);
    const bad: TabAggregate = {
      ...aggregate,
      rounds: aggregate.rounds.map((r) => ({ ...r, storeId: 'intruder', lines: r.lines.map((l) => ({ ...l, storeId: 'intruder2' })) })),
      payments: [{ id: 'p', storeId: 'intruder3', tabId: 'tab_1', amount: 100, method: 'cash', state: 'succeeded', tip: 0, idempotencyKey: 'abcdefgh', takenBy: 'x' }],
    };
    const problems = invariantProblems(bad, ctx);
    expect(problems.filter((p) => p.startsWith('1:'))).toHaveLength(3);
  });
});

describe('invariant 2: a table spot has at most one open tab', () => {
  const ctx = makeCtx({ config: makeConfig('hybrid') });
  const input = (id: string, spotId: string, spotType: Tab['spotType']) => ({ id, storeId: STORE, spotId, spotType, orderType: 'dine_in' as const, number: 1, openedBy: 'guest', openedAt: NOW });

  it('refuses a second open tab on the same table', () => {
    const first = openTab([], input('t1', 'table_12', 'table'), ctx);
    expect(code(() => openTab([first], input('t2', 'table_12', 'table'), ctx))).toBe('SPOT_HAS_OPEN_TAB');
  });
  it('allows another table, and a new table tab once the first is closed', () => {
    const first = openTab([], input('t1', 'table_12', 'table'), ctx);
    expect(openTab([first], input('t2', 'table_13', 'table'), ctx).id).toBe('t2');
    expect(openTab([{ ...first, state: 'closed' }], input('t3', 'table_12', 'table'), ctx).id).toBe('t3');
  });
  it('counter and pickup spots open a new tab per guest session', () => {
    const a = openTab([], input('t1', 'counter_1', 'counter'), ctx);
    const b = openTab([a], input('t2', 'counter_1', 'counter'), ctx);
    expect([a.id, b.id]).toEqual(['t1', 't2']);
  });
  it('scanning a table joins the open tab', () => {
    const first = openTab([], input('t1', 'table_12', 'table'), ctx);
    const j = joinOrOpenTab([first], input('t9', 'table_12', 'table'), ctx);
    expect(j).toMatchObject({ joined: true, tab: { id: 't1' } });
    expect(joinOrOpenTab([first], input('t9', 'counter_1', 'counter'), ctx).joined).toBe(false);
  });
  it('spotInvariantProblems flags two open tabs on one table', () => {
    const t = openTab([], input('t1', 'table_12', 'table'), ctx);
    expect(spotInvariantProblems([t, { ...t, id: 't2' }])).toHaveLength(1);
    expect(spotInvariantProblems([t, { ...t, id: 't2', state: 'closed' }])).toEqual([]);
  });
  it('copies pay timing from the config for the order type, and refuses an order type the store does not offer', () => {
    const tableCfg = makeCtx({ config: makeConfig('table') });
    expect(openTab([], input('t1', 'table_1', 'table'), tableCfg).payTiming).toBe('at_end');
    expect(openTab([], input('t1', 'table_1', 'table'), ctx).payTiming).toBe('before_kitchen');
    expect(code(() => openTab([], { ...input('t1', 'table_1', 'table'), orderType: 'takeaway' }, tableCfg))).toBe('COMMAND_INVALID');
  });
});

describe('invariant 3: a tab balance is never negative', () => {
  it('refuses a payment larger than the balance', () => {
    const { ctx, agg } = setup('table');
    const { aggregate } = send(agg, ctx, 'r1'); // chai: 8400
    expect(tabBalance(aggregate, ctx)).toBe(8400);
    expect(code(() => createPayment(aggregate, ctx, { id: 'p1', amount: 8500, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }))).toBe('PAYMENT_EXCEEDS_BALANCE');
  });
  it('refuses a succeeded payment that would overpay when another one landed first', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1').aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', actor: guest }).aggregate;
    a = createPayment(a, ctx, { id: 'p2', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0002', actor: guest }).aggregate; // both pending, balance still 8400
    a = settlePayment(a, ctx, 'p1', 'succeeded', { kind: 'system' }).aggregate;
    expect(code(() => settlePayment(a, ctx, 'p2', 'succeeded', { kind: 'system' }))).toBe('PAYMENT_EXCEEDS_BALANCE');
    expect(invariantProblems(a, ctx)).toEqual([]);
  });
  it('refuses a void that would leave the tab overpaid', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1').aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    expect(code(() => voidRound(a, ctx, 'r1', manager, 'Guest left'))).toBe('VOID_WOULD_OVERPAY');
    // After the refund the void is allowed.
    a = settlePayment(a, ctx, 'p1', 'refunded', manager).aggregate;
    expect(voidRound(a, ctx, 'r1', manager, 'Guest left').result.state).toBe('void');
  });
  it('invariantProblems reports a negative balance', () => {
    const { ctx, agg } = setup('table');
    const a = send(agg, ctx, 'r1').aggregate;
    const bad = { ...a, payments: [{ id: 'p', storeId: STORE, tabId: 'tab_1', amount: 9999, method: 'cash', state: 'succeeded' as const, tip: 0, idempotencyKey: 'abcdefgh', takenBy: 'x' }] };
    expect(invariantProblems(bad, ctx).some((p) => p.startsWith('3:'))).toBe(true);
  });
  it('a tab closes only at a zero balance', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1').aggregate;
    expect(code(() => closeTab(a, ctx, cashier))).toBe('TAB_BALANCE_DUE');
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    const closed = closeTab(a, ctx, cashier);
    expect(closed.result).toMatchObject({ state: 'closed', closedAt: NOW });
    expect(code(() => closeTab(closed.aggregate, ctx, cashier))).toBe('TAB_NOT_OPEN');
    expect(code(() => send(closed.aggregate, ctx, 'r2'))).toBe('TAB_NOT_OPEN');
  });
});

describe('invariant 4: a round in sent or later is immutable', () => {
  it('a draft can be edited or discarded, a sent round cannot', () => {
    const { ctx, agg } = setup('counter', {}, 'counter'); // before_kitchen, so the round stays draft
    const { aggregate } = send(agg, ctx, 'r1');
    expect(aggregate.rounds[0]?.state).toBe('draft');
    const edited = editDraftRound(aggregate, ctx, 'r1', [line('r1_l1', 'chai', 3)]);
    expect(edited.rounds[0]?.lines[0]?.qty).toBe(3);
    expect(discardDraftRound(edited, 'r1').rounds).toHaveLength(0);

    let a = createPayment(aggregate, ctx, { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: guest }).aggregate;
    a = sendRound(a, ctx, 'r1', guest).aggregate;
    expect(code(() => editDraftRound(a, ctx, 'r1', [line('r1_l1', 'chai', 9)]))).toBe('ROUND_IMMUTABLE');
    expect(code(() => discardDraftRound(a, 'r1'))).toBe('ROUND_IMMUTABLE');
  });
  it('the price and name on a sent line do not follow later menu changes', () => {
    const { ctx, agg } = setup('table');
    const a = send(agg, ctx, 'r1').aggregate;
    const changed = makeMenu();
    changed.items.chai = { ...changed.items.chai!, basePrice: 99999, name: 'Renamed' };
    expect(priceAggregate(a, { ...ctx, menu: changed }).total).toBe(8400);
  });
  it('a void is staff only, needs a reason, and keeps the record', () => {
    const { ctx, agg } = setup('table');
    const a = send(agg, ctx, 'r1', [line('l1', 'chai'), line('l2', 'galouti')]).aggregate;
    expect(code(() => voidRound(a, ctx, 'r1', guest, 'changed my mind'))).toBe('VOID_ROLE_FORBIDDEN');
    expect(code(() => voidRound(a, ctx, 'r1', cashier, '   '))).toBe('VOID_REASON_REQUIRED');
    const vl = voidLine(a, ctx, 'r1', 'l2', cashier, 'Kitchen ran out');
    expect(vl.aggregate.rounds[0]?.lines[1]).toMatchObject({ voided: true, voidReason: 'Kitchen ran out', qty: 1, itemId: 'galouti' });
    expect(vl.aggregate.rounds[0]?.state).toBe('accepted');
    expect(vl.events[0]).toMatchObject({ type: 'round.voided', actor: { kind: 'staff', id: 'staff_asha' }, payload: { reason: 'Kitchen ran out', lineId: 'l2' } });
    expect(priceAggregate(vl.aggregate, ctx).total).toBe(8400);
    const vr = voidRound(vl.aggregate, ctx, 'r1', manager, 'Tab cancelled');
    expect(vr.result).toMatchObject({ state: 'void', voidReason: 'Tab cancelled', voidedBy: 'staff_ravi' });
    expect(vr.events[0]?.type).toBe('round.voided');
    expect(code(() => voidRound(vr.aggregate, ctx, 'r1', manager, 'again'))).toBe('ROUND_TRANSITION_ILLEGAL');
    expect(priceAggregate(vr.aggregate, ctx).total).toBe(0);
  });
  it('a draft round cannot be voided; it is discarded', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    const { aggregate } = send(agg, ctx, 'r1');
    expect(code(() => voidRound(aggregate, ctx, 'r1', manager, 'x'))).toBe('ROUND_TRANSITION_ILLEGAL');
  });
  it('voiding a tab voids its rounds and needs refunds first', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1').aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 1000, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    expect(code(() => voidTab(a, ctx, manager, 'Walkout'))).toBe('VOID_WOULD_OVERPAY');
    a = settlePayment(a, ctx, 'p1', 'refunded', manager).aggregate;
    const v = voidTab(a, ctx, manager, 'Walkout');
    expect(v.result.state).toBe('void');
    expect(v.aggregate.rounds.every((r) => r.state === 'void')).toBe(true);
    expect(code(() => voidTab(agg, ctx, guest, 'x'))).toBe('VOID_ROLE_FORBIDDEN');
  });
});

describe('invariant 5: before_kitchen rounds are sent only after a covering payment', () => {
  const lines = [line('l1', 'chai')]; // total 8400
  it('a draft round is not sent without payment', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    const { aggregate } = send(agg, ctx, 'r1', lines);
    expect(aggregate.tab.payTiming).toBe('before_kitchen');
    expect(code(() => sendRound(aggregate, ctx, 'r1', guest))).toBe('ROUND_NOT_COVERED');
  });
  it('a pending or partial payment does not cover it', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    let a = send(agg, ctx, 'r1', lines).aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', actor: guest }).aggregate; // pending
    expect(code(() => sendRound(a, ctx, 'r1', guest))).toBe('ROUND_NOT_COVERED');
    const b = createPayment(send(agg, ctx, 'r1', lines).aggregate, ctx, { id: 'p2', amount: 5000, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0002', state: 'succeeded', actor: cashier }).aggregate;
    expect(code(() => sendRound(b, ctx, 'r1', guest))).toBe('ROUND_NOT_COVERED');
  });
  it('a succeeded payment covers it; the webhook moves it to sent and, with auto-accept, accepted', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    let a = send(agg, ctx, 'r1', lines).aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', actor: guest }).aggregate;
    a = settlePayment(a, ctx, 'p1', 'succeeded', { kind: 'system' }).aggregate;
    const t = sendRound(a, ctx, 'r1', { kind: 'system' });
    expect(t.result).toMatchObject({ state: 'accepted', sentAt: NOW });
    expect(t.events.map((e) => e.type)).toEqual(['round.sent', 'round.accepted']);
    expect(invariantProblems(t.aggregate, ctx)).toEqual([]);
  });
  it('without auto-accept the round waits at sent for staff', () => {
    const { ctx, agg } = setup('counter', { features: { autoAccept: false } }, 'counter');
    let a = send(agg, ctx, 'r1', lines).aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    const sent = sendRound(a, ctx, 'r1', cashier);
    expect(sent.result.state).toBe('sent');
    expect(advanceRound(sent.aggregate, ctx, 'r1', 'accepted', cashier).result.state).toBe('accepted');
  });
  it('a second round needs its own cover; sendCoveredRounds sends in order as money arrives', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    let a = send(agg, ctx, 'r1', lines).aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    a = sendCoveredRounds(a, ctx, cashier).aggregate;
    a = send(a, ctx, 'r2', [line('l2', 'galouti')], 'key-r2-0001').aggregate;
    expect(sendCoveredRounds(a, ctx, cashier).result).toEqual([]); // nothing new is covered
    expect(code(() => sendRound(a, ctx, 'r2', cashier))).toBe('ROUND_NOT_COVERED');
    a = createPayment(a, ctx, { id: 'p2', amount: 44100, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0002', state: 'succeeded', actor: cashier }).aggregate;
    const out = sendCoveredRounds(a, ctx, cashier);
    expect(out.result.map((r) => r.id)).toEqual(['r2']);
    expect(invariantProblems(out.aggregate, ctx)).toEqual([]);
  });
  it('invariantProblems reports a before_kitchen round that was sent unpaid', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    const a = send(agg, ctx, 'r1', lines).aggregate;
    const forced: TabAggregate = { ...a, rounds: a.rounds.map((r): Round => ({ ...r, state: 'sent' })) };
    expect(invariantProblems(forced, ctx).some((p) => p.startsWith('5:'))).toBe(true);
  });
  it('pay later: an at_end round is sent at once with no payment', () => {
    const { ctx, agg } = setup('table');
    const t = send(agg, ctx, 'r1');
    expect(t.result.state).toBe('accepted');
    expect(t.events.map((e) => e.type)).toEqual(['round.created', 'round.sent', 'round.accepted']);
  });
  it('a pay-first round whose stock ran out before sending is refused unless a hold covers it', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    let a = send(agg, ctx, 'r1', [line('l1', 'galouti')]).aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 44100, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: cashier }).aggregate;
    const stock = { soldOutItemIds: ['galouti'], soldOutOptionIds: [] };
    expect(code(() => sendRound(a, ctx, 'r1', cashier, { stock }))).toBe('ITEM_SOLD_OUT');
    const hold = { id: 'h', idempotencyKey: 'pay-key-0001', startedAt: 0, expiresAt: 300_000, state: 'active' as const, lines: [{ lineId: 'l1', signature: 'galouti|' }] };
    expect(sendRound(a, ctx, 'r1', cashier, { stock, holds: [hold], nowMs: 1000 }).result.state).toBe('accepted');
    expect(code(() => sendRound(a, ctx, 'r1', cashier, { stock, holds: [hold], nowMs: 300_001 }))).toBe('ITEM_SOLD_OUT');
  });
});

describe('invariant 6: the same idempotency key produces one round or one payment', () => {
  it('a replayed round request returns the first round and adds nothing', () => {
    const { ctx, agg } = setup('table');
    const first = send(agg, ctx, 'r1', [line('l1', 'chai')], 'client-key-0001');
    const again = createRound(first.aggregate, ctx, { id: 'r-other-id', lines: [line('l1', 'chai')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest });
    expect(again.replayed).toBe(true);
    expect(again.events).toEqual([]);
    expect(again.result.id).toBe('r1');
    expect(again.aggregate.rounds).toHaveLength(1);
    expect(again.aggregate).toBe(first.aggregate);
  });
  it('a replay after the round moved on still returns that round, in its current state', () => {
    const { ctx, agg } = setup('table');
    const first = send(agg, ctx, 'r1', [line('l1', 'chai')], 'client-key-0001');
    const ready = advanceRound(first.aggregate, ctx, 'r1', 'ready', cashier).aggregate;
    const again = createRound(ready, ctx, { id: 'x', lines: [line('l1', 'chai')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest });
    expect(again.result.state).toBe('ready');
  });
  it('the same key for a different request is an error, not a second round', () => {
    const { ctx, agg } = setup('table');
    const first = send(agg, ctx, 'r1', [line('l1', 'chai')], 'client-key-0001');
    expect(code(() => createRound(first.aggregate, ctx, { id: 'r2', lines: [line('l9', 'galouti')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest }))).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('a double-submitted payment is taken once', () => {
    const { ctx, agg } = setup('table');
    const a = send(agg, ctx, 'r1').aggregate;
    const input = { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', actor: guest } as const;
    const one = createPayment(a, ctx, input);
    const two = createPayment(one.aggregate, ctx, { ...input, id: 'p-second' });
    expect(two.replayed).toBe(true);
    expect(two.aggregate.payments).toHaveLength(1);
    expect(two.result.id).toBe('p1');
    expect(code(() => createPayment(one.aggregate, ctx, { ...input, amount: 100 }))).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('a webhook replay of the same outcome changes nothing', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1').aggregate;
    a = createPayment(a, ctx, { id: 'p1', amount: 8400, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', actor: guest }).aggregate;
    const s1 = settlePayment(a, ctx, 'p1', 'succeeded', { kind: 'system' });
    const s2 = settlePayment(s1.aggregate, ctx, 'p1', 'succeeded', { kind: 'system' });
    expect(s2.replayed).toBe(true);
    expect(s2.events).toEqual([]);
    expect(code(() => settlePayment(s1.aggregate, ctx, 'p1', 'failed', { kind: 'system' }))).toBe('ROUND_TRANSITION_ILLEGAL');
  });
  it('invariantProblems reports two rounds that share a key', () => {
    const { ctx, agg } = setup('table');
    let a = send(agg, ctx, 'r1', [line('l1', 'chai')], 'client-key-0001').aggregate;
    a = send(a, ctx, 'r2', [line('l2', 'chai')], 'client-key-0002').aggregate;
    const dup = { ...a, rounds: a.rounds.map((r) => ({ ...r, idempotencyKey: 'client-key-0001' })) };
    expect(invariantProblems(dup, ctx).some((p) => p.startsWith('6:'))).toBe(true);
  });
});

describe('invariant 7: option rules are enforced before a line is accepted', () => {
  it('createRound refuses a line below min and saves nothing', () => {
    const { ctx, agg } = setup('table');
    try {
      createRound(agg, ctx, { id: 'r1', lines: [line('l1', 'butter_chicken')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest });
      expect.unreachable();
    } catch (e) {
      expect((e as QrError).code).toBe('OPTION_MIN_NOT_MET');
      expect((e as QrError).details?.lines).toMatchObject([{ lineId: 'l1' }]);
    }
    expect(agg.rounds).toHaveLength(0);
  });
  it('createRound refuses a line above max and an unknown choice', () => {
    const { ctx, agg } = setup('table');
    const mk = (l: ReturnType<typeof line>) => () => createRound(agg, ctx, { id: 'r1', lines: [l], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest });
    expect(code(mk(line('l1', 'butter_chicken', 1, [pick('g_portion', 'o_half', 'o_full')])))).toBe('OPTION_MAX_EXCEEDED');
    expect(code(mk(line('l1', 'butter_chicken', 1, [pick('g_portion', 'o_ghost')])))).toBe('OPTION_UNKNOWN');
  });
  it('editDraftRound validates too', () => {
    const { ctx, agg } = setup('counter', {}, 'counter');
    const { aggregate } = send(agg, ctx, 'r1');
    expect(code(() => editDraftRound(aggregate, ctx, 'r1', [line('l1', 'butter_chicken')]))).toBe('OPTION_MIN_NOT_MET');
  });
  it('stock failures come back per line and nothing is sent or charged', () => {
    const { ctx, agg } = setup('table');
    try {
      createRound(agg, ctx, { id: 'r1', lines: [line('l1', 'galouti'), line('l2', 'chai')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest }, { stock: { soldOutItemIds: ['galouti'], soldOutOptionIds: [] } });
      expect.unreachable();
    } catch (e) {
      expect((e as QrError).code).toBe('ITEM_SOLD_OUT');
      expect((e as QrError).details?.results).toMatchObject([{ lineId: 'l1', status: 'ITEM_SOLD_OUT' }, { lineId: 'l2', status: 'ok' }]);
    }
  });
  it('line ids are unique on a tab', () => {
    const { ctx, agg } = setup('table');
    const a = send(agg, ctx, 'r1', [line('l1', 'chai')]).aggregate;
    expect(code(() => send(a, ctx, 'r2', [line('l1', 'chai')], 'client-key-0002'))).toBe('COMMAND_INVALID');
  });
});

describe('invariant 8: a published menu snapshot never changes', () => {
  const ctx = makeCtx();
  it('every publish gets a new id, even with the same content, and content is stored under its hash', () => {
    const s1 = publishSnapshot(ctx.menu, ctx.config, []);
    const s2 = publishSnapshot(ctx.menu, ctx.config, [s1]);
    expect(s1.id).not.toBe(s2.id);
    expect(s1.seq).toBe(1);
    expect(s2.seq).toBe(2);
    expect(s2.contentHash).toBe(s1.contentHash);
    const changedMenu = makeMenu();
    changedMenu.items.chai = { ...changedMenu.items.chai!, basePrice: 9000 };
    const s3 = publishSnapshot(changedMenu, ctx.config, [s1, s2]);
    expect(s3.contentHash).not.toBe(s1.contentHash);
  });
  it('is deeply frozen, and later edits to the live menu do not reach it', () => {
    const menu = makeMenu();
    const snap = publishSnapshot(menu, ctx.config, []);
    menu.items.chai!.basePrice = 1;
    expect(snap.content.menu.items.chai?.basePrice).toBe(8000);
    expect(() => {
      (snap.content.menu.items.chai as { basePrice: number }).basePrice = 1;
    }).toThrow(TypeError);
    expect(() => {
      (snap.content.config.features as { ordering: boolean }).ordering = false;
    }).toThrow(TypeError);
    expect(verifySnapshot(snap)).toBe(true);
  });
  it('keeps store-side fields out of the guest snapshot', () => {
    const snap = publishSnapshot(ctx.menu, ctx.config, []);
    expect(snap.content.config.settings).not.toHaveProperty('payoutAccount');
    expect(snap.content.config.settings).not.toHaveProperty('receiptContact');
  });
  it('sha256 matches the standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});

describe('ordering feature and a full table visit', () => {
  it('a guest cannot order when the ordering feature is off, staff can', () => {
    const { ctx, agg } = setup('table', { features: { ordering: false } });
    expect(code(() => send(agg, ctx, 'r1'))).toBe('ORDERING_OFF');
    const staffRound = createRound(agg, ctx, { id: 'r1', lines: [line('l1', 'chai')], source: 'staff', idempotencyKey: 'client-key-0001', actor: cashier });
    expect(staffRound.result.source).toBe('staff');
  });
  it('table style: guest and staff rounds, split payment, close at zero, every step has an event', () => {
    const { ctx, agg } = setup('table');
    const events: string[] = [];
    let a = agg;
    const r1 = createRound(a, ctx, { id: 'r1', lines: [line('l1', 'galouti'), line('l2', 'chai')], source: 'guest', idempotencyKey: 'client-key-0001', actor: guest });
    a = r1.aggregate;
    events.push(...r1.events.map((e) => e.type));
    const r2 = createRound(a, ctx, { id: 'r2', lines: [line('l3', 'naan', 2)], source: 'staff', idempotencyKey: 'client-key-0002', actor: cashier });
    a = r2.aggregate;
    // 50000 + 12000 = 62000, GST 1550 each, 65100.
    expect(priceAggregate(a, ctx).total).toBe(65100);
    a = createPayment(a, ctx, { id: 'p1', amount: 30000, method: 'upi', takenBy: 'guest', idempotencyKey: 'pay-key-0001', state: 'succeeded', actor: guest }).aggregate;
    expect(tabBalance(a, ctx)).toBe(35100);
    a = createPayment(a, ctx, { id: 'p2', amount: 35100, method: 'cash', takenBy: 'staff_asha', idempotencyKey: 'pay-key-0002', state: 'succeeded', actor: cashier }).aggregate;
    expect(tabBalance(a, ctx)).toBe(0);
    for (const id of ['r1', 'r2']) {
      a = advanceRound(a, ctx, id, 'ready', cashier).aggregate;
      a = advanceRound(a, ctx, id, 'served', cashier).aggregate;
    }
    const closed = closeTab(a, ctx, cashier);
    expect(closed.aggregate.tab.state).toBe('closed');
    expect(invariantProblems(closed.aggregate, ctx)).toEqual([]);
    expect(events).toEqual(['round.created', 'round.sent', 'round.accepted']);
    for (const e of [...r1.events, ...r2.events, ...closed.events]) {
      expect(e).toMatchObject({ storeId: STORE, at: NOW });
    }
  });
  it('tab discounts, tip and the waived service charge flow into the balance', () => {
    const { ctx, agg } = setup('table', { serviceCharge: 10 });
    let a = send(agg, ctx, 'r1', [line('l1', 'galouti')]).aggregate;
    expect(priceAggregate(a, ctx).serviceCharge).toBe(4200);
    a = { ...a, tab: { ...a.tab, serviceChargeWaived: true, tip: { kind: 'amount', paise: 1000 } } };
    expect(tabBalance(a, ctx)).toBe(45100); // 44100 plus a 1000 tip
  });
});
