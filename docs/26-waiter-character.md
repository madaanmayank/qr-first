# 26. The waiter character

A designed character that guests can ask about the menu, in the way a good waiter would. It replaces the plain "menu assistant" idea. Feature key: `waiter` (see [04-settings-budget.md](04-settings-budget.md)).

**Working name: "Captain"** (Indian restaurants often call their head waiter captain). The final name and look are decision D23.

## 1. Why a character

- Guests ask better questions when they feel they are talking to someone, and a long menu is hard to read alone.
- Software is silent in many moments: waiting, choosing, a sold-out item. A character gives those moments a human voice. This follows the founder's design principle that personality belongs where the app is otherwise quiet.
- The character is part of the brand. It wears the restaurant's colour and logo, so the same character feels like each restaurant's own host.
- In spirit it is like the friendly mascots of well-known learning apps: one memorable personality that people enjoy asking things. We build our own, and never copy another product's character.

## 2. What it is and is not

| It is | It is not |
| --- | --- |
| One designed character for the whole platform | A different mascot on every screen |
| Dressed in the store's accent colour with the store's logo on its apron | A generic chat bubble or a stock illustration |
| A helper that answers, compares and suggests | A salesperson that pushes the priciest item |
| Honest about what it does not know | A source of allergen, medical or legal claims |
| Calm and brief | A nagging presence, with no streaks, guilt messages or fake urgency |

This is the only character allowed in the interface. See the rule in [AGENTS.md](../AGENTS.md).

## 3. Where it appears

| Surface | Behaviour |
| --- | --- |
| **Menu** | A small round button above the cart bar. Tapping it opens a short chat sheet. It stays quiet and never opens by itself |
| **Item sheet** | "Ask about this dish" opens the chat already focused on that item |
| **Compare screen** | "Which should I pick?" asks the character to explain the difference in a sentence or two |
| **Cart** | When something sells out, the character offers the swap in the cart notice: "Galouti has just run out. Shall I swap it for Seekh?" The guest taps to accept. See [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 1c |
| **Order status** | Short, warm waiting lines ("Your order is with the kitchen."), with no questions asked |
| **Closed hours** | Tells the guest when the restaurant opens next |
| **Not shown on** | Payment screens and any full-screen flow where it would distract |

## 3a. The assistant button and sheet (15 Nov 2026)

- **The button:** a round violet button with a slowly turning violet-to-magenta gradient, a sparkle that twinkles and a soft pulse, so it reads as "help with ordering" without words. It sits above the cart bar. The waiter hides fully behind it and pops up above it now and then with a short line, then hides again.
- **Opening it** shows the waiter, a greeting by name when known, and four actions: **Order for me**, **Menu questions**, **Make a request** (water, the bill, cutlery, help) and **Raise a concern** (food is cold, waiting too long, wrong dish, something else). Below them, suggested questions are ready to tap ("What is popular?", "Something light", "Best vegetarian", "Is the seekh spicy?", "What goes with nihari?", "Get the bill").
- **Ordering through the waiter:** it asks what the guest is in the mood for, shows dishes with Add buttons, and adds straight to the cart. Customisable dishes open their item page.
- **Requests and concerns** are logged for staff at once, and the waiter confirms in one line.
- **The bill always needs a confirmation (15 Nov 2026).** Asking for the bill from the chat, the success page or the waiter sheet first asks "Bring the bill to Table 6?", with the amount so far and a note that ordering more is still possible. Only "Yes, bring it" sends the request; "Not yet" sends nothing.
- **The waiter appears at key moments:** the welcome on the menu, the order success page (excited, with a green tick), the empty cart (thinking) and a search with no results (concerned).

## 3b. The button and chat, updated (15 Nov 2026, evening)

- **Updated 16 Nov 2026 (founder):**
  - The six buttons are Tissues, Waiter, Water, Cutlery, Bill and Concern (Tissues replaced Order). Once the conversation starts they stay pinned as a compact strip under the header, so every action is always one tap away.
  - The conversation starts with the guest's mood: "What are you in the mood for right now?" (Something light, Very hungry, Something spicy, Comfort food, Vegetarian, Something sweet), then the kind of dish (Kebabs, Curries, Biryani, Breads and sides, Drinks, Surprise me), then three picks. Refine chips (Milder, Spicier, Veg only, Under ₹300, Something else) narrow the picks as the guest goes, and "Help me choose" restarts it any time.
  - Context: the opening line uses the guest's last visit ("Last time you loved the Seekh Kebab") and, after a round, what the table has had; picks skip dishes already ordered or in the cart and lean to the next course.
  - The guest can type anything. The waiter reads the intent (a request, a concern, an allergen question, a mood, a kind of dish, a dish name) and answers or acts; requests keep the guest's own words. Picks show as round plates with a + on the edge, never as tiles.
  - His face appears beside a reply only where a reaction means something: a request done (serving), the bill question (confirming), a concern or something sold out (sorry), an allergen question (concerned). The newest face pops in. Recommendations and ordinary answers show no face.
  - The prototype reads intent with simple on-device rules so it runs without a key. The product uses the AI model in [18-ai-integration.md](18-ai-integration.md) with the same tools and the honesty rules in section 9.

- **The journey starts with the waiter (founder, 15 Nov).** After the entry screen, the waiter chat opens once per visit over the menu, with the same contents as always: the greeting and the six tiles (Order, Waiter, Water, Cutlery, Bill, Concern). Closing it shows the usual menu. The restaurant can switch the start to the menu instead. The tutorial adds only a tip; it never changes the chat's options.
- **The chat tutorial is one tip under the six tiles:** "Use any of these buttons to do what you need: order, call the waiter, ask for water, cutlery or the bill, or raise a concern." It shows the first time the chat opens and disappears after the first tap. There is no separate bell button.
- **The pill stays quiet.** Its label tours Ask me, Water?, Call waiter and Cutlery five times in the first minute or so, then the pill rests as his face with a blink. It speaks only at real moments (a greeting, a request confirmed, food on its way). No random greetings.

- **The waiter pill (replaces the round button):** a slim white glass pill, 44px tall, docked bottom right and 12px above the cart bar, never over the dishes. It holds the waiter's face in a small circle with a thin violet ring (he blinks every few seconds) and one short label that crossfades slowly: "Ask me", "Water?", "Call waiter", "Cutlery".
- While the guest scrolls, the pill shrinks to the face. It grows back a moment after scrolling stops.
- Greetings and replies ("Hi Arjun, welcome back.", "On my way. Water for Table 6.") show in the label, not as a figure popping over the menu. The full figure appears only on the order success page and in the chat header.
- The chat opens with icon tiles (Order, Waiter, Water, Cutlery, Bill, Concern), not text blocks. Answers come back as dish cards with photos and Add, after a short typing indicator. Suggested questions are one horizontal row of gradient chips, including mood prompts ("I am very hungry", "High protein").

## 4. What it knows

- The menu snapshot: names, descriptions, courses, tags, spice, nutrition estimates, house notes.
- Live stock, including sold-out choices.
- The guest's cart and the table's order so far.
- The guest's preferences and history, only when the guest is known and has allowed it: vegetarian, spice, usual order.
- Time of day, order type, party size.
- The store's story and voice.

It never knows: other restaurants' data, other guests, payment details, or anything outside this store.

## 5. What it can do

| Action | Notes |
| --- | --- |
| Search and filter the menu | By course, veg, spice, calories, protein, price, availability |
| Explain a dish | From the menu text and house notes. A short note on the dish's background is allowed when it is well known |
| Compare two items | Opens the compare screen with a plain verdict. See [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 1d |
| Suggest a meal | Completes the table by course, within budget and diet. See section 1f of file 05 |
| Add to cart or swap in cart | Always shows the change and waits for one tap to confirm |
| Show order status | Reads the live tab |
| Call a human | Creates a service request for staff. Used for allergens, complaints, payment trouble and anything it cannot answer |

All actions are tools with a fixed list. The character cannot change prices, apply discounts, reveal other guests' data or run store commands.

## 6. Example requests

| Guest says | What happens |
| --- | --- |
| "Something light under 400 calories" | Filters by nutrition estimate, shows 3 items with their numbers, marked "about" |
| "A high protein veg starter" | Course = starter, veg only, sorted by protein |
| "Which is better, the seekh or the galouti?" | Opens compare, then says in one or two sentences what differs, using the numbers |
| "I am vegetarian and I like it spicy" | Applies the preferences, suggests items, offers to remember them |
| "What goes with the nihari?" | Suggests a bread and a sweet from available items |
| "Is this gluten free?" | "I cannot be sure about allergens. Let me call someone who knows." Shows a call-staff button |
| "Add the usual" | Shows the usual with last time's choices, waits for a tap |
| "Nihari kya hota hai?" | Answers in Hindi, using the menu description and one line of background |
| "I have 600 rupees for two" | Builds a two-person suggestion under budget, by course |

## 7. Voice and manner

- Warm, brief and honest. One or two short sentences by default.
- Speaks the guest's language, including mixed Hindi and English when the guest writes that way.
- Calls the guest by name only when known, and sparingly.
- Says "about" for every nutrition number.
- Admits when it does not know and offers a person.
- Never pushes the highest price. When asked for a recommendation it gives a reason that is true.
- No exclamation overload, no emoji, no guilt, no streaks.
- Light humour is allowed. Never about food safety, health or the guest.

## 8. Look and states

- A simply drawn, warm character built from a few geometric shapes. It is expressive but restrained.
- Tinted with the store's accent colour (apron or scarf), with the store logo on the apron.
- A small set of states, each used for a reason:

| State | Used when |
| --- | --- |
| Idle | Resting in the dock button |
| Thinking | Preparing an answer |
| Speaking | Replying |
| Pleased | An item was added or an order was sent |
| Apologetic | Something sold out or went wrong |
| Resting | The restaurant is closed |

- It must read clearly at 40 px (dock) and 120 px (chat header).
- v1 is white background only, like the rest of the product.
- **Direction set by the founder (15 Nov 2026):** a rounded, soft 3D character with a black visor face, a small bellhop cap, a waistcoat and bow tie, and a towel over the arm ("The Classic Waiter" from the founder's concept sheet), with expressions for welcome, happy, thinking, explaining, apologetic, confirming, concerned, surprised, excited, serving, busy and bye. The prototype uses these expressions directly (`design/img/waiter/`).
- **Updated 15 Nov 2026 (evening):** the founder replaced the visor-face character with a young human waiter: dark curly hair, white shirt, black waistcoat, bow tie and a small gold name badge, in the same 12 expressions plus "The Friendly Host" and "The Classic Waiter" poses. Cut-outs on transparent backgrounds live in `design/img/waiter2/`.
- **Motion (light, transform only):** a hello sway when he appears (once, never replayed by a re-render), a soft breath while he is on screen, a quick squash when his expression changes, a short wave when he peeks over the assistant button and a "bye" face before he hides, and short expression sequences at key moments (order sent: excited, happy, serving, confirming). Reduced-motion settings turn all of it off.
- The form was open before that (decision D23): a friendly waiter figure, an animal character, or an abstract face. The design stage explores all three. The recommended default is a simply drawn waiter figure.

## 9. Rules for honesty and safety

- It never invents items, prices, nutrition or allergen facts. Anything it states comes from the menu data, or it says it does not know.
- Allergens, medical advice and diets with health claims always lead to "please ask staff", with a call button.
- Nutrition is an estimate and is always labelled "about".
- It never completes a purchase or changes the cart without a visible confirmation tap.
- It never shows another guest's data and never mentions other restaurants.
- Guests can clear the conversation. Chat text is kept only for the session. Anonymous, aggregated question themes (such as "many guests ask for less spicy options") MAY be shown to the owner.
- No advertising or sponsored placement inside its answers.
- If the AI service is down, the character button is hidden and the menu works normally.
- Cost and rate limits follow [18-ai-integration.md](18-ai-integration.md).

## 10. Owner controls

- The feature switch `waiter` turns the character on or off.
- **House notes:** an owner MAY add a short note to any item that the character can use ("Best with the mint chutney", "Our grandmother's recipe"). House notes are content, not settings.
- The owner can see which questions guests ask most, in aggregate, in Reports.
- The owner cannot change the character's personality or rules.

## 11. Acceptance checks

1. Every answer that mentions an item, price or nutrition value matches the menu data, tested on 100 scripted questions in English and Hindi.
2. The character refuses to state allergen facts in 100 percent of test cases and offers a staff call.
3. A cart change proposed by the character never applies without a tap.
4. When an item in the cart sells out, the swap offer appears within 2 seconds.
5. With the AI service switched off, the menu, cart and payment work and the character button is hidden.
6. A first-token response time of 1.5 seconds or less on a mid-range phone on 4G.

## Changes

- 14 Nov 2026: file created. Founder asked for a human-like guest-facing character in the spirit of well-known learning app mascots, to answer questions with awareness of course tags, nutrition and stock.
