"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  APP_NAME,
  SETTINGS_ROUTE,
} from "@/lib/constants";


/* =========================================================
 * LIFE OS V2
 * TOPBAR
 *
 * The Topbar should show the user's current LIFE AREA,
 * not expose the internal database/page structure.
 *
 * V2 areas:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 * Legacy routes remain accessible during migration, but
 * their labels are mapped to the new V2 information
 * architecture.
 * ======================================================= */


/* =========================================================
 * 1. TYPES
 * ======================================================= */

interface LifeArea {
  label: string;
  routes: readonly string[];
}


/* =========================================================
 * 2. V2 LIFE AREAS
 * ======================================================= */

/**
 * Multiple existing V1 routes can belong to one V2 area.
 *
 * Example:
 *
 * /finance
 * /investments
 *
 * both belong to:
 *
 * المال
 *
 *
 * /goals
 * /projects
 *
 * both belong to:
 *
 * خططي
 *
 *
 * /career
 * /learning
 *
 * both belong to:
 *
 * التطوير
 */

const LIFE_AREAS: readonly LifeArea[] = [
  {
    label: "الرئيسية",
    routes: [
      "/dashboard",
    ],
  },

  {
    label: "المال",
    routes: [
      "/finance",
      "/investments",
    ],
  },

  {
    label: "خططي",
    routes: [
      "/goals",
      "/projects",
    ],
  },

  {
    label: "السفر",
    routes: [
      "/travel",
    ],
  },

  {
    label: "التطوير",
    routes: [
      "/career",
      "/learning",
    ],
  },

  {
    label: "LIFE AI",
    routes: [
      "/assistant",
    ],
  },

  /*
   * Temporary V2 transition areas.
   *
   * These are not primary navigation items anymore.
   * They remain available under "المزيد".
   */

  {
    label: "المهام",
    routes: [
      "/tasks",
    ],
  },

  {
    label: "السجل",
    routes: [
      "/audit",
    ],
  },

  {
    label: "الإعدادات",
    routes: [
      "/settings",
    ],
  },
];


/* =========================================================
 * 3. ROUTE HELPERS
 * ======================================================= */

function isRouteMatch(
  pathname: string,
  route: string,
): boolean {
  return (
    pathname === route ||
    pathname.startsWith(
      `${route}/`,
    )
  );
}


/**
 * Returns the V2 area that contains the current route.
 *
 * The user should see:
 *
 * "المال"
 *
 * rather than needing to understand whether the internal
 * page is technically:
 *
 * finance
 *
 * or:
 *
 * investments
 */
function getCurrentLifeArea(
  pathname: string,
): LifeArea | undefined {
  return LIFE_AREAS.find(
    (area) =>
      area.routes.some(
        (route) =>
          isRouteMatch(
            pathname,
            route,
          ),
      ),
  );
}


/* =========================================================
 * 4. TOPBAR
 * ======================================================= */

export function Topbar() {
  const pathname =
    usePathname();


  const currentArea =
    getCurrentLifeArea(
      pathname,
    );


  const pageLabel =
    currentArea?.label ??
    APP_NAME;


  return (
    <header className="topbar">
      <div className="topbar__inner">

        {/* ===============================================
         * CURRENT LIFE AREA
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
         * ACCOUNT / SETTINGS
         * ============================================= */}

        <div className="topbar__actions">

          {/*
           * Keep this area deliberately quiet.
           *
           * Security should be real underneath rather than
           * represented by unnecessary permanent badges.
           */}

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
 * 5. V2 INFORMATION ARCHITECTURE RULE
 * ======================================================= */

/**
 * Topbar represents user-facing LIFE OS areas.
 *
 * It must NOT simply mirror:
 *
 * database tables
 * internal routes
 * backend entities
 *
 *
 * Example:
 *
 * /finance
 * /investments
 *
 * both appear to the user as:
 *
 * المال
 *
 *
 * /goals
 * /projects
 *
 * both appear as:
 *
 * خططي
 */


/* =========================================================
 * 6. CLIENT COMPONENT RULE
 * ======================================================= */

/**
 * Topbar is a Client Component only because usePathname()
 * is required.
 *
 * It does not:
 *
 * - fetch user data
 * - query Supabase
 * - call AI
 * - modify data
 * - manage authentication
 */


/* =========================================================
 * 7. SECURITY DISPLAY RULE
 * ======================================================= */

/**
 * V2 does not display a permanent visual claim such as:
 *
 * "خاص وآمن"
 *
 * simply because the user is inside the application.
 *
 * Actual protection belongs to:
 *
 * Supabase authentication
 * verified server session
 * server-side authorization
 * PostgreSQL RLS
 *
 * Security UI shown later inside Settings must reflect the
 * real authentication configuration.
 */


/* =========================================================
 * 8. MOBILE RULE
 * ======================================================= */

/**
 * On mobile the Topbar should remain extremely simple:
 *
 * Menu
 * +
 * Current area
 *
 * Secondary account labels may be hidden by CSS.
 *
 * Detailed page titles belong inside the page itself.
 */


/* =========================================================
 * 9. FINAL V2 RULE
 * ======================================================= */

/**
 * A user should never open LIFE OS and wonder:
 *
 * "هل الاستثمار منفصل عن المال؟"
 *
 * "هل المشروع منفصل عن هدفي؟"
 *
 * "هل الجامعة داخل Career أو Learning؟"
 *
 *
 * LIFE OS handles that complexity underneath.
 *
 * The interface exposes only clear life areas.
 *
 * Simple outside.
 * Intelligent underneath.
 */