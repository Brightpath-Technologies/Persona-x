import {
  RUBRIC_DIMENSIONS,
  type RubricDimensionName,
  type RubricProfile,
  type RubricScore,
  RubricProfileSchema,
} from "../schema/rubric.js";
import { generateInterpretiveNote } from "../profile/questionnaire.js";

export interface CalibrationResult {
  advocate_rubric: RubricProfile;
  notes: string[];
}

const COMPLEMENTARY_RULES: Record<
  RubricDimensionName,
  (userScore: number) => { target: number; note: string }
> = {
  risk_appetite: (s) => {
    if (s <= 3) {
      return {
        target: Math.min(s + 3, 8),
        note: "Advocate pushes toward bolder positions to counterbalance user's caution",
      };
    }
    if (s >= 8) {
      return {
        target: s,
        note: "Advocate matches user's bold stance and argues for maximum ambition",
      };
    }
    return {
      target: Math.min(s + 2, 9),
      note: "Advocate leans slightly more aggressive to find the strongest position",
    };
  },
  evidence_threshold: (s) => {
    if (s >= 8) {
      return {
        target: s,
        note: "Advocate maintains high evidence standards to build credible arguments",
      };
    }
    if (s <= 3) {
      return {
        target: Math.min(s + 2, 6),
        note: "Advocate adds more evidentiary rigour to strengthen the case",
      };
    }
    return {
      target: s,
      note: "Advocate matches user's evidence expectations for aligned argumentation",
    };
  },
  tolerance_for_ambiguity: (s) => {
    if (s <= 3) {
      return {
        target: Math.min(s + 3, 7),
        note: "Advocate operates with more flexibility to find creative argument paths",
      };
    }
    return {
      target: Math.max(s - 1, 4),
      note: "Advocate brings slightly more precision to sharpen arguments",
    };
  },
  intervention_frequency: (_s) => {
    return {
      target: 8,
      note: "Advocate is inherently high-intervention — it must actively champion the case",
    };
  },
  escalation_bias: (s) => {
    if (s >= 7) {
      return {
        target: s,
        note: "Advocate escalates aligned with user's governance expectations",
      };
    }
    return {
      target: Math.min(s + 2, 7),
      note: "Advocate escalates more readily to ensure the user's position gets heard at the right level",
    };
  },
  delivery_vs_rigour_bias: (s) => {
    if (s >= 7) {
      return {
        target: s,
        note: "Advocate matches user's delivery orientation to push for action",
      };
    }
    if (s <= 3) {
      return {
        target: Math.min(s + 2, 6),
        note: "Advocate adds delivery pressure to ensure arguments lead to outcomes",
      };
    }
    return {
      target: Math.min(s + 1, 8),
      note: "Advocate biases slightly toward action to keep momentum for the user's case",
    };
  },
};

export function calibrateAdvocateRubric(
  userProfile: RubricProfile
): CalibrationResult {
  const notes: string[] = [];
  const advocateScores: Record<string, RubricScore> = {};

  for (const dim of RUBRIC_DIMENSIONS) {
    const userScore = userProfile[dim].score;
    const rule = COMPLEMENTARY_RULES[dim];
    const result = rule(userScore);

    const clamped = Math.max(1, Math.min(10, result.target));
    advocateScores[dim] = {
      score: clamped,
      note: generateInterpretiveNote(dim, clamped),
    };

    notes.push(
      `${dim}: user=${userScore} → advocate=${clamped} (${result.note})`
    );
  }

  return {
    advocate_rubric: RubricProfileSchema.parse(advocateScores),
    notes,
  };
}
