# 27. The return suite

One product in our offer to restaurants: **bring guests back, and fill the hours that are empty.** It sits beside the QR app, the staff tools and free UPI. It works with or without a POS link.

Working name: **Return**. It is our own design. It is not a copy of any existing CRM product.

## 1. What the merchant buys

A measurable promise: **more repeat visits, and more guests in slow hours.** The merchant sees both as numbers each week.

## 2. What is in the suite

| Part | What it does | Priority |
| --- | --- | --- |
| **Guest list** | Every guest who shares a number by QR, UPI payment or at the bill, with visits, usual order and consent | Core |
| **WhatsApp messages** | Thank-you after a visit, a comeback nudge when a regular goes quiet, and news the owner wants to send. Sent in the restaurant's name | Core |
| **Offers and vouchers** | The owner creates an offer in a minute: who it is for, what it gives, when it is valid. Redeemed by QR at the table | Core |
| **Fill slow hours** | The system finds the restaurant's quiet slots from its own data and proposes an offer valid only in those slots, sent to guests who are likely to come then | Core, the lead feature |
| **Occasions and groups** | Capture birthdays and anniversaries (with consent), and group or celebration visits. Remind the guest before the date next year, and brief staff when they arrive | Core |
| **Visit stamps** | A simple loyalty card: buy N, get a reward the owner chooses | Core |
| **Digital tips** | Tips by UPI, shared with staff by a simple rule | Minor, included |
| **Waitlist and pre-order** | Join the queue by QR and order while waiting | Later |

## 3. Fill slow hours, in detail

This is the strongest part of the offer.

1. **Find the gaps.** From orders and scans, the system shows the owner a weekly picture: full, steady and empty slots.
2. **Propose the offer.** For an empty slot it suggests one offer with an expected result, for example "Tuesday 3 to 6 pm: a free chai with any snack. Expected: about 12 extra tables." The owner edits or approves.
3. **Pick the audience.** Guests who have come at similar hours, who live or work nearby, or who have not visited in a while. Only guests who gave consent.
4. **Send and limit.** One WhatsApp message, valid only for that slot, with a cap on redemptions so the cost is known in advance.
5. **Prove it.** A holdout group gets no message. The report shows extra visits and revenue against the cost of the offer.

Rules:

- Offers never apply in the restaurant's busy slots.
- The owner sets the maximum cost per week.
- No guest gets more than one promotional message a week from one restaurant.

## 4. Occasions and groups, in detail

- **Capture:** one optional question after payment or in the guest's profile ("Any special day we should remember?"), and a group or celebration tag that staff or the guest can set.
- **Before the day:** a WhatsApp message a week earlier with a booking prompt and, if the owner wishes, a small gesture.
- **On arrival:** staff see "Birthday visit, table of 6" in the guest briefing.
- **After:** a thank-you, and the date is kept for next year.
- **Groups:** large tables are tagged so the owner can invite them back for the next occasion.

## 5. How it connects to the rest

| Feeds the suite | The suite feeds |
| --- | --- |
| QR scans and orders identify the guest and their tastes | Staff briefing: who is at the table and why they came |
| UPI payments give a phone number and a visit record | Personal welcome and "your usual" in the guest app |
| Ratings show who was happy and who was not | The owner's weekly report |

## 6. Rules that do not bend

- **Consent first.** A guest is messaged only after opting in for that restaurant. Withdrawal is one tap. See [15-country-profile-india.md](15-country-profile-india.md).
- **The merchant decides every offer.** We never send discounts in the restaurant's name on our own initiative.
- **A guest list belongs to its restaurant.** It is never shown to or used for another restaurant.
- **Every campaign is measured** against a holdout, and the report states the cost.
- **Messages are few.** Frequency caps protect the guest and the restaurant's reputation.

## 7. What the merchant sees each week

- Repeat rate: the share of guests who came back within 30 and 90 days.
- Slow-hour fill: extra tables in targeted slots.
- Offers: sent, redeemed, cost, revenue.
- Occasions coming up in the next two weeks.
- One suggested action.

## 8. Other directions considered

| Direction | Status |
| --- | --- |
| Guest briefing for staff | Separate product: staff tools |
| Live service radar, recover before they leave | Separate product: staff tools |
| Staff upsell prompts, staff scorecard | Later, after POS sync |
| Owner's morning brief | Part of the dashboard |
| Dish-level feedback to the kitchen | Later |

## 9. Open points

- WhatsApp message costs: who pays, and whether a monthly allowance is included.
- Whether an unhappy guest is excluded from promotions until the issue is resolved (recommended: yes).
- Whether birthdays may be asked for without a full date of birth (recommended: day and month only).

## Changes

- 14 Nov 2026: file created. The founder chose this suite as one product in the offer, led by slow-hour filling, with occasions and groups. Pre-ordering moved to later. Tipping kept as a minor part.
