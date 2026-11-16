# Glossary

One name per concept. Use these words in code, UI copy, analytics and documents. The "Do not use" column lists synonyms common in the industry that would cause confusion here.

| Term | Meaning | Do not use |
| --- | --- | --- |
| **Account** | Login and billing container that can own several stores. Holds no operational data. | Organisation, brand, HQ, chain, merchant |
| **Store** | One physical outlet. Owner of all config, menu, tabs and data. | Outlet, branch, location, merchant |
| **StoreConfig** | The one typed settings document of a store. | Settings profile, tier, brand settings |
| **Setting** | A value in StoreConfig that the owner chooses. | Parameter, config option |
| **Feature** | A capability with one on-off switch in StoreConfig. | Flag, module, toggle (in docs) |
| **Command** | One named, validated change to a store, with preview and undo. | Action, mutation, API call |
| **Assistant** | The AI in the dashboard that turns an owner's request into commands. | Copilot, bot |
| **Agent key** | A credential that lets an external AI agent run commands within set scopes. | API key (for agents), token |
| **Choices** | The owner-facing word for option groups on an item. | Customisation (as a noun in UI), modifiers |
| **Play to order** | The game-like mode for choosing a meal one card at a time. | Gamification, swipe mode |
| **Cart bar** | The sticky bottom bar showing count, total and the main action. | Cart button, basket bar, checkout bar |
| **Stock notice** | The calm in-app message and tags that say what is sold out. | Out-of-stock popup, error |
| **Brand kit** | A store's logo, colour, cover, tagline, story and voice. | Branding pack, assets |
| **Course** | The kind of dish: starter, main, side, bread, rice, dessert, drink or snack. Set by AI, editable by the owner. | Category (that is the owner's own grouping), type |
| **Nutrition estimate** | About how many calories and how much protein a dish has, shown as "about". | Nutrition facts, macros |
| **Compare** | The side-by-side view of two dishes. | Versus, comparison tool |
| **Waiter character** | The designed character guests can ask about dishes. Working name Captain. | Chatbot, bot, mascot |
| **House note** | A short owner note on an item that the waiter character may use. | Tip, tooltip |
| **Your usual** | A known diner's last or most repeated order at a store. | Favourite, reorder |
| **Preset** | A set of default setting values chosen by service style. | Template, profile |
| **Service style** | Counter, Table or Hybrid. | Mode, business type |
| **Spot** | A place an order belongs to: table, counter or pickup point. Has one QR. | Table (as a general term), station, zone |
| **Menu** | A store's categories, items and option groups. | Catalogue, price list |
| **Menu snapshot** | An immutable published build of the menu and guest-facing config. | Menu version, cache |
| **Category** | A menu section. May have one level of sub-category. | Group, section |
| **Item** | Something a guest can order. | Dish, product, SKU |
| **Option group** | A set of choices on an item with a minimum and maximum. | Modifier group, customisation, variant, SKU, combo step |
| **Option** | One choice in an option group. May link to an item. | Modifier, add-on, choice, variant |
| **Combo** | An item whose option groups contain linked items. A use of the item model, with no separate entity. | Set, bundle, meal deal (in code) |
| **Tab** | One visit or order: rounds, charges and payments. | Order, bill, check, session, ticket |
| **Round** | Lines sent to the kitchen together. | Order, sub-order, course |
| **Line** | One item with its chosen options, quantity and note. | Order item, cart item (once sent) |
| **Cart** | Unsent lines on one device. | Basket |
| **Charge** | A computed line on the tab: tax, service charge, tip, discount, levy. | Fee, surcharge |
| **Payment** | One attempt to pay all or part of a tab. | Transaction |
| **Pay timing** | `before_kitchen` or `at_end`. | Prepay, postpay, pay first, pay later (in code) |
| **Balance** | Amount still due on a tab. | Outstanding, due |
| **Order type** | `dine_in` or `takeaway`. | Service type, channel |
| **Order status** | The guest screen after the first round, showing round states and the bill. | Confirmation page, success page, receipt page |
| **After-order slot** | The single card position on Order status, filled by the priority list. | Popup, banner |
| **Guest** | A person at one store, and that store's record of them. | Customer, user |
| **Diner** | A person's network identity across all restaurants, owned by that person. | User, member, consumer |
| **Merchant dashboard** | The owner and manager web app. | Back office, admin, console, CMS |
| **Live preview** | The real guest app shown inside the dashboard on draft data. | Mock-up, simulator |
| **Look** | A complete, curated visual design for a store's guest app. | Theme (in code), template, skin |
| **Accent** | The one brand colour a store chooses. | Primary colour, brand colour |
| **Store link** | A store's permanent web address and QR for use outside the restaurant. | Microsite, link tree |
| **Store page** | What the store link opens: menu, hours, directions, call, review. | Landing page, about page |
| **Content score** | A score out of 10 for the menu, cover and stories, with fixes. | Audit, health score |
| **Service request** | A call-waiter request from a table. | Bell, buzzer, ticket |
| **Archetype** | One of the twelve restaurant types used for design and testing. | Persona, segment |
| **Staff member** | A person working at the store, with a role and PIN. | User, employee, operator |
| **Station** | A kitchen destination for lines, with a screen or printer. | Printer group, kitchen zone |
| **KDS** | Kitchen display screen. | Kitchen monitor |
| **Ticket** | One round's lines for one station, on the KDS or on paper. | Docket, chit |
| **Bump** | Mark a station's ticket ready. | Complete, done |
| **Sold out** | A live flag on an item or option that stops ordering. | Out of stock, 86, unavailable |
| **Availability** | A time window when a category or item is offered. | Schedule, time-based display |
| **Linked menu** | A store following another store's menu through publish-time copies. | Shared menu, master menu, menu tier |
| **Bulk apply** | Writing chosen settings to many stores in one action. | Inheritance, override |
| **Event** | One append-only record of something that happened. | Log, track call |
| **Release flag** | A global, short-lived switch for rollout. | Feature flag per store, DB flag |
| **Rating** | The 1 to 5 score a guest gives a tab. | CES, feedback score, survey |
| **Review link** | The store's public review destination. | Google link |
| **Discount** | A reduction applied by the server from a code or rule. | Promo, voucher (in code), coupon |
| **Reward** | A benefit earned through visit stamps. | Points, loyalty benefit |

## UI wording

- Guest-facing words may be friendlier than code names. Example: the UI says "Your order" for a tab and "Choose your size" for an option group name.
- Whatever word is chosen for the UI is used on every screen and in every language catalogue.
| **Add-on window** | The 5 minutes after a round is sent in which more dishes join the same round. | Grace period, upsell timer |
| **Concern** | A problem a guest raises during the meal. Goes to the manager. | Complaint, ticket |
| **Request** | Something a guest asks staff to bring: waiter, water, tissues, cutlery, the bill. | Call, ping |
| **Dish feedback** | A thumbs up or down on one dish from a guest who ordered it. | Item rating, review |
| **Visit rating** | The 1 to 5 rating of a whole visit. | NPS, score |
| **Win-back** | Messages to a guest who is late for their own visit rhythm. | Churn campaign, reactivation |
| **Campaign** | One message to one audience with one goal, approved by the owner. | Blast, broadcast |
| **Holdout** | Guests who fit an audience and get no message, so the effect can be measured. | Control group |
| **Table order** | One shared order that everyone at a table adds to. | Group cart, party order |
| **Waiter pill** | The small bar with the waiter's face that opens the waiter. | Chat bubble, FAB |
