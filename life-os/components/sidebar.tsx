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
} from "@/lib/constants";


/* =========================================================
 * LIFE OS V2
 * FINAL SIDEBAR
 *
 * Exactly six primary destinations:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 *
 * Detailed / secondary pages remain available under:
 *
 * المزيد
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * ======================================================= */


/* =========================================================
 * 1. TYPES
 * ======================================================= */

interface SidebarItem {
  label:
    string;

  href:
    string;

  icon:
    string;
}


/* =========================================================
 * 2. PRIMARY V2 NAVIGATION
 * ======================================================= */

/**
 * These are the six permanent top-level LIFE OS V2 areas.
 *
 *
 * المال
 *      → Finance + Investments
 *
 * خططي
 *      → Goals + Projects
 *
 * السفر
 *      → Travel OS
 *
 * التطوير
 *      → Learning + Career
 *
 *
 * The technical database structure stays hidden from the
 * primary navigation.
 */
const MAIN_NAVIGATION_ITEMS:
readonly SidebarItem[] = [
  {
    label:
      "الرئيسية",

    href:
      "/dashboard",

    icon:
      "⌂",
  },

  {
    label:
      "المال",

    href:
      "/finance",

    icon:
      "◈",
  },

  {
    label:
      "خططي",

    href:
      "/goals",

    icon:
      "◎",
  },

  {
    label:
      "السفر",

    href:
      "/travel",

    icon:
      "✈",
  },

  {
    label:
      "التطوير",

    href:
      "/learning",

    icon:
      "◉",
  },

  {
    label:
      "LIFE AI",

    href:
      "/assistant",

    icon:
      "✦",
  },
];


/* =========================================================
 * 3. SECONDARY NAVIGATION
 * ======================================================= */

/**
 * These routes remain useful as detailed views.
 *
 * They are intentionally kept outside the six primary
 * navigation items.
 *
 *
 * /investments
 *      → detailed investment view under المال
 *
 * /projects
 *      → detailed project view under خططي
 *
 * /career
 *      → detailed career view under التطوير
 *
 * /tasks
 *      → detailed task view
 *
 * /audit
 *      → audit history
 *
 * /settings
 *      → account/application settings
 */
const SECONDARY_NAVIGATION_ITEMS:
readonly SidebarItem[] = [
  {
    label:
      "الاستثمارات",

    href:
      "/investments",

    icon:
      "↗",
  },

  {
    label:
      "المشاريع",

    href:
      "/projects",

    icon:
      "▣",
  },

  {
    label:
      "المسار المهني",

    href:
      "/career",

    icon:
      "◇",
  },

  {
    label:
      "المهام",

    href:
      "/tasks",

    icon:
      "✓",
  },

  {
    label:
      "السجل",

    href:
      "/audit",

    icon:
      "≡",
  },

  {
    label:
      "الإعدادات",

    href:
      "/settings",

    icon:
      "⚙",
  },
];


/* =========================================================
 * 4. ROUTE MATCHING
 * ======================================================= */

function isRouteActive(
  pathname:
    string,

  href:
    string,
): boolean {
  if (
    pathname ===
    href
  ) {
    return true;
  }


  return pathname.startsWith(
    `${href}/`,
  );
}


/* =========================================================
 * 5. NAVIGATION ITEM
 * ======================================================= */

function NavigationItem({
  item,
  pathname,
  onNavigate,
}: {
  item:
    SidebarItem;

  pathname:
    string;

  onNavigate:
    () => void;
}) {
  const active =
    isRouteActive(
      pathname,
      item.href,
    );


  return (
    <li className="sidebar__item">
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
          .join(
            " ",
          )}
        aria-current={
          active
            ? "page"
            : undefined
        }
        onClick={
          onNavigate
        }
      >
        <span
          className="sidebar__icon"
          aria-hidden="true"
        >
          {item.icon}
        </span>


        <span className="sidebar__label">
          {item.label}
        </span>
      </Link>
    </li>
  );
}


/* =========================================================
 * 6. SIDEBAR
 * ======================================================= */

export function Sidebar() {
  const pathname =
    usePathname();


  /*
   * Path on which the mobile menu was opened.
   *
   * When navigation changes pathname, the drawer naturally
   * stops matching and closes.
   */
  const [
    mobileMenuPath,
    setMobileMenuPath,
  ] =
    useState<
      string |
      null
    >(
      null,
    );


  /*
   * Secondary navigation is collapsed by default.
   */
  const [
    moreOpen,
    setMoreOpen,
  ] =
    useState(
      false,
    );


  const isMobileOpen =
    mobileMenuPath ===
    pathname;


  /*
   * When the user is currently inside a secondary page,
   * automatically keep "المزيد" expanded so location remains
   * obvious.
   */
  const secondaryRouteActive =
    SECONDARY_NAVIGATION_ITEMS
      .some(
        (
          item,
        ) =>
          isRouteActive(
            pathname,
            item.href,
          ),
      );


  const showMore =
    moreOpen ||
    secondaryRouteActive;


  /* =======================================================
   * 7. MOBILE BODY SCROLL LOCK
   * ===================================================== */

  useEffect(
    () => {
      if (
        !isMobileOpen
      ) {
        return;
      }


      const previousOverflow =
        document
          .body
          .style
          .overflow;


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


  /* =======================================================
   * 8. ESCAPE KEY
   * ===================================================== */

  useEffect(
    () => {
      if (
        !isMobileOpen
      ) {
        return;
      }


      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setMobileMenuPath(
            null,
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


  /* =======================================================
   * 9. CLOSE AFTER NAVIGATION
   * ===================================================== */

  function handleNavigate():
  void {
    setMobileMenuPath(
      null,
    );
  }


  /* =======================================================
   * 10. OPEN MOBILE MENU
   * ===================================================== */

  function handleOpenMobileMenu():
  void {
    setMobileMenuPath(
      pathname,
    );
  }


  /* =======================================================
   * 11. CLOSE MOBILE MENU
   * ===================================================== */

  function handleCloseMobileMenu():
  void {
    setMobileMenuPath(
      null,
    );
  }


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
        onClick={
          handleOpenMobileMenu
        }
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
          onClick={
            handleCloseMobileMenu
          }
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
          .join(
            " ",
          )}
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
              onClick={
                handleCloseMobileMenu
              }
            >
              ×
            </button>
          </div>


          {/* ===============================================
           * SIX PRIMARY V2 DESTINATIONS
           * ============================================= */}

          <nav
            className="sidebar__navigation"
            aria-label="صفحات LIFE OS"
          >
            <ul className="sidebar__list">
              {MAIN_NAVIGATION_ITEMS.map(
                (
                  item,
                ) => (
                  <NavigationItem
                    key={
                      item.href
                    }
                    item={
                      item
                    }
                    pathname={
                      pathname
                    }
                    onNavigate={
                      handleNavigate
                    }
                  />
                ),
              )}
            </ul>


            {/* =============================================
             * MORE
             * =========================================== */}

            <div
              style={{
                marginTop:
                  "18px",

                paddingTop:
                  "14px",

                borderTop:
                  "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="sidebar__link"
                aria-expanded={
                  showMore
                }
                aria-controls="life-os-secondary-navigation"
                onClick={() => {
                  setMoreOpen(
                    (
                      current,
                    ) =>
                      !current,
                  );
                }}
                style={{
                  width:
                    "100%",

                  border:
                    0,

                  cursor:
                    "pointer",

                  background:
                    "transparent",

                  textAlign:
                    "inherit",
                }}
              >
                <span
                  className="sidebar__icon"
                  aria-hidden="true"
                >
                  ⋯
                </span>


                <span className="sidebar__label">
                  المزيد
                </span>


                <span
                  aria-hidden="true"
                  style={{
                    marginInlineStart:
                      "auto",

                    color:
                      "var(--text-tertiary)",

                    fontSize:
                      "12px",

                    transform:
                      showMore
                        ? "rotate(180deg)"
                        : "none",

                    transition:
                      "transform 160ms ease",
                  }}
                >
                  ▾
                </span>
              </button>


              {showMore ? (
                <ul
                  id="life-os-secondary-navigation"
                  className="sidebar__list"
                  style={{
                    marginTop:
                      "4px",
                  }}
                >
                  {SECONDARY_NAVIGATION_ITEMS.map(
                    (
                      item,
                    ) => (
                      <NavigationItem
                        key={
                          item.href
                        }
                        item={
                          item
                        }
                        pathname={
                          pathname
                        }
                        onNavigate={
                          handleNavigate
                        }
                      />
                    ),
                  )}
                </ul>
              ) : null}
            </div>
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
 * 12. FINAL PRIMARY NAVIGATION CONTRACT
 * ======================================================= */

/**
 * Exactly six top-level destinations:
 *
 * 1. الرئيسية
 * 2. المال
 * 3. خططي
 * 4. السفر
 * 5. التطوير
 * 6. LIFE AI
 *
 *
 * No:
 *
 * قريبًا
 * disabled Travel item
 * duplicate Finance/Investment top-level links
 * duplicate Goal/Project top-level links
 * duplicate Learning/Career top-level links
 */


/* =========================================================
 * 13. INFORMATION ARCHITECTURE
 * ======================================================= */

/**
 * User-facing structure:
 *
 * المال
 *      ↓
 * money + investments
 *
 *
 * خططي
 *      ↓
 * goals + projects
 *
 *
 * التطوير
 *      ↓
 * learning + career
 *
 *
 * Technical detail pages remain available through:
 *
 * المزيد
 */


/* =========================================================
 * 14. TRAVEL RULE
 * ======================================================= */

/**
 * السفر is now a normal first-class V2 route:
 *
 * /travel
 *
 *
 * It is no longer:
 *
 * href:null
 * disabled
 * قريبًا
 */


/* =========================================================
 * 15. SECURITY BOUNDARY
 * ======================================================= */

/**
 * Sidebar controls navigation only.
 *
 * It does not:
 *
 * authenticate
 * authorize
 * read private data
 * write private data
 * upload documents
 * call AI
 *
 *
 * Security remains enforced server-side through:
 *
 * authenticated identity
 * protected routes
 * PostgreSQL RLS
 * Storage RLS
 */


/* =========================================================
 * 16. FINAL LIFE OS V2 RULE
 * ======================================================= */

/**
 * The user navigates by life area,
 * not by database table.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */