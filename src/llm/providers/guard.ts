import { OfflineViolationError, type ProviderName } from "./types.js";

/**
 * Offline Hard-Block
 *
 * When PERSONA_X_OFFLINE=1 the guard rejects any hostname outside
 * localhost / loopback, regardless of provider. This gives operators
 * a single env var to guarantee no data leaves the machine.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function isOfflineMode(): boolean {
  const value = process.env.PERSONA_X_OFFLINE;
  return value === "1" || value === "true";
}

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

/**
 * Throw OfflineViolationError if offline mode is on and the target
 * URL is not a local host. Call this before every outbound request.
 */
export function assertOfflineCompliant(
  provider: ProviderName,
  url: string
): void {
  if (!isOfflineMode()) return;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new OfflineViolationError(provider, url);
  }

  if (!isLocalHost(hostname)) {
    throw new OfflineViolationError(provider, url);
  }
}
