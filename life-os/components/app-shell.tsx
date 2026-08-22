import type {
  ReactNode,
} from "react";

import {
  Sidebar,
} from "@/components/sidebar";

import {
  Topbar,
} from "@/components/topbar";


/* =========================================================
 * 1. PROPS
 * ======================================================= */

export interface AppShellProps {
  children: ReactNode;
}


/* =========================================================
 * 2. APP SHELL
 * ======================================================= */

/**
 * LIFE OS primary authenticated application shell.
 *
 * Structure:
 *
 * Sidebar
 *      +
 * Topbar
 *      +
 * Main Content
 *
 * This component intentionally contains no business logic,
 * authentication logic or database access.
 *
 * Protected pages remain responsible for authentication at
 * the page/server boundary.
 */
export function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
      >
        انتقل إلى المحتوى الرئيسي
      </a>

      <Sidebar />

      <div className="app-shell__workspace">
        <Topbar />

        <main
          id="main-content"
          className="app-shell__main"
          tabIndex={-1}
        >
          <div className="app-shell__content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


/* =========================================================
 * 3. ARCHITECTURE RULE
 * ======================================================= */

/**
 * AppShell remains a Server Component.
 *
 * It does NOT use:
 *
 * "use client"
 *
 * Client-side behavior belongs only in the smallest component
 * that actually requires browser state or interaction.
 *
 * Example:
 *
 * Sidebar may use client behavior for mobile navigation.
 *
 * The entire application shell does not need to become a
 * Client Component because of that.
 */


/* =========================================================
 * 4. RESPONSIVE RULE
 * ======================================================= */

/**
 * Desktop:
 *
 * ┌───────────────┬───────────────────────────────┐
 * │               │ Topbar                        │
 * │   Sidebar     ├───────────────────────────────┤
 * │               │                               │
 * │               │ Main Content                  │
 * │               │                               │
 * └───────────────┴───────────────────────────────┘
 *
 *
 * Mobile:
 *
 * ┌───────────────────────────────────────────────┐
 * │ Topbar                                        │
 * ├───────────────────────────────────────────────┤
 * │                                               │
 * │ Main Content                                  │
 * │                                               │
 * └───────────────────────────────────────────────┘
 *
 * Sidebar mobile behavior is handled by Sidebar + CSS.
 */


/* =========================================================
 * 5. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * The shell includes a keyboard-accessible skip link.
 *
 * This allows keyboard and assistive-technology users to jump
 * directly past navigation to:
 *
 * #main-content
 *
 * Main content also has tabIndex={-1} so it can receive focus
 * when targeted by the skip link.
 */


/* =========================================================
 * 6. UI PRINCIPLE
 * ======================================================= */

/**
 * The shell should never become visually busy.
 *
 * Permanent LIFE OS interface rule:
 *
 * Navigation
 * +
 * Context
 * +
 * Content
 *
 * No unnecessary:
 *
 * - banners
 * - widgets
 * - decorative panels
 * - duplicated navigation
 * - excessive status indicators
 *
 * Simple outside.
 * Intelligent underneath.
 */