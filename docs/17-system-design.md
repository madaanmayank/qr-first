# 17. System design

The concrete build choices: languages, frameworks, database, hosting, schema, API and deployment. [09-architecture.md](09-architecture.md) holds the rules and budgets. This file holds the specific picks that satisfy them.

A builder SHOULD use these picks. A substitute is acceptable when it meets every rule and budget in file 09, and the reason is written in the pull request.

## 1. Stack at a glance

| Layer | Pick | Reason |
| --- | --- | --- |
| Language | **TypeScript** (strict) on every layer | One type system from database to UI; largest pool of builders and AI coding support |
| Runtime | **Node.js LTS** | Stable, long-lived connections for realtime |
| Monorepo | **pnpm workspaces + Turborepo** | Shared packages, cached builds |
| Validation and contracts | **Zod** schemas in `packages/contracts`, types inferred | One definition for API, config and AI outputs |
| API framework | **Hono** (or Fastify) | Small, fast, typed routes |
| Database | **PostgreSQL 16**, managed, India region | Transactions for money, row-level security, JSONB for config, `LISTEN/NOTIFY` |
| Data access | **Drizzle ORM** + SQL migrations | Typed queries, plain SQL when needed |
| Background jobs | **pg-boss** (queue on Postgres) | No extra infrastructure at the start |
| Realtime | **Server-sent events** from the API, fed by Postgres `NOTIFY` | Simple, works through proxies, one channel per store |
| Cache | None at launch beyond the CDN. Add Redis only when a measured need appears | Fewer moving parts |
| Guest app | **React + Vite**, CSS variables with a small utility CSS layer, no heavy component library | Meets the 150 KB budget |
| Staff app (POS, KDS, merchant dashboard) | **React + Vite + TanStack Query + a component library** (Chakra or similar), PWA | Rich screens; bundle budget is looser |
| Android shell | **Capacitor** wrapper around the staff app | Bluetooth and USB printing, installable from the Play Store |
| Print | ESC/POS encoder in TypeScript, called from the Capacitor plugin or a network socket | One ticket renderer for every printer type |
| Object storage and CDN | S3-compatible storage with a global CDN (for example Cloudflare R2 + CDN) | Menu snapshots, images, video |
| Image and video | On-upload resize to WebP/AVIF; video to HLS by a managed transcoder | Fast menus on slow networks |
| Auth | Own implementation: one-time codes, signed session tokens, staff PINs | Small scope; no external identity cost per user |
| Payments | Indian payment aggregator with split settlement (decision D2) behind a `PaymentProvider` interface | UPI intent, hosted KYC |
| Messaging | WhatsApp Business API through a provider; SMS provider with DLT templates; both behind a `Messenger` interface | Swap providers without code changes |
| AI | Claude models through the API, behind an `AiGateway` interface | See [18-ai-integration.md](18-ai-integration.md) |
| Errors and tracing | Sentry + OpenTelemetry | Standard tooling |
| Product analytics | Events table in Postgres at launch; replicate to a columnar warehouse (ClickHouse or BigQuery) when reports slow down | Start simple |
| CI/CD | GitHub Actions; preview deploy per pull request | Budgets and checks run on every change |
| Tests | Vitest (unit, contract), Playwright (end-to-end) | Fast and scriptable |
| Infrastructure as code | Terraform or the host's config files, in the repo | Reproducible environments |

## 2. Hosting layout

```
Guest phone ──► CDN ──► guest app (static files) + menu snapshot (immutable JSON) + media
            └─► API (containers, India region) ──► PostgreSQL (primary + replica)
Staff device ─► CDN ──► staff app (PWA / Capacitor)        │
            └─► API ─── SSE realtime ◄── NOTIFY ───────────┘
API ──► job workers (same image) ──► payment aggregator, WhatsApp/SMS, AI, transcoder
```

- **Static apps and snapshots** are served from the CDN. A scan needs no API call to show the menu shell.
- **API** runs as two or more stateless containers in an India region behind a load balancer that supports long-lived connections. Serverless functions are avoided for the API because of realtime connections.
- **Workers** run the same image with a different start command.
- **Database:** managed PostgreSQL with point-in-time recovery, one read replica for reports.
- **Environments:** `dev` (local with Docker), `preview` (per pull request), `staging`, `prod`.
- **Region:** India (decision D10). Guest and order data stay in that region.

## 3. Database schema (core tables)

Every table below has `id uuid primary key`, `store_id uuid not null` (except `account`, `account_member`), `created_at`, and row-level security on `store_id`.

| Table | Key columns | Notes |
| --- | --- | --- |
| `account` | name, billing fields | Login and billing container |
| `account_member` | account_id, email or phone, role | Owner and managers |
| `store` | account_id, name, address, country, state, timezone, currency | One row per outlet |
| `store_config` | store_id (unique), version, doc jsonb | Validated by the Zod schema on every write |
| `store_config_history` | store_id, version, doc, changed_by, changed_at | Rollback source |
| `category` | name, parent_id, sort, availability jsonb | One level of nesting |
| `item` | category_id, name, description, photo_key, base_price, takeaway_price, tax_class, dietary_type, course, spice, kcal, protein_g, nutrition_source, nutrition_confidence, house_note, tags text[], station_id, sold_out, availability jsonb, sort | Prices in paise |
| `option_group` | name, min, max | Reusable across items |
| `option` | group_id, name, price_delta, sold_out, linked_item_id, sort | |
| `item_option_group` | item_id, group_id, sort | Many to many |
| `option_child_group` | option_id, group_id | Nested groups, depth 2 |
| `translation` | entity_type, entity_id, field, lang, text, source (ai or human) | Human edits win |
| `menu_snapshot` | hash, storage_key, published_by, published_at, is_current | Immutable |
| `spot` | type, label, qr_token (unique, opaque), active | |
| `station` | name | |
| `device` | type, name, station_id, pairing fields, last_seen | |
| `staff_member` | name, role, pin_hash, active | |
| `guest` | phone, email, name, first_seen, last_seen | Encrypted contact fields |
| `consent` | guest_id, channel, granted, source, at | Append-only |
| `tab` | spot_id, order_type, pay_timing, state, number, party_size, guest_id, opened_by, opened_at, closed_at | |
| `round` | tab_id, state, source, sent_at, idempotency_key (unique per store) | |
| `line` | round_id, item_id, name_snapshot, unit_price, qty, note, selections jsonb, station_id, state | Item name and price copied at send time |
| `charge` | tab_id, type, label, amount, tax_class | Written by `priceTab` at billing |
| `payment` | tab_id, amount, tip, method, state, provider_ref, idempotency_key, taken_by | |
| `refund` | payment_id, amount, reason, by | |
| `invoice` | tab_id, number, financial_year, totals jsonb, issued_at | Gapless sequence per store per year |
| `discount` | code, rule jsonb, valid_from, valid_to, usage_limit | |
| `rating` | tab_id, score, tags, comment | |
| `event` | type, actor_type, actor_id, at, payload jsonb | Append-only; partitioned by month |
| `print_job` | device_id, kind, payload, state, attempts | |
| `ai_run` | feature, model, input_ref, output jsonb, status, cost_units, reviewed_by | Audit of AI calls |
| `connection` | kind (payment, delivery app, accounting), status, config jsonb (encrypted) | |

**Indexes worth naming:** `tab (store_id, state)`, `tab (store_id, spot_id) where state = 'open'` (unique for table spots), `round (tab_id)`, `event (store_id, at)`, `line (store_id, item_id, created_at)` for derived tags.

**Invoice numbering** uses a per-store counter row locked inside the billing transaction, so numbers have no gaps.

## 4. API surface (v1)

All paths are under `/v1`. Request and response shapes live in `packages/contracts`.

| Area | Endpoints |
| --- | --- |
| Guest session | `POST /session` (spot token), `GET /session/tab` |
| Guest ordering | `POST /tabs/{id}/rounds`, `POST /price` (cart preview), `GET /tabs/{id}` |
| Guest payment | `POST /tabs/{id}/payments`, `GET /payments/{id}`, `POST /webhooks/payment` |
| Guest identity | `POST /guest/code`, `POST /guest/verify`, `POST /guest/consent`, `DELETE /guest` |
| Feedback | `POST /tabs/{id}/rating` |
| Realtime | `GET /stores/{id}/stream` (SSE; scoped by token) |
| Staff auth | `POST /staff/device-login`, `POST /staff/pin` |
| POS | `GET /stores/{id}/tabs?state=open`, `POST /stores/{id}/tabs`, `POST /tabs/{id}/rounds`, `POST /rounds/{id}/state`, `POST /lines/{id}/void`, `POST /tabs/{id}/discounts`, `POST /tabs/{id}/payments`, `POST /payments/{id}/refunds`, `POST /tabs/{id}/bill` |
| Kitchen | `GET /stores/{id}/tickets?station=`, `POST /tickets/{id}/bump`, `POST /items/{id}/sold-out`, `POST /options/{id}/sold-out` |
| Menu | CRUD on `/stores/{id}/categories`, `/items`, `/option-groups`; `POST /stores/{id}/menu/publish`; `POST /stores/{id}/menu/import` |
| Config | `GET /stores/{id}/config`, `PATCH /stores/{id}/config`, `POST /stores/{id}/config/rollback` |
| Spots and devices | CRUD on `/stores/{id}/spots`, `/stations`, `/devices`, `/staff` |
| Reports | `GET /stores/{id}/reports/{name}`, `POST /stores/{id}/reports/ask` |
| Multi-store | `POST /stores/{id}/clone`, `POST /accounts/{id}/bulk-apply`, `POST /stores/{id}/menu/link` |
| Partner | Same endpoints with scoped API keys; `POST /stores/{id}/webhooks` |

- Every mutating call accepts an `Idempotency-Key` header.
- Errors: `{ code, message, details }` with codes from `contracts`.

## 5. Key flows

### Scan to menu
1. QR opens `guest-app/s/{qr_token}`. The static shell loads from the CDN.
2. In parallel: fetch the store's snapshot pointer and snapshot (CDN), and `POST /session`.
3. Render from the snapshot. Apply sold-out and open-tab state when the session returns.
4. Open the SSE stream.

### Send a round
1. Client sends lines with selections and an idempotency key.
2. Server loads the current snapshot data, validates each line, prices the tab, and in one transaction writes `round`, `line`, `event`.
3. For `before_kitchen`, the round is created as `draft` with a payment; the payment webhook moves it to `sent`.
4. `NOTIFY` fires; KDS and staff streams receive `round.changed`; print jobs are queued.

### Pay by UPI
1. Server creates a payment with the aggregator for the server-computed balance.
2. Client opens the UPI intent link or shows the QR.
3. The aggregator webhook (signature verified) marks the payment `succeeded`. The client also polls `GET /payments/{id}` as a fallback.
4. If the balance is zero the tab closes and an invoice number is issued.

### Publish menu
1. Validate the menu. 2. Build snapshot JSON with translations, derived tags and guest config. 3. Upload under its hash. 4. Flip the pointer. 5. `NOTIFY snapshot.published`.

### Offline staff action
1. The action is written to IndexedDB with an idempotency key and applied to local state through `packages/engine`.
2. A sync loop posts queued actions in order when online.
3. Server responses replace local state.

## 6. Security specifics

- Session tokens: signed, short-lived, scoped to one store and one spot for guests.
- Row-level security: the API sets `app.store_id` per request; policies compare it to `store_id`.
- Contact fields encrypted at the column level; searches use a keyed hash.
- PIN hashes with a slow hash; lockout after repeated failures.
- Webhooks verified by signature and replay window.
- Secrets in the host's secret manager; rotated on a schedule.
- Dependency and container scanning in CI.

## 7. Scale path

| Stage | Stores | What changes |
| --- | --- | --- |
| Launch | Up to 500 | Layout in section 2 as is |
| Growth | 500 to 5,000 | Read replica for reports; events replicated to a warehouse; Redis for stream fan-out if `NOTIFY` saturates; connection pooler |
| Large | 5,000 and above | Partition hot tables by store hash; separate realtime service; regional replicas if a second country launches |

- A typical busy store produces a few hundred rounds a day. Postgres on modest hardware handles thousands of such stores. Do not add infrastructure before measurements call for it.

## 8. Local development

- `docker compose up` starts Postgres and local object storage.
- `pnpm dev` runs the API, the guest app and the staff app with hot reload.
- A seed script creates three demo stores, one per preset, with a sample Indian menu.
- A fake payment provider and a fake messenger implement the same interfaces, so the whole product runs with no external account.
- A fake AI gateway returns recorded outputs for tests.

## 9. Repository checks

- Type check, lint, unit and contract tests on every pull request.
- Bundle size check for the guest app.
- Settings reader check and docs-versus-schema check.
- Migration check: every migration is forward-only and reversible by a follow-up migration.
- Playwright golden paths on the preview deploy.

## Changes

- 10 Nov 2026: file created.
