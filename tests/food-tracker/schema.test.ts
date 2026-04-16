import { describe, it, expect } from "vitest";
import {
  NutritionSchema,
  FoodItemSchema,
  FoodEntrySchema,
  FoodTrackerDataSchema,
} from "../../src/food-tracker/schema.js";

describe("NutritionSchema", () => {
  it("accepts valid nutrition data", () => {
    const result = NutritionSchema.safeParse({
      calories: 250,
      protein_g: 12,
      carbs_g: 30,
      fat_g: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = NutritionSchema.safeParse({
      calories: 100,
      protein_g: 5,
      carbs_g: 20,
      fat_g: 2,
      fibre_g: 3,
      sugar_g: 8,
      sodium_mg: 150,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fibre_g).toBe(3);
      expect(result.data.sugar_g).toBe(8);
      expect(result.data.sodium_mg).toBe(150);
    }
  });

  it("rejects negative calories", () => {
    const result = NutritionSchema.safeParse({
      calories: -10,
      protein_g: 5,
      carbs_g: 20,
      fat_g: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = NutritionSchema.safeParse({
      calories: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("FoodItemSchema", () => {
  it("accepts a valid food item", () => {
    const result = FoodItemSchema.safeParse({
      id: "123456",
      name: "Vegemite",
      source: "openfoodfacts",
      nutrition: {
        calories: 174,
        protein_g: 25.5,
        carbs_g: 12.9,
        fat_g: 0.8,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a food item with all optional fields", () => {
    const result = FoodItemSchema.safeParse({
      id: "999",
      name: "Chicken Breast",
      brand: "Woolworths",
      source: "usda",
      serving_size: "100g",
      serving_weight_g: 100,
      barcode: "9300000000001",
      nutrition: {
        calories: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        fibre_g: 0,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid source", () => {
    const result = FoodItemSchema.safeParse({
      id: "123",
      name: "Test",
      source: "unknown_source",
      nutrition: {
        calories: 100,
        protein_g: 5,
        carbs_g: 20,
        fat_g: 2,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("FoodEntrySchema", () => {
  const validFood = {
    id: "123",
    name: "Banana",
    source: "openfoodfacts" as const,
    nutrition: { calories: 89, protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3 },
  };

  it("accepts a valid entry", () => {
    const result = FoodEntrySchema.safeParse({
      entry_id: "abc-123",
      food: validFood,
      servings: 2,
      meal: "breakfast",
      logged_at: "2026-04-16T08:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("defaults servings to 1 and meal to snack", () => {
    const result = FoodEntrySchema.safeParse({
      entry_id: "abc-456",
      food: validFood,
      logged_at: "2026-04-16T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servings).toBe(1);
      expect(result.data.meal).toBe("snack");
    }
  });

  it("rejects zero servings", () => {
    const result = FoodEntrySchema.safeParse({
      entry_id: "abc-789",
      food: validFood,
      servings: 0,
      meal: "lunch",
      logged_at: "2026-04-16T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("FoodTrackerDataSchema", () => {
  it("accepts empty entry list", () => {
    const result = FoodTrackerDataSchema.safeParse({
      version: "1.0.0",
      entries: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong version", () => {
    const result = FoodTrackerDataSchema.safeParse({
      version: "2.0.0",
      entries: [],
    });
    expect(result.success).toBe(false);
  });
});
