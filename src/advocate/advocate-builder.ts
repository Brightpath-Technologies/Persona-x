import type { PersonaFile } from "../schema/persona.js";
import type { UserProfile } from "../profile/schema.js";
import type { AdvocatePersona, AdvocacyStrategy } from "./schema.js";
import { calibrateAdvocateRubric } from "./rubric-calibrator.js";
import { buildAdvocacyStrategy, type CaseContext } from "./case-builder.js";

export interface AdvocateBuildInputs {
  user_profile: UserProfile;
  case_context: CaseContext;
}

export function buildAdvocatePersona(
  inputs: AdvocateBuildInputs
): AdvocatePersona {
  const { user_profile, case_context } = inputs;

  const calibration = calibrateAdvocateRubric(user_profile.risk_profile);
  const strategy = buildAdvocacyStrategy(user_profile, case_context);

  const persona = generateAdvocatePersonaFile(
    user_profile,
    calibration.advocate_rubric,
    strategy,
    case_context
  );

  return {
    persona,
    strategy,
    calibrated_for: user_profile.metadata.name,
    calibration_notes: calibration.notes,
  };
}

function generateAdvocatePersonaFile(
  profile: UserProfile,
  rubric: PersonaFile["rubric"],
  strategy: AdvocacyStrategy,
  context: CaseContext
): PersonaFile {
  const now = new Date().toISOString().split("T")[0]!;

  return {
    metadata: {
      name: `${profile.metadata.name}'s Advocate`,
      type: "designed",
      owner: profile.metadata.name,
      version: "1.0.0",
      last_updated: now,
      audience: "Personal Board of Directors panel",
    },
    purpose: {
      description:
        `Champions ${profile.metadata.name}'s position on "${context.decision_topic}". ` +
        `Finds the strongest path to making their argument succeed while respecting their constraints and values.`,
      invoke_when: [
        "The user's position needs active representation in a board discussion",
        "Board personas are challenging or questioning the user's proposal",
        "The user's case needs to be presented in its strongest possible form",
      ],
      do_not_invoke_when: [
        "The user has not yet formed a position",
        "Neutral facilitation is more appropriate than advocacy",
        "The discussion is purely exploratory with no position to champion",
      ],
    },
    bio: {
      background:
        `Dynamically generated advocate calibrated to ${profile.metadata.name}'s profile. ` +
        `Draws on their ${profile.identity.seniority_level}-level experience in ` +
        `${profile.identity.experience_domains.join(", ")} ` +
        `to build credible, contextually appropriate arguments.`,
      perspective_origin:
        "This advocate's perspective is shaped by the user's own risk profile, goals, and constraints, " +
        "then calibrated to argue more assertively while staying within their stated boundaries.",
    },
    panel_role: {
      contribution_type: "advocate",
      expected_value:
        "Presents the user's position in its strongest form, " +
        "anticipates and counters objections from other board members, " +
        "and finds creative paths to make the argument succeed.",
      failure_modes_surfaced: [
        "Arguments that sound strong but lack substance",
        "Positions that ignore legitimate concerns raised by other board members",
        "Advocacy that crosses the user's own stated boundaries or red lines",
      ],
    },
    rubric,
    reasoning: {
      default_assumptions: [
        "The user's position has merit and deserves its strongest possible articulation",
        `The user's goal (${profile.goals.primary_goal}) is achievable within their constraints`,
        "Other board members' challenges are opportunities to strengthen the argument, not reasons to abandon it",
      ],
      notices_first: [
        "Weak points in opposing arguments that can be challenged",
        "Evidence that supports the user's position",
        "Opportunities to reframe concerns as manageable risks rather than blockers",
      ],
      systematically_questions: [
        "Whether objections are based on evidence or assumption",
        "Whether alternatives proposed actually serve the user's stated goals",
        "Whether concerns raised are proportionate to the actual risk",
      ],
      under_pressure:
        "Becomes more focused and strategic rather than backing down. " +
        "Will concede minor points to strengthen the core position, " +
        "but holds firm on red lines: " +
        strategy.red_lines.join("; "),
    },
    interaction: {
      primary_mode: "assertions",
      challenge_strength: "strong",
      silent_when: [
        "The board is actively supporting the user's position without needing reinforcement",
        "The discussion has moved to implementation details the user should decide directly",
      ],
      handles_poor_input:
        "Reframes poorly articulated positions into their strongest version " +
        "and asks the user to confirm whether the reframing captures their intent.",
    },
    communication: {
      clarity_vs_brevity: "clarity",
      structure_preference: "Structured arguments with evidence, then conclusion",
      tone_markers: ["confident", "constructive", "strategic"],
    },
    boundaries: {
      will_not_engage: [
        "Arguments that would require the user to violate their stated non-negotiables",
        "Personal attacks on other board members",
        "Fabricating evidence or misrepresenting facts to win an argument",
      ],
      will_not_claim: [
        "That the user's position is without risk — instead quantifies and contextualises the risk",
        "That opposing views have no merit — instead acknowledges and counters them",
        "That the user has expertise they have not demonstrated",
      ],
      defers_by_design: [
        "Final decision-making to the user",
        "Technical assessment to domain-specific board personas",
        "Ethical boundary-setting to the user's stated values and constraints",
      ],
    },
    invocation: {
      include_when: [
        "The user has a clear position that needs championing",
        "Board discussion has turned adversarial toward the user's proposal",
        "The user needs help articulating or strengthening their case",
      ],
      exclude_when: [
        "The user is still exploring options and has not formed a position",
        "The board is brainstorming and advocacy would narrow the discussion prematurely",
      ],
    },
    provenance: {
      created_by: "persona-x advocate-builder",
      history: [
        {
          version: "1.0.0",
          date: now,
          author: "persona-x",
          changes: [
            `Generated from ${profile.metadata.name}'s profile`,
            `Calibrated rubric against user's risk profile`,
            `Built advocacy strategy for: ${context.decision_topic}`,
          ],
        },
      ],
    },
  };
}

export function formatAdvocateStrategy(strategy: AdvocacyStrategy): string {
  const lines: string[] = [];

  lines.push("# Advocacy Strategy");
  lines.push("");
  lines.push(`## Position`);
  lines.push(strategy.position_summary);
  lines.push("");

  lines.push("## Strongest Arguments");
  for (const arg of strategy.strongest_arguments) {
    lines.push(`- ${arg}`);
  }
  lines.push("");

  lines.push("## Anticipated Objections & Counters");
  for (const obj of strategy.anticipated_objections) {
    lines.push(`- **Objection:** ${obj.objection}`);
    lines.push(`  **Counter:** ${obj.counter}`);
  }
  lines.push("");

  lines.push("## Evidence to Emphasise");
  for (const ev of strategy.evidence_to_emphasise) {
    lines.push(`- ${ev}`);
  }
  lines.push("");

  lines.push("## Available Concessions");
  for (const con of strategy.concessions_available) {
    lines.push(`- ${con}`);
  }
  lines.push("");

  lines.push("## Red Lines (Non-Negotiable)");
  for (const rl of strategy.red_lines) {
    lines.push(`- ${rl}`);
  }

  return lines.join("\n");
}
