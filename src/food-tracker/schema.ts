import { z } from "zod";

/**
 * Nutritional information for a food item.
 * All values are per serving.
 */
export const NutritionSchema = z.object({
  calories: z.number().nonnegative().describe("Calories (kcal)"),
  protein_g: z.number().nonnegative().describe("Protein in grams"),
  carbs_g: z.number().nonnegative().describe("Carbohydrates in grams"),
  fat_g: z.number().nonnegative().describe("Fat in grams"),
  fibre_g: z.number().nonnegative().optional().describe("Fibre in grams"),
  sugar_g: z.number().nonnegative().optional().describe("Sugar in grams"),
  sodium_mg: z.number().nonnegative().optional().describe("Sodium in milligrams"),
});

export type Nutrition = z.infer<typeof NutritionSchema>;

/**
 * A food item returned from an API search.
 */
export const FoodItemSchema = z.object({
  id: z.string().describe("Unique identifier from the source API"),
  name: z.string().describe("Food name"),
  brand: z.string().optional().describe("Brand name if applicable"),
  source: z.enum(["openfoodfacts", "usda"]).describe("Which API provided this"),
  serving_size: z.string().optional().describe("Serving size description"),
  serving_weight_g: z.number().nonnegative().optional().describe("Serving weight in grams"),
  nutrition: NutritionSchema,
  barcode: z.string().optional().describe("Barcode / EAN / UPC"),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;

/**
 * A logged food entry — a food item with quantity, date, and meal context.
 */
export const FoodEntrySchema = z.object({
  entry_id: z.string().describe("Unique entry identifier"),
  food: FoodItemSchema,
  servings: z.number().positive().default(1).describe("Number of servings consumed"),
  meal: z
    .enum(["breakfast", "lunch", "dinner", "snack"])
    .default("snack")
    .describe("Meal category"),
  logged_at: z.string().datetime().describe("ISO 8601 timestamp of when this was logged"),
  notes: z.string().optional().describe("Optional notes"),
});

export type FoodEntry = z.infer<typeof FoodEntrySchema>;

/**
 * A daily summary of food entries.
 */
export const DailySummarySchema = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  entries: z.array(FoodEntrySchema),
  totals: NutritionSchema,
});

export type DailySummary = z.infer<typeof DailySummarySchema>;

/**
 * The root storage structure for all food tracker data.
 */
export const FoodTrackerDataSchema = z.object({
  version: z.literal("1.0.0"),
  entries: z.array(FoodEntrySchema),
});

export type FoodTrackerData = z.infer<typeof FoodTrackerDataSchema>;
