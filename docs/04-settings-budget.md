# 04. Settings and features

This file is the complete list of what can be configured on a store, apart from content. If a behaviour is not listed here, it is not configurable.

There are two lists:

- **Settings:** values the owner chooses. **Budget: 20 maximum. Current count: 18.**
- **Features:** capabilities that are on or off. **Current count: 22.** Each has a sensible default from the preset.

This file is the only place these counts are stated. How features and commands work is in [25-configuration-and-commands.md](25-configuration-and-commands.md).

## 1. How a store gets configured

1. The owner enters the store name and address.
2. The system derives country, state, currency, timezone, tax defaults, consent rule and languages from the address.
3. The owner picks a **service style** preset: Counter, Table or Hybrid.
4. The preset fills every other setting and switches every feature on or off.
5. The owner adds a menu and, later, connects payments.

An owner who never opens Settings or Features still has a complete, working store. Every item below can also be changed by the assistant or an approved agent.

## 2. Settings

### Identity and look (5)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 1 | `name` | text | from onboarding | Shown to guests |
| 2 | `address` | address | from onboarding | Drives country, state, currency, timezone, tax defaults, consent rule |
| 3 | `logo` | image | none | Falls back to the store name in the look's display type |
| 4 | `theme` | look + accent colour + appearance (light, dark, follow device) | proposed by "Match my brand" | See [22-theming.md](22-theming.md) |
| 5 | `coverMedia` | image or video | none | Shown at the top of the menu when present |

### Service (4)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 6 | `serviceStyle` | counter / table / hybrid | from onboarding | Changing it re-applies preset values after a preview |
| 7 | `orderTypes` | set of dine_in, takeaway | preset | With one type, the guest is never asked |
| 8 | `payTiming` | per order type: before_kitchen / at_end | preset | The only "pay first or pay later" control |
| 9 | `openingHours` | weekly schedule + exceptions | always open | Outside hours the menu is browsable and ordering is off |

### Money (4)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 10 | `tax` | registration type + rate + inclusive / exclusive | from the GST question at onboarding | Item tax classes cover exceptions |
| 11 | `serviceCharge` | percent | 0 | In India it is shown as optional and removable. See file 15 |
| 12 | `paymentMethods` | set of connected methods | cash and UPI at counter | Online methods appear once the provider account is connected |
| 13 | `payoutAccount` | provider connection | none | Managed in the provider's hosted onboarding. Owner only |

### Guest (2)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 14 | `guestLogin` | off / optional / required | optional | Off: no sign-in anywhere. Optional: offered after value. Required: asked before ordering |
| 15 | `languages` | list | English + the state's main language | Translations are generated |

### Kitchen (1)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 16 | `stations` | list of stations + category routing | one station "Kitchen" | Each station maps to a screen or printer |

### After the order (2)

| # | Key | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| 17 | `reviewLink` | URL or place id | found from the address when possible | Used by the review prompt |
| 18 | `receiptContact` | phone or email for store-side alerts | owner's phone | |

## 3. Features

Each feature is one switch. "Default" shows Counter / Table / Hybrid.

### Ordering and paying

| # | Key | Name shown to owners | What it does | Default |
| --- | --- | --- | --- | --- |
| 1 | `ordering` | Order from the phone | Guests add items and send orders. Off gives a menu-only store | On / On / On (off for stores starting on the free menu) |
| 2 | `scanToPay` | Pay the bill by QR | Guests pay their bill by UPI from the phone | On once payments are connected |
| 3 | `choices` | Customisation | Sizes, add-ons and other choices on items | On |
| 4 | `combos` | Combos | Items made of other items | On |
| 5 | `kitchenNote` | Notes to the kitchen | A short note per item | On |
| 6 | `splitBill` | Split the bill | Equal, by item or by amount | Off / On / On |
| 7 | `tips` | Tips | Tip choices at payment | Off / On / On |
| 8 | `autoAccept` | Accept orders automatically | Off adds a staff accept step | On |

### Personal and engaging

| # | Key | Name shown to owners | What it does | Default |
| --- | --- | --- | --- | --- |
| 9 | `personalWelcome` | Personal welcome | Greets known diners by name, shows their usual and last order | On |
| 10 | `suggestions` | Personal suggestions | Suggestions with a reason, from the diner's taste and the store's data | On |
| 11 | `playMode` | Play to order | A game-like way to choose a meal | On |
| 12 | `waiter` | Waiter assistant | A friendly character guests can ask about dishes, compare items with and get suggestions from. See [26-waiter-character.md](26-waiter-character.md) | On |
| 13 | `vegFilter` | Vegetarian filter | A veg-only switch on the menu, remembered per diner | On |
| 14 | `stories` | Stories | Short photos and videos with tagged dishes | On when stories exist |
| 15 | `rewards` | Visit stamps | A simple reward the owner defines | Off |

### At the table

| # | Key | Name shown to owners | What it does | Default |
| --- | --- | --- | --- | --- |
| 16 | `callWaiter` | Call waiter | Guests ask for water, the bill or help | Off / On / On |
| 17 | `partySize` | Ask party size | One question when the first order is sent | Off / On / Off |

### After the meal

| # | Key | Name shown to owners | What it does | Default |
| --- | --- | --- | --- | --- |
| 18 | `ratings` | Ratings | One-tap rating after the visit | On |
| 19 | `reviewPrompt` | Public review prompt | Happy guests are offered the review link | On when a review link exists |
| 20 | `whatsappReceipts` | WhatsApp receipts | Receipt sent on WhatsApp at payment | On once messaging is connected |

### Know your food

| # | Key | Name shown to owners | What it does | Default |
| --- | --- | --- | --- | --- |
| 21 | `nutrition` | Nutrition at a glance | Shows about how many calories and how much protein a dish has, as soon as a guest opens it | On |
| 22 | `compare` | Compare dishes | Guests put two dishes side by side | On |

## 4. Presets

| | Counter | Table | Hybrid |
| --- | --- | --- | --- |
| Order types | Dine-in, Takeaway | Dine-in | Dine-in, Takeaway |
| Pay timing, dine-in | Before kitchen | At end | Before kitchen |
| Pay timing, takeaway | Before kitchen | n/a | Before kitchen |
| Spots created | 1 counter, 1 pickup | Tables 1 to N | 1 counter + tables |
| Features that differ | Split bill, tips, call waiter, party size off | All on except rewards | Party size off |

## 5. Things that are content

Managed where the content lives. They are not settings or features.

- Menu: categories, items, choices, combos, photos, tags, availability, sold out.
- Spots and QR codes. Devices. Team members.
- Welcome note, stories, discounts, reward definition.
- Each team member's own preferences (language, which alerts they receive).

## 6. Decided by the system, never configurable

| Concern | How the system decides |
| --- | --- |
| Fonts, sizes, spacing, layouts, component colours | Owned by the chosen look |
| Item card layout | Adapts to content |
| Order of prompts and overlays | Central priority list in [05-guest-ordering-flow.md](05-guest-ordering-flow.md) |
| Item sheet behaviour (advance, validation) | One rule set in the same file |
| System copy and labels | One translatable catalogue |
| Tab and invoice numbering | Automatic |
| Consent default | Country rule |
| Sold-out placement, popularity, recommendation ranking | Derived from live data |
| Polling intervals, cache times, API versions | Engineering constants |
| Age confirmation for alcohol | Item tag plus state rule |
| Veg and non-veg marks, tax lines, prices on the bill | Always shown |
| Course of each item (starter, main, dessert, drink) | AI sets it when the item is added; the owner can edit |
| Nutrition estimates and spice level | AI estimates them; the owner can confirm or edit |

## 7. Tests for a new setting

A new setting is accepted only when all five answers are yes.

1. **Real divergence.** At least three unrelated stores need a different answer, with evidence in the gap log.
2. **No default can decide.** The system cannot infer the answer from the address, the service style, the menu or live data.
3. **Owner can answer.** An owner answers correctly in under ten seconds without training.
4. **One reader, one home.** It is read in one place in the engine and shown on one screen.
5. **Budget.** The count stays at or under 20, or a setting is removed.

## 8. Tests for a new feature

1. **It is a capability a guest or staff member can see.** Internal behaviour is never a feature switch.
2. **On or off only.** No sub-options.
3. **A good default exists** for each preset.
4. **Off leaves no trace** and breaks nothing else.
5. **One plain sentence explains it** to an owner.
6. **It has on and off tests** and a preview target.

A request that fails these becomes a default change, content, or a declined entry in [14-gap-log.md](14-gap-log.md).

## 9. Engineering rules

- Both lists are generated from the `StoreConfig` schema and the feature registry. This file and the code MUST match; a CI check compares them.
- Every setting and feature key has a default and at least one reader in production code. A key with no reader fails CI.
- Every change is a command with preview, history and undo. See file 25.
- Clients receive settings and features inside the menu snapshot. There is no second settings API for the guest app.
- Per-store release flags do not exist. A feature switch is the only per-store on or off.

## Changes

- 14 Nov 2026: features now 22. `menuAssistant` became `waiter` (the waiter character). Added `nutrition` and `compare`. Course sorting is automatic and is not a feature switch.
- 14 Nov 2026: split into settings (18, cap 20) and features (20 switches) at the founder's request for everything to be configurable. On-off settings moved to features. Added `personalWelcome`, `suggestions`, `playMode`, `menuAssistant`, `vegFilter`, `stories`, `rewards`, `callWaiter`, `splitBill`, `ratings`, `reviewPrompt`, `whatsappReceipts`, `choices`, `combos`, `scanToPay`.
- 14 Nov 2026: `theme` replaced `brandColor`.
- 10 Nov 2026: `ordering` added for the free-menu entry.
