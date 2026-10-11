// URL safety helpers. Only http(s) URLs may be stored/rendered in hrefs —
// rejecting javascript:, data:, and other schemes that enable href XSS.

/** Normalise to a safe http(s) URL string, or null if it isn't one. */
export function safeHttpUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** True only for http(s) URLs — for a defensive render-time guard. */
export function isHttpUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && safeHttpUrl(value) !== null;
}
