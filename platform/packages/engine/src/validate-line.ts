import {
  QrError,
  type Item,
  type LineIssue,
  type MenuIndex,
  type Option,
  type OptionGroup,
  type Selection,
  type StockState,
} from '@qr-first/contracts';

/** Depth limit for nested option groups (docs/03 section 3): item, groups, nested groups. */
export const MAX_GROUP_DEPTH = 2;

/** A sold-out flag on the menu or in the live stock sets. */
export function isItemSoldOut(menu: MenuIndex, stock: StockState | undefined, itemId: string): boolean {
  const item = menu.items[itemId];
  if (!item) return false;
  return item.soldOut || Boolean(stock?.soldOutItemIds.includes(itemId));
}

/** An option is out when its own flag is set or, for a combo part, when the linked item is out. */
export function isOptionSoldOut(menu: MenuIndex, stock: StockState | undefined, option: Option): boolean {
  if (option.soldOut || stock?.soldOutOptionIds.includes(option.id)) return true;
  return option.linkedItemId ? isItemSoldOut(menu, stock, option.linkedItemId) : false;
}

export interface ValidateLineInput {
  itemId: string;
  qty?: number;
  selections: readonly Selection[];
}

export interface ValidateLineResult {
  ok: boolean;
  issues: LineIssue[];
}

/**
 * Server-side check of one line before it is accepted (invariant 7, docs/03 section 9).
 * It returns every problem, not just the first, so a client can highlight them all.
 *
 * Rules:
 * - Each group the item carries must satisfy `min` and `max`. A group with no picks counts as zero picks.
 * - A pick must belong to the group, and a group must belong to the item (or to the picked option).
 * - A picked option brings its own nested groups. Nested groups go two levels deep at most.
 * - A combo part (`linkedItemId`) must point to an item in this store.
 * - Sold-out items, options and linked items are refused when `stock` is given or the menu flag is set.
 */
export function validateLine(menu: MenuIndex, input: ValidateLineInput, opts: { stock?: StockState } = {}): ValidateLineResult {
  const issues: LineIssue[] = [];
  const item = menu.items[input.itemId];
  if (!item) {
    return { ok: false, issues: [{ code: 'ITEM_UNKNOWN', path: [input.itemId] }] };
  }
  if (item.storeId !== menu.storeId) {
    return { ok: false, issues: [{ code: 'STORE_MISMATCH', path: [item.id] }] };
  }
  if (input.qty !== undefined && (!Number.isInteger(input.qty) || input.qty < 1)) {
    issues.push({ code: 'QUANTITY_INVALID', path: [item.id], details: { qty: input.qty } });
  }
  if (isItemSoldOut(menu, opts.stock, item.id)) {
    issues.push({ code: 'ITEM_SOLD_OUT', path: [item.id] });
  }
  validateGroups(menu, item.optionGroupIds, input.selections, [item.id], 1, opts.stock, issues);
  return { ok: issues.length === 0, issues };
}

function validateGroups(
  menu: MenuIndex,
  allowedGroupIds: readonly string[],
  selections: readonly Selection[],
  path: string[],
  depth: number,
  stock: StockState | undefined,
  issues: LineIssue[],
): void {
  const seen = new Set<string>();
  for (const sel of selections) {
    if (!allowedGroupIds.includes(sel.groupId)) {
      issues.push({ code: 'OPTION_GROUP_UNKNOWN', path: [...path, sel.groupId], groupId: sel.groupId });
    }
    if (seen.has(sel.groupId)) {
      issues.push({ code: 'OPTION_DUPLICATE', path: [...path, sel.groupId], groupId: sel.groupId });
    }
    seen.add(sel.groupId);
  }

  for (const groupId of allowedGroupIds) {
    const group: OptionGroup | undefined = menu.optionGroups[groupId];
    if (!group) {
      issues.push({ code: 'OPTION_GROUP_UNKNOWN', path: [...path, groupId], groupId });
      continue;
    }
    if (group.storeId !== menu.storeId) {
      issues.push({ code: 'STORE_MISMATCH', path: [...path, groupId], groupId });
      continue;
    }
    const picks = selections.find((s) => s.groupId === groupId)?.options ?? [];
    const groupPath = [...path, groupId];

    const pickedIds = new Set<string>();
    for (const pick of picks) {
      if (pickedIds.has(pick.optionId)) {
        issues.push({ code: 'OPTION_DUPLICATE', path: [...groupPath, pick.optionId], groupId, optionId: pick.optionId });
      }
      pickedIds.add(pick.optionId);
    }

    if (picks.length < group.min) {
      issues.push({ code: 'OPTION_MIN_NOT_MET', path: groupPath, groupId, details: { min: group.min, picked: picks.length } });
    }
    if (picks.length > group.max) {
      issues.push({ code: 'OPTION_MAX_EXCEEDED', path: groupPath, groupId, details: { max: group.max, picked: picks.length } });
    }

    for (const pick of picks) {
      const option = group.options.find((o) => o.id === pick.optionId);
      const optionPath = [...groupPath, pick.optionId];
      if (!option) {
        issues.push({ code: 'OPTION_UNKNOWN', path: optionPath, groupId, optionId: pick.optionId });
        continue;
      }
      if (option.linkedItemId && !menu.items[option.linkedItemId]) {
        issues.push({ code: 'ITEM_UNKNOWN', path: optionPath, groupId, optionId: option.id, details: { itemId: option.linkedItemId } });
      }
      if (isOptionSoldOut(menu, stock, option)) {
        issues.push({ code: 'OPTION_SOLD_OUT', path: optionPath, groupId, optionId: option.id });
      }
      const nested = option.optionGroupIds ?? [];
      if (nested.length > 0 && depth + 1 > MAX_GROUP_DEPTH) {
        issues.push({ code: 'OPTION_DEPTH_EXCEEDED', path: optionPath, groupId, optionId: option.id });
        continue;
      }
      validateGroups(menu, nested, pick.children ?? [], optionPath, depth + 1, stock, issues);
    }
  }
}

/** Throws the first issue as a QrError. For callers that want an exception. */
export function assertValidLine(menu: MenuIndex, input: ValidateLineInput, opts: { stock?: StockState } = {}): void {
  const r = validateLine(menu, input, opts);
  const first = r.issues[0];
  if (first) throw new QrError(first.code, undefined, { issues: r.issues });
}

/** Static check of the menu: every item's groups stay within depth 2 and every link resolves. */
export function menuDepthProblems(menu: MenuIndex): string[] {
  const problems: string[] = [];
  const depthOf = (gid: string, trail: string[]): number => {
    if (trail.includes(gid)) {
      problems.push(`option group ${gid} contains itself`);
      return 0;
    }
    const g = menu.optionGroups[gid];
    if (!g) {
      problems.push(`unknown option group ${gid}`);
      return 0;
    }
    let deepest = 0;
    for (const o of g.options) {
      if (o.linkedItemId && !menu.items[o.linkedItemId]) problems.push(`option ${o.id} links to unknown item ${o.linkedItemId}`);
      for (const c of o.optionGroupIds ?? []) deepest = Math.max(deepest, depthOf(c, [...trail, gid]));
    }
    return 1 + deepest;
  };
  for (const item of Object.values(menu.items) as Item[]) {
    for (const gid of item.optionGroupIds) {
      if (depthOf(gid, []) > MAX_GROUP_DEPTH) problems.push(`item ${item.id} nests choices deeper than ${MAX_GROUP_DEPTH}`);
    }
  }
  return problems;
}
