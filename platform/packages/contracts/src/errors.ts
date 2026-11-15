import { z } from 'zod';
import { Id, Paise } from './primitives';

/**
 * Stable error codes (docs/09 section 7). Messages are translatable and chosen on
 * the client, so the contract is the code and its details only.
 */
export const ERROR_CODES = {
  // Option and line validation
  OPTION_MIN_NOT_MET: 400,
  OPTION_MAX_EXCEEDED: 400,
  OPTION_GROUP_UNKNOWN: 400,
  OPTION_UNKNOWN: 400,
  OPTION_DUPLICATE: 400,
  OPTION_DEPTH_EXCEEDED: 400,
  QUANTITY_INVALID: 400,
  ITEM_UNKNOWN: 404,
  // Stock
  ITEM_SOLD_OUT: 409,
  OPTION_SOLD_OUT: 409,
  // Money
  PAYMENT_DECLINED: 402,
  PAYMENT_EXCEEDS_BALANCE: 409,
  PAYMENT_AMOUNT_INVALID: 400,
  ROUND_NOT_COVERED: 402,
  TAX_CLASS_UNKNOWN: 500,
  // Idempotency
  IDEMPOTENCY_KEY_REUSED: 422,
  // Tabs and rounds
  SPOT_HAS_OPEN_TAB: 409,
  TAB_NOT_OPEN: 409,
  TAB_BALANCE_DUE: 409,
  ROUND_TRANSITION_ILLEGAL: 409,
  ROUND_IMMUTABLE: 409,
  VOID_REASON_REQUIRED: 400,
  VOID_ROLE_FORBIDDEN: 403,
  VOID_WOULD_OVERPAY: 409,
  // Tenancy
  STORE_MISMATCH: 403,
  // Config and commands
  CONFIG_INVALID: 400,
  COMMAND_INVALID: 400,
  COMMAND_RISK_FORBIDDEN: 403,
  FEATURE_UNKNOWN: 404,
  FEATURE_REQUIREMENT_UNMET: 409,
  // Context
  STORE_CLOSED: 409,
  ORDERING_OFF: 409,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
export const ErrorCodeSchema = z.enum(Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]);

/** Error body on the wire: `{ code, message, details }` (docs/17 section 4). */
export const ErrorBodySchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export class QrError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;
  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'QrError';
    this.code = code;
    this.details = details;
  }
  toBody(): ErrorBody {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

/** One option-level problem found while validating a line. */
export const LineIssueSchema = z.object({
  code: ErrorCodeSchema,
  /** Path of group ids and option ids from the item down, for the UI to scroll to. */
  path: z.array(z.string()),
  groupId: Id.optional(),
  optionId: Id.optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type LineIssue = z.infer<typeof LineIssueSchema>;

/**
 * An available swap with its price difference, so the client can offer one-tap fixes
 * (docs/09 section 6).
 */
export const AlternativeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('option'),
    groupId: Id,
    optionId: Id,
    name: z.string(),
    /** Alternative delta minus the sold-out option's delta. May be negative. */
    priceDifference: Paise,
    /** The alternative carries nested groups with a minimum, so a follow-up pick is needed. */
    needsChoices: z.boolean(),
  }),
  z.object({
    kind: z.literal('item'),
    itemId: Id,
    name: z.string(),
    /** Alternative unit price (no choices) minus the current line's unit price. */
    priceDifference: Paise,
    needsChoices: z.boolean(),
  }),
]);
export type Alternative = z.infer<typeof AlternativeSchema>;

/** Per-line result of the price call and the send call (docs/09 section 6). */
export const LineStockResultSchema = z.discriminatedUnion('status', [
  z.object({ lineId: Id, status: z.literal('ok') }),
  z.object({
    lineId: Id,
    status: z.literal('ITEM_SOLD_OUT'),
    alternatives: z.array(AlternativeSchema),
  }),
  z.object({
    lineId: Id,
    status: z.literal('OPTION_SOLD_OUT'),
    optionId: Id,
    alternatives: z.array(AlternativeSchema),
  }),
]);
export type LineStockResult = z.infer<typeof LineStockResultSchema>;
