import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * API Error Utilities
 *
 * Centralises error classification and response generation for all API routes.
 * Returns appropriate HTTP status codes rather than generic 500s:
 *   503 — API key missing or service unavailable
 *   429 — rate limit reached
 *   500 — unexpected server error
 */

/**
 * Pre-flight check: return a 503 response if ANTHROPIC_API_KEY is not set.
 * Call at the top of each route handler before any LLM work.
 * Returns null when the key is present.
 */
export function checkApiKey(): NextResponse | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The Anthropic API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.",
      },
      { status: 503 }
    );
  }
  return null;
}

/**
 * Classify an error thrown by an Anthropic SDK call and return an appropriate
 * NextResponse with the correct HTTP status code and a user-friendly message.
 */
export function apiErrorResponse(err: unknown): NextResponse {
  // Anthropic SDK error types
  if (err instanceof Anthropic.AuthenticationError) {
    return NextResponse.json(
      {
        error:
          "API key is invalid or not authorised. Please check your ANTHROPIC_API_KEY.",
      },
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

  // Catch missing API key error thrown before client creation
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ANTHROPIC_API_KEY")) {
    return NextResponse.json(
      {
        error:
          "The Anthropic API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.",
      },
      { status: 503 }
    );
  }

  // Generic fallback — do not expose raw error message to clients
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again." },
    { status: 500 }
  );
}
