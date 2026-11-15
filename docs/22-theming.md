# 22. Theming

How a restaurant makes the guest experience its own. Theming is a core feature. Its design goal: **any restaurant, with no design skill, ends up with something classy.**

The design language in [21-design-language.md](21-design-language.md) governs everything here.

## 1. The problem with common theming systems

- They expose many low-level controls: dozens of colours, font sizes, layout variants.
- Merchants and operations staff combine them freely, and most combinations look poor.
- Some controls do nothing, because no component reads them.
- The result needs an internal team to build each theme by hand.

## 2. Our approach: looks

A **look** is a complete, art-directed design for the guest app. It is made by designers, tested on every restaurant archetype, and cannot be broken by the merchant.

| A look defines | Detail |
| --- | --- |
| Typography | Display face for the store name and section titles; text face; sizes and weights within the shared scale |
| Colour mood | Page and surface neutrals for light and dark; how the accent is used |
| Shape | Corner radius within the allowed range; hairline or soft-surface style |
| Photo treatment | Aspect ratio, corner style, how items without photos are shown |
| Menu rhythm | Card style (photo-led, text-led or mixed, chosen automatically by content), spacing, category header style |
| Cover style | How the cover image or video, logo and welcome note sit together |
| Motion feel | Timing within the shared limits |
| Print style | Matching QR tents, stickers and bill header |

The merchant chooses a look and gives a few inputs. The system does the rest.

## 3. What the merchant controls

| Input | Type | Notes |
| --- | --- | --- |
| **Look** | One of the published looks | Changeable at any time, instantly, with no content loss |
| **Accent colour** | One colour | Picked from the logo, from suggestions, or by hand. The system adjusts it for contrast and derives tints |
| **Logo** | Image | Optional. The store name set in the look's display face is the fallback |
| **Cover** | Image or short video | Optional |
| **Welcome note** | Up to two short lines | Optional; signed with the store or owner name |
| **Appearance** | Light, dark or follow the guest's device | Default comes from the look |

These map to the store settings `theme` (look, accent, appearance), `logo` and `coverMedia` in [04-settings-budget.md](04-settings-budget.md). The welcome note is content.

**Not controllable:** individual font sizes, spacing, per-component colours, layout variants, button shapes, animation choices. These belong to the look.

## 4. The first looks

Six looks at launch. Names and exact designs are created in stage 1. The set MUST cover this range:

| Working name | Character | Fits archetypes such as |
| --- | --- | --- |
| **Paper** | Light, editorial, typographic, lots of air | Specialty cafes, premium dining |
| **Ink** | Dark, intimate, high contrast, photo-led | Bars, lounges, evening venues |
| **Clay** | Warm, earthy, generous, heritage-friendly | North Indian, Mughlai, kebab houses |
| **Leaf** | Fresh, bright, clean | South Indian, healthy, vegetarian |
| **Sugar** | Soft, playful, rounded | Dessert, bakery, bubble tea |
| **Signal** | Bold, fast, compact | Quick service, food stalls, cloud kitchens |

- Every look works with every archetype. The mapping above is only a default suggestion.
- A new look is added when a real group of restaurants is poorly served by the existing ones. Looks are not added for single customers.
- Each look supports Latin and Devanagari at launch, with matched weights.

## 5. Match my brand

AI proposes the starting theme so the owner begins with something that already feels right.

1. **Inputs:** logo, one or two photos of the space or signage, the menu, the cuisine and the archetype guess.
2. **Outputs:** a recommended look, an accent colour taken from the brand, light or dark, and a short reason in plain words ("Dark and warm, to match your interiors").
3. **Shown as:** three options side by side in the live preview. The owner taps one.
4. **Rules:** the accent is adjusted to pass contrast; the proposal uses only published looks; the owner can change everything afterwards.

## 6. Guardrails that keep every result classy

- **Contrast is enforced.** Text on any surface and on the accent meets WCAG AA. If the chosen accent fails, the system shifts it and shows the result.
- **Accent has a job.** It appears on the primary action, selected states and small highlights. It never floods backgrounds.
- **Content adapts the layout.** Many photos produce photo-led cards. Few photos produce a refined text-led menu. The owner never chooses a layout.
- **Missing media is handled gracefully.** No grey boxes and no broken images. A look defines how a photo-less item appears.
- **Long text is handled.** Long names, long descriptions and mixed scripts wrap cleanly in every look.
- **Fixed marks stay fixed.** Veg and non-veg marks, prices and tax lines are never restyled by a look.
- **Logo safety.** Logos are placed on a surface with enough contrast, with padding, at a size the look defines.

## 7. Live preview

- Every theme change appears in the dashboard's phone preview within a second. See [07-merchant-dashboard.md](07-merchant-dashboard.md).
- The preview is the real guest app running on the store's real menu.
- The owner can switch the preview between light and dark, between screens (menu, item, cart, bill), and between phone and printed QR material.
- A shareable preview link lets the owner show a partner or designer before publishing.
- Publishing a look is instant and reversible. The previous look is one tap away.

## 8. How a look is built

A look is data plus a small set of component variants. It adds no new logic.

```
Look {
  id, name, version
  type:    { display, text, scaleTweaks }
  color:   { light: neutrals, dark: neutrals, accentUsage }
  shape:   { radius, divider: 'hairline' | 'surface' }
  photo:   { ratio, corner, placeholderStyle }
  menu:    { categoryHeader, cardStyleRules }
  cover:   { layout }
  motion:  { feel }
  print:   { tentTemplate, stickerTemplate, billHeader }
}
```

- Every field maps to tokens or to a named component variant. **Every field is read by a component.** A contract test fails when a look field has no effect.
- Looks are versioned. A store stays on its look version until the look is updated; updates are visual refinements that never move content.
- Looks ship inside the menu snapshot, so the guest app needs no extra request.

## 9. Acceptance checks for a look

A look ships only when all of these pass on all twelve seed stores from [24-first-100-delhi.md](24-first-100-delhi.md):

1. Contrast passes in light and dark, with five different accents including a difficult one (yellow, pale pink).
2. A 10-item menu looks complete. A 400-item menu stays browsable.
3. A menu with no photos looks intentional. A menu with all photos does not feel heavy.
4. Long Hindi and English names wrap well; mixed-script lines align.
5. Item sheet, cart, payment, order status and the bill all carry the look.
6. Printed tent and sticker match the screen.
7. The menu route still meets the speed and size budgets, including fonts.
8. Three people outside the team, shown the result on a real phone, describe it as clean.

## 10. Later, not now

- **Seasonal touches:** a store can switch on a tasteful festive variant of its look for Diwali, Eid, Christmas or its own anniversary. Designed as part of each look.
- **Brand kits for chains:** an account-level preset of look, accent and logo applied to many stores through bulk apply.
- **Custom looks for large brands:** made by our designers within the same Look structure. Never a code fork.

## 11. Dashboard and staff app

- The merchant dashboard and staff app use the product's own design. The store's look applies to guest-facing surfaces only. Owners should feel the product's quality; staff need one consistent tool.
- The store's logo and accent appear in small ways: the store switcher, the preview, printed material.

## v1 scope (14 Nov 2026)

- v1 is white background only, one font, with no dark mode. See [21-design-language.md](21-design-language.md) section 13.
- In v1 a store's theme is its accent colour (used for the bold buttons), logo, cover and welcome note. Looks with different type and shape return after v1, informed by the reference study.

## Changes

- 14 Nov 2026: file created. Replaces the brand-colour-only theming in earlier files.
