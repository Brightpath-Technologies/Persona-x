// Domain types for The Newsroom. Mirror the Supabase schema (0001_init.sql).

export type Significance = "low" | "medium" | "high";
export type FilingStatus = "new" | "filed" | "spiked";
export type Verification = "unverified" | "verified" | "flagged";
export type EditionStatus =
  | "draft"
  | "in_review"
  | "published"
  | "deferred"
  | "cancelled";

export interface Newsroom {
  id: string;
  owner_id: string;
  name: string;
  masthead: string | null;
  slug: string;
  is_public: boolean;
  token_budget: number;
  created_at: string;
}

export interface Beat {
  id: string;
  newsroom_id: string;
  name: string;
  brief: string;
  recency_days: number;
  significance_floor: Significance;
  model: string;
  max_items: number;
  active: boolean;
  category: string | null;
  cadence_hours: number | null; // auto re-check interval; null/0 = manual
  last_run_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Filing {
  id: string;
  newsroom_id: string;
  beat_id: string | null;
  beat_name: string;
  headline: string;
  summary: string;
  source: string | null;
  url: string | null;
  official: boolean;
  significance: Significance;
  published_at: string | null;
  status: FilingStatus;
  edition_id: string | null;
  filed_at: string;
  verification: Verification;
  verification_note: string | null;
  verified_at: string | null;
}

export interface Correction {
  at: string; // ISO timestamp
  text: string;
}

export interface Edition {
  id: string;
  newsroom_id: string;
  title: string;
  slug: string;
  status: EditionStatus;
  body: string | null;
  board_review: BoardReview | null;
  signed_off_by: string | null;
  published_at: string | null;
  created_at: string;
  editor_note: string | null; // human sign-off rationale (Vaughn Tan rule)
  archived_at: string | null;
  corrections: Correction[];
  last_sent_at: string | null;
}

export type { ContributorRole } from "./roles";
import type { ContributorRole } from "./roles";

export interface Contributor {
  id: string;
  newsroom_id: string;
  name: string;
  role: ContributorRole;
  contact: string | null;
  attribution: string | null;
  rate_note: string | null;
  bio: string | null;
  portfolio_url: string | null;
  active: boolean;
  created_at: string;
}

export type ContributionStatus = "proposed" | "agreed" | "paid";

export interface Contribution {
  id: string;
  newsroom_id: string;
  edition_id: string | null;
  contributor_id: string;
  role: ContributorRole;
  description: string | null;
  amount: number | null;
  currency: string;
  status: ContributionStatus;
  created_at: string;
}

export interface Subscriber {
  id: string;
  newsroom_id: string;
  email: string;
  status: "active" | "unsubscribed";
  email_enabled: boolean;
  confirmed_at: string | null; // double opt-in; null = pending
  token: string;
  created_at: string;
}

export interface DeskRun {
  id: string;
  newsroom_id: string;
  beat_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  filed_count: number;
  ran_at: string;
}

// --- Engine value objects (not persisted as-is) -----------------------------

/** A single story a desk files. Matches the JSON contract desks must return. */
export interface DraftFiling {
  headline: string;
  summary: string;
  source: string | null;
  url: string | null;
  official: boolean;
  significance: Significance;
  published_at: string | null; // ISO date or null when undated
}

/** One editorial-board member's verdict on a draft edition. */
export interface BoardVerdict {
  persona: string;
  contribution: string; // e.g. "challenger"
  verdict: "publish" | "hold" | "revise";
  rationale: string;
  flags: string[];
}

export interface BoardReview {
  reviewed_at: string;
  verdicts: BoardVerdict[];
  consensus: "publish" | "hold" | "revise";
}
