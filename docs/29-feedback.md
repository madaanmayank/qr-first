# 29. Feedback

Home file for feedback. One module, two places: inside the QR app and on WhatsApp. It replaces the short notes in file 05 section 9 and file 08 section 5.

## 1. Purpose

- **Hear problems while the guest is still at the table.**
- **Learn which dishes work**, from the people who ate them.
- **Send happy guests to a public review.** Never send unhappy ones.
- **Feed the return suite** with who to thank and who to win back.

## 2. Three kinds of feedback

| Kind | When | Where | Form |
| --- | --- | --- | --- |
| **Concern** | During the meal | Waiter in the QR app | Tap Concern, pick a reason (food is cold, waiting too long, wrong dish, something else) or type it |
| **Dish feedback** | After paying, or once food is served | QR app, then WhatsApp | Thumbs up or down per dish. Down opens reason chips: too spicy, cold, too salty, small portion |
| **Visit rating** | After paying | QR app, then WhatsApp | 1 to 5 in one tap, optional comment |

All three attach to the tab, so the store sees table, dishes, time and staff.

## 3. In the QR app

- Shown on the order success page after payment: one row per dish with thumbs, then the visit rating. One tap each, no form.
- Nothing is required. A guest who taps nothing is never asked again in the app for that visit.
- A thumbs down never opens a text wall: chips first, text optional.
- After a rating of 4 or 5 with no concern on the tab, the public review link is offered once.
- The page says what happens next: "Thank you. The kitchen sees this tonight."

## 4. On WhatsApp

- Sent only to a guest who gave a number and whose visit has no feedback yet.
- **Timing:** 30 to 90 minutes after payment, never after 10 pm; then the next morning.
- **Message 1:** thanks, the dishes they had, and quick-reply buttons: Loved it, It was okay, Not happy.
- **Loved it:** asks for the favourite dish (buttons with dish names), then offers the review link.
- **It was okay or Not happy:** asks what went wrong (buttons from the same reason list), then one free-text line. The manager is alerted.
- A reply is never met with a promotion in the same thread.
- This is a service message about the visit. It still counts toward the weekly cap when it carries an offer, so it never carries one.
- Message categories, templates and costs follow file 15 and are verified by the India rules role before launch.

## 5. Routing

| Signal | Goes to | Within |
| --- | --- | --- |
| Concern at the table | Manager's phone and the staff app, with table and dish | Seconds |
| Visit rating 1 to 3, or Not happy | Manager, with the tab and comment | Minutes |
| Dish thumbs down | Kitchen digest for the dish; alert when one dish gets 3 in a shift | End of shift, or at once on the third |
| Rating 4 to 5, no concern | Review link offered | At once |

## 6. Closing the loop

- Every concern has an owner and a state: new, seen, resolved. A concern still new after 5 minutes is escalated.
- The manager can reply in one tap from a short list (apology, replaced, taken off the bill) or in their own words. On WhatsApp the guest sees the reply in the same thread.
- A make-good (a dish off the bill, a voucher for next time) is a command with a limit set by the owner.
- A guest with an unresolved low rating gets no promotions. Once resolved, the next message is the make-good, not a campaign.

## 7. What the owner sees

- **Today:** open concerns, average rating, dishes with a warning.
- **Per dish:** thumbs up share, top reasons, trend over 4 weeks, with the number of responses shown.
- **Per shift and per staff member:** rating and concerns, for coaching, never as a public score.
- **Reviews earned:** how many guests opened the review link.

## 8. Rules

- Low ratings never go to a public site. No guest is asked for a public review twice in 90 days.
- No incentive is offered for a rating or review.
- Feedback is tied to a real paid tab. One visit rating per tab; dish feedback only for dishes on that tab.
- A dish score is shown to owners only after 10 responses, with the count beside it.
- Dish scores never appear to guests in v1.
- The waiter character never argues with feedback. It thanks, confirms what was heard and calls a person.
- Consent rules are in file 08 section 2.

## 9. Data

- `Feedback`: tab, guest (optional), kind (concern, dish, visit), dish, value, reasons, text, channel (qr, whatsapp), state, owner, timestamps.
- `Reply`: feedback, staff, text or template, make-good command id.
- Events: `feedback.received`, `feedback.escalated`, `feedback.resolved`, `review.link.opened`.

## 10. Measures

- Share of paid tabs with any feedback (target 35 percent with both channels).
- Median time from concern to seen (target under 3 minutes).
- Share of low ratings resolved the same day.
- Review link opens per 100 happy visits.

## 11. Acceptance checks

1. A concern raised in the app shows on the manager's phone within 5 seconds.
2. A guest who rated in the app gets no WhatsApp feedback message.
3. A rating of 3 or below never shows a review link, in either channel.
4. A guest with an open low rating is excluded from every campaign audience.
5. Dish feedback is offered only for dishes on the paid tab.

## Changes

- 16 Nov 2026: file created. The prototype's per-dish thumbs with reason chips and the founder's request for feedback in WhatsApp and in the QR app are the basis.
