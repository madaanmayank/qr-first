# 30. What the guest app prototype taught us

The guest app prototype (`design/app-v3.html`) went through about 60 rounds of founder review on 14 to 16 Nov 2026. This file keeps what was learnt, so no builder repeats it. Design rules live in file 21; this file gives the reasons and the working method.

## 1. What the founder consistently asked for

| Theme | The rule it became |
| --- | --- |
| Calm over clever | Light motion, plain backgrounds, colour only on icons and text |
| Nothing jumps | A tap changes only what it touches; no replayed entrances; scroll position kept |
| Short and stable suggestions | Two or three, fixed while the guest adds from them, never the same dish twice |
| Confirm before commitment | The bill and a second send always ask first, with the list and the amount |
| True personal lines | Only choices and history that exist in the data ("Extra hot" was invented and removed) |
| Less text | Icons with one-word labels, one-line names, at most three chips, no lonely words |
| No tiles for dishes in suggestions | Round plates with a + on the edge, or a clean list |
| The waiter is the way in | Starts the visit, asks the mood, stays one tap away, speaks rarely |
| Clean dish rows | Extras (notes) live in their own section, not on every row |
| Good-to-have goes lower | "Your meal" after the first category, not at the top |

## 2. Mistakes made, and the guard for each

| Mistake | What it caused | Guard |
| --- | --- | --- |
| Reused short class names (`g2`, `gm`, `gr2`, `pr1`) | Menu grids turned blue; buttons sat low | New styles use unique prefixes; search before naming |
| Entrance animations on re-rendered views | The page "snapped" on every tap | Entrances play once; finish them on re-render |
| Measuring during an animation | Tutorial highlight landed off target | Measure after the screen settles |
| Padding written into markup | Style rules silently ignored | No inline layout styles |
| Changing a screen while adding a tutorial | Approved options were replaced | A tutorial adds only a tip (and is declared by the feature it explains) |
| A button under the next page's Add | Accidental adds | No action under the next tap; a short guard after page changes |
| 33 font sizes and 9 weights | Uneven text | A type scale with a check script |
| Tiny labels swept into the type scale | Labels grew | A 10px size for capitals tags only |
| Browser cache on a data file | New photos did not show | Version tags on shared files |
| Building before agreeing the approach | Rework | For large changes: propose, get a yes, then build |
| Checking by script only | Visual defects missed | Every change is also checked on a screenshot |

## 3. Patterns that worked

- **Mood first.** "What are you in the mood for?" then the kind of dish, then three picks with refine chips. Guests who do not know the menu can still order.
- **The add-on window.** Five minutes after sending, "Still room for more?" with a countdown; anything sent joins the same round.
- **Photo flight.** The dish photo flies to where the total changes. It explains the add without words.
- **One pill for the waiter.** Face plus one changing word, resting after a minute.
- **Reactions only where they mean something.** The waiter's face shows for a request done, the bill, a concern, a sold-out dish.
- **Notes in one place.** Pick a dish in the kitchen notes section, tap chips, save.
- **Tips declared by features.** A feature that changes takes its tip with it.
- **Sold-out lines.** What ran out, how many, one swap that keeps the quantity, a small remove.

## 4. What the prototype is not

- State is in the page. There is no server, no real stock, no payment.
- The waiter reads typed text with keyword rules, not a model. The product uses the AI gateway (file 18) with the same actions.
- Group ordering shows two invented guests. Real joining needs realtime (file 17).
- Photos beyond the first eleven were generated to match a style. Real stores bring their own.
- Feedback and messages are shown, not sent.

## 5. Working method for the next surface

1. Write the guest's question for the screen (file 21 section 14).
2. For anything larger than a fix, state the approach and wait for a yes.
3. Build directly in the file; back it up first.
4. Check by script and by screenshot at phone width.
5. Record the rule in its home file the same day.
6. Commit when the founder asks.

## Changes

- 16 Nov 2026: file created.
