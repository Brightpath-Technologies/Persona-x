import { createClient } from "@/lib/supabase/server";
import type {
  Beat,
  Contribution,
  Contributor,
  Edition,
  Filing,
  Newsroom,
  Subscriber,
} from "@/lib/types";

/**
 * The current user's newsrooms (multi-newsroom workspaces). The first is the
 * "active" one for single-newsroom views until a switcher is added.
 */
export async function getNewsrooms(): Promise<Newsroom[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsrooms")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Newsroom[]>();
  return data ?? [];
}

/**
 * The most recent PUBLIC newsroom — visible to signed-out visitors via the
 * newsrooms_public_read policy. Used by the landing page's "read / subscribe".
 */
export async function getFeaturedPublicNewsroom(): Promise<Newsroom | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsrooms")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Newsroom>();
  return data ?? null;
}

export async function getNewsroom(id: string): Promise<Newsroom | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsrooms")
    .select("*")
    .eq("id", id)
    .single<Newsroom>();
  return data ?? null;
}

/** Live beats (not archived). */
export async function getBeats(newsroomId: string): Promise<Beat[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beats")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .returns<Beat[]>();
  return data ?? [];
}

/** Archived beats, for the restore/delete section. */
export async function getArchivedBeats(newsroomId: string): Promise<Beat[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beats")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .returns<Beat[]>();
  return data ?? [];
}

export async function getWire(newsroomId: string): Promise<Filing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("filings")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .in("status", ["new", "filed"])
    .is("edition_id", null)
    .order("filed_at", { ascending: false })
    .returns<Filing[]>();
  return data ?? [];
}

export async function getEditions(newsroomId: string): Promise<Edition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("editions")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .order("created_at", { ascending: false })
    .returns<Edition[]>();
  return data ?? [];
}

/** The filings that make up an edition (for verification + sourcing review). */
export async function getEditionFilings(editionId: string): Promise<Filing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("filings")
    .select("*")
    .eq("edition_id", editionId)
    .order("official", { ascending: false })
    .returns<Filing[]>();
  return data ?? [];
}

export async function getEdition(id: string): Promise<Edition | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("editions")
    .select("*")
    .eq("id", id)
    .single<Edition>();
  return data ?? null;
}

export interface EditionEngagement {
  editionId: string;
  title: string;
  status: string;
  opens: number;
  clicks: number;
  views: number;
}

export interface Analytics {
  subscribers: {
    total: number;
    active: number;
    unsubscribed: number;
    newThisMonth: number;
    emailOff: number;
  };
  totals: { opens: number; clicks: number; views: number };
  perEdition: EditionEngagement[];
}

/** Readership analytics: subscriber growth + per-edition engagement. */
export async function getAnalytics(newsroomId: string): Promise<Analytics> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [subRes, evRes, edRes] = await Promise.all([
    supabase
      .from("subscribers")
      .select("status, email_enabled, created_at")
      .eq("newsroom_id", newsroomId),
    supabase
      .from("events")
      .select("edition_id, type")
      .eq("newsroom_id", newsroomId),
    supabase
      .from("editions")
      .select("id, title, status")
      .eq("newsroom_id", newsroomId),
  ]);

  const subs =
    (subRes.data as
      | { status: string; email_enabled: boolean; created_at: string }[]
      | null) ?? [];
  const events =
    (evRes.data as { edition_id: string | null; type: string }[] | null) ?? [];
  const editions =
    (edRes.data as { id: string; title: string; status: string }[] | null) ??
    [];

  const subscribers = {
    total: subs.length,
    active: subs.filter((s) => s.status === "active").length,
    unsubscribed: subs.filter((s) => s.status === "unsubscribed").length,
    newThisMonth: subs.filter(
      (s) => new Date(s.created_at) >= monthStart
    ).length,
    emailOff: subs.filter((s) => s.status === "active" && !s.email_enabled)
      .length,
  };

  const totals = { opens: 0, clicks: 0, views: 0 };
  const byEdition = new Map<string, { opens: number; clicks: number; views: number }>();
  for (const e of events) {
    if (e.type === "open") totals.opens++;
    else if (e.type === "click") totals.clicks++;
    else if (e.type === "view") totals.views++;
    if (!e.edition_id) continue;
    const rec = byEdition.get(e.edition_id) ?? { opens: 0, clicks: 0, views: 0 };
    if (e.type === "open") rec.opens++;
    else if (e.type === "click") rec.clicks++;
    else if (e.type === "view") rec.views++;
    byEdition.set(e.edition_id, rec);
  }

  const titles = new Map(editions.map((e) => [e.id, e]));
  const perEdition: EditionEngagement[] = [...byEdition.entries()]
    .map(([editionId, rec]) => ({
      editionId,
      title: titles.get(editionId)?.title ?? "(removed)",
      status: titles.get(editionId)?.status ?? "",
      ...rec,
    }))
    .sort((a, b) => b.views + b.opens - (a.views + a.opens));

  return { subscribers, totals, perEdition };
}

export interface MonthSpend {
  filed: number;
  inputTokens: number;
  outputTokens: number;
}

/** Token spend this calendar month, for the budget cockpit. */
export async function getMonthSpend(newsroomId: string): Promise<MonthSpend> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("desk_runs")
    .select("input_tokens, output_tokens, filed_count")
    .eq("newsroom_id", newsroomId)
    .gte("ran_at", since.toISOString());

  const rows =
    (data as
      | { input_tokens: number; output_tokens: number; filed_count: number }[]
      | null) ?? [];
  return rows.reduce<MonthSpend>(
    (acc, r) => ({
      filed: acc.filed + r.filed_count,
      inputTokens: acc.inputTokens + r.input_tokens,
      outputTokens: acc.outputTokens + r.output_tokens,
    }),
    { filed: 0, inputTokens: 0, outputTokens: 0 }
  );
}

// --- distribution + human contributors --------------------------------------

export async function getSubscribers(
  newsroomId: string
): Promise<Subscriber[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscribers")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .order("created_at", { ascending: false })
    .returns<Subscriber[]>();
  return data ?? [];
}

export async function getContributors(
  newsroomId: string
): Promise<Contributor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contributors")
    .select("*")
    .eq("newsroom_id", newsroomId)
    .order("name", { ascending: true })
    .returns<Contributor[]>();
  return data ?? [];
}

export interface ContributorStats extends Contributor {
  creditCount: number;
  /** per-currency compensation: paid vs still outstanding */
  totals: Record<string, { paid: number; outstanding: number }>;
}

/** Contributors directory with each person's credit count + compensation totals. */
export async function getContributorLedger(
  newsroomId: string
): Promise<ContributorStats[]> {
  const supabase = await createClient();
  const [contribRes, contributionRes] = await Promise.all([
    supabase
      .from("contributors")
      .select("*")
      .eq("newsroom_id", newsroomId)
      .order("name", { ascending: true })
      .returns<Contributor[]>(),
    supabase
      .from("contributions")
      .select("contributor_id, amount, currency, status")
      .eq("newsroom_id", newsroomId),
  ]);

  const contributions =
    (contributionRes.data as
      | {
          contributor_id: string;
          amount: number | null;
          currency: string;
          status: string;
        }[]
      | null) ?? [];

  return (contribRes.data ?? []).map((c) => {
    const mine = contributions.filter((x) => x.contributor_id === c.id);
    const totals: Record<string, { paid: number; outstanding: number }> = {};
    for (const x of mine) {
      if (x.amount == null) continue;
      const t = (totals[x.currency] ??= { paid: 0, outstanding: 0 });
      if (x.status === "paid") t.paid += Number(x.amount);
      else t.outstanding += Number(x.amount);
    }
    return { ...c, creditCount: mine.length, totals };
  });
}

export interface Credit extends Contribution {
  contributor: Contributor;
}

/** Credits (attribution + compensation) attached to one edition. */
export async function getEditionCredits(editionId: string): Promise<Credit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contributions")
    .select("*, contributor:contributors(*)")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true })
    .returns<Credit[]>();
  return data ?? [];
}
