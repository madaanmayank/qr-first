# 05. Guest ordering flow

The guest web app: what a guest sees from the scan to the end of the visit. One app, one flow, for every store.

## 1. The flow

```
Scan QR → Menu → Item sheet → Cart → (Pay) → Order status → (Pay at end) → Done
```

- The scan opens the menu directly. No splash, no login page, no order-type page. See lesson C1.
- Pay comes before Order status when the tab's pay timing is `before_kitchen`, and after when it is `at_end`.
- The guest can always go back to the menu and send another round on the same tab.

## 1a. Personal by default

The guest experience must feel like being recognised by a good host. It must never feel like a generic QR menu. Each behaviour below is a feature switch in [04-settings-budget.md](04-settings-budget.md).

| Moment | What a known diner sees | What a first-time guest sees |
| --- | --- | --- |
| Arrival | A greeting by name and time of day. "Good evening, Riya. Third visit this month." | The host's welcome note, signed |
| Top of menu | **Your usual:** the last order or most repeated order, with one tap to add it again | "Popular here", from the store's own orders |
| Preferences | Vegetarian filter, spice level and language already applied, stated in one quiet line with a way to change | Defaults from the device language |
| Suggestions | Each has a personal reason: "You liked the seekh kebab. The galouti is its softer cousin." | Reasons from the store: "Most ordered with biryani" |
| Item sheet | Last choices preselected for an item ordered before ("Oat milk, like last time") | Empty choices |
| After paying | Thanks by name; receipt saved to the diner's list | Offer to save details for next time |

Rules:

- **Reasons are true.** Every personal line comes from that diner's own history or the store's data. No invented familiarity.
- **Recognition is never creepy.** The diner sees what is remembered and can turn it off in one tap. Nothing from other restaurants is shown to the restaurant, and only shared preferences travel.
- **Names are used sparingly:** at arrival and at thanks.
- **Suggestions are few.** At most one personal block above the menu and one in the cart.
- **No discounts as bait.** Personal does not mean promotional.

## 1b. Play to order

A game-like way to choose a meal, for guests who do not want to read a long menu. It is a mode of the same menu and the same cart. Feature key: `playMode`.

**Principle:** the game is the decision itself. It adds no points, prizes, discounts or fake rewards.

- **Entry:** one quiet invitation on the menu: "Not sure what to have? Play to order." A known diner may see "Deal me something new."
- **Pick or pass:** the guest answers up to two quick taps (how hungry, what mood), then sees one dish at a time as a large card, with a reason. They pass or add.
- **The table fills:** a tray at the bottom shows the meal taking shape by course (drink, main, side, sweet). Added dishes land there with a short motion.
- **Learning:** each pass and add sharpens the next card, within the session and for a known diner's future visits.
- **End:** when the tray is full or the guest stops, they see "Your table is set" with the meal and total, then go to the normal cart.
- **Group play:** at a shared table, each phone deals for its own seat and everyone sees the shared tray. Designed in stage 4.
- **Rules:** choices and combos open the normal item sheet. Sold-out items are never dealt. Vegetarian and allergy preferences are always respected. Leaving play mode keeps what was added.

Other play ideas (this or that duels, build-a-thali, table challenges) are explored in stage 4 and added only when they help a guest decide faster or enjoy the wait.

## 1c. Non-negotiables (founder, 14 Nov 2026)

These three behaviours are never traded away for speed of build or visual taste. Each has a test.

### Add is instant, and it feels good

- **Optimistic.** Tapping Add changes the screen in the same frame. It never waits for the network. The cart lives on the device and is checked with the server later.
- **Green confirmation.** The Add button turns green with a tick and the word "Added" for about 0.7 seconds, then becomes a quantity stepper in the same place.
- **The item travels.** The item's image lifts and flies once to the cart bar. The count and total in the bar bump. With reduced-motion settings, only the colour change remains.
- **Items with required choices** open the item sheet. Its Add button gives the same instant response and the same fly to the cart.
- **Test:** the Add tap to the first visual change is under 100 ms on a mid-range phone, with the network switched off.

### The cart bar is sticky

- Once the cart holds anything, a cart bar is fixed to the bottom of every guest screen except full-screen payment. Nothing covers it. Floating buttons (call waiter, assistant) sit above it.
- It shows the count, the total and one clear action. It is the same size and place on every screen.
- It turns amber and says "1 item needs a look" when something in the cart has a stock problem (below).
- It respects the phone's safe area and never jumps when the keyboard opens.

### Stock changes are live, specific and never destructive

- **Live.** When staff mark an item or a choice sold out (or back in stock), every guest phone shows it within 2 seconds, on whichever screen it is on. A guest who comes back to the app is checked at once. If the live connection drops, the app re-checks every 20 seconds and at every send.
- **Menu.** A sold-out item stays in its place, greyed, with a "Sold out" tag and no Add button. A sold-out choice inside an item sheet is disabled and tagged "Sold out", and stays visible so the guest understands.
- **Open item sheet.** If a choice sells out while the sheet is open, that choice is disabled in place. If the guest had picked it, the pick is cleared, the group is marked "Choose 1", and the Add button explains what is missing. Nothing else resets.
- **Cart.** A line that has a problem is never removed or changed silently. It stays, dimmed, with a tag that names exactly what is out: "Sold out" for the item, or "Rumali roti sold out" for the choice. Its price is struck through and left out of the total, so the total is always truthful.
- **One-tap fixes** on the line: swap the choice for an available one (with the price difference), swap the item for a similar one, or remove it. The rest of the cart is untouched.
- **A calm notice.** A short toast says what changed ("Galouti Kebab just sold out"). The cart bar turns amber. A banner at the top of the cart says "1 item needs your attention. Nothing is lost." There is no blocking pop-up.
- **The action adapts.** While a problem exists, the main button reads "Fix 1 item to continue" and scrolls to it. When fixed, it returns to "Send to kitchen".
- **At send.** The server checks every line and choice again and returns a precise reason for each failure. Nothing is sent or charged until the check passes. For pay-first stores, stock is held for a short time once payment starts, so a paid order never fails for stock. See decision D21.
- **Test:** with the cart open, an item sold out by staff shows the amber state, the tag and the fixes within 2 seconds; a choice sold out in a customised line names that choice.

Working prototype: `design/live.html`.

## 1d. Nutrition at a glance and compare

Feature keys: `nutrition` and `compare`. Both work in menu-only stores.

### Nutrition at a glance

- As soon as a guest opens an item, a single quiet row sits under the name and price: **about 420 kcal and 28 g protein per serving**, with the dish's course ("Starter") next to it.
- High level only: calories and protein, or calories and sugar for desserts and drinks. No full nutrition table in v1.
- Always written as "about". A small "AI estimate" label sits beside the numbers until the owner confirms them, then it reads "Confirmed by the restaurant".
- The numbers follow a portion choice (half or full) when the group carries a multiplier. Other choices do not change them in v1.
- If an item has no estimate yet, the row is simply absent. There is no empty box.
- It is never presented as medical or dietary advice. Allergen facts are never shown from an estimate. See [18-ai-integration.md](18-ai-integration.md).

### Compare

- **Entry points:** a "Compare" button on the item sheet, and a compare mode on the menu where a guest taps two items. The waiter character can also open it.
- **Two items in v1.** Three later if guests ask for it.
- **The compare screen** shows two columns: image, name, veg mark, price, course, spice, kcal, protein, portion. The better value for each number is quietly highlighted. Sold-out items are shown with their tag and cannot be added.
- **A one-line verdict** sits at the top, written from the numbers, for example "The galouti is about 80 kcal lighter. The seekh has about 6 g more protein." It never says one is healthier overall and never invents facts. The same verdict text is available from the waiter character.
- **Actions:** Add either item, or swap one for another item. Closing returns to where the guest was.
- A default second item is suggested from the same course and diet, so comparing takes one tap.

## 1e. The waiter character

A designed character that guests can ask about dishes, in the way a good waiter would. It knows the menu, courses, nutrition estimates, live stock and, when allowed, the guest's preferences. Full specification, voice and rules: [26-waiter-character.md](26-waiter-character.md). Feature key: `waiter`.

## 1f. Suggestions that make sense

Suggestions use the course of each item and the state of the table so they feel like a waiter's, not a generic list.

| Situation | Suggestion |
| --- | --- |
| Cart has a main and no drink | One drink that suits the main |
| Cart has starters and mains, no sweet | One dessert, offered late (near sending, or at the bill for table stores) |
| Cart is all one course | The missing course that most tables add |
| A table of several guests | A shareable side or starter, if the store has any tagged shareable |
| Evening or lunch windows | Items popular in this window, from the store's own orders |
| Guest known and vegetarian | Veg only, always |
| A suggested item sells out | It disappears at once and the next best takes its place |

Rules:

- One suggestion at a time in the cart, and one block above the menu.
- Each suggestion has a true reason from the store's data or the guest's own history. See section 1a.
- Sold-out items are never suggested. Sold-out choices are never preselected.
- A suggestion never repeats something already in the cart.
- Suggestions are measured against a holdout. See [18-ai-integration.md](18-ai-integration.md).

## 1g. Rounds connect to each other

A dine-in meal is several rounds. The product treats them as one meal, using the course tags from file 18.

- **The meal journey.** A visual tray, "Your meal", shows the courses as a row of slots: Starter, Main, Bread, Dessert, joined by a path. A slot fills with the dish photo when ordered (green ring and tick once sent, amber ring while still in the cart). The next empty course glows, and its dishes appear below as round photo bubbles with a + to add. A sent dish has a small + to order it again with the same choices. It is a game the guest completes, with almost no text.
- **The stages are not fixed.** An AI journey plan, built from each store's own menu, decides the stages and their names: courses for a full meal, build-your-order steps for a dessert parlour or coffee bar, the rhythm of an evening for a bar, or no journey at all when the menu has too little structure. See [18-ai-integration.md](18-ai-integration.md), "Journey plan".
- **Where it appears:** on the menu once the cart has something or a round is sent (it replaces the greeting and usual card), and on the order success page under the time to table.
- **Bill so far** on the success page covers every round of the visit.
- **Celebration on add:** the first add of a dish fires a small confetti burst from the button and the card gives a short bounce; sending a round fires a larger burst. All of it respects reduced motion.

Working prototype: `design/app-v3.html`.

## 2. Questions the guest may be asked

Each question appears inline at the moment it matters, and only when the store config makes it necessary.

| Question | When it appears | Where |
| --- | --- | --- |
| Dine-in or takeaway | Store offers both and the spot is a counter | A two-option chip at the top of the cart |
| Party size | `partySize` on, first round of a table tab | One row in the cart before sending |
| Login | `guestLogin` required: before sending. Optional: offered after the order | Sheet with phone or email and a one-time code |
| Pickup name | Takeaway with no login | One text field in the cart |
| Age confirmation | Cart holds an item tagged `contains_alcohol` and the country rule needs it | One confirm row in the cart |
| Tip | `tips` on | On the payment step |

## 3. Menu screen

- **Header:** store logo or name, spot label ("Table 12"), language switch, search.
- **Cover media** when the store has it.
- **Category bar:** sticky, scroll-synced, with a full list drawer.
- **Smart sections** above the categories, shown only when they have content:
    - "Order again" for a recognised guest.
    - "Popular here" from the store's own order data.
- **Item card:** one adaptive component. It shows photo when present, name, short description, price, factual tags and at most one derived tag (for example "Popular").
- **Add:** tapping the card opens the item sheet. An item with no option groups also has a direct add button.
- **Sold out:** the item stays visible, greyed, at the end of its category. It updates live.
- **Outside opening hours:** the menu is browsable, add buttons are disabled, and a banner states the next opening time.
- **Cart bar:** fixed at the bottom once the cart has an item, with count and total.

## 4. Item sheet: the one configurator

Every item, from a plain drink to a five-part set meal, uses this sheet. See lesson C2.

**Layout**

- Photo, name, description, tags and base price at the top.
- Option groups listed in order, each with its name and a requirement label: "Choose 1", "Choose up to 3", "Optional".
- A sticky footer with quantity and "Add to order" with the live price from the server.

**Rules**

1. Groups are shown on one scrolling page when the item has four or fewer groups. With more than four, the sheet becomes steps, one group per step, with a progress indicator.
2. A group with `min = max = 1` uses single select. Any other group uses multi select with a counter.
3. Selecting never auto-advances. The guest moves with scroll or "Next". One rule for all items.
4. "Add to order" is disabled until every group meets its `min`. Tapping it while disabled scrolls to the first incomplete group and highlights it.
5. A selected option that carries its own groups expands them inline, indented. Depth limit: 2.
6. An option with `linkedItemId` shows that item's photo and name. This is how combos display their parts.
7. Sold-out options are shown disabled.
8. The required default of a single-select group is never pre-selected, except when the group has exactly one available option.
9. Editing a line from the cart reopens the same sheet with the selections filled.
10. The kitchen note field appears at the end when `kitchenNote` is on.

## 5. Cart

- Lines with chosen options indented under each item, quantity stepper and edit.
- Reducing quantity from 1 asks for confirmation once.
- One recommendation row, "Goes well with", when the system has a confident suggestion. Never more than one row.
- Totals block from the server: subtotal, discounts, service charge, tax, total. The client displays these values and does no maths.
- Discount code field, collapsed by default.
- Primary button:
    - `before_kitchen`: "Pay and send order"
    - `at_end`: "Send order"
- On a shared table tab, the cart is per device until sent. After sending, every device at the table sees the round.

## 6. Payment

- Methods come from `paymentMethods`. The last method this device used is preselected.
- Cash or card at the counter is listed as a method. Choosing it shows the tab number to quote at the counter and marks the round as awaiting staff payment.
- Tip selector when `tips` is on.
- **States, all specified:**

| State | What the guest sees |
| --- | --- |
| Processing | Blocking progress with "Do not close this page" |
| Succeeded | Moves to Order status |
| Failed | Inline error with the reason and "Try again"; cart and selections intact |
| Cancelled by guest | Returns to the payment step, nothing lost |
| Timed out or page closed | On return, the app checks the payment by idempotency key and resumes at the right screen |
| Browser back after success | Lands on Order status, never on a payment form |

- **Split bill** (for `at_end` tabs): pay in full, split equally by a number, pay for chosen items, or enter an amount. The remaining balance is visible to everyone on the tab.

## 7. Order status

This is the home screen after the first round. It replaces separate order success, payment success and receipt screens.

- **Top:** tab number, spot, and the live state of each round: Sent, Preparing, Ready, Served.
- **Middle:** the bill so far, with every round and payment.
- **Actions:** "Order more", "Pay" (when a balance is due), "Get receipt" (email or download).
- **After-order slot:** one card at a time, picked by the priority list in section 8.
- The page works after a refresh and from the QR again. A guest who rescans rejoins the open tab.

## 8. Interruptions and the priority list

- At most one overlay that the guest did not ask for per screen visit. See lesson C3.
- Ordering and payment screens show no promotional overlays at all.
- The after-order slot on Order status shows the first item that applies:

| Priority | Card | Applies when |
| --- | --- | --- |
| 1 | Pay now | Balance due and the guest has finished ordering |
| 2 | Rate your visit | First round served or 15 minutes after sending; not yet rated on this tab |
| 3 | Leave a public review | Rating was 4 or 5 and `reviewLink` is set |
| 4 | Save your details | Guest is anonymous; offers receipts, reorder and rewards; includes the consent choice |
| 5 | Rewards or voucher | Guest is recognised and has something to redeem next time |

- A dismissed card does not return on the same tab.

## 9. Feedback

The home file for feedback is now [29-feedback.md](29-feedback.md). The lines below are kept for history.

- One mechanism: a 1 to 5 rating with optional tags and comment, attached to the tab. See lesson C4.
- Ratings of 1 to 3 ask "What went wrong?" and alert the store. They are never sent to a public review site.
- Ratings of 4 to 5 offer the public review link when set.

## 10. Languages and accessibility

- The app opens in the device language when the store offers it, else the store's primary language.
- All system copy is in the catalogue. Menu text is machine translated, cached, and correctable by the owner.
- Tap targets are at least 44 px. Every control has a label. Contrast is checked for the derived palette in light and dark.
- Motion respects the device's reduced-motion setting.

## 11. Budgets for this app

| Measure | Budget |
| --- | --- |
| Menu visible after scan, mid-range phone on 4G | 1.5 s or less |
| Requests needed to render the menu | 1 (the snapshot) plus images |
| JavaScript shipped for the menu route, compressed | 150 KB or less |
| Add to cart feedback | Instant, optimistic |
| Send order, p95 server time | 500 ms or less |
| Live updates (sold out, round state) | 2 s or less |

## 12. Events emitted

`menu_viewed`, `item_viewed`, `item_added`, `item_removed`, `round_sent`, `payment_started`, `payment_succeeded`, `payment_failed`, `rating_submitted`, `review_link_opened`, `guest_identified`, `consent_changed`.

Each uses the event envelope in [03-domain-model.md](03-domain-model.md) section 8. Property names are defined once in the shared contracts package.

## 1h. Ordering together (15 Nov 2026, founder: very important)

- Everyone at a table can join one shared order by scanning the table QR or opening a share link from "Order together".
- Each dish in the table order shows who added it. Steppers on the menu change only your own dishes.
- The cart bar shows the people at the table. Anyone can send the round ("Send for table"), and it goes to one tab.
- Splitting the bill by person comes later (see the bill split in the payment files).

## 1k. Meal pairing (17 Nov 2026, founder)

One quiet idea that completes the meal, worked out from what the guest is building. Switch: `pairing`.

- **Where:** on the cart page, a row inside the card of the dish added last; on the menu, a floating card above the cart bar for 9 seconds after a first add. The menu grid never moves. The waiter pill hides while the card is up.
- **What it reads:** the cart, what was sent this visit, the dish's spice and diet, live stock.
- **What it suggests:** a starter gets a drink (a lassi or chaas against heat, lime soda or chai otherwise), or the platter when two starters are in; a main gets a bread and rice, or the thali swap when dal or kadhai stands alone (shows what it adds to the bill); biryani gets raita; bread gets a main; a dessert gets one more sweet and a chai; a lone drink gets a starter.
- **One line each,** in the waiter's voice, about the food, never opening with a price. One key word carries the course colour (drinks teal, sweets rose, breads and rice amber, starters and mains red, combos violet), also on the plate ring and the + button.
- **Calm:** two dishes at most; fixed for that dish, and an added dish keeps its place with a tick; a dish added from a pairing never becomes the next host; a 5-second undo after adding; a × hides ideas for that dish; two hides stop ideas for that kind of dish; three pairings per visit.
- **Never forced:** no pop-up, never touches the Send button, sold-out and non-veg dishes are skipped for vegetarians.
- **On the menu (revised 17 Nov, founder):** not a pop-up. A light section in the page itself, white like the page with hairlines, opens under the row of the dish just added. It arrives softly: it opens over about 0.6 seconds and its rows settle in one after another. The animation carries on across redraws, so it never pops. It stays until dismissed, until another dish is added, or until the cart opens.
- **Quantities:** once a suggested dish is added, its + becomes a small stepper in the course colour (− becomes a bin at 1), so several can be added. The list stays the same.
- **Notes:** the kitchen notes section is one quiet "Add a note for the kitchen" line until opened; after saving, a short summary of the notes replaces it.
- **The logic, in full (17 Nov):**
    1. A pairing is offered for the dish added last, only when the meal has a real gap for it (a starter with no drink, a main with no bread, and so on). A complete meal gets nothing.
    2. It is worked out once for that dish and kept, so adding from it never changes the list. Adding another dish moves it to that dish; leaving the menu for the cart, or removing the dish, clears it.
    3. The only things that hide ideas are the guest's own × (and two of those stop ideas for that kind of dish) and an empty result. There is no limit on how many dishes get a pairing in a visit.
    4. On the menu the section is tied to its dish by a notch under that column and the dish's name and photo in the header. There is no box or ring around the dish. The section's whole top line, and the notch, are in the course colour, and a soft band of light sweeps along that line, as on the VIBE loader: continuously while a match is found, once as the picks settle, then still. The menu never scrolls by itself.
- **The AI** writes and ranks from the same classes (file 18 section 3, pairing). The prototype uses on-device rules.

## 1j. A note on any dish (15 Nov 2026)

- Special requests for a dish without options are added in the cart, never at add-to-cart, so adding stays one tap.
- Notes live in one place, the "Notes for the kitchen" section of the cart: a note for the table, and "Note for a dish", where the guest picks a dish and adds quick chips chosen by dish type (curries and kebabs: Less spicy, Extra spicy, No onion, No garlic; breads: Extra butter, Well done, Less oil; drinks: Less sugar, No ice, Extra ice; desserts: Less sugar, Served warm, Served cold; sides: Less salt, No onion) and a short free-text box.
- Saved dish notes are listed in that section with Edit and Remove, and the dish's chip gets a small dot. The dish rows themselves stay clean. Each note goes to the kitchen with its dish.
- Cart intros show once each: on the first cart visit, the suggested dishes and "A note for any dish" (pointing at the notes section). Each tip is declared by its feature in the code, so a feature that changes or disappears takes its tip with it; on the first cart visit after an order, "Your next round" (same bill) and "Notes still work".

## 1i. After an order (15 Nov 2026)

- **Add-on window:** for 5 minutes after a round is sent, the success page shows "Missed something? Add it now and it goes with this order" with a running timer and a few quick dishes. Anything sent inside the window joins the same round ("Added to your order"); after it, a new round starts.
- **Sending from the success page:** once the guest adds dishes there, the bottom bar becomes one "Review added dishes" button (Pay bill steps back). It never sends on one tap: a bottom drawer lists each dish with its choices, quantity (still editable) and price, the amount it adds to the bill, and whether it goes with the current order (time left shown) or starts a new round. Only "Send to order" sends; "Not yet" keeps the dishes. Sending opens a confirmation screen: a tick draws itself, "Added to your order" (or "Sent as round N" after the add-on window), the dishes arrive one by one with their notes and a tick, and the amount added. Done returns to the success page at the top. A dish with a sold-out problem sends the guest to the cart first.
- **Add animation:** every add flies from the photo nearest the tapped button, wherever it is. It lands where the total changes: the cart bar, or the bottom bar total on the cart and success pages; the tapped button only when neither is visible.
- **Suggestions are calm and stable (founder, 15 Nov).** A suggestion list is worked out once per screen visit (cart pairing) or per round (meal track, "Still room for more?") and never grows or reshuffles while the guest adds from it: an added dish stays in place with a green tick. Lists stay short (two for pairing and the meal track, three for the add-on window), the suggested course stays the same until the round is sent, and one dish never appears in two suggestion lists at once.

- The success page points to the waiter right away: a card with Call waiter, Water, Cutlery and The bill.
- If the guest goes back to the menu within 10 minutes of ordering, a two-step tour shows once: the waiter button and table games. It can be skipped.
- Table games (a short food quiz and a spin to pick who chooses dessert) sit beside Play to order, and a "Your food is on its way" card leads to them after an order.
- After payment, each dish gets a thumbs up or down, with reason chips on a thumbs down. Guests who shared a number are asked the same on WhatsApp.
- "Your meal" sits on the menu after the first category, never at the top (founder: a good-to-have), and has no tour step.
- "Your meal" is a course track: one node per course (a photo when served, a pulsing ring for the next course), a progress bar and one clear next step.
