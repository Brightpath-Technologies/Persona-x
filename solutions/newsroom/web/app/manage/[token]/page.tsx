import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PreferencesForm from "@/components/PreferencesForm";
import type { Newsroom, Subscriber } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Subscriber self-service preferences page (token from the email footer).
 * Public — looks the subscriber up by token via the service client.
 */
export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: sub } = await supabase
    .from("subscribers")
    .select("*")
    .eq("token", token)
    .maybeSingle<Subscriber>();
  if (!sub) notFound();

  const { data: room } = await supabase
    .from("newsrooms")
    .select("name, slug")
    .eq("id", sub.newsroom_id)
    .single<Pick<Newsroom, "name" | "slug">>();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const rssUrl = room ? `${site}/read/${room.slug}/rss` : "#";

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl font-light text-paper-50">
          Notification preferences
        </h1>
        <p className="mt-1 text-sm text-grey">
          {room ? room.name : "The Newsroom"} · {sub.email}
        </p>
      </header>
      <PreferencesForm
        token={sub.token}
        initialStatus={sub.status}
        initialEmail={sub.email_enabled}
        rssUrl={rssUrl}
      />
    </div>
  );
}
