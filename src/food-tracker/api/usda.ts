import type { FoodItem } from "../schema.js";
import type { FoodApiProvider } from "./types.js";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const DEMO_API_KEY = "DEMO_KEY";

interface UsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaNutrient[];
}

interface UsdaSearchResponse {
  foods: UsdaFood[];
  totalHits: number;
}

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBRE: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
} as const;

function getNutrientValue(nutrients: UsdaNutrient[], nutrientId: number): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient ? round(nutrient.value) : undefined;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseUsdaFood(food: UsdaFood): FoodItem {
  const n = food.foodNutrients;
  const brand = food.brandName ?? food.brandOwner;

  return {
    id: String(food.fdcId),
    name: food.description,
    brand: brand ?? undefined,
    source: "usda",
    serving_size: food.servingSize
      ? `${food.servingSize}${food.servingSizeUnit ?? "g"}`
      : "100g",
    serving_weight_g: food.servingSize ?? 100,
    nutrition: {
      calories: getNutrientValue(n, NUTRIENT_IDS.ENERGY) ?? 0,
      protein_g: getNutrientValue(n, NUTRIENT_IDS.PROTEIN) ?? 0,
      carbs_g: getNutrientValue(n, NUTRIENT_IDS.CARBS) ?? 0,
      fat_g: getNutrientValue(n, NUTRIENT_IDS.FAT) ?? 0,
      fibre_g: getNutrientValue(n, NUTRIENT_IDS.FIBRE),
      sugar_g: getNutrientValue(n, NUTRIENT_IDS.SUGAR),
      sodium_mg: getNutrientValue(n, NUTRIENT_IDS.SODIUM),
    },
  };
}

export class UsdaClient implements FoodApiProvider {
  readonly name = "USDA FoodData Central";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env["USDA_API_KEY"] ?? DEMO_API_KEY;
  }

  async search(query: string, pageSize = 10): Promise<FoodItem[]> {
    const url = new URL(`${BASE_URL}/foods/search`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`USDA search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as UsdaSearchResponse;
    return data.foods.map(parseUsdaFood);
  }

  async getById(id: string): Promise<FoodItem | null> {
    const url = new URL(`${BASE_URL}/food/${encodeURIComponent(id)}`);
    url.searchParams.set("api_key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as UsdaFood;
    return parseUsdaFood(data);
  }
}
