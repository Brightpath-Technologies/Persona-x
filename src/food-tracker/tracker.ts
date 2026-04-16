import { randomUUID } from "node:crypto";
import type { FoodItem, FoodEntry, Nutrition, DailySummary } from "./schema.js";
import type { FoodApiProvider } from "./api/types.js";
import { OpenFoodFactsClient } from "./api/openfoodfacts.js";
import { UsdaClient } from "./api/usda.js";
import { addEntry, removeEntry, getEntriesForDate } from "./storage.js";

export type ApiSource = "openfoodfacts" | "usda" | "all";

function getProviders(source: ApiSource): FoodApiProvider[] {
  switch (source) {
    case "openfoodfacts":
      return [new OpenFoodFactsClient()];
    case "usda":
      return [new UsdaClient()];
    case "all":
      return [new OpenFoodFactsClient(), new UsdaClient()];
  }
}

/**
 * Search for foods across one or more API sources.
 */
export async function searchFoods(
  query: string,
  source: ApiSource = "all",
  pageSize = 10,
): Promise<FoodItem[]> {
  const providers = getProviders(source);
  const perProvider = Math.ceil(pageSize / providers.length);

  const results = await Promise.allSettled(
    providers.map((p) => p.search(query, perProvider)),
  );

  const foods: FoodItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      foods.push(...result.value);
    }
  }

  return foods.slice(0, pageSize);
}

/**
 * Look up a food by barcode. Tries OpenFoodFacts first (best barcode support).
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const off = new OpenFoodFactsClient();
  const result = await off.getByBarcode(barcode);
  if (result) return result;

  // USDA doesn't support barcode lookup natively, so just return null
  return null;
}

/**
 * Log a food entry to local storage.
 */
export function logFood(
  food: FoodItem,
  options: {
    servings?: number;
    meal?: "breakfast" | "lunch" | "dinner" | "snack";
    notes?: string;
  } = {},
): FoodEntry {
  const entry: FoodEntry = {
    entry_id: randomUUID(),
    food,
    servings: options.servings ?? 1,
    meal: options.meal ?? "snack",
    logged_at: new Date().toISOString(),
    notes: options.notes,
  };

  addEntry(entry);
  return entry;
}

/**
 * Remove a logged food entry by ID.
 */
export function removeLoggedFood(entryId: string): boolean {
  return removeEntry(entryId);
}

/**
 * Calculate total nutrition across entries, accounting for servings.
 */
export function sumNutrition(entries: FoodEntry[]): Nutrition {
  const totals: Nutrition = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fibre_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  };

  for (const entry of entries) {
    const s = entry.servings;
    const n = entry.food.nutrition;
    totals.calories += n.calories * s;
    totals.protein_g += n.protein_g * s;
    totals.carbs_g += n.carbs_g * s;
    totals.fat_g += n.fat_g * s;
    totals.fibre_g = (totals.fibre_g ?? 0) + (n.fibre_g ?? 0) * s;
    totals.sugar_g = (totals.sugar_g ?? 0) + (n.sugar_g ?? 0) * s;
    totals.sodium_mg = (totals.sodium_mg ?? 0) + (n.sodium_mg ?? 0) * s;
  }

  // Round everything
  totals.calories = round(totals.calories);
  totals.protein_g = round(totals.protein_g);
  totals.carbs_g = round(totals.carbs_g);
  totals.fat_g = round(totals.fat_g);
  if (totals.fibre_g != null) totals.fibre_g = round(totals.fibre_g);
  if (totals.sugar_g != null) totals.sugar_g = round(totals.sugar_g);
  if (totals.sodium_mg != null) totals.sodium_mg = round(totals.sodium_mg);

  return totals;
}

/**
 * Get a daily summary for a given date (YYYY-MM-DD).
 */
export function getDailySummary(date: string): DailySummary {
  const entries = getEntriesForDate(date);
  return {
    date,
    entries,
    totals: sumNutrition(entries),
  };
}

/**
 * Get summaries for a range of dates.
 */
export function getHistory(days: number): DailySummary[] {
  const today = new Date();
  const summaries: DailySummary[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entries = getEntriesForDate(dateStr);

    if (entries.length > 0) {
      summaries.push({
        date: dateStr,
        entries,
        totals: sumNutrition(entries),
      });
    }
  }

  return summaries;
}

/**
 * Today's date as YYYY-MM-DD.
 */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
