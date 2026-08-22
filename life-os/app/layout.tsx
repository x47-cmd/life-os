import type {
  Metadata,
  Viewport,
} from "next";

import type {
  ReactNode,
} from "react";

import {
  APP_NAME,
} from "@/lib/constants";

import "./globals.css";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

/**
 * LIFE OS is a private personal application.
 *
 * It must not be treated as a public website intended for
 * search-engine discovery.
 */
export const metadata: Metadata = {
  title: {
    default:
      APP_NAME,

    template:
      `%s | ${APP_NAME}`,
  },

  description:
    "Private AI-powered personal operating system for goals, finance, investments, career, learning and life decisions.",

  applicationName:
    APP_NAME,

  robots: {
    index: false,
    follow: false,
    nocache: true,
  },

  referrer:
    "strict-origin-when-cross-origin",

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};


/* =========================================================
 * 2. VIEWPORT
 * ======================================================= */

/**
 * Keep mobile behavior native and predictable.
 *
 * We intentionally allow user zoom for accessibility.
 */
export const viewport: Viewport = {
  width:
    "device-width",

  initialScale:
    1,

  viewportFit:
    "cover",

  colorScheme:
    "light dark",
};


/* =========================================================
 * 3. ROOT LAYOUT PROPS
 * ======================================================= */

export interface RootLayoutProps {
  children: ReactNode;
}


/* =========================================================
 * 4. ROOT LAYOUT
 * ======================================================= */

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
    >
      <body className="app-body">
        {children}
      </body>
    </html>
  );
}


/* =========================================================
 * 5. DIRECTION RULE
 * ======================================================= */

/**
 * LIFE OS V1 is Arabic-first.
 *
 * The root document therefore uses:
 *
 * lang="ar"
 * dir="rtl"
 *
 * Individual data such as:
 *
 * - ticker symbols
 * - URLs
 * - English provider names
 * - technical identifiers
 *
 * may use local LTR styling where appropriate.
 */


/* =========================================================
 * 6. APP SHELL RULE
 * ======================================================= */

/**
 * RootLayout intentionally does NOT render:
 *
 * <AppShell />
 *
 * because not every route belongs inside the authenticated
 * workspace.
 *
 * Examples:
 *
 * /login
 * /auth/callback
 *
 * must remain usable without the private application shell.
 *
 * Protected application pages will explicitly use AppShell.
 */


/* =========================================================
 * 7. FONT RULE
 * ======================================================= */

/**
 * V1 does not depend on downloaded font files.
 *
 * Typography is defined centrally in:
 *
 * app/globals.css
 *
 * using a high-quality system font stack.
 *
 * Benefits:
 *
 * - no font-host privacy dependency
 * - no font loading failure
 * - fast first render
 * - consistent mobile behavior
 */


/* =========================================================
 * 8. PRIVACY RULE
 * ======================================================= */

/**
 * robots.noindex is defense-in-depth only.
 *
 * It is NOT a security boundary.
 *
 * Real protection remains:
 *
 * Supabase Auth
 *      ↓
 * MFA / AAL2
 *      ↓
 * Server authorization
 *      ↓
 * PostgreSQL RLS
 *
 * Private routes must never rely on search-engine directives
 * for access control.
 */


/* =========================================================
 * 9. ACCESSIBILITY RULE
 * ======================================================= */

/**
 * LIFE OS intentionally does NOT disable:
 *
 * - browser zoom
 * - pinch zoom
 * - user scaling
 *
 * Responsive design must adapt to the user rather than
 * preventing accessibility features.
 */


/* =========================================================
 * 10. FINAL ROOT RULE
 * ======================================================= */

/**
 * RootLayout owns only global document concerns:
 *
 * Language
 * Direction
 * Metadata
 * Viewport
 * Global CSS
 *
 * It does not own:
 *
 * Authentication
 * Navigation
 * Data
 * AI
 * Page-specific layout
 *
 * Simple outside.
 * Intelligent underneath.
 */