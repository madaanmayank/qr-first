# Platform foundation (milestones M0 and M1)

Non-UI foundation for the QR-first platform. Two packages, no database, no UI, no I/O in the engine. Built against the specs in `../docs` (see `NOTES.md` for every conflict and gap found).

| Package | What it is |
| --- | --- |
| `packages/contracts` (`@qr-first/contracts`) | Zod schemas and types shared by every client and the server: StoreConfig, feature registry, commands, events, errors, menu and tab types, pricing wire types |
| `packages/engine` (`@qr-first/engine`) | Pure functions: pricing, line validation, stock checks, soft holds, tab and round state machines, idempotency, menu snapshot |

TypeScript strict mode, Zod 4, Vitest 5, npm workspaces. pnpm is not installed on this machine, so npm workspaces are used (docs/17 names pnpm and Turborepo; nothing here depends on either).

## Run

```bash
npm install          # local only, nothing global
npm test             # all tests (vitest run)
npm run check-docs   # fails if docs/04 and the schema or registry differ
npm run typecheck    # tsc --noEmit on both packages
npm run check        # typecheck, check-docs and tests together
```

`check-docs` reads `../docs/04-settings-budget.md`. Set `QR_DOCS_DIR` to point it at another docs folder.

## What `check-docs` checks

- Setting keys in docs/04 section 2 equal `SETTING_KEYS` (same keys, same order, same group counts, numbering).
- Feature keys in docs/04 section 3 equal the registry (same keys, order, owner-facing names, groups, plain on and off defaults per preset; conditional defaults need a `defaultWhen`).
- The stated settings budget (20), settings count (18) and features count (22).
- Every setting and feature key has an entry in `packages/contracts/readers/readers.ts`. Until production code reads the key the entry is a placeholder, and `readers.test.ts` carries a `todo` test for it. Switch the entry to `{ status: 'read', file }` and write the real on and off test when the reader exists.

## contracts: public API

Configuration
- `StoreConfigSchema`, `SettingsSchema`, `FeaturesSchema`, `SETTING_KEYS`, `SETTING_GROUPS`, `SETTINGS_BUDGET`
- `PRESET_SETTINGS`, `PRESETS_FULL`, `PRESET_SPOTS`, `presetFeatures(preset, facts)`
- `createStoreConfig(onboarding)`, `reapplyPreset(config, preset, facts)`, `deriveFromAddress(address)`

Features
- `defineFeature(def)`, `FEATURES` (by key), `FEATURE_LIST`, `FEATURE_KEYS`
- `unmetRequirements(key, facts)`, `featureDefault(key, preset, facts)`, `DEFAULT_FACTS`

Commands
- `COMMANDS`, `getCommand(type)`, `defineCommand(def)`, `describeCatalogue()` (the data behind `GET /v1/commands`)
- `CommandEnvelopeSchema`, `executeCommand(envelope, state, { role })`, `runSequence(cmds, state)`, `gate(risk, actor)`, `riskOf(def, payload)`
- First catalogue: `setting.set`, `feature.set`, `menu.item.setSoldOut`, `choices.group.create`, `combo.create`. Menu enrichment commands (all low risk, never touch prices): `menu.item.setCourse`, `menu.item.setNutrition`, `menu.item.setHouseNote`. Supporting commands that `combo.create` expands into and that make inverses possible: `menu.item.create`, `menu.item.delete`, `choices.group.delete`, `choices.attach`, `choices.detach`.

Menu, pricing and tab types
- `ItemSchema`, `OptionGroupSchema`, `OptionSchema`, `CategorySchema`, `SelectionSchema`, `CartLineSchema`, `StockStateSchema`, `MenuIndex`
- `PricedTabSchema`, `PricedLineSchema`, `TaxLineSchema`, `ChargeSchema`, `DiscountSchema`, `TipInputSchema`, `TaxClassDefSchema`
- `TabSchema`, `RoundSchema`, `LineSchema`, `PaymentSchema`

Enrichment and the waiter's tools
- `mergeAiTag(existing, aiValue)`: pure; an owner value is never overwritten by an AI value, and an AI value can never become an owner value. `tagFrom(value, source)` reads a plain field with its provenance (no provenance counts as owner)
- `ItemSchema` carries `course`, `spice`, `nutrition`, `houseNote`, plus `courseSource` and `spiceSource` for provenance
- `WAITER_TOOLS`, `WAITER_TOOL_NAMES`, `describeWaiterTools()`, `SERVICE_REQUEST_REASONS`: the fixed seven-tool list from docs/26 section 5. No tool is a store command; anything that changes the cart or creates a request only proposes and waits for one guest tap

Events and errors
- `EventEnvelopeSchema`, `EVENT_TYPES`, `GUEST_EVENT_TYPES`, `ActorSchema`, `makeEvent`
- `ERROR_CODES`, `ErrorBodySchema`, `QrError`, `LineStockResultSchema` (per-line `ITEM_SOLD_OUT` and `OPTION_SOLD_OUT` with `alternatives`), `AlternativeSchema`, `LineIssueSchema`

## engine: public API

Money
- `roundDiv`, `roundToRupee`, `allocate` (largest remainder), `percentToBp`

Pricing (docs/03 section 5, docs/15)
- `priceTab(tab, ctx)` returns a `PricedTab` in integer paise: lines with option deltas, takeaway price, discounts, optional service charge (default 0), CGST and SGST by tax class, alcohol on a separate state VAT class, tip, and round off to the nearest rupee as its own line
- `resolveLine`, `snapshotLine`, `defaultTaxClasses`

Lines (invariant 7)
- `validateLine(menu, { itemId, qty, selections }, { stock })` returns every issue with a path. `assertValidLine`, `menuDepthProblems`, `isItemSoldOut`, `isOptionSoldOut`

Stock (docs/09 "Stock in real time", docs/05 section 1c)
- `checkStock(cart, stock, menu, options)` returns the per-line results with `alternatives` and price differences. The `similarItems` option is the suggestion hook; `defaultSimilarItems` is the default (same course and diet, in stock, not already in the cart)
- `priceCartWithStock(cart, stock, ctx)` leaves sold-out lines out of the total and returns their struck-through prices
- `swapOption`, `swapItem`, `removeLine` (the one-tap fixes, each returns a new cart)
- Soft hold for pay-first tabs, 5 minutes by default (D21): `holdForCart`, `startHold`, `releaseHold`, `expireHolds`, `isHoldActive`, `DEFAULT_HOLD_MS`

State machines (docs/03 sections 5 and 9)
- `ROUND_TRANSITIONS`, `TAB_TRANSITIONS`, `PAYMENT_TRANSITIONS`, `canTransitionRound`, `canTransitionTab`, `canTransitionPayment`
- Tab: `openTab`, `joinOrOpenTab`, `newAggregate`, `closeTab`, `voidTab`
- Round: `createRound`, `editDraftRound`, `discardDraftRound`, `sendRound`, `sendCoveredRounds`, `advanceRound`, `voidRound`, `voidLine`
- Payment: `createPayment`, `settlePayment`
- Totals: `priceAggregate`, `tabBalance`, `paidTotal`
- Checks: `invariantProblems(aggregate, ctx)`, `spotInvariantProblems(tabs)`
- Idempotency: `lookupKey`, `recordKey`, `fingerprintOf`. Replays return the first result; the same key with a different request throws `IDEMPOTENCY_KEY_REUSED`

Courses, suggestions and compare (docs/05 sections 1c, 1d, 1f)
- `completionGaps(cart, menu)`: the missing courses for the table, most useful first, with reason codes (`main_without_drink`, `meal_without_dessert`, `single_course`). A combo takes the courses of its parts
- `suggestNext(cart, menu, stock, context)`: one suggestion or null. Never sold out (nor an item whose required choices are all sold out), never in the cart (combo parts included), never alcohol, veg only for a veg guest, dessert only at stage `late` or `bill`. Skeleton: shareable dishes and time-window popularity are not built
- `compareVerdict(itemA, itemB)`: the one-line verdict from stored calories and protein only, with the facts for translation; no verdict when numbers are missing; never says which is healthier overall. `defaultCompareWith(item, menu, stock)`
- `coursesInCart`, `itemIdsInCart`, `isOrderable`

Snapshot (invariant 8)
- `publishSnapshot(menu, config, previous)`, `verifySnapshot`, `sha256Hex`

Every transition returns `{ aggregate, events, result, replayed }`, so the caller writes the events and the new state in one transaction.

## Conventions the code follows

- Money is integer paise everywhere. Rates are basis points inside the engine.
- The engine takes `EngineContext` (`config`, `menu`, optional tax class table and state VAT rate, `now`). It never reads a clock, a database or a network.
- `checkStock` takes the menu as a third argument because alternatives need the option groups.
- `apply` on a command is pure and does not bump the config version. The config module (M2) bumps it on write, so undo restores content and is itself a new version.
- Undoing `feature.set` to on re-checks requirements, so it can be refused if a table was deleted in between.

## Tests

`npm test` runs 323 tests (plus 40 reader placeholders as `todo`):

- Pricing: 41 table-driven cases with hand-computed paise (three-part combo with a nested option, alcohol on the VAT class, inclusive and exclusive GST, discounts, service charge, tip, round off) plus identity checks on every case.
- Stock: item sold out, option sold out inside a customised line, both breads sold out, restock, item and option swaps changing the total, sold-out line excluded from the total, soft hold start, cover, expiry, release and replay.
- Every invariant in docs/03 section 9 has its own `describe` block in `packages/engine/test/state.test.ts`.
- Enrichment: `mergeAiTag` (owner wins, AI never becomes owner), the three menu commands with exact undo, the waiter tool list, `completionGaps` (every rule in docs/05 section 1f), `suggestNext` (including a property test over every pair of items and three stock states), and `compareVerdict` (grid test that it never claims a winner overall).
- Contracts: config schema and presets, registry, command previews and exact undo, approval rules, error and event envelopes, and `check-docs` failing on seven kinds of drift.

## Not built here (out of scope for M0 and M1)

Opening-hours enforcement, availability windows, age confirmation, invoice numbering and credit notes, the database, the API and the apps. `STORE_CLOSED` exists as an error code with no engine function behind it yet.
