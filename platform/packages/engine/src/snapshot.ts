import type { MenuIndex, StoreConfig } from '@qr-first/contracts';
import { sha256Hex } from './sha256';
import { fingerprintOf } from './idempotency';

/**
 * Menu snapshot (invariant 8, docs/03 section 9 and docs/09 section 5): an immutable published
 * build of the menu and the guest-facing part of the config.
 *
 * `contentHash` is the storage key (content addressed, so identical content is stored once).
 * `id` includes the publish sequence, so every publish gets a new snapshot id even when the
 * content is unchanged, as the invariant asks.
 */
export interface MenuSnapshot {
  readonly id: string;
  readonly seq: number;
  readonly contentHash: string;
  readonly storeId: string;
  readonly content: Readonly<SnapshotContent>;
}

export interface SnapshotContent {
  menu: MenuIndex;
  /** Everything a guest needs. Payout account and store-side alert contact stay on the server. */
  config: { settings: Omit<StoreConfig['settings'], 'payoutAccount' | 'receiptContact'>; features: StoreConfig['features'] };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

export function buildSnapshotContent(menu: MenuIndex, config: StoreConfig): SnapshotContent {
  const { payoutAccount: _p, receiptContact: _r, ...guestSettings } = config.settings;
  return structuredClone({ menu, config: { settings: guestSettings, features: config.features } });
}

/** Publish: build a deeply frozen snapshot with a new id. Earlier snapshots are never touched. */
export function publishSnapshot(menu: MenuIndex, config: StoreConfig, previous: readonly Pick<MenuSnapshot, 'seq' | 'id'>[]): MenuSnapshot {
  const content = buildSnapshotContent(menu, config);
  const contentHash = sha256Hex(fingerprintOf(content));
  const seq = previous.reduce((m, s) => Math.max(m, s.seq), 0) + 1;
  const id = `snap_${seq}_${contentHash.slice(0, 12)}`;
  return deepFreeze({ id, seq, contentHash, storeId: menu.storeId, content });
}

/** True when the content still hashes to the recorded hash. */
export function verifySnapshot(s: MenuSnapshot): boolean {
  return sha256Hex(fingerprintOf(s.content)) === s.contentHash;
}
