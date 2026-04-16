import type { FoodItem } from "../schema.js";

/**
 * Common interface for food API providers.
 */
export interface FoodApiProvider {
  readonly name: string;

  /** Search for foods by text query. */
  search(query: string, pageSize?: number): Promise<FoodItem[]>;

  /** Look up a single food by its source-specific ID. */
  getById(id: string): Promise<FoodItem | null>;

  /** Look up a food by barcode (EAN/UPC). Not all providers support this. */
  getByBarcode?(barcode: string): Promise<FoodItem | null>;
}
