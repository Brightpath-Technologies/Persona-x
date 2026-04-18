/**
 * LLM Provider Abstraction
 *
 * Every provider implements the same interface so the rest of Persona-x
 * never talks to a vendor SDK directly. This is the seam where trust is
 * expressed: pick a local provider (Ollama) for zero-trust operation,
 * or a commercial one if you've done your own diligence.
 */

export type ProviderName = "anthropic" | "ollama" | "openai-compatible";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequestOptions {
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  /**
   * When true the provider may apply vendor-specific caching of the
   * system prompt. Safe no-op on providers that don't support it.
   */
  cacheSystem?: boolean;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
  provider: ProviderName;
}

export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  sendMessage(options: LLMRequestOptions): Promise<LLMResponse>;
}

export class OfflineViolationError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly target: string
  ) {
    super(
      `Offline mode blocked a non-local request from ${provider} to ${target}. ` +
        `Unset PERSONA_X_OFFLINE or switch to a local provider.`
    );
    this.name = "OfflineViolationError";
  }
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}
