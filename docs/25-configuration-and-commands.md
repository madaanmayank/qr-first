# 25. Configuration and commands

How everything in a store is made configurable, and how every change can be made by a person in the dashboard, by an AI assistant from a typed or spoken instruction, or by an external AI agent. One mechanism serves all three.

## 1. The founder's requirement

- Every part of the experience can be turned on or off, or shaped, per store: login or no login, a feature or not, customisation, combos.
- Building these in the tool is easy and clear.
- An AI agent can make every one of those changes. An owner can give a command in plain language and have it done.

## 2. Three kinds of configurable things

| Kind | What it is | Examples | Where it lives | Home file |
| --- | --- | --- | --- | --- |
| **Settings** | A value the owner chooses | Address, tax, opening hours, guest login (off, optional, required), look | `StoreConfig.settings` | [04](04-settings-budget.md) |
| **Features** | A capability that is on or off | Ordering, call waiter, suggestions, play mode, personal welcome, ratings, split bill | `StoreConfig.features` | [04](04-settings-budget.md) |
| **Content** | Things the owner builds | Items, choices, combos, categories, tables, stories, discounts | Their own tables | [03](03-domain-model.md) |

**How this fits the simplicity rule.** Settings stay few, because each one asks the owner to decide a value. Features are simple switches with a sensible default from the preset, so an owner who never opens the Features page still gets a complete product. Content is the restaurant's own material.

## 3. Feature registry

Every guest-facing or staff-facing capability beyond the core flow is a **feature**: one entry in a registry, defined in code once.

```ts
defineFeature({
  key: 'callWaiter',
  name: { en: 'Call waiter', hi: 'वेटर बुलाएँ' },
  explain: { en: 'Guests at a table can ask for water, the bill or help.' },
  group: 'at_the_table',
  default: { counter: false, table: true, hybrid: true },
  requires: ['tableSpots'],        // shown as unavailable with a reason if unmet
  surfaces: ['guest.orderStatus', 'guest.menu', 'staff.floor'],
  preview: 'guest.menu',           // where the live preview jumps when toggled
  plan: 'full',                    // which plan includes it; never changes behaviour
})
```

Rules:

1. **A feature is on or off.** It has no sub-options. If a feature needs a value, that value is a setting and must pass the five tests in file 04.
2. **A feature declares everything about itself** in the registry entry: names, plain explanation, default per preset, dependencies, the surfaces it touches, and where the preview should jump.
3. **Registration is the only step.** A registered feature appears automatically on the Features page, in the API, in the command catalogue, in the AI assistant's tools and in the docs list. No extra wiring.
4. **Off means absent.** When a feature is off, guests and staff see no trace of it and no empty space.
5. **Features are independent.** Turning one off never breaks another. Dependencies are declared and shown in plain words.
6. **Every feature has a reader.** CI fails if a feature key is not checked by production code, and if a feature has no on and off test.
7. **Core flow is not a feature.** Showing the menu, prices, veg marks, tax lines and the bill cannot be turned off.

The current feature list is in file 04.

## 4. Building choices and combos

Customisation and combos are content, built in one place with one concept: **choices**.

- A **choice group** has a name, a rule ("Choose 1", "Choose up to 3", "Optional") and options. Options have a name and a price change, or point to another item.
- **Starters** make the common cases one tap: Sizes, Add-ons, Spice level, Half or full, Make it a combo.
- A **combo** is an item with choice groups whose options are other items. "Make it a combo" asks three things: which items or categories to choose from, how many, and the combo price.
- Choice groups are reusable. Edit once, update everywhere.
- The live preview shows the item sheet as the owner builds.
- Stores that want neither can switch off the features `choices` or `combos`; existing content is kept and hidden.

## 5. Commands

**Every change to a store is a command.** The dashboard never writes data directly; it sends commands. So does the assistant, and so does any external agent.

```ts
Command {
  type: 'feature.set' | 'setting.set' | 'menu.item.create' | ...
  storeId
  payload            // validated by the command's schema
  actor              // person, assistant on behalf of a person, or agent key
  mode: 'preview' | 'apply'
  idempotencyKey
}
```

### Lifecycle

1. **Validate** against the schema and the store's current state.
2. **Preview:** return the exact diff in plain words, the affected guest surfaces, and a draft the live preview can show. Nothing is saved.
3. **Apply:** save in one transaction, write an event, update the draft or publish as the command defines.
4. **Undo:** every command has an inverse. The history shows each change with who made it and one-tap undo.

### Catalogue

| Area | Commands |
| --- | --- |
| Settings | `setting.set` |
| Features | `feature.set` |
| Look | `look.set`, `look.setAccent`, `look.setAppearance`, `cover.set`, `welcomeNote.set` |
| Menu | `menu.category.create/update/delete/reorder`, `menu.item.create/update/delete/move`, `menu.item.setSoldOut`, `menu.option.setSoldOut`, `menu.item.setPrice`, `menu.bulkEdit`, `menu.enrich.run`, `menu.item.setCourse`, `menu.item.setNutrition`, `menu.item.setHouseNote`, `menu.publish`, `menu.restoreVersion` |
| Choices | `choices.group.create/update/delete`, `choices.attach`, `choices.detach`, `combo.create` |
| Spots and QR | `spot.create/update/delete`, `spot.createRange` |
| Team and devices | `staff.invite/update/deactivate`, `device.pair/remove`, `station.create/update` |
| Growth | `discount.create/update/end`, `story.create/delete`, `reward.set` |
| Service | `tab.*`, `round.*`, `payment.*` (the ordering engine's own commands, see file 03) |

- The catalogue is generated from code. `GET /v1/commands` returns every command with its JSON schema, description and required role, so any system can discover what is possible.
- Compound commands (for example `combo.create`) are sugar over basic ones and expand into them.

## 6. Three ways to run a command

| Way | Who | How it works |
| --- | --- | --- |
| **Dashboard** | Owner or manager | Controls on screen send commands. The preview updates before saving |
| **Assistant** | Owner or manager, by typing or speaking | "Turn off login", "Add a chai and samosa combo at 120", "Mark paneer tikka sold out", "Make the menu dark". The assistant turns the request into a list of commands, shows the preview and the plain-words summary, and applies on confirmation |
| **Agent** | An external AI agent or script | Uses the same commands through the API or an MCP server, with an agent key that carries scopes and limits |

All three produce the same events and appear in the same history.

## 7. Assistant behaviour

- **Plan, show, confirm, apply.** The assistant always shows what it will change before applying, with the live preview updated to the proposed state.
- **Plain summary.** "I will turn off guest login. Guests will go straight to the menu." Followed by Apply and Cancel.
- **Asks when unclear.** "Which samosa: Aloo Samosa or Paneer Samosa?"
- **Batches safely.** "Raise all coffee prices by 10" becomes one bulk command with a list of affected items shown first.
- **Knows the store.** It reads the menu, settings, features and recent history, so it can answer "what changed yesterday" and "why is the bill showing service charge".
- **Works in English and Hindi,** by text and by voice.
- **Can be told to act without asking** for chosen low-risk commands (for example sold out). This is a per-person preference.
- **Never invents.** It can only produce commands from the catalogue.

## 8. Agents and permissions

| Control | Detail |
| --- | --- |
| **Agent keys** | Created by the owner in the dashboard, per store or per account, with a name and an expiry |
| **Scopes** | Read only; menu; features and settings; look; service; reports. Granted individually |
| **Risk tiers** | Each command has a tier. **Low:** sold out, descriptions, reorder. **Medium:** prices, features, publish. **High:** tax, payment methods, payout account, team, closing the store |
| **Approval rules** | Low applies directly. Medium applies directly for a person and by default needs approval for an agent. High always needs the owner, in the dashboard, and is never available to agents |
| **Approval inbox** | Proposed changes from agents wait in one list with their preview. The owner approves or rejects from the dashboard or WhatsApp |
| **Limits** | Rate limits and a per-day change cap per key |
| **Dry run** | Any command can be sent in `preview` mode |
| **Audit** | History shows "Changed by the assistant for Asha" or "Changed by agent: Pricing bot", with undo |
| **Kill switch** | The owner can pause all agent keys in one tap |

- An MCP server exposes the command catalogue and read tools, so current AI agent frameworks can connect without custom work.
- Guest-side AI (the waiter character) uses a separate, much smaller tool list and can never run store commands.

## 9. What this requires of every builder

1. **No direct writes.** All UI changes go through commands.
2. **Every command has:** a schema, a description in plain words, a risk tier, a preview function and an inverse.
3. **Every feature is registered** and has on and off tests.
4. **Every control in the dashboard has a command.** If a person can do it, the assistant and an approved agent can do it.
5. **Descriptions are written for people and for models.** They state what the command does, when to use it and what it affects.
6. **The live preview accepts a proposed state,** so assistant and agent proposals can be shown before they are applied.

## 10. Acceptance checks

- Every control on every dashboard screen maps to a catalogued command (checked by a test that walks the UI).
- A scripted agent sets up a complete store from an empty account using only commands.
- The assistant completes these in one request each, with a correct preview: turn login off; make login required; switch call waiter on; add a size choice to an item; create a combo from two categories; mark an item sold out; change the look to dark; raise a category's prices by a percentage.
- Undo restores the previous state exactly for every command type.
- A high-tier command sent with an agent key is refused.

## Changes

- 14 Nov 2026: file created at the founder's request: everything configurable, and operable by AI.
