import { readPersonaFile, writePersonaFile } from "../utils/yaml.js";
import { bumpVersion, inferBumpType } from "../utils/version.js";
import type { PersonaFile } from "../schema/persona.js";
import {
  PersonaPurposeSchema,
  PersonaBioSchema,
  PanelRoleSchema,
  ReasoningTendenciesSchema,
  InteractionStyleSchema,
  CommunicationStyleSchema,
  BoundariesSchema,
  InvocationCuesSchema,
} from "../schema/persona.js";
import { RubricProfileSchema } from "../schema/rubric.js";
import { createClient } from "../llm/client.js";
import { sendMessageForJSON } from "../llm/client.js";
import { createInterface } from "node:readline/promises";

/**
 * REFINE Command
 *
 * Targeted adjustment of an existing persona definition file.
 * REFINE assumes the underlying scaffold is correct and focuses on
 * improving precision, clarity, or alignment within specific sections.
 */

interface RefineOptions {
  section?: string;
  output?: string;
}

const SECTION_LABELS: Record<string, string> = {
  purpose: "Persona Purpose & Panel Use",
  bio: "Brief Bio & Context",
  panel_role: "Panel Role & Functional Contribution",
  rubric: "Judgement & Reasoning Profile",
  reasoning: "Reasoning & Decision Tendencies",
  interaction: "Interaction & Challenge Style",
  communication: "Communication Style (optional)",
  boundaries: "Boundaries, Constraints & Refusals",
  invocation: "Invocation Cues & Usage Notes",
};

const REFINABLE_SECTIONS = Object.keys(SECTION_LABELS);

export async function refineCommand(
  filePath: string,
  options: RefineOptions,
): Promise<void> {
  console.log("Persona-x — REFINE mode active");
  console.log(`Loading persona file: ${filePath}\n`);

  // Load and validate the existing file
  const result = await readPersonaFile(filePath);
  if (!result.success || !result.data) {
    console.error("Failed to load persona file:");
    for (const error of result.errors ?? []) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
    return;
  }

  const persona = result.data;
  console.log(
    `Loaded: ${persona.metadata.name} (v${persona.metadata.version})`,
  );

  // Show current rubric for context
  console.log("\nCurrent rubric profile:");
  showRubricBars(persona);

  if (!options.section) {
    // Show available sections and exit
    console.log("\nAvailable sections for refinement:");
    for (const [key, label] of Object.entries(SECTION_LABELS)) {
      console.log(`  ${key.padEnd(16)} ${label}`);
    }
    console.log(
      "\nUse --section <key> to target a specific section for refinement.",
    );
    return;
  }

  // Validate section name
  if (!REFINABLE_SECTIONS.includes(options.section)) {
    console.error(`Unknown section: ${options.section}`);
    console.error(`Available sections: ${REFINABLE_SECTIONS.join(", ")}`);
    process.exit(1);
    return;
  }

  const targetSection = options.section;
  const label = SECTION_LABELS[targetSection];
  console.log(`\nTarget section: ${label ?? targetSection}`);

  // Try to use LLM for interactive refinement
  let client: ReturnType<typeof createClient> | null = null;
  try {
    client = createClient();
  } catch {
    console.log(
      "No API key available. Showing current section for manual editing.\n",
    );
    showSectionContent(persona, targetSection);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // Show current section content
  showSectionContent(persona, targetSection);

  // Get refinement instructions from user
  const instruction = await rl.question(
    "\nDescribe what you want to change in this section:\n> ",
  );
  if (!instruction.trim()) {
    console.log("No refinement instructions provided. Exiting.");
    rl.close();
    return;
  }

  console.log(`\nRefining ${targetSection}...`);

  try {
    const currentContent = JSON.stringify(
      getSection(persona, targetSection),
      null,
      2,
    );

    const refined = await sendMessageForJSON(
      client,
      {
        system: `You are the Persona-x refinement engine. You modify a specific section of a persona definition file based on user instructions.

Rules:
- Use Australian English spelling (behaviour, organisation, licence, humour)
- Only change what the user requested — preserve everything else in the section
- Maintain consistency with the rest of the persona file
- All array fields must have at least one item
- Return the complete refined section as a JSON object

Context about the full persona:
Name: ${persona.metadata.name}
Purpose: ${persona.purpose.description}
Panel role: ${persona.panel_role.contribution_type}
Rubric summary: risk_appetite=${persona.rubric.risk_appetite.score}, evidence_threshold=${persona.rubric.evidence_threshold.score}, tolerance_for_ambiguity=${persona.rubric.tolerance_for_ambiguity.score}, intervention_frequency=${persona.rubric.intervention_frequency.score}, escalation_bias=${persona.rubric.escalation_bias.score}, delivery_vs_rigour_bias=${persona.rubric.delivery_vs_rigour_bias.score}`,
        messages: [
          {
            role: "user",
            content: `Current "${targetSection}" section:
${currentContent}

Refinement instruction: "${instruction}"

Return the complete refined section as a JSON object.`,
          },
        ],
        maxTokens: 2048,
        temperature: 0.5,
      },
      (data) => validateSection(targetSection, data),
    );

    // Apply the refinement
    setSection(persona, targetSection, refined);

    // Bump version
    const bumpType = inferBumpType([targetSection]);
    const newVersion = bumpVersion(persona.metadata.version, bumpType);
    const now = new Date().toISOString().split("T")[0]!;

    persona.metadata.version = newVersion;
    persona.metadata.last_updated = now;

    // Update provenance
    if (persona.provenance) {
      if (!persona.provenance.history) {
        persona.provenance.history = [];
      }
      persona.provenance.history.push({
        version: newVersion,
        date: now,
        author: "Persona-x CLI (refine)",
        changes: [`Refined ${targetSection}: ${instruction.substring(0, 100)}`],
      });
    }

    const outputPath = options.output ?? filePath;
    await writePersonaFile(outputPath, persona);
    console.log(`\nSection "${targetSection}" refined successfully.`);
    console.log(
      `Version bumped: ${result.data.metadata.version} → ${newVersion}`,
    );
    console.log(`Written to: ${outputPath}`);

    // Show updated rubric if that's what changed
    if (targetSection === "rubric") {
      console.log("\nUpdated rubric profile:");
      showRubricBars(persona);
    }
  } catch (err) {
    console.error(`\nFailed to refine ${targetSection}: ${String(err)}`);
    console.log("The original file has not been modified.");
  }

  rl.close();
}

function showRubricBars(persona: PersonaFile): void {
  const r = persona.rubric;
  const dims = [
    { label: "Risk Appetite", score: r.risk_appetite.score },
    { label: "Evidence Threshold", score: r.evidence_threshold.score },
    { label: "Ambiguity Tolerance", score: r.tolerance_for_ambiguity.score },
    { label: "Intervention Freq", score: r.intervention_frequency.score },
    { label: "Escalation Bias", score: r.escalation_bias.score },
    { label: "Delivery vs Rigour", score: r.delivery_vs_rigour_bias.score },
  ];
  for (const dim of dims) {
    const bar = "\u2588".repeat(dim.score) + "\u2591".repeat(10 - dim.score);
    console.log(`  ${dim.label.padEnd(20)} ${bar} ${dim.score}/10`);
  }
}

function showSectionContent(persona: PersonaFile, section: string): void {
  const content = getSection(persona, section);
  if (content) {
    console.log(`\nCurrent ${section}:`);
    console.log(JSON.stringify(content, null, 2));
  }
}

function getSection(persona: PersonaFile, section: string): unknown {
  switch (section) {
    case "purpose":
      return persona.purpose;
    case "bio":
      return persona.bio;
    case "panel_role":
      return persona.panel_role;
    case "rubric":
      return persona.rubric;
    case "reasoning":
      return persona.reasoning;
    case "interaction":
      return persona.interaction;
    case "communication":
      return persona.communication;
    case "boundaries":
      return persona.boundaries;
    case "invocation":
      return persona.invocation;
    default:
      return null;
  }
}

function setSection(
  persona: PersonaFile,
  section: string,
  data: unknown,
): void {
  switch (section) {
    case "purpose":
      persona.purpose = data as PersonaFile["purpose"];
      break;
    case "bio":
      persona.bio = data as PersonaFile["bio"];
      break;
    case "panel_role":
      persona.panel_role = data as PersonaFile["panel_role"];
      break;
    case "rubric":
      persona.rubric = data as PersonaFile["rubric"];
      break;
    case "reasoning":
      persona.reasoning = data as PersonaFile["reasoning"];
      break;
    case "interaction":
      persona.interaction = data as PersonaFile["interaction"];
      break;
    case "communication":
      persona.communication = data as PersonaFile["communication"];
      break;
    case "boundaries":
      persona.boundaries = data as PersonaFile["boundaries"];
      break;
    case "invocation":
      persona.invocation = data as PersonaFile["invocation"];
      break;
  }
}

function validateSection(section: string, data: unknown): unknown {
  switch (section) {
    case "purpose":
      return PersonaPurposeSchema.parse(data);
    case "bio":
      return PersonaBioSchema.parse(data);
    case "panel_role":
      return PanelRoleSchema.parse(data);
    case "rubric":
      return RubricProfileSchema.parse(data);
    case "reasoning":
      return ReasoningTendenciesSchema.parse(data);
    case "interaction":
      return InteractionStyleSchema.parse(data);
    case "communication":
      return CommunicationStyleSchema.parse(data);
    case "boundaries":
      return BoundariesSchema.parse(data);
    case "invocation":
      return InvocationCuesSchema.parse(data);
    default:
      throw new Error(`Unknown section: ${section}`);
  }
}
