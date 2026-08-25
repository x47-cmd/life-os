import type {
  Metadata,
} from "next";

import {
  AppShell,
} from "@/components/app-shell";

import {
  EmptyState,
} from "@/components/empty-state";

import {
  PageHeader,
} from "@/components/page-header";

import {
  StatCard,
} from "@/components/stat-card";

import {
  requireAuthenticatedIdentity,
} from "@/lib/auth";

import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/format";

import {
  createPrivateDocumentSignedUrl,
  getTravelSnapshot,
  listDocuments,
  listTrips,
} from "@/lib/travel-data";

import type {
  Document,
  Trip,
  TripStatus,
  UUID,
} from "@/lib/types";


/* =========================================================
 * LIFE OS V2
 * TRAVEL OS
 *
 * One private place for:
 *
 * - next trip
 * - active trip
 * - readiness
 * - dates
 * - budget
 * - trip history
 * - private PDF documents
 *
 *
 * Security:
 *
 * - authenticated page only
 * - PostgreSQL RLS
 * - private Supabase Storage
 * - short-lived signed document URLs
 * - no public PDF URLs
 * ======================================================= */


/* =========================================================
 * 1. PAGE CONFIGURATION
 * ======================================================= */

export const dynamic =
  "force-dynamic";


export const metadata:
Metadata = {
  title:
    "السفر",
};


/* =========================================================
 * 2. STATUS LABEL
 * ======================================================= */

function getTripStatusLabel(
  status:
    TripStatus,
): string {
  switch (
    status
  ) {
    case "planned":
      return "مخطط لها";

    case "booked":
      return "محجوزة";

    case "active":
      return "جارية الآن";

    case "completed":
      return "مكتملة";

    case "cancelled":
      return "ملغاة";

    default: {
      const exhaustive:
        never =
        status;

      return exhaustive;
    }
  }
}


/* =========================================================
 * 3. STATUS BADGE
 * ======================================================= */

function getTripStatusBadgeClass(
  status:
    TripStatus,
): string {
  switch (
    status
  ) {
    case "active":
      return "badge badge--positive";

    case "booked":
      return "badge badge--accent";

    case "planned":
      return "badge";

    case "completed":
      return "badge badge--positive";

    case "cancelled":
      return "badge badge--warning";

    default: {
      const exhaustive:
        never =
        status;

      void exhaustive;

      return "badge";
    }
  }
}


/* =========================================================
 * 4. READINESS TONE
 * ======================================================= */

function getReadinessTone(
  readiness:
    number,
):
  | "positive"
  | "warning"
  | "negative"
  | "neutral" {
  if (
    readiness >=
    80
  ) {
    return "positive";
  }


  if (
    readiness >=
    40
  ) {
    return "warning";
  }


  if (
    readiness >
    0
  ) {
    return "neutral";
  }


  return "warning";
}


/* =========================================================
 * 5. BUDGET DISPLAY
 * ======================================================= */

function formatTripBudget(
  trip:
    Pick<
      Trip,
      | "budget_total"
      | "currency"
    >,
): string {
  if (
    trip.budget_total ===
    null
  ) {
    return "غير محددة";
  }


  return formatCurrency(
    trip.budget_total,
    trip.currency,
  );
}


/* =========================================================
 * 6. DATE RANGE
 * ======================================================= */

function formatTripDateRange(
  trip:
    Pick<
      Trip,
      | "start_date"
      | "end_date"
    >,
): string {
  if (
    !trip.start_date &&
    !trip.end_date
  ) {
    return "التاريخ غير محدد";
  }


  if (
    trip.start_date &&
    !trip.end_date
  ) {
    return `من ${formatDate(
      trip.start_date,
    )}`;
  }


  if (
    !trip.start_date &&
    trip.end_date
  ) {
    return `حتى ${formatDate(
      trip.end_date,
    )}`;
  }


  return `${formatDate(
    trip.start_date,
  )} — ${formatDate(
    trip.end_date,
  )}`;
}


/* =========================================================
 * 7. DOCUMENT CATEGORY LABEL
 * ======================================================= */

function getDocumentCategoryLabel(
  category:
    Document["category"],
): string {
  switch (
    category
  ) {
    case "travel":
      return "سفر";

    case "education":
      return "تعليم";

    case "career":
      return "مهني";

    case "finance":
      return "مالي";

    case "personal":
      return "شخصي";

    case "general":
      return "عام";

    case "other":
      return "أخرى";

    default: {
      const exhaustive:
        never =
        category;

      return exhaustive;
    }
  }
}


/* =========================================================
 * 8. FILE SIZE
 * ======================================================= */

function formatFileSize(
  bytes:
    number,
): string {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1,
    )} KB`;
  }


  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1,
  )} MB`;
}


/* =========================================================
 * 9. SAFE PRIVATE DOCUMENT LINK
 * ======================================================= */

interface PrivateDocumentLink {
  document_id:
    UUID;

  url:
    string |
    null;
}


async function getPrivateDocumentLink(
  document:
    Document,
): Promise<PrivateDocumentLink> {
  try {
    const signed =
      await createPrivateDocumentSignedUrl(
        document.id,
        300,
      );


    return {
      document_id:
        document.id,

      url:
        signed.url,
    };
  } catch {
    /*
     * One unavailable private file must not break the whole
     * Travel OS page.
     */
    return {
      document_id:
        document.id,

      url:
        null,
    };
  }
}


/* =========================================================
 * 10. TRIP CARD
 * ======================================================= */

function TripCard({
  trip,
  featured =
    false,
}: {
  trip:
    Trip;

  featured?:
    boolean;
}) {
  return (
    <article
      className="card"
      style={
        featured
          ? {
              minHeight:
                "100%",
            }
          : undefined
      }
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            "16px",

          flexWrap:
            "wrap",
        }}
      >
        <div>
          <span
            className={
              getTripStatusBadgeClass(
                trip.status,
              )
            }
          >
            {
              getTripStatusLabel(
                trip.status,
              )
            }
          </span>


          <h3
            style={{
              marginTop:
                "12px",

              marginBottom:
                "4px",
            }}
          >
            {trip.title}
          </h3>


          <p
            className="text-muted"
            style={{
              margin:
                0,
            }}
          >
            ✈ {trip.destination}
          </p>
        </div>


        <div
          style={{
            textAlign:
              "end",
          }}
        >
          <div className="text-subtle text-small">
            الجاهزية
          </div>

          <strong
            style={{
              fontSize:
                featured
                  ? "24px"
                  : "18px",
            }}
          >
            {
              formatPercent(
                trip.readiness_percent,
              )
            }
          </strong>
        </div>
      </div>


      <div
        style={{
          marginTop:
            "18px",
        }}
      >
        <progress
          value={
            trip.readiness_percent
          }
          max={100}
          style={{
            width:
              "100%",

            height:
              "10px",
          }}
          aria-label={`جاهزية الرحلة ${trip.readiness_percent}%`}
        />
      </div>


      <div
        className="grid grid--2"
        style={{
          marginTop:
            "18px",
        }}
      >
        <div>
          <div className="text-subtle text-small">
            التاريخ
          </div>

          <strong>
            {
              formatTripDateRange(
                trip,
              )
            }
          </strong>
        </div>


        <div>
          <div className="text-subtle text-small">
            الميزانية
          </div>

          <strong className="currency">
            {
              formatTripBudget(
                trip,
              )
            }
          </strong>
        </div>
      </div>


      {trip.notes ? (
        <div
          style={{
            marginTop:
              "18px",
          }}
        >
          <div className="text-subtle text-small">
            ملاحظات
          </div>

          <p
            className="text-muted"
            style={{
              marginTop:
                "4px",

              marginBottom:
                0,
            }}
          >
            {trip.notes}
          </p>
        </div>
      ) : null}
    </article>
  );
}


/* =========================================================
 * 11. PAGE
 * ======================================================= */

export default async function TravelPage() {
  /*
   * Page-level authentication boundary.
   */
  await requireAuthenticatedIdentity();


  /*
   * RLS still protects every underlying query.
   */
  const [
    snapshot,
    trips,
    documents,
  ] =
    await Promise.all([
      getTravelSnapshot(),

      listTrips(),

      listDocuments({
        include_archived:
          false,

        limit:
          50,
      }),
    ]);


  /*
   * Active trip takes visual priority.
   *
   * Otherwise show the next planned/booked trip.
   */
  const focusTripId =
    snapshot.active_trips[0]?.id ??
    snapshot.next_trip?.id ??
    null;


  const focusTrip =
    focusTripId
      ? trips.find(
          (
            trip,
          ) =>
            trip.id ===
            focusTripId,
        ) ??
        null
      : null;


  const upcomingTrips =
    trips.filter(
      (
        trip,
      ) =>
        (
          trip.status ===
            "planned" ||
          trip.status ===
            "booked"
        ) &&
        trip.id !==
          focusTripId,
    );


  const activeTrips =
    trips.filter(
      (
        trip,
      ) =>
        trip.status ===
          "active" &&
        trip.id !==
          focusTripId,
    );


  const pastTrips =
    trips.filter(
      (
        trip,
      ) =>
        trip.status ===
          "completed" ||
        trip.status ===
          "cancelled",
    );


  /*
   * Signed URLs are generated only for currently visible
   * active document rows.
   *
   * They expire after 5 minutes.
   */
  const documentLinks =
    await Promise.all(
      documents.map(
        getPrivateDocumentLink,
      ),
    );


  const documentLinkMap =
    new Map(
      documentLinks.map(
        (
          item,
        ) => [
          item.document_id,
          item.url,
        ],
      ),
    );


  const focusReadiness =
    focusTrip?.readiness_percent ??
    0;


  const focusBudget =
    focusTrip
      ? formatTripBudget(
          focusTrip,
        )
      : "—";


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="Travel OS"
          title="السفر"
          description="رحلاتك القادمة، جاهزيتك، ميزانياتك ومستنداتك الخاصة في مكان واحد."
          meta={
            <span>
              استخدم زر{" "}
              <strong>
                +
              </strong>{" "}
              لإضافة رحلة أو رفع PDF.
            </span>
          }
        />


        {/* =================================================
         * SNAPSHOT
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="travel-snapshot-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="travel-snapshot-title"
                className="section-title"
              >
                نظرة سريعة
              </h2>

              <p className="section-description">
                أهم وضع السفر عندك الآن فقط.
              </p>
            </div>
          </div>


          <div className="stats-grid">
            <StatCard
              label={
                focusTrip
                  ? "جاهزية الرحلة"
                  : "الجاهزية"
              }
              value={
                focusTrip
                  ? formatPercent(
                      focusReadiness,
                    )
                  : "—"
              }
              tone={
                focusTrip
                  ? getReadinessTone(
                      focusReadiness,
                    )
                  : "neutral"
              }
              helper={
                focusTrip
                  ? focusTrip.destination
                  : "لا توجد رحلة قادمة."
              }
              icon="✓"
            />


            <StatCard
              label="الميزانية القادمة"
              value={
                focusBudget
              }
              tone="neutral"
              helper={
                focusTrip
                  ? focusTrip.title
                  : "لا توجد ميزانية رحلة حالية."
              }
              icon="◈"
            />


            <StatCard
              label="الرحلات القادمة"
              value={String(
                snapshot
                  .upcoming_trips
                  .length +
                snapshot
                  .active_trips
                  .length,
              )}
              tone="neutral"
              helper="مخططة، محجوزة أو جارية."
              icon="✈"
            />


            <StatCard
              label="المستندات الخاصة"
              value={String(
                snapshot
                  .document_count,
              )}
              tone={
                snapshot
                  .document_count >
                0
                  ? "positive"
                  : "neutral"
              }
              helper="PDF محفوظة في التخزين الخاص."
              icon="▣"
            />
          </div>
        </section>


        {/* =================================================
         * FOCUS TRIP
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="travel-focus-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="travel-focus-title"
                className="section-title"
              >
                {
                  focusTrip?.status ===
                    "active"
                    ? "رحلتك الحالية"
                    : "الرحلة القادمة"
                }
              </h2>

              <p className="section-description">
                الرحلة الأهم الآن تظهر أولًا تلقائيًا.
              </p>
            </div>
          </div>


          {focusTrip ? (
            <TripCard
              trip={
                focusTrip
              }
              featured
            />
          ) : (
            <EmptyState
              compact
              icon="✈"
              title="لا توجد رحلة قادمة"
              description="استخدم زر + واكتب وجهتك أو ارفع برنامج الرحلة PDF."
            />
          )}
        </section>


        {/* =================================================
         * OTHER UPCOMING / ACTIVE
         * =============================================== */}

        {(
          activeTrips.length >
            0 ||
          upcomingTrips.length >
            0
        ) ? (
          <section
            className="page-section"
            aria-labelledby="travel-upcoming-title"
          >
            <div className="section-header">
              <div className="section-header__content">
                <h2
                  id="travel-upcoming-title"
                  className="section-title"
                >
                  رحلات أخرى
                </h2>

                <p className="section-description">
                  الرحلات النشطة والمخطط لها بعد الرحلة الرئيسية.
                </p>
              </div>
            </div>


            <div className="grid grid--2">
              {[
                ...activeTrips,
                ...upcomingTrips,
              ].map(
                (
                  trip,
                ) => (
                  <TripCard
                    key={
                      trip.id
                    }
                    trip={
                      trip
                    }
                  />
                ),
              )}
            </div>
          </section>
        ) : null}


        {/* =================================================
         * PRIVATE DOCUMENTS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="travel-documents-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="travel-documents-title"
                className="section-title"
              >
                المستندات الخاصة
              </h2>

              <p className="section-description">
                ملفات PDF خاصة فقط. روابط الفتح مؤقتة وليست عامة.
              </p>
            </div>
          </div>


          {documents.length >
          0 ? (
            <div className="grid grid--2">
              {documents.map(
                (
                  document,
                ) => {
                  const signedUrl =
                    documentLinkMap.get(
                      document.id,
                    ) ??
                    null;


                  const linkedTrip =
                    document.trip_id
                      ? trips.find(
                          (
                            trip,
                          ) =>
                            trip.id ===
                            document.trip_id,
                        ) ??
                        null
                      : null;


                  return (
                    <article
                      key={
                        document.id
                      }
                      className="card"
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "flex-start",

                          justifyContent:
                            "space-between",

                          gap:
                            "12px",
                        }}
                      >
                        <div>
                          <span className="badge">
                            {
                              getDocumentCategoryLabel(
                                document.category,
                              )
                            }
                          </span>


                          <h3
                            style={{
                              marginTop:
                                "12px",

                              marginBottom:
                                "4px",
                            }}
                          >
                            {document.title}
                          </h3>


                          <p
                            className="text-muted text-small"
                            style={{
                              margin:
                                0,
                            }}
                          >
                            {document.file_name}
                          </p>
                        </div>


                        <span
                          aria-hidden="true"
                          style={{
                            fontSize:
                              "22px",
                          }}
                        >
                          PDF
                        </span>
                      </div>


                      <div
                        className="grid grid--2"
                        style={{
                          marginTop:
                            "18px",
                        }}
                      >
                        <div>
                          <div className="text-subtle text-small">
                            الحجم
                          </div>

                          <strong>
                            {
                              formatFileSize(
                                document
                                  .file_size_bytes,
                              )
                            }
                          </strong>
                        </div>


                        <div>
                          <div className="text-subtle text-small">
                            الرحلة
                          </div>

                          <strong>
                            {
                              linkedTrip
                                ? linkedTrip.title
                                : "غير مرتبط"
                            }
                          </strong>
                        </div>
                      </div>


                      {document.notes ? (
                        <p
                          className="text-muted text-small"
                          style={{
                            marginTop:
                              "14px",

                            marginBottom:
                              0,
                          }}
                        >
                          {document.notes}
                        </p>
                      ) : null}


                      <div
                        style={{
                          marginTop:
                            "18px",
                        }}
                      >
                        {signedUrl ? (
                          <a
                            href={
                              signedUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button--secondary"
                          >
                            فتح PDF الخاص
                          </a>
                        ) : (
                          <span className="text-muted text-small">
                            تعذر تجهيز رابط الفتح الآن.
                          </span>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="▣"
              title="لا توجد مستندات سفر"
              description="ارفع PDF من زر + وسيتم حفظه داخل التخزين الخاص."
            />
          )}
        </section>


        {/* =================================================
         * HISTORY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="travel-history-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="travel-history-title"
                className="section-title"
              >
                الرحلات السابقة
              </h2>

              <p className="section-description">
                الرحلات المكتملة أو الملغاة.
              </p>
            </div>


            <div>
              <span className="badge">
                {
                  snapshot
                    .completed_trip_count
                }{" "}
                مكتملة
              </span>
            </div>
          </div>


          {pastTrips.length >
          0 ? (
            <div className="grid grid--2">
              {pastTrips.map(
                (
                  trip,
                ) => (
                  <TripCard
                    key={
                      trip.id
                    }
                    trip={
                      trip
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              compact
              title="لا توجد رحلات سابقة"
              description="بتظهر هنا الرحلات بعد اكتمالها."
              icon="○"
            />
          )}
        </section>


        {/* =================================================
         * PRIVACY NOTE
         * =============================================== */}

        <section className="page-section">
          <article className="card">
            <div
              style={{
                display:
                  "flex",

                gap:
                  "12px",

                alignItems:
                  "flex-start",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize:
                    "20px",
                }}
              >
                ◈
              </span>


              <div>
                <strong>
                  مستنداتك خاصة
                </strong>

                <p
                  className="text-muted text-small"
                  style={{
                    marginTop:
                      "4px",

                    marginBottom:
                      0,
                  }}
                >
                  ملفات السفر محفوظة في Private Storage ومحمية بحسابك.
                  LIFE OS لا ينشئ روابط عامة دائمة للملفات.
                </p>
              </div>
            </div>
          </article>
        </section>

      </div>
    </AppShell>
  );
}


/* =========================================================
 * FINAL TRAVEL OS RULE
 * ======================================================= */

/**
 * Travel OS displays only authenticated database facts.
 *
 *
 * It does not use AI to calculate:
 *
 * readiness
 * budget
 * trip status
 * next trip
 *
 *
 * AI may propose these values during Universal Add.
 *
 * The user must review and approve them first.
 *
 *
 * PDFs:
 *
 * private Storage
 *      ↓
 * RLS
 *      ↓
 * temporary signed URL
 *
 *
 * No public document URLs.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */