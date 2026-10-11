# Advisor Challenge & Reply — Feature Specification

**Version:** 1.0.0
**Date:** 14 February 2026
**Status:** Implemented
**Depends on:** PRODUCT-SPEC.md §5.1 (Board Session), §6 (Board Brief)

---

## 1. Overview

### 1.1 What This Feature Does

After each advisor finishes delivering their initial perspective, the user can challenge them with follow-up questions or counter-arguments. The advisor responds in real time, maintaining conversational context across multiple rounds. When the user is satisfied (or has nothing to challenge), they advance to the next advisor.

When challenges have been issued, the Board Brief is regenerated to incorporate the advisors' refined positions, ensuring the synthesis reflects the full depth of the discussion.

### 1.2 Why This Feature Exists

The initial Board session is one-directional: the user presents a decision and 8 advisors respond sequentially. This creates two gaps:

1. **No dialogue.** If an advisor makes an assumption the user disagrees with, or if the user wants to probe deeper on a point, there is no mechanism to do so.
2. **Stale synthesis.** The Board Brief is generated from initial takes only. An advisor who would change their position after pushback is represented by their unchallenged view.

Challenge & Reply closes both gaps without disrupting the sequential advisor flow.

### 1.3 Relationship to Product Spec

This feature implements two items from PRODUCT-SPEC.md §5.1:

| Product Spec Feature | This Implementation |
|---|---|
| **Session Continuity** (Phase 2 — Should Have) | Per-advisor challenge/reply within a single session |
| **Clarifying Questions** (Phase 2 — Should Have) | User-initiated rather than persona-initiated; serves the same depth purpose |

---

## 2. User Flow

### 2.1 Happy Path

```
Advisor finishes speaking
        │
        ▼
┌─────────────────────────┐
│  Challenge Input Appears │
│  "Challenge this advisor"│
│  Textarea + Submit button│
│  "Skip" affordance       │
└─────────┬───────────────┘
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
  Skip      Type challenge
    │            │
    │            ▼
    │    ┌──────────────────┐
    │    │  Advisor Replies  │
    │    │  Streamed tokens  │
    │    │  Chat-style thread│
    │    └────────┬─────────┘
    │             │
    │     ┌───────┴────────┐
    │     │                │
    │     ▼                ▼
    │  Challenge again   Satisfied
    │     │                │
    │     └──► (repeat)    │
    │                      │
    ▼                      ▼
┌────────────────────────────┐
│  Next Advisor / Board Brief │
└────────────────────────────┘
```

### 2.2 Challenge During Review

After all advisors have spoken, the user can navigate back to any advisor using the Previous button or the Board Brief's back navigation. The challenge input re-appears if the advisor's response is complete and no challenge is currently streaming.

### 2.3 Board Brief With Challenges

```
All advisors complete
        │
        ▼
  ┌─────────────────┐
  │ Any challenges?  │
  └───┬─────────┬───┘
      │         │
      ▼         ▼
    None     Yes (briefStale=true)
      │         │
      ▼         ▼
  Use cached   POST /api/board/brief
  session brief  Regenerate with
      │         challenge context
      │         │
      ▼         ▼
  Board Brief displayed
  Advisor accordion includes
  challenge exchanges
```

---

## 3. API Contracts

### 3.1 Challenge Endpoint

```
POST /api/board/challenge
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `personaId` | string | yes | Must match a loaded persona ID |
| `decision` | string | yes | Max 5,000 characters |
| `initialResponse` | string | yes | Max 10,000 characters |
| `priorChallenges` | ChallengeExchange[] | yes | Max 10 items |
| `challengeText` | string | yes | Max 2,000 characters |

**Response:** Server-Sent Events stream.

**SSE Event Types:**

| Event | Payload | Description |
|---|---|---|
| `challenge_reply_token` | `{ type, token: string }` | Incremental text token from the advisor |
| `challenge_reply_complete` | `{ type }` | Advisor has finished replying |
| `error` | `{ type, message: string }` | Stream-level error |

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing or invalid fields, constraint violations |
| 500 | LLM or persona loading failure |

### 3.2 Brief Regeneration Endpoint

```
POST /api/board/brief
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `decision` | string | yes | Max 5,000 characters |
| `responses` | PersonaResponse[] | yes | Max 20 items; content max 10,000 chars each; max 10 challenges per response |

**Response:** JSON

```json
{
  "brief": {
    "consensus": { "areas": [...], "strength": "strong|moderate|weak" },
    "tensions": [{ "between": [...], "issue": "...", "implication": "..." }],
    "blindSpots": [...],
    "recommendation": { "summary": "...", "confidence": "high|moderate|low", "conditions": [...] }
  }
}
```

---

## 4. Data Types

### 4.1 ChallengeExchange

```typescript
interface ChallengeExchange {
  challengeText: string;      // User's challenge or follow-up question
  replyContent: string;       // Advisor's streamed reply
  isReplyComplete: boolean;   // True when streaming is finished
}
```

### 4.2 PersonaResponse (Extended)

```typescript
interface PersonaResponse {
  personaId: string;
  personaName: string;
  content: string;            // Initial advisor response
  isComplete: boolean;
  challenges: ChallengeExchange[];  // Added by this feature
}
```

---

## 5. LLM Integration

### 5.1 Challenge Conversation Construction

The challenge endpoint reconstructs the full conversation history for the target persona:

```
System: [persona's system prompt from panel session]

User:   "A user has presented the following decision...
         Provide your perspective as {personaName}..."
Assistant: {initialResponse}

User:   {priorChallenge[0].challengeText}          // if exists
Assistant: {priorChallenge[0].replyContent}         // if exists
...
User:   {challengeText}                             // current challenge
```

This preserves conversational continuity. The persona maintains its voice, rubric-driven reasoning, and awareness of prior exchanges.

### 5.2 Model Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Model | `claude-sonnet-4-20250514` | Same model as initial session for voice consistency |
| Temperature | 0.7 | Same as initial session |
| Max tokens | 1,024 | Sufficient for a focused reply; prevents runaway responses |

### 5.3 Brief Regeneration Prompt

When challenges have occurred, the brief regeneration prompt includes challenge exchanges appended to each advisor's section:

```
### The Strategist
{initial response}

#### Follow-up Discussion
**User**: {challenge text}
**The Strategist**: {reply content}
```

The system prompt includes: _"Some advisors may have received follow-up challenges. Their refined positions should carry more weight than initial takes on those points."_

---

## 6. State Management

### 6.1 Client State

| State | Type | Managed By |
|---|---|---|
| `challengeStatus` | `'idle' \| 'streaming'` | BoardContext |
| `briefStale` | `boolean` | BoardContext — set `true` when any challenge completes |
| `briefLoading` | `boolean` | BoardContext — `true` during regeneration |
| `regeneratedBrief` | `BoardBrief \| null` | BoardContext — replaces session brief when available |
| `challenges` | `ChallengeExchange[]` | Per PersonaResponse in session state |

### 6.2 State Transitions

```
Challenge submitted
  → challengeStatus = 'streaming'
  → blank ChallengeExchange appended to persona's challenges array
  → tokens stream into replyContent

Challenge reply complete
  → challengeStatus = 'idle'
  → isReplyComplete = true
  → briefStale = true

Navigate to Board Brief (briefStale = true)
  → briefLoading = true
  → POST /api/board/brief
  → regeneratedBrief = response
  → briefStale = false
  → briefLoading = false

Navigate to Board Brief (briefStale = false)
  → Use cached session brief or regeneratedBrief instantly

New session starts
  → All challenge/brief state reset to defaults
```

### 6.3 Abort Behaviour

| Trigger | Action |
|---|---|
| User navigates to different advisor | Abort in-flight challenge fetch; remove incomplete exchange from state |
| User starts new challenge while one is streaming | Abort previous; clean up incomplete exchange; start new one |
| New session starts | Abort any active challenge; reset all state |
| Client disconnects | Server-side `ReadableStream.cancel()` aborts the LLM SDK stream |

---

## 7. UI Components

### 7.1 Challenge Input (persona-page.tsx)

**Visibility conditions:**
- Advisor's initial response is complete (`isComplete = true`)
- No challenge reply is currently streaming (`challengeStatus !== 'streaming'`)

**Elements:**
- Label: "Challenge this advisor"
- Textarea: 3 rows, max 2,000 characters, placeholder: "Ask a follow-up question or push back on their perspective..."
- Submit button: "Challenge" (accent colour, disabled when empty)
- Skip affordance: "Skip — nothing to challenge" (subtle text, triggers Next)
- Keyboard shortcut: Cmd+Enter / Ctrl+Enter to submit

### 7.2 Challenge Thread (persona-page.tsx)

Displayed between the advisor's response card and the challenge input:

- **User's challenge:** Right-aligned card, accent border, labelled "You"
- **Advisor's reply:** Left-aligned card, standard border, labelled with persona name
- Streaming reply shows blinking cursor (`streaming-cursor` CSS class)
- Empty reply shows "Thinking..." in italic

Multiple exchanges stack vertically in chronological order.

### 7.3 Navigation Updates

| Condition | Next Button State |
|---|---|
| Advisor still streaming initial response | Disabled |
| Challenge reply streaming | Disabled |
| Last advisor, not all complete | Disabled |
| Last advisor, all complete | Enabled — label: "View Board Brief" |
| All other cases | Enabled — label: "Next" |

### 7.4 Board Brief — Advisor Accordion (board-brief.tsx)

Added at the bottom of the Board Brief page under an "Advisor Responses" heading.

**Accordion row:**
- Advisor name
- Contribution type badge (integrator / challenger / sense-checker)
- Challenge count badge (if any challenges were issued)
- Expand/collapse chevron

**Expanded panel (one at a time):**
- "Initial Response" section with full advisor text
- "Follow-up Discussion" section (if challenges exist) with the same chat-style thread used in persona-page

**Accessibility:**
- `aria-expanded` on button
- `aria-controls` linking button to panel
- `role="region"` on panel
- `aria-label` describing panel content

### 7.5 Board Brief — Loading States

| Condition | Display |
|---|---|
| Brief is null (initial generation in progress) | "Generating Board Brief..." with pulse indicator |
| `briefLoading = true` (regeneration after challenges) | "Regenerating brief with challenge context..." with pulse indicator |
| Brief available, no loading | Full brief content |

### 7.6 Board Brief — Back Navigation

A "← Back to advisors" link navigates to the persona review step, focused on the last advisor.

---

## 8. Performance

### 8.1 Token Buffering

The session stream processes tokens from multiple advisors at high frequency. To reduce React re-renders, tokens are buffered in a `Map<personaId, string>` ref and flushed to state on `requestAnimationFrame`.

- Tokens accumulate in the buffer between frames
- A single RAF callback flushes all buffered tokens in one `setState` call
- On `persona_complete`, any remaining buffered tokens for that persona are flushed synchronously before marking `isComplete = true`

Challenge tokens are not buffered (single-persona, lower volume; per-token setState is acceptable).

### 8.2 Memoisation

`buildEnrichedDecision` (which combines the user's decision with probing question answers) is wrapped in `useMemo` to avoid recomputation on every render.

---

## 9. Security

### 9.1 Input Validation

All API endpoints validate inputs server-side:

| Endpoint | Validation |
|---|---|
| `/api/board/challenge` | `challengeText` max 2,000 chars; `decision` max 5,000; `initialResponse` max 10,000; `priorChallenges` max 10 items |
| `/api/board/brief` | `decision` max 5,000 chars; `responses` max 20 items; per-response `content` max 10,000; per-response `challenges` max 10 |

### 9.2 Client-Side Limits

- Textarea `maxLength={2000}` prevents oversized input at the UI layer
- Server-side validation is the authoritative boundary

### 9.3 Stream Cancellation

When a client disconnects (navigates away, closes tab, or aborts fetch), the server-side `ReadableStream.cancel()` handler aborts the active Anthropic SDK stream, preventing wasted API credits.

---

## 10. Design Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| Challenge is optional | User can skip any advisor | Require at least one challenge | Forcing challenges adds friction without value. The user knows when they want to push back. |
| Multiple rounds per advisor | Unlimited (up to 10 server-side) | Single challenge only | Real dialogue requires follow-up. Capping at 10 prevents abuse while allowing depth. |
| Separate challenge endpoint | Dedicated `/api/board/challenge` | Extend session stream | Decouples challenge flow from session orchestration. Simpler error handling. Allows challenges after session ends. |
| Lazy brief regeneration | Only regenerate if challenges occurred | Always regenerate; never regenerate | Avoids unnecessary API calls when no challenges were made. Ensures the brief reflects the full discussion when they were. |
| Per-advisor abort on navigate | Abort fetch + remove incomplete exchange | Let it finish in background | Prevents ghost state and wasted tokens. Clean UX when switching between advisors. |
| Token buffering (session only) | RAF batching for session tokens | Batch challenge tokens too | Session tokens arrive for multiple personas at high frequency. Challenge tokens are single-persona, lower volume — the overhead of batching isn't justified. |
| Board Brief accordion | One-at-a-time expand | All expandable; tabbed interface | Reduces visual overload. Accordion is a familiar pattern for reviewing multiple items. |

---

## 11. File Inventory

### New Files

| File | Purpose |
|---|---|
| `lib/constants.ts` | Shared constants: `LLM_MODEL`, `ROLE_BADGE_COLORS`, `DEFAULT_BADGE_COLOR` |
| `lib/challenge-stream.ts` | Server-side challenge reply streaming logic |
| `app/api/board/challenge/route.ts` | POST endpoint for challenge SSE stream |
| `app/api/board/brief/route.ts` | POST endpoint for on-demand brief regeneration |

### Modified Files

| File | Changes |
|---|---|
| `lib/types.ts` | Added `ChallengeExchange` interface; added `challenges` field to `PersonaResponse` |
| `lib/use-board-session.ts` | Initialise `challenges: []` on persona_start; added `updateResponse` callback; added RAF token buffering |
| `lib/board-context.tsx` | Challenge state/actions; brief regeneration logic; `briefStale` flag; abort handling; `useMemo` for enriched decision |
| `lib/board-brief.ts` | Include challenge exchanges in synthesis prompt; dynamic persona count |
| `lib/session-stream.ts` | Stream cancellation handler; `challenges: []` in response objects; shared `LLM_MODEL` constant |
| `lib/personas.ts` | Exported `PERSONA_COUNT` |
| `components/persona-page.tsx` | Challenge thread display; challenge input; updated navigation logic; shared constants import |
| `components/board-brief.tsx` | Back button; loading states; advisor accordion with ARIA; challenge count badges; shared constants import |
| `components/step-indicator.tsx` | Dynamic persona count from `profiles.length` |
| `app/page.tsx` | Pass `responses`, `profiles`, `briefLoading`, `onBack` to `BoardBriefDisplay`; render brief when null (for loading state) |
| `app/layout.tsx` | Dynamic persona count from `PERSONA_COUNT` |
| `app/api/board/questions/route.ts` | Dynamic persona count in system prompt |

### Deleted Files

| File | Reason |
|---|---|
| `components/persona-card.tsx` | Orphaned pre-redesign component with undefined theme tokens. Not imported anywhere. |

---

## 12. Testing

### 12.1 API Tests

| # | Test | Expected |
|---|---|---|
| 1 | `GET /api/board/personas` | 200, returns 8 personas with contribution types |
| 2 | `POST /api/board/questions` with valid decision | 200, returns 3-5 questions |
| 3 | `POST /api/board/challenge` with empty decision | 400, validation error |
| 4 | `POST /api/board/challenge` with >2000 char challengeText | 400, validation error |
| 5 | `POST /api/board/challenge` with valid inputs | SSE stream with `challenge_reply_token` + `challenge_reply_complete` |
| 6 | `POST /api/board/challenge` with priorChallenges | SSE stream incorporating prior context |
| 7 | `POST /api/board/brief` with responses including challenges | 200, brief reflects challenge context |
| 8 | `POST /api/board/session` full flow | 8 persona_start + persona_complete events, brief_complete, session_complete |

### 12.2 UI Tests (Manual)

| # | Scenario | Expected |
|---|---|---|
| 1 | Advisor finishes → challenge input appears | Textarea visible below response, Next button enabled |
| 2 | Submit challenge → advisor replies | Chat thread appears, reply streams with cursor, Next disabled during stream |
| 3 | Submit second challenge → multi-round | Second exchange appends to thread, context maintained |
| 4 | Click Skip → next advisor | Advances without creating a challenge exchange |
| 5 | Navigate back during challenge stream | Stream aborted, incomplete exchange removed |
| 6 | All advisors done, no challenges → Board Brief | Brief loads instantly from cached session data |
| 7 | All advisors done, challenges issued → Board Brief | "Regenerating brief..." loading state, then updated brief |
| 8 | Board Brief advisor accordion → expand | Shows full response + challenge thread, ARIA attributes present |
| 9 | Board Brief → "Back to advisors" | Returns to persona review on last advisor |
| 10 | Cmd+Enter in challenge textarea | Submits the challenge |

---

*This specification documents the Advisor Challenge & Reply feature as implemented. It supplements PRODUCT-SPEC.md and should be read alongside that document for full product context.*
