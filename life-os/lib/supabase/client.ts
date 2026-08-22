"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnvironment } from "@/lib/env";
/**
 * LIFE OS — Supabase Browser Client
 *
 * Browser responsibilities:
 *
 * - authentication UI
 * - session-aware browser requests
 * - authorized user interactions
 *
 * Security:
 *
 * - Uses only the Supabase Project URL.
 * - Uses only the browser-safe Publishable Key.
 * - Never uses service_role.
 * - Never contains private server secrets.
 * - Final database authorization is enforced by RLS.
 */
export function createClient() {
  const {
    url,
    publishableKey,
  } = getSupabasePublicEnvironment();
  return createBrowserClient(
    url,
    publishableKey,
  );
}
/**
 * Convenience type for code that needs the browser
 * Supabase client type without creating a separate manual
 * definition.
 */
export type BrowserSupabaseClient =
  ReturnType<typeof createClient>;
/**
 * SECURITY RULE
 *
 * This browser client is not an authorization boundary.
 *
 * The Publishable Key is intentionally browser-safe.
 *
 * Access to LIFE OS data remains protected by:
 *
 * Authentication
 *      ↓
 * MFA / AAL2
 *      ↓
 * PostgreSQL RLS
 *      ↓
 * Row ownership
 *
 * Never add a service-role key or server secret here.
 */