import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnvironment } from "@/lib/env";

/**
 * LIFE OS — Supabase Server Client
 *
 * Used by:
 *
 * - Server Components
 * - Route Handlers
 * - Server-side authentication
 * - Server-side data access
 *
 * Security:
 *
 * - Uses only the Supabase Publishable Key.
 * - Never uses service_role.
 * - Session state is read from secure SSR cookies.
 * - Final authorization remains enforced by PostgreSQL RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const {
    url,
    publishableKey,
  } = getSupabasePublicEnvironment();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet, headers) {
          // The current @supabase/ssr adapter provides response
          // headers together with refreshed cookies.
          //
          // Server Components cannot directly write response
          // headers here. Proxy owns the request/response refresh
          // boundary later in the LIFE OS architecture.
          void headers;

          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            /**
             * `setAll` may be called while rendering a Server
             * Component, where Next.js does not allow cookie
             * mutation.
             *
             * This is safe to ignore because LIFE OS uses
             * proxy.ts to refresh authentication sessions.
             *
             * Route Handlers and other writable server contexts
             * can update cookies normally.
             */
          }
        },
      },
    },
  );
}


/**
 * Shared type for server-side LIFE OS code.
 */
export type ServerSupabaseClient =
  Awaited<
    ReturnType<typeof createClient>
  >;


/**
 * SECURITY BOUNDARY
 *
 * Never replace the Publishable Key above with:
 *
 * - service_role
 * - secret API keys
 * - admin credentials
 *
 * Normal LIFE OS runtime intentionally operates through the
 * authenticated user's session so PostgreSQL RLS remains in
 * the authorization path.
 *
 * Authentication proof must later use trusted Supabase Auth
 * verification methods rather than treating locally stored
 * session data alone as authorization proof.
 */