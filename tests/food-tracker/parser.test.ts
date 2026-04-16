import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * Tests for the NL food parser.
 *
 * Since the actual parser calls the Anthropic API, we test:
 * 1. The result schema validation (ParsedFoodResultSchema)
 * 2. The parser function with a mocked API client
 */

// Re-define the schemas here to test them in isolation without importing
// the module (which would require the Anthropic SDK at import time)
const ParsedFoodItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fibre_g: z.number().optional(),
});

const ParsedFoodResultSchema = z.object({
  foods: z.array(ParsedFoodItemSchema),
  meal: z
    .enum(["breakfast", "lunch", "dinner", "snack"])
    .nullable()
    .default(null),
  date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

describe("ParsedFoodResultSchema", () => {
  it("accepts a valid parsed result", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [
        {
          name: "Eggs",
          quantity: "2",
          unit: "eggs",
          calories: 140,
          protein_g: 12,
          carbs_g: 1,
          fat_g: 10,
          fibre_g: 0,
        },
        {
          name: "Toast",
          quantity: "1",
          unit: "slice",
          calories: 80,
          protein_g: 3,
          carbs_g: 14,
          fat_g: 1,
        },
      ],
      meal: "breakfast",
      date: "2026-04-16",
      notes: "homemade",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foods).toHaveLength(2);
      expect(result.data.meal).toBe("breakfast");
      expect(result.data.date).toBe("2026-04-16");
    }
  });

  it("defaults meal and date to null when not provided", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [
        {
          name: "Banana",
          quantity: "1",
          unit: "piece",
          calories: 89,
          protein_g: 1,
          carbs_g: 23,
          fat_g: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meal).toBeNull();
      expect(result.data.date).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepts null for meal and date explicitly", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [
        {
          name: "Water",
          quantity: "1",
          unit: "cup",
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        },
      ],
      meal: null,
      date: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid meal values", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [],
      meal: "brunch",
    });
    expect(result.success).toBe(false);
  });

  it("rejects food items missing required nutrition fields", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [
        {
          name: "Mystery",
          quantity: "1",
          unit: "serving",
          // missing calories, protein_g, carbs_g, fat_g
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty foods array", () => {
    const result = ParsedFoodResultSchema.safeParse({
      foods: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foods).toHaveLength(0);
    }
  });

  it("validates all four meal types", () => {
    for (const meal of ["breakfast", "lunch", "dinner", "snack"]) {
      const result = ParsedFoodResultSchema.safeParse({
        foods: [],
        meal,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("ParsedFoodItemSchema", () => {
  it("accepts item with fibre_g", () => {
    const result = ParsedFoodItemSchema.safeParse({
      name: "Oats",
      quantity: "1",
      unit: "cup",
      calories: 150,
      protein_g: 5,
      carbs_g: 27,
      fat_g: 3,
      fibre_g: 4,
    });
    expect(result.success).toBe(true);
  });

  it("accepts item without fibre_g", () => {
    const result = ParsedFoodItemSchema.safeParse({
      name: "Milk",
      quantity: "250",
      unit: "ml",
      calories: 120,
      protein_g: 8,
      carbs_g: 12,
      fat_g: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects item missing name", () => {
    const result = ParsedFoodItemSchema.safeParse({
      quantity: "1",
      unit: "serving",
      calories: 100,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseFood (mocked)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses AI response and validates schema", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            foods: [
              {
                name: "Scrambled Eggs",
                quantity: "2",
                unit: "eggs",
                calories: 140,
                protein_g: 12,
                carbs_g: 1,
                fat_g: 10,
                fibre_g: 0,
              },
            ],
            meal: "breakfast",
            date: "2026-04-16",
            notes: null,
          }),
        },
      ],
    };

    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = {
          create: vi.fn().mockResolvedValue(mockResponse),
        };
      },
    }));

    const { parseFood } = await import("../../src/food-tracker/parser.js");
    const result = await parseFood("2 scrambled eggs for breakfast", {
      apiKey: "test-key",
      today: "2026-04-16",
    });

    expect(result.foods).toHaveLength(1);
    expect(result.foods[0]!.name).toBe("Scrambled Eggs");
    expect(result.foods[0]!.calories).toBe(140);
    expect(result.meal).toBe("breakfast");
    expect(result.date).toBe("2026-04-16");
  });

  it("handles markdown-fenced JSON response", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: '```json\n{"foods": [{"name": "Apple", "quantity": "1", "unit": "piece", "calories": 52, "protein_g": 0, "carbs_g": 14, "fat_g": 0}], "meal": "snack", "date": null, "notes": null}\n```',
        },
      ],
    };

    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = {
          create: vi.fn().mockResolvedValue(mockResponse),
        };
      },
    }));

    const { parseFood } = await import("../../src/food-tracker/parser.js");
    const result = await parseFood("an apple", {
      apiKey: "test-key",
    });

    expect(result.foods).toHaveLength(1);
    expect(result.foods[0]!.name).toBe("Apple");
    expect(result.meal).toBe("snack");
  });
});
