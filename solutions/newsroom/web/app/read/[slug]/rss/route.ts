import { createClient } from "@/lib/supabase/server";
import type { Edition, Newsroom } from "@/lib/types";

/** RSS 2.0 feed of a public newsroom's published editions (syndication). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("newsrooms")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single<Newsroom>();
  if (!room) return new Response("Not found", { status: 404 });

  const { data: editions } = await supabase
    .from("editions")
    .select("*")
    .eq("newsroom_id", room.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50)
    .returns<Edition[]>();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = `${site}/read/${room.slug}`;

  const items = (editions ?? [])
    .map((e) => {
      const url = `${link}#${e.slug}`;
      const date = e.published_at
        ? new Date(e.published_at).toUTCString()
        : new Date(e.created_at).toUTCString();
      return [
        "<item>",
        `<title>${escapeXml(e.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="false">${e.id}</guid>`,
        `<pubDate>${date}</pubDate>`,
        `<description>${escapeXml((e.body ?? "").slice(0, 500))}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>${escapeXml(room.name)}</title>` +
    `<link>${escapeXml(link)}</link>` +
    `<description>${escapeXml(room.masthead ?? "Published editions")}</description>` +
    items +
    `</channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
