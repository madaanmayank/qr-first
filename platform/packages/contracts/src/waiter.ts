import { z } from 'zod';
import { Id } from './primitives';
import { COURSES, Spice } from './menu';
import { COMMAND_TYPES } from './commands';

/**
 * The waiter character's tool list (docs/26 section 5). The list is fixed. The character cannot
 * change prices, apply discounts, reveal other guests' data or run store commands, so no tool
 * here is a store command, and `check` in the tests keeps it that way.
 */

/** Fixed reasons for a service request (docs/03 section 4 says "a fixed list" without naming it). */
export const SERVICE_REQUEST_REASONS = ['water', 'bill', 'help', 'allergen_question', 'complaint', 'payment_trouble'] as const;
export const ServiceRequestReason = z.enum(SERVICE_REQUEST_REASONS);

export interface WaiterToolDef<N extends string = string, S extends z.ZodType = z.ZodType> {
  name: N;
  /** What it does and when to use it. Written for the model. */
  description: string;
  input: S;
  /** The tool changes the cart or creates a request. It only ever proposes; one guest tap confirms. */
  proposesChange: boolean;
  /** The guest must tap to confirm before anything changes (docs/26 section 5, "waits for one tap"). */
  needsGuestTap: boolean;
}

function defineWaiterTool<const N extends string, S extends z.ZodType>(def: WaiterToolDef<N, S>): WaiterToolDef<N, S> {
  return def;
}

const Diet = z.enum(['veg', 'any']);

export const WAITER_TOOLS = [
  defineWaiterTool({
    name: 'search_menu',
    description:
      'Search and filter the menu by course, vegetarian, spice, calories, protein, price and availability. Use it for requests like "something light under 400 calories". Numbers are estimates and are shown as about.',
    input: z.object({
      course: z.enum(COURSES).optional(),
      diet: Diet.optional(),
      spice: Spice.optional(),
      maxKcal: z.number().int().min(0).optional(),
      minProteinG: z.number().min(0).optional(),
      maxPricePaise: z.number().int().min(0).optional(),
      availableOnly: z.boolean().default(true),
      sortBy: z.enum(['protein', 'kcal', 'price']).optional(),
      limit: z.number().int().min(1).max(5).default(3),
    }),
    proposesChange: false,
    needsGuestTap: false,
  }),
  defineWaiterTool({
    name: 'explain_dish',
    description:
      'Explain one dish from its menu text and house note. A short, well known background line is allowed. Never use it for allergen or medical claims; call a human for those.',
    input: z.object({ itemId: Id }),
    proposesChange: false,
    needsGuestTap: false,
  }),
  defineWaiterTool({
    name: 'compare_items',
    description: 'Open the compare screen for two items and read out the one-line verdict built from their stored numbers. Never says which is healthier overall.',
    input: z.object({ itemIdA: Id, itemIdB: Id }),
    proposesChange: false,
    needsGuestTap: false,
  }),
  defineWaiterTool({
    name: 'suggest_meal',
    description: 'Suggest dishes that complete the table by course, within a budget and diet. Sold-out items and items already in the cart are never suggested.',
    input: z.object({
      people: z.number().int().min(1).max(20).optional(),
      budgetPaise: z.number().int().min(0).optional(),
      diet: Diet.optional(),
    }),
    proposesChange: false,
    needsGuestTap: false,
  }),
  defineWaiterTool({
    name: 'propose_cart_change',
    description:
      'Propose adding an item to the cart, or swapping one cart line for another item or choice. It shows the change and waits for the guest to tap once to confirm. It never changes the cart by itself.',
    input: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('add'), itemId: Id, qty: z.number().int().min(1).max(20).default(1) }),
      z.object({ kind: z.literal('swap_item'), lineId: Id, itemId: Id }),
      z.object({ kind: z.literal('swap_option'), lineId: Id, soldOutOptionId: Id, optionId: Id }),
    ]),
    proposesChange: true,
    needsGuestTap: true,
  }),
  defineWaiterTool({
    name: 'show_order_status',
    description: 'Read the live tab: the state of each round and the bill so far, for this table only.',
    input: z.object({}),
    proposesChange: false,
    needsGuestTap: false,
  }),
  defineWaiterTool({
    name: 'call_human',
    description:
      'Create a service request for staff. Use it for allergens, complaints, payment trouble and anything the character cannot answer. The guest sees a call-staff button first.',
    input: z.object({ reason: ServiceRequestReason }),
    proposesChange: true,
    needsGuestTap: true,
  }),
] as const;

export type WaiterToolName = (typeof WAITER_TOOLS)[number]['name'];
export const WAITER_TOOL_NAMES = WAITER_TOOLS.map((t) => t.name) as readonly WaiterToolName[];

/** The tool names must never collide with a store command (the character runs none). */
export const waiterToolsAreNotCommands = () => WAITER_TOOL_NAMES.every((n) => !(COMMAND_TYPES as readonly string[]).includes(n));

export function describeWaiterTools() {
  return WAITER_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    proposesChange: t.proposesChange,
    needsGuestTap: t.needsGuestTap,
    inputSchema: z.toJSONSchema(t.input),
  }));
}
