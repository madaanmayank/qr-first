import { z } from 'zod';
import { Id, Paise, TaxClassKey, ClockTime, Weekday, UtcInstant } from './primitives';

/** Mandatory veg and non-veg marks (docs/15 section 4). */
export const DietaryType = z.enum(['veg', 'non_veg', 'egg']);
export type DietaryType = z.infer<typeof DietaryType>;

/** Optional time window; absent means always (docs/03 section 3). */
export const AvailabilityWindow = z.object({
  days: z.array(Weekday).min(1),
  from: ClockTime,
  to: ClockTime,
});
export type AvailabilityWindow = z.infer<typeof AvailabilityWindow>;

export const OptionSchema = z.object({
  id: Id,
  name: z.string().min(1),
  priceDelta: Paise,
  soldOut: z.boolean(),
  /** Combo part: the option stands for another item (docs/03 section 3). */
  linkedItemId: Id.optional(),
  /** Nested groups carried by this option. Depth limit 2 (docs/03 section 3). */
  optionGroupIds: z.array(Id).optional(),
});
export type Option = z.infer<typeof OptionSchema>;

export const OptionGroupSchema = z
  .object({
    id: Id,
    storeId: Id,
    name: z.string().min(1),
    min: z.number().int().min(0),
    max: z.number().int().min(1),
    options: z.array(OptionSchema),
  })
  .refine((g) => g.min <= g.max, { message: 'min must not exceed max', path: ['min'] });
export type OptionGroup = z.infer<typeof OptionGroupSchema>;

export const CategorySchema = z.object({
  id: Id,
  storeId: Id,
  name: z.string().min(1),
  sort: z.number().int(),
  availability: z.array(AvailabilityWindow).optional(),
});
export type Category = z.infer<typeof CategorySchema>;

/** Tags with engine meaning. All other tags are factual and free. */
export const TAG_MRP = 'mrp';
export const TAG_CONTAINS_ALCOHOL = 'contains_alcohol';

/** Course of an item. Used for suggestions, filters, compare and the waiter (docs/03 section 3). */
export const COURSES = ['starter', 'main', 'side', 'bread', 'rice', 'dessert', 'drink', 'snack'] as const;
export const Course = z.enum(COURSES);
export type Course = z.infer<typeof Course>;

export const Spice = z.enum(['mild', 'medium', 'hot']);

/** Calories and protein only, always an estimate shown as "about" (docs/03 section 3). */
export const NutritionSchema = z.object({
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  per: z.literal('serving'),
  source: z.enum(['ai', 'owner']),
  /** 0 to 1. The docs name the field but not its range, see NOTES.md. */
  confidence: z.number().min(0).max(1),
  updatedAt: UtcInstant,
});
export type Nutrition = z.infer<typeof NutritionSchema>;

export const ItemSchema = z.object({
  id: Id,
  storeId: Id,
  categoryId: Id,
  name: z.string().min(1),
  description: z.string().optional(),
  photo: z.string().optional(),
  basePrice: Paise.min(0),
  takeawayPrice: Paise.min(0).optional(),
  taxClass: TaxClassKey,
  dietaryType: DietaryType,
  tags: z.array(z.string()),
  station: Id,
  soldOut: z.boolean(),
  availability: z.array(AvailabilityWindow).optional(),
  optionGroupIds: z.array(Id),
  /** A combo has no course of its own and omits it (docs/03 section 3). */
  course: Course.optional(),
  /**
   * Who set `course` and `spice`. docs/03 says an owner's choice is final but stores no
   * provenance, so these two fields carry it (see NOTES.md). Absent means unknown, and unknown
   * is treated as the owner's, so a later AI run never overwrites it.
   */
  courseSource: z.enum(['ai', 'owner']).optional(),
  spice: Spice.optional(),
  spiceSource: z.enum(['ai', 'owner']).optional(),
  nutrition: NutritionSchema.optional(),
  houseNote: z.string().max(280).optional(),
});
export type Item = z.infer<typeof ItemSchema>;

/** What the engine needs to read a store's menu. One store only. */
export interface MenuIndex {
  storeId: string;
  items: Record<string, Item>;
  optionGroups: Record<string, OptionGroup>;
  categories: Record<string, Category>;
}

/** A guest's picks inside one option group. Nested picks hang off the option. */
export interface SelectedOption {
  optionId: string;
  children?: Selection[];
}
export interface Selection {
  groupId: string;
  options: SelectedOption[];
}

export const SelectionSchema: z.ZodType<Selection> = z.lazy(() =>
  z.object({
    groupId: Id,
    options: z.array(
      z.object({
        optionId: Id,
        children: z.array(SelectionSchema).optional(),
      }),
    ),
  }),
);

/** One unsent line in a cart (a Line once sent). */
export const CartLineSchema = z.object({
  lineId: Id,
  itemId: Id,
  qty: z.number().int().min(1),
  selections: z.array(SelectionSchema),
  note: z.string().max(200).optional(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

/** Live stock: two small sets per store (docs/09 section 6). */
export const StockStateSchema = z.object({
  soldOutItemIds: z.array(Id),
  soldOutOptionIds: z.array(Id),
});
export type StockState = z.infer<typeof StockStateSchema>;
