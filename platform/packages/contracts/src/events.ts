import { z } from 'zod';
import { Id, UtcInstant } from './primitives';

/** Who caused an event. Guest behaviour events use a guest session (docs/03 section 8). */
export const ActorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('staff'), id: Id }),
  z.object({ kind: z.literal('guest_session'), id: Id }),
  z.object({ kind: z.literal('assistant'), onBehalfOf: Id }),
  z.object({ kind: z.literal('agent'), keyId: Id }),
  z.object({ kind: z.literal('system') }),
]);
export type Actor = z.infer<typeof ActorSchema>;

/** Guest behaviour events from docs/05 section 12. */
export const GUEST_EVENT_TYPES = [
  'menu_viewed',
  'item_viewed',
  'item_added',
  'item_removed',
  'round_sent',
  'payment_started',
  'payment_succeeded',
  'payment_failed',
  'rating_submitted',
  'review_link_opened',
  'guest_identified',
  'consent_changed',
] as const;

/** State changes that write one append-only event each. */
export const SERVICE_EVENT_TYPES = [
  'tab.opened',
  'tab.closed',
  'tab.voided',
  'round.created',
  'round.sent',
  'round.accepted',
  'round.ready',
  'round.served',
  'round.voided',
  'payment.created',
  'payment.succeeded',
  'payment.failed',
  'payment.refunded',
  'soldout.changed',
  'config.changed',
  'command.applied',
  'command.proposed',
  'menu.published',
] as const;

export const EVENT_TYPES = [...GUEST_EVENT_TYPES, ...SERVICE_EVENT_TYPES] as const;
export const EventType = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventType>;

/** `{ id, storeId, type, actor, at, payload }` (docs/03 section 8). */
export const EventEnvelopeSchema = z.object({
  id: Id,
  storeId: Id,
  type: EventType,
  actor: ActorSchema,
  at: UtcInstant,
  payload: z.record(z.string(), z.unknown()),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const SoldOutChangedPayload = z.object({
  itemIds: z.array(Id),
  optionIds: z.array(Id),
  soldOut: z.boolean(),
});
export type SoldOutChangedPayload = z.infer<typeof SoldOutChangedPayload>;

export function makeEvent(input: {
  id: string;
  storeId: string;
  type: EventType;
  actor: Actor;
  at: string;
  payload?: Record<string, unknown>;
}): EventEnvelope {
  return EventEnvelopeSchema.parse({ ...input, payload: input.payload ?? {} });
}
