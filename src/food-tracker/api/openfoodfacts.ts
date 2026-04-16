import type { FoodItem } from "../schema.js";
import type { FoodApiProvider } from "./types.js";

const BASE_URL = "https://world.openfoodfacts.org";

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
    "energy-kcal_serving"?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
    fiber_serving?: number;
    sugars_serving?: number;
    sodium_serving?: number;
  };
}

function parseProduct(product: OffProduct): FoodItem | null {
  if (!product.product_name) return null;
  const n = product.nutriments ?? {};

  // Prefer per-serving values; fall back to per-100g
  const hasServing = n["energy-kcal_serving"] != null;
  const cal = hasServing ? n["energy-kcal_serving"] : n["energy-kcal_100g"];
  const protein = hasServing ? n.proteins_serving : n.proteins_100g;
  const carbs = hasServing ? n.carbohydrates_serving : n.carbohydrates_100g;
  const fat = hasServing ? n.fat_serving : n.fat_100g;
  const fibre = hasServing ? n.fiber_serving : n.fiber_100g;
  const sugar = hasServing ? n.sugars_serving : n.sugars_100g;
  const sodium = hasServing ? n.sodium_serving : n.sodium_100g;

  return {
    id: product.code ?? product.product_name,
    name: product.product_name,
    brand: product.brands ?? undefined,
    source: "openfoodfacts",
    serving_size: product.serving_size ?? (hasServing ? undefined : "100g"),
    serving_weight_g: product.serving_quantity ?? (hasServing ? undefined : 100),
    nutrition: {
      calories: round(cal ?? 0),
      protein_g: round(protein ?? 0),
      carbs_g: round(carbs ?? 0),
      fat_g: round(fat ?? 0),
      fibre_g: fibre != null ? round(fibre) : undefined,
      sugar_g: sugar != null ? round(sugar) : undefined,
      sodium_mg: sodium != null ? round(sodium * 1000) : undefined,
    },
    barcode: product.code ?? undefined,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export class OpenFoodFactsClient implements FoodApiProvider {
  readonly name = "OpenFoodFacts";

  async search(query: string, pageSize = 10): Promise<FoodItem[]> {
    const url = new URL("/cgi/search.pl", BASE_URL);
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("fields", "code,product_name,brands,serving_size,serving_quantity,nutriments");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "PersonaX-FoodTracker/1.0" },
    });

    if (!response.ok) {
      throw new Error(`OpenFoodFacts search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { products?: OffProduct[] };
    const products = data.products ?? [];
    return products.map(parseProduct).filter((p): p is FoodItem => p !== null);
  }

  async getById(id: string): Promise<FoodItem | null> {
    return this.getByBarcode(id);
  }

  async getByBarcode(barcode: string): Promise<FoodItem | null> {
    const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "PersonaX-FoodTracker/1.0" },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { product?: OffProduct; status?: number };
    if (data.status === 0 || !data.product) return null;

    return parseProduct(data.product);
  }
}
