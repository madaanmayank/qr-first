# 01. Vision and principles

## 1. What we are building

A next-generation company for India that brings diners and restaurants together. The full plan is in [00-master-plan.md](00-master-plan.md).

At its centre is a QR-first operating system for restaurants. A guest scans a code at the table or counter, orders and pays on their phone. Staff run the floor, the kitchen and the till from the same system on any tablet or phone. Diners carry one identity, their preferences and their receipts from restaurant to restaurant.

It covers what enterprise QR ordering suites cover today, and adds a built-in POS. It does this with a fraction of the configuration, in a design language that is minimal, clean and human. See [21-design-language.md](21-design-language.md).

## 2. Who it is for

| User | Job to be done | What success looks like |
| --- | --- | --- |
| Guest | Order and pay without waiting for staff | First item in cart within 30 seconds of the scan |
| Owner or manager | Get live, take orders, see money | Store live in under 15 minutes, with no vendor call |
| Floor staff | Serve tables, take walk-in orders, close bills | Any task in three taps or fewer |
| Kitchen | Know what to cook, in what order | Every order appears within 2 seconds, on screen or printer |
| Chain operator | Keep many stores consistent | One change applied to many stores in one action |

## 3. Why a new product can win

Existing suites grew by adding a setting, a flag or a variant for each customer request. The result is slow onboarding, slow change and a guest flow with too many branches. The detail is in [02-lessons-from-incumbents.md](02-lessons-from-incumbents.md).

The opportunity:

- **Onboarding in minutes.** A preset plus an AI menu import replaces weeks of back-office setup.
- **One system.** A built-in POS removes the hardest integration problem in the category: keeping a QR bill and a POS bill in sync.
- **Speed as a feature.** A pre-built menu snapshot and a small guest app load faster than suites that assemble the menu from many API calls.
- **Self-serve at small scale, consistent at chain scale.** The same store-level model serves one cafe and one thousand outlets.

## 4. Product principles

1. **Store is the unit.** Everything is configured, read and reported at store level. Chains get bulk actions, not inheritance.
2. **20 percent of settings, 80 percent of the value.** A setting exists only when real stores need different answers and no default can decide. The budget is in [04-settings-budget.md](04-settings-budget.md).
3. **Presets decide, owners adjust.** Choosing a service style (counter, table or hybrid) sets every default. Most owners never open settings again.
4. **One of everything.** One order engine, one item model, one configurator, one feedback mechanism, one theme system, one event schema, one name per concept.
5. **The guest is never blocked.** No forced login, no forced popups, no steps that exist for our benefit. Ask after value is delivered.
6. **Capability through intelligence.** New capability should arrive as a smart default (auto translation, auto recommendations, auto sold-out handling), with no new switch.
7. **Fast by construction.** Speed comes from architecture choices made on day one, covered by budgets and tests.
8. **Everything is observable.** Orders, config changes and money movements are events. Reporting, audit and analytics read the same event log.
9. **Delete before adding.** Every release removes at least as much complexity as it adds: retired flags, merged variants, dropped options.
10. **Show the real thing.** The merchant always sees what the guest will see, live, while editing.
11. **Design is a feature.** Every restaurant ends up with a guest experience that looks classy, with no design skill needed.
12. **Two sides, one trust.** The diner owns their identity; the restaurant owns its guest relationships; neither is traded to the other side.

## 5. What "enterprise level" means here

Enterprise readiness comes from reliability and control. It does not come from the number of options.

- **Scale:** thousands of stores, peak-hour bursts, no shared bottleneck between stores.
- **Reliability:** an order accepted is never lost; the POS keeps working when the internet drops.
- **Control:** roles and permissions, audit trail, bulk change with preview and rollback.
- **Compliance:** tax handling per country, consent rules per country, data export and deletion.
- **Integration:** a public API and webhooks from the first release, so accounting, delivery and loyalty tools can connect without custom work.

## 6. Non-goals

- Kiosk hardware and kiosk-specific flows.
- Delivery fleet or marketplace features.
- Replicating any vendor's settings screens, hierarchy or terminology.
- Per-customer custom builds.
- A native guest app.

## 7. One-sentence test for any proposal

"Does this let a store do more, with the same or fewer decisions, at the same or better speed?" If the answer is no on any of the three, redesign it.
