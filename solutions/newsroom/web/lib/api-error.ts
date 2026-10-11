import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * Pre-flight: return a 503 response if ANTHROPIC_API_KEY is not set.
 * Returns null when the key is present.
 */
export function checkApiKey(): NextResponse | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The Anthropic API key is not configured. Set ANTHROPIC_API_KEY.",
      },
      { status: 503 }
    );
  }
  return null;
}

/** Classify an Anthropic/SDK error into an appropriate HTTP response. */
export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof Anthropic.AuthenticationError) {
    return NextResponse.json(
      { error: "API key is invalid or not authorised." },
      { status: 503 }
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: "Rate limit reached — please try again in a moment." },
      { status: 429 }
    );
  }
  if (
    err instanceof Anthropic.APIConnectionError ||
    err instanceof Anthropic.APIConnectionTimeoutError
  ) {
    return NextResponse.json(
      { error: "Could not reach the AI service. Please try again shortly." },
      { status: 503 }
    );
  }
  if (err instanceof Anthropic.InternalServerError) {
    return NextResponse.json(
      { error: "The AI service returned an error. Please try again." },
      { status: 503 }
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ANTHROPIC_API_KEY")) {
    return NextResponse.json(
      { error: "The Anthropic API key is not configured." },
      { status: 503 }
    );
  }
  console.error("Newsroom API error:", err);
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again." },
    { status: 500 }
  );
}
