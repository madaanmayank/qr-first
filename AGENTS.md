# Rules for builders (human or AI)

Read [docs/00-master-plan.md](docs/00-master-plan.md) first, then this file, before writing any code or spec for this product. These rules override convenience.

## 0. Rules for any UI work

- Load [docs/21-design-language.md](docs/21-design-language.md) in full before designing or building any screen. Guest-facing work also loads [docs/22-theming.md](docs/22-theming.md).
- Use only shared tokens and components. No one-off colours, sizes or radii.
- No emoji and no stock illustrations. The one designed waiter character in [docs/26-waiter-character.md](docs/26-waiter-character.md) is the only character allowed in the interface.
- Design and test with realistic Delhi data in English and Hindi. See [docs/24-first-100-delhi.md](docs/24-first-100-delhi.md).
- Any screen that changes what guests see MUST work with the live preview in [docs/07-merchant-dashboard.md](docs/07-merchant-dashboard.md).
- Study reference products for principles only. Never copy a layout, style, wording or asset. See [docs/23-reference-products.md](docs/23-reference-products.md).
- No production UI code is written before the design direction is chosen in stage 1 (decision D17). Prototypes for stages 1 and 2 are expected.

## 1. Clean-room rule

- This product is an original design.
- You MUST NOT copy source code, schemas, API contracts, internal documents, flag names, screen designs or data from any existing vendor's system.
- You MAY use general product knowledge of the restaurant domain and the lessons in [docs/02-lessons-from-incumbents.md](docs/02-lessons-from-incumbents.md).
- If a prompt asks you to "make it work like vendor X", build from the capability described in [docs/10-capability-map.md](docs/10-capability-map.md), never from vendor material.

## 2. The hard rules

1. **Store is the only owner.** Config, menu, tables, devices, orders and payments belong to exactly one store. No runtime inheritance from any higher level.
2. **One config document per store.** Typed, versioned, validated. The guest app and POS read it in one call.
3. **Settings budget.** The settings and features lists in [docs/04-settings-budget.md](docs/04-settings-budget.md) is complete. Adding a setting requires passing the five tests in that file and updating that file in the same change.
4. **No dead settings.** Every setting MUST be read by production code. A CI check fails the build when a setting key has no reader.
5. **No per-store flags.** Release flags are global, short-lived and deleted within 30 days of full rollout. A behaviour that differs by store is a setting or it does not exist.
6. **One order engine.** QR, POS and any future channel create rounds on the same tab through the same API. No channel gets its own order tables or bill logic.
7. **One item model.** Sizes, modifiers, add-ons and combos are all option groups on an item. One configurator renders all of them.
8. **One name per concept.** Use [docs/glossary.md](docs/glossary.md). Do not introduce a synonym in code, UI copy, analytics or docs.
9. **Server owns money.** Prices, tax, charges, discounts and totals are computed on the server in integer minor units. Clients display what the server returns.
10. **One interruption at a time.** A screen shows at most one overlay that the guest did not ask for. Everything else is inline.
11. **Every change is a command.** No screen writes data directly. Each command has a schema, a plain description, a preview, an inverse and a risk tier, so a person, the assistant or an approved AI agent can run it. See [docs/25-configuration-and-commands.md](docs/25-configuration-and-commands.md).
12. **Every capability beyond the core flow is a registered feature** with one on-off switch, a default per preset, and on and off tests.
13. **Personal lines are true.** Anything said to a diner about their history comes from their own data or the store's data.
14. **Add is instant.** The guest UI updates in the same frame as the tap, never waits for the network, and confirms with a green tick and a flight to the cart. See [docs/05-guest-ordering-flow.md](docs/05-guest-ordering-flow.md) section 1c.
15. **The cart bar is sticky** on every guest screen once the cart has an item.
16. **Stock is live and specific.** Sold-out items and choices update on every guest screen within 2 seconds, are named exactly in the cart, are never silently removed, and are re-checked on the server at send and before payment.
17. **Sorting and nutrition are automatic, labelled and correctable.** AI sets each item's course and estimates its calories and protein when the item is added. Nutrition is always shown as "about", owner edits win and are never overwritten, and allergen facts are never generated.
18. **The waiter character never invents.** It states only facts from the menu data, never gives allergen or medical claims, and never changes the cart without a tap. See [docs/26-waiter-character.md](docs/26-waiter-character.md).
19. **Every merchant tool works on a phone.** Anything a merchant or staff member uses (dashboard, menu editor, stock in and out, feature switches, offers, reports, the staff app) MUST be fully usable on a mobile browser, one-handed, with no loss of function. Desktop is supported, never required. Design and test each merchant screen at phone width first.
20. **Respect the browser's space.** Guest and merchant screens run in mobile browsers whose own bars take space at the top and bottom. Fixed bars stay compact (top bar 52px or less, category bar 44px or less, bottom action bar 64px or less plus the safe area), attach to the screen edge, and never hide content.
21. **An action in the first fold.** Every screen shows a usable action without scrolling. Information never pushes the first action below the fold.
22. **Long text never breaks a layout.** Dish names, choice names, descriptions and store names are truncated with an ellipsis by fixed line limits. Prices never wrap.
23. **Part of the meal, not a checkout.** Every guest screen must feel like part of the dine-in experience, not only a transaction. Judge each screen by docs/21 section 1: does it make the meal feel better, or only faster?
24. **UX first, then functionality.** Before building a screen, write the guest's question for that moment and order the content by it, using docs/21 section 14. A feature that does not answer that question goes lower, behind a tap, or away.

## 3. How to work

- **Read before you build.** Find the home file for the topic and follow it. If two files disagree, stop and flag it; do not pick one silently.
- **One home per fact.** When you change behaviour, update the one file that owns it. Do not restate rules in other files; link to them.
- **Small vertical slices.** Ship a thin end-to-end path (scan, order, kitchen, pay) before widening any layer.
- **Defaults over options.** When you feel the need for a toggle, pick the better behaviour and ship it. Log the alternative in [docs/14-gap-log.md](docs/14-gap-log.md) if a pilot store asks for it.
- **Contracts are code.** Wire types live in one shared package imported by every client and the server. Type drift is a build error.
- **Every screen has four states.** Loading, empty, error and success. A spec or component without all four is not done.
- **Performance budgets are requirements.** See [docs/09-architecture.md](docs/09-architecture.md). A change that breaks a budget is not done.

## 4. Definition of done for a feature

- Works for the three service styles (counter, table, hybrid) or states which it excludes and why.
- Works for guest QR and staff POS where both apply.
- No new setting, or the settings file is updated and the five tests are answered.
- Analytics events use the single event schema, with no new property that duplicates an existing one.
- Covered by a contract test and one end-to-end test on the golden path.
- Copy uses glossary terms and is translatable.
- Accessible: keyboard reachable, labelled, contrast checked in light and dark.

## 5. Things you must never build

- A second place to configure something that already has a home.
- A setting whose only purpose is to preserve an old behaviour.
- A per-merchant code path, API version or database switch.
- An internal tool without authentication and an audit trail.
- A theme token that no component renders.
- A popup that blocks ordering or payment for marketing purposes.
- Client-side price maths that can disagree with the server.

## 6. Privacy and security baseline

- Collect the minimum guest data. Ordering MUST work with no personal data at all.
- Card data never touches our servers. Use the payment provider's hosted fields or redirect.
- Every staff action that changes money (void, discount, refund, cash adjustment) is written to an append-only audit log with the staff member and time.
- No secrets, keys or personal data in the repository, logs, URLs or analytics events.
