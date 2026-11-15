# 18. AI integration

Where AI is used in the product, how each use is built, and the rules that keep it safe, cheap and reliable. A second part covers using AI systems to build the product itself.

## 1. Principles

1. **AI removes setup work and decisions.** Its main job is to make the 15-minute onboarding and the small settings list possible.
2. **AI proposes, a person confirms** wherever money, tax, allergens or legal text is involved.
3. **The order path never waits on AI.** Scan, menu, cart, send, pay and kitchen work with every AI feature switched off or failing.
4. **Structured output only.** Every AI call returns JSON that is validated against a Zod schema. Invalid output is retried once, then the feature falls back.
5. **Grounded in store data.** Answers and suggestions come from the store's own menu and events, passed in the request. The model is told to say "not known" when data is missing.
6. **Measured.** Every feature has an evaluation set and a live quality metric.
7. **Cost has a budget per store per month**, enforced by the gateway.
8. **Privacy.** No guest contact data is sent to a model. Store data is not used to train third-party models (decision D13).

## 2. The AI gateway

One internal module, `AiGateway`, is the only code that calls a model provider.

| Responsibility | Detail |
| --- | --- |
| Model choice | Maps a task tier to a model. Default provider: Claude models through the API. Tiers: **fast** (small model) for classification, tagging, translation; **standard** (mid model) for menu import, descriptions, report answers; **deep** (largest model) for hard menu extraction retries and offline analysis |
| Prompts | Stored in the repo as versioned files with typed inputs |
| Output | Requests structured output and validates with Zod |
| Caching | Hash of prompt version + input; identical requests return the stored result. Prompt caching at the provider for long shared context such as the menu |
| Batching | Non-urgent work (translations, nightly insights) goes through the provider's batch mode |
| Limits | Per-store and global budgets, timeouts, one retry |
| Logging | Writes an `ai_run` row: feature, model, prompt version, tokens, latency, outcome, reviewer |
| Fallback | Each feature declares what happens on failure |
| Testing | A fake gateway replays recorded outputs |

## 3. AI features in the product

### Onboarding and menu

| Feature | Input | Output | Tier | Human check | Fallback |
| --- | --- | --- | --- | --- | --- |
| **Menu import** | Photos, PDF or spreadsheet of a menu | Categories, items, prices, option groups, dietary type, with a confidence per field | standard, deep on retry | Owner reviews; low-confidence fields highlighted; publish blocked until dietary type is confirmed | Manual entry |
| **Option group detection** | Item text such as "Half / Full", "Add cheese +30" | Reusable option groups | standard | Shown in the review step | Owner adds groups |
| **Descriptions** | Item name, category, existing text | Short description | fast | Owner accepts or edits | Blank |
| **Automatic course sorting** | Item name, description, category, existing items | `course`, `spice`, `shareable` | fast, runs on every add or edit | Shown as an editable tag; an owner's edit is final and is never overwritten | Item stays unsorted and is not used for course-based suggestions |
| **Nutrition estimates** | Item name, description, portion, cuisine, similar items on the menu | `kcal`, `proteinG` per serving, with confidence | standard, batch | Labelled "AI estimate" until the owner confirms; owner can edit | No nutrition row is shown |
| **Tag suggestions** | Item name and description | Dietary and factual tags | fast | Owner confirms. Allergen claims are never auto-published | None |
| **Translation** | Menu text, target languages | Translations with dish names transliterated | fast, batch | Owner can correct; human edits are kept | Primary language |
| **Photo help** | Item photo | Crop, lighting fix, background clean-up, quality flag | image tooling | Owner approves | Original photo |
| **Dish image generation** | Item name, description, cuisine, an optional reference photo from the store | A menu-style image for items with no photo, in one consistent look per store | image model, batch | Owner approves each image; marked "illustrative" to guests; never shown as a real photo of the dish | Card layout without photo |
| **Bulk enrich** | Whole menu | One action that fills missing descriptions, tags, translations and images, shown as a review list | fast + image, batch | Owner accepts all, some or none | Nothing changes |
| **Store setup guess** | Menu and address | Suggested service style, stations and category routing | fast | Owner confirms in onboarding | Preset defaults |
| **Tax class guess** | Item names | Suggested tax class (for example alcohol) | fast | Owner confirms | Default class |

### Guest side

| Feature | Input | Output | Tier | Guardrail | Fallback |
| --- | --- | --- | --- | --- | --- |
| **Waiter character** | Guest question, menu snapshot with courses and nutrition, live stock, cart, preferences when allowed | Answer, suggested items, compare screen, optional cart change that waits for a tap | standard, streamed | Facts only from menu data; never states allergen facts; calls staff when unsure. See [26-waiter-character.md](26-waiter-character.md) | Button hidden |
| **Search understanding** | Query such as "something spicy, no onion" | Filter over tags and text | fast | Results are real items only | Plain text search |
| **Recommendations** | Order events | "Goes well with", "Popular here", "Order again" | Statistics first; no language model needed | Holdout measurement | Section hidden |
| **Realtime recommendations** | Current cart, time of day, order type, party size, what is sold out, what the table has already ordered | One next-best item in the cart and one on the item sheet ("Add a drink?"), re-ranked on every cart change | A small ranking model served by the API in under 50 ms; no language model in the request path | Never recommends sold-out or unavailable items; at most one suggestion per screen; holdout measurement | Static "Goes well with" |
| **Recommendation reasons** | Item pair and store data | A short reason line such as "Popular with biryani" | fast, precomputed nightly and cached in the snapshot | Reasons state facts from order data only | No reason line |
| **Staff upsell prompt** | Open tab on the POS | One suggestion for the captain ("Table has no desserts yet") | Same ranking model | Shown once per tab | Hidden |

### Staff and owner

| Feature | Input | Output | Tier | Guardrail | Fallback |
| --- | --- | --- | --- | --- | --- |
| **Ask your data** | Owner question, report schema | A query over approved report views, then a short answer with the numbers | standard | Read-only views; store-scoped; shows the figures it used | Standard reports |
| **Daily summary** | Yesterday's events | Three to five lines: sales, standouts, problems | fast, batch | Numbers come from queries, the model only words them | No summary |
| **Feedback digest** | Ratings and comments | Themes and the items involved | fast, batch | Comments quoted without guest identity | Raw list |
| **Menu engineering** | Views, carts, sales, margin when known | Suggestions: rename, re-photo, re-price, reorder, drop | standard, weekly | Suggestions only; owner applies | None |
| **Low-rating alert text** | Rating, tab items | One-line alert to the manager | fast | No guest contact data | Template text |
| **Campaign drafts** | Segment, offer | WhatsApp message draft within template rules | fast | Owner approves; consent enforced by the system | Templates |
| **Supplier invoice reading** (later) | Photo of a purchase bill | Line items for inventory | standard | Owner confirms | Manual entry |

### Platform side

| Feature | Use |
| --- | --- |
| **Support assistant** | Answers owner questions from the help content and the store's own config; hands over to a person on request |
| **Anomaly notes** | Flags stores with falling payment success, print failures or unusual voids |
| **Onboarding rescue** | Detects a stalled setup and sends the next step on WhatsApp |

### How realtime recommendations are built

1. **Nightly job per store:** from the event log, compute item pair scores, popularity by hour and order type, and attach rates. Stores with little history borrow from cuisine-level patterns built from anonymous, aggregated data.
2. **Serve:** `POST /price` (already called on every cart change) also returns the top suggestion. Ranking uses the precomputed scores plus live context. No extra request from the client.
3. **Learn:** impressions, adds and dismissals are events. The nightly job uses them.
4. **Measure:** a random holdout of sessions sees no suggestions. Uplift in items per tab and tab value is reported per store.

### The chatbot in one place

- **Guest waiter character:** text and voice input, in the guest's language, as a designed character. Tools: search and filter the menu, explain a dish, compare two items, suggest a meal by course, propose an add or swap (always confirmed by a tap), show order status, call staff. Full specification in [26-waiter-character.md](26-waiter-character.md).
- **Owner assistant in the merchant dashboard:** "add a paneer roll at 120 under Rolls", "mark all desserts sold out", "what sold best last Friday". It turns requests into the same API calls the screens use, shows a preview, and applies on confirmation.
- **WhatsApp assistant (later):** the same tools over WhatsApp for direct ordering and support.
- All three share one tool layer and the rules in section 6.
- The owner assistant and external agents run store changes only through the command catalogue in [25-configuration-and-commands.md](25-configuration-and-commands.md).

### Automatic sorting, nutrition and compare

**Sorting.** The course list is fixed: `starter`, `main`, `side`, `bread`, `rice`, `dessert`, `drink`, `snack`. The model sees the item, its category and a sample of the store's other items for context, and returns one course with a confidence. Items with low confidence are flagged in the review list. Indian names (for example "Dahi Bhalla", "Kheer", "Jaljeera") MUST sort correctly. Combos are not sorted; they take the courses of their parts.

**Nutrition.** The model returns calories and protein per serving, with a confidence, using the item name, description, portion and similar dishes. The result is an estimate. It is shown as "about", is labelled as an AI estimate until the owner confirms it, and can be edited. Nothing else is estimated in v1 (no carbs, fat, sodium or allergens).

**Compare verdict.** The text is built from the stored numbers by a template, optionally smoothed by the model. It can only mention fields that exist for both items and can never state which is healthier overall.

**Contextual suggestions.** Suggestions use course gaps in the cart, time of day, order type, party size, diet, history and live stock, as listed in [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 1f. The ranking is a small statistical model that runs in under 50 ms. A language model is used only to word the reason line, and the reason always comes from real data.

**Evaluation bars for release 1A.**

- Course accuracy of 95 percent or more on a set of at least 300 Indian menu items across all twelve archetypes in [24-first-100-delhi.md](24-first-100-delhi.md).
- Nutrition within 25 percent of reference values for at least 80 percent of items in a reference set that includes common Indian dishes. Items outside the bar show no nutrition row.
- 100 percent of nutrition displays carry the "about" wording and the estimate label.
- The waiter character passes the checks in [26-waiter-character.md](26-waiter-character.md) section 11.

### Journey plan: the meal journey adapts to each menu

The meal journey in [05-guest-ordering-flow.md](05-guest-ordering-flow.md) section 1g never assumes a fixed set of courses. An AI planner builds a **journey plan** for each store from its own menu.

**When it runs:** after menu import, after any publish that adds, removes or re-sorts items, and on request from the owner.

**Input:** every item with its course, tags, price, category, and the store's archetype guess (file 24).

**Output: a plan of 2 to 5 stages.** Each stage has:

| Field | Meaning |
| --- | --- |
| `key` | Stable id |
| `label` | What the guest sees, 1 or 2 words ("Starter", "Your scoop", "A drink") |
| `match` | Which items belong: a course, a set of tags, or a category |
| `order` | Position on the path |
| `optional` | An optional stage is shown but never nudged |
| `hint` | One short line used when the stage is next ("Something to sip with it") |

**How the planner decides:**

1. **A full meal menu** (at least three distinct courses with items): stages follow the courses present, in meal order. A course with no items never appears.
2. **A single-course menu** (a dessert parlour, a coffee bar, a chaat stall): stages come from tags and categories within that course, ordered as people build an order. A dessert parlour might get "Your treat", "A topping", "Something to sip", "A box to take home". A coffee bar might get "Coffee", "Something baked", "A plate".
3. **A drinks-led menu** (a bar): stages follow the evening: "First drink", "A bite", "Something bigger", "Another round".
4. **Too little structure** (fewer than two meaningful stages): the journey is hidden. The plain "Picked for you" suggestions remain.

**Every plan is checked:** each stage must have at least two available items, labels stay within 12 characters, and stage order follows a sensible meal order. A plan that fails falls back to rule 4.

**The owner stays in charge:** the plan appears in the dashboard as a row of stages that can be renamed, reordered, marked optional or switched off. An owner's edit is final and is never overwritten by a later AI run (the same rule as course tags).

**Live behaviour:** stages fill from what the table has sent and what is in the cart. The next empty, non-optional stage glows. Its suggestions come from the recommendation service and always respect stock, diet and what the table already has.

## 4. Feature build template

Every AI feature is specified with these fields before it is built.

```
Feature:
User and moment:
Input (and what is excluded for privacy):
Output schema (Zod):
Model tier and why:
Prompt file and version:
Human confirmation step:
Fallback on failure or low confidence:
Latency target:
Cost budget per call and per store per month:
Evaluation set (size, source, pass bar):
Live metric (acceptance rate, edit rate, thumbs):
```

## 5. Evaluation

- Each feature has a fixed evaluation set in the repo. Menu import starts with at least 50 real Indian menus across formats and languages.
- CI runs the set when a prompt, model or schema changes. A drop below the pass bar blocks the change.
- Live metrics: owner edit rate after import, acceptance rate of suggestions, assistant thumbs, report-answer corrections.
- Menu import pass bars for release 1A: item name accuracy 97 percent or more, price accuracy 99 percent or more, dietary type flagged for review whenever uncertain.

## 6. Safety rules

- Menu text, guest messages and uploaded files are untrusted input. Prompts keep instructions separate from data, and the model's output can only fill the declared schema.
- The assistant has a fixed tool list: search menu, get item, propose add to cart. It cannot change prices, apply discounts or access other guests' data.
- "Ask your data" can run only parameterised queries over read-only views for one store.
- AI-generated or AI-edited images are labelled in the merchant dashboard; owners are told when a dish photo is generated.
- Allergen, medical and legal statements are never generated. The product shows stored facts or says to ask staff.

- Nutrition numbers are estimates. They are labelled, correctable, and never used for medical or dietary claims.
- Allergen, gluten, diabetic, weight loss and other health statements are never generated. Questions about them go to a staff member.
- An AI estimate is replaced, never blended, when the owner confirms or edits a value.
## 7. Cost control

- Use the smallest model tier that passes the evaluation set.
- Cache by input hash; menus change rarely, so translation and tagging are mostly cache hits.
- Batch anything that is not interactive.
- Free-tier stores get menu import, translation and descriptions within a monthly allowance; heavier features belong to paid tiers.
- The gateway reports cost per store, so pricing decisions use real numbers.

## 8. Using AI to build the product

For a build system or coding agents working from this pack.

- **Start from [AGENTS.md](../AGENTS.md) and [12-build-plan.md](12-build-plan.md).** One milestone per work session or agent run, with its acceptance checks as the definition of done.
- **Contracts first.** Generate or write `packages/contracts` and `packages/engine` before any screen. Agents working on different apps then share one source of truth.
- **Tests as the brief.** For each milestone, write the acceptance tests first, then the implementation.
- **Parallel work** is safe across apps (guest, staff, api) once contracts exist. Two agents never edit the same package in the same run.
- **Review pass.** A separate review run checks each change against the ten hard rules, the settings count and the budgets.
- **Docs stay current.** A change in behaviour updates the home file in the same pull request, with a dated line under "Changes".
- **No invention of rules.** When the pack is silent, the builder chooses the simplest option that fits the principles and records it. Tax and legal details are flagged for human confirmation.
- **Seed data.** Use invented stores and menus. Never use data from any real vendor or merchant system.

## Changes

- 10 Nov 2026: file created.
