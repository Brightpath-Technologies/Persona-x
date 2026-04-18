import { z } from "zod";

/**
 * Knowledge Base Use Contract.
 * Required if a knowledge base exists. Defines how the persona may use its knowledge base.
 */

export const KBPermittedUse = z.enum([
  "reference_only",
  "framing",
  "challenge",
  "boundary_setting",
]);

export type KBPermittedUse = z.infer<typeof KBPermittedUse>;

export const KBItemType = z.enum(["file", "link", "excerpt", "note"]);
export type KBItemType = z.infer<typeof KBItemType>;

export const KBItemSource = z.enum([
  "user_provided",
  "firm_reference",
  "external_public",
]);
export type KBItemSource = z.infer<typeof KBItemSource>;

export const KBContentRepresentation = z.enum([
  "full_text",
  "excerpt",
  "link_only",
]);

export const KBUseContractSchema = z.object({
  purpose: z.string().min(1).describe("What this KB is meant to support"),
  permitted_uses: z
    .array(KBPermittedUse)
    .min(1)
    .describe("How the persona may use KB items"),
  prohibited_uses: z
    .array(z.string())
    .min(1)
    .describe("Explicit list of prohibited uses"),
  currency_rule: z
    .string()
    .min(1)
    .describe("How currency/staleness is treated"),
  citation_behaviour: z
    .string()
    .min(1)
    .describe("How KB items are cited in panel responses"),
  coverage_limits: z.string().min(1).describe("What this KB does not cover"),
});

export type KBUseContract = z.infer<typeof KBUseContractSchema>;

export const KBItemSchema = z.object({
  id: z
    .string()
    .regex(/^KB-\d+$/, "KB item IDs must follow the pattern KB-1, KB-2, etc."),
  title: z.string().min(1),
  type: KBItemType,
  source: KBItemSource,
  date_version: z.string().default("Not provided"),
  scope: z.string().min(1).describe("One line on what it covers"),
  content_representation: KBContentRepresentation,
  content: z
    .string()
    .optional()
    .describe("The actual content, if full_text or excerpt"),
  link: z.string().url().optional().describe("URL if link_only"),
  used_for: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1-3 practical bullet points"),
  constraints: z
    .array(z.string())
    .optional()
    .describe("Special cautions for this item"),
});

export type KBItem = z.infer<typeof KBItemSchema>;

export const KnowledgeBaseSchema = z.object({
  contract: KBUseContractSchema,
  items: z.array(KBItemSchema).min(1),
});

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
