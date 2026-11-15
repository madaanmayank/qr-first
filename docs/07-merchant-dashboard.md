# 07. Merchant dashboard

The owner and manager's home: one web app for phone and laptop. It replaces the large back offices of incumbent suites with a small set of calm screens, and it always shows the merchant what guests will see.

What the merchant is offered is in [20-merchant-offer.md](20-merchant-offer.md). Visual rules are in [21-design-language.md](21-design-language.md). Looks are in [22-theming.md](22-theming.md).

## 1. Design goals

- **Live in 10 minutes** from sign-up to a published, good-looking menu, with no help.
- **Phone first.** Every task works one-handed on a phone, including marking items in or out of stock, editing the menu, switching features and sending offers. Nothing is desktop-only. The laptop layout adds space and a permanent preview. See rule 19 in [AGENTS.md](../AGENTS.md).
- **See what guests see.** A live preview of the real guest experience sits beside every screen that changes it.
- **One home per task.** No task needs two screens. No setting lives in two places.
- **Plain words.** The dashboard reads like a helpful colleague.
- **English and Hindi** from day one, chosen at sign-up and switchable.

## 2. Layout

### Laptop

```
┌────────────┬──────────────────────────────────┬─────────────────┐
│ Navigation │ Work area                        │ Live preview    │
│            │ (the task)                       │ (phone frame)   │
│ Home       │                                  │                 │
│ Menu       │                                  │  real guest app │
│ Look       │                                  │  on draft data  │
│ Features   │                                  │                 │
│ QR         │                                  │                 │
│ Reviews    │                                  │ [Menu|Item|Bill]│
│ Money      │                                  │ [Light|Dark]    │
│ Reports    │                                  │ [Open on phone] │
│ Team       │                                  │                 │
│ Settings   │                                  │                 │
└────────────┴──────────────────────────────────┴─────────────────┘
```

- The preview column appears on Menu, Look, QR, Settings and onboarding. Other screens use the full width.
- The preview can be collapsed, and popped out to a second window.

### Phone

- Bottom bar: **Home, Menu, Orders or Money, More**. The third item changes with the store's stage (Reviews in 1A, Money in 1B, Orders in 1C).
- A floating **Preview** button on screens that affect guests. It opens the preview full screen; a swipe returns to editing.
- Edits made while the preview is open appear in it on return.

## 3. Live preview

| Rule | Detail |
| --- | --- |
| **It is the real product** | The preview runs the actual guest app against a draft snapshot of the store. It is never a mock-up |
| **Instant** | A change in the work area shows in the preview within one second |
| **Follows the work** | Editing an item scrolls the preview to that item and opens its sheet. Editing the cover shows the top of the menu |
| **Draft and live** | Edits are a draft until "Publish". The preview shows the draft. A small label states "Draft" or "Live" |
| **Tap to edit** | Tapping an element in the preview selects it in the work area |
| **Screens** | Menu, item sheet, cart, bill, order status, store page |
| **Modes** | Light and dark; English and Hindi; phone and printed QR tent |
| **On a real phone** | "Open on my phone" shows a QR for the draft. The owner scans it and holds the result in hand |
| **Share** | A preview link that expires, for partners and designers |
| **Other previews** | Kitchen ticket, printed bill and WhatsApp receipt each have a preview where they are configured |

## 4. Sign-up and first run

The first ten minutes. Each step is one screen.

| Step | Owner does | System does | Preview shows |
| --- | --- | --- | --- |
| 1 | Enters phone number, verifies by WhatsApp or SMS code | Creates account | - |
| 2 | Types the restaurant name; picks it from map suggestions or enters the address | Derives state, tax defaults, languages; fetches public details where available | A blank store page with the name |
| 3 | Photographs or uploads the menu | Reads it, with live progress in words ("Found 86 items in 9 categories") | The menu filling in, category by category |
| 4 | Reviews the flagged items only (uncertain prices, veg marks) | Shows a short review list, most uncertain first | Each fix updating |
| 5 | Adds a logo and a photo of the space, or skips | Proposes three looks through "Match my brand" | Three options; tap to apply |
| 6 | Answers two questions: "Do guests order at the counter or at the table?" and "Are you GST registered?" | Applies the preset and tax setup | - |
| 7 | Taps Publish | Publishes; creates store link, counter QR and table QRs | Label changes to "Live" |
| 8 | Scans the test QR with their own phone | Confirms the scan and celebrates quietly | - |
| 9 | Prints or orders QR material | Print-ready files in the store's look | The tent and sticker |

- The store is live after step 7. Steps 8 and 9 can be done later from the checklist.
- A sample store can be explored before sign-up, so a visitor sees the product working first.
- If the owner leaves mid-way, a WhatsApp message brings them back to the same step.

## 5. Screens

### Home

- **A greeting and a sentence about today,** then the numbers. Example: "Good evening, Asha. A steady day: 64 scans, 18 ratings, average 4.6."
- **Cards that change with the store's stage:**
    - 1A: scans, most viewed items, new ratings, content score, setup checklist.
    - 1B adds: money received today by method, unsettled amount, last payout.
    - 1C adds: open tables, orders in the kitchen, average preparation time, sold-out items.
- **Needs attention:** at most three items, most important first (a low rating, a failed print, an item with no price).
- **One suggestion a day** from the system, with a one-tap action.
- Nothing on Home is a setting.

### Menu

- Categories as a list; items inside. Drag to reorder. Search.
- **Item editor** as a sheet: name, price, photo, description, veg mark, category, tags, choices (option groups), availability, takeaway price.
- **Choices** are written in owner language: "Sizes", "Add-ons", "Choose one", "Choose up to 3". Reusable across items.
- **Combos** are made in the same editor by adding a choice that picks from existing items.
- **AI help,** always shown as a suggestion to accept:
    - Bulk enrich: fill missing descriptions, tags, translations and images.
    - Per item: write or shorten the description, improve the photo, create an illustrative image.
    - "Type to edit": the owner writes or says "add masala chai at 40 under Beverages" and reviews the result.
- **Automatic sorting.** When an item is added or its name or description changes, AI sets its course (starter, main, side, bread, rice, dessert, drink, snack) and suggests a spice level. The owner sees a small tag such as "Starter, set automatically" and can change it in one tap. A change by the owner is final.
- **Nutrition at a glance.** The item editor shows "About 420 kcal, 28 g protein" with an "AI estimate" label and two actions: Confirm or Edit. Bulk enrich fills this for the whole menu, and the owner reviews it as a list.
- **House note.** An optional short note per item that the waiter character may use.
- **Content score** in the header, with the next best fix.
- **Bulk edit:** price change by amount or percent, move category, set availability.
- **Sold out** toggle on every item, usable from the list.
- **Publish** shows a summary of what changed. Previous versions can be restored.

### Look

- The looks as a row of live thumbnails rendered with the store's own menu.
- Accent colour: suggestions from the logo, plus a picker with a contrast-safe result shown.
- Logo, cover, welcome note, light or dark.
- "Match my brand" to get fresh proposals.
- The preview is the main element on this screen.

### QR

- Three sections: store link, counter, tables.
- Add tables by range. Rename spots.
- Print-ready material in the store's look: tent cards, stickers, standee, and a poster for the entrance.
- Order printed material for delivery (later, through a partner).
- Scan counts per QR.

### Reviews

- Ratings as a timeline with comments, the table and time.
- Low ratings first, each with "Call guest" or "Reply on WhatsApp" when the guest left a contact, and "Mark as handled".
- Public review link clicks.
- A weekly digest of themes.

### Money (from 1B)

- Today's collections by method.
- Each payment with its bill, status and settlement.
- **Daily settlement:** sales against money received, with any difference explained.
- Refunds, with reasons.
- Downloads: GST sales summary, Tally export.

### Orders (from 1C)

- Live orders and tables for owners who want to watch service from the dashboard. Staff use the staff app in [06-pos-and-kitchen.md](06-pos-and-kitchen.md).

### Reports

- Sales, items, time of day, guests, staff, feedback.
- Each report opens with one sentence of what changed, then the chart, then the table.
- **Ask your data:** a question box that answers with numbers and shows how it got them.
- Export any report.

### Team and devices

- Team members with roles and PINs.
- Devices: staff phones, kitchen screens, printers. Pairing by code. A test print button.
- Kitchen ticket and bill previews.

### Features

- Every feature from [04-settings-budget.md](04-settings-budget.md) as one row: name, a one-line explanation, a switch.
- Grouped by the guest's journey: welcome, choosing, ordering, at the table, after the meal.
- Guest login sits at the top as Off, Optional or Required.
- Flipping a switch updates the live preview at once and jumps it to the place the feature appears.
- A feature that depends on something else says so in plain words ("Needs guest login").
- Features that only show later in the journey are labelled ("Seen at payment").

### Assistant

- A command bar on every screen: "Tell the assistant what to change", by typing or speaking, in English or Hindi.
- The assistant replies with the exact change in plain words and shows it in the live preview, marked "Proposed". The owner taps Apply or Cancel.
- Suggestions under the bar are drawn from the store's own state ("Mark Nihari sold out").
- The last change is always shown with who made it and an Undo.
- Everything the assistant does is a command from [25-configuration-and-commands.md](25-configuration-and-commands.md). Approved AI agents use the same commands, and their proposed changes wait in an approval list.

### Settings

- One page. The settings from [04-settings-budget.md](04-settings-budget.md), grouped, each with its current value and a one-line explanation.
- Changes that affect guests show in the preview before saving.
- History of changes with one-tap undo.
- No advanced section.

### Account

- Plan and billing, GST invoices from us, data export, close account.
- For accounts with several stores: store switcher, clone store, linked menu, bulk apply, compare. See [03-domain-model.md](03-domain-model.md) section 2.

## 6. Notifications

- **WhatsApp is the main channel** to the owner: morning summary, low-rating alerts, health alerts, payment issues.
- The owner chooses which alerts to receive from a short list. This is a personal preference of the team member and adds no store setting.
- In-app notifications mirror WhatsApp. Nothing is sent that does not need attention.

## 7. Empty, loading and error states

- **Empty:** every empty screen offers the first action with an example drawn from the store ("No ratings yet. Print your table QRs so guests can rate their visit.").
- **Loading:** layout-matched skeletons; long AI tasks show progress in words.
- **Error:** what happened, whether anything was lost, and what to do. Drafts are never lost.
- **Offline:** the dashboard shows the last known data with its time and queues edits.

## 8. Roles

| Role | Sees |
| --- | --- |
| Owner | Everything, including billing and payouts |
| Manager | Everything except billing and account closure |
| Staff | Staff app only |
| Accountant (invited) | Money and Reports, read-only |

## 9. Rules

- Every write is validated on the server against the shared schema.
- Every change is an event with the person and time.
- Support staff use the same dashboard through an audited "view as" session that the owner can see in the history.
- No internal-only admin screens for store configuration.
- The dashboard adds no settings beyond file 04.

## 10. Acceptance checks

1. A first-time user publishes a menu from a photo in 10 minutes or less on a phone, in a timed test with five owners.
2. Every screen that changes the guest experience has a working live preview.
3. A change in the work area appears in the preview within one second.
4. Each of the twelve seed stores in [24-first-100-delhi.md](24-first-100-delhi.md) can be set up without touching Settings.
5. All copy exists in English and Hindi.
6. Every screen passes the checks in file 21 section 12.

## Changes

- 14 Nov 2026: added the Features screen and the assistant command bar.
- 14 Nov 2026: replaces the earlier "Back office" file. Adds live preview, the Look screen, Reviews, Money, phone-first layout and WhatsApp notifications.
