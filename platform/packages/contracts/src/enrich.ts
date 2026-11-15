/** Who set a tag. The owner's choice is final (docs/03 section 3). */
export type TagSource = 'ai' | 'owner';

/**
 * Merge a value proposed by an AI run into what is stored (docs/03 section 3, docs/18).
 *
 * - If the stored value was set by the owner, it is returned unchanged, whatever the AI says.
 * - Otherwise the AI value replaces it and is marked as AI. An AI run can never produce an
 *   `owner` value, so a stray `source: 'owner'` on the AI side is overwritten.
 * - A stored value with no provenance is not a value this function can show to be AI-made, so a
 *   caller that cannot tell passes it as `{ source: 'owner' }` (see `tagFrom`).
 *
 * Pure. Works for any value that carries a `source`, such as `Nutrition`, and for `Tag<T>`.
 */
export function mergeAiTag<V extends { source: TagSource }>(existing: Widen<V> | undefined, aiValue: Widen<V>): Widen<V> {
  if (existing && existing.source === 'owner') return existing;
  return { ...aiValue, source: 'ai' };
}

/** The value's own type with `source` widened, so a literal `'owner'` or `'ai'` on either side is accepted. */
export type Widen<V> = { [K in keyof V]: K extends 'source' ? TagSource : V[K] };

/** A plain value with its source, for fields like `course` and `spice`. */
export interface Tag<T> {
  value: T;
  source: TagSource;
}

/**
 * Read a plain item field with its provenance. Missing provenance counts as the owner's, so an
 * unknown value is never overwritten. A missing value is `undefined`.
 */
export function tagFrom<T>(value: T | undefined, source: TagSource | undefined): Tag<T> | undefined {
  return value === undefined ? undefined : { value, source: source ?? 'owner' };
}
