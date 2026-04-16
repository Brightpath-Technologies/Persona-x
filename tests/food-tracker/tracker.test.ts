import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { sumNutrition } from "../../src/food-tracker/tracker.js";
import type { FoodEntry, FoodItem } from "../../src/food-tracker/schema.js";

function makeFoodItem(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: "test-1",
    name: "Test Food",
    source: "openfoodfacts",
    nutrition: {
      calories: 200,
      protein_g: 10,
      carbs_g: 25,
      fat_g: 8,
      fibre_g: 3,
      sugar_g: 5,
      sodium_mg: 100,
    },
    ...overrides,
  };
}

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    entry_id: "entry-1",
    food: makeFoodItem(),
    servings: 1,
    meal: "lunch",
    logged_at: "2026-04-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("sumNutrition", () => {
  it("returns zeroes for empty list", () => {
    const totals = sumNutrition([]);
    expect(totals.calories).toBe(0);
    expect(totals.protein_g).toBe(0);
    expect(totals.carbs_g).toBe(0);
    expect(totals.fat_g).toBe(0);
  });

  it("sums a single entry correctly", () => {
    const totals = sumNutrition([makeEntry()]);
    expect(totals.calories).toBe(200);
    expect(totals.protein_g).toBe(10);
    expect(totals.carbs_g).toBe(25);
    expect(totals.fat_g).toBe(8);
    expect(totals.fibre_g).toBe(3);
  });

  it("accounts for servings", () => {
    const totals = sumNutrition([makeEntry({ servings: 2.5 })]);
    expect(totals.calories).toBe(500);
    expect(totals.protein_g).toBe(25);
    expect(totals.carbs_g).toBe(62.5);
    expect(totals.fat_g).toBe(20);
  });

  it("sums multiple entries", () => {
    const entries = [
      makeEntry({ entry_id: "e1", servings: 1 }),
      makeEntry({
        entry_id: "e2",
        servings: 2,
        food: makeFoodItem({
          id: "test-2",
          nutrition: {
            calories: 100,
            protein_g: 5,
            carbs_g: 15,
            fat_g: 3,
          },
        }),
      }),
    ];
    const totals = sumNutrition(entries);
    // 200*1 + 100*2 = 400
    expect(totals.calories).toBe(400);
    // 10*1 + 5*2 = 20
    expect(totals.protein_g).toBe(20);
  });

  it("handles missing optional nutrition fields", () => {
    const entry = makeEntry({
      food: makeFoodItem({
        nutrition: {
          calories: 50,
          protein_g: 2,
          carbs_g: 10,
          fat_g: 1,
          // no fibre, sugar, sodium
        },
      }),
    });
    const totals = sumNutrition([entry]);
    expect(totals.calories).toBe(50);
    expect(totals.fibre_g).toBe(0);
    expect(totals.sugar_g).toBe(0);
    expect(totals.sodium_mg).toBe(0);
  });
});

describe("storage (with temp dir)", () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "food-tracker-test-"));
    originalHome = process.env["HOME"];
    process.env["HOME"] = tmpDir;
  });

  afterEach(() => {
    process.env["HOME"] = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    // Clear the module cache so storage re-reads HOME
    vi.resetModules();
  });

  it("loads empty data when no file exists", async () => {
    const { loadData } = await import("../../src/food-tracker/storage.js");
    const data = loadData();
    expect(data.version).toBe("1.0.0");
    expect(data.entries).toHaveLength(0);
  });

  it("saves and loads entries", async () => {
    const { loadData, addEntry, getEntriesForDate } = await import(
      "../../src/food-tracker/storage.js"
    );

    addEntry(makeEntry({ logged_at: "2026-04-16T12:00:00.000Z" }));
    addEntry(makeEntry({ entry_id: "entry-2", logged_at: "2026-04-16T18:00:00.000Z" }));

    const data = loadData();
    expect(data.entries).toHaveLength(2);

    const dayEntries = getEntriesForDate("2026-04-16");
    expect(dayEntries).toHaveLength(2);
  });

  it("removes entries by ID", async () => {
    const { loadData, addEntry, removeEntry } = await import(
      "../../src/food-tracker/storage.js"
    );

    addEntry(makeEntry({ entry_id: "keep-me" }));
    addEntry(makeEntry({ entry_id: "remove-me" }));

    const removed = removeEntry("remove-me");
    expect(removed).toBe(true);

    const data = loadData();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]!.entry_id).toBe("keep-me");
  });

  it("returns false when removing non-existent entry", async () => {
    const { removeEntry } = await import("../../src/food-tracker/storage.js");
    const removed = removeEntry("does-not-exist");
    expect(removed).toBe(false);
  });

  it("filters entries by date range", async () => {
    const { addEntry, getEntriesInRange } = await import(
      "../../src/food-tracker/storage.js"
    );

    addEntry(makeEntry({ entry_id: "e1", logged_at: "2026-04-14T12:00:00.000Z" }));
    addEntry(makeEntry({ entry_id: "e2", logged_at: "2026-04-15T12:00:00.000Z" }));
    addEntry(makeEntry({ entry_id: "e3", logged_at: "2026-04-16T12:00:00.000Z" }));

    const range = getEntriesInRange("2026-04-15", "2026-04-16");
    expect(range).toHaveLength(2);
  });
});
