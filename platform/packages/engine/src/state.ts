import {
  QrError,
  makeEvent,
  type Actor,
  type CartLine,
  type EventEnvelope,
  type EventType,
  type Line,
  type Payment,
  type PaymentState,
  type PricedTab,
  type Role,
  type Round,
  type RoundState,
  type StockState,
  type Tab,
  type TabState,
} from '@qr-first/contracts';
import type { EngineContext } from './context';
import { checkStock, type Cart } from './stock';
import type { StockHold } from './hold';
import { EMPTY_LEDGER, lookupKey, recordKey, type Ledger } from './idempotency';
import { priceTab, snapshotLine, type PriceLineInput } from './pricing';
import { validateLine } from './validate-line';

/* -------------------------------------------------------------------------- */
/* State machines (docs/03 section 5)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Round: draft, sent, accepted, ready, served. Void is reachable from every sent state and is
 * staff only with a reason (the diagram in docs/03 draws it under `sent`, see NOTES.md).
 */
export const ROUND_TRANSITIONS: Readonly<Record<RoundState, readonly RoundState[]>> = {
  draft: ['sent'],
  sent: ['accepted', 'void'],
  accepted: ['ready', 'void'],
  ready: ['served', 'void'],
  served: ['void'],
  void: [],
};

export const TAB_TRANSITIONS: Readonly<Record<TabState, readonly TabState[]>> = {
  open: ['closed', 'void'],
  closed: [],
  void: [],
};

export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  pending: ['succeeded', 'failed'],
  succeeded: ['refunded'],
  failed: [],
  refunded: [],
};

export const canTransitionRound = (from: RoundState, to: RoundState) => ROUND_TRANSITIONS[from].includes(to);
export const canTransitionTab = (from: TabState, to: TabState) => TAB_TRANSITIONS[from].includes(to);
export const canTransitionPayment = (from: PaymentState, to: PaymentState) => PAYMENT_TRANSITIONS[from].includes(to);

/** Rounds that count towards the bill. Drafts count only when asked (a pay-first round being paid). */
const BILLED: readonly RoundState[] = ['sent', 'accepted', 'ready', 'served'];

/* -------------------------------------------------------------------------- */
/* Aggregate                                                                   */
/* -------------------------------------------------------------------------- */

export interface TabAggregate {
  tab: Tab;
  rounds: Round[];
  payments: Payment[];
  ledger: Ledger;
}

export interface Transition<R = undefined> {
  aggregate: TabAggregate;
  events: EventEnvelope[];
  result: R;
  /** True when an idempotency key matched and nothing changed. */
  replayed: boolean;
}

export interface StaffActor {
  kind: 'staff';
  id: string;
  role: Role;
}
export type TransitionActor = StaffActor | { kind: 'guest_session'; id: string } | { kind: 'system' };

const toActor = (a: TransitionActor): Actor => (a.kind === 'staff' ? { kind: 'staff', id: a.id } : a);

function ev(agg: TabAggregate, ctx: EngineContext, type: EventType, entityId: string, actor: TransitionActor, payload: Record<string, unknown> = {}): EventEnvelope {
  return makeEvent({
    id: `${agg.tab.storeId}:${type}:${entityId}`,
    storeId: agg.tab.storeId,
    type,
    actor: toActor(actor),
    at: ctx.now,
    payload: { tabId: agg.tab.id, ...payload },
  });
}

function ensureStore(agg: TabAggregate, ctx: EngineContext): void {
  if (agg.tab.storeId !== ctx.menu.storeId) {
    throw new QrError('STORE_MISMATCH', 'The tab belongs to a different store than the menu.', { tabId: agg.tab.id });
  }
}

/* -------------------------------------------------------------------------- */
/* Opening a tab (invariant 2)                                                 */
/* -------------------------------------------------------------------------- */

export interface OpenTabInput {
  id: string;
  storeId: string;
  spotId: string;
  spotType: Tab['spotType'];
  orderType: Tab['orderType'];
  /** Short daily counter for the store. Automatic. */
  number: number;
  openedBy: string;
  openedAt: string;
  partySize?: number;
  guestId?: string;
}

/**
 * Open a tab. `payTiming` is copied from the config for the order type and is the only
 * difference between pay first and pay later. A table spot holds at most one open tab
 * (invariant 2): use `joinOrOpenTab` to rejoin it.
 */
export function openTab(openTabs: readonly Tab[], input: OpenTabInput, ctx: Pick<EngineContext, 'config'>): Tab {
  const { settings } = ctx.config;
  const payTiming = settings.payTiming[input.orderType];
  if (!settings.orderTypes.includes(input.orderType) || !payTiming) {
    throw new QrError('COMMAND_INVALID', `This store does not offer ${input.orderType}.`, { orderType: input.orderType });
  }
  for (const t of openTabs) {
    if (t.storeId !== input.storeId) throw new QrError('STORE_MISMATCH', 'Open tabs from another store were passed in.', { tabId: t.id });
  }
  if (input.spotType === 'table' && openTabs.some((t) => t.state === 'open' && t.spotId === input.spotId)) {
    throw new QrError('SPOT_HAS_OPEN_TAB', 'This table already has an open tab.', { spotId: input.spotId });
  }
  return {
    id: input.id,
    storeId: input.storeId,
    spotId: input.spotId,
    spotType: input.spotType,
    orderType: input.orderType,
    payTiming,
    state: 'open',
    number: input.number,
    ...(input.partySize !== undefined ? { partySize: input.partySize } : {}),
    ...(input.guestId !== undefined ? { guestId: input.guestId } : {}),
    openedBy: input.openedBy,
    openedAt: input.openedAt,
    discounts: [],
    serviceChargeWaived: false,
  };
}

/** Scanning a table joins its open tab. Counter and pickup spots open a new tab per guest session. */
export function joinOrOpenTab(openTabs: readonly Tab[], input: OpenTabInput, ctx: Pick<EngineContext, 'config'>): { tab: Tab; joined: boolean } {
  if (input.spotType === 'table') {
    const existing = openTabs.find((t) => t.state === 'open' && t.spotId === input.spotId && t.storeId === input.storeId);
    if (existing) return { tab: existing, joined: true };
  }
  return { tab: openTab(openTabs, input, ctx), joined: false };
}

export const newAggregate = (tab: Tab): TabAggregate => ({ tab, rounds: [], payments: [], ledger: EMPTY_LEDGER });

/* -------------------------------------------------------------------------- */
/* Pricing the aggregate                                                       */
/* -------------------------------------------------------------------------- */

function billedLines(agg: TabAggregate, includeDrafts: boolean, only?: string): PriceLineInput[] {
  return agg.rounds
    .filter((r) => BILLED.includes(r.state) || (includeDrafts && r.state === 'draft') || r.id === only)
    .flatMap((r) => r.lines.map((l): PriceLineInput => ({ ...l, voided: l.voided })));
}

/** `priceTab` over the tab's non-void lines. Drafts are left out unless `includeDrafts`. */
export function priceAggregate(agg: TabAggregate, ctx: EngineContext, opts: { includeDrafts?: boolean; includeRoundId?: string } = {}): PricedTab {
  ensureStore(agg, ctx);
  return priceTab(
    {
      orderType: agg.tab.orderType,
      lines: billedLines(agg, opts.includeDrafts ?? false, opts.includeRoundId),
      discounts: agg.tab.discounts,
      tip: agg.tab.tip,
      serviceChargeWaived: agg.tab.serviceChargeWaived,
    },
    ctx,
  );
}

export const paidTotal = (agg: TabAggregate): number =>
  agg.payments.filter((p) => p.state === 'succeeded').reduce((a, p) => a + p.amount, 0);

/** Balance = non-void lines plus charges, minus succeeded payments (docs/03 section 5). */
export function tabBalance(agg: TabAggregate, ctx: EngineContext, opts: { includeDrafts?: boolean; includeRoundId?: string } = {}): number {
  return priceAggregate(agg, ctx, opts).total - paidTotal(agg);
}

/* -------------------------------------------------------------------------- */
/* Rounds                                                                      */
/* -------------------------------------------------------------------------- */

export interface CreateRoundInput {
  id: string;
  lines: readonly CartLine[];
  source: Round['source'];
  idempotencyKey: string;
  actor: TransitionActor;
}

export interface StockOptions {
  stock?: StockState;
  holds?: readonly StockHold[];
  /** Epoch milliseconds, for judging holds. */
  nowMs?: number;
}

function assertStock(cart: Cart, ctx: EngineContext, o: StockOptions): void {
  if (!o.stock) return;
  const results = checkStock(cart, o.stock, ctx.menu, {
    ...(o.holds ? { holds: o.holds } : {}),
    ...(o.nowMs !== undefined ? { now: o.nowMs } : {}),
  });
  const bad = results.find((r) => r.status !== 'ok');
  if (bad) {
    throw new QrError(bad.status, 'A line has a stock problem. Nothing was sent or charged.', { results });
  }
}

/**
 * Create a round on the tab. The server checks every line and choice (invariant 7) and stock
 * before anything is saved, copies the name and price onto each line, and uses the idempotency
 * key (invariant 6).
 *
 * - `at_end`: the round is sent at once (and accepted at once when `autoAccept` is on).
 * - `before_kitchen`: the round stays `draft` until a succeeded payment covers it, see `sendRound`.
 * - A guest cannot create a round when the `ordering` feature is off.
 */
export function createRound(agg: TabAggregate, ctx: EngineContext, input: CreateRoundInput, stockOptions: StockOptions = {}): Transition<Round> {
  const { tab } = agg;
  ensureStore(agg, ctx);
  const request = { tabId: tab.id, lines: input.lines, source: input.source };
  const hit = lookupKey(agg.ledger, 'round', input.idempotencyKey, request);
  if (hit.replay) {
    const round = agg.rounds.find((r) => r.id === hit.resultId);
    if (!round) throw new QrError('IDEMPOTENCY_KEY_REUSED', 'The first result for this key is missing.', { key: input.idempotencyKey });
    return { aggregate: agg, events: [], result: round, replayed: true };
  }
  if (tab.state !== 'open') throw new QrError('TAB_NOT_OPEN', undefined, { tabId: tab.id });
  if (input.source === 'guest' && !ctx.config.features.ordering) throw new QrError('ORDERING_OFF');
  if (input.lines.length === 0) throw new QrError('COMMAND_INVALID', 'A round needs at least one line.');
  const existingLineIds = new Set(agg.rounds.flatMap((r) => r.lines.map((l) => l.lineId)));
  const newIds = new Set<string>();
  for (const l of input.lines) {
    if (existingLineIds.has(l.lineId) || newIds.has(l.lineId)) {
      throw new QrError('COMMAND_INVALID', 'Line ids must be unique on a tab.', { lineId: l.lineId });
    }
    newIds.add(l.lineId);
  }

  const problems = input.lines
    .map((l) => ({ lineId: l.lineId, ...validateLine(ctx.menu, l) }))
    .filter((r) => !r.ok);
  if (problems.length > 0) {
    const first = problems[0]!.issues[0]!;
    throw new QrError(first.code, 'A line does not satisfy the item rules.', {
      lines: problems.map((p) => ({ lineId: p.lineId, issues: p.issues })),
    });
  }
  assertStock({ orderType: tab.orderType, lines: input.lines }, ctx, stockOptions);

  const lines: Line[] = input.lines.map((l) => ({
    ...l,
    storeId: tab.storeId,
    snapshot: snapshotLine(ctx.menu, l, tab.orderType),
    voided: false,
  }));
  const round: Round = {
    id: input.id,
    storeId: tab.storeId,
    tabId: tab.id,
    state: 'draft',
    lines,
    source: input.source,
    idempotencyKey: input.idempotencyKey,
  };
  let next: TabAggregate = {
    ...agg,
    rounds: [...agg.rounds, round],
    ledger: recordKey(agg.ledger, 'round', input.idempotencyKey, request, round.id),
  };
  const events = [ev(next, ctx, 'round.created', round.id, input.actor, { roundId: round.id })];

  if (tab.payTiming === 'at_end') {
    const sent = sendRound(next, ctx, round.id, input.actor, {});
    next = sent.aggregate;
    events.push(...sent.events);
  }
  return { aggregate: next, events, result: next.rounds.find((r) => r.id === round.id)!, replayed: false };
}

function replaceRound(agg: TabAggregate, round: Round): TabAggregate {
  return { ...agg, rounds: agg.rounds.map((r) => (r.id === round.id ? round : r)) };
}

function getRound(agg: TabAggregate, roundId: string): Round {
  const r = agg.rounds.find((x) => x.id === roundId);
  if (!r) throw new QrError('COMMAND_INVALID', 'Unknown round.', { roundId });
  return r;
}

/** Cart edits are allowed on a draft only. A sent round is immutable (invariant 4). */
export function editDraftRound(agg: TabAggregate, ctx: EngineContext, roundId: string, lines: readonly CartLine[]): TabAggregate {
  const round = getRound(agg, roundId);
  if (round.state !== 'draft') {
    throw new QrError('ROUND_IMMUTABLE', 'A round that has been sent cannot be changed. Add a new round or void it.', { roundId, state: round.state });
  }
  for (const l of lines) {
    const v = validateLine(ctx.menu, l);
    if (!v.ok) throw new QrError(v.issues[0]!.code, undefined, { lineId: l.lineId, issues: v.issues });
  }
  const edited: Round = {
    ...round,
    lines: lines.map((l) => ({
      ...l,
      storeId: agg.tab.storeId,
      snapshot: snapshotLine(ctx.menu, l, agg.tab.orderType),
      voided: false,
    })),
  };
  return replaceRound(agg, edited);
}

/** Throw away an unpaid, unsent draft. A sent round can only be voided. */
export function discardDraftRound(agg: TabAggregate, roundId: string): TabAggregate {
  const round = getRound(agg, roundId);
  if (round.state !== 'draft') throw new QrError('ROUND_IMMUTABLE', 'Only a draft can be discarded.', { roundId, state: round.state });
  return { ...agg, rounds: agg.rounds.filter((r) => r.id !== roundId) };
}

/** What the succeeded payments must cover before this round may be sent. */
function coveringTotal(agg: TabAggregate, ctx: EngineContext, roundId: string): number {
  return priceAggregate(agg, ctx, { includeRoundId: roundId }).total;
}

/**
 * Move a draft round to `sent` (invariant 5). On a `before_kitchen` tab it needs succeeded
 * payments that cover the tab including this round, and stock is checked again with any hold
 * honoured. With `autoAccept` on, the round is accepted in the same step.
 */
export function sendRound(agg: TabAggregate, ctx: EngineContext, roundId: string, actor: TransitionActor, stockOptions: StockOptions = {}): Transition<Round> {
  ensureStore(agg, ctx);
  const round = getRound(agg, roundId);
  if (!canTransitionRound(round.state, 'sent')) {
    throw new QrError('ROUND_TRANSITION_ILLEGAL', `A ${round.state} round cannot be sent.`, { roundId, from: round.state, to: 'sent' });
  }
  if (agg.tab.state !== 'open') throw new QrError('TAB_NOT_OPEN', undefined, { tabId: agg.tab.id });
  if (agg.tab.payTiming === 'before_kitchen') {
    const need = coveringTotal(agg, ctx, roundId);
    const have = paidTotal(agg);
    if (have < need) {
      throw new QrError('ROUND_NOT_COVERED', 'Payment must cover this round before it goes to the kitchen.', { roundId, need, have });
    }
  }
  assertStock(
    { orderType: agg.tab.orderType, lines: round.lines.filter((l) => !l.voided) },
    ctx,
    stockOptions,
  );
  let sent: Round = { ...round, state: 'sent', sentAt: ctx.now };
  const events = [ev(agg, ctx, 'round.sent', roundId, actor, { roundId })];
  if (ctx.config.features.autoAccept) {
    sent = { ...sent, state: 'accepted' };
    events.push(ev(agg, ctx, 'round.accepted', roundId, { kind: 'system' }, { roundId, auto: true }));
  }
  return { aggregate: replaceRound(agg, sent), events, result: sent, replayed: false };
}

/** Send every draft round that succeeded payments now cover, oldest first. */
export function sendCoveredRounds(agg: TabAggregate, ctx: EngineContext, actor: TransitionActor, stockOptions: StockOptions = {}): Transition<Round[]> {
  let current = agg;
  const events: EventEnvelope[] = [];
  const sentRounds: Round[] = [];
  for (const r of agg.rounds.filter((x) => x.state === 'draft')) {
    if (current.tab.payTiming === 'before_kitchen' && paidTotal(current) < coveringTotal(current, ctx, r.id)) break;
    const t = sendRound(current, ctx, r.id, actor, stockOptions);
    current = t.aggregate;
    events.push(...t.events);
    sentRounds.push(t.result);
  }
  return { aggregate: current, events, result: sentRounds, replayed: false };
}

/** Accept, ready and served: the forward steps. Void has its own function. */
export function advanceRound(agg: TabAggregate, ctx: EngineContext, roundId: string, to: Exclude<RoundState, 'draft' | 'sent' | 'void'>, actor: TransitionActor): Transition<Round> {
  const round = getRound(agg, roundId);
  if (!canTransitionRound(round.state, to)) {
    throw new QrError('ROUND_TRANSITION_ILLEGAL', `A ${round.state} round cannot become ${to}.`, { roundId, from: round.state, to });
  }
  const next: Round = { ...round, state: to };
  return { aggregate: replaceRound(agg, next), events: [ev(agg, ctx, `round.${to}` as EventType, roundId, actor, { roundId })], result: next, replayed: false };
}

function assertStaffVoid(actor: TransitionActor, reason: string): StaffActor {
  if (actor.kind !== 'staff') throw new QrError('VOID_ROLE_FORBIDDEN', 'Only staff can void.');
  if (!reason || reason.trim().length === 0) throw new QrError('VOID_REASON_REQUIRED');
  return actor;
}

function assertNotOverpaid(agg: TabAggregate, ctx: EngineContext): void {
  const total = priceAggregate(agg, ctx).total;
  if (paidTotal(agg) > total) {
    throw new QrError('VOID_WOULD_OVERPAY', 'Refund the payment before voiding, or the balance would go negative.', { total, paid: paidTotal(agg) });
  }
}

/** Void a sent round: staff only, reason required, audited by an event (invariant 4). */
export function voidRound(agg: TabAggregate, ctx: EngineContext, roundId: string, actor: TransitionActor, reason: string): Transition<Round> {
  const staff = assertStaffVoid(actor, reason);
  const round = getRound(agg, roundId);
  if (!canTransitionRound(round.state, 'void')) {
    throw new QrError('ROUND_TRANSITION_ILLEGAL', `A ${round.state} round cannot be voided.`, { roundId, from: round.state, to: 'void' });
  }
  const next: Round = { ...round, state: 'void', voidReason: reason, voidedBy: staff.id };
  const out = replaceRound(agg, next);
  assertNotOverpaid(out, ctx);
  return { aggregate: out, events: [ev(out, ctx, 'round.voided', roundId, actor, { roundId, reason })], result: next, replayed: false };
}

/** Void one line of a sent round. The line stays on record; the rest of the round is untouched. */
export function voidLine(agg: TabAggregate, ctx: EngineContext, roundId: string, lineId: string, actor: TransitionActor, reason: string): Transition<Line> {
  assertStaffVoid(actor, reason);
  const round = getRound(agg, roundId);
  if (round.state === 'draft' || round.state === 'void') {
    throw new QrError('ROUND_TRANSITION_ILLEGAL', 'Only a sent round has lines to void.', { roundId, state: round.state });
  }
  const line = round.lines.find((l) => l.lineId === lineId);
  if (!line) throw new QrError('COMMAND_INVALID', 'Unknown line.', { lineId });
  const voided: Line = { ...line, voided: true, voidReason: reason };
  const out = replaceRound(agg, { ...round, lines: round.lines.map((l) => (l.lineId === lineId ? voided : l)) });
  assertNotOverpaid(out, ctx);
  return { aggregate: out, events: [ev(out, ctx, 'round.voided', `${roundId}:${lineId}`, actor, { roundId, lineId, reason })], result: voided, replayed: false };
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export interface CreatePaymentInput {
  id: string;
  amount: number;
  method: string;
  tip?: number;
  /** 'guest' or a staff member id. */
  takenBy: string;
  idempotencyKey: string;
  /** Cash and card machine are recorded as taken. Online payments start `pending`. */
  state?: 'pending' | 'succeeded';
  actor: TransitionActor;
}

/**
 * Create a payment against the tab. It can never exceed the balance, so the balance is never
 * negative (invariant 3). Replays with the same idempotency key return the first payment, so a
 * double-submit charges once (invariant 6).
 */
export function createPayment(agg: TabAggregate, ctx: EngineContext, input: CreatePaymentInput): Transition<Payment> {
  ensureStore(agg, ctx);
  const request = { tabId: agg.tab.id, amount: input.amount, method: input.method, tip: input.tip ?? 0, takenBy: input.takenBy };
  const hit = lookupKey(agg.ledger, 'payment', input.idempotencyKey, request);
  if (hit.replay) {
    const p = agg.payments.find((x) => x.id === hit.resultId);
    if (!p) throw new QrError('IDEMPOTENCY_KEY_REUSED', 'The first result for this key is missing.', { key: input.idempotencyKey });
    return { aggregate: agg, events: [], result: p, replayed: true };
  }
  if (agg.tab.state !== 'open') throw new QrError('TAB_NOT_OPEN', undefined, { tabId: agg.tab.id });
  const tip = input.tip ?? 0;
  if (!Number.isInteger(input.amount) || input.amount <= 0 || !Number.isInteger(tip) || tip < 0 || tip > input.amount) {
    throw new QrError('PAYMENT_AMOUNT_INVALID', undefined, { amount: input.amount, tip });
  }
  const balance = tabBalance(agg, ctx, { includeDrafts: agg.tab.payTiming === 'before_kitchen' });
  if (input.amount > balance) {
    throw new QrError('PAYMENT_EXCEEDS_BALANCE', 'The payment is larger than the balance.', { amount: input.amount, balance });
  }
  const payment: Payment = {
    id: input.id,
    storeId: agg.tab.storeId,
    tabId: agg.tab.id,
    amount: input.amount,
    method: input.method,
    state: input.state ?? 'pending',
    tip,
    idempotencyKey: input.idempotencyKey,
    takenBy: input.takenBy,
  };
  const next: TabAggregate = {
    ...agg,
    payments: [...agg.payments, payment],
    ledger: recordKey(agg.ledger, 'payment', input.idempotencyKey, request, payment.id),
  };
  const events = [ev(next, ctx, 'payment.created', payment.id, input.actor, { paymentId: payment.id, amount: payment.amount })];
  if (payment.state === 'succeeded') events.push(ev(next, ctx, 'payment.succeeded', payment.id, input.actor, { paymentId: payment.id }));
  return { aggregate: next, events, result: payment, replayed: false };
}

/**
 * Settle a pending payment (webhook or poll), or refund a succeeded one. A repeat of the same
 * outcome is a no-op, so webhook replays are safe.
 */
export function settlePayment(agg: TabAggregate, ctx: EngineContext, paymentId: string, to: Exclude<PaymentState, 'pending'>, actor: TransitionActor): Transition<Payment> {
  const payment = agg.payments.find((p) => p.id === paymentId);
  if (!payment) throw new QrError('COMMAND_INVALID', 'Unknown payment.', { paymentId });
  if (payment.state === to) return { aggregate: agg, events: [], result: payment, replayed: true };
  if (!canTransitionPayment(payment.state, to)) {
    throw new QrError('ROUND_TRANSITION_ILLEGAL', `A ${payment.state} payment cannot become ${to}.`, { paymentId, from: payment.state, to });
  }
  if (to === 'succeeded') {
    const balance = tabBalance(agg, ctx, { includeDrafts: agg.tab.payTiming === 'before_kitchen' });
    if (payment.amount > balance) {
      throw new QrError('PAYMENT_EXCEEDS_BALANCE', 'Succeeding this payment would make the balance negative. Refund it.', { paymentId, amount: payment.amount, balance });
    }
  }
  const next: Payment = { ...payment, state: to };
  const out = { ...agg, payments: agg.payments.map((p) => (p.id === paymentId ? next : p)) };
  return { aggregate: out, events: [ev(out, ctx, `payment.${to}` as EventType, paymentId, actor, { paymentId })], result: next, replayed: false };
}

/* -------------------------------------------------------------------------- */
/* Closing and voiding the tab                                                 */
/* -------------------------------------------------------------------------- */

/** A tab closes when the balance is zero (docs/03 section 5). Draft rounds must be sent or discarded first. */
export function closeTab(agg: TabAggregate, ctx: EngineContext, actor: TransitionActor): Transition<Tab> {
  if (!canTransitionTab(agg.tab.state, 'closed')) throw new QrError('TAB_NOT_OPEN', undefined, { tabId: agg.tab.id });
  if (agg.rounds.some((r) => r.state === 'draft')) {
    throw new QrError('TAB_BALANCE_DUE', 'An unpaid draft round is still on the tab.', { tabId: agg.tab.id });
  }
  const balance = tabBalance(agg, ctx);
  if (balance !== 0) throw new QrError('TAB_BALANCE_DUE', undefined, { tabId: agg.tab.id, balance });
  const tab: Tab = { ...agg.tab, state: 'closed', closedAt: ctx.now };
  const out = { ...agg, tab };
  return { aggregate: out, events: [ev(out, ctx, 'tab.closed', tab.id, actor)], result: tab, replayed: false };
}

/** Void a tab: staff only, reason required. Succeeded payments must be refunded first. */
export function voidTab(agg: TabAggregate, ctx: EngineContext, actor: TransitionActor, reason: string): Transition<Tab> {
  const staff = assertStaffVoid(actor, reason);
  if (!canTransitionTab(agg.tab.state, 'void')) throw new QrError('TAB_NOT_OPEN', undefined, { tabId: agg.tab.id });
  if (paidTotal(agg) > 0) throw new QrError('VOID_WOULD_OVERPAY', 'Refund the payments before voiding the tab.', { paid: paidTotal(agg) });
  const rounds = agg.rounds.map((r): Round => (r.state === 'void' ? r : { ...r, state: 'void', voidReason: reason, voidedBy: staff.id }));
  const tab: Tab = { ...agg.tab, state: 'void', voidReason: reason };
  const out = { ...agg, tab, rounds };
  return { aggregate: out, events: [ev(out, ctx, 'tab.voided', tab.id, actor, { reason })], result: tab, replayed: false };
}

/* -------------------------------------------------------------------------- */
/* Invariants (docs/03 section 9), checkable on any aggregate                   */
/* -------------------------------------------------------------------------- */

/** Invariant 2 across tabs: a table spot has at most one open tab. */
export function spotInvariantProblems(tabs: readonly Tab[]): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const t of tabs) {
    if (t.state !== 'open' || t.spotType !== 'table') continue;
    const key = `${t.storeId}:${t.spotId}`;
    if (seen.has(key)) out.push(`table spot ${t.spotId} has two open tabs (${seen.get(key)} and ${t.id})`);
    seen.set(key, t.id);
  }
  return out;
}

/**
 * Invariants 1, 3, 5 and 6 for one tab. Returns plain problems, empty when everything holds.
 * Use it as a property check after any sequence of operations.
 */
export function invariantProblems(agg: TabAggregate, ctx: EngineContext): string[] {
  const out: string[] = [];
  const store = agg.tab.storeId;
  if (ctx.menu.storeId !== store) out.push('1: tab and menu belong to different stores');
  for (const r of agg.rounds) {
    if (r.storeId !== store) out.push(`1: round ${r.id} has store ${r.storeId}`);
    for (const l of r.lines) if (l.storeId !== store) out.push(`1: line ${l.lineId} has store ${l.storeId}`);
  }
  for (const p of agg.payments) if (p.storeId !== store) out.push(`1: payment ${p.id} has store ${p.storeId}`);

  const billedTotal = priceAggregate(agg, ctx).total;
  if (billedTotal - paidTotal(agg) < 0) out.push(`3: balance is negative (${billedTotal - paidTotal(agg)})`);

  if (agg.tab.payTiming === 'before_kitchen') {
    const sentSomething = agg.rounds.some((r) => BILLED.includes(r.state));
    if (sentSomething && paidTotal(agg) < billedTotal) {
      out.push(`5: a before_kitchen round was sent but payments (${paidTotal(agg)}) do not cover ${billedTotal}`);
    }
  }
  const keys = (xs: { idempotencyKey: string }[]) => xs.map((x) => x.idempotencyKey);
  for (const [label, ks] of [['round', keys(agg.rounds)], ['payment', keys(agg.payments)]] as const) {
    if (new Set(ks).size !== ks.length) out.push(`6: two ${label}s share an idempotency key`);
  }
  return out;
}
