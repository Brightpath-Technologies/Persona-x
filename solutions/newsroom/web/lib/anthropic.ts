import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazily-constructed Anthropic client. Throws if the key is missing. */
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * The web-search server tool the desks use to research their beat. We use the
 * 20260209 version (dynamic filtering + citations) which this SDK accepts at
 * runtime but does not yet type — hence the cast through ToolUnion.
 */
export const WEB_SEARCH_TOOL = {
  type: "web_search_20260209",
  name: "web_search",
} as unknown as Anthropic.Messages.ToolUnion;

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

/** Sum usage across a multi-turn (pause_turn) server-tool run. */
export function addUsage(a: Usage, b: Anthropic.Usage | undefined): Usage {
  return {
    input_tokens: a.input_tokens + (b?.input_tokens ?? 0),
    output_tokens: a.output_tokens + (b?.output_tokens ?? 0),
  };
}

/** Concatenate all text blocks of a message into one string. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
