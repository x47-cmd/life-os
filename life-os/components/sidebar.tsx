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
 * SIDEBAR
 *
 * Main navigation:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 * Legacy pages remain available temporarily under:
 *
 * المزيد
 *
 * Nothing is deleted in this phase.
 * ======================================================= */


/* =========================================================
 * 1. TYPES
 * ======================================================= */

interface SidebarItem {
  label: string;
  href: string | null;
  icon: string;
  badge?: string;
}


/* =========================================================
 * 2. V2 MAIN NAVIGATION
 * ======================================================= */

/**
 * Important:
 *
 * During the V2 migration we reuse the existing routes:
 *
 * المال
 *   → /finance
 *
 * خططي
 *   → /goals
 *
 * التطوير
 *   → /learning
 *
 * These pages will later absorb:
 *
 * investments
 * projects
 * career
 *
 * respectively.
 *
 * Travel is intentionally disabled until /travel exists.
 */

const MAIN_NAVIGATION_ITEMS: readonly SidebarItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "المال",
    href: "/finance",
    icon: "◈",
  },
  {
    label: "خططي",
    href: "/goals",
    icon: "◎",
  },
  {
    label: "السفر",
    href: null,
    icon: "✈",
    badge: "قريبًا",
  },
  {
    label: "التطوير",
    href: "/learning",
    icon: "◉",
  },
  {
    label: "LIFE AI",
    href: "/assistant",
    icon: "✦",
  },
];


/* =========================================================
 * 3. TEMPORARY LEGACY NAVIGATION
 * ======================================================= */

/**
 * These pages are NOT deleted.
 *
 * They stay here temporarily while their functionality is
 * merged into the new V2 sections.
 *
 * Later:
 *
 * /investments
 *   → المال
 *
 * /projects
 *   → خططي
 *
 * /career
 *   → التطوير
 *
 * /tasks
 *   → contextual tasks inside plans / travel / learning
 *
 * /audit + /settings
 *   → remain under المزيد
 */

const LEGACY_NAVIGATION_ITEMS: readonly SidebarItem[] = [
  {
    label: "الاستثمارات",
    href: "/investments",
    icon: "↗",
  },
  {
    label: "المشاريع",
    href: "/projects",
    icon: "▣",
  },
  {
    label: "المسار المهني",
    href: "/career",
    icon: "◇",
  },
  {
    label: "المهام",
    href: "/tasks",
    icon: "✓",
  },
  {
    label: "السجل",
    href: "/audit",
    icon: "≡",
  },
  {
    label: "الإعدادات",
    href: "/settings",
    icon: "⚙",
  },
];


/* =========================================================
 * 4. ROUTE MATCHING
 * ======================================================= */

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
 * 5. SIDEBAR NAVIGATION ITEM
 * ======================================================= */

function NavigationItem({
  item,
  pathname,
  onNavigate,
}: {
  item: SidebarItem;
  pathname: string;
  onNavigate: () => void;
}) {
  /*
   * Disabled items are used only while a V2 feature is being
   * built.
   *
   * We never send the user to a route that does not exist.
   */
  if (
    !item.href
  ) {
    return (
      <li className="sidebar__item">
        <div
          className="sidebar__link"
          aria-disabled="true"
          style={{
            opacity: 0.48,
            cursor: "default",
            userSelect: "none",
          }}
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

          {item.badge ? (
            <span
              style={{
                marginInlineStart: "auto",
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {item.badge}
            </span>
          ) : null}
        </div>
      </li>
    );
  }


  const active =
    isRouteActive(
      pathname,
      item.href,
    );


  return (
    <li className="sidebar__item">
      <Link
        href={item.href}
        className={[
          "sidebar__link",
          active
            ? "sidebar__link--active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={
          active
            ? "page"
            : undefined
        }
        onClick={onNavigate}
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
   * The path on which the mobile menu was opened.
   *
   * After navigation the pathname changes, therefore the
   * mobile sidebar automatically closes.
   */
  const [
    mobileMenuPath,
    setMobileMenuPath,
  ] =
    useState<string | null>(
      null,
    );


  /*
   * Temporary V2 legacy section.
   *
   * It keeps the old pages accessible without allowing them
   * to dominate the primary navigation.
   */
  const [
    moreOpen,
    setMoreOpen,
  ] =
    useState(false);


  const isMobileOpen =
    mobileMenuPath ===
    pathname;


  /*
   * If the user is already inside an old section, keep
   * "المزيد" visible automatically.
   */
  const legacyRouteActive =
    LEGACY_NAVIGATION_ITEMS.some(
      (item) =>
        item.href
          ? isRouteActive(
              pathname,
              item.href,
            )
          : false,
    );


  const showMore =
    moreOpen ||
    legacyRouteActive;


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
        event: KeyboardEvent,
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
   * 9. NAVIGATION CLOSE
   * ===================================================== */

  function handleNavigate() {
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
        onClick={() => {
          setMobileMenuPath(
            pathname,
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
            setMobileMenuPath(
              null,
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
          .filter(Boolean)
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
                setMobileMenuPath(
                  null,
                );
              }}
            >
              ×
            </button>
          </div>


          {/* ===============================================
           * V2 MAIN NAVIGATION
           * ============================================= */}

          <nav
            className="sidebar__navigation"
            aria-label="صفحات LIFE OS"
          >
            <ul className="sidebar__list">
              {MAIN_NAVIGATION_ITEMS.map(
                (item) => (
                  <NavigationItem
                    key={
                      item.href ??
                      item.label
                    }
                    item={item}
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
             * MORE / LEGACY TRANSITION SECTION
             * =========================================== */}

            <div
              style={{
                marginTop: "18px",
                paddingTop: "14px",
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
                onClick={() => {
                  setMoreOpen(
                    (current) =>
                      !current,
                  );
                }}
                style={{
                  width: "100%",
                  border: 0,
                  cursor: "pointer",
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
                    fontSize: "12px",
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
                  className="sidebar__list"
                  style={{
                    marginTop: "4px",
                  }}
                >
                  {LEGACY_NAVIGATION_ITEMS.map(
                    (item) => (
                      <NavigationItem
                        key={
                          item.href ??
                          item.label
                        }
                        item={item}
                        pathname={
                          pathname
                        }
                        onNavigate={() => {
                          handleNavigate();
                        }}
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
 * 10. V2 TRANSITION RULE
 * ======================================================= */

/**
 * This sidebar is intentionally transitional.
 *
 * Primary V2 navigation:
 *
 * الرئيسية
 * المال
 * خططي
 * السفر
 * التطوير
 * LIFE AI
 *
 * Existing pages are NOT deleted.
 *
 * They remain under "المزيد" until their data and actions
 * are merged into the new V2 information architecture.
 */


/* =========================================================
 * 11. SECURITY BOUNDARY
 * ======================================================= */

/**
 * Sidebar controls navigation only.
 *
 * It does not:
 *
 * - authenticate users
 * - authorize access
 * - read private data
 * - modify data
 * - upload files
 * - call AI
 *
 * Security remains enforced by:
 *
 * authenticated server session
 * PostgreSQL RLS
 * server-side authorization
 */


/* =========================================================
 * 12. FINAL RULE
 * ======================================================= */

/**
 * LIFE OS V2 navigation should answer one question:
 *
 * "وين أبغي أروح؟"
 *
 * without making the user understand the database structure.
 *
 * The user should never need to know whether something is
 * technically a Goal, Project, Learning Item, Budget Item,
 * or another internal record type.
 */