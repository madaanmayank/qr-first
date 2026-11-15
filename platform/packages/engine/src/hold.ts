import type { CartLine, LineStockResult, Selection } from '@qr-first/contracts';

/** Default soft hold on stock for a pay-first tab: 5 minutes from payment start (decision D21). */
export const DEFAULT_HOLD_MS = 5 * 60 * 1000;

export type HoldState = 'active' | 'released' | 'expired' | 'consumed';
export type HoldReleaseReason = 'payment_failed' | 'payment_cancelled' | 'timeout' | 'sent';

export interface StockHold {
  id: string;
  /** The payment's idempotency key. Starting twice with the same key returns the first hold. */
  idempotencyKey: string;
  tabId?: string | undefined;
  /** Epoch milliseconds. */
  startedAt: number;
  expiresAt: number;
  state: HoldState;
  releaseReason?: HoldReleaseReason;
  lines: { lineId: string; signature: string }[];
}

function optionPaths(selections: readonly Selection[], prefix = ''): string[] {
  return selections.flatMap((s) =>
    s.options.flatMap((o) => {
      const here = `${prefix}${s.groupId}=${o.optionId}`;
      return [here, ...optionPaths(o.children ?? [], `${here}/`)];
    }),
  );
}

/** What a hold covers: the item and every chosen option. Editing a line voids its cover. */
export function lineSignature(line: Pick<CartLine, 'itemId' | 'selections'>): string {
  return `${line.itemId}|${optionPaths(line.selections).sort().join(',')}`;
}

export function isHoldActive(hold: StockHold, nowMs: number): boolean {
  return hold.state === 'active' && nowMs < hold.expiresAt;
}

export interface StartHoldInput {
  id: string;
  idempotencyKey: string;
  tabId?: string;
  lines: readonly CartLine[];
  /** Epoch milliseconds. */
  now: number;
  ttlMs?: number;
}

export type StartHoldResult =
  | { ok: true; hold: StockHold; replayed: boolean }
  | { ok: false; results: LineStockResult[] };

/**
 * Start a soft hold when payment starts. It is refused, with the per-line results, if any line
 * already fails the stock check, so nothing is held for a line that cannot be sent. A replay with
 * the same idempotency key returns the first hold.
 *
 * `check` is the caller's stock check for these lines (see `checkStock`). It is injected so a
 * hold never depends on how stock is stored.
 */
export function startHold(
  input: StartHoldInput,
  check: (lines: readonly CartLine[]) => LineStockResult[],
  existing: readonly StockHold[] = [],
): StartHoldResult {
  const prior = existing.find((h) => h.idempotencyKey === input.idempotencyKey);
  if (prior) return { ok: true, hold: prior, replayed: true };
  const results = check(input.lines);
  if (results.some((r) => r.status !== 'ok')) return { ok: false, results };
  const ttl = input.ttlMs ?? DEFAULT_HOLD_MS;
  const hold: StockHold = {
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    tabId: input.tabId,
    startedAt: input.now,
    expiresAt: input.now + ttl,
    state: 'active',
    lines: input.lines.map((l) => ({ lineId: l.lineId, signature: lineSignature(l) })),
  };
  return { ok: true, hold, replayed: false };
}

/** Release on payment failure or cancel, or mark consumed when the round is sent. */
export function releaseHold(hold: StockHold, reason: HoldReleaseReason): StockHold {
  if (hold.state !== 'active') return hold;
  return { ...hold, state: reason === 'sent' ? 'consumed' : reason === 'timeout' ? 'expired' : 'released', releaseReason: reason };
}

/** Expire every active hold whose time has passed. Run on a timer and before every stock check. */
export function expireHolds(holds: readonly StockHold[], nowMs: number): StockHold[] {
  return holds.map((h) => (h.state === 'active' && nowMs >= h.expiresAt ? releaseHold(h, 'timeout') : h));
}

export type StockCheck = (lines: readonly CartLine[]) => LineStockResult[];
