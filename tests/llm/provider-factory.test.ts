import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "../../src/llm/client.js";
import {
  assertOfflineCompliant,
  isLocalHost,
  isOfflineMode,
} from "../../src/llm/providers/guard.js";
import { OfflineViolationError } from "../../src/llm/providers/types.js";

/**
 * Provider factory + offline guard tests.
 * These are pure — they don't make network calls. Real HTTP behaviour
 * is covered by integration smoke checks, not unit tests.
 */

describe("provider factory", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    delete process.env.PERSONA_X_PROVIDER;
    delete process.env.PERSONA_X_OFFLINE;
    delete process.env.PERSONA_X_OAI_BASE_URL;
    delete process.env.PERSONA_X_OAI_API_KEY;
    delete process.env.PERSONA_X_MODEL;
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("defaults to ollama when PERSONA_X_PROVIDER is unset", () => {
    const client = createClient();
    expect(client.name).toBe("ollama");
  });

  it("creates an anthropic provider when selected explicitly", () => {
    const client = createClient({ provider: "anthropic" });
    expect(client.name).toBe("anthropic");
  });

  it("respects PERSONA_X_PROVIDER=anthropic", () => {
    process.env.PERSONA_X_PROVIDER = "anthropic";
    const client = createClient();
    expect(client.name).toBe("anthropic");
  });

  it("creates an openai-compatible provider when fully configured", () => {
    process.env.PERSONA_X_PROVIDER = "openai-compatible";
    process.env.PERSONA_X_OAI_BASE_URL = "https://example.test/v1";
    process.env.PERSONA_X_MODEL = "example-model";
    const client = createClient();
    expect(client.name).toBe("openai-compatible");
    expect(client.model).toBe("example-model");
  });

  it("rejects unknown PERSONA_X_PROVIDER values", () => {
    process.env.PERSONA_X_PROVIDER = "not-a-provider";
    expect(() => createClient()).toThrow(/PERSONA_X_PROVIDER/);
  });

  it("requires baseUrl for openai-compatible", () => {
    process.env.PERSONA_X_PROVIDER = "openai-compatible";
    process.env.PERSONA_X_MODEL = "m";
    expect(() => createClient()).toThrow(/PERSONA_X_OAI_BASE_URL/);
  });

  it("requires a model for openai-compatible", () => {
    process.env.PERSONA_X_PROVIDER = "openai-compatible";
    process.env.PERSONA_X_OAI_BASE_URL = "https://example.test";
    expect(() => createClient()).toThrow(/PERSONA_X_MODEL/);
  });
});

describe("offline guard", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    delete process.env.PERSONA_X_OFFLINE;
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("isOfflineMode reads PERSONA_X_OFFLINE=1", () => {
    process.env.PERSONA_X_OFFLINE = "1";
    expect(isOfflineMode()).toBe(true);
  });

  it("isOfflineMode reads PERSONA_X_OFFLINE=true", () => {
    process.env.PERSONA_X_OFFLINE = "true";
    expect(isOfflineMode()).toBe(true);
  });

  it("isOfflineMode is false when unset", () => {
    expect(isOfflineMode()).toBe(false);
  });

  it("isLocalHost recognises common local hostnames", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("::1")).toBe(true);
    expect(isLocalHost("example.com")).toBe(false);
  });

  it("assertOfflineCompliant is a no-op when offline mode is off", () => {
    expect(() =>
      assertOfflineCompliant("anthropic", "https://api.anthropic.com")
    ).not.toThrow();
  });

  it("assertOfflineCompliant blocks remote URLs when offline", () => {
    process.env.PERSONA_X_OFFLINE = "1";
    expect(() =>
      assertOfflineCompliant("anthropic", "https://api.anthropic.com")
    ).toThrow(OfflineViolationError);
  });

  it("assertOfflineCompliant allows localhost when offline", () => {
    process.env.PERSONA_X_OFFLINE = "1";
    expect(() =>
      assertOfflineCompliant("ollama", "http://localhost:11434/v1/chat/completions")
    ).not.toThrow();
  });

  it("OfflineViolationError includes the provider and target", () => {
    process.env.PERSONA_X_OFFLINE = "1";
    try {
      assertOfflineCompliant("openai-compatible", "https://api.fireworks.ai");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(OfflineViolationError);
      if (err instanceof OfflineViolationError) {
        expect(err.provider).toBe("openai-compatible");
        expect(err.target).toBe("https://api.fireworks.ai");
      }
    }
  });
});
