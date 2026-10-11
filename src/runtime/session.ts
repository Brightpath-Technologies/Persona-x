import { z } from "zod";
import { stringify, parse } from "yaml";
import { readFile, writeFile } from "node:fs/promises";
import type { PanelSession } from "./panel.js";

/**
 * Panel Session Persistence
 *
 * Saves and loads panel session records as human-readable YAML.
 * Session records capture the full discussion including persona rubric
 * snapshots, round-by-round messages with rubric influence notes,
 * and the final outcome.
 *
 * Functions:
 *   createSessionRecord — build a record from a live PanelSession
 *   saveSessionToFile   — write to YAML on disk
 *   loadSessionFromFile — read and validate from disk
 *   replaySession       — format a record for human-readable display
 *   compareSessions     — highlight differences between two records
 */

// ── Schemas ──────────────────────────────────────────────────────────

export const RubricSnapshotSchema = z.object({
  risk_appetite: z.object({ score: z.number(), note: z.string() }),
  evidence_threshold: z.object({ score: z.number(), note: z.string() }),
  tolerance_for_ambiguity: z.object({ score: z.number(), note: z.string() }),
  intervention_frequency: z.object({ score: z.number(), note: z.string() }),
  escalation_bias: z.object({ score: z.number(), note: z.string() }),
  delivery_vs_rigour_bias: z.object({ score: z.number(), note: z.string() }),
});

export type RubricSnapshot = z.infer<typeof RubricSnapshotSchema>;

export const SessionPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  rubric_snapshot: RubricSnapshotSchema,
});

export type SessionPersona = z.infer<typeof SessionPersonaSchema>;

export const SessionMessageSchema = z.object({
  persona_id: z.string(),
  persona_name: z.string(),
  content: z.string(),
  timestamp: z.string(),
  dominant_dimensions: z.array(z.string()),
  behaviour_notes: z.array(z.string()),
});

export type SessionMessage = z.infer<typeof SessionMessageSchema>;

export const SessionRoundSchema = z.object({
  round_number: z.number().int().positive(),
  messages: z.array(SessionMessageSchema),
  summary: z.string(),
});

export type SessionRound = z.infer<typeof SessionRoundSchema>;

export const SessionRecordSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  panel_name: z.string(),
  topic: z.string(),
  context: z.string(),
  stage: z.string().optional(),
  personas: z.array(SessionPersonaSchema).min(1),
  rounds: z.array(SessionRoundSchema),
  outcome: z.string().optional(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ── SessionComparison ────────────────────────────────────────────────

export interface PersonaDifferences {
  only_in_a: string[];
  only_in_b: string[];
  shared: string[];
}

export interface RubricShift {
  persona_name: string;
  dimension: string;
  score_a: number;
  score_b: number;
  /** Positive = higher in session B; negative = lower. */
  shift: number;
}

export interface SessionComparison {
  session_a_id: string;
  session_b_id: string;
  panel_name: string;
  topic_a: string;
  topic_b: string;
  persona_differences: PersonaDifferences;
  rubric_shifts: RubricShift[];
  round_count_a: number;
  round_count_b: number;
  outcome_a: string | undefined;
  outcome_b: string | undefined;
}

// ── Factory ──────────────────────────────────────────────────────────

/**
 * Create a SessionRecord from a completed PanelSession.
 *
 * @param session - The live session returned by runStage
 * @param options.stage - Optional Decision Engine stage identifier (e.g. "propose")
 * @param options.outcome - Optional summary of the stage outcome
 * @param options.panelName - Optional panel name; defaults to the session topic
 */
export function createSessionRecord(
  session: PanelSession,
  options?: { stage?: string; outcome?: string; panelName?: string }
): SessionRecord {
  const personas: SessionPersona[] = session.config.personas.map((p) => ({
    id: p.id,
    name: p.file.metadata.name,
    rubric_snapshot: {
      risk_appetite: p.file.rubric.risk_appetite,
      evidence_threshold: p.file.rubric.evidence_threshold,
      tolerance_for_ambiguity: p.file.rubric.tolerance_for_ambiguity,
      intervention_frequency: p.file.rubric.intervention_frequency,
      escalation_bias: p.file.rubric.escalation_bias,
      delivery_vs_rigour_bias: p.file.rubric.delivery_vs_rigour_bias,
    },
  }));

  const rounds: SessionRound[] = session.rounds.map((r) => ({
    round_number: r.round_number,
    messages: r.messages.map((m) => ({
      persona_id: m.persona_id,
      persona_name: m.persona_name,
      content: m.content,
      timestamp: m.timestamp,
      dominant_dimensions: m.rubric_influence.dominant_dimensions,
      behaviour_notes: m.rubric_influence.behaviour_notes,
    })),
    summary: r.summary,
  }));

  const record: SessionRecord = {
    id: generateSessionId(),
    created_at: new Date().toISOString(),
    panel_name: options?.panelName ?? session.config.topic,
    topic: session.config.topic,
    context: session.config.context,
    personas,
    rounds,
  };

  if (options?.stage !== undefined) record.stage = options.stage;
  if (options?.outcome !== undefined) record.outcome = options.outcome;

  return record;
}

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `session-${timestamp}-${random}`;
}

// ── Serialisation ────────────────────────────────────────────────────

/**
 * Serialise a SessionRecord to a human-readable YAML string.
 */
export function sessionToYaml(record: SessionRecord): string {
  const header = [
    "# Panel Session Record",
    `# Session: ${record.id}`,
    `# Panel: ${record.panel_name}`,
    `# Created: ${record.created_at}`,
    `# Topic: ${record.topic}`,
    "",
  ].join("\n");

  return header + stringify(record, { lineWidth: 120 });
}

/**
 * Parse a YAML string into a SessionRecord.
 * Validates against SessionRecordSchema after parsing.
 */
export function yamlToSession(yamlContent: string): {
  success: boolean;
  data?: SessionRecord;
  errors?: string[];
} {
  let parsed: unknown;
  try {
    parsed = parse(yamlContent);
  } catch (err) {
    return { success: false, errors: [`YAML parse error: ${String(err)}`] };
  }

  const result = SessionRecordSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}

// ── Persistence ──────────────────────────────────────────────────────

/**
 * Save a SessionRecord to disk as YAML.
 */
export async function saveSessionToFile(
  record: SessionRecord,
  filePath: string
): Promise<void> {
  await writeFile(filePath, sessionToYaml(record), "utf-8");
}

/**
 * Load a SessionRecord from a YAML file on disk.
 */
export async function loadSessionFromFile(filePath: string): Promise<{
  success: boolean;
  data?: SessionRecord;
  errors?: string[];
}> {
  try {
    const content = await readFile(filePath, "utf-8");
    return yamlToSession(content);
  } catch (err) {
    return {
      success: false,
      errors: [`Failed to read ${filePath}: ${String(err)}`],
    };
  }
}

// ── Replay ───────────────────────────────────────────────────────────

/**
 * Format a SessionRecord for human-readable display.
 * Returns a Markdown-formatted string suitable for printing or logging.
 */
export function replaySession(record: SessionRecord): string {
  const lines: string[] = [
    `# Panel Session: ${record.panel_name}`,
    "",
    `**Session ID:** ${record.id}`,
    `**Created:** ${record.created_at}`,
    `**Topic:** ${record.topic}`,
  ];

  if (record.stage) lines.push(`**Stage:** ${record.stage}`);

  lines.push("");
  lines.push("## Participants");
  for (const p of record.personas) {
    lines.push(`- **${p.name}** (${p.id})`);
  }

  lines.push("");
  lines.push("## Discussion");

  for (const round of record.rounds) {
    lines.push(`### Round ${round.round_number}`);
    lines.push("");
    for (const msg of round.messages) {
      lines.push(`**${msg.persona_name}:** ${msg.content}`);
      lines.push("");
    }
    lines.push(`*Round summary:* ${round.summary}`);
    lines.push("");
  }

  if (record.outcome) {
    lines.push("## Outcome");
    lines.push(record.outcome);
  }

  return lines.join("\n");
}

// ── Comparison ───────────────────────────────────────────────────────

const RUBRIC_DIMS = [
  "risk_appetite",
  "evidence_threshold",
  "tolerance_for_ambiguity",
  "intervention_frequency",
  "escalation_bias",
  "delivery_vs_rigour_bias",
] as const;

type RubricDimKey = (typeof RUBRIC_DIMS)[number];

/**
 * Compare two SessionRecords and highlight differences in persona
 * composition and rubric score positions.
 */
export function compareSessions(
  a: SessionRecord,
  b: SessionRecord
): SessionComparison {
  const namesA = new Set(a.personas.map((p) => p.name));
  const namesB = new Set(b.personas.map((p) => p.name));
  const onlyInA = [...namesA].filter((n) => !namesB.has(n));
  const onlyInB = [...namesB].filter((n) => !namesA.has(n));
  const shared = [...namesA].filter((n) => namesB.has(n));

  const rubricShifts: RubricShift[] = [];

  for (const personaName of shared) {
    const personaA = a.personas.find((p) => p.name === personaName);
    const personaB = b.personas.find((p) => p.name === personaName);
    if (!personaA || !personaB) continue;

    for (const dim of RUBRIC_DIMS) {
      const dimKey = dim as RubricDimKey;
      const scoreA = personaA.rubric_snapshot[dimKey].score;
      const scoreB = personaB.rubric_snapshot[dimKey].score;
      if (scoreA !== scoreB) {
        rubricShifts.push({
          persona_name: personaName,
          dimension: dim,
          score_a: scoreA,
          score_b: scoreB,
          shift: scoreB - scoreA,
        });
      }
    }
  }

  return {
    session_a_id: a.id,
    session_b_id: b.id,
    panel_name: a.panel_name,
    topic_a: a.topic,
    topic_b: b.topic,
    persona_differences: { only_in_a: onlyInA, only_in_b: onlyInB, shared },
    rubric_shifts: rubricShifts,
    round_count_a: a.rounds.length,
    round_count_b: b.rounds.length,
    outcome_a: a.outcome,
    outcome_b: b.outcome,
  };
}
