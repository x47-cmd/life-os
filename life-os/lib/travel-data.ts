import {
  DEFAULT_TIMEZONE,
} from "@/lib/constants";

import {
  assertAuthenticatedIdentity,
} from "@/lib/auth";

import {
  createClient,
  type ServerSupabaseClient,
} from "@/lib/supabase/server";

import type {
  Document,
  DocumentCategory,
  DocumentUpdate,
  TravelSnapshot,
  Trip,
  TripInsert,
  TripSummary,
  TripUpdate,
  UUID,
} from "@/lib/types";

import {
  documentFileNameSchema,
  documentFileSizeSchema,
  documentInsertSchema,
  documentMimeTypeSchema,
  documentUpdateSchema,
  PRIVATE_DOCUMENT_MAX_SIZE_BYTES,
  PRIVATE_DOCUMENT_MIME_TYPE,
  PRIVATE_DOCUMENT_STORAGE_BUCKET,
  tripInsertSchema,
  tripUpdateSchema,
  uuidSchema,
} from "@/lib/validation";


/* =========================================================
 * LIFE OS V2
 * TRAVEL DATA LAYER
 *
 * Responsibilities:
 *
 * - Read private trips
 * - Create / update / delete private trips
 * - Build the Travel OS snapshot
 * - Read private PDF metadata
 * - Upload approved PDFs to private Supabase Storage
 * - Create short-lived private download URLs
 * - Update document metadata
 *
 *
 * Security:
 *
 * - identity comes from verified server auth
 * - user_id never comes from browser input
 * - normal publishable-key Supabase client only
 * - PostgreSQL RLS remains active
 * - Storage RLS remains active
 * - no service_role
 * - no public document URLs
 * - no PDF bytes stored in PostgreSQL
 * ======================================================= */


/* =========================================================
 * 1. ERROR
 * ======================================================= */

export type TravelDataErrorCode =
  | "INVALID_TRIP_ID"
  | "TRIP_NOT_FOUND"
  | "TRIP_CREATE_FAILED"
  | "TRIP_UPDATE_FAILED"
  | "TRIP_DELETE_FAILED"
  | "TRIP_DELETE_BLOCKED"
  | "TRAVEL_READ_FAILED"
  | "INVALID_DOCUMENT_ID"
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_READ_FAILED"
  | "DOCUMENT_UPDATE_FAILED"
  | "DOCUMENT_UPLOAD_FAILED"
  | "DOCUMENT_METADATA_FAILED"
  | "DOCUMENT_SIGNED_URL_FAILED"
  | "DOCUMENT_TRIP_NOT_FOUND"
  | "INVALID_DOCUMENT_FILE"
  | "EMPTY_UPDATE";


export class TravelDataError extends Error {
  readonly code:
    TravelDataErrorCode;

  readonly databaseCode:
    string | null;


  constructor(
    code:
      TravelDataErrorCode,

    databaseCode:
      string | null =
      null,
  ) {
    const messages:
      Record<
        TravelDataErrorCode,
        string
      > = {
        INVALID_TRIP_ID:
          "معرّف الرحلة غير صالح.",

        TRIP_NOT_FOUND:
          "الرحلة غير موجودة.",

        TRIP_CREATE_FAILED:
          "تعذر إنشاء الرحلة.",

        TRIP_UPDATE_FAILED:
          "تعذر تحديث الرحلة.",

        TRIP_DELETE_FAILED:
          "تعذر حذف الرحلة.",

        TRIP_DELETE_BLOCKED:
          "لا يمكن حذف الرحلة قبل معالجة المستندات المرتبطة بها.",

        TRAVEL_READ_FAILED:
          "تعذر تحميل بيانات السفر.",

        INVALID_DOCUMENT_ID:
          "معرّف المستند غير صالح.",

        DOCUMENT_NOT_FOUND:
          "المستند غير موجود.",

        DOCUMENT_READ_FAILED:
          "تعذر تحميل المستندات.",

        DOCUMENT_UPDATE_FAILED:
          "تعذر تحديث المستند.",

        DOCUMENT_UPLOAD_FAILED:
          "تعذر رفع ملف PDF.",

        DOCUMENT_METADATA_FAILED:
          "تعذر حفظ بيانات المستند.",

        DOCUMENT_SIGNED_URL_FAILED:
          "تعذر تجهيز رابط المستند الخاص.",

        DOCUMENT_TRIP_NOT_FOUND:
          "الرحلة المرتبطة بالمستند غير موجودة.",

        INVALID_DOCUMENT_FILE:
          "ملف PDF غير صالح.",

        EMPTY_UPDATE:
          "لا توجد تغييرات للحفظ.",
      };


    super(
      messages[
        code
      ],
    );


    this.name =
      "TravelDataError";


    this.code =
      code;


    this.databaseCode =
      databaseCode;
  }
}


/* =========================================================
 * 2. DATA CONTEXT
 * ======================================================= */

interface TravelDataContext {
  supabase:
    ServerSupabaseClient;

  userId:
    UUID;
}


async function getTravelDataContext():
Promise<TravelDataContext> {
  const identity =
    await assertAuthenticatedIdentity();


  const supabase =
    await createClient();


  return {
    supabase,

    userId:
      identity.id,
  };
}


/* =========================================================
 * 3. DATABASE ERROR SHAPE
 * ======================================================= */

interface DatabaseErrorLike {
  code?:
    string |
    null;
}


/* =========================================================
 * 4. SAFE ROW CASTING
 * ======================================================= */

function asTrip(
  value:
    unknown,
): Trip {
  return value as Trip;
}


function asTrips(
  value:
    unknown,
): Trip[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }


  return value as Trip[];
}


function asDocument(
  value:
    unknown,
): Document {
  return value as Document;
}


function asDocuments(
  value:
    unknown,
): Document[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }


  return value as Document[];
}


/* =========================================================
 * 5. DATE HELPERS
 * ======================================================= */

function padTwo(
  value:
    number,
): string {
  return String(
    value,
  ).padStart(
    2,
    "0",
  );
}


function getCurrentISODate(
  timeZone:
    string =
    DEFAULT_TIMEZONE,
): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    );


  const parts =
    formatter.formatToParts(
      new Date(),
    );


  const year =
    Number(
      parts.find(
        (
          part,
        ) =>
          part.type ===
          "year",
      )?.value,
    );


  const month =
    Number(
      parts.find(
        (
          part,
        ) =>
          part.type ===
          "month",
      )?.value,
    );


  const day =
    Number(
      parts.find(
        (
          part,
        ) =>
          part.type ===
          "day",
      )?.value,
    );


  if (
    !Number.isInteger(
      year,
    ) ||
    !Number.isInteger(
      month,
    ) ||
    !Number.isInteger(
      day,
    )
  ) {
    throw new TravelDataError(
      "TRAVEL_READ_FAILED",
    );
  }


  return [
    year,
    padTwo(
      month,
    ),
    padTwo(
      day,
    ),
  ].join(
    "-",
  );
}


/* =========================================================
 * 6. ID VALIDATION
 * ======================================================= */

function validateTripId(
  id:
    UUID,
): UUID {
  const validation =
    uuidSchema.safeParse(
      id,
    );


  if (
    !validation.success
  ) {
    throw new TravelDataError(
      "INVALID_TRIP_ID",
    );
  }


  return validation.data;
}


function validateDocumentId(
  id:
    UUID,
): UUID {
  const validation =
    uuidSchema.safeParse(
      id,
    );


  if (
    !validation.success
  ) {
    throw new TravelDataError(
      "INVALID_DOCUMENT_ID",
    );
  }


  return validation.data;
}


/* =========================================================
 * 7. TRIP SUMMARY
 * ======================================================= */

export function toTripSummary(
  trip:
    Trip,
): TripSummary {
  return {
    id:
      trip.id,

    title:
      trip.title,

    destination:
      trip.destination,

    start_date:
      trip.start_date,

    end_date:
      trip.end_date,

    status:
      trip.status,

    budget_total:
      trip.budget_total,

    currency:
      trip.currency,

    readiness_percent:
      trip.readiness_percent,
  };
}


/* =========================================================
 * 8. TRIP SORTING
 * ======================================================= */

function compareOptionalDates(
  a:
    string |
    null,

  b:
    string |
    null,
): number {
  if (
    a === null &&
    b === null
  ) {
    return 0;
  }


  if (
    a === null
  ) {
    return 1;
  }


  if (
    b === null
  ) {
    return -1;
  }


  return a.localeCompare(
    b,
  );
}


function sortUpcomingTrips(
  trips:
    Trip[],
): Trip[] {
  return [
    ...trips,
  ].sort(
    (
      a,
      b,
    ) => {
      const dateDifference =
        compareOptionalDates(
          a.start_date,
          b.start_date,
        );


      if (
        dateDifference !==
        0
      ) {
        return dateDifference;
      }


      return a.created_at.localeCompare(
        b.created_at,
      );
    },
  );
}


function sortActiveTrips(
  trips:
    Trip[],
): Trip[] {
  return [
    ...trips,
  ].sort(
    (
      a,
      b,
    ) => {
      const startDifference =
        compareOptionalDates(
          a.start_date,
          b.start_date,
        );


      if (
        startDifference !==
        0
      ) {
        return startDifference;
      }


      return a.created_at.localeCompare(
        b.created_at,
      );
    },
  );
}


/* =========================================================
 * 9. INTERNAL TRIP FETCH
 * ======================================================= */

async function fetchTrips(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,
): Promise<Trip[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trips",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );


  if (
    error
  ) {
    throw new TravelDataError(
      "TRAVEL_READ_FAILED",
      error.code ??
        null,
    );
  }


  return asTrips(
    data,
  );
}


/* =========================================================
 * 10. INTERNAL OWNED TRIP FETCH
 * ======================================================= */

async function fetchOwnedTripById(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  id:
    UUID,
): Promise<Trip | null> {
  const safeId =
    validateTripId(
      id,
    );


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trips",
      )
      .select(
        "*",
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();


  if (
    error
  ) {
    throw new TravelDataError(
      "TRAVEL_READ_FAILED",
      error.code ??
        null,
    );
  }


  return data
    ? asTrip(
        data,
      )
    : null;
}


/* =========================================================
 * 11. LIST TRIPS
 * ======================================================= */

export async function listTrips():
Promise<Trip[]> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  return fetchTrips(
    supabase,
    userId,
  );
}


/* =========================================================
 * 12. GET TRIP
 * ======================================================= */

export async function getTrip(
  id:
    UUID,
): Promise<Trip | null> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  return fetchOwnedTripById(
    supabase,
    userId,
    id,
  );
}


/* =========================================================
 * 13. CREATE TRIP
 * ======================================================= */

/**
 * Direct domain operation for normal user-facing Travel forms.
 *
 * Universal Intake does NOT call this function.
 *
 * AI-created Travel proposals go through:
 *
 * approved intake
 *      ↓
 * execute_travel_intake()
 */
export async function createTrip(
  input:
    TripInsert,
): Promise<Trip> {
  const parsed =
    tripInsertSchema.parse(
      input,
    );


  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trips",
      )
      .insert({
        ...parsed,

        user_id:
          userId,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throw new TravelDataError(
      "TRIP_CREATE_FAILED",
      error?.code ??
        null,
    );
  }


  return asTrip(
    data,
  );
}


/* =========================================================
 * 14. UPDATE TRIP
 * ======================================================= */

export async function updateTrip(
  id:
    UUID,

  input:
    TripUpdate,
): Promise<Trip> {
  const safeId =
    validateTripId(
      id,
    );


  const parsed =
    tripUpdateSchema.parse(
      input,
    );


  if (
    Object.keys(
      parsed,
    ).length ===
    0
  ) {
    throw new TravelDataError(
      "EMPTY_UPDATE",
    );
  }


  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trips",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throw new TravelDataError(
      "TRIP_UPDATE_FAILED",
      error.code ??
        null,
    );
  }


  if (
    !data
  ) {
    throw new TravelDataError(
      "TRIP_NOT_FOUND",
    );
  }


  return asTrip(
    data,
  );
}


/* =========================================================
 * 15. DELETE TRIP
 * ======================================================= */

/**
 * Migration 009 deliberately uses:
 *
 * documents → trip
 *
 * ON DELETE RESTRICT
 *
 * Therefore a trip with linked documents cannot be silently
 * deleted.
 */
export async function deleteTrip(
  id:
    UUID,
): Promise<Trip> {
  const safeId =
    validateTripId(
      id,
    );


  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trips",
      )
      .delete()
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    /*
     * PostgreSQL foreign-key violation.
     *
     * Linked private documents must be handled first.
     */
    if (
      error.code ===
      "23503"
    ) {
      throw new TravelDataError(
        "TRIP_DELETE_BLOCKED",
        error.code,
      );
    }


    throw new TravelDataError(
      "TRIP_DELETE_FAILED",
      error.code ??
        null,
    );
  }


  if (
    !data
  ) {
    throw new TravelDataError(
      "TRIP_NOT_FOUND",
    );
  }


  return asTrip(
    data,
  );
}


/* =========================================================
 * 16. UPCOMING TRIP DETECTION
 * ======================================================= */

function getUpcomingTripsFromRows(
  trips:
    Trip[],

  today:
    string,
): Trip[] {
  return sortUpcomingTrips(
    trips.filter(
      (
        trip,
      ) => {
        if (
          trip.status !==
            "planned" &&
          trip.status !==
            "booked"
        ) {
          return false;
        }


        /*
         * A planned trip with no exact date is still a valid
         * upcoming plan.
         */
        if (
          trip.start_date ===
          null
        ) {
          return true;
        }


        /*
         * If an end date exists and has already passed, it is
         * not shown as an upcoming trip even when its status
         * was not manually updated.
         */
        if (
          trip.end_date !==
            null &&
          trip.end_date <
            today
        ) {
          return false;
        }


        return (
          trip.start_date >=
          today
        );
      },
    ),
  );
}


/* =========================================================
 * 17. ACTIVE TRIP DETECTION
 * ======================================================= */

function getActiveTripsFromRows(
  trips:
    Trip[],
): Trip[] {
  return sortActiveTrips(
    trips.filter(
      (
        trip,
      ) =>
        trip.status ===
        "active",
    ),
  );
}


/* =========================================================
 * 18. DOCUMENT COUNT
 * ======================================================= */

async function countOwnedDocuments(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,
): Promise<number> {
  const {
    count,
    error,
  } =
    await supabase
      .from(
        "documents",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "user_id",
        userId,
      );


  if (
    error
  ) {
    throw new TravelDataError(
      "DOCUMENT_READ_FAILED",
      error.code ??
        null,
    );
  }


  return count ??
    0;
}


/* =========================================================
 * 19. TRAVEL SNAPSHOT
 * ======================================================= */

export async function getTravelSnapshot():
Promise<TravelSnapshot> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  const today =
    getCurrentISODate();


  const [
    trips,
    documentCount,
  ] =
    await Promise.all([
      fetchTrips(
        supabase,
        userId,
      ),

      countOwnedDocuments(
        supabase,
        userId,
      ),
    ]);


  const upcomingTrips =
    getUpcomingTripsFromRows(
      trips,
      today,
    );


  const activeTrips =
    getActiveTripsFromRows(
      trips,
    );


  const completedTripCount =
    trips.filter(
      (
        trip,
      ) =>
        trip.status ===
        "completed",
    ).length;


  return {
    upcoming_trips:
      upcomingTrips.map(
        toTripSummary,
      ),

    active_trips:
      activeTrips.map(
        toTripSummary,
      ),

    completed_trip_count:
      completedTripCount,

    document_count:
      documentCount,

    next_trip:
      upcomingTrips[0]
        ? toTripSummary(
            upcomingTrips[0],
          )
        : null,
  };
}


/* =========================================================
 * 20. DOCUMENT LIST OPTIONS
 * ======================================================= */

export interface DocumentListOptions {
  trip_id?:
    UUID |
    null;

  include_archived?:
    boolean;

  limit?:
    number;
}


/* =========================================================
 * 21. SAFE LIMIT
 * ======================================================= */

function normalizeListLimit(
  value:
    number |
    undefined,
): number {
  if (
    value ===
    undefined
  ) {
    return 100;
  }


  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 100;
  }


  return Math.min(
    Math.max(
      Math.trunc(
        value,
      ),
      1,
    ),
    100,
  );
}


/* =========================================================
 * 22. INTERNAL DOCUMENT FETCH
 * ======================================================= */

async function fetchDocuments(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  options:
    DocumentListOptions =
    {},
): Promise<Document[]> {
  const limit =
    normalizeListLimit(
      options.limit,
    );


  let query =
    supabase
      .from(
        "documents",
      )
      .select(
        "*",
      )
      .eq(
        "user_id",
        userId,
      );


  if (
    options.include_archived !==
    true
  ) {
    query =
      query.eq(
        "status",
        "active",
      );
  }


  if (
    options.trip_id !==
    undefined
  ) {
    if (
      options.trip_id ===
      null
    ) {
      query =
        query.is(
          "trip_id",
          null,
        );
    } else {
      const safeTripId =
        validateTripId(
          options.trip_id,
        );


      query =
        query.eq(
          "trip_id",
          safeTripId,
        );
    }
  }


  const {
    data,
    error,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        limit,
      );


  if (
    error
  ) {
    throw new TravelDataError(
      "DOCUMENT_READ_FAILED",
      error.code ??
        null,
    );
  }


  return asDocuments(
    data,
  );
}


/* =========================================================
 * 23. LIST DOCUMENTS
 * ======================================================= */

export async function listDocuments(
  options:
    DocumentListOptions =
    {},
): Promise<Document[]> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  return fetchDocuments(
    supabase,
    userId,
    options,
  );
}


/* =========================================================
 * 24. INTERNAL OWNED DOCUMENT FETCH
 * ======================================================= */

async function fetchOwnedDocumentById(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  id:
    UUID,
): Promise<Document | null> {
  const safeId =
    validateDocumentId(
      id,
    );


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "documents",
      )
      .select(
        "*",
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();


  if (
    error
  ) {
    throw new TravelDataError(
      "DOCUMENT_READ_FAILED",
      error.code ??
        null,
    );
  }


  return data
    ? asDocument(
        data,
      )
    : null;
}


/* =========================================================
 * 25. GET DOCUMENT
 * ======================================================= */

export async function getDocument(
  id:
    UUID,
): Promise<Document | null> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  return fetchOwnedDocumentById(
    supabase,
    userId,
    id,
  );
}


/* =========================================================
 * 26. PDF UPLOAD INPUT
 * ======================================================= */

export interface PrivatePdfUploadInput {
  file:
    File;

  title:
    string;

  category?:
    DocumentCategory;

  trip_id?:
    UUID |
    null;

  notes?:
    string |
    null;
}


/* =========================================================
 * 27. PDF VALIDATION
 * ======================================================= */

function validatePrivatePdf(
  file:
    File,
): void {
  const nameValidation =
    documentFileNameSchema.safeParse(
      file.name,
    );


  if (
    !nameValidation.success
  ) {
    throw new TravelDataError(
      "INVALID_DOCUMENT_FILE",
    );
  }


  const mimeValidation =
    documentMimeTypeSchema.safeParse(
      file.type,
    );


  if (
    !mimeValidation.success
  ) {
    throw new TravelDataError(
      "INVALID_DOCUMENT_FILE",
    );
  }


  const sizeValidation =
    documentFileSizeSchema.safeParse(
      file.size,
    );


  if (
    !sizeValidation.success
  ) {
    throw new TravelDataError(
      "INVALID_DOCUMENT_FILE",
    );
  }


  if (
    file.size >
    PRIVATE_DOCUMENT_MAX_SIZE_BYTES
  ) {
    throw new TravelDataError(
      "INVALID_DOCUMENT_FILE",
    );
  }
}


/* =========================================================
 * 28. STORAGE PATH
 * ======================================================= */

/**
 * The browser and AI never choose permanent Storage paths.
 *
 * Path format:
 *
 * <auth-user-id>/travel/<trip-id>/<random>.pdf
 *
 * or:
 *
 * <auth-user-id>/documents/<random>.pdf
 */
function buildPrivatePdfStoragePath(
  userId:
    UUID,

  tripId:
    UUID |
    null,
): string {
  const objectId =
    crypto.randomUUID();


  if (
    tripId
  ) {
    return [
      userId,
      "travel",
      tripId,
      `${objectId}.pdf`,
    ].join(
      "/",
    );
  }


  return [
    userId,
    "documents",
    `${objectId}.pdf`,
  ].join(
    "/",
  );
}


/* =========================================================
 * 29. REQUIRE OWNED TRIP FOR DOCUMENT
 * ======================================================= */

async function requireOwnedTripForDocument(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  tripId:
    UUID,
): Promise<Trip> {
  const trip =
    await fetchOwnedTripById(
      supabase,
      userId,
      tripId,
    );


  if (
    !trip
  ) {
    throw new TravelDataError(
      "DOCUMENT_TRIP_NOT_FOUND",
    );
  }


  return trip;
}


/* =========================================================
 * 30. INSERT DOCUMENT METADATA
 * ======================================================= */

async function insertDocumentMetadata(
  supabase:
    ServerSupabaseClient,

  userId:
    UUID,

  payload:
    ReturnType<
      typeof documentInsertSchema.parse
    >,
): Promise<Document> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "documents",
      )
      .insert({
        ...payload,

        user_id:
          userId,
      })
      .select(
        "*",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throw new TravelDataError(
      "DOCUMENT_METADATA_FAILED",
      error?.code ??
        null,
    );
  }


  return asDocument(
    data,
  );
}


/* =========================================================
 * 31. UPLOAD PRIVATE PDF
 * ======================================================= */

/**
 * Safe coordinated upload:
 *
 * 1. Verify auth.
 * 2. Validate PDF.
 * 3. Verify optional trip ownership.
 * 4. Server generates private Storage path.
 * 5. Upload through authenticated Storage RLS.
 * 6. Insert metadata through PostgreSQL RLS.
 * 7. If metadata fails, remove uploaded object.
 *
 *
 * No public URL is created.
 */
export async function uploadPrivatePdfDocument(
  input:
    PrivatePdfUploadInput,
): Promise<Document> {
  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  validatePrivatePdf(
    input.file,
  );


  let safeTripId:
    UUID |
    null =
    null;


  if (
    input.trip_id !==
      undefined &&
    input.trip_id !==
      null
  ) {
    safeTripId =
      validateTripId(
        input.trip_id,
      );


    await requireOwnedTripForDocument(
      supabase,
      userId,
      safeTripId,
    );
  }


  const storagePath =
    buildPrivatePdfStoragePath(
      userId,
      safeTripId,
    );


  const category =
    input.category ??
    (
      safeTripId
        ? "travel"
        : "general"
    );


  const metadata =
    documentInsertSchema.parse({
      trip_id:
        safeTripId,

      title:
        input.title,

      category,

      file_name:
        input.file.name,

      mime_type:
        PRIVATE_DOCUMENT_MIME_TYPE,

      file_size_bytes:
        input.file.size,

      storage_bucket:
        PRIVATE_DOCUMENT_STORAGE_BUCKET,

      storage_path:
        storagePath,

      status:
        "active",

      notes:
        input.notes ??
        null,
    });


  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        PRIVATE_DOCUMENT_STORAGE_BUCKET,
      )
      .upload(
        storagePath,
        input.file,
        {
          cacheControl:
            "3600",

          contentType:
            PRIVATE_DOCUMENT_MIME_TYPE,

          upsert:
            false,
        },
      );


  if (
    uploadError
  ) {
    throw new TravelDataError(
      "DOCUMENT_UPLOAD_FAILED",
    );
  }


  try {
    return await insertDocumentMetadata(
      supabase,
      userId,
      metadata,
    );
  } catch (
    error
  ) {
    /*
     * Compensating cleanup.
     *
     * If PostgreSQL metadata creation fails after Storage
     * succeeds, remove the newly uploaded private object so
     * we do not knowingly create an orphan file.
     */
    try {
      await supabase.storage
        .from(
          PRIVATE_DOCUMENT_STORAGE_BUCKET,
        )
        .remove([
          storagePath,
        ]);
    } catch {
      /*
       * Cleanup is best-effort.
       *
       * We still throw the original metadata failure and never
       * pretend that a valid document record exists.
       */
    }


    if (
      error instanceof
      TravelDataError
    ) {
      throw error;
    }


    throw new TravelDataError(
      "DOCUMENT_METADATA_FAILED",
    );
  }
}


/* =========================================================
 * 32. UPDATE DOCUMENT METADATA
 * ======================================================= */

/**
 * This cannot replace the actual PDF.
 *
 * documentUpdateSchema deliberately excludes:
 *
 * file_name
 * mime_type
 * file_size_bytes
 * storage_bucket
 * storage_path
 */
export async function updateDocumentMetadata(
  id:
    UUID,

  input:
    DocumentUpdate,
): Promise<Document> {
  const safeId =
    validateDocumentId(
      id,
    );


  const parsed =
    documentUpdateSchema.parse(
      input,
    );


  if (
    Object.keys(
      parsed,
    ).length ===
    0
  ) {
    throw new TravelDataError(
      "EMPTY_UPDATE",
    );
  }


  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  /*
   * If metadata is being linked to another trip, verify that
   * trip belongs to the same authenticated user before write.
   */
  if (
    parsed.trip_id !==
      undefined &&
    parsed.trip_id !==
      null
  ) {
    await requireOwnedTripForDocument(
      supabase,
      userId,
      parsed.trip_id,
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "documents",
      )
      .update(
        parsed,
      )
      .eq(
        "id",
        safeId,
      )
      .eq(
        "user_id",
        userId,
      )
      .select(
        "*",
      )
      .maybeSingle();


  if (
    error
  ) {
    throw new TravelDataError(
      "DOCUMENT_UPDATE_FAILED",
      error.code ??
        null,
    );
  }


  if (
    !data
  ) {
    throw new TravelDataError(
      "DOCUMENT_NOT_FOUND",
    );
  }


  return asDocument(
    data,
  );
}


/* =========================================================
 * 33. ARCHIVE DOCUMENT
 * ======================================================= */

/**
 * V2 uses archive instead of destructive deletion in normal
 * application flows.
 *
 * The actual private file remains protected in Storage.
 */
export async function archiveDocument(
  id:
    UUID,
): Promise<Document> {
  return updateDocumentMetadata(
    id,
    {
      status:
        "archived",
    },
  );
}


/* =========================================================
 * 34. RESTORE DOCUMENT
 * ======================================================= */

export async function restoreDocument(
  id:
    UUID,
): Promise<Document> {
  return updateDocumentMetadata(
    id,
    {
      status:
        "active",
    },
  );
}


/* =========================================================
 * 35. SIGNED URL RESULT
 * ======================================================= */

export interface PrivateDocumentSignedUrl {
  document_id:
    UUID;

  url:
    string;

  expires_in_seconds:
    number;
}


/* =========================================================
 * 36. SIGNED URL EXPIRY
 * ======================================================= */

function normalizeSignedUrlExpiry(
  value:
    number |
    undefined,
): number {
  if (
    value ===
    undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return 300;
  }


  /*
   * Private document links stay deliberately short-lived.
   *
   * Minimum: 60 seconds
   * Maximum: 15 minutes
   */
  return Math.min(
    Math.max(
      Math.trunc(
        value,
      ),
      60,
    ),
    900,
  );
}


/* =========================================================
 * 37. CREATE PRIVATE DOCUMENT SIGNED URL
 * ======================================================= */

/**
 * Generates a temporary private URL only.
 *
 * It does NOT:
 *
 * - make the bucket public
 * - create a permanent URL
 * - bypass Storage RLS
 * - use service_role
 */
export async function createPrivateDocumentSignedUrl(
  id:
    UUID,

  expiresInSeconds?:
    number,
): Promise<PrivateDocumentSignedUrl> {
  const safeId =
    validateDocumentId(
      id,
    );


  const {
    supabase,
    userId,
  } =
    await getTravelDataContext();


  const document =
    await fetchOwnedDocumentById(
      supabase,
      userId,
      safeId,
    );


  if (
    !document
  ) {
    throw new TravelDataError(
      "DOCUMENT_NOT_FOUND",
    );
  }


  const safeExpiry =
    normalizeSignedUrlExpiry(
      expiresInSeconds,
    );


  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        document.storage_bucket,
      )
      .createSignedUrl(
        document.storage_path,
        safeExpiry,
        {
          download:
            document.file_name,
        },
      );


  if (
    error ||
    !data?.signedUrl
  ) {
    throw new TravelDataError(
      "DOCUMENT_SIGNED_URL_FAILED",
    );
  }


  return {
    document_id:
      document.id,

    url:
      data.signedUrl,

    expires_in_seconds:
      safeExpiry,
  };
}


/* =========================================================
 * 38. FILE CONSTANT ASSERTIONS
 * ======================================================= */

/**
 * Runtime constants intentionally match Migration 009:
 *
 * bucket:
 *
 * life-os-private-documents
 *
 *
 * MIME:
 *
 * application/pdf
 *
 *
 * max:
 *
 * 15 MB
 *
 *
 * Storage/PostgreSQL remain the final enforcement layers.
 */


/* =========================================================
 * 39. OWNERSHIP RULE
 * ======================================================= */

/**
 * Every public function in this module begins from:
 *
 * assertAuthenticatedIdentity()
 *
 *
 * All writes add:
 *
 * user_id = verified auth identity
 *
 *
 * Browser input cannot provide:
 *
 * user_id
 *
 *
 * AI output cannot provide:
 *
 * user_id
 */


/* =========================================================
 * 40. PRIVATE STORAGE RULE
 * ======================================================= */

/**
 * PDF bytes:
 *
 * Supabase Storage
 *
 * life-os-private-documents
 *
 *
 * Metadata:
 *
 * public.documents
 *
 *
 * No PDF binary or base64 is stored in:
 *
 * public.documents
 * public.intake_items
 * logs
 * AI memory
 */


/* =========================================================
 * 41. TRAVEL SNAPSHOT RULE
 * ======================================================= */

/**
 * TravelSnapshot is deterministic.
 *
 * It is derived only from owned database facts:
 *
 * trips
 * documents
 *
 *
 * AI does not decide:
 *
 * next_trip
 * active_trips
 * completed_trip_count
 * document_count
 */


/* =========================================================
 * 42. NEXT TRIP RULE
 * ======================================================= */

/**
 * next_trip:
 *
 * planned/booked
 * +
 * date not already expired
 *
 *
 * Trips without a known date remain valid upcoming plans,
 * but dated trips sort before undated trips.
 *
 *
 * Active trips remain separately available under:
 *
 * active_trips
 */


/* =========================================================
 * 43. DOCUMENT ARCHIVE RULE
 * ======================================================= */

/**
 * Normal V2 document removal is:
 *
 * active
 *      ↓
 * archived
 *
 *
 * not:
 *
 * immediate destructive deletion
 *
 *
 * This protects private records from accidental loss.
 */


/* =========================================================
 * 44. FINAL V2 TRAVEL DATA RULE
 * ======================================================= */

/**
 * TRIPS
 *
 * authenticated user
 *      ↓
 * validated domain input
 *      ↓
 * PostgreSQL
 *      ↓
 * forced RLS
 *
 *
 * PRIVATE PDF
 *
 * authenticated user
 *      ↓
 * validated PDF
 *      ↓
 * server-generated owner path
 *      ↓
 * private Storage
 *      ↓
 * Storage RLS
 *      ↓
 * private metadata row
 *      ↓
 * PostgreSQL RLS
 *
 *
 * DOWNLOAD
 *
 * authenticated owner
 *      ↓
 * owned metadata lookup
 *      ↓
 * short-lived signed URL
 *
 *
 * No public files.
 * No service_role.
 * No AI ownership.
 *
 * Simple outside.
 * Intelligent underneath.
 * Private by default.
 */