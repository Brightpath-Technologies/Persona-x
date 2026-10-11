import type { RubricProfile, RubricDimensionName, RubricScore } from "../schema/rubric.js";
import { RUBRIC_DIMENSIONS, RubricProfileSchema } from "../schema/rubric.js";
import type { UserProfile } from "./schema.js";
import { UserProfileSchema } from "./schema.js";
import type { ParsedArtifact, ArtifactSignal } from "./artifact-parser.js";
import { parseArtifact } from "./artifact-parser.js";
import {
  scoreResponses,
  generateInterpretiveNote,
  PROFILE_QUESTION_BANK,
  type QuestionResponse,
} from "./questionnaire.js";

export interface ProfileBuildInputs {
  name: string;
  identity: {
    background: string;
    experience_domains: string[];
    seniority_level: "early" | "mid" | "senior" | "executive" | "founder";
    context: string;
  };
  goals: {
    primary_goal: string;
    success_definition: string;
    time_horizon: "immediate" | "short_term" | "medium_term" | "long_term";
    sacrifices_acceptable: string[];
  };
  constraints: {
    non_negotiables: string[];
    dependencies: string[];
    resource_limits: string;
  };
  vulnerabilities: {
    known_weaknesses: string[];
    blind_spots: string[];
    patterns: string[];
  };
  questionnaire_responses: QuestionResponse[];
  artifact_texts?: string[];
}

export interface ProfileBuildResult {
  profile: UserProfile;
  warnings: string[];
  artifact_signals: ArtifactSignal[];
  coverage_gaps: RubricDimensionName[];
}

export function mergeRubricWithSignals(
  questionnaire_profile: RubricProfile,
  signals: ArtifactSignal[]
): RubricProfile {
  if (signals.length === 0) return questionnaire_profile;

  const adjustments = new Map<
    RubricDimensionName,
    { total: number; count: number }
  >();

  for (const signal of signals) {
    if (signal.confidence === "low") continue;

    const weight = signal.confidence === "high" ? 1.0 : 0.5;
    const nudge =
      signal.direction === "high"
        ? weight
        : signal.direction === "low"
          ? -weight
          : 0;

    const existing = adjustments.get(signal.dimension) ?? {
      total: 0,
      count: 0,
    };
    existing.total += nudge;
    existing.count += 1;
    adjustments.set(signal.dimension, existing);
  }

  const merged: Record<string, RubricScore> = {};

  for (const dim of RUBRIC_DIMENSIONS) {
    const base = questionnaire_profile[dim];
    const adj = adjustments.get(dim);

    if (adj && adj.count > 0) {
      const avgNudge = adj.total / adj.count;
      const adjusted = Math.max(
        1,
        Math.min(10, Math.round(base.score + avgNudge))
      );
      merged[dim] = {
        score: adjusted,
        note:
          adjusted !== base.score
            ? generateInterpretiveNote(dim, adjusted)
            : base.note,
      };
    } else {
      merged[dim] = { ...base };
    }
  }

  return RubricProfileSchema.parse(merged);
}

export function buildProfile(inputs: ProfileBuildInputs): ProfileBuildResult {
  const warnings: string[] = [];
  let allSignals: ArtifactSignal[] = [];

  const parsedArtifacts: ParsedArtifact[] = [];
  if (inputs.artifact_texts) {
    for (const text of inputs.artifact_texts) {
      const parsed = parseArtifact(text);
      parsedArtifacts.push(parsed);
      allSignals = allSignals.concat(parsed.signals);
    }
  }

  const questionnaireProfile = scoreResponses(
    inputs.questionnaire_responses
  );

  const mergedProfile = mergeRubricWithSignals(
    questionnaireProfile,
    allSignals
  );

  const identity = { ...inputs.identity };
  if (parsedArtifacts.length > 0) {
    const artifactDomains = parsedArtifacts.flatMap(
      (a) => a.identity.experience_domains
    );
    const allDomains = new Set([
      ...identity.experience_domains,
      ...artifactDomains,
    ]);
    identity.experience_domains = Array.from(allDomains);

    if (
      identity.seniority_level === "early" &&
      parsedArtifacts.some(
        (a) =>
          a.identity.seniority_level &&
          a.identity.seniority_level !== "early"
      )
    ) {
      const detected = parsedArtifacts.find(
        (a) => a.identity.seniority_level
      );
      if (detected?.identity.seniority_level) {
        warnings.push(
          `Seniority level from artefact (${detected.identity.seniority_level}) differs from provided (${identity.seniority_level}). Using provided value.`
        );
      }
    }
  }

  const now = new Date().toISOString().split("T")[0]!;
  const sources = ["questionnaire"];
  if (parsedArtifacts.length > 0) {
    sources.push(
      ...parsedArtifacts.map((a) => `artifact:${a.type}`)
    );
  }

  const profile: UserProfile = UserProfileSchema.parse({
    metadata: {
      name: inputs.name,
      created_at: now,
      last_updated: now,
      version: "1.0.0",
    },
    identity,
    goals: inputs.goals,
    risk_profile: mergedProfile,
    constraints: inputs.constraints,
    vulnerabilities: inputs.vulnerabilities,
    provenance: {
      sources,
      questionnaire_version: "1.0.0",
    },
  });

  const coverageGaps = checkDimensionCoverage(
    inputs.questionnaire_responses,
    allSignals
  );
  if (coverageGaps.length > 0) {
    warnings.push(
      `Limited data for dimensions: ${coverageGaps.join(", ")}. Scores default to moderate (5).`
    );
  }

  return {
    profile,
    warnings,
    artifact_signals: allSignals,
    coverage_gaps: coverageGaps,
  };
}

function checkDimensionCoverage(
  responses: QuestionResponse[],
  signals: ArtifactSignal[]
): RubricDimensionName[] {
  const covered = new Set<RubricDimensionName>();

  for (const response of responses) {
    const question = PROFILE_QUESTION_BANK.find(
      (q) => q.id === response.question_id
    );
    if (question) {
      for (const dim of question.targets) {
        covered.add(dim);
      }
    }
  }

  for (const signal of signals) {
    covered.add(signal.dimension);
  }

  return RUBRIC_DIMENSIONS.filter((dim) => !covered.has(dim));
}
