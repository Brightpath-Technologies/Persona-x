import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Markdown from "@/components/Markdown";
import SubscribeForm from "@/components/SubscribeForm";
import ViewBeacon from "@/components/ViewBeacon";
import { roleLabel } from "@/lib/roles";
import type { Edition, Newsroom } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public front page for a newsroom (syndication). Shows only PUBLISHED,
 * non-archived editions of a PUBLIC newsroom — enforced by RLS, so this works
 * for signed-out readers. Carries provenance, corrections, and human credits.
 */
export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("newsrooms")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single<Newsroom>();
  if (!room) notFound();

  const { data: editions } = await supabase
    .from("editions")
    .select("*")
    .eq("newsroom_id", room.id)
    .eq("status", "published")
    .is("archived_at", null)
    .order("published_at", { ascending: false })
    .returns<Edition[]>();

  const list = editions ?? [];

  // Attribution-safe credits only (role + byline), fetched server-side with the
  // service client so the private compensation ledger is never exposed.
  const creditsByEdition = new Map<string, { role: string; description: string }[]>();
  if (list.length > 0) {
    const svc = createServiceClient();
    const { data: creds } = await svc
      .from("contributions")
      .select("edition_id, role, description")
      .in(
        "edition_id",
        list.map((e) => e.id)
      )
      .not("description", "is", null);
    for (const c of (creds ?? []) as {
      edition_id: string;
      role: string;
      description: string;
    }[]) {
      const arr = creditsByEdition.get(c.edition_id) ?? [];
      arr.push({ role: c.role, description: c.description });
      creditsByEdition.set(c.edition_id, arr);
    }
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-ink-700 pb-6 text-center">
        <h1 className="font-serif text-4xl text-paper-50">{room.name}</h1>
        {room.masthead && (
          <p className="mt-1 text-sm text-paper-300">{room.masthead}</p>
        )}
        <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-brass-600">
          Published editions
        </p>
        <div className="mx-auto mt-4 max-w-md">
          <SubscribeForm slug={room.slug} />
        </div>
      </header>

      {list.length === 0 ? (
        <p className="text-center text-sm text-paper-300">
          No published editions yet.
        </p>
      ) : (
        <div className="space-y-12">
          {list.map((e) => {
            const credits = creditsByEdition.get(e.id) ?? [];
            return (
              <article
                key={e.id}
                className="border-b border-ink-800 pb-10 last:border-0"
              >
                <ViewBeacon editionId={e.id} />
                <p className="mb-2 text-[11px] uppercase tracking-widest text-paper-500">
                  {e.published_at
                    ? new Date(e.published_at).toLocaleDateString("en-AU", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </p>

                {e.corrections.length > 0 && (
                  <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                    <span className="text-[11px] uppercase tracking-widest text-amber-300">
                      Corrections
                    </span>
                    <ul className="mt-1 space-y-1 text-paper-200">
                      {e.corrections.map((c, i) => (
                        <li key={i}>
                          <span className="text-paper-500">
                            {new Date(c.at).toLocaleDateString("en-AU")}:
                          </span>{" "}
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {e.body && <Markdown source={e.body} />}

                {credits.length > 0 && (
                  <p className="mt-4 text-xs text-paper-400">
                    <span className="uppercase tracking-wide text-paper-500">
                      Credits:
                    </span>{" "}
                    {credits
                      .map((c) => `${c.description} (${roleLabel(c.role)})`)
                      .join(" · ")}
                  </p>
                )}

                <p className="mt-3 text-[11px] text-paper-500">
                  Researched by AI desks; selected, verified, edited and signed
                  off by a human editor.
                  {e.editor_note ? ` Editor's note: “${e.editor_note}”` : ""}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <footer className="border-t border-ink-800 pt-5 text-center text-xs text-paper-500">
        <Link href={`/read/${room.slug}/rss`} className="hover:text-brass-400">
          RSS feed
        </Link>
      </footer>
    </div>
  );
}
