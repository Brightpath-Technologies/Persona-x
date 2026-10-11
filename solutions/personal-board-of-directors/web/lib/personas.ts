import path from "path";
import { loadPersonasForPanel } from "@persona-x/runtime/loader.js";
import type { LoadedPersona } from "@persona-x/runtime/interface.js";
import type { PersonaProfile } from "./types";

const PERSONA_DIR = path.join(process.cwd(), "personas");

const PERSONA_FILES = [
  "the-strategist.yaml",
  "the-mentor.yaml",
  "the-devils-advocate.yaml",
  "the-visionary.yaml",
  "the-pragmatist.yaml",
  "the-analyst.yaml",
  "the-coach.yaml",
  "the-ethicist.yaml",
];

export const PERSONA_COUNT = PERSONA_FILES.length;

let cachedPersonas: LoadedPersona[] | null = null;

/**
 * Load all 8 Board personas from YAML files.
 * Caches the result for the lifetime of the server process.
 */
export async function loadBoardPersonas(): Promise<LoadedPersona[]> {
  if (cachedPersonas) return cachedPersonas;

  const filePaths = PERSONA_FILES.map((f) => path.join(PERSONA_DIR, f));
  const result = await loadPersonasForPanel(filePaths);

  if (Object.keys(result.errors).length > 0) {
    console.error("Persona loading errors:", result.errors);
    throw new Error(
      `Failed to load personas: ${JSON.stringify(result.errors)}`
    );
  }

  if (Object.keys(result.warnings).length > 0) {
    console.warn("Persona loading warnings:", result.warnings);
  }

  cachedPersonas = result.personas;
  return cachedPersonas;
}

/**
 * Convert loaded personas to client-safe profile objects.
 */
export function toPersonaProfiles(personas: LoadedPersona[]): PersonaProfile[] {
  return personas.map((p) => ({
    id: p.id,
    name: p.file.metadata.name,
    role: p.file.purpose.description,
    contributionType: p.file.panel_role.contribution_type,
    rubric: {
      risk_appetite: p.file.rubric.risk_appetite,
      evidence_threshold: p.file.rubric.evidence_threshold,
      tolerance_for_ambiguity: p.file.rubric.tolerance_for_ambiguity,
      intervention_frequency: p.file.rubric.intervention_frequency,
      escalation_bias: p.file.rubric.escalation_bias,
      delivery_vs_rigour_bias: p.file.rubric.delivery_vs_rigour_bias,
    },
  }));
}
