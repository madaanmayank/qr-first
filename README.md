# Base files: a next-generation restaurant company for India

This folder holds the base files for the project. Every agent and every person working on it reads from here. Together the files plan the product end to end.

**The company brings diners and restaurants together.** Restaurants get one clean system for menu, orders, money and guests, live in 10 minutes. Diners get one well-designed way to order and pay everywhere, with their preferences and receipts carried along. The restaurant side is built first.

## Start here

1. [docs/00-master-plan.md](docs/00-master-plan.md): what we are doing, in what order, and who does what.
2. [AGENTS.md](AGENTS.md): the hard rules for any builder.
3. The files for your job, from the table at the end of this page.

## All files

### Direction

| # | File | What it answers |
| --- | --- | --- |
| 00 | [Master plan](docs/00-master-plan.md) | The company, the surfaces, the stages, agent roles, quality bars |
| 01 | [Vision and principles](docs/01-vision-and-principles.md) | What we build, for whom, and the principles behind every decision |
| 02 | [Lessons from incumbents](docs/02-lessons-from-incumbents.md) | Mistakes seen in existing systems and the rule that prevents each one |
| 20 | [Merchant offer](docs/20-merchant-offer.md) | Everything a restaurant gets from us, by job and by release |
| 23 | [Reference products](docs/23-reference-products.md) | What to learn from Square, Toast, Clover and Indian products, and what to avoid |
| 24 | [First 100 in Delhi](docs/24-first-100-delhi.md) | Twelve restaurant archetypes that every design and default is tested against |

### Design

| # | File | What it answers |
| --- | --- | --- |
| 21 | [Design language](docs/21-design-language.md) | The feeling, the rules, the human element, type, colour, motion, words |
| 22 | [Theming](docs/22-theming.md) | Looks, what a merchant controls, "Match my brand", guardrails, live preview |

### Product

| # | File | What it answers |
| --- | --- | --- |
| 03 | [Domain model](docs/03-domain-model.md) | Entities, relationships and invariants |
| 04 | [Settings and features](docs/04-settings-budget.md) | The complete list of settings and feature switches, and the rules for adding one |
| 07 | [Merchant dashboard](docs/07-merchant-dashboard.md) | Phone-first dashboard with live preview: first run, Home, Menu, Look, QR, Reviews, Money, Reports, Settings |
| 05 | [Guest ordering flow](docs/05-guest-ordering-flow.md) | The guest QR journey, the item sheet, cart, pay and order status |
| 06 | [POS and kitchen](docs/06-pos-and-kitchen.md) | Staff app, kitchen tickets, printing and offline behaviour |
| 26 | [Waiter character](docs/26-waiter-character.md) | The designed character guests can ask: what it knows, does, how it speaks, its rules |
| 27 | [Return suite](docs/27-return-suite.md) | One product for merchants: WhatsApp messages, offers, slow-hour filling, occasions and groups, visit stamps |
| 08 | [Growth and insights](docs/08-growth-and-insights.md) | Diner and guest identity, consent, rewards, content, recommendations, analytics |
| 25 | [Configuration and commands](docs/25-configuration-and-commands.md) | Settings, feature switches and content; every change as a command that a person, the assistant or an AI agent can run |
| 10 | [Capability map](docs/10-capability-map.md) | Every incumbent capability and how this product covers it |

### Build

| # | File | What it answers |
| --- | --- | --- |
| 09 | [Architecture](docs/09-architecture.md) | Rules, modules, performance budgets, security and tests |
| 17 | [System design](docs/17-system-design.md) | Exact stack, database tables, API endpoints, key flows, scale path |
| 18 | [AI integration](docs/18-ai-integration.md) | Every AI feature, the AI gateway, evaluation, safety, and how AI systems build the product |
| 12 | [Build plan](docs/12-build-plan.md) | Ordered milestones with acceptance checks |

### Market and money

| # | File | What it answers |
| --- | --- | --- |
| 15 | [Country profile: India](docs/15-country-profile-india.md) | UPI, GST, bill format, veg marks, consent, WhatsApp, printing |
| 16 | [Ecosystem and entry](docs/16-ecosystem-and-entry.md) | Entry wedges, segments, adjacent products, distribution |
| 11 | [MVP and roadmap](docs/11-mvp-and-roadmap.md) | Releases 1A, 1B, 1C and later phases, with measures |
| 19 | [Business model (draft)](docs/19-business-model.md) | Revenue lines, tiers and pricing tests. The founder decides |

### Running the project

| # | File | What it answers |
| --- | --- | --- |
| 13 | [Open decisions](docs/13-open-decisions.md) | Decisions the founder owns, each with a default |
| 14 | [Gap log](docs/14-gap-log.md) | Template for gaps found in pilots and interviews |
| - | [Glossary](docs/glossary.md) | One name per concept, for code, UI and docs |

## Design board (stage 1)

A working board of three design directions lives in [design/](design/index.html). It shows four guest screens and a working dashboard for three Delhi restaurants, with feature switches, a choices builder and a simulated assistant.

- Run it: preview config `qr-first-design` (port 5240), or any static server on the `design` folder.
- Files: `index.html`, `board.css`, `data.js`, `app.js`. No build step.
- `v2.html`, `more.html` and `live.html` are the current white, single-font design (menu, item, order; combo, play, dashboard and brand panel; instant add and live stock). `index.html` is the retired first board.
- Images in `design/img/` were generated with the founder's Image Batch tool from invented dish prompts and are for design review only.
- It is a design exploration. It is not production code.

## Which files to load for which job

Every job loads **00, AGENTS and the glossary** first.

| Job | Also load |
| --- | --- |
| Design language exploration (stage 1) | 01, 20, 21, 22, 23, 24 |
| Merchant dashboard design or build | 03, 04, 07, 20, 21, 22, 24, 25, 15, 18 |
| Guest app design or build | 03, 04, 05, 08, 21, 22, 26, 15, 18 |
| Staff app design or build | 03, 04, 06, 21, 15 |
| Backend and data | 03, 04, 09, 17, 15, 18, 25 |
| Any AI feature | 08, 18, 17, 25, 26 |
| Theming and looks | 21, 22, 24 |
| Review of a change | 04, 09, 21, and the home file of the changed area |
| Review of a feature request | 01, 02, 04, 10, 14, 20 |
| Release planning | 10, 11, 12, 13 |
| Market and research | 16, 23, 24, 14 |

## The product in nine lines

- **Two-sided.** One network for diners and restaurants; each side owns its own data.
- **India first, Delhi first.** UPI, GST bills, veg marks, WhatsApp, English and Hindi.
- **Live in 10 minutes.** A menu photo becomes a finished, good-looking menu.
- **Designed.** A new minimal, human design language, and looks that always come out classy.
- **The real thing on screen.** The dashboard carries a live preview of the real guest experience.
- **Simple by rule.** Everything at store level, a capped list of settings, one order engine for guest and staff.
- **Configurable and AI-operable.** Every feature has a switch, and every change can be made by a person, the assistant or an approved agent.
- **Personal.** Returning diners are greeted by name, see their usual and get suggestions with a real reason.
- **Fast.** The menu is a pre-built snapshot served from the edge.

## Keyword meaning

- **MUST / MUST NOT**: a hard rule. Breaking it is a defect.
- **SHOULD**: the default. Deviate only with a written reason.
- **MAY**: optional.

## Status

- **Version 0.6, 14 Nov 2026.** Automatic course sorting, nutrition at a glance, compare dishes and the waiter character (file 26) added. Non-negotiables for instant add, sticky cart and live stock are in file 05 section 1c.
- Version 0.5, 14 Nov 2026. Everything is configurable through settings, feature switches and content, and every change is a command that the assistant or an approved AI agent can run (file 25). The guest experience is personal by default and has a play-to-order mode (file 05). The stage 1 design board is in `design/`.
- Version 0.4, 14 Nov 2026. Added the master plan, merchant offer, design language, theming, reference products and the first 100 in Delhi. The merchant dashboard file replaces the earlier back office file. The diner network is added to the vision and domain model.
- Earlier: 0.3 (10 Nov 2026) set India and added system design, AI and the draft business model.
- Pre-build. The next step is stage 1, design language exploration.
- Items marked **OPEN** point to [docs/13-open-decisions.md](docs/13-open-decisions.md).
