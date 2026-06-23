import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import { validatePersonaFile } from "../schema/persona.js";
import { validateRubricCoherence } from "../schema/rubric.js";
import type { LoadedPersona } from "./interface.js";

/**
 * Persona Loader
 *
 * Loads persona YAML files from disk, validates them against the schema,
 * checks rubric coherence, and returns a hydrated LoadedPersona ready for
 * panel runtime use.
 */

export interface LoadResult {
  success: boolean;
  persona?: LoadedPersona;
  errors?: string[];
  warnings?: string[];
}

/**
 * Load a persona file from a YAML path.
 */
export async function loadPersonaFromFile(
  filePath: string,
): Promise<LoadResult> {
  const warnings: string[] = [];

  // Read file
  let rawContent: string;
  try {
    rawContent = await readFile(filePath, "utf-8");
  } catch (err) {
    return {
      success: false,
      errors: [`Failed to read file: ${filePath} — ${String(err)}`],
    };
  }

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = parse(rawContent);
  } catch (err) {
    return {
      success: false,
      errors: [`Invalid YAML in ${filePath} — ${String(err)}`],
    };
  }

  // Validate against schema
  const validation = validatePersonaFile(parsed);
  if (!validation.success || !validation.data) {
    const schemaErrors = validation.errors?.issues.map(
      (issue: { path: (string | number)[]; message: string }) =>
        `${issue.path.join(".")}: ${issue.message}`,
    ) ?? ["Unknown validation error"];
    return { success: false, errors: schemaErrors };
  }

  const persona = validation.data;

  // Check rubric coherence
  const rubricWarnings = validateRubricCoherence(persona.rubric);
  warnings.push(...rubricWarnings);

  // Generate a stable ID from the persona name
  const id = persona.metadata.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    success: true,
    persona: {
      file: persona,
      id,
      active: true,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Load multiple persona files for a panel session.
 */
export async function loadPersonasForPanel(filePaths: string[]): Promise<{
  personas: LoadedPersona[];
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}> {
  const personas: LoadedPersona[] = [];
  const allErrors: Record<string, string[]> = {};
  const allWarnings: Record<string, string[]> = {};

  for (const path of filePaths) {
    const result = await loadPersonaFromFile(path);
    if (result.success && result.persona) {
      personas.push(result.persona);
    }
    if (result.errors) {
      allErrors[path] = result.errors;
    }
    if (result.warnings) {
      allWarnings[path] = result.warnings;
    }
  }

  return { personas, errors: allErrors, warnings: allWarnings };
}
