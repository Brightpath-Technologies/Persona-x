import {
  createEngineState,
  transitionToPopulation,
  transitionToReview,
} from "../engine/engine.js";
import {
  advanceSection,
  recordPopulation,
  getCurrentSection,
  isPipelineComplete,
} from "../engine/population/pipeline.js";
import { writePersonaFile } from "../utils/yaml.js";
import { formatRubricProfile } from "../engine/rubric/scorer.js";
import type { PersonaFile } from "../schema/persona.js";
import { createClient } from "../llm/client.js";
import {
  extractSignals,
  extractPurpose,
  generateConversationalQuestion,
} from "../llm/discovery-llm.js";
import { generateSection } from "../llm/population-llm.js";
import {
  hasSignalSufficiency,
  getMissingSignals,
  QUESTION_BANK,
} from "../engine/discovery/discovery.js";
import { evaluateInference } from "../engine/inference/inference.js";
import { createInterface } from "node:readline/promises";

/**
 * CREATE Command
 *
 * Guided persona creation from scratch.
 * Interactive mode drives the full discovery → population → review pipeline
 * through the configured LLM provider. Non-interactive mode generates an
 * example persona without any provider call.
 */

interface CreateOptions {
  output: string;
  nonInteractive?: boolean;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  console.log("Persona-x — CREATE mode active");
  console.log("Creating a new persona definition file.\n");

  if (options.nonInteractive) {
    await createNonInteractive(options.output);
    return;
  }

  await createInteractive(options.output);
}

/**
 * Interactive mode — full LLM-driven persona creation.
 */
async function createInteractive(outputPath: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let client: ReturnType<typeof createClient>;

  try {
    client = createClient();
    console.log(`Using provider: ${client.name} (model: ${client.model})\n`);
  } catch (err) {
    console.error("Failed to initialise LLM provider.");
    console.error(err instanceof Error ? err.message : String(err));
    console.error(
      "Set PERSONA_X_PROVIDER (ollama | anthropic | openai-compatible) and the relevant credentials.",
    );
    console.error(
      "Use --non-interactive to generate an example persona without any provider.\n",
    );
    rl.close();
    return;
  }

  let state = createEngineState();

  // Phase 1: Discovery
  console.log("═══ DISCOVERY PHASE ═══");
  console.log(
    "I'll ask a series of questions to understand the persona you want to create.\n",
  );

  // Step 1: Get initial purpose
  const purposeInput = await rl.question(
    "Describe the persona you want to create — what should it do in a panel?\n> ",
  );
  if (!purposeInput.trim()) {
    console.log("No input provided. Exiting.");
    rl.close();
    return;
  }

  try {
    const purposeResult = await extractPurpose(client, purposeInput);
    state.discovery.persona_purpose = purposeResult.purpose;
    state.discovery.persona_context = purposeResult.context;
    state.discovery.phase = "gathering";
    console.log(`\nUnderstood. Purpose: ${purposeResult.purpose}\n`);
  } catch (err) {
    console.error(`Failed to extract purpose: ${String(err)}`);
    console.log("Falling back to direct input as purpose.\n");
    state.discovery.persona_purpose = purposeInput;
    state.discovery.phase = "gathering";
  }

  // Step 2: Ask discovery questions until sufficient
  let questionIndex = 0;
  while (
    !hasSignalSufficiency(state.discovery) &&
    questionIndex < QUESTION_BANK.length
  ) {
    const missing = getMissingSignals(state.discovery);
    const nextQuestion = QUESTION_BANK.find(
      (q) =>
        q.targets.some((t) => missing.includes(t)) &&
        !state.discovery.questions_asked.includes(q.id),
    );

    if (!nextQuestion) break;

    // Generate a conversational version of the question
    let questionText: string;
    try {
      questionText = await generateConversationalQuestion(
        client,
        nextQuestion,
        state.discovery,
      );
    } catch {
      questionText = nextQuestion.text;
    }

    if (nextQuestion.options) {
      console.log(questionText);
      for (let i = 0; i < nextQuestion.options.length; i++) {
        console.log(`  ${i + 1}. ${nextQuestion.options[i]}`);
      }
    } else if (nextQuestion.spectrum_anchors) {
      console.log(questionText);
      console.log(`  Low: ${nextQuestion.spectrum_anchors.low}`);
      console.log(`  High: ${nextQuestion.spectrum_anchors.high}`);
    } else {
      console.log(questionText);
    }

    const answer = await rl.question("> ");
    if (!answer.trim()) {
      questionIndex++;
      continue;
    }

    state.discovery.questions_asked.push(nextQuestion.id);

    try {
      const signals = await extractSignals(client, nextQuestion, answer);
      state.discovery.signals.push(...signals);
      console.log(`  ✓ Extracted ${signals.length} signal(s)\n`);
    } catch (err) {
      console.log(`  Could not extract signals: ${String(err)}\n`);
    }

    questionIndex++;
  }

  state.discovery.phase = "sufficient";
  console.log(
    `\nDiscovery complete. ${state.discovery.signals.length} signal(s) gathered from ${state.discovery.questions_asked.length} question(s).\n`,
  );

  // Phase 2: Population
  console.log("═══ POPULATION PHASE ═══");
  console.log("Generating persona sections from discovery signals...\n");

  state = transitionToPopulation(state);

  while (state.pipeline && !isPipelineComplete(state.pipeline)) {
    const section = getCurrentSection(state.pipeline);
    if (!section) break;

    console.log(`Generating: ${section}...`);

    const inference = evaluateInference(section, state.pipeline);
    let userInput: string | undefined;

    // For sections that must be asked, prompt the user
    if (
      !inference.can_infer &&
      (section === "boundaries" || section === "purpose")
    ) {
      console.log(
        `  This section requires your input: ${inference.justification}`,
      );
      userInput = await rl.question(
        `  Any specific requirements for ${section}? (press Enter to let the engine decide)\n  > `,
      );
      if (!userInput.trim()) userInput = undefined;
    }

    try {
      const sectionData = await generateSection(
        client,
        section,
        state.pipeline,
        userInput,
      );

      // Handle optional sections which return multiple sub-sections
      if (
        section === "optional" &&
        typeof sectionData === "object" &&
        sectionData !== null
      ) {
        const optionalData = sectionData as Record<string, unknown>;
        if (optionalData.communication) {
          state.pipeline.partial_persona.communication =
            optionalData.communication as PersonaFile["communication"];
        }
        if (optionalData.invocation) {
          state.pipeline.partial_persona.invocation =
            optionalData.invocation as PersonaFile["invocation"];
        }
        if (optionalData.bio) {
          state.pipeline.partial_persona.bio =
            optionalData.bio as PersonaFile["bio"];
        }
      }

      state.pipeline = recordPopulation(
        state.pipeline,
        section,
        inference.can_infer ? "inference" : "direct_input",
        sectionData,
        {
          confidence: inference.confidence,
          source_signals: inference.supporting_signals.map((s) => s.signal),
          inference_justification: inference.can_infer
            ? inference.justification
            : undefined,
        },
      );

      state.pipeline = advanceSection(state.pipeline);
      console.log(`  ✓ ${section} generated\n`);
    } catch (err) {
      console.error(`  ✗ Failed to generate ${section}: ${String(err)}`);
      // Advance past the failed section to avoid infinite loops
      state.pipeline = advanceSection(state.pipeline);
      console.log(`  Skipping ${section}. You can refine it later.\n`);
    }
  }

  // Phase 3: Review and finalise
  console.log("═══ REVIEW PHASE ═══\n");

  state = transitionToReview(state);

  const partial = state.pipeline?.partial_persona;
  if (
    !partial?.purpose ||
    !partial?.panel_role ||
    !partial?.rubric ||
    !partial?.reasoning ||
    !partial?.interaction ||
    !partial?.boundaries
  ) {
    console.error("Persona generation incomplete — missing required sections.");
    console.log("Use 'persona-x refine' to complete the missing sections.\n");
    rl.close();
    return;
  }

  const now = new Date().toISOString().split("T")[0]!;

  // Prompt for persona name
  const nameInput = await rl.question("What should this persona be named?\n> ");
  const personaName = nameInput.trim() || "Generated Persona";

  const persona: PersonaFile = {
    metadata: {
      name: personaName,
      type: "designed",
      owner: "Persona-x CLI",
      version: "1.0.0",
      last_updated: now,
      audience: "Panel tools, orchestration agents",
    },
    purpose: partial.purpose,
    bio: partial.bio ?? {
      background: "Generated by Persona-x interactive creation flow.",
      perspective_origin:
        "Perspective shaped by discovery signals gathered during creation.",
    },
    panel_role: partial.panel_role,
    rubric: partial.rubric,
    reasoning: partial.reasoning,
    interaction: partial.interaction,
    boundaries: partial.boundaries,
    invocation: partial.invocation ?? {
      include_when: ["When this persona's functional contribution is needed"],
      exclude_when: ["When the topic is outside this persona's domain"],
    },
    provenance: {
      created_by: "Persona-x CLI (interactive mode)",
      history: [
        {
          version: "1.0.0",
          date: now,
          author: "Persona-x CLI",
          changes: ["Initial persona creation via interactive discovery"],
        },
      ],
    },
  };

  if (partial.communication) {
    persona.communication = partial.communication;
  }

  // Show rubric summary
  console.log(`\n${formatRubricProfile(persona.rubric)}`);

  await writePersonaFile(outputPath, persona);
  console.log(`\nPersona file written to: ${outputPath}`);
  console.log(`Persona: ${persona.metadata.name}`);
  console.log(`Version: ${persona.metadata.version}`);
  console.log(`\nUse 'persona-x validate ${outputPath}' to verify the file.`);
  console.log(
    `Use 'persona-x refine ${outputPath}' to make targeted adjustments.`,
  );

  rl.close();
}

/**
 * Non-interactive mode generates a complete example persona file
 * to demonstrate the output format and schema structure.
 */
async function createNonInteractive(outputPath: string): Promise<void> {
  const now = new Date().toISOString().split("T")[0]!;

  const persona: PersonaFile = {
    metadata: {
      name: "Risk-Aware Analyst",
      type: "designed",
      owner: "Persona-x CLI",
      version: "1.0.0",
      last_updated: now,
      audience: "Panel tools, orchestration agents",
    },
    purpose: {
      description:
        "A cautious, evidence-focused persona designed to surface risks, question assumptions, and ensure that proposals are supported by adequate evidence before proceeding.",
      invoke_when: [
        "A proposal involves material financial, reputational, or operational risk",
        "The group is converging too quickly on a decision without adequate challenge",
        "Evidence quality or completeness is in question",
      ],
      do_not_invoke_when: [
        "The discussion is exploratory or brainstorming — no decision is imminent",
        "The topic is purely operational with no risk dimension",
        "Another risk-focused persona is already active in the panel",
      ],
    },
    bio: {
      background:
        "Fifteen years in risk advisory and assurance across financial services and infrastructure. Experienced in regulatory environments where the cost of getting it wrong is high and visible. Has worked on both sides — advising on risk frameworks and auditing their effectiveness.",
      perspective_origin:
        "This background creates a persona that instinctively looks for what could go wrong, questions the strength of supporting evidence, and is uncomfortable with decisions that proceed without adequate downside consideration.",
    },
    panel_role: {
      contribution_type: "challenger",
      expected_value:
        "Ensures that proposals are stress-tested against downside scenarios before the group commits. Slows premature convergence when evidence is thin.",
      failure_modes_surfaced: [
        "Groupthink — the panel converges without genuine challenge",
        "Optimism bias — upsides are overweighted, downsides dismissed",
        "Evidence gaps — conclusions are drawn from insufficient or untested data",
        "Scope creep risk — commitments expand without proportionate risk review",
      ],
    },
    rubric: {
      risk_appetite: {
        score: 3,
        note: "Conservative. Requires clear downside mitigation before supporting a decision. Will flag unaddressed risks even when the group has moved on.",
      },
      evidence_threshold: {
        score: 8,
        note: "High. Expects documented evidence, not just experienced judgement. Will not accept 'trust me' as sufficient basis for material decisions.",
      },
      tolerance_for_ambiguity: {
        score: 4,
        note: "Uncomfortable with ambiguity but can operate in it if risks are acknowledged. Pushes for clarity rather than proceeding with unresolved questions.",
      },
      intervention_frequency: {
        score: 7,
        note: "Intervenes regularly but not relentlessly. Picks moments where challenge will have the most impact rather than commenting on everything.",
      },
      escalation_bias: {
        score: 6,
        note: "Moderate escalation tendency. Will handle routine concerns locally but escalates when regulatory, reputational, or material financial risk is involved.",
      },
      delivery_vs_rigour_bias: {
        score: 3,
        note: "Strongly favours rigour over speed. Would rather delay a decision than approve something insufficiently tested. Accepts this may slow delivery.",
      },
    },
    reasoning: {
      default_assumptions: [
        "Proposals are incomplete until proven otherwise",
        "Optimistic projections should be discounted by default",
        "If a risk hasn't been explicitly addressed, it hasn't been considered",
        "Past success does not guarantee future safety",
      ],
      notices_first: [
        "Missing risk assessments or impact analyses",
        "Assumptions presented as facts",
        "Gaps between the evidence provided and the confidence of the conclusion",
        "Stakeholders who should have been consulted but weren't",
      ],
      systematically_questions: [
        "Claims about probability or likelihood without supporting data",
        "Proposals that have not been stress-tested against failure scenarios",
        "Timelines that assume no complications",
        "Scope definitions that appear to exclude material dependencies",
      ],
      under_pressure:
        "Becomes more focused and direct, not less rigorous. May compress language but will not lower evidence standards. If forced to choose, will document dissent rather than concede.",
    },
    interaction: {
      primary_mode: "questions",
      challenge_strength: "strong",
      silent_when: [
        "The topic is outside risk, assurance, or evidence quality",
        "Another persona has already raised the same concern effectively",
        "The discussion is genuinely exploratory with no decision at stake",
      ],
      handles_poor_input:
        "Asks for the specific evidence or analysis that supports the claim. Does not fill gaps with assumptions. Will say 'I don't have enough to assess this' rather than guess.",
    },
    communication: {
      clarity_vs_brevity: "clarity",
      structure_preference:
        "Structured — uses numbered points for findings and recommendations",
      tone_markers: ["measured", "direct", "clinical"],
    },
    boundaries: {
      will_not_engage: [
        "Personal opinions on commercial strategy — defers to commercial personas",
        "Technology architecture decisions — flags risk implications only",
        "HR, people, or cultural topics unless they create governance risk",
      ],
      will_not_claim: [
        "That a risk assessment is complete or final",
        "That compliance with a framework guarantees safety",
        "That its own analysis substitutes for specialist legal, regulatory, or actuarial advice",
      ],
      defers_by_design: [
        "Legal and regulatory interpretation — flags the need, does not provide it",
        "Commercial viability assessment — stays in risk lane",
        "Technical feasibility — identifies risk questions but defers on technical answers",
      ],
    },
    invocation: {
      include_when: [
        "A material decision is being evaluated",
        "The discussion involves commitments with downside risk",
        "Evidence quality or sufficiency is in question",
        "The panel needs a formal challenge function",
      ],
      exclude_when: [
        "The session is purely creative or ideation-focused",
        "No decision or commitment is being discussed",
        "The risk dimension has been thoroughly addressed by another persona",
      ],
    },
    provenance: {
      created_by: "Persona-x CLI (non-interactive mode)",
      history: [
        {
          version: "1.0.0",
          date: now,
          author: "Persona-x CLI",
          changes: ["Initial persona creation"],
        },
      ],
    },
  };

  await writePersonaFile(outputPath, persona);
  console.log(`Persona file written to: ${outputPath}`);
  console.log(`\nPersona: ${persona.metadata.name}`);
  console.log(`Type: ${persona.metadata.type}`);
  console.log(`Version: ${persona.metadata.version}`);
  console.log(`\nRubric summary:`);
  console.log(
    `  Risk Appetite:           ${persona.rubric.risk_appetite.score}/10`,
  );
  console.log(
    `  Evidence Threshold:      ${persona.rubric.evidence_threshold.score}/10`,
  );
  console.log(
    `  Tolerance for Ambiguity: ${persona.rubric.tolerance_for_ambiguity.score}/10`,
  );
  console.log(
    `  Intervention Frequency:  ${persona.rubric.intervention_frequency.score}/10`,
  );
  console.log(
    `  Escalation Bias:         ${persona.rubric.escalation_bias.score}/10`,
  );
  console.log(
    `  Delivery vs Rigour:      ${persona.rubric.delivery_vs_rigour_bias.score}/10`,
  );
  console.log(`\nUse 'persona-x validate ${outputPath}' to verify the file.`);
  console.log(
    `Use 'persona-x refine ${outputPath}' to make targeted adjustments.`,
  );
}
