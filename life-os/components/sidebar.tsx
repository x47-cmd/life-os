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
 * RESPONSIVE NAVIGATION
 *
 * Desktop:
 * - permanent sidebar
 *
 * Mobile:
 * - fixed bottom navigation
 * - secondary pages inside a bottom sheet
 * ======================================================= */


/* =========================================================
 * 1. TYPES
 * ======================================================= */

interface NavigationItemDefinition {
  label:
    string;

  href:
    string;

  icon:
    string;
}


/* =========================================================
 * 2. PRIMARY NAVIGATION
 * ======================================================= */

const MAIN_NAVIGATION_ITEMS:
readonly NavigationItemDefinition[] = [
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

const SECONDARY_NAVIGATION_ITEMS:
readonly NavigationItemDefinition[] = [
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
 * 4. MOBILE NAVIGATION
 * ======================================================= */

/**
 * Five everyday destinations stay visible at all times.
 * Travel and the detailed pages live inside "المزيد".
 */
const MOBILE_NAVIGATION_ITEMS:
readonly NavigationItemDefinition[] =
  MAIN_NAVIGATION_ITEMS.filter(
    (
      item,
    ) =>
      item.href !==
      "/travel",
  );


const MOBILE_MORE_ITEMS:
readonly NavigationItemDefinition[] = [
  ...MAIN_NAVIGATION_ITEMS.filter(
    (
      item,
    ) =>
      item.href ===
      "/travel",
  ),
  ...SECONDARY_NAVIGATION_ITEMS,
];


/* =========================================================
 * 5. ROUTE MATCHING
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


function hasActiveRoute(
  pathname:
    string,
  items:
    readonly NavigationItemDefinition[],
): boolean {
  return items.some(
    (
      item,
    ) =>
      isRouteActive(
        pathname,
        item.href,
      ),
  );
}


/* =========================================================
 * 6. DESKTOP NAVIGATION ITEM
 * ======================================================= */

function DesktopNavigationItem({
  item,
  pathname,
}: {
  item:
    NavigationItemDefinition;
  pathname:
    string;
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
 * 7. MOBILE NAVIGATION ITEM
 * ======================================================= */

function MobileNavigationItem({
  item,
  pathname,
  onNavigate,
}: {
  item:
    NavigationItemDefinition;
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
    <li className="mobile-bottom-navigation__item">
      <Link
        href={
          item.href
        }
        className={[
          "mobile-bottom-navigation__link",
          active
            ? "mobile-bottom-navigation__link--active"
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
          className="mobile-bottom-navigation__icon"
          aria-hidden="true"
        >
          {item.icon}
        </span>


        <span className="mobile-bottom-navigation__label">
          {item.label}
        </span>
      </Link>
    </li>
  );
}


/* =========================================================
 * 8. RESPONSIVE NAVIGATION
 * ======================================================= */

export function Sidebar() {
  const pathname =
    usePathname();


  const [
    desktopMoreOpen,
    setDesktopMoreOpen,
  ] =
    useState(
      false,
    );


  /**
   * Storing the opening pathname makes the sheet close
   * automatically whenever navigation changes.
   */
  const [
    mobileMorePath,
    setMobileMorePath,
  ] =
    useState<
      string |
      null
    >(
      null,
    );


  const mobileMoreOpen =
    mobileMorePath ===
    pathname;


  const secondaryRouteActive =
    hasActiveRoute(
      pathname,
      SECONDARY_NAVIGATION_ITEMS,
    );


  const mobileMoreRouteActive =
    hasActiveRoute(
      pathname,
      MOBILE_MORE_ITEMS,
    );


  const showDesktopMore =
    desktopMoreOpen ||
    secondaryRouteActive;


  /* =======================================================
   * 9. MOBILE SHEET SCROLL LOCK
   * ===================================================== */

  useEffect(
    () => {
      if (
        !mobileMoreOpen
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
      mobileMoreOpen,
    ],
  );


  /* =======================================================
   * 10. ESCAPE KEY
   * ===================================================== */

  useEffect(
    () => {
      if (
        !mobileMoreOpen
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
          setMobileMorePath(
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
      mobileMoreOpen,
    ],
  );


  function closeMobileMore():
  void {
    setMobileMorePath(
      null,
    );
  }


  function toggleMobileMore():
  void {
    setMobileMorePath(
      (
        current,
      ) =>
        current ===
          pathname
          ? null
          : pathname,
    );
  }


  return (
    <>
      {/* ===================================================
       * DESKTOP SIDEBAR
       * ================================================= */}

      <aside
        id="life-os-sidebar"
        className="sidebar"
        aria-label="التنقل الرئيسي"
      >
        <div className="sidebar__inner">
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
          </div>


          <nav
            className="sidebar__navigation"
            aria-label="صفحات LIFE OS"
          >
            <ul className="sidebar__list">
              {MAIN_NAVIGATION_ITEMS.map(
                (
                  item,
                ) => (
                  <DesktopNavigationItem
                    key={
                      item.href
                    }
                    item={
                      item
                    }
                    pathname={
                      pathname
                    }
                  />
                ),
              )}
            </ul>


            <div className="sidebar__more">
              <button
                type="button"
                className="sidebar__link sidebar__more-button"
                aria-expanded={
                  showDesktopMore
                }
                aria-controls="life-os-secondary-navigation"
                onClick={() => {
                  setDesktopMoreOpen(
                    (
                      current,
                    ) =>
                      !current,
                  );
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
                  className={[
                    "sidebar__more-arrow",
                    showDesktopMore
                      ? "sidebar__more-arrow--open"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>


              {showDesktopMore ? (
                <ul
                  id="life-os-secondary-navigation"
                  className="sidebar__list sidebar__secondary-list"
                >
                  {SECONDARY_NAVIGATION_ITEMS.map(
                    (
                      item,
                    ) => (
                      <DesktopNavigationItem
                        key={
                          item.href
                        }
                        item={
                          item
                        }
                        pathname={
                          pathname
                        }
                      />
                    ),
                  )}
                </ul>
              ) : null}
            </div>
          </nav>


          <div className="sidebar__footer">
            <p className="sidebar__footer-text">
              بسيط في العرض، عميق في الذكاء.
            </p>
          </div>
        </div>
      </aside>


      {/* ===================================================
       * MOBILE MORE BACKDROP
       * ================================================= */}

      {mobileMoreOpen ? (
        <button
          type="button"
          className="mobile-more-backdrop"
          aria-label="إغلاق قائمة المزيد"
          onClick={
            closeMobileMore
          }
        />
      ) : null}


      {/* ===================================================
       * MOBILE MORE SHEET
       * ================================================= */}

      {mobileMoreOpen ? (
        <section
          id="life-os-mobile-more"
          className="mobile-more-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="life-os-mobile-more-title"
        >
          <div className="mobile-more-sheet__handle" />


          <div className="mobile-more-sheet__header">
            <div>
              <p className="mobile-more-sheet__eyebrow">
                LIFE OS
              </p>

              <h2
                id="life-os-mobile-more-title"
                className="mobile-more-sheet__title"
              >
                المزيد
              </h2>
            </div>


            <button
              type="button"
              className="mobile-more-sheet__close"
              aria-label="إغلاق قائمة المزيد"
              onClick={
                closeMobileMore
              }
            >
              ×
            </button>
          </div>


          <ul className="mobile-more-sheet__list">
            {MOBILE_MORE_ITEMS.map(
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
                  >
                    <Link
                      href={
                        item.href
                      }
                      className={[
                        "mobile-more-sheet__link",
                        active
                          ? "mobile-more-sheet__link--active"
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
                        closeMobileMore
                      }
                    >
                      <span
                        className="mobile-more-sheet__icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>


                      <span>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </section>
      ) : null}


      {/* ===================================================
       * MOBILE FIXED BOTTOM NAVIGATION
       * ================================================= */}

      <nav
        className="mobile-bottom-navigation"
        aria-label="التنقل السريع"
      >
        <ul className="mobile-bottom-navigation__list">
          {MOBILE_NAVIGATION_ITEMS.map(
            (
              item,
            ) => (
              <MobileNavigationItem
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
                  closeMobileMore
                }
              />
            ),
          )}


          <li className="mobile-bottom-navigation__item">
            <button
              type="button"
              className={[
                "mobile-bottom-navigation__link",
                "mobile-bottom-navigation__button",
                mobileMoreRouteActive ||
                mobileMoreOpen
                  ? "mobile-bottom-navigation__link--active"
                  : "",
              ]
                .filter(
                  Boolean,
                )
                .join(
                  " ",
                )}
              aria-expanded={
                mobileMoreOpen
              }
              aria-controls="life-os-mobile-more"
              onClick={
                toggleMobileMore
              }
            >
              <span
                className="mobile-bottom-navigation__icon"
                aria-hidden="true"
              >
                ⋯
              </span>


              <span className="mobile-bottom-navigation__label">
                المزيد
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}


/* =========================================================
 * 11. NAVIGATION CONTRACT
 * ======================================================= */

/**
 * Desktop keeps the complete six-area sidebar.
 *
 * Mobile keeps the five most-used areas visible and places
 * Travel plus detailed pages inside a single bottom sheet.
 *
 * Navigation has no authority to read or mutate private data.
 * Authentication and ownership remain enforced server-side.
 */
