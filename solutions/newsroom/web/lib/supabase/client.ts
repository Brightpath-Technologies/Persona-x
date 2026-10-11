import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (anon key). Used by client components for auth
 * and reads. RLS enforces per-user isolation.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
