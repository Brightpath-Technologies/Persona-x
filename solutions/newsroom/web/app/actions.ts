"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { safeHttpUrl } from "@/lib/url";
import { DEFAULT_MODEL } from "@/lib/pricing";

/** Sign out and return to the public newsroom page (the slug), or the landing. */
export async function signOut() {
  const supabase = await createClient();
  let dest = "/";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: room } = await supabase
      .from("newsrooms")
      .select("slug, is_public")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (room?.is_public) dest = `/read/${room.slug}`;
  }
  await supabase.auth.signOut();
  redirect(dest);
}

/** Found a new newsroom and seed it with two starter beats. */
export async function createNewsroom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const masthead = String(formData.get("masthead") ?? "").trim() || null;
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: room } = await supabase
    .from("newsrooms")
    .insert({ owner_id: user.id, name, masthead, slug })
    .select("id")
    .single();

  if (room) {
    await supabase.from("beats").insert([
      {
        newsroom_id: room.id,
        name: "Sector watch",
        brief:
          "Significant developments in our sector and among direct competitors.",
        recency_days: 7,
        significance_floor: "medium",
        model: DEFAULT_MODEL,
      },
      {
        newsroom_id: room.id,
        name: "Policy & regulation",
        brief: "New policy, regulation, or official guidance affecting us.",
        recency_days: 14,
        significance_floor: "medium",
        model: DEFAULT_MODEL,
      },
    ]);
  }

  revalidatePath("/");
  redirect("/newsroom");
}

/** Hire a desk for a new beat. */
export async function createBeat(formData: FormData) {
  const newsroomId = String(formData.get("newsroomId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  if (!newsroomId || !name || !brief) return;

  const cadence = Number(formData.get("cadence_hours") ?? 0);
  const supabase = await createClient();
  await supabase.from("beats").insert({
    newsroom_id: newsroomId,
    name,
    brief,
    recency_days: Number(formData.get("recency_days") ?? 7),
    significance_floor: String(formData.get("significance_floor") ?? "medium"),
    model: String(formData.get("model") ?? DEFAULT_MODEL),
    category: String(formData.get("category") ?? "").trim() || null,
    cadence_hours: cadence > 0 ? cadence : null,
  });
  revalidatePath("/newsroom");
}

export async function toggleBeat(formData: FormData) {
  const id = String(formData.get("beatId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("beats").update({ active: !active }).eq("id", id);
  revalidatePath("/newsroom");
}

/** Set a beat's automatic re-check cadence (hours; 0 = manual only). */
export async function setBeatCadence(formData: FormData) {
  const id = String(formData.get("beatId") ?? "");
  if (!id) return;
  const hours = Number(formData.get("cadence_hours") ?? 0);
  const supabase = await createClient();
  await supabase
    .from("beats")
    .update({ cadence_hours: hours > 0 ? hours : null })
    .eq("id", id);
  revalidatePath("/newsroom");
}

/** Archive a beat — hidden + paused, but retained and restorable. */
export async function archiveBeat(formData: FormData) {
  const id = String(formData.get("beatId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("beats")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/newsroom");
}

/** Restore an archived beat back to the active roster. */
export async function restoreBeat(formData: FormData) {
  const id = String(formData.get("beatId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("beats").update({ archived_at: null }).eq("id", id);
  revalidatePath("/newsroom");
}

/** Permanently delete a beat. Past filings are kept (beat_id set null). */
export async function deleteBeat(formData: FormData) {
  const id = String(formData.get("beatId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("beats").delete().eq("id", id);
  revalidatePath("/newsroom");
}

/**
 * Set a story's verification state (the sourcing-standards gate): verified means
 * the editor confirmed it (ideally a second source); flagged means single-source
 * or unconfirmed; unverified resets it. Records who/when.
 */
export async function verifyFiling(formData: FormData) {
  const id = String(formData.get("filingId") ?? "");
  const state = String(formData.get("verification") ?? "");
  const note = String(formData.get("verification_note") ?? "").trim() || null;
  const editionId = String(formData.get("editionId") ?? "");
  if (!id || !["unverified", "verified", "flagged"].includes(state)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("filings")
    .update({
      verification: state,
      verification_note: note,
      verified_by: state === "verified" ? user?.id ?? null : null,
      verified_at: state === "verified" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/wire");
  if (editionId) revalidatePath(`/editions/${editionId}`);
}

/** Spike a filing — pull it from the wire so it won't reach an edition. */
export async function spikeFiling(formData: FormData) {
  const id = String(formData.get("filingId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("filings").update({ status: "spiked" }).eq("id", id);
  revalidatePath("/wire");
}

/** Toggle whether a newsroom's published editions are publicly readable. */
export async function toggleNewsroomPublic(formData: FormData) {
  const id = String(formData.get("newsroomId") ?? "");
  const isPublic = String(formData.get("isPublic") ?? "") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("newsrooms").update({ is_public: !isPublic }).eq("id", id);
  revalidatePath("/editions");
}

/** Owner adds a subscriber manually (e.g. from a paper sign-up sheet). */
export async function addSubscriberManual(formData: FormData) {
  const newsroomId = String(formData.get("newsroomId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!newsroomId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  const supabase = await createClient();
  // Owner-added subscribers are auto-confirmed (the owner vouches).
  await supabase
    .from("subscribers")
    .upsert(
      {
        newsroom_id: newsroomId,
        email,
        status: "active",
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "newsroom_id,email" }
    );
  revalidatePath("/subscribers");
}

/** Owner confirms a pending subscriber manually (vouches for them). */
export async function confirmSubscriber(formData: FormData) {
  const id = String(formData.get("subscriberId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("subscribers")
    .update({ confirmed_at: new Date().toISOString(), status: "active" })
    .eq("id", id);
  revalidatePath("/subscribers");
}

/** Owner removes a subscriber. */
export async function removeSubscriber(formData: FormData) {
  const id = String(formData.get("subscriberId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("subscribers").delete().eq("id", id);
  revalidatePath("/subscribers");
}

/** Set a readable public slug (the /read/<slug> URL). Appends a suffix on clash. */
export async function setNewsroomSlug(formData: FormData) {
  const id = String(formData.get("newsroomId") ?? "");
  let slug = slugify(String(formData.get("slug") ?? ""));
  if (!id || !slug) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("newsrooms")
    .update({ slug })
    .eq("id", id);
  if (error) {
    // slug already taken — append a short suffix to guarantee uniqueness
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    await supabase.from("newsrooms").update({ slug }).eq("id", id);
  }
  revalidatePath("/editions");
}

/**
 * Credit a human contributor on an edition with what they did and what they are
 * owed — recognising, attributing, and compensating real human work alongside
 * the AI desks. Creates the contributor record on first use.
 */
export async function addCredit(formData: FormData) {
  const newsroomId = String(formData.get("newsroomId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "writer");
  const description = String(formData.get("description") ?? "").trim() || null;
  const attribution = String(formData.get("attribution") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;
  const currency = String(formData.get("currency") ?? "CAD");
  if (!newsroomId || !editionId || !name) return;

  const supabase = await createClient();

  // find-or-create the contributor (by name within the newsroom)
  const { data: existing } = await supabase
    .from("contributors")
    .select("id")
    .eq("newsroom_id", newsroomId)
    .ilike("name", name)
    .maybeSingle();

  let contributorId = existing?.id as string | undefined;
  if (!contributorId) {
    const { data: created } = await supabase
      .from("contributors")
      .insert({ newsroom_id: newsroomId, name, role, attribution })
      .select("id")
      .single();
    contributorId = created?.id;
  }
  if (!contributorId) return;

  await supabase.from("contributions").insert({
    newsroom_id: newsroomId,
    edition_id: editionId,
    contributor_id: contributorId,
    role,
    description,
    amount,
    currency,
    status: "proposed",
  });

  revalidatePath(`/editions/${editionId}`);
}

/**
 * Create or update a contributor profile in the directory. With contributorId
 * it updates by id; otherwise it creates a new contributor.
 */
export async function upsertContributor(formData: FormData) {
  const newsroomId = String(formData.get("newsroomId") ?? "");
  const contributorId = String(formData.get("contributorId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!newsroomId || !name) return;

  const fields = {
    name,
    role: String(formData.get("role") ?? "writer"),
    contact: String(formData.get("contact") ?? "").trim() || null,
    attribution: String(formData.get("attribution") ?? "").trim() || null,
    rate_note: String(formData.get("rate_note") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    // only store http(s) URLs — reject javascript:/data: etc. (href XSS)
    portfolio_url: safeHttpUrl(String(formData.get("portfolio_url") ?? "")),
    // checkbox + hidden "false" companion: take the LAST submitted value
    active: String(formData.getAll("active").pop() ?? "true") === "true",
  };

  const supabase = await createClient();
  if (contributorId) {
    await supabase.from("contributors").update(fields).eq("id", contributorId);
  } else {
    await supabase
      .from("contributors")
      .insert({ newsroom_id: newsroomId, ...fields });
  }
  revalidatePath("/contributors");
}

/** Remove a contributor from the directory (their past credits are kept). */
export async function deleteContributor(formData: FormData) {
  const id = String(formData.get("contributorId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("contributors").delete().eq("id", id);
  revalidatePath("/contributors");
}

/** Advance a contribution through proposed → agreed → paid. */
export async function setContributionStatus(formData: FormData) {
  const id = String(formData.get("contributionId") ?? "");
  const editionId = String(formData.get("editionId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["proposed", "agreed", "paid"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("contributions").update({ status }).eq("id", id);
  if (editionId) revalidatePath(`/editions/${editionId}`);
}
