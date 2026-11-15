import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
  ErrorBodySchema,
  LineStockResultSchema,
  AlternativeSchema,
  QrError,
  EventEnvelopeSchema,
  EVENT_TYPES,
  GUEST_EVENT_TYPES,
  makeEvent,
  type LineStockResult,
} from '../src';

describe('error codes (docs/09 section 7)', () => {
  it('includes the codes the doc names', () => {
    for (const c of ['OPTION_MIN_NOT_MET', 'ITEM_SOLD_OUT', 'OPTION_SOLD_OUT', 'PAYMENT_DECLINED']) expect(ERROR_CODES).toHaveProperty(c);
  });
  it('every code is UPPER_SNAKE and has an http status', () => {
    for (const [code, status] of Object.entries(ERROR_CODES)) {
      expect(code).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });
  it('the wire body is { code, message, details }', () => {
    const e = new QrError('OPTION_MIN_NOT_MET', 'Choose 1', { groupId: 'g_size' });
    expect(ErrorBodySchema.parse(e.toBody())).toEqual({ code: 'OPTION_MIN_NOT_MET', message: 'Choose 1', details: { groupId: 'g_size' } });
    expect(ErrorBodySchema.safeParse({ code: 'MADE_UP', message: 'x' }).success).toBe(false);
  });
});

describe('per-line stock results (docs/09 section 6)', () => {
  const ok: LineStockResult = { lineId: 'l1', status: 'ok' };
  const itemOut: LineStockResult = {
    lineId: 'l2',
    status: 'ITEM_SOLD_OUT',
    alternatives: [{ kind: 'item', itemId: 'seekh', name: 'Seekh Kebab', priceDifference: -4000, needsChoices: false }],
  };
  const optionOut: LineStockResult = {
    lineId: 'l3',
    status: 'OPTION_SOLD_OUT',
    optionId: 'o_rumali',
    alternatives: [{ kind: 'option', groupId: 'g_bread', optionId: 'o_naan', name: 'Butter naan', priceDifference: 1000, needsChoices: false }],
  };
  it('accepts ok, ITEM_SOLD_OUT with alternatives, and OPTION_SOLD_OUT with optionId and alternatives', () => {
    for (const r of [ok, itemOut, optionOut]) expect(LineStockResultSchema.parse(r)).toEqual(r);
  });
  it('requires optionId for OPTION_SOLD_OUT and alternatives for a sold-out status', () => {
    expect(LineStockResultSchema.safeParse({ lineId: 'l', status: 'OPTION_SOLD_OUT', alternatives: [] }).success).toBe(false);
    expect(LineStockResultSchema.safeParse({ lineId: 'l', status: 'ITEM_SOLD_OUT' }).success).toBe(false);
    expect(LineStockResultSchema.safeParse({ lineId: 'l', status: 'ITEM_SOLD_OUT', alternatives: [] }).success).toBe(true);
  });
  it('alternatives carry the price difference as integer paise, which may be negative', () => {
    expect(AlternativeSchema.safeParse({ kind: 'item', itemId: 'x', name: 'X', priceDifference: -4000, needsChoices: false }).success).toBe(true);
    expect(AlternativeSchema.safeParse({ kind: 'item', itemId: 'x', name: 'X', priceDifference: 10.5, needsChoices: false }).success).toBe(false);
  });
  it('rejects a status that is not in the contract', () => {
    expect(LineStockResultSchema.safeParse({ lineId: 'l', status: 'OUT_OF_STOCK' }).success).toBe(false);
  });
});

describe('event envelope (docs/03 section 8)', () => {
  const base = { id: 'e1', storeId: 's1', type: 'round.sent', actor: { kind: 'staff', id: 'asha' }, at: '2026-11-14T13:00:00.000Z', payload: { roundId: 'r1' } };
  it('is { id, storeId, type, actor, at, payload }', () => {
    expect(EventEnvelopeSchema.parse(base)).toEqual(base);
    for (const k of ['id', 'storeId', 'type', 'actor', 'at', 'payload']) {
      const { [k]: _gone, ...rest } = base as Record<string, unknown>;
      expect(EventEnvelopeSchema.safeParse(rest).success, k).toBe(false);
    }
  });
  it('guest behaviour events use the same envelope with a guest session actor', () => {
    expect(EventEnvelopeSchema.safeParse({ ...base, type: 'item_added', actor: { kind: 'guest_session', id: 'sess_1' } }).success).toBe(true);
  });
  it('carries the 12 guest events of docs/05 section 12', () => {
    expect(GUEST_EVENT_TYPES).toHaveLength(12);
    for (const t of GUEST_EVENT_TYPES) expect(EVENT_TYPES).toContain(t);
  });
  it('time is UTC with a Z', () => {
    expect(EventEnvelopeSchema.safeParse({ ...base, at: '2026-11-14T18:30:00+05:30' }).success).toBe(false);
  });
  it('an unknown event type is refused', () => {
    expect(EventEnvelopeSchema.safeParse({ ...base, type: 'custom.thing' }).success).toBe(false);
  });
  it('records who did it: staff, assistant for a person, or an agent key', () => {
    for (const actor of [{ kind: 'assistant', onBehalfOf: 'asha' }, { kind: 'agent', keyId: 'pricing-bot' }, { kind: 'system' }]) {
      expect(EventEnvelopeSchema.safeParse({ ...base, actor }).success).toBe(true);
    }
  });
  it('makeEvent validates', () => {
    expect(makeEvent({ id: 'e', storeId: 's', type: 'tab.opened', actor: { kind: 'system' }, at: '2026-11-14T13:00:00.000Z' }).payload).toEqual({});
    expect(() => makeEvent({ id: 'e', storeId: 's', type: 'tab.opened', actor: { kind: 'system' }, at: 'yesterday' })).toThrow();
  });
});
