import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileProvider } from "@/lib/profile-context";
import { SettingsModal } from "@/components/settings-modal";
import { EngineNav } from "@/components/engine/engine-nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Persona-X by BrightPath Technologies",
  description: "AI advisory frameworks for decisions that matter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-AU"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-board-bg text-board-text font-sans antialiased">
        <ThemeProvider>
          <ProfileProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:rounded-lg focus:bg-board-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-board-accent-contrast"
          >
            Skip to main content
          </a>
          <header className="bg-board-surface/95 backdrop-blur-md border-b border-board-border shadow-sm px-6 py-6">
            <div className="mx-auto max-w-3xl flex items-center justify-between">
              <Link href="/" className="group">
                <h1 className="text-4xl font-bold text-board-text tracking-tight group-hover:text-board-accent transition-colors">
                  Persona-X
                </h1>
                <p className="text-sm text-board-text-secondary mt-1">
                  by BrightPath Technologies
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <EngineNav />
                <SettingsModal />
              </div>
            </div>
          </header>
          <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">{children}</main>
          <footer className="border-t border-board-border bg-board-surface mt-12">
            <div className="mx-auto max-w-3xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <p className="text-xs text-board-text-tertiary">
                  © {new Date().getFullYear()} BrightPath Technologies. Toronto, Ontario, Canada.
                </p>
                <a
                  href="https://brightpathtechnology.io"
                  className="text-xs text-board-accent hover:opacity-80 transition-opacity"
                >
                  brightpathtechnology.io ↗
                </a>
              </div>
              <nav className="flex items-center gap-5" aria-label="Legal">
                <Link href="/contact" className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors">Contact</Link>
                <Link href="/privacy" className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-xs text-board-text-tertiary hover:text-board-text-secondary transition-colors">Terms of Use</Link>
              </nav>
            </div>
          </footer>
          </ProfileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
