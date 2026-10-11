"use client";

import { useState, useCallback, useRef } from "react";
import type {
  BoardBrief,
  BoardSessionEvent,
  PersonaResponse,
  SessionStatus,
  WebUserProfile,
} from "./types";

export interface BoardSessionState {
  status: SessionStatus;
  responses: PersonaResponse[];
  activePersonaId: string | null;
  brief: BoardBrief | null;
  error: string | null;
}

export function useBoardSession() {
  const [state, setState] = useState<BoardSessionState>({
    status: "idle",
    responses: [],
    activePersonaId: null,
    brief: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  // Token buffering: accumulate tokens in a map keyed by personaId,
  // flush to state on requestAnimationFrame to reduce re-renders
  const tokenBufferRef = useRef<Map<string, string>>(new Map());
  const rafPendingRef = useRef(false);

  function scheduleTokenFlush() {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const buffered = new Map(tokenBufferRef.current);
      tokenBufferRef.current.clear();
      if (buffered.size === 0) return;
      setState((prev) => ({
        ...prev,
        responses: prev.responses.map((r) => {
          const extra = buffered.get(r.personaId);
          return extra ? { ...r, content: r.content + extra } : r;
        }),
      }));
    });
  }

  const startSession = useCallback(async (decision: string, userProfile?: WebUserProfile | null) => {
    // Abort any existing session
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    tokenBufferRef.current.clear();

    setState({
      status: "loading",
      responses: [],
      activePersonaId: null,
      brief: null,
      error: null,
    });

    try {
      const res = await fetch("/api/board/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(userProfile ? { userProfile } : {}) }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        let errorMessage = `Session failed (${res.status})`;
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.error ?? errorMessage;
        } catch {
          // Response is not JSON — use the status code message
        }
        throw new Error(errorMessage);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      setState((prev) => ({ ...prev, status: "streaming" }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataMatch = line.match(/^data: (.+)$/m);
          if (!dataMatch) continue;

          let event: BoardSessionEvent;
          try {
            event = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }
          handleEvent(event, setState, tokenBufferRef, scheduleTokenFlush);
        }
      }

      // Flush any remaining buffered tokens before processing final buffer
      if (tokenBufferRef.current.size > 0) {
        const buffered = new Map(tokenBufferRef.current);
        tokenBufferRef.current.clear();
        setState((prev) => ({
          ...prev,
          responses: prev.responses.map((r) => {
            const extra = buffered.get(r.personaId);
            return extra ? { ...r, content: r.content + extra } : r;
          }),
        }));
      }

      // Process any remaining SSE buffer
      if (buffer.trim()) {
        const dataMatch = buffer.match(/^data: (.+)$/m);
        if (dataMatch) {
          try {
            const event: BoardSessionEvent = JSON.parse(dataMatch[1]);
            handleEvent(event, setState, tokenBufferRef, scheduleTokenFlush);
          } catch {
            // Truncated SSE frame — ignore
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const updateResponse = useCallback(
    (personaId: string, updater: (r: PersonaResponse) => PersonaResponse) => {
      setState((prev) => ({
        ...prev,
        responses: prev.responses.map((r) =>
          r.personaId === personaId ? updater(r) : r
        ),
      }));
    },
    []
  );

  return { ...state, startSession, updateResponse };
}

function handleEvent(
  event: BoardSessionEvent,
  setState: React.Dispatch<React.SetStateAction<BoardSessionState>>,
  tokenBufferRef: React.RefObject<Map<string, string>>,
  scheduleTokenFlush: () => void
) {
  switch (event.type) {
    case "persona_start":
      setState((prev) => ({
        ...prev,
        activePersonaId: event.personaId,
        responses: [
          ...prev.responses,
          {
            personaId: event.personaId,
            personaName: event.personaName,
            content: "",
            isComplete: false,
            challenges: [],
          },
        ],
      }));
      break;

    case "persona_token": {
      // Buffer tokens and flush on next animation frame
      const buf = tokenBufferRef.current;
      if (buf) {
        buf.set(event.personaId, (buf.get(event.personaId) ?? "") + event.token);
        scheduleTokenFlush();
      }
      break;
    }

    case "persona_complete":
      // Flush any buffered tokens for this persona before marking complete
      if (tokenBufferRef.current) {
        const pending = tokenBufferRef.current.get(event.personaId);
        if (pending) {
          tokenBufferRef.current.delete(event.personaId);
          setState((prev) => ({
            ...prev,
            activePersonaId: null,
            responses: prev.responses.map((r) =>
              r.personaId === event.personaId
                ? { ...r, content: r.content + pending, isComplete: true }
                : r
            ),
          }));
          break;
        }
      }
      setState((prev) => ({
        ...prev,
        activePersonaId: null,
        responses: prev.responses.map((r) =>
          r.personaId === event.personaId ? { ...r, isComplete: true } : r
        ),
      }));
      break;

    case "brief_complete":
      setState((prev) => ({
        ...prev,
        brief: event.brief,
      }));
      break;

    case "session_complete":
      setState((prev) => ({
        ...prev,
        status: "complete",
      }));
      break;

    case "error":
      setState((prev) => ({
        ...prev,
        status: "error",
        error: event.message,
      }));
      break;
  }
}
