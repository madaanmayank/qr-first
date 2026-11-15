# Notes: conflicts and gaps found in the docs

Found while building M0 and M1. No doc was edited. Each item gives the file and section, what I found, and what the code does meanwhile. Items marked **decide** need an answer from the founder or the planner before the next milestone.

## A. Conflicts between docs

1. **Settings count and budget.** `docs/00-master-plan.md` section 2 (fact 2) says "23 settings" and section 9 says "Settings: 24 or fewer". `docs/04-settings-budget.md` says budget 20, current count 18, and "This file is the only place these counts are stated". Code follows docs/04. **decide:** fix file 00.
2. **Feature count changed under the build.** The brief said 20 features. At 12:55 on 14 Nov `docs/04` section 3 changed to 22 (`menuAssistant` became `waiter`; `nutrition` and `compare` were added in a new group "Know your food"). The registry and `check-docs` follow the current file (22). If that edit was not meant to land, change the registry and the doc together.
3. **Stale "menu assistant" wording.** `docs/25` section 8 (last bullet), `docs/19` section 3 (add-ons list) and `docs/10` row "AI menu assistant" still say "menu assistant". `docs/26` says it was replaced by the waiter character.
4. **Waiter feature: name and plan.** `docs/glossary.md` row "Waiter character" lists "assistant (for guests)" under "Do not use", but `docs/04` section 3 names the feature "Waiter assistant". `docs/19` section 3 lists the menu assistant as a paid add-on; `docs/10` says "Available to all, no tier". The registry says plan `free` (the newer file) and keeps the doc 04 name because `check-docs` compares it.
5. **Table preset "All on".** `docs/04` section 4 says Table has all features on, but section 3 gives `rewards` Off in every preset. The code keeps `rewards` off everywhere and treats "All on" as "all of the ones that differ".
6. **Party size key.** `docs/05` section 2 and `docs/10` use `askPartySize`; the feature key in docs/04 is `partySize`. Code uses `partySize`.
7. **Dietary type missing from the item model.** `docs/15` section 4 and `docs/17` section 3 (`dietary_type`) make it required; `docs/03` section 3 `Item` omits it (it now lists `course`, `spice`, `nutrition`, `houseNote`). Code has `dietaryType: veg | non_veg | egg` as required.
8. **Course on combos.** `docs/03` section 3 types `course` as always present but says a combo "has no course of its own". Code makes `course` optional.
9. **`storeId` on rows.** `docs/03` section 5 `Round` and `Payment` have no `storeId`; `docs/17` section 3 says every table has `store_id`, and invariant 1 says every operational row has exactly one. Code puts `storeId` on Tab, Round, Line and Payment.
10. **Master plan wording on counts of presets** is consistent; no conflict.

## B. Gaps that needed a choice (decide where marked)

### Money (docs/15, docs/03 section 5)

11. **Alcohol VAT rate has no home.** `docs/15` section 2 says alcohol uses a state VAT class and section 5 says the profile holds a state table, but only for drinking age. `priceTab` therefore takes `stateVatRateBp` from the caller and throws `TAX_CLASS_UNKNOWN` for an alcohol line without one. **decide:** where the state VAT table lives.
12. **Tax class list.** `docs/15` section 2 and `docs/04` (`tax`) say "item tax classes cover exceptions" but name none. Code defines `standard` (store GST rate, or none) and `alcohol_vat`, and accepts a caller-supplied table so other slabs can be added as data. A packaged-water style item at a different GST rate needs a class.
13. **Service charge base and tax.** Not stated anywhere. Code: charge = percent of the taxable value (ex-tax) of non-MRP lines after discounts, per tax class, taxed at that class's rate, and the tax on it is always added on top, also under inclusive pricing. It also applies to alcohol lines (taxed as VAT). **decide:** confirm with the chartered accountant (docs/15 asks for that review anyway).
14. **Inclusive pricing applies to VAT too.** `docs/04` `tax` has one inclusive flag. Code applies it to both GST and VAT classes. Under inclusive GST an odd tax amount splits CGST then SGST with 1 paise difference; exclusive tax splits equally.
15. **Round off.** `docs/15` section 1 says round to the nearest rupee. Code rounds half up (50 paise goes up) and includes the tip in what gets rounded, so `total` is always a whole rupee. Nothing says how a split bill or part payments round.
16. **Payment amount versus tip.** `docs/03` section 5 `Payment { amount, tip }`. Code treats `amount` as money applied to the balance including its tip share, and `tip` as the informational part of it. Alternative: tip outside the balance. **decide.**
17. **When a tab closes.** `docs/03` section 5: "A tab closes when the balance is zero." On a `before_kitchen` tab the balance is zero right after the first payment, while the guest may still order more rounds. Code closes only on an explicit `closeTab` (zero balance, no draft rounds). **decide:** the auto-close rule.
18. **MRP and tags.** `docs/15` section 5 refers to an "MRP item" tag. Code uses tag `mrp` (no service charge) and `contains_alcohol` (from `docs/05` section 2). MRP items still bear tax by their class.
19. **Combo tax class.** A combo line uses the parent item's tax class for the whole line. A combo containing an alcohol part is taxed as food. `docs/03` is silent. **decide** before combos can hold alcohol.

### Facts the docs must state

20. **Bill identity fields have no setting.** `docs/15` section 3 requires legal name, GSTIN, FSSAI number and SAC code on every bill. `docs/04` has no setting for them and the budget forbids adding one without the five tests. They are not in `StoreConfig`. **decide:** where they live (account or store record, not config).
21. **Round state machine void.** `docs/03` section 5 draws `void` under `sent` only. Code allows void from `sent`, `accepted`, `ready` and `served` (staff, reason, audited), and never from `draft` (a draft is discarded, not voided).
22. **Pay timing `n/a`.** Table preset takeaway "n/a" is modelled as no entry in `payTiming`; the schema requires an entry for exactly the order types offered.
23. **Station routing has two sources.** `docs/04` `stations` has category routing; `docs/03` `Item.station` routes per item. Precedence is not stated. The engine only reads `Item.station`; `routing` is validated and stored.
24. **Nutrition `confidence`.** `docs/03` section 3 names the field, not its type. Code uses a number from 0 to 1.
25. **Theme default.** `docs/04` says "proposed by Match my brand". Code uses a placeholder (`look: default`, accent `#1F6F4A`, follow device) until D17 picks a look.

### Stock (docs/09 section 6, docs/05 section 1c, D21, D22)

26. **Soft hold with on/off stock.** With no counts (D22), a hold cannot reserve anything. Code implements D21 as a guarantee: a line covered by an active hold passes the stock check even if staff mark it sold out during payment, until 5 minutes pass or the hold is released. An edited line is not covered.
27. **One `optionId` per line result.** `docs/09` shows a single `optionId`, but a line can have several sold-out choices. Code names the first in group order; fixing it surfaces the next. An item sold out wins over a choice.
28. **"Similar item" is undefined.** `docs/05` section 1c asks for a swap to a similar item. Code uses same course (or same category when there is no course), same dietary type, in stock, not already in the cart, closest price first. A custom hook can replace it.
29. **No option sold-out command.** `docs/25` section 5 lists `menu.item.setSoldOut` only, while `docs/05`, `docs/09` and `docs/17` section 4 (`POST /options/{id}/sold-out`) need option-level stock. The command takes `target: { kind: 'item' | 'option' }`. A separate `menu.option.setSoldOut` may read better.
30. **Snapshot ids.** `docs/03` invariant 8 says every publish creates a new snapshot id; `docs/09` section 5 says the file is stored under a content hash. Same content republished has the same hash. Code gives `id = snap_<seq>_<hash prefix>` and keeps `contentHash` as the storage key.

### Commands (docs/25)

31. **Inverses need more commands.** The first catalogue of five cannot undo itself or expand `combo.create`. Code adds `menu.item.create`, `menu.item.delete`, `choices.group.delete`, `choices.attach`, `choices.detach`. All are in the catalogue.
32. **Assistant and risk.** `docs/25` section 8 defines person and agent rules only. Code: the assistant applies low and medium for a person, and a high command waits for the owner (`needs_approval`). Agents: low applies, medium needs approval, high is refused.
33. **`serviceStyle` inverse.** The preset re-apply wipes owner tweaks, so the inverse of a style change replays the old values with `reapplyPreset: false` instead of re-applying the old preset.
34. **Order types and pay timing.** Changing `orderTypes` through `setting.set` also adjusts `payTiming` (a new type takes the preset timing), otherwise no single change could leave the config valid.

### Enrichment, courses and the waiter (docs/03 section 3, docs/05 sections 1d and 1f, docs/26)

39. **No provenance for `course` and `spice`.** `docs/03` says the owner's course is final and AI never overwrites it, but `Item` stores no source for `course` or `spice` (only `nutrition` has one). Code adds `courseSource` and `spiceSource` (`ai` or `owner`). A value with no recorded source counts as the owner's, so old data is protected. **decide:** keep these two fields or store provenance elsewhere.
40. **AI path and undo in the same command.** `menu.item.setCourse` and `menu.item.setNutrition` take `ifNotOwner: true` for AI runs (uses `mergeAiTag`); the default path sets exactly what it is given, which is also how undo restores a previous AI value over an owner edit. `menu.enrich.run` is in docs/25 but was not asked for and is not built.
41. **`single_course` gap table.** `docs/05` section 1f says "the missing course that most tables add" without data. Code uses a fixed starting table (starter to main, main to drink, side, bread, rice, dessert and drink to main, snack to drink) until real order data exists.
42. **Dessert timing.** `docs/05` says offer a dessert "late (near sending, or at the bill for table stores)". `suggestNext` takes `stage` (`cart`, `late`, `bill`) from the caller and offers a dessert only at `late` or `bill`. What counts as "near sending" is the client's call.
43. **Alcohol is never suggested.** Not in the docs. Alcohol needs an age check (`docs/05` section 2) and dry days (`docs/15` section 5), so `suggestNext` skips items tagged `contains_alcohol`. **decide** if a bar-led store wants otherwise.
44. **Veg guest.** "Veg only, always" is read as `dietaryType === 'veg'`, so egg items are excluded for a vegetarian guest.
45. **Verdict wording and rounding.** `docs/05` section 1d gives one example. Code rounds calories to the nearest 10 and protein to the nearest gram, uses "lighter" for calories only, omits a difference that rounds to zero, and writes no verdict if either dish has no numbers. Item names are used as stored (the example says "the galouti"). The English sentence is a default; the structured facts are returned so copy can be translated.
46. **Waiter tool names and reasons.** `docs/26` section 5 lists actions, not tool names or inputs. The seven tool names and their inputs are my reading. `docs/03` section 4 says service request reasons are "a fixed list" without naming it; code uses water, bill, help, allergen_question, complaint, payment_trouble (the first three from `docs/25`, the rest from `docs/26`).
47. **Portion multiplier for nutrition.** `docs/03` says a portion group MAY carry a multiplier so numbers follow the guest's choice. There is no field for it on `OptionGroup`, so nothing uses it yet.

## C. Deviations from the brief or the stack doc

35. **npm workspaces, not pnpm.** pnpm is not installed. `docs/17` section 1 names pnpm and Turborepo; Turborepo is not added.
36. **Function signatures.** `docs/12` M1 names `priceTab(tab, config)` and `validateLine(item, selections)`. Both need the menu (option groups, linked items), so they take an `EngineContext` or `MenuIndex`. `checkStock(cart, stock)` takes the menu as a third argument.
37. **Hindi names.** `docs/04` gives English owner-facing names only (`docs/25` gives one Hindi example). The Hindi feature names in the registry are my wording and need a native review before they ship.
38. **Requirements and plans.** `requires` values (for example `tableSpots`, `paymentsConnected`) and `plan` per feature are my reading of docs/19 and docs/10, since docs/04 does not list them. The `requires` list is a set of store facts, never another feature, to keep features independent.

## D. Not built (out of scope for M0 and M1)

Opening-hours enforcement (`STORE_CLOSED` code exists, no function), item and category availability windows, alcohol age confirmation, invoice numbering and credit notes (`docs/15` section 3), the settings and menu storage, and the apps. Services still to decide: the rate limit and approval inbox mechanics from `docs/25` section 8, which belong to the API.
