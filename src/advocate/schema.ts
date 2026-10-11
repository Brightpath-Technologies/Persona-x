import { z } from "zod";
import { PersonaFileSchema } from "../schema/persona.js";

export const AdvocacyStrategySchema = z.object({
  position_summary: z
    .string()
    .min(1)
    .describe("One-paragraph summary of the user's position the advocate will champion"),
  strongest_arguments: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("The most compelling arguments supporting the user's case"),
  anticipated_objections: z
    .array(
      z.object({
        objection: z.string().min(1),
        counter: z.string().min(1),
      })
    )
    .min(1)
    .describe("Expected objections and prepared counters"),
  evidence_to_emphasise: z
    .array(z.string())
    .describe("Key evidence points the advocate should foreground"),
  concessions_available: z
    .array(z.string())
    .describe("Points the advocate can concede strategically to strengthen the core position"),
  red_lines: z
    .array(z.string())
    .min(1)
    .describe("Positions the advocate must never concede"),
});
export type AdvocacyStrategy = z.infer<typeof AdvocacyStrategySchema>;

export const AdvocatePersonaSchema = z.object({
  persona: PersonaFileSchema,
  strategy: AdvocacyStrategySchema,
  calibrated_for: z
    .string()
    .describe("The user profile name this advocate was calibrated against"),
  calibration_notes: z
    .array(z.string())
    .describe("How the advocate's rubric was tuned relative to the user's profile"),
});
export type AdvocatePersona = z.infer<typeof AdvocatePersonaSchema>;

export function validateAdvocatePersona(data: unknown): {
  success: boolean;
  data?: AdvocatePersona;
  errors?: z.ZodError;
} {
  const result = AdvocatePersonaSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
