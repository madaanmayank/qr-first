# 28. The product suite

How the products fit together, what each one is for, and the order to build them. Home files hold the detail; this file holds the whole.

## 1. Five products, one guest record

| Product | Job for the restaurant | Job for the guest | Home |
| --- | --- | --- | --- |
| **QR guest app** | More orders per table, no missed orders | Browse, order, pay, with no waiting | 05, 21 |
| **Waiter** | Service without a staff member at the table | Ask, order by mood, call for water, tissues, cutlery, the bill, raise a concern | 26 |
| **Feedback** | Hear problems first, earn public reviews | Be heard in one tap | 29 |
| **Return suite** | Repeat visits and fuller slow hours: win-back, loyalty, campaigns | Offers and reminders that are true and few | 27 |
| **Staff tools** | Requests, briefing, stock, kitchen | Faster, more personal service | 06 |

Free UPI pay and the bill sit under all five (file 15, 17).

**Why they are one suite:** every product reads and writes the same four things.

- **One guest record** per restaurant: visits, dishes, notes, feedback, consent.
- **One order engine:** rounds on a tab (rule 6).
- **One message channel:** WhatsApp, with one consent and one frequency cap.
- **One request queue:** everything a guest asks for lands in the staff app.

## 2. The loop

`Scan → greet → order → wait → eat → pay → feedback → return`

| Moment | Product at work | What it produces for the next moment |
| --- | --- | --- |
| Scan | QR app, Waiter | Who the guest is, what they had last time |
| Order | QR app, Waiter | Dishes, notes, mood and taste signals |
| Wait | Waiter, table games, add-on window | Extra dishes, a calmer wait |
| Eat | Waiter (requests, concerns) | Problems caught before the guest leaves |
| Pay | UPI | Phone number, consent, visit record |
| After | Feedback (QR, then WhatsApp) | Dish scores, happy guests to reviews, unhappy guests to recovery |
| Later | Return suite | The next visit |

A product that does not feed the next moment is not built.

## 3. Build order

Each step is useful alone and makes the next one cheaper.

| Step | What ships | Depends on | Proof it works |
| --- | --- | --- | --- |
| 1 | QR guest app: menu, cart, rounds, notes, add-on window | Order engine, menu snapshot | Orders per table, add-on rate |
| 2 | Waiter, requests only: six buttons, staff queue with acknowledge | Staff app | Median time to answer a request |
| 3 | Feedback in QR: overall rating, dish thumbs, concerns | Guest record | Share of visits with feedback, recovery rate |
| 4 | Pay by UPI, consent at payment | Aggregator | Share of bills paid by QR, opt-in rate |
| 5 | WhatsApp: receipt, feedback follow-up | Messaging provider, templates | Reply rate |
| 6 | Waiter, conversation: mood, picks, typed questions (AI) | AI gateway, evaluation set | Share of orders started with the waiter |
| 7 | Return suite: thank-you, win-back, stamps | Steps 4 and 5 | Repeat rate against a holdout |
| 8 | Campaigns: slow hours, occasions, news | Step 7, enough visit history | Extra tables in targeted slots |
| 9 | Group ordering, table games, play to order | Step 1 | Party size per order, time on app |

Steps 1 to 3 need no phone number and no payment. They are the first sale.

## 4. What each product must give the others

- **QR app → Return suite:** dishes eaten, visit times, party size.
- **Waiter → Feedback:** a concern raised at the table counts as feedback and blocks the review prompt.
- **Feedback → Return suite:** an unhappy guest gets recovery, never a promotion, until resolved.
- **Feedback → Menu:** a dish with repeated low scores is flagged to the owner and drops out of suggestions.
- **Return suite → QR app:** the offer the guest came for is applied when they scan.
- **All → Staff tools:** one line per table: who they are, why they came, what to watch.

## 5. How it is sold

| Pack | Contains | Price logic |
| --- | --- | --- |
| **Start** | QR app, Waiter requests, Feedback in QR | Free or low: it earns the right to the rest |
| **Pay** | UPI at the table, WhatsApp receipt | Free UPI; the cost is ours to acquire data |
| **Grow** | Return suite, campaigns, AI waiter conversation | Paid: priced against measured extra visits |

The merchant sees one weekly number per pack: orders, answered requests and rating; bills paid by QR; guests who came back.

## 6. Other directions to consider

Ranked by fit with what exists. None is built before the loop above runs in 10 stores.

| Direction | Why it fits | Risk |
| --- | --- | --- |
| **Recover before they leave** | Concerns are already captured live; add a manager timer and a small make-good | Needs staff discipline |
| **Staff briefing card** | The guest record already holds name, usual, last feedback, occasion | Privacy tone must stay warm |
| **Dish-level kitchen digest** | Dish thumbs and reasons already collected | Owners may read small samples as truth |
| **Waiter in WhatsApp** | Same conversation after the visit: reorder, book, ask | Message cost, opt-in |
| **Pre-order and waitlist** | Uses the same cart and rounds | Kitchen timing |
| **Bill split in group orders** | Lines already carry who added them | Payment edge cases |
| **Referral: bring a friend** | A guest shares a table link today | Abuse controls |
| **Diner profile across restaurants** | Tastes and notes carry over | Consent per restaurant stays the rule |
| **Menu engineering for owners** | Sales, scores and suggestion take-up per dish | Advice must show its evidence |
| **Upsell coach for staff** | Suggestion data per table | Must never push the priciest dish |
| **Voice ordering in Hindi and English** | The waiter already takes free text | Noise in restaurants |
| **Slow-hour dynamic menu** | Slot data from the return suite | Price trust |

## 6a. Directions flagged as doubtful

Planner's honest view. Each is built as the founder asked; the flag says what to watch and what would change the call.

| # | Direction | Why it may be wrong | What to do |
| --- | --- | --- | --- |
| F1 | **The waiter opens by itself on every scan** | It covers the menu before the guest asked, which breaks rule 10 (one unrequested overlay) and file 26 section 3 ("never opens by itself"). Regulars who know what they want pay a tap every visit | Open it on a guest's first visit to that restaurant only; afterwards the pill. Test both on 5 stores: orders per scan and time to first add |
| F2 | **Five products at once** | The first 100 stores buy one clear thing. Selling QR, waiter, feedback, loyalty and campaigns together slows the sale and the build | Lead with Start (file 28 section 5). Do not build steps 7 to 9 until steps 1 to 3 hold in 10 stores |
| F3 | **Table games and play to order** | They cost build time and bring no number an owner pays for. They can read as a toy in a serious restaurant | Keep as switches, off by default for fine dining; drop if under 5 percent of tables use them in pilots |
| F4 | **A drawn human waiter for every restaurant** | One face cannot suit a dhaba, a cafe and a fine-dining room. The art is generated concept work: rights and consistency across new poses are not secured, and true animation needs a vector rig | Commission an original rigged character with two or three looks; let a store hide the face and keep the buttons |
| F5 | **The 5-minute add-on window joins the same round** | The kitchen may already have fired the ticket; late dishes then arrive as a surprise | Kitchen sees them as an add-on ticket; the window closes early once the first dish is marked ready (decision D29) |
| F6 | **Free UPI** | UPI has no merchant fee, yet the aggregator, settlement and support cost us on every bill | Free up to a monthly volume; confirm unit cost before promising it in sales material |
| F7 | **AI nutrition numbers on every dish** | A wrong calorie or sugar figure is a trust and legal risk in India | Off until the owner confirms the numbers (decision D24) |
| F8 | **Dish feedback driving menu decisions** | Ten thumbs is a small sample; owners may drop a good dish | Show counts, a 4-week trend, and no advice below 30 responses |
| F9 | **WhatsApp as the only channel** | Costs and template rules can change, and one bad campaign hurts the sender's quality for every store | Keep the cap strict, add SMS as a fallback for receipts, hold a per-store sender where volume allows |
| F10 | **Typed AI chat as the main way to order** | Typing at a table is slow; most guests will tap. The cost of a model call per message adds up | Keep buttons and chips first; send only free text to the model |

**F1 decided 17 Nov 2026:** first visit only. File 26 is updated; the pilot test in F1 still runs.

## 7. Rules for the suite

- One consent, per restaurant. One promotional message a week at most, across every product.
- A guest's data never crosses restaurants.
- Every product has one number the owner can check weekly, measured against a holdout where money is spent.
- Requests and concerns always reach a person. The AI never closes one alone.
- New capabilities are feature switches (file 04). See decision D25 for the switches the prototype added.

## Changes

- 16 Nov 2026: file created from the founder's brief: waiter, QR, win-back and loyalty, campaigns, feedback in QR and WhatsApp, and other directions.
