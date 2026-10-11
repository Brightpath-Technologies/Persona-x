/**
 * Persona-x — Structured AI Persona Creation & Panel Runtime
 *
 * Library entry point. Exports all public types, schemas, and functions
 * for use by consumers of the persona-x package.
 */

// Schema exports
export {
  PersonaFileSchema,
  PersonaMetadataSchema,
  PersonaPurposeSchema,
  PersonaBioSchema,
  PanelRoleSchema,
  ReasoningTendenciesSchema,
  InteractionStyleSchema,
  CommunicationStyleSchema,
  BoundariesSchema,
  InvocationCuesSchema,
  PersonaTypeSchema,
  validatePersonaFile,
} from "./schema/persona.js";

export type {
  PersonaFile,
  PersonaMetadata,
  PersonaPurpose,
  PersonaBio,
  PanelRole,
  ReasoningTendencies,
  InteractionStyle,
  CommunicationStyle,
  Boundaries,
  InvocationCues,
  Provenance,
} from "./schema/persona.js";

export {
  RubricProfileSchema,
  RubricScoreSchema,
  RUBRIC_DIMENSIONS,
  RUBRIC_DIMENSION_LABELS,
  RUBRIC_DIMENSION_DESCRIPTIONS,
  validateRubricCoherence,
} from "./schema/rubric.js";

export type {
  RubricProfile,
  RubricScore,
  RubricDimensionName,
} from "./schema/rubric.js";

export {
  KnowledgeBaseSchema,
  KBUseContractSchema,
  KBItemSchema,
} from "./schema/knowledge-base.js";

export type {
  KnowledgeBase,
  KBUseContract,
  KBItem,
} from "./schema/knowledge-base.js";

// Engine exports
export {
  createEngineState,
  getNextAction,
  transitionToPopulation,
  transitionToReview,
  getRubricSummary,
} from "./engine/engine.js";

export type { EngineState, EnginePhase, EngineAction } from "./engine/engine.js";

// Discovery exports
export {
  createDiscoveryState,
  hasSignalSufficiency,
  getMissingSignals,
  QUESTION_BANK,
  PRIORITY_SIGNALS,
} from "./engine/discovery/discovery.js";

export type {
  DiscoveryState,
  DiscoveryQuestion,
  ExtractedSignal,
  PrioritySignal,
} from "./engine/discovery/discovery.js";

// Population exports
export {
  POPULATION_ORDER,
  createPipelineState,
  getCurrentSection,
  advanceSection,
  isPipelineComplete,
  generateBuildTrace,
} from "./engine/population/pipeline.js";

export type {
  PipelineState,
  PopulationSection,
  PopulationMethod,
  PopulationRecord,
} from "./engine/population/pipeline.js";

// Rubric scorer exports
export {
  buildRubricProfile,
  formatRubricProfile,
  generateScoreCandidates,
  resolveScore,
} from "./engine/rubric/scorer.js";

// Inference exports
export { evaluateInference } from "./engine/inference/inference.js";
export type { InferenceDecision } from "./engine/inference/inference.js";

// Runtime exports
export {
  generatePersonaSystemPrompt,
  selectPersonasForTopic,
} from "./runtime/interface.js";

export type {
  LoadedPersona,
  PanelConfig,
  PanelMessage,
  PanelRound,
  RubricInfluence,
} from "./runtime/interface.js";

export {
  loadPersonaFromFile,
  loadPersonasForPanel,
} from "./runtime/loader.js";

export {
  createPanelSession,
  determineSpeakingOrder,
  shouldPersonaContribute,
  formatPanelDiscussion,
} from "./runtime/panel.js";

export type { PanelSession } from "./runtime/panel.js";

export {
  SessionRecordSchema,
  SessionPersonaSchema,
  SessionMessageSchema,
  SessionRoundSchema,
  RubricSnapshotSchema,
  createSessionRecord,
  sessionToYaml,
  yamlToSession,
  saveSessionToFile,
  loadSessionFromFile,
  replaySession,
  compareSessions,
} from "./runtime/session.js";

export type {
  SessionRecord,
  SessionPersona,
  SessionMessage,
  SessionRound,
  RubricSnapshot,
  SessionComparison,
  PersonaDifferences,
  RubricShift,
} from "./runtime/session.js";

// LLM exports
export {
  createClient,
  sendMessage,
  sendMessageForJSON,
} from "./llm/client.js";

export type { LLMResponse, LLMMessage, LLMRequestOptions } from "./llm/client.js";

export {
  extractSignals,
  extractPurpose,
  generateConversationalQuestion,
} from "./llm/discovery-llm.js";

export { generateSection } from "./llm/population-llm.js";

export {
  generatePersonaResponse,
  generateRoundSummary,
} from "./llm/panel-llm.js";

// Decision Engine exports
export {
  EVALUATION_DIMENSIONS,
  EVALUATION_WEIGHTS,
  EvaluationScoreSchema,
  DECISION_STAGES,
  StageDecisionSchema,
  StageVerdictSchema,
  OpportunityBriefSchema,
  ChallengeReportSchema,
  PrototypeSpecSchema,
  DeliveryPlanSchema,
  calculateCompositeScore,
  checkStage1Gate,
  checkStage2Gate,
} from "./decision-engine/schema.js";

export type {
  EvaluationDimension,
  EvaluationScore,
  DecisionStage,
  StageDecision,
  StageVerdict,
  OpportunityBrief,
  ChallengeReport,
  PrototypeSpec,
  DeliveryPlan,
  GateResult,
} from "./decision-engine/schema.js";

export {
  createDecisionPipeline,
  getCurrentStagePanel,
  recordStageResult,
  advanceToNextStage,
  isPipelineDone,
  formatAuditTrail,
  checkKillCriteria,
  STAGE_PANELS,
} from "./decision-engine/pipeline.js";

export type {
  DecisionPipelineState,
  AuditEntry,
  StagePanel,
  TranscriptMessage,
  TranscriptRound,
} from "./decision-engine/pipeline.js";

export {
  runStage,
  runDecisionEngine,
  DEFAULT_PERSONA_DIR,
} from "./decision-engine/runner.js";

export type {
  RunnerOptions,
  StageRunResult,
} from "./decision-engine/runner.js";

// Utility exports
export {
  personaToYaml,
  yamlToPersona,
  readPersonaFile,
  writePersonaFile,
} from "./utils/yaml.js";

export {
  parseSemVer,
  formatSemVer,
  bumpVersion,
  inferBumpType,
} from "./utils/version.js";
