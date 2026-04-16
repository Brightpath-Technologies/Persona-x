import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

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

export type ParsedFoodItem = z.infer<typeof ParsedFoodItemSchema>;
export type ParsedFoodResult = z.infer<typeof ParsedFoodResultSchema>;

const SYSTEM_PROMPT = `You are a food log parser. Extract food items and nutrition from the user's text.
Return ONLY valid JSON — no markdown, no explanation:
{
  "foods": [
    {
      "name": "Food Name",
      "quantity": "2",
      "unit": "eggs",
      "calories": 140,
      "protein_g": 12,
      "carbs_g": 1,
      "fat_g": 10,
      "fibre_g": 0
    }
  ],
  "meal": "breakfast | lunch | dinner | snack | null",
  "date": "YYYY-MM-DD or null",
  "notes": "any extra context or null"
}
CRITICAL RULES — read carefully:
- Create ONE entry per distinct food item.
  Example: "2 eggs and toast with butter" → 3 entries (eggs, toast, butter)
  Example: "chicken caesar salad" → 1 entry (treat as a single dish)
- quantity is a numeric string ("2", "1.5", "1")
- unit is a short descriptor ("eggs", "slice", "cup", "g", "ml", "serving", "bowl", "piece")
- Estimate realistic nutrition values per the TOTAL quantity described (not per unit).
  Example: "2 eggs" → calories for 2 eggs (~140), not 1 egg.
- If the user says something vague like "a sandwich", estimate reasonable average values.
- Use metric units internally (grams, ml) but accept any input format.
- meal: infer from context or time cues. If the user says "for breakfast" → "breakfast". If ambiguous → null.
- date: if mentioned (today, yesterday, a weekday, or explicit date), convert to YYYY-MM-DD using today's date as reference. Otherwise null.
- notes: capture anything that doesn't fit the structured fields (e.g. "at the café", "homemade").
- Round all nutrition numbers to integers.
- Be conservative with estimates — prefer underestimating slightly rather than overestimating.
- If you truly cannot identify a food item, include it with name "Unknown" and zero nutrition.`;

/**
 * Parse a natural language food description into structured food data
 * using Claude Haiku.
 */
export async function parseFood(
  description: string,
  options: { apiKey?: string; today?: string } = {},
): Promise<ParsedFoodResult> {
  const client = new Anthropic({
    apiKey: options.apiKey ?? process.env["ANTHROPIC_API_KEY"],
  });

  const today =
    options.today ?? new Date().toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today's date is ${today}.\n\n${description}`,
      },
    ],
  });

  const firstBlock = response.content[0];
  const text =
    firstBlock && firstBlock.type === "text" ? firstBlock.text : "";

  // Strip markdown code fences if present
  const jsonStr = text
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```/g, "")
    .trim();

  const raw = JSON.parse(jsonStr) as unknown;
  return ParsedFoodResultSchema.parse(raw);
}
