import { QrError } from '@qr-first/contracts';

/**
 * Idempotency (invariant 6, docs/03 section 9): two requests with the same key produce one
 * round or one payment. The ledger is a plain value that the caller stores with a unique
 * constraint on `kind` and `key`.
 */
export interface IdempotencyEntry {
  /** Stable text of the request, to catch a key reused for a different request. */
  fingerprint: string;
  /** Id of the thing the first request created. */
  resultId: string;
}
export type Ledger = Readonly<Record<string, IdempotencyEntry>>;
export const EMPTY_LEDGER: Ledger = Object.freeze({});

export type IdempotencyKind = 'round' | 'payment';

/** Key order does not change the fingerprint. */
export function fingerprintOf(value: unknown): string {
  const norm = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .filter(([, x]) => x !== undefined)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, x]) => [k, norm(x)]),
          )
        : v;
  return JSON.stringify(norm(value));
}

export type IdempotencyLookup = { replay: true; resultId: string } | { replay: false };

/** Look a key up. A reused key with a different request is an error, never a silent second action. */
export function lookupKey(ledger: Ledger, kind: IdempotencyKind, key: string, request: unknown): IdempotencyLookup {
  const entry = ledger[`${kind}:${key}`];
  if (!entry) return { replay: false };
  if (entry.fingerprint !== fingerprintOf(request)) {
    throw new QrError('IDEMPOTENCY_KEY_REUSED', 'This key was already used for a different request.', { kind, key });
  }
  return { replay: true, resultId: entry.resultId };
}

export function recordKey(ledger: Ledger, kind: IdempotencyKind, key: string, request: unknown, resultId: string): Ledger {
  return { ...ledger, [`${kind}:${key}`]: { fingerprint: fingerprintOf(request), resultId } };
}
