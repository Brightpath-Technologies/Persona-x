import type { UserProfile } from "@persona-x/profile/schema.js";
import type { LoadedPersona } from "@persona-x/runtime/interface.js";
import { buildAdvocatePersona } from "@persona-x/advocate/advocate-builder.js";
import type { CaseContext } from "@persona-x/advocate/case-builder.js";
import type { WebUserProfile } from "./types";
import type { PersonaProfile } from "./types";

function toFrameworkProfile(web: WebUserProfile): UserProfile {
  const now = new Date().toISOString().split("T")[0]!;
  return {
    metadata: {
      name: web.name,
      created_at: web.completedAt,
      last_updated: now,
      version: "1.0.0",
    },
    identity: {
      background: web.background,
      experience_domains: web.experienceDomains,
      seniority_level: web.seniorityLevel,
      context: web.context,
    },
    goals: {
      primary_goal: web.primaryGoal,
      success_definition: web.successDefinition,
      time_horizon: web.timeHorizon,
      sacrifices_acceptable: web.sacrificesAcceptable,
    },
    risk_profile: {
      risk_appetite: web.rubric.risk_appetite,
      evidence_threshold: web.rubric.evidence_threshold,
      tolerance_for_ambiguity: web.rubric.tolerance_for_ambiguity,
      intervention_frequency: web.rubric.intervention_frequency,
      escalation_bias: web.rubric.escalation_bias,
      delivery_vs_rigour_bias: web.rubric.delivery_vs_rigour_bias,
    },
    constraints: {
      non_negotiables: web.nonNegotiables.length > 0 ? web.nonNegotiables : ["Maintain core goal integrity"],
      dependencies: web.dependencies.length > 0 ? web.dependencies : [],
      resource_limits: web.resourceLimits || "Not specified",
    },
    vulnerabilities: {
      known_weaknesses: web.knownWeaknesses.length > 0 ? web.knownWeaknesses : ["Not specified"],
      blind_spots: web.blindSpots,
      patterns: web.patterns,
    },
    provenance: {
      sources: ["web-profile-assessment"],
      questionnaire_version: "1.0.0",
    },
  };
}

export function generateAdvocatePersona(
  webProfile: WebUserProfile,
  decision: string
): LoadedPersona {
  const userProfile = toFrameworkProfile(webProfile);
  const caseContext: CaseContext = {
    decision_topic: decision,
    user_position: decision,
  };

  const advocate = buildAdvocatePersona({
    user_profile: userProfile,
    case_context: caseContext,
  });

  return {
    id: "advocate",
    file: advocate.persona,
    active: true,
  };
}

export function advocateToProfile(persona: LoadedPersona): PersonaProfile {
  return {
    id: persona.id,
    name: persona.file.metadata.name,
    role: persona.file.purpose.description,
    contributionType: persona.file.panel_role.contribution_type,
    rubric: {
      risk_appetite: persona.file.rubric.risk_appetite,
      evidence_threshold: persona.file.rubric.evidence_threshold,
      tolerance_for_ambiguity: persona.file.rubric.tolerance_for_ambiguity,
      intervention_frequency: persona.file.rubric.intervention_frequency,
      escalation_bias: persona.file.rubric.escalation_bias,
      delivery_vs_rigour_bias: persona.file.rubric.delivery_vs_rigour_bias,
    },
  };
}
