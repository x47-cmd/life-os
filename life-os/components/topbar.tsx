"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  APP_NAME,
  NAVIGATION_ITEMS,
  SETTINGS_ROUTE,
} from "@/lib/constants";


/* =========================================================
 * 1. ROUTE HELPERS
 * ======================================================= */

/**
 * Matches both:
 *
 * /finance
 *
 * and nested paths such as:
 *
 * /finance/history
 */
function isRouteMatch(
  pathname: string,
  href: string,
): boolean {
  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}


/**
 * Returns the most specific matching navigation item.
 *
 * Sorting by href length prevents a shorter parent route from
 * winning when a more specific route exists.
 */
function getCurrentNavigationItem(
  pathname: string,
) {
  return [
    ...NAVIGATION_ITEMS,
  ]
    .sort(
      (
        a,
        b,
      ) =>
        b.href.length -
        a.href.length,
    )
    .find(
      (item) =>
        isRouteMatch(
          pathname,
          item.href,
        ),
    );
}


/* =========================================================
 * 2. TOPBAR
 * ======================================================= */

export function Topbar() {
  const pathname =
    usePathname();

  const currentItem =
    getCurrentNavigationItem(
      pathname,
    );

  const pageLabel =
    currentItem?.label ??
    APP_NAME;

  return (
    <header className="topbar">
      <div className="topbar__inner">

        {/* ===============================================
         * CURRENT CONTEXT
         * ============================================= */}

        <div className="topbar__context">
          <span className="topbar__eyebrow">
            {APP_NAME}
          </span>

          <span className="topbar__page-title">
            {pageLabel}
          </span>
        </div>


        {/* ===============================================
         * SYSTEM / ACCOUNT AREA
         * ============================================= */}

        <div className="topbar__actions">

          <div
            className="topbar__status"
            title="مساحة LIFE OS الخاصة"
          >
            <span
              className="topbar__status-dot"
              aria-hidden="true"
            />

            <span className="topbar__status-text">
              خاص وآمن
            </span>
          </div>


          <Link
            href={
              SETTINGS_ROUTE
            }
            className="topbar__account"
            aria-label="فتح إعدادات LIFE OS"
          >
            <span
              className="topbar__account-icon"
              aria-hidden="true"
            >
              ◉
            </span>

            <span className="topbar__account-label">
              الإعدادات
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}


/* =========================================================
 * 3. CLIENT COMPONENT RULE
 * ======================================================= */

/**
 * Topbar intentionally uses:
 *
 * "use client"
 *
 * only because usePathname() is required to display the
 * current application context.
 *
 * It does NOT:
 *
 * - fetch data
 * - access Supabase
 * - access OpenAI
 * - manage authentication
 *
 * AppShell itself remains server-first.
 */


/* =========================================================
 * 4. PAGE TITLE RULE
 * ======================================================= */

/**
 * Topbar displays the broad current area:
 *
 * Dashboard
 * Goals
 * Projects
 * Finance
 * Investments
 * Career
 * Learning
 * Tasks
 * Assistant
 * Audit
 * Settings
 *
 * Detailed page titles belong to:
 *
 * components/page-header.tsx
 *
 * This avoids duplicating large headings.
 */


/* =========================================================
 * 5. SECURITY STATUS RULE
 * ======================================================= */

/**
 * "خاص وآمن" is a product-status label only.
 *
 * It does NOT make an independent authentication claim.
 *
 * Actual security remains enforced by:
 *
 * Supabase Auth
 *      ↓
 * verified JWT
 *      ↓
 * MFA / AAL2
 *      ↓
 * server authorization
 *      ↓
 * PostgreSQL RLS
 *
 * Never derive real authentication state from this visual
 * component.
 */


/* =========================================================
 * 6. ACCOUNT AREA RULE
 * ======================================================= */

/**
 * V1 deliberately avoids placing personal identifiers such as
 * email address in the persistent topbar.
 *
 * Benefits:
 *
 * - less visual clutter
 * - less shoulder-surfing exposure
 * - fewer unnecessary personal details on every screen
 *
 * Account and security controls live inside Settings.
 */


/* =========================================================
 * 7. MOBILE RULE
 * ======================================================= */

/**
 * On small screens:
 *
 * - Sidebar trigger remains available.
 * - Current page remains visible.
 * - Secondary labels may be hidden by CSS.
 * - No horizontal scrolling should be introduced.
 *
 * Exact responsive behavior is centralized later in:
 *
 * app/globals.css
 */


/* =========================================================
 * 8. FINAL TOPBAR RULE
 * ======================================================= */

/**
 * Topbar answers only:
 *
 * Where am I?
 * Is this my private LIFE OS workspace?
 * Where are settings?
 *
 * Nothing more.
 *
 * No:
 *
 * - portfolio ticker
 * - salary number
 * - notifications feed
 * - AI recommendations
 * - decorative dashboard statistics
 *
 * Those belong inside the relevant page content.
 */