import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  AppShell,
} from "@/components/app-shell";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";

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
  requireAAL2Identity,
} from "@/lib/auth";

import {
  getInvestmentSnapshot,
  listInvestmentTransactions,
} from "@/lib/data";

import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatSignedCurrency,
} from "@/lib/format";

import type {
  InvestmentPosition,
  InvestmentTransaction,
  UUID,
} from "@/lib/types";


/* =========================================================
 * 1. METADATA
 * ======================================================= */

export const metadata: Metadata = {
  title:
    "الاستثمارات",
};


/* =========================================================
 * 2. ASSET TYPE LABEL
 * ======================================================= */

function getAssetTypeLabel(
  assetType: string,
): string {
  switch (assetType) {
    case "stock":
      return "سهم";

    case "etf":
      return "ETF";

    case "fund":
      return "صندوق";

    case "sukuk":
      return "صكوك";

    case "bond":
      return "سند";

    case "cash":
      return "نقد";

    case "other":
      return "أخرى";

    default:
      return assetType;
  }
}


/* =========================================================
 * 3. TRANSACTION TYPE LABEL
 * ======================================================= */

function getTransactionTypeLabel(
  type: string,
): string {
  switch (type) {
    case "buy":
      return "شراء";

    case "sell":
      return "بيع";

    case "dividend":
      return "توزيعات";

    case "deposit":
      return "إيداع";

    case "withdrawal":
      return "سحب";

    case "fee":
      return "رسوم";

    case "adjustment":
      return "تعديل";

    default:
      return type;
  }
}


/* =========================================================
 * 4. TRANSACTION BADGE
 * ======================================================= */

function getTransactionBadgeClass(
  type: string,
): string {
  switch (type) {
    case "buy":
    case "deposit":
      return "badge badge--accent";

    case "dividend":
      return "badge badge--positive";

    case "sell":
    case "withdrawal":
      return "badge badge--warning";

    case "fee":
      return "badge badge--negative";

    default:
      return "badge";
  }
}


/* =========================================================
 * 5. GAIN / LOSS TONE
 * ======================================================= */

function getGainLossTone(
  value: number,
):
  | "positive"
  | "negative"
  | "neutral" {
  if (
    value > 0
  ) {
    return "positive";
  }

  if (
    value < 0
  ) {
    return "negative";
  }

  return "neutral";
}


/* =========================================================
 * 6. GAIN / LOSS TEXT CLASS
 * ======================================================= */

function getGainLossClass(
  value: number | null,
): string {
  if (
    value === null ||
    value === 0
  ) {
    return "";
  }

  return value > 0
    ? "text-positive"
    : "text-negative";
}


/* =========================================================
 * 7. SORT POSITIONS
 * ======================================================= */

/**
 * Primary portfolio view:
 *
 * 1. Positions with the highest estimated value
 * 2. Unpriced positions afterward
 *
 * We do not ask AI to rank portfolio holdings.
 */
function sortPositions(
  positions:
    InvestmentPosition[],
): InvestmentPosition[] {
  return [
    ...positions,
  ].sort(
    (
      a,
      b,
    ) => {
      const aValue =
        a.estimated_value;

      const bValue =
        b.estimated_value;

      if (
        aValue === null &&
        bValue === null
      ) {
        return a.asset.ticker.localeCompare(
          b.asset.ticker,
        );
      }

      if (
        aValue === null
      ) {
        return 1;
      }

      if (
        bValue === null
      ) {
        return -1;
      }

      return (
        bValue -
        aValue
      );
    },
  );
}


/* =========================================================
 * 8. POSITION TABLE COLUMNS
 * ======================================================= */

function buildPositionColumns(
  portfolioCurrency: string,
): readonly DataTableColumn<InvestmentPosition>[] {
  return [
    {
      key:
        "asset",

      header:
        "الأصل",

      render:
        (position) => (
          <div>
            <strong className="ticker">
              {
                position
                  .asset
                  .ticker
              }
            </strong>

            <div
              className="text-subtle text-small"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {
                position
                  .asset
                  .name
              }
            </div>
          </div>
        ),
    },

    {
      key:
        "market",

      header:
        "السوق",

      render:
        (position) => (
          <div>
            <span>
              {
                position
                  .asset
                  .market
              }
            </span>

            <div
              className="text-subtle text-small"
              style={{
                marginTop:
                  "2px",
              }}
            >
              {
                getAssetTypeLabel(
                  position
                    .asset
                    .asset_type,
                )
              }
            </div>
          </div>
        ),
    },

    {
      key:
        "quantity",

      header:
        "الكمية",

      align:
        "end",

      render:
        (position) => (
          <span className="number">
            {
              formatQuantity(
                position
                  .asset
                  .quantity,
              )
            }
          </span>
        ),
    },

    {
      key:
        "average_cost",

      header:
        "متوسط التكلفة",

      align:
        "end",

      render:
        (position) => (
          <span className="number">
            {
              formatPrice(
                position
                  .asset
                  .average_cost,
              )
            }
          </span>
        ),
    },

    {
      key:
        "reference_price",

      header:
        "السعر المرجعي",

      align:
        "end",

      render:
        (position) =>
          position
            .asset
            .reference_price !==
          null ? (
            <span className="number">
              {
                formatPrice(
                  position
                    .asset
                    .reference_price,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "value",

      header:
        "القيمة",

      align:
        "end",

      render:
        (position) =>
          position
            .estimated_value !==
          null ? (
            <span className="currency">
              {
                formatCurrency(
                  position
                    .estimated_value,
                  position
                    .asset
                    .currency,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "gain_loss",

      header:
        "الربح / الخسارة",

      align:
        "end",

      render:
        (position) => {
          if (
            position
              .estimated_gain_loss ===
            null
          ) {
            return "—";
          }

          return (
            <div
              className={
                getGainLossClass(
                  position
                    .estimated_gain_loss,
                )
              }
            >
              <strong className="currency">
                {
                  formatSignedCurrency(
                    position
                      .estimated_gain_loss,
                    position
                      .asset
                      .currency,
                  )
                }
              </strong>

              {position
                .estimated_gain_loss_percent !==
              null ? (
                <div
                  className="percentage text-small"
                  style={{
                    marginTop:
                      "2px",
                  }}
                >
                  {
                    formatPercent(
                      position
                        .estimated_gain_loss_percent,
                    )
                  }
                </div>
              ) : null}
            </div>
          );
        },
    },

    {
      key:
        "allocation",

      header:
        "من المحفظة",

      align:
        "center",

      render:
        (position) => {
          /**
           * Allocation is only available for positions safely
           * included in the portfolio's base-currency total.
           */
          if (
            position
              .allocation_percent ===
            null
          ) {
            return (
              <span
                className="text-subtle"
                title={
                  position
                    .asset
                    .currency !==
                  portfolioCurrency
                    ? "لا يتم دمج العملات المختلفة بدون FX Engine."
                    : undefined
                }
              >
                —
              </span>
            );
          }

          return (
            <span className="percentage">
              {
                formatPercent(
                  position
                    .allocation_percent,
                )
              }
            </span>
          );
        },
    },

    {
      key:
        "target",

      header:
        "تقدم الهدف",

      align:
        "center",

      render:
        (position) =>
          position
            .target_progress_percent !==
          null ? (
            <span className="percentage">
              {
                formatPercent(
                  position
                    .target_progress_percent,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },
  ];
}


/* =========================================================
 * 9. ASSET LOOKUP
 * ======================================================= */

function buildAssetLookup(
  positions:
    InvestmentPosition[],
): Map<UUID, InvestmentPosition["asset"]> {
  return new Map(
    positions.map(
      (position) => [
        position.asset.id,
        position.asset,
      ],
    ),
  );
}


/* =========================================================
 * 10. TRANSACTION TABLE COLUMNS
 * ======================================================= */

function buildTransactionColumns(
  assetLookup:
    Map<
      UUID,
      InvestmentPosition["asset"]
    >,
): readonly DataTableColumn<InvestmentTransaction>[] {
  return [
    {
      key:
        "date",

      header:
        "التاريخ",

      render:
        (transaction) =>
          formatDate(
            transaction
              .transaction_date,
          ),
    },

    {
      key:
        "asset",

      header:
        "الأصل",

      render:
        (transaction) => {
          const asset =
            assetLookup.get(
              transaction.asset_id,
            );

          return asset ? (
            <div>
              <strong className="ticker">
                {asset.ticker}
              </strong>

              <div
                className="text-subtle text-small"
                style={{
                  marginTop:
                    "2px",
                }}
              >
                {asset.name}
              </div>
            </div>
          ) : (
            "—"
          );
        },
    },

    {
      key:
        "type",

      header:
        "العملية",

      render:
        (transaction) => (
          <span
            className={
              getTransactionBadgeClass(
                transaction
                  .transaction_type,
              )
            }
          >
            {
              getTransactionTypeLabel(
                transaction
                  .transaction_type,
              )
            }
          </span>
        ),
    },

    {
      key:
        "quantity",

      header:
        "الكمية",

      align:
        "end",

      render:
        (transaction) =>
          transaction.quantity !==
          null ? (
            <span className="number">
              {
                formatQuantity(
                  transaction.quantity,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "unit_price",

      header:
        "سعر الوحدة",

      align:
        "end",

      render:
        (transaction) =>
          transaction.unit_price !==
          null ? (
            <span className="number">
              {
                formatPrice(
                  transaction
                    .unit_price,
                )
              }
            </span>
          ) : (
            "—"
          ),
    },

    {
      key:
        "total",

      header:
        "الإجمالي",

      align:
        "end",

      render:
        (transaction) => {
          const asset =
            assetLookup.get(
              transaction.asset_id,
            );

          if (
            !asset
          ) {
            return (
              <span className="number">
                {
                  transaction
                    .total_amount
                }
              </span>
            );
          }

          return (
            <span className="currency">
              {
                formatCurrency(
                  transaction
                    .total_amount,
                  asset.currency,
                )
              }
            </span>
          );
        },
    },

    {
      key:
        "fees",

      header:
        "الرسوم",

      align:
        "end",

      render:
        (transaction) => {
          const asset =
            assetLookup.get(
              transaction.asset_id,
            );

          if (
            !asset
          ) {
            return (
              <span className="number">
                {transaction.fees}
              </span>
            );
          }

          return (
            <span className="currency">
              {
                formatCurrency(
                  transaction.fees,
                  asset.currency,
                )
              }
            </span>
          );
        },
    },
  ];
}


/* =========================================================
 * 11. INVESTMENTS PAGE
 * ======================================================= */

export default async function InvestmentsPage() {
  await requireAAL2Identity();

  const [
    investmentSnapshot,
    transactionRows,
  ] =
    await Promise.all([
      getInvestmentSnapshot(),
      listInvestmentTransactions(),
    ]);

  const positions =
    sortPositions(
      investmentSnapshot
        .positions,
    );

  const activePositions =
    positions.filter(
      (position) =>
        position.asset.is_active,
    );

  const transactions =
    transactionRows.slice(
      0,
      10,
    );

  const assetLookup =
    buildAssetLookup(
      positions,
    );

  const positionColumns =
    buildPositionColumns(
      investmentSnapshot.currency,
    );

  const transactionColumns =
    buildTransactionColumns(
      assetLookup,
    );


  return (
    <AppShell>
      <div className="page">

        {/* =================================================
         * HEADER
         * =============================================== */}

        <PageHeader
          eyebrow="المحفظة"
          title="الاستثمارات"
          description="وضع محفظتك، أهداف الضخ، وتقدم كل أصل بدون تنفيذ أي صفقة تلقائيًا."
          meta={
            <span>
              العملة الأساسية:{" "}
              <strong className="ltr">
                {
                  investmentSnapshot
                    .currency
                }
              </strong>
            </span>
          }
        />


        {/* =================================================
         * PORTFOLIO SUMMARY
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="investment-summary-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="investment-summary-title"
                className="section-title"
              >
                وضع المحفظة
              </h2>

              <p className="section-description">
                الأرقام الأساسية للمحفظة بالعملة الرئيسية.
              </p>
            </div>
          </div>


          <div className="stats-grid">

            <StatCard
              label="القيمة التقديرية"
              value={
                formatCurrency(
                  investmentSnapshot
                    .total_estimated_value,
                  investmentSnapshot
                    .currency,
                )
              }
              tone="neutral"
              helper="للأصول المسعرة ضمن العملة الأساسية."
              icon="◈"
            />


            <StatCard
              label="التكلفة"
              value={
                formatCurrency(
                  investmentSnapshot
                    .total_cost_basis,
                  investmentSnapshot
                    .currency,
                )
              }
              tone="neutral"
              helper="أساس التكلفة للأصول ضمن العملة الأساسية."
              icon="="
            />


            <StatCard
              label="الربح / الخسارة"
              value={
                formatSignedCurrency(
                  investmentSnapshot
                    .total_estimated_gain_loss,
                  investmentSnapshot
                    .currency,
                )
              }
              tone={
                getGainLossTone(
                  investmentSnapshot
                    .total_estimated_gain_loss,
                )
              }
              helper="تقديري بناءً على الأسعار المرجعية المسجلة."
              icon="↗"
            />


            <StatCard
              label="هدف الضخ الشهري"
              value={
                formatCurrency(
                  investmentSnapshot
                    .total_monthly_contribution_target,
                  investmentSnapshot
                    .currency,
                )
              }
              tone="neutral"
              helper="إجمالي الأهداف الشهرية المسجلة للأصول."
              icon="+"
            />

          </div>
        </section>


        {/* =================================================
         * LIFE INVEST AI
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="life-invest-ai-title"
        >
          <article
            className="card"
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 1fr) auto",

              gap:
                "18px",

              alignItems:
                "center",
            }}
          >
            <div>
              <div
                className="badge badge--accent"
                style={{
                  marginBottom:
                    "10px",
                }}
              >
                ✦ إضافة ذكية
              </div>

              <h2
                id="life-invest-ai-title"
                className="section-title"
                style={{
                  margin:
                    0,
                }}
              >
                LIFE Invest AI
              </h2>

              <p
                className="text-subtle"
                style={{
                  margin:
                    "8px 0 0",

                  maxWidth:
                    "720px",

                  lineHeight:
                    1.7,
                }}
              >
                تحليل إضافي للسوق ومحفظتك يجمع البيانات، الشارت، النتائج والأخبار ويعطيك رأيًا احتماليًا مع سجل حقيقي لدقة توقعاته.
              </p>

              <p
                className="text-subtle text-small"
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                أداة مساعدة فقط — القرار والتنفيذ يظلان بيدك.
              </p>
            </div>

            <Link
              href="/investments/intelligence"
              aria-label="فتح LIFE Invest AI"
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                minHeight:
                  "44px",

                padding:
                  "10px 16px",

                borderRadius:
                  "12px",

                textDecoration:
                  "none",

                fontWeight:
                  700,

                whiteSpace:
                  "nowrap",

                background:
                  "#111827",

                color:
                  "#ffffff",
              }}
            >
              فتح التحليل
            </Link>
          </article>
        </section>


        {/* =================================================
         * INVESTMENT PRINCIPLE
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="investment-signal-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="investment-signal-title"
                className="section-title"
              >
                قاعدة LIFE OS
              </h2>
            </div>
          </div>

          <div
            className="alert"
            role="note"
          >
            LIFE OS يقرأ ويحلل ويقترح فقط. لا يشتري، لا يبيع، ولا يرسل أوامر للوسيط المالي.
          </div>
        </section>


        {/* =================================================
         * POSITIONS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="positions-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="positions-title"
                className="section-title"
              >
                الأصول
              </h2>

              <p className="section-description">
                الكمية، التكلفة، السعر المرجعي، والقرب من الهدف لكل أصل.
              </p>
            </div>
          </div>


          {activePositions.length > 0 ? (
            <DataTable
              rows={
                activePositions
              }
              columns={
                positionColumns
              }
              getRowKey={
                (position) =>
                  position.asset.id
              }
              caption="الأصول الاستثمارية النشطة"
            />
          ) : (
            <EmptyState
              icon="↗"
              title="لا توجد أصول استثمارية نشطة"
              description="عندما تسجل أول أصل، سيظهر هنا مع الكمية ومتوسط التكلفة والقيمة والتقدم نحو الهدف."
            />
          )}
        </section>


        {/* =================================================
         * TARGET PROGRESS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="investment-targets-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="investment-targets-title"
                className="section-title"
              >
                أهداف الكميات
              </h2>

              <p className="section-description">
                ركز فقط على الأصول التي لها كمية مستهدفة مسجلة.
              </p>
            </div>
          </div>


          {activePositions.some(
            (position) =>
              position.asset
                .target_quantity !==
              null,
          ) ? (
            <div className="grid grid--2">
              {activePositions
                .filter(
                  (position) =>
                    position.asset
                      .target_quantity !==
                    null,
                )
                .map(
                  (position) => {
                    const progress =
                      position
                        .target_progress_percent ??
                      0;

                    return (
                      <article
                        key={
                          position
                            .asset
                            .id
                        }
                        className="card"
                      >
                        <div className="space-between">
                          <div>
                            <strong className="ticker">
                              {
                                position
                                  .asset
                                  .ticker
                              }
                            </strong>

                            <div
                              className="text-subtle text-small"
                              style={{
                                marginTop:
                                  "3px",
                              }}
                            >
                              {
                                position
                                  .asset
                                  .name
                              }
                            </div>
                          </div>

                          <strong className="percentage">
                            {
                              formatPercent(
                                progress,
                              )
                            }
                          </strong>
                        </div>


                        <div
                          className="progress"
                          style={{
                            marginTop:
                              "16px",
                          }}
                          aria-label={
                            `التقدم ${formatPercent(progress)}`
                          }
                        >
                          <div
                            className="progress__value"
                            style={{
                              width:
                                `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    progress,
                                  ),
                                )}%`,
                            }}
                          />
                        </div>


                        <div
                          className="stack stack--small"
                          style={{
                            marginTop:
                              "16px",
                          }}
                        >
                          <div className="space-between">
                            <span className="text-muted text-small">
                              الحالي
                            </span>

                            <strong className="number">
                              {
                                formatQuantity(
                                  position
                                    .asset
                                    .quantity,
                                )
                              }
                            </strong>
                          </div>

                          <div className="space-between">
                            <span className="text-muted text-small">
                              الهدف
                            </span>

                            <strong className="number">
                              {
                                formatQuantity(
                                  position
                                    .asset
                                    .target_quantity ??
                                  0,
                                )
                              }
                            </strong>
                          </div>

                          <div className="space-between">
                            <span className="text-muted text-small">
                              هدف الضخ الشهري
                            </span>

                            <strong className="currency">
                              {
                                position
                                  .asset
                                  .monthly_contribution_target !==
                                null
                                  ? formatCurrency(
                                      position
                                        .asset
                                        .monthly_contribution_target,
                                      position
                                        .asset
                                        .currency,
                                    )
                                  : "—"
                              }
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
            </div>
          ) : (
            <EmptyState
              compact
              icon="◎"
              title="لا توجد أهداف كمية مسجلة"
              description="يمكن الاحتفاظ بالأصل بدون هدف كمية؛ LIFE OS لن يخترع هدفًا من تلقاء نفسه."
            />
          )}
        </section>


        {/* =================================================
         * RECENT TRANSACTIONS
         * =============================================== */}

        <section
          className="page-section"
          aria-labelledby="investment-transactions-title"
        >
          <div className="section-header">
            <div className="section-header__content">
              <h2
                id="investment-transactions-title"
                className="section-title"
              >
                آخر العمليات
              </h2>

              <p className="section-description">
                آخر 10 عمليات استثمارية مسجلة في LIFE OS.
              </p>
            </div>
          </div>


          <DataTable
            rows={
              transactions
            }
            columns={
              transactionColumns
            }
            getRowKey={
              (transaction) =>
                transaction.id
            }
            caption="آخر العمليات الاستثمارية"
            emptyMessage="لا توجد عمليات استثمارية مسجلة حاليًا."
            compact
          />
        </section>


        {/* =================================================
         * CROSS-CURRENCY NOTE
         * =============================================== */}

        {activePositions.some(
          (position) =>
            position.asset.currency !==
            investmentSnapshot.currency,
        ) ? (
          <section className="page-section">
            <div
              className="alert alert--warning"
              role="note"
            >
              توجد أصول بعملة مختلفة عن{" "}
              <strong className="ltr">
                {
                  investmentSnapshot
                    .currency
                }
              </strong>
              . LIFE OS V1 لا يدمج العملات المختلفة في إجمالي واحد بدون سعر صرف موثوق.
            </div>
          </section>
        ) : null}

      </div>
    </AppShell>
  );
}


/* =========================================================
 * 12. SOURCE OF TRUTH
 * ======================================================= */

/**
 * Portfolio arithmetic is NOT calculated by this page.
 *
 * Source:
 *
 * lib/data.ts
 *      ↓
 * calculateInvestmentSnapshot()
 *
 * This page only presents the resulting deterministic
 * InvestmentSnapshot.
 */


/* =========================================================
 * 13. REFERENCE PRICE RULE
 * ======================================================= */

/**
 * reference_price is a stored reference value.
 *
 * It does not automatically mean:
 *
 * - live broker price
 * - executable market quote
 * - guaranteed sale price
 *
 * V1 does not execute brokerage transactions.
 */


/* =========================================================
 * 14. CROSS-CURRENCY RULE
 * ======================================================= */

/**
 * LIFE OS V1 has no authoritative FX engine.
 *
 * Therefore:
 *
 * AED + USD + another currency
 *
 * are never silently added together as though they were the
 * same monetary unit.
 *
 * Individual foreign-currency positions remain visible.
 */


/* =========================================================
 * 15. TARGET RULE
 * ======================================================= */

/**
 * target_quantity and monthly_contribution_target are user /
 * application planning values.
 *
 * AI does not silently create, modify or execute them.
 */


/* =========================================================
 * 16. TRANSACTION RULE
 * ======================================================= */

/**
 * Investment transactions stored here are records.
 *
 * Recording:
 *
 * "buy"
 *
 * means that LIFE OS has a record describing a purchase.
 *
 * It does NOT mean LIFE OS itself sent an order to a broker.
 */


/* =========================================================
 * 17. AI RULE
 * ======================================================= */

/**
 * Opening Investments does not send portfolio data to
 * OpenAI.
 *
 * LIFE Invest AI remains an optional subpage.
 *
 * Opening the normal Investments page does NOT automatically
 * run market analysis or send the portfolio to OpenAI.
 *
 * Analysis starts only after the user explicitly opens the
 * intelligence layer and requests analysis.
 */


/* =========================================================
 * 18. SECURITY RULE
 * ======================================================= */

/**
 * Server request
 *      ↓
 * requireAAL2Identity()
 *      ↓
 * investment data functions
 *      ↓
 * authenticated user ownership
 *      ↓
 * PostgreSQL RLS
 *
 * No user_id comes from the browser or AI.
 */


/* =========================================================
 * 19. EXECUTION BOUNDARY
 * ======================================================= */

/**
 * LIFE OS investments can:
 *
 * display ✅
 * calculate ✅
 * compare ✅
 * analyze ✅
 * recommend ✅
 *
 * It cannot:
 *
 * buy ❌
 * sell ❌
 * transfer money ❌
 * place broker orders ❌
 * rebalance automatically ❌
 */


/* =========================================================
 * 20. LIFE INVEST AI BOUNDARY
 * ======================================================= */

/**
 * LIFE Invest AI is an optional intelligence layer.
 *
 * It does NOT replace the normal portfolio experience.
 *
 *
 * Main page:
 *
 * holdings
 * cost basis
 * value
 * targets
 * transactions
 *
 *
 * Optional intelligence page:
 *
 * market evidence
 * technical analysis
 * AI interpretation
 * probabilistic forecasts
 * Track Record
 */


/* =========================================================
 * 21. FINAL INVESTMENT RULE
 * ======================================================= */

/**
 * Investments page should answer:
 *
 * What do I own?
 * What did it cost?
 * What is its reference value?
 * Am I up or down?
 * How much am I targeting monthly?
 * How close am I to each quantity target?
 * What was recently recorded?
 *
 *
 * LIFE Invest AI stays one optional click deeper.
 *
 *
 * Simple outside.
 * Intelligent underneath.
 */