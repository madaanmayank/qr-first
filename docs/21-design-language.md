# 21. Design language

The design language for every surface: merchant dashboard, guest app, staff app, diner home, printed QR material and messages. Any brief for UI work MUST include this file in full.

This is a new language. It is not derived from any existing vendor's product. Reference products are studied for the reasons they work, never for their look. See [23-reference-products.md](23-reference-products.md).

**Status:** direction and rules are set here. Final tokens, typefaces and the first looks are chosen in stage 1 of [00-master-plan.md](00-master-plan.md). Section 9 gives a starting point so no agent is blocked.

## 1. The feeling

**The north star (founder, 15 Nov 2026):** the product must never feel only transactional or functional. It should feel like part of the dine-in experience itself, the way good service, the room and the food do. Every screen is judged by one question: does this make the meal at this restaurant feel better, or only faster?

What that means in practice:

- **The restaurant is present.** Its photos, story, people and voice appear on the surfaces guests touch, so the phone feels like the restaurant's own.
- **The table is the context.** Screens know where the guest is in the meal (arriving, choosing, waiting, eating, paying, leaving) and speak to that moment.
- **Waiting is part of the meal.** Order status, the kitchen's progress and small moments of delight fill the wait, instead of a blank receipt.
- **Hospitality in words.** Copy sounds like a good host, not a checkout.
- **Motion is service.** Transitions feel like a plate being set down: calm, deliberate, never mechanical.
- **Transactions stay invisible.** Paying, tax and stock are handled precisely and quietly, without becoming the centre of the screen.


Four words, in priority order:

1. **Calm.** The interface is quiet so that food, people and numbers stand out.
2. **Clear.** One main thing per screen. Plain words. Nothing to decode.
3. **Warm.** It feels like being looked after by a good host.
4. **Crafted.** Small details are deliberate and consistent.

The target is a product that still looks current in 2027 and 2028. That comes from restraint, strong typography and real content. It does not come from effects that date quickly.

## 2. Design principles

These are the founder's standing design direction. They apply to every screen.

1. **Derive from the product, never from a recipe.** Each surface gets answers that come from what it is for. Do not repeat the same effect on every screen.
2. **Motion explains.** Use motion to show where something came from, what the system is doing, and that an action landed. If a motion explains nothing, remove it.
3. **Personality comes from the restaurant and its people.** Put warmth where software is usually silent: first run, waiting, empty states, success.
4. **Consistency signals care.** One icon family, one type scale, one spacing scale, one rule for corners. No exceptions.
5. **Never leave a blank.** Every empty state offers the next step, using what we already know about the store.
6. **Be where the user already is.** For owners in India that is the phone and WhatsApp. Design re-entry points there.
7. **The first screen decides.** The first screen of sign-up, the first view of the generated menu and the first scan are designed with the most care.
8. **Small details compound.** Alignment, number formatting, loading order and copy tone are part of the design.
9. **Learn the why.** When a reference feels good, name the principle, then express it our own way.

## 3. The human element

"Human" is specific in this product. It means the people of the restaurant and the diner are visible, and the software speaks like a person.

| Where | How the human element shows |
| --- | --- |
| **Voice** | Short, plain, kind sentences. Written as one person to another. "Your menu is live." "Table 6 is asking for the bill." |
| **The host's words** | The owner can write a short welcome and a thank-you. Guests see it signed with the owner's or restaurant's name |
| **Names** | Staff are named in the product: "Sent by Ravi", "Prepared by the tandoor station". Diners are greeted by name when known |
| **Time and place** | Greetings follow the time of day and the store's own rhythm: breakfast, lunch rush, late evening |
| **Real photography** | The restaurant's own food and space come first. Generated images are a fallback and are marked as illustrative |
| **Numbers in sentences** | Home tells the day as a short story before showing tables: "A steady lunch. 42 orders, most of them thalis." |
| **Gratitude and recovery** | Thanks after payment feels personal. A low rating gets a human reply path, never a template wall |
| **Hands** | Touch targets, gestures and motion respect how people hold a phone in a busy restaurant, often one-handed |

What the human element is not:

- Stock illustrations of people, cartoon food, or a mascot on every screen. The one designed waiter character in [26-waiter-character.md](26-waiter-character.md) is the only character, shown only where it helps.
- Emoji in the interface.
- Chatty filler, exclamation marks, jokes at the user's expense.
- Fake urgency or fake scarcity.

## 4. Minimal, with rules

| Rule | Detail |
| --- | --- |
| **One primary action per screen** | Shown once, in the accent colour. Everything else is quiet |
| **Type does the structure** | Size, weight and space create hierarchy. Boxes and borders are a last resort |
| **Few surfaces** | A page background and one raised surface. No nested cards |
| **Hairlines over boxes** | Lists are separated by space or a hairline |
| **Colour is rare** | Neutral interface. The accent marks action and state. Food photos carry the colour |
| **Shadows are functional** | Only on elements that float above content: sheets, menus, the preview phone |
| **Corners follow one rule** | One radius scale across the product; the look can tune it within limits |
| **Icons** | One family, one stroke weight, one grid. Icons support labels; they rarely replace them |
| **Density by context** | Guest app is airy. Staff app is dense and fast. Dashboard sits between. All three use the same tokens |
| **No decoration without purpose** | No gradients, glows, patterns or illustrations unless they carry meaning |

## 5. Typography

- **Type is the main visual element.** Large, confident headings; comfortable body text; tabular figures for money.
- **Two families at most** on any surface: a sans for interface and reading, and an optional display face for the store's name and section titles in the guest app, set by the look.
- **Indian scripts are first-class.** The interface sans MUST have a matched Devanagari companion, and a plan for Gurmukhi, Bengali, Tamil, Telugu, Kannada, Malayalam and Gujarati. Line height and sizes are tuned per script; Devanagari needs more line height than Latin.
- **Mixed-script menus are normal.** Dish names may appear in Latin and Devanagari together. Test both.
- **Numbers:** rupee symbol, Indian digit grouping (1,25,000), no decimals when the paise are zero.
- **Scale:** a small set of sizes (about six) used everywhere. No one-off sizes.

## 6. Colour

- **Neutral base** with a slight warmth, in light and dark.
- **One accent** per surface. In the dashboard and staff app it is the product's own accent. In the guest app it comes from the store's look.
- **Semantic colours** for success, warning, error and information, used only for state.
- **Veg and non-veg marks** keep their standard green and brown and are never recoloured by a look.
- **Contrast:** text meets WCAG AA in every look and mode. This is checked automatically.
- **Dark mode** is designed as its own palette. Bars and evening venues will use it as their main mode.

## 7. Motion

- **Purpose first:** entering, leaving, changing, confirming, waiting.
- **Fast and soft:** most transitions under 250 ms; nothing blocks input.
- **Spatial sense:** sheets rise from where they were opened; an item added to the cart moves toward the cart once, briefly.
- **Waiting is designed:** skeletons match the final layout; long tasks such as menu import show real progress in words ("Reading page 2 of 3", "Found 86 items").
- **The signature moments** get their own motion, designed in stage 1: the menu assembling from a photo, a look being applied in the preview, an order arriving in the kitchen, payment landing.
- **Respect reduced motion** settings and low-end devices. Motion never depends on high frame rates to be understood.

## 8. Words

- **Plain English and plain Hindi.** Write for someone reading on a phone in a busy kitchen.
- **Sentence case.** No all-caps labels.
- **Verbs on buttons:** "Publish menu", "Print QR codes", "Mark as paid".
- **Say what happened and what to do next.** "Payment did not go through. Ask the guest to try again or choose another method."
- **One term per thing,** from [glossary.md](glossary.md).
- **No exclamation marks, no emoji, no jargon** ("SKU", "modifier", "config", "sync").
- **Numbers before adjectives:** "12 items have no photo" beats "Your menu needs work".
- **Hindi is written natively** by someone who thinks in Hindi. A native speaker reviews core copy.

## 9. Starting tokens

A starting point for stage 1. Agents use these until the chosen direction replaces them.

| Token group | Starting value |
| --- | --- |
| Base unit | 4 px; spacing steps 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius scale | 6 (controls), 12 (cards and sheets), full (pills and avatars) |
| Type scale | 12, 14, 16, 20, 28, 40 |
| Weights | Regular, medium, semibold |
| Light neutrals | Warm off-white page, white surface, near-black text, two greys for secondary text and hairlines |
| Dark neutrals | Near-black page, raised charcoal surface, off-white text |
| Product accent | One deep, calm colour, chosen in stage 1 |
| Semantic | Success, warning, error, info; plus fixed veg green and non-veg brown |
| Elevation | Two levels only: sheet and floating |
| Motion | 150 ms (small), 250 ms (sheet), one standard easing, one spring for sheets |
| Touch target | 44 px minimum; 48 px in the staff app |
| Icon | 24 px grid, 1.5 px stroke, rounded joins |

- Tokens are semantic (`text.primary`, `surface.raised`, `action.primary`). Components never use raw values.
- Tokens live in one package used by every app, and by the print templates for QR material.

## 10. Moments that matter

Design these specifically. They carry the brand.

| Surface | Moment | What it should feel like |
| --- | --- | --- |
| Dashboard | The menu appears from a photo | Watching a skilled person set the table for you |
| Dashboard | Choosing a look, with the preview changing | Trying on clothes that all fit |
| Dashboard | First publish | Quiet pride; one clear next step (print QR) |
| Dashboard | Home at closing time | A calm, honest summary of the day |
| Guest | First second after the scan | The restaurant welcoming you in |
| Guest | Adding the first item | Light and certain |
| Guest | Payment success | Relief and thanks |
| Staff | A new order arriving | Unmissable and calm |
| Diner | Being recognised at a new place | Pleasant surprise, never surveillance |

## 11. Accessibility and devices

- Works on a 360 px wide Android phone with 2 GB of memory and a slow connection.
- Text scales with the device setting up to 200 percent without breaking layouts.
- All actions reachable by keyboard on the dashboard.
- Screen reader labels on every control.
- Colour is never the only signal.
- Sunlight and dim-room legibility are tested, because restaurants have both.

## 12. Checks before any screen is accepted

1. One primary action, visible without scrolling on a phone.
2. Uses only tokens and shared components.
3. Loading, empty, error and success states exist.
4. Copy follows section 8 in English and Hindi.
5. Tested with a long Hindi dish name, a 400-item menu and a 10-item menu.
6. Tested in light and dark.
7. Motion explains something or is removed.
8. No emoji, no stock illustration, no decoration without purpose.
9. Looks correct on the three reference archetypes chosen in stage 1.
10. A person seeing it for the first time can say what the screen is for within five seconds.

## 13. Founder decisions for v1 (14 Nov 2026)

These override the starting tokens in section 9 and the three first directions, which the founder rejected.

| Decision | Rule |
| --- | --- |
| **One font** | A single sans family across every surface, using weights for hierarchy. Chosen 15 Nov 2026: Plus Jakarta Sans, with Noto Sans Devanagari for Hindi. No serif, no display face, no wide or condensed cuts. Sizes 12, 14, 16, 20, 28, 40, plus 10 for capitals tags and small labels on photos (Customisable, Signature, counts); weights 300 (large display only), 400, 500, 600, 700; letter-spacing +0.1em for capitals labels, -0.02em for large headings, 0 elsewhere; tabular figures for every price. `design/check-type.py` fails on anything else. **One exception (founder, 15 Nov):** everything the waiter says (his pill label, chat messages, chat header, call card) is set in Nunito, a rounded sans, so his voice is recognisable; it uses the same sizes and weights. Weights lean light: bold (700) is kept for buttons, names use 600, labels 500 |
| **White only** | v1 has a white background everywhere. No tinted page colours and no dark mode in v1 |
| **Curves** | Rounded shapes throughout: large radius on images, cards, sheets and buttons |
| **Bold CTAs** | The important action on a screen is a solid, saturated, large button (Add, Add to order, View order, Send to kitchen). Secondary actions are soft tints |
| **Large item images** | The dish is the focus. Menu rows carry a large image; the item sheet opens with a hero image |
| **Colour by role** | Each kind of element has a fixed colour: primary for actions, amber for "your usual" and popular, violet for personal picks and play, green for veg and done, blue for information, rose for alerts and sold out |
| **Consistent text** | A fixed scale of five sizes. An item name is the same size and weight on every screen |
| **Instant, rewarding add** | Add responds in the same frame. The button turns green with a tick, the item flies to the cart, and the sticky cart bar bumps. Specified in [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 1c |
| **Stock is always clear** | Sold-out items and choices are visible, tagged and explained, in the menu, the item sheet and the cart. Rose is the colour of sold out and alerts |
| **One character** | A single designed waiter character answers guests' questions. It is tinted with the store's accent and wears the store logo. It appears in the dock, the item sheet, the cart notice and waiting states, and nowhere that would distract. See file 26 |
| **Brand is first-class** | The restaurant's logo, cover image, tagline, story and signature dish appear on the menu header, the order screen, the table tent, the bill and the WhatsApp receipt. Real photography is used wherever it exists |
| **Phone first for merchants too** | Every merchant and staff screen (dashboard, stock in and out, menu edits, switches, offers) is designed and tested at phone width first and is fully usable one-handed. Desktop is a larger layout of the same screens |
| **Vertical budget** | Top bar 52px or less once compact, category bar 44px or less, bottom action bar 64px or less plus the safe area. Bars attach to the screen edge, never float with margins. Scroll areas get matching padding so nothing hides behind a bar |
| **Glass bars** | Sticky top bars, category bars and bottom action bars use frosted glass (semi-transparent white with blur), a hairline border and a soft shadow. They never look flat. The bottom action bar carries a light tint of the brand colour so the main action draws the eye |
| **Action in the first fold** | Every screen shows its main action without scrolling. The item page keeps its Add bar visible at all times and shows the first choice within the first fold |
| **Truncation rules** | Dish names: 2 lines in cards and lists, 1 line in compact places. Choice names: 1 line. Descriptions: 2 lines. Prices never wrap. Always an ellipsis, never overflow |
| **Small overlays on photos** | At most two small overlays per photo: a tiny chip (Signature, Sold out) and a small round Add. Text on a photo always sits on a translucent scrim |
| **Micro-interactions are the product's signature** | Bouncy, springy motion everywhere it explains something: elastic overscroll at the top and bottom of lists, the Add button popping into a tick then growing into the stepper, sheets arriving with a spring, a press feel on every tappable element. This is a stated differentiator, not decoration. All of it respects reduced motion |
| **The waiter lives behind a buzzer** | A round buzzer sits above the cart bar. The animated waiter character peeks out from behind it now and then to say a short line, then hides. Tapping the buzzer offers Call a waiter (water, bill, cutlery, help) or Ask Captain. See file 26 |
| **Search is a pop-up, not a page** | Search opens in the top half of the screen, leaving the bottom half to the phone's keyboard. Before typing it shows popular dishes; as the guest types, matching dishes replace them |
| **One category at a time** | The sticky bar shows only the current category (with its dish count) and a dropdown for the rest, plus the search button. No restaurant name or table number while scrolling the menu |
| **Search is always one tap away** | A search button sits at the right end of the sticky category bar (or at the top of the side rail) |
| **Loading** | Every screen that builds from data shows a skeleton in its final layout while loading, never a blank or a spinner alone |
| **Layouts are the restaurant's choice** | Guests never see a layout switch. The restaurant picks grid, list or side rail. Category navigation is text only in v1, with no category images |
| **For the masses** | Familiar patterns from food ordering that people already know, executed cleanly. Easy first, distinctive second |

- Working file: `design/v2.html` (menu, item, order). The earlier board `design/index.html` is kept for the dashboard interactions only; its visual directions are retired.
- Reference study still to do: food ordering products broadly, and how Square's website themes stay clean while offering choice.

- **Re-renders never replay entrances (15 Nov 2026).** A sheet or page slides in once, when it opens. Taps inside it (choices, steppers, swaps) change only what they touch; the page must not jump, and looping animations keep their rhythm.
- **Bars stay put.** Scroll areas contain their own scroll (`overscroll-behavior: contain`), so the cart bar, assistant button and back button never move with the browser page. On a phone the guest app fills the screen.
- **Nutrition in the first fold.** On the item page, calories plus protein (sugar for desserts and drinks) and spice sit in their own small white card under the description, above any choices, with large numbers and small labels, and follow the chosen portion. The card is visibly separate from the dish name block.
- **Item navigation sits with the dish name.** Previous and next are two round buttons on either side of the dish name and price, and stay still while the dish changes. The position (03 / 12) is quiet text at the top right of the photo band. Never loose arrows over the photo.
- **Light motion.** Animate only transform and opacity, 0.25 to 0.35 s, with one gentle settle and no big overshoot. No clip-path or shadow animations, at most one looping animation on screen (the assistant button), and one light blur on glass bars.
- **No action under the next tap.** A button that moves the guest to another page never sits where that page's Add button will appear, and Add ignores taps for 0.7 s after a page change.
- **A sold-out cart line** shows what ran out, the quantity it covered ("4 × not charged"), one suggested swap that keeps the quantity, and a small remove button. Option and combo-part sell-outs use the same pattern with the price difference per item.

- **Entry is part of the meal (15 Nov 2026).** The guest app opens on a short splash in the restaurant's colour: food icons that turn into each other inside the logo tile, a line in small tracked capitals whose changed words swap while shared words stay ("Setting your table", "Firing up the tandoor", "Plating your menu", "Your table is ready"), and the waiter rising to say hello. Then a shimmering skeleton, then the menu rises in, block by block. Under 4 seconds in all.
- **Categories:** in the first fold, all categories show as horizontal chips with counts. Once the bar sticks, it collapses to the current category with "NN ITEMS" in small capitals, a dropdown, a Veg toggle and search.
- **Search** is a frosted glass card over a lightly dimmed menu, with a placeholder that types dish names, quick gradient chips (Kebabs, Veg, Sweet, Light) and popular dishes first. Picking a dish with choices closes search before the item page opens.
- **Add** sends the dish photo itself on a curve into the cart bar's thumbnails. The thumbnail catches it and the total counts up. Confetti is kept for sending an order.
- **Suggestions** shimmer once when they appear. A suggestion row always shows a third dish half cut off, which nudges once, so guests see there is more.
- **Colour sits on elements, not backgrounds.** Chips, tiles and cards stay white or light grey; colour goes on icons and text. Suggested questions are two slowly drifting rows of plain chips with coloured text, which pause when touched.
- **No lonely words.** A heading or short line never leaves one or two words alone on its last line: short text balances its lines, body text avoids a single last word, and copy is shortened where that reads better.
- **Categories are clearly separated:** a soft 8px grey band between categories, and a roomier header with the count beside the name.
- **Class names are unique.** A new style never reuses a class name that already exists (two clashes, `g2` and `gm`, broke the menu grid on 15 Nov).

## 14. Screen hierarchy (UX first)

Design every screen from what the guest is trying to do there, not from the features available. List the guest's question for that moment, order the content by it, and push anything that serves us further down or behind a tap.

| Screen | The guest's question | Order on the screen |
| --- | --- | --- |
| **Menu, first visit** | What is good here, and how do I order? | Compact brand header, picks, categories and dishes. Filters stay small |
| **Menu, returning guest** | Can I have my usual? | One welcome line, then the usual card, then the menu |
| **Menu, after a round is sent** | What did we order, and what next? | The round with the kitchen (with Again), the next course, then the menu. No greeting or usual |
| **Item page** | What is it, and how do I get it the way I like? | Photo, name, price, one line of description, required choices, quantity, Add bar. Nutrition, compare and Ask come after |
| **Cart** | Is this right, and how do I send it? | Summary line, dishes (problems first), one quiet pairing, bill, Send. Notes and extras stay small |
| **Order success** | Did it go through, and when will it come? | Confirmation, time to table, next round suggestions, bill folded into one line, pay note |
| **Merchant screens** | What needs me right now? | Alerts and today first, then the task, then settings |

Rules:

- One primary question and one primary action per screen.
- Anything that repeats what the screen already says is removed (for example, a count shown twice).
- A section that does not help this moment is hidden, not just moved lower.

## Changes

- 15 Nov 2026: founder rules added to section 13: phone first for merchant tools, vertical budget, glass bars, an action in the first fold, truncation, small overlays, layouts chosen by the restaurant, text-only categories in v1. Chosen guest design: Dark cards (`design/app-v3.html`).

- 14 Nov 2026: founder rejected the first three directions (fonts, tinted backgrounds). Section 13 added: one font, white only, curves, bold CTAs, large item images, colour by role.
- 14 Nov 2026: file created. Direction set by the founder: minimal, clean, modern, human; rethink from first principles.
