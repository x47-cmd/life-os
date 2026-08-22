"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  APP_NAME,
  NAVIGATION_ITEMS,
} from "@/lib/constants";


/* =========================================================
 * 1. ROUTE MATCHING
 * ======================================================= */

/**
 * A navigation item is active when:
 *
 * /finance
 *
 * matches:
 *
 * /finance
 * /finance/...
 *
 * but does not accidentally match:
 *
 * /financial-something
 */
function isRouteActive(
  pathname: string,
  href: string,
): boolean {
  if (
    pathname === href
  ) {
    return true;
  }

  return pathname.startsWith(
    `${href}/`,
  );
}


/* =========================================================
 * 2. SIDEBAR
 * ======================================================= */

export function Sidebar() {
  const pathname =
    usePathname();

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] =
    useState(false);


  /* -------------------------------------------------------
   * Close mobile menu after navigation
   * ---------------------------------------------------- */

  useEffect(
    () => {
      setIsMobileOpen(
        false,
      );
    },
    [
      pathname,
    ],
  );


  /* -------------------------------------------------------
   * Prevent background scroll while mobile menu is open
   * ---------------------------------------------------- */

  useEffect(
    () => {
      if (
        !isMobileOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      isMobileOpen,
    ],
  );


  /* -------------------------------------------------------
   * Escape key closes mobile menu
   * ---------------------------------------------------- */

  useEffect(
    () => {
      if (
        !isMobileOpen
      ) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setIsMobileOpen(
            false,
          );
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isMobileOpen,
    ],
  );


  return (
    <>
      {/* ===================================================
       * MOBILE MENU BUTTON
       * ================================================= */}

      <button
        type="button"
        className="sidebar-mobile-trigger"
        aria-label="فتح القائمة الرئيسية"
        aria-expanded={
          isMobileOpen
        }
        aria-controls="life-os-sidebar"
        onClick={() => {
          setIsMobileOpen(
            true,
          );
        }}
      >
        <span
          aria-hidden="true"
          className="sidebar-mobile-trigger__icon"
        >
          ☰
        </span>
      </button>


      {/* ===================================================
       * MOBILE BACKDROP
       * ================================================= */}

      {isMobileOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة الرئيسية"
          onClick={() => {
            setIsMobileOpen(
              false,
            );
          }}
        />
      ) : null}


      {/* ===================================================
       * SIDEBAR
       * ================================================= */}

      <aside
        id="life-os-sidebar"
        className={[
          "sidebar",
          isMobileOpen
            ? "sidebar--open"
            : "",
        ]
          .filter(
            Boolean,
          )
          .join(" ")}
        aria-label="التنقل الرئيسي"
      >
        <div className="sidebar__inner">

          {/* ===============================================
           * BRAND
           * ============================================= */}

          <div className="sidebar__brand">
            <div
              className="sidebar__brand-mark"
              aria-hidden="true"
            >
              L
            </div>

            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">
                {APP_NAME}
              </span>

              <span className="sidebar__brand-subtitle">
                Personal AI OS
              </span>
            </div>

            <button
              type="button"
              className="sidebar__mobile-close"
              aria-label="إغلاق القائمة الرئيسية"
              onClick={() => {
                setIsMobileOpen(
                  false,
                );
              }}
            >
              ×
            </button>
          </div>


          {/* ===============================================
           * NAVIGATION
           * ============================================= */}

          <nav
            className="sidebar__navigation"
            aria-label="صفحات LIFE OS"
          >
            <ul className="sidebar__list">
              {NAVIGATION_ITEMS.map(
                (
                  item,
                ) => {
                  const active =
                    isRouteActive(
                      pathname,
                      item.href,
                    );

                  return (
                    <li
                      key={
                        item.href
                      }
                      className="sidebar__item"
                    >
                      <Link
                        href={
                          item.href
                        }
                        className={[
                          "sidebar__link",
                          active
                            ? "sidebar__link--active"
                            : "",
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(" ")}
                        aria-current={
                          active
                            ? "page"
                            : undefined
                        }
                      >
                        <span
                          className="sidebar__icon"
                          aria-hidden="true"
                        >
                          {
                            item.icon
                          }
                        </span>

                        <span className="sidebar__label">
                          {
                            item.label
                          }
                        </span>
                      </Link>
                    </li>
                  );
                },
              )}
            </ul>
          </nav>


          {/* ===============================================
           * FOOTER
           * ============================================= */}

          <div className="sidebar__footer">
            <p className="sidebar__footer-text">
              بسيط في العرض، عميق في الذكاء.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}


/* =========================================================
 * 3. SECURITY BOUNDARY
 * ======================================================= */

/**
 * Sidebar is navigation only.
 *
 * It does NOT:
 *
 * - authenticate users
 * - authorize routes
 * - read private database data
 * - call OpenAI
 * - expose user information
 *
 * Route security remains enforced by:
 *
 * proxy.ts
 *      +
 * server authentication
 *      +
 * AAL2
 *      +
 * PostgreSQL RLS
 */


/* =========================================================
 * 4. CLIENT COMPONENT RULE
 * ======================================================= */

/**
 * This file intentionally uses:
 *
 * "use client"
 *
 * because it needs:
 *
 * - usePathname()
 * - mobile open/close state
 * - keyboard interaction
 * - document body scroll control
 *
 * This does NOT make the complete application a Client
 * Component.
 *
 * app-shell.tsx remains server-first.
 */


/* =========================================================
 * 5. MOBILE UX RULE
 * ======================================================= */

/**
 * Mobile navigation supports:
 *
 * - explicit open button
 * - explicit close button
 * - backdrop close
 * - Escape key close
 * - automatic close after navigation
 * - body scroll locking
 *
 * CSS in app/globals.css will determine the actual visual
 * breakpoint and animation.
 */


/* =========================================================
 * 6. ACTIVE ROUTE RULE
 * ======================================================= */

/**
 * Example:
 *
 * /investments
 *      → Investments active
 *
 * /investments/history
 *      → Investments active
 *
 * /goals
 *      → Goals active
 *
 * The active page also receives:
 *
 * aria-current="page"
 *
 * for accessibility.
 */


/* =========================================================
 * 7. FINAL UI RULE
 * ======================================================= */

/**
 * Sidebar purpose:
 *
 * Know where you are.
 * Move where you need.
 *
 * Nothing more.
 *
 * No:
 *
 * - financial numbers
 * - alerts
 * - AI recommendations
 * - promotional content
 * - excessive controls
 *
 * Those belong in the relevant LIFE OS pages.
 */