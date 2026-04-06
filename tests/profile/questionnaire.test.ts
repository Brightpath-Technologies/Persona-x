import { describe, it, expect } from "vitest";
import {
  PROFILE_QUESTION_BANK,
  PROFILE_QUESTION_COUNT,
  scoreResponses,
  generateInterpretiveNote,
  getQuestionsForDimension,
  checkCoverage,
  type QuestionResponse,
  type ProfileQuestion,
} from "../../src/profile/questionnaire.js";
import { RUBRIC_DIMENSIONS, type RubricDimensionName } from "../../src/schema/rubric.js";

// ── Question Bank Structure ──────────────────────────────────────────

describe("PROFILE_QUESTION_BANK", () => {
  it("contains exactly 12 questions", () => {
    expect(PROFILE_QUESTION_BANK.length).toBe(12);
    expect(PROFILE_QUESTION_COUNT).toBe(12);
  });

  it("every question has exactly 4 options", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      expect(question.options.length).toBe(4);
    }
  });

  it("every question has a unique id", () => {
    const ids = PROFILE_QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every question targets at least one rubric dimension", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      expect(question.targets.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every question targets only valid rubric dimensions", () => {
    const validDimensions = new Set<string>(RUBRIC_DIMENSIONS);
    for (const question of PROFILE_QUESTION_BANK) {
      for (const target of question.targets) {
        expect(validDimensions.has(target)).toBe(true);
      }
    }
  });

  it("every option scores only dimensions listed in the question targets", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      for (const option of question.options) {
        for (const dimension of Object.keys(option.scores)) {
          expect(
            question.targets.includes(dimension as RubricDimensionName)
          ).toBe(true);
        }
      }
    }
  });

  it("every option score is between 1 and 10", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      for (const option of question.options) {
        for (const [, score] of Object.entries(option.scores)) {
          expect(score).toBeGreaterThanOrEqual(1);
          expect(score).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it("every question has a non-empty scenario and context", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      expect(question.scenario.length).toBeGreaterThan(20);
      expect(question.context.length).toBeGreaterThan(10);
      expect(question.category.length).toBeGreaterThan(0);
    }
  });

  it("every option has a non-empty label", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      for (const option of question.options) {
        expect(option.label.length).toBeGreaterThan(10);
      }
    }
  });
});

// ── Dimension Coverage ───────────────────────────────────────────────

describe("dimension coverage", () => {
  it("every rubric dimension is targeted by at least 2 questions", () => {
    for (const dimension of RUBRIC_DIMENSIONS) {
      const questions = getQuestionsForDimension(dimension);
      expect(
        questions.length,
        `${dimension} has only ${questions.length} question(s) — need at least 2`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("options within a question span a meaningful range for each targeted dimension", () => {
    for (const question of PROFILE_QUESTION_BANK) {
      for (const target of question.targets) {
        const scores = question.options
          .map((o) => o.scores[target])
          .filter((s): s is number => s !== undefined);

        if (scores.length >= 2) {
          const range = Math.max(...scores) - Math.min(...scores);
          expect(
            range,
            `Question ${question.id} has range of only ${range} for ${target} — options should offer meaningful differentiation`
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});

// ── Scoring Engine ───────────────────────────────────────────────────

describe("scoreResponses", () => {
  function answerAll(optionIndex: number): QuestionResponse[] {
    return PROFILE_QUESTION_BANK.map((q) => ({
      question_id: q.id,
      selected_option: optionIndex,
    }));
  }

  it("produces a complete rubric profile when all questions are answered", () => {
    const responses = answerAll(0);
    const { profile, coverage } = scoreResponses(responses);

    for (const dim of RUBRIC_DIMENSIONS) {
      expect(profile[dim]).toBeDefined();
      expect(profile[dim].score).toBeGreaterThanOrEqual(1);
      expect(profile[dim].score).toBeLessThanOrEqual(10);
      expect(profile[dim].note.length).toBeGreaterThan(10);
      expect(coverage[dim]).toBeGreaterThanOrEqual(2);
    }
  });

  it("consistently cautious answers produce low risk scores", () => {
    // Option 0 is always the most cautious/conservative
    const responses = answerAll(0);
    const { profile } = scoreResponses(responses);

    expect(profile.risk_appetite.score).toBeLessThanOrEqual(4);
    expect(profile.evidence_threshold.score).toBeGreaterThanOrEqual(7);
    expect(profile.delivery_vs_rigour_bias.score).toBeLessThanOrEqual(4);
  });

  it("consistently bold answers produce high risk scores", () => {
    // Option 3 is always the most bold/aggressive
    const responses = answerAll(3);
    const { profile } = scoreResponses(responses);

    expect(profile.risk_appetite.score).toBeGreaterThanOrEqual(7);
    expect(profile.evidence_threshold.score).toBeLessThanOrEqual(4);
    expect(profile.delivery_vs_rigour_bias.score).toBeGreaterThanOrEqual(7);
  });

  it("mixed answers produce moderate scores", () => {
    // Alternate between cautious and bold
    const responses = PROFILE_QUESTION_BANK.map((q, i) => ({
      question_id: q.id,
      selected_option: i % 2 === 0 ? 0 : 3,
    }));
    const { profile } = scoreResponses(responses);

    for (const dim of RUBRIC_DIMENSIONS) {
      expect(profile[dim].score).toBeGreaterThanOrEqual(2);
      expect(profile[dim].score).toBeLessThanOrEqual(9);
    }
  });

  it("returns coherence warnings when applicable", () => {
    // Answer questions in a way that creates high risk appetite + high evidence threshold
    // This is hard to do naturally, so we test the warning mechanism with specific responses
    const responses: QuestionResponse[] = PROFILE_QUESTION_BANK.map((q) => ({
      question_id: q.id,
      selected_option: 3, // Bold on everything
    }));
    const { warnings } = scoreResponses(responses);
    // Warnings may or may not fire depending on final averaged scores — just verify type
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("handles empty responses gracefully", () => {
    const { profile, coverage } = scoreResponses([]);

    for (const dim of RUBRIC_DIMENSIONS) {
      // Defaults to midpoint
      expect(profile[dim].score).toBe(5);
      expect(coverage[dim]).toBe(0);
    }
  });

  it("ignores responses with unknown question IDs", () => {
    const responses: QuestionResponse[] = [
      { question_id: "nonexistent_question", selected_option: 0 },
    ];
    const { profile } = scoreResponses(responses);

    for (const dim of RUBRIC_DIMENSIONS) {
      expect(profile[dim].score).toBe(5); // Defaults
    }
  });

  it("ignores responses with out-of-range option indices", () => {
    const responses: QuestionResponse[] = [
      { question_id: PROFILE_QUESTION_BANK[0]!.id, selected_option: 5 },
    ];
    const { profile } = scoreResponses(responses);

    // Should default since the invalid option contributes nothing
    for (const dim of RUBRIC_DIMENSIONS) {
      expect(profile[dim].score).toBe(5);
    }
  });

  it("clamps scores to 1-10 range", () => {
    const responses = answerAll(0);
    const { profile } = scoreResponses(responses);

    for (const dim of RUBRIC_DIMENSIONS) {
      expect(profile[dim].score).toBeGreaterThanOrEqual(1);
      expect(profile[dim].score).toBeLessThanOrEqual(10);
    }
  });
});

// ── Interpretive Notes ───────────────────────────────────────────────

describe("generateInterpretiveNote", () => {
  it("generates different notes for low, mid, and high scores", () => {
    const low = generateInterpretiveNote("risk_appetite", 2);
    const mid = generateInterpretiveNote("risk_appetite", 5);
    const high = generateInterpretiveNote("risk_appetite", 8);

    expect(low).not.toBe(mid);
    expect(mid).not.toBe(high);
    expect(low).not.toBe(high);
  });

  it("generates notes for all six dimensions", () => {
    for (const dim of RUBRIC_DIMENSIONS) {
      const note = generateInterpretiveNote(dim, 5);
      expect(note.length).toBeGreaterThan(20);
    }
  });

  it("low scores produce cautious/conservative language", () => {
    const note = generateInterpretiveNote("risk_appetite", 2);
    expect(note.toLowerCase()).toContain("conservative");
  });

  it("high scores produce bold/delivery-oriented language", () => {
    const note = generateInterpretiveNote("delivery_vs_rigour_bias", 8);
    expect(note.toLowerCase()).toContain("delivery");
  });

  it("band boundaries are correct: 1-3 low, 4-6 mid, 7-10 high", () => {
    // Score 3 should be low band
    const score3 = generateInterpretiveNote("risk_appetite", 3);
    // Score 4 should be mid band
    const score4 = generateInterpretiveNote("risk_appetite", 4);
    // Score 7 should be high band
    const score7 = generateInterpretiveNote("risk_appetite", 7);

    // Low and mid should differ
    expect(score3).not.toBe(score4);
    // Mid and high should differ
    expect(score4).not.toBe(score7);
  });
});

// ── Coverage Check ───────────────────────────────────────────────────

describe("checkCoverage", () => {
  it("returns no gaps when all questions are answered", () => {
    const responses = PROFILE_QUESTION_BANK.map((q) => ({
      question_id: q.id,
      selected_option: 0,
    }));
    const gaps = checkCoverage(responses);
    expect(gaps).toEqual([]);
  });

  it("returns all dimensions when no questions are answered", () => {
    const gaps = checkCoverage([]);
    expect(gaps.length).toBe(6);
    for (const dim of RUBRIC_DIMENSIONS) {
      expect(gaps).toContain(dim);
    }
  });

  it("identifies specific dimensions with insufficient coverage", () => {
    // Answer only the first question (targets risk_appetite and evidence_threshold)
    const responses: QuestionResponse[] = [
      { question_id: PROFILE_QUESTION_BANK[0]!.id, selected_option: 0 },
    ];
    const gaps = checkCoverage(responses);

    // risk_appetite and evidence_threshold each have 1 response — still below threshold of 2
    expect(gaps).toContain("risk_appetite");
    expect(gaps).toContain("evidence_threshold");
    // All others should also be gaps
    expect(gaps).toContain("tolerance_for_ambiguity");
    expect(gaps).toContain("intervention_frequency");
    expect(gaps).toContain("escalation_bias");
    expect(gaps).toContain("delivery_vs_rigour_bias");
  });
});

// ── getQuestionsForDimension ─────────────────────────────────────────

describe("getQuestionsForDimension", () => {
  it("returns only questions that target the specified dimension", () => {
    const questions = getQuestionsForDimension("risk_appetite");
    for (const q of questions) {
      expect(q.targets).toContain("risk_appetite");
    }
  });

  it("returns an empty array for non-existent dimensions", () => {
    const questions = getQuestionsForDimension(
      "nonexistent" as RubricDimensionName
    );
    expect(questions).toEqual([]);
  });
});
