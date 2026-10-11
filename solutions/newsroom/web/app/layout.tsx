import type { Metadata } from "next";
import { Poppins, Lato } from "next/font/google";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-poppins",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://newsroom.brightpathtechnology.io"),
  title: "The Newsroom · BrightPath Technology",
  description: "Run your own AI research desk.",
};

const NAV_APP = [
  { href: "/", label: "Front Page" },
  { href: "/newsroom", label: "The Newsroom" },
  { href: "/wire", label: "The Wire" },
  { href: "/editions", label: "Editions" },
  { href: "/contributors", label: "Contributors" },
  { href: "/subscribers", label: "Subscribers" },
  { href: "/analytics", label: "Readership" },
  { href: "/about", label: "About" },
];

const NAV_PUBLIC = [
  { href: "/about", label: "About" },
  { href: "/login", label: "Editor sign in" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nav = user ? NAV_APP : NAV_PUBLIC;

  // "Home" for a signed-in editor jumps to their public newsroom page (slug).
  let homeHref = "/";
  if (user) {
    const { data: room } = await supabase
      .from("newsrooms")
      .select("slug, is_public")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (room?.is_public) homeHref = `/read/${room.slug}`;
  }

  return (
    <html lang="en" className={`${poppins.variable} ${lato.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-50 border-b border-line bg-paper-50/0 bg-white/85 backdrop-blur">
          <div className="mx-auto max-w-5xl px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="group flex items-center gap-3.5">
                <BrandMark className="h-10 w-10 text-navy" />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-2xl font-light tracking-tight text-paper-50">
                    The Newsroom
                  </span>
                  <span className="mt-1 text-[9.5px] uppercase tracking-[0.32em] text-grey">
                    BrightPath Technology
                  </span>
                </span>
              </Link>
              <span className="hidden text-[11px] uppercase tracking-widest text-paper-500 sm:block">
                Drafts for human sign-off
              </span>
            </div>
            <nav className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-line pt-3 text-sm">
              {user && (
                <Link href={homeHref} className="text-grey hover:text-navy">
                  Home
                </Link>
              )}
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-grey hover:text-navy"
                >
                  {n.label}
                </Link>
              ))}
              {user && (
                <form action={signOut} className="ml-auto">
                  <button className="text-grey hover:text-navy">Log out</button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-5 pb-10 pt-6 text-xs text-paper-500">
          The Newsroom · editions are drafts until the Editor-in-Chief signs
          off. A{" "}
          <a
            href="https://brightpathtechnology.io"
            className="text-grey hover:text-navy"
          >
            BrightPath Technology
          </a>{" "}
          platform.{" "}
          <Link href="/privacy" className="text-grey hover:text-navy">
            Privacy
          </Link>
        </footer>
      </body>
    </html>
  );
}
