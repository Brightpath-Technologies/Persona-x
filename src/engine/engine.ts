import type { PersonaFile } from "../schema/persona.js";
import type { DiscoveryState } from "./discovery/discovery.js";
import type { PipelineState } from "./population/pipeline.js";
import {
  createDiscoveryState,
  hasSignalSufficiency,
  getMissingSignals,
  QUESTION_BANK,
} from "./discovery/discovery.js";
import {
  createPipelineState,
  getCurrentSection,
  generateBuildTrace,
} from "./population/pipeline.js";
import { evaluateInference } from "./inference/inference.js";
import { formatRubricProfile } from "./rubric/scorer.js";

/**
 * Persona Engine — Main Orchestrator
 *
 * Coordinates the end-to-end persona creation process:
 * 1. Discovery phase — extract signals from user
 * 2. Population phase — build persona file section by section
 * 3. Validation — ensure the file is complete and coherent
 *
 * The engine is designed to be driven by an external interface (CLI or web)
 * that handles user interaction. The engine provides the logic and state management.
 */

export type EnginePhase = "discovery" | "population" | "review" | "complete";

export interface EngineState {
  phase: EnginePhase;
  discovery: DiscoveryState;
  pipeline: PipelineState | null;
  persona: PersonaFile | null;
  build_trace: string | null;
}

export interface EngineAction {
  type:
    | "ask_user"
    | "present_choice"
    | "infer_and_confirm"
    | "generate_section"
    | "present_file";
  payload: unknown;
}

/**
 * Create a fresh engine state for a new persona creation session.
 */
export function createEngineState(): EngineState {
  return {
    phase: "discovery",
    discovery: createDiscoveryState(),
    pipeline: null,
    persona: null,
    build_trace: null,
  };
}

/**
 * Determine the next action the engine needs from the interface.
 * This is the main decision loop that drives the CREATE flow.
 */
export function getNextAction(state: EngineState): EngineAction {
  switch (state.phase) {
    case "discovery": {
      // Check if we have enough signals
      if (hasSignalSufficiency(state.discovery)) {
        return {
          type: "present_choice",
          payload: {
            message:
              "I have enough signal to generate a persona file. Shall I proceed, or do you want to add more detail?",
            options: ["Proceed to generation", "Add more detail"],
          },
        };
      }

      // Find missing signals and select the next question
      const missing = getMissingSignals(state.discovery);
      const nextQuestion = QUESTION_BANK.find((q) =>
        q.targets.some((t) => missing.includes(t)),
      );

      if (nextQuestion) {
        return {
          type: "ask_user",
          payload: nextQuestion,
        };
      }

      // If no targeted question available, ask an open-ended one
      return {
        type: "ask_user",
        payload: {
          id: "open_ended",
          type: "scenario",
          text: "Describe a situation where this persona would be most valuable in a panel discussion.",
          targets: missing,
        },
      };
    }

    case "population": {
      if (!state.pipeline) {
        return {
          type: "generate_section",
          payload: { section: "initialise_pipeline" },
        };
      }

      const currentSection = getCurrentSection(state.pipeline);
      if (!currentSection) {
        return {
          type: "present_file",
          payload: {
            message: "All sections populated. Generating final persona file.",
          },
        };
      }

      // Evaluate whether we can infer or must ask
      const inference = evaluateInference(currentSection, state.pipeline);

      if (inference.can_infer) {
        return {
          type: "infer_and_confirm",
          payload: {
            section: currentSection,
            confidence: inference.confidence,
            justification: inference.justification,
          },
        };
      }

      return {
        type: "ask_user",
        payload: {
          section: currentSection,
          message: `I need your input for ${currentSection}. ${inference.justification}`,
        },
      };
    }

    case "review": {
      return {
        type: "present_file",
        payload: {
          message:
            "Here is the complete persona file for your review. You can accept it or refine specific sections.",
        },
      };
    }

    case "complete": {
      return {
        type: "present_file",
        payload: { message: "Persona file is finalised." },
      };
    }
  }
}

/**
 * Transition the engine from discovery to population phase.
 */
export function transitionToPopulation(state: EngineState): EngineState {
  return {
    ...state,
    phase: "population",
    pipeline: createPipelineState(state.discovery),
  };
}

/**
 * Transition to review phase once all sections are populated.
 */
export function transitionToReview(state: EngineState): EngineState {
  const trace = state.pipeline ? generateBuildTrace(state.pipeline) : null;
  return {
    ...state,
    phase: "review",
    build_trace: trace,
  };
}

/**
 * Generate a summary of the rubric profile for display.
 */
export function getRubricSummary(state: EngineState): string | null {
  if (!state.pipeline?.partial_persona.rubric) return null;
  return formatRubricProfile(
    state.pipeline.partial_persona
      .rubric as import("../schema/rubric.js").RubricProfile,
  );
}
