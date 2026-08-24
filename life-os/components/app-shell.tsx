import type {
  ReactNode,
} from "react";

import {
  Sidebar,
} from "@/components/sidebar";

import {
  Topbar,
} from "@/components/topbar";

import {
  UniversalAdd,
} from "@/components/universal-add";


/* =========================================================
 * LIFE OS V2
 * APP SHELL
 *
 * Global authenticated application structure:
 *
 * Sidebar
 * +
 * Topbar
 * +
 * Main Content
 * +
 * Universal Add
 * ======================================================= */


/* =========================================================
 * 1. PROPS
 * ======================================================= */

export interface AppShellProps {
  children: ReactNode;
}


/* =========================================================
 * 2. APP SHELL
 * ======================================================= */

export function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">

      {/* ===================================================
       * ACCESSIBILITY
       * ================================================= */}

      <a
        href="#main-content"
        className="skip-link"
      >
        انتقل إلى المحتوى الرئيسي
      </a>


      {/* ===================================================
       * PRIMARY NAVIGATION
       * ================================================= */}

      <Sidebar />


      {/* ===================================================
       * WORKSPACE
       * ================================================= */}

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


      {/* ===================================================
       * V2 UNIVERSAL ADD
       * ================================================= */}

      <UniversalAdd />

    </div>
  );
}


/* =========================================================
 * 3. ARCHITECTURE RULE
 * ======================================================= */

/**
 * AppShell remains a Server Component.
 *
 * UniversalAdd is a Client Component, but importing a Client
 * Component inside a Server Component is supported.
 *
 * Therefore AppShell itself does NOT need:
 *
 * "use client"
 *
 *
 * Browser interaction remains isolated inside:
 *
 * components/universal-add.tsx
 *
 * and:
 *
 * components/sidebar.tsx
 */


/* =========================================================
 * 4. V2 GLOBAL ADD RULE
 * ======================================================= */

/**
 * Universal Add belongs to the application shell rather than
 * an individual page.
 *
 * This means the user can add information from anywhere:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * The user should never need to think:
 *
 * "أي صفحة أفتح أول عشان أضيف هالمعلومة؟"
 *
 * LIFE OS decides where the information belongs.
 */


/* =========================================================
 * 5. SECURITY BOUNDARY
 * ======================================================= */

/**
 * AppShell itself has no authority to write data.
 *
 * UniversalAdd:
 *
 * user input
 *      ↓
 * preview API
 *      ↓
 * AI understanding
 *      ↓
 * user confirmation
 *
 *
 * A separate secure confirmed-write endpoint will later own:
 *
 * database mutations
 * document persistence
 * audit creation
 *
 *
 * Permanent rule:
 *
 * AI Suggests
 * →
 * User Reviews
 * →
 * User Approves
 * →
 * System Executes
 */


/* =========================================================
 * 6. RESPONSIVE RULE
 * ======================================================= */

/**
 * Desktop:
 *
 * ┌───────────────┬───────────────────────────────┐
 * │               │ Topbar                        │
 * │   Sidebar     ├───────────────────────────────┤
 * │               │                               │
 * │               │ Main Content                  │
 * │               │                         (+)   │
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
 * │                                         (+)   │
 * └───────────────────────────────────────────────┘
 *
 *
 * UniversalAdd owns its own fixed positioning.
 */


/* =========================================================
 * 7. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * The shell preserves:
 *
 * #main-content
 *
 * and:
 *
 * tabIndex={-1}
 *
 * for keyboard navigation.
 *
 * UniversalAdd also exposes a proper button with:
 *
 * aria-label="أضف إلى LIFE OS"
 */


/* =========================================================
 * 8. UI PRINCIPLE
 * ======================================================= */

/**
 * LIFE OS V2 application shell:
 *
 * Navigation
 * +
 * Context
 * +
 * Content
 * +
 * One universal action
 *
 *
 * No duplicated add buttons across every page.
 *
 * No user-facing database structure.
 *
 * No unnecessary widgets.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */