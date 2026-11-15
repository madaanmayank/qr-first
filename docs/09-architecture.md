# 09. Architecture

How the system is built. The choices here exist to keep the product fast, small and hard to make complicated.

## 1. Shape

- **One repository, one backend, three client routes.**
- A modular monolith. Modules are separated by folder and interface. They are split into services only when a measured need appears.

```
repo/
  packages/
    contracts/     wire types, StoreConfig schema, event schema, error codes
    engine/        pure functions: priceTab, validateLine, tab state machine
    ui/            shared components and theme derivation
  apps/
    guest/         guest web app (QR)
    staff/         POS, KDS, merchant dashboard (one app, routes by role)
    api/           HTTP + realtime backend
  docs/            this pack
```

## 2. Recommended stack

A default that any builder can follow. A different stack is acceptable when it meets every rule and budget in this file. The exact picks, schema tables and endpoints are in [17-system-design.md](17-system-design.md). AI design is in [18-ai-integration.md](18-ai-integration.md).

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript everywhere | One type system from database row to button |
| Guest and staff apps | React + Vite, installable as a PWA | Small bundles, offline cache for staff |
| Server data fetching | TanStack Query or equivalent | Caching and optimistic updates |
| API | HTTP JSON, typed from `contracts` | Simple, cacheable, easy for partners |
| Realtime | Server-sent events or WebSocket, one channel per store | Sold-out, round state, tab changes |
| Database | PostgreSQL | Transactions for money; row-level security for tenancy |
| Files and media | Object storage + CDN | Menu snapshots, images, video |
| Background jobs | A queue on Postgres at first | Fewer moving parts |
| Payments | Provider with hosted fields and marketplace payouts | Card data never touches our servers |
| AI features | A current large language model through its API, behind one internal interface | Menu import, translation, assistant, report questions |

## 3. Backend modules

| Module | Owns | Public interface |
| --- | --- | --- |
| `identity` | Accounts, staff, guests, sessions, roles | sign in, verify code, authorise |
| `config` | StoreConfig document and its history | get, update, rollback |
| `catalog` | Menu, option groups, snapshots | edit, publish, set sold out |
| `ordering` | Tabs, rounds, lines, state machine | open tab, add round, change state, void |
| `pricing` | `priceTab`, tax, charges, discounts | price a tab (pure function) |
| `payments` | Payment intents, refunds, provider adapter | create, confirm, refund |
| `devices` | Screens, printers, print queue | pair, route, print |
| `growth` | Rewards, vouchers, feedback, derived tags | earn, redeem, rate, recommend |
| `events` | Append-only log, webhooks, reporting queries | append, subscribe, query |

- A module calls another only through its public interface.
- `pricing` and the tab state machine live in `packages/engine` so the staff app can run them offline. The server result is always final.

## 4. Data rules

1. **Tenancy.** Every operational table has `store_id`. Row-level security enforces it. A request is bound to one store id after authorisation.
2. **Ids** are opaque (UUID or similar). No id encodes a parent. See lesson E6.
3. **Money** is an integer in minor units with a currency code. No floating point.
4. **Time** is stored in UTC. Display uses the store timezone.
5. **Idempotency.** Every write that creates a round or payment takes an idempotency key, stored with a unique constraint.
6. **Immutability.** Sent rounds, succeeded payments and events are never updated. Corrections are new rows.
7. **Config** is one JSON document per store, validated against the schema in `contracts`, with a version number and history table.
8. **Schema changes** are forward-only migrations. A setting change never needs a database migration, because settings live in the config document.
9. **Deletion.** Guest data can be exported and erased per guest. Erasure removes contact fields and keeps anonymous order facts.

## 5. Menu snapshot

The single biggest speed decision.

- Publishing a menu builds one immutable JSON file: categories, items, option groups, translations, derived tags, theme tokens and the guest-relevant part of StoreConfig.
- The file is stored under a content hash and served from the CDN with a long cache life.
- A tiny pointer per store names the current snapshot. It has a short cache life and is the only thing invalidated on publish.
- The guest app renders the full menu from this one file. Sold-out state and open-hours state arrive on the realtime channel and from a small session call.
- The staff app uses the same file.

## 6. Guest session and realtime

- `POST /session` with the spot id returns: session token, current tab (if any), snapshot pointer, live sold-out set.
- One realtime channel per store carries: `soldout.changed`, `round.changed`, `tab.changed`, `snapshot.published`.
- Clients treat realtime as a hint and re-fetch the affected resource. Correctness never depends on receiving a message.

### Stock in real time

- Stock state is two small sets per store: sold-out items and sold-out options. They travel in the session response and on the realtime channel as `soldout.changed` with the ids that changed.
- Clients apply a stock change locally in the same frame and re-render. They do not re-fetch the menu.
- Stock is re-read on app focus, on reconnect, every 20 seconds while the stream is down, and on every price or send call.
- The price call and the send call return per-line results: `{ lineId, status: 'ok' | 'ITEM_SOLD_OUT' | 'OPTION_SOLD_OUT', optionId?, alternatives? }`. `alternatives` lists available swaps with their price difference, so the client can offer one-tap fixes.
- For pay-first tabs, a short soft hold on stock starts when payment starts (default 5 minutes, decision D21) and is released on failure or timeout.
- Staff changes (POS, KDS, dashboard) are commands that write one event and one `NOTIFY`. Fan-out target: 2 seconds.

## 7. API conventions

- Resource paths under `/v1/stores/{storeId}/...`. There is one live version. See lesson D4.
- Additive changes only within a version. A breaking change means a new version and a finished migration before the next.
- Errors use stable codes from `contracts` (for example `OPTION_MIN_NOT_MET`, `ITEM_SOLD_OUT`, `PAYMENT_DECLINED`), with translatable messages chosen on the client.
- The public partner API is the same API with scoped tokens. There is no separate internal API.
- Webhooks deliver events with signatures and retries.

## 8. Release flags and experiments

- Flags are global, typed in `contracts`, and each has an owner and an expiry date.
- CI fails when a flag passes its expiry.
- A flag cannot target a store id. See lessons A6 and A7.
- Gradual rollout is by percentage of stores or sessions, chosen by hash.

## 9. Security

- Staff auth: account login on first use of a device, then PIN per staff member. Guest auth: session token per scan, one-time code for identity.
- Role checks happen in the server on every request.
- Payment: hosted fields or redirect only. Webhook signatures verified. Amounts come from `priceTab`, never from the client.
- Audit log for money actions, config changes, menu publishes and support "act as" sessions.
- Rate limits on session creation, code sending and order submission.
- Secrets in a secret manager. None in the repository or client bundles.
- Every tool, including internal ones, sits behind authentication. See lesson E4.

## 10. Performance budgets

| Measure | Budget |
| --- | --- |
| Menu visible after scan (mid-range phone, 4G) | 1.5 s or less |
| Guest menu route JavaScript, compressed | 150 KB or less |
| Requests to render the menu | Snapshot + images |
| `POST /session` p95 | 200 ms or less |
| Send round p95 | 500 ms or less |
| Realtime fan-out to KDS and guests | 2 s or less |
| Staff app cold start on a low-end tablet | 3 s or less |
| Menu publish to live | 10 s or less |

- Budgets run in CI (bundle size, lighthouse-style lab run) and in production monitoring (real-user timing).

## 11. Reliability

- An accepted round is committed in one database transaction with its event.
- The print queue and webhooks retry with backoff and surface failures to staff.
- Stores are isolated by data, so one store's peak cannot corrupt another. Load shedding protects ordering before reporting.
- Backups with point-in-time recovery. A restore drill is part of the release checklist.
- Status page and in-app degraded-mode banners.

## 12. Testing

| Test type | What it proves |
| --- | --- |
| Engine unit tests | `priceTab`, option validation and state machine for every case in the domain model invariants |
| Contract tests | Client and server agree on every wire type |
| Settings reader check | Every StoreConfig key is read by production code; the settings doc matches the schema |
| Theme token check | Every token is rendered by a component |
| Golden-path end-to-end | Scan, configure a combo, send, KDS bump, pay, receipt, for each service style |
| Cross-surface test | A round from guest appears on staff and KDS within budget, and the reverse |
| Payment state tests | Success, decline, cancel, timeout, replay, browser back |
| Offline tests | Staff app queues and replays with no loss or duplicate |
| Budget checks | Bundle size and timing budgets |

## 13. Observability

- Structured logs with store id and request id, no personal data.
- Metrics per module and per store: latency, errors, queue depth, payment success.
- Traces across API, database and provider calls.
- Alerts on order failure rate, payment failure rate, realtime lag and print failures.
