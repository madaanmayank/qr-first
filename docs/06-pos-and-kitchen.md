# 06. POS and kitchen

The staff side: taking orders, running tables, cooking and collecting money. It runs as a web app on any tablet or phone and uses the same tab engine as the guest app.

## 1. Why the POS is built in

- Incumbent QR products depend on a third-party POS for the bill. That creates sync failures and one integration per POS vendor. See lesson D2.
- Here a guest order and a staff order are rounds on the same tab. There is nothing to sync.
- A store that wants to keep an existing POS can still use the product through an adapter. That is OPEN decision D8 and is out of the first release.

## 2. Surfaces

| Surface | Device | Purpose |
| --- | --- | --- |
| **Floor** | Tablet or phone | Tables and open tabs at a glance |
| **Order pad** | Tablet or phone | Staff takes an order for a table or a walk-in |
| **Tab** | Tablet or phone | Bill, payments, voids, discounts |
| **Kitchen display (KDS)** | Any screen with a browser | Rounds to cook, per station |
| **Close of day** | Tablet | Sales summary and cash count |

All five are routes in one staff app. Staff sign in with a PIN.

## 3. Floor

- **Table style:** a grid of table spots. Colour shows state: free, ordering, waiting for food, eating, bill due.
- **Counter style:** a list of open tabs by tab number with state and age.
- Each tile shows party size, time open and balance.
- Tap a tile to open its tab. Long-press for move table or merge tabs.
- A guest QR scan at a free table turns the tile to "ordering" live.

## 4. Order pad

- The same menu snapshot as the guest app, in a dense layout: category rail, item grid, search.
- Tapping an item with no required groups adds it at once. Items with required groups open the same configurator rules as the guest sheet, in a compact form.
- Staff-only abilities: open-price item, line discount, course marking ("fire later"), free-text kitchen message.
- "Send" creates a round with `source: staff`.
- Target: a three-item order entered and sent in under 15 seconds.

## 5. Tab

- Every round, line, charge and payment, in time order, with who created each one.
- **Take payment:**
    - Cash, with change calculation.
    - Card on a terminal. First release records the amount as an external card payment; terminal integration is a later phase. See OPEN decision D4.
    - Guest pays by QR: the tab shows a pay code for the guest's phone.
    - Split: equal, by item, or by amount. Same engine as the guest split.
- **Void** a line or round: manager role, reason required, audited.
- **Discount:** percent or amount, on a line or the tab; manager role, audited.
- **Refund:** against a succeeded payment, full or partial; manager role, audited.
- **Close:** automatic when the balance is zero.
- **Print or send** the bill and the receipt.

## 6. Kitchen display

- One column of tickets per station, oldest first.
- A ticket is one round's lines for that station, with the spot, tab number, time since sent and any notes.
- Options are indented under each item. Combo parts appear as their own lines under the combo name.
- Tap a line to strike it. "Bump" marks the station's part ready. When every station has bumped, the round is `ready`.
- Colour changes at 10 and 20 minutes (engineering constants).
- A new ticket plays a sound.
- "Recall" brings back the last bumped ticket.
- **Sold out:** the kitchen can mark an item or option sold out from the KDS. It reaches guests within 2 seconds.
- An expo view shows all stations for one round together.

## 7. Printing

- Printing is optional. A store can run on KDS screens alone.
- Supported path for the first release: network receipt printers that accept ESC/POS, driven by a small print bridge on the store's network or by the staff device when the browser allows it.
- Print jobs: kitchen ticket per station, bill, receipt.
- Each job is queued and retried. A failed kitchen print raises an alert on the Floor screen; the round also stays visible on the KDS.
- A store with no printer and no KDS gets new-round alerts on the staff app with sound.

## 8. Offline behaviour

- The staff app is installable and caches the menu snapshot and open tabs.
- When the internet drops:
    - Staff can still open tabs, add rounds and take cash payments. Actions queue locally with idempotency keys.
    - KDS screens on the same network keep receiving rounds when a local hub device is present; otherwise tickets print or show once the connection returns. The depth of offline support is OPEN decision D5.
    - Guest QR ordering needs the internet. Guests see a clear message to order with staff.
- On reconnect, queued actions replay in order. Conflicts resolve by server time, and nothing accepted is dropped.

## 9. Close of day

- Sales by payment method, order type, category and item.
- Voids, discounts and refunds with staff names.
- Cash expected versus counted, with a variance note.
- Open tabs are listed and must be closed or carried over.
- The summary is saved and exportable. It reads from the event log.

## 10. Quick menu control

- Mark an item or option sold out, or back in stock, from the Floor, the order pad or the KDS.
- Change a price or pause a category from the merchant dashboard on the same device. A change publishes a new snapshot in seconds.

## 11. Rules

- Every money-changing action records staff id, time and reason in the audit log.
- Staff and guest see the same tab state at all times. A test asserts that a round sent from either side appears on the other within 2 seconds.
- The POS adds no settings beyond those in [04-settings-budget.md](04-settings-budget.md). Device setup (naming a screen, pairing a printer, assigning a station) is content.
