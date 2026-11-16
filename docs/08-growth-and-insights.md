# 08. Growth and insights

Guest identity, consent, rewards, vouchers, content, recommendations and analytics. These are the "feature rich" parts. Each one works with zero setup and adds no row to the settings budget.

## 0. Two sides, one relationship

The company brings diners and restaurants together. This file covers the diner-facing foundations. The full diner side (diner home, network discovery) is designed in stage 4 of [00-master-plan.md](00-master-plan.md).

- A **diner** is a person with one identity across every restaurant on the network. The diner owns it.
- A **guest** record is that diner's relationship with one store: visits, favourites, consent, rewards there.
- A restaurant sees only its own guest records, plus the preferences the diner chooses to share (for example vegetarian, spice level, allergies, name).
- The diner can see, export and delete their data, and can stop sharing with any restaurant.

### What the diner gets from the network

| Benefit | Detail |
| --- | --- |
| No relearning | The same clear ordering and payment flow at every restaurant, in that restaurant's own look |
| Preferences travel | Vegetarian filter, spice level, allergies and language are remembered everywhere |
| One place for receipts | Every bill, searchable, with GST details |
| Order again | Favourites and past orders at each place |
| Fast payment | Preferred UPI app remembered |
| Places | Restaurants on the network nearby, and the ones visited before |
| Rewards | Stamps and offers from each restaurant, in one list |

### Rules

- Joining is optional and comes after value: a receipt, a faster reorder, a reward.
- No app install. Web first, with WhatsApp as the re-entry point.
- Recognition at a new restaurant is shown to the diner plainly ("Welcome. Your vegetarian filter is on.") with a clear way to turn it off.
- Diner data is never sold. A restaurant cannot message a diner without that diner's consent for that restaurant.

## 1. Guest identity

- Ordering works with no identity. See [05-guest-ordering-flow.md](05-guest-ordering-flow.md).
- A guest becomes known by giving a phone number or email, verified by a one-time code.
- Reasons a guest would do this, offered after value is delivered: receipt, faster reorder, rewards.
- A recognised device signs in silently on the next visit to the same store. The guest can sign out, which removes the device link.
- There is one login component, used wherever identity is requested.
- Social logins are out of scope. Phone and email cover the need with less surface.

## 2. Consent

- Asked once, at the moment the guest gives a contact detail. See lesson C5.
- One sentence, one control, per channel the store can actually use.
- The default state (unchecked or pre-checked) follows the country rule derived from the store address. Stores cannot change it.
- Stored per guest per channel with time and source. A guest can withdraw from any message and from the guest app.
- Receipts and order updates are service messages and do not depend on marketing consent.

## 3. Rewards

One simple scheme, off until the owner turns it on from a Home card.

- **Visit stamps:** "Buy N, get a reward." The owner picks N and the reward item or amount.
- Stamps are earned automatically on a paid tab by a recognised guest.
- Progress shows on Order status and on the next visit's menu.
- Redemption is a discount line applied by the server on the guest's request.
- Points with tiers and third-party loyalty programmes are later phases, through the public API.

## 4. Vouchers and discount codes

- A discount has: code or automatic trigger, value (percent or amount), scope (tab or item set), validity window, usage limit.
- Created from a Home card in under a minute.
- Applied by `priceTab` on the server. Clients show the resulting line.
- **Comeback voucher:** an optional automatic voucher sent to a consenting guest some days after a visit. The system picks timing from the store's visit pattern.
- Partial refunds on tabs with discounts are supported: the server prorates the discount. No special-case block.

## 5. Feedback and reviews

See [29-feedback.md](29-feedback.md), the home file.

- One mechanism, defined in [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 9.
- Low ratings alert the store at once, with the tab, the items and the comment.
- High ratings are offered the public review link.
- Reports show the trend and the items most linked to low ratings.

## 6. Content: cover, stories, about

Richer brands get a richer look through content. The components and logic stay the same for everyone. See lesson B2.

- **Cover media:** one image or short video at the top of the menu.
- **Stories:** short vertical images or videos with tagged items. Shown as a row above the menu when at least one story exists. A tagged item opens the standard item sheet.
- **About:** a simple page of text and photos, linked from the header, when the owner fills it in.
- Media is uploaded from the merchant dashboard, transcoded by the system and served from the edge. Size and format limits are engineering constants shown in the upload dialog.
- Each of these appears only when it has content. There is no on/off switch.

## 7. Theming

- Theming is defined in [22-theming.md](22-theming.md): curated looks, an accent colour, logo, cover and a welcome note.
- Every look field is rendered by at least one component, proven by a contract test. See lesson B4.

## 8. Recommendations and derived tags

- **Sources:** the store's own event log. No hand-kept lists.
- **Outputs:**
    - "Popular here" section and one "Popular" tag per category.
    - "Goes well with" in the cart, from items often ordered together.
    - "Order again" for a recognised guest.
    - Popular option within a group ("Most chosen").
- **Cold start:** a new store shows none of these until it has enough orders. The threshold is an engineering constant.
- All derived data is computed by one service and delivered inside the snapshot or the guest session response. Clients only render. See lesson E3.
- Every recommendation surface is measured against a holdout so its value is known.

## 9. Waiter character

- An optional chat entry on the menu: "Ask about the menu".
- Answers questions about dishes, allergens and suggestions from the store's own menu data, and can add items to the cart with the guest's confirmation.
- It never invents items, prices or allergen claims. When data is missing it says so and suggests asking staff.
- Available to every store once the menu has descriptions and tags.

## 10. Analytics

- **One event schema**, defined in the shared contracts package. See [03-domain-model.md](03-domain-model.md) section 8.
- **One store of events.** Reports, dashboards, audit and webhooks read from it. See lesson E2.
- **Core funnel**, tracked for every store with no setup:

| Stage | Event |
| --- | --- |
| Scan | `menu_viewed` |
| Engage | `item_viewed` |
| Cart | `item_added` |
| Order | `round_sent` |
| Pay | `payment_succeeded` |
| Rate | `rating_submitted` |

- **Product health metrics** (for us): scan-to-order conversion, time to first item, payment success rate, order errors, p95 latencies, settings touched per store, support contacts per store.
- **Experiments:** a global experiment framework assigns guests to variants. Experiments are time-boxed, never targeted to named stores, and end by shipping the winner to everyone.

## 11. Integrations

- **Public API and webhooks** from the first release: menu, tabs, payments, guests (with consent), reports.
- Planned connectors, each built on the public API: accounting export, delivery marketplaces, third-party loyalty, messaging providers.
- No connector may add a store setting beyond its own connection details, which live in a "Connections" list (content).
