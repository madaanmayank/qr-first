# 10. Capability map

Every capability a mature enterprise QR suite offers, and how this product covers it. Use it to check "equally capable" before calling a phase complete.

Phases refer to [11-mvp-and-roadmap.md](11-mvp-and-roadmap.md). "Simpler by" states what was removed to get the same outcome.

## 1. Guest ordering

| Capability in incumbent suites | How it is covered here | Simpler by | Phase |
| --- | --- | --- | --- |
| QR scan to menu | Spot QR opens the menu directly | No splash, login or order-type pages | 1 |
| Dine-in, takeaway | `orderTypes` setting; inline choice only when needed | One chip, no page | 1 |
| Delivery | Later, through the same tab model with an address step | - | 4 |
| Party size capture | `partySize`, inline | One row | 1 |
| Item sizes, modifiers, nested modifiers | Option groups | One model | 1 |
| Combos and set meals | Option groups with linked items | Same configurator | 1 |
| Different price for takeaway | Optional takeaway price on the item | One field on one item; no duplicate items or price lists | 1 |
| Time-based menus (breakfast, lunch) | Availability windows on category or item | No menu-per-time-slot profiles | 1 |
| Buffet or tiered menus with limits | Zero-price category set chosen by the spot, with per-line limits | No price-tier URL logic | 3 |
| Sold out, live | Toggle from POS or KDS, pushed in 2 s | One flag | 1 |
| Multi-language menus | Auto translation with owner correction | No per-language data entry | 2 |
| Search, categories, subcategories | Search and a two-level category bar | One layout | 1 |
| Item card variants | One adaptive card | No layout picker | 1 |
| Allergen and dietary tags | Factual tags on items | - | 1 |
| Age gate for alcohol | Triggered by tag and country rule | No toggle | 2 |
| Special requests | `kitchenNote` | One switch | 1 |
| Reorder and personalised sections | "Order again", "Popular here" | Derived, no setup | 2 |
| In-cart recommendations | "Goes well with", one row | Derived, no setup | 2 |
| Popularity and social proof tags | One derived tag per item | No tag priority rules | 2 |
| AI waiter character | Waiter character with a designed personality, grounded in menu, nutrition and live stock | Available to all, no tier | 1A (ask), 1C (cart actions) |
| Item tagging by hand | Automatic course, spice and nutrition tagging when an item is added | Removes manual tagging | 1A |
| Nutrition information | Calories and protein estimates at a glance, with owner confirmation | High level, always labelled "about" | 1A |
| Item comparison | Compare two dishes with a plain verdict | Built in, no setting beyond the switch | 1A |

## 2. Payment and bill

| Capability | How it is covered here | Simpler by | Phase |
| --- | --- | --- | --- |
| Prepay | `payTiming: before_kitchen` | One property | 1 |
| Postpay with running bill | `payTiming: at_end`; Order status shows the bill | No external bill fetch | 1 |
| Pay at counter | Counter payment method, recorded in POS | No separate mode or screen | 1 |
| Cards and wallets | Provider hosted fields | - | 1 |
| Local QR payment schemes | Provider methods per country | Enabled by connection | 2 |
| Split bill | Equal, by item, by amount on one tab | One engine for guest and staff | 2 |
| Tips | `tips` presets | - | 1 |
| Service charge and tax | `serviceCharge`, `tax`, item tax class | Server function | 1 |
| Container deposits and similar levies | Fee line type in `priceTab`, driven by item tag and country rule | No store setting | 3 |
| Discounts and vouchers | Discount model applied by server | - | 2 |
| Refunds, including partial | Refund on payment, discount prorated | No special-case blocks | 2 |
| Receipts by email | "Get receipt" on Order status | Service message, no consent coupling | 1 |
| Country e-invoice rules | Country module that adds required fields at payment | Derived from address | 4 |
| Custom payment method labels | System labels per country and language | No per-store text | 1 |

## 3. After the order

| Capability | How it is covered here | Simpler by | Phase |
| --- | --- | --- | --- |
| Order confirmation and status | Order status screen with live round states | One screen for all modes | 1 |
| Queue or order number | Automatic tab number | No format settings | 1 |
| Feedback or effort score | One rating on the tab | One mechanism | 1 |
| Public review routing | `reviewLink`, offered after high ratings | One field | 1 |
| Consent capture | Once, with contact detail | One touchpoint | 2 |
| Post-order vouchers | After-order slot, priority 5 | Central priority list | 2 |
| Games and waiting-time engagement | Optional card in the after-order slot, lowest priority | No popups | 4 |

## 4. Brand experience

| Capability | How it is covered here | Simpler by | Phase |
| --- | --- | --- | --- |
| Merchant theming | Curated looks, accent colour, logo, cover, welcome note, with "Match my brand" and live preview | A handful of inputs; no low-level theme controls | 1 |
| Merchant-side preview of the guest experience | Live preview in the dashboard, running the real guest app on draft data | Built in; no separate tool | 1 |
| Call waiter | Service requests from table QRs to staff devices | On by default; no setting | 1C |
| Content quality checks | Content score with one-tap fixes | Merchant-facing, part of onboarding | 1 |
| Premium visual tier | Cover video, stories, about page | Delivered through content on the same app | 3 |
| Stories with tagged dishes | Stories row and standard item sheet | Appears when content exists | 3 |
| Branded login page | One login sheet with the store's look | No separate page | 2 |
| Custom loaders | One fast load; no loader needed at budget | Removed | - |
| Desktop and large screens | Responsive layout | One codebase | 2 |

## 5. Operations

| Capability | How it is covered here | Simpler by | Phase |
| --- | --- | --- | --- |
| Back-office menu management | Menu editor with reusable option groups | Six screens in total | 1 |
| Merchant onboarding | Self-serve, preset plus AI import | Minutes, one login | 1 |
| Multi-outlet management | Clone, linked menu, bulk apply, compare | No hierarchy or profiles | 3 |
| Per-outlet price differences | Linked-menu price override | One override type | 3 |
| Table and QR management | Tables and QR screen | Permanent codes | 1 |
| Staff ordering | Order pad | Same engine | 1 |
| Kitchen routing | Stations | One list | 1 |
| Kitchen display and printing | KDS and print bridge | - | 1 |
| POS functions (tabs, cash, voids, close of day) | Built in | No integration needed | 1 to 2 |
| Third-party POS integration | Optional adapter on the public API | Not required for core flow | 4 |
| Staff guest-insight view | Guest card on the tab: visits, favourites, last rating | Part of POS | 3 |
| Reports and dashboards | Reports screen from the event log | One data source | 2 |
| Roles and audit | Four roles, audit log | - | 1 |
| Experiments and gradual rollout | Global flags and experiments | No per-store targeting | 2 |
| Public API and webhooks | Same API with scoped tokens | One API | 2 |

## 6. Capabilities that go beyond incumbents

| Capability | Why it matters |
| --- | --- |
| Built-in POS on the same tab | Removes bill sync, the main source of failures in the category |
| Menu import from a photo or PDF | Onboarding in minutes |
| Live shared tab across guest phones and staff devices | Everyone sees the same order and balance |
| Plain-language report questions | Owners get answers without building dashboards |
| Settings count visible and capped | The product stays simple as it grows |
| Offline-tolerant staff app | Service continues through connection drops |

## 7. Deliberately not covered

| Capability | Reason |
| --- | --- |
| Kiosk hardware flows | Out of scope by decision |
| Guest-facing platform fee with opt-out | Adds bill complexity; see OPEN decision D3 |
| Multiple guest UI generations or tiers | One app |
| Per-store experiment targeting | Replaced by settings or defaults |
| Social login | Phone and email are enough |
