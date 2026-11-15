# 03. Domain model

The entities, their relationships and the rules that must always hold. Names match [glossary.md](glossary.md).

## 1. Map

```
Diner   (network identity, owned by the diner; links to Guest records)

Account (login + billing only, owns nothing operational)
  └─ Store  ← the only owner of everything below
       ├─ StoreConfig        one typed, versioned document
       ├─ Menu               categories → items → option groups → options
       ├─ MenuSnapshot       immutable published build of the menu + config for clients
       ├─ Spot               a table, counter or pickup point; each has a QR code
       ├─ Device             KDS screen, printer, card terminal
       ├─ StaffMember        role + PIN
       ├─ Tab                one visit or order: rounds, payments, state
       │    ├─ Round         items sent to the kitchen together
       │    │    └─ Line     item + chosen options + qty + note
       │    ├─ Charge        tax, service charge, tip, discount lines (server computed)
       │    └─ Payment       one attempt to pay all or part of the tab
       ├─ ServiceRequest     a call-waiter request from a spot: reason, state
       ├─ Guest (optional)   a diner's relationship with this store: visits, consent, rewards
       └─ Event              append-only log of everything that happened
```

## 2. Store and account

- **Store** is one physical outlet. It owns its config, menu, spots, devices, staff, tabs, guests and events.
- **Account** is a login and billing container. One account MAY own many stores. An account holds no menu, no settings and no orders.
- There is no brand, org or settings-profile entity. See lesson A1.

### How chains work without a hierarchy

Chains need consistency. They get it through write-time tools. Nothing is inherited at read time.

| Need | Tool | Behaviour |
| --- | --- | --- |
| Same menu in many stores | **Linked menu** | A store MAY follow another store's menu. Publishing in the source writes a full copy into each follower. Followers MAY override only price and availability. |
| Same settings in many stores | **Bulk apply** | Select settings, select stores, preview the diff, apply. Each store keeps its own full config. |
| Open a new store quickly | **Clone store** | Copies config, menu and spot layout into a new store. No link remains unless the menu is linked. |
| See drift | **Compare stores** | A diff view of config and menu across selected stores. |
| Report across stores | **Account reports** | Queries filter on a list of store ids. |

**Invariant:** rendering a menu, pricing a tab or loading a setting reads rows for one store id only. No query walks up to a parent.

## 3. Menu

```ts
Category   { id, storeId, name, sort, availability? }
Item       { id, storeId, categoryId, name, description?, photo?, basePrice,
             takeawayPrice?, taxClass, tags[], station, soldOut, availability?,
             optionGroupIds[], dietaryType, course?, spice?, nutrition?, houseNote? }
OptionGroup{ id, storeId, name, min, max, options[] }
Option     { id, name, priceDelta, soldOut, linkedItemId?, optionGroupIds[]? }
```

- **One item model covers every case.** See lesson C2.

| Restaurant concept | Modelled as |
| --- | --- |
| Size or variant (S / M / L) | Option group, min 1, max 1, with price deltas |
| Modifier (no onions, spice level) | Option group with its own min and max |
| Paid add-on (extra cheese) | Option with a price delta |
| Nested modifier | An option that carries its own option groups. Depth limit: 2 |
| Combo or set meal | Item whose option groups contain options with `linkedItemId` |
| Buffet or tiered menu | A separate category set with zero-price items and per-line quantity limits, selected by the spot's QR |
| Different price for takeaway | `takeawayPrice` on the same item. Never a duplicate item or a separate price list |
| Breakfast, lunch or happy-hour menu | `availability` window on a category or item |

- `availability` is an optional time window (days and hours). Absent means always.
- `soldOut` is a live toggle from the POS. It reaches every open guest session within 2 seconds.
- `station` routes the line to a kitchen station.
- `tags` are factual (vegetarian, spicy, contains alcohol). Popularity tags are derived by the system and never stored by hand.
- Text fields hold the store's primary language. Translations are generated and cached per language; an owner MAY correct a translation.
- Prices are integers in the currency's minor unit.
- **`dietaryType`** is required: `veg`, `non_veg` or `egg`. The menu cannot be published while an item has none (see [15-country-profile-india.md](15-country-profile-india.md) section 4).
- **`course`** is optional and is one of: `starter`, `main`, `side`, `bread`, `rice`, `dessert`, `drink`, `snack`. AI sets it when an item is added or changed. The owner sees it as an editable tag. An owner's choice is final and is never overwritten by a later AI run. A combo has no course of its own; it takes the courses of its parts.
- **`spice`** is optional: `mild`, `medium`, `hot`. AI suggests it; the owner confirms or edits.
- **`nutrition`** is `{ kcal, proteinG, per: 'serving', source: 'ai' | 'owner', confidence, updatedAt }`. It is high level on purpose: calories and protein for most dishes, and calories and sugar (`sugarG`) for desserts and drinks, where sugar matters more. It is an estimate and is always shown as "about". A portion group (half, full) MAY carry a multiplier so the numbers follow the guest's choice.
- **`houseNote`** is an optional short owner note that the waiter character may use. See [26-waiter-character.md](26-waiter-character.md).
- Courses, spice and nutrition are used for suggestions, filters, compare and the waiter character. They are never used to change prices.

## 4. Spots and QR codes

- A **spot** is where an order belongs: `table`, `counter` or `pickup`.
- Each spot has one permanent QR code that encodes an opaque spot id. The QR never encodes price lists, party size or settings.
- A spot of type `table` holds at most one open tab at a time. Scanning joins the open tab or opens a new one.
- A spot of type `counter` or `pickup` opens a new tab per guest session.
- Each store also has one permanent **store link**: a web address and QR for Instagram, Google and printed material. It opens the store page (menu, hours, directions, call, review). When ordering is on, an order from the store page uses the `pickup` spot.
- A **service request** (call waiter) belongs to a table spot and its open tab: `{ id, storeId, spotId, tabId?, reason, state: 'open'|'done', createdAt, doneBy }`. Reasons are a fixed list.

## 5. Tab, round, payment

One model replaces prepay, postpay, pay-at-counter and hybrid modes. See lesson D1.

```ts
Tab     { id, storeId, spotId, orderType: 'dine_in'|'takeaway',
          payTiming: 'before_kitchen'|'at_end',
          state: 'open'|'closed'|'void', number, partySize?, guestId?, openedBy }
Round   { id, storeId, tabId, state: 'draft'|'sent'|'accepted'|'ready'|'served'|'void',
          lines[], sentAt, source: 'guest'|'staff' }
Payment { id, storeId, tabId, amount, method, state: 'pending'|'succeeded'|'failed'|'refunded',
          tip, idempotencyKey, takenBy: 'guest'|staffId }
```

- `payTiming` is copied from the store config when the tab opens. It is the only difference between "pay first" and "pay later".
    - `before_kitchen`: a round moves to `sent` only after a succeeded payment covers it.
    - `at_end`: rounds are sent at once; the tab is paid before it closes.
- **Balance** = sum of non-void lines + charges, minus succeeded payments. A tab closes when the balance is zero.
- **Split bill** is several payments on one tab: equal split, by item, or custom amount.
- **Cash or card at the counter** is a payment recorded by staff in the POS on the same tab.
- **Totals** come from one server function, `priceTab(tab)`. Clients never compute tax, charges or totals.
- **Idempotency:** creating a round or a payment requires a client-generated key. Replays return the first result.
- **Tab number** is a short daily counter per store, shown to the guest and the kitchen. It is automatic.

### Round state machine

```
draft → sent → accepted → ready → served
          └────────→ void (staff only, reason required, audited)
```

- With auto-accept on (default), `sent` moves to `accepted` immediately.
- The guest status page reads this state live.

## 6. Guest

Two records, kept apart on purpose.

- **Diner:** one network-level identity per person, keyed by a verified phone number. Holds name, language and the preferences the diner chooses to carry (dietary, spice, allergies). It has no `storeId`. The diner owns it and can export or delete it.
- **Guest:** the diner's relationship with one store. Holds visit history, favourites, consent for that store, rewards and ratings there. It has a `storeId` and an optional `dinerId`.
- A guest record exists only when the person identifies at that store. Ordering never requires it unless the store sets login to `required`.
- Consent is stored per store, per channel, with time and source. Consent at one store never applies to another.
- A store can read its own guest records and the shared preferences of linked diners. It cannot read a diner's activity at other stores.
- The scope of network features is decision D6 and D18.

## 7. Staff and roles

| Role | Can do |
| --- | --- |
| Owner | Everything, including billing and payouts |
| Manager | Settings, menu, devices, reports, voids, refunds, discounts |
| Staff | Take orders, send rounds, take payments, mark sold out |
| Kitchen | View and bump rounds |

- Staff sign in on a shared device with a PIN. Every money-changing action records the staff id.

## 8. Events

- Every state change writes one append-only event: `{ id, storeId, type, actor, at, payload }`.
- Reporting, audit, analytics and webhooks all read this log. See lesson E2.
- Guest behaviour events (viewed item, added to cart) use the same envelope with `actor: guest session`.

## 9. Invariants (testable)

1. Every operational row has exactly one `storeId`, and every query filters on it. The only network-level records are `account` and `diner`.
2. A table spot has at most one open tab.
3. A tab's balance is never negative.
4. A round in `sent` or later is immutable; changes are new rounds or audited voids.
5. For `before_kitchen` tabs, no round reaches `sent` without a covering succeeded payment.
6. Two requests with the same idempotency key produce one round or one payment.
7. Option group selections satisfy `min` and `max` on the server before a line is accepted.
8. A published menu snapshot never changes; a new publish creates a new snapshot id.
