-- =========================================================
-- LIFE OS — Version 2
-- Migration: 009_v2_travel_documents.sql
--
-- Travel OS foundation.
--
-- Adds:
--
-- trips
-- documents
-- private PDF storage bucket
-- authenticated owner-only Storage policies
--
--
-- Core privacy rule:
--
-- Every trip belongs to auth.uid().
--
-- Every document metadata row belongs to auth.uid().
--
-- Every private Storage object must live under:
--
-- <auth.uid()>/<path>
--
--
-- Example:
--
-- 7b...user-id...91/
--   travel/
--     trip-id/
--       itinerary.pdf
--
--
-- Files are NEVER public.
-- =========================================================


begin;


-- =========================================================
-- 1. TRIPS
-- =========================================================

create table public.trips (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  -- -------------------------------------------------------
  -- Core trip identity
  -- -------------------------------------------------------

  title text not null,

  destination text not null,


  -- -------------------------------------------------------
  -- Dates
  -- -------------------------------------------------------

  start_date date,

  end_date date,


  -- -------------------------------------------------------
  -- Lifecycle
  -- -------------------------------------------------------

  status text not null
    default 'planned',


  -- -------------------------------------------------------
  -- Budget
  -- -------------------------------------------------------

  budget_total numeric(14,2),

  currency text not null
    default 'AED',


  -- -------------------------------------------------------
  -- Readiness
  -- -------------------------------------------------------

  readiness_percent smallint not null
    default 0,


  -- -------------------------------------------------------
  -- Notes
  -- -------------------------------------------------------

  notes text,


  -- -------------------------------------------------------
  -- Timestamps
  -- -------------------------------------------------------

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint trips_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint trips_title_check
    check (
      length(
        trim(
          title
        )
      ) between 1 and 120
    ),


  constraint trips_destination_check
    check (
      length(
        trim(
          destination
        )
      ) between 1 and 160
    ),


  constraint trips_status_check
    check (
      status in (
        'planned',
        'booked',
        'active',
        'completed',
        'cancelled'
      )
    ),


  constraint trips_dates_check
    check (
      start_date is null
      or end_date is null
      or end_date >= start_date
    ),


  constraint trips_budget_check
    check (
      budget_total is null
      or budget_total >= 0
    ),


  constraint trips_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),


  constraint trips_readiness_check
    check (
      readiness_percent
      between 0 and 100
    ),


  constraint trips_notes_check
    check (
      notes is null
      or (
        length(
          trim(
            notes
          )
        ) > 0
        and length(
          notes
        ) <= 2000
      )
    )
);


-- =========================================================
-- 2. DOCUMENTS
-- =========================================================
--
-- This is metadata only.
--
-- PDF bytes live in Supabase Storage.
--
-- Never store:
--
-- base64 PDF
-- file binary
-- extracted sensitive content
--
-- directly in this table.
-- =========================================================

create table public.documents (

  id uuid primary key
    default gen_random_uuid(),


  user_id uuid not null
    references auth.users(id)
    on delete cascade,


  -- -------------------------------------------------------
  -- Optional travel relationship
  -- -------------------------------------------------------

  trip_id uuid,


  -- -------------------------------------------------------
  -- Human-readable metadata
  -- -------------------------------------------------------

  title text not null,

  category text not null
    default 'general',


  -- -------------------------------------------------------
  -- Original file metadata
  -- -------------------------------------------------------

  file_name text not null,

  mime_type text not null
    default 'application/pdf',

  file_size_bytes bigint not null,


  -- -------------------------------------------------------
  -- Private Storage reference
  -- -------------------------------------------------------

  storage_bucket text not null
    default 'life-os-private-documents',

  storage_path text not null,


  -- -------------------------------------------------------
  -- Lifecycle
  -- -------------------------------------------------------

  status text not null
    default 'active',


  notes text,


  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),


  -- =======================================================
  -- CONSTRAINTS
  -- =======================================================

  constraint documents_owner_id_unique
    unique (
      user_id,
      id
    ),


  constraint documents_trip_owner_fk
    foreign key (
      user_id,
      trip_id
    )
    references public.trips(
      user_id,
      id
    )
    on delete restrict,


  constraint documents_storage_path_unique
    unique (
      user_id,
      storage_path
    ),


  constraint documents_title_check
    check (
      length(
        trim(
          title
        )
      ) between 1 and 120
    ),


  constraint documents_category_check
    check (
      category in (
        'travel',
        'education',
        'career',
        'finance',
        'personal',
        'general',
        'other'
      )
    ),


  constraint documents_file_name_check
    check (
      length(
        trim(
          file_name
        )
      ) between 1 and 255

      and position(
        '/' in file_name
      ) = 0

      and position(
        chr(92) in file_name
      ) = 0
    ),


  constraint documents_pdf_only_check
    check (
      mime_type =
        'application/pdf'
    ),


  constraint documents_file_size_check
    check (
      file_size_bytes > 0
      and file_size_bytes <= 15728640
    ),


  constraint documents_storage_bucket_check
    check (
      storage_bucket =
        'life-os-private-documents'
    ),


  constraint documents_storage_path_check
    check (
      length(
        trim(
          storage_path
        )
      ) > 0

      and length(
        storage_path
      ) <= 1024

      and position(
        chr(92) in storage_path
      ) = 0

      and storage_path
        !~ '(^|/)\.\.?(/|$)'
    ),


  -- -------------------------------------------------------
  -- CRITICAL OWNERSHIP PATH RULE
  -- -------------------------------------------------------
  --
  -- Every object path starts with:
  --
  -- user_id/
  --
  -- Example:
  --
  -- <user_uuid>/travel/<trip_uuid>/file.pdf
  -- -------------------------------------------------------

  constraint documents_storage_path_owner_check
    check (
      split_part(
        storage_path,
        '/',
        1
      ) =
      user_id::text
    ),


  constraint documents_status_check
    check (
      status in (
        'active',
        'archived'
      )
    ),


  constraint documents_notes_check
    check (
      notes is null
      or (
        length(
          trim(
            notes
          )
        ) > 0
        and length(
          notes
        ) <= 2000
      )
    )
);


-- =========================================================
-- 3. IMMEDIATE PRIVILEGE LOCKDOWN
-- =========================================================

revoke all privileges
on table public.trips
from public, anon, authenticated;


revoke all privileges
on table public.documents
from public, anon, authenticated;


-- =========================================================
-- 4. ENABLE + FORCE RLS
-- =========================================================

alter table public.trips
  enable row level security;


alter table public.trips
  force row level security;


alter table public.documents
  enable row level security;


alter table public.documents
  force row level security;


-- =========================================================
-- 5. MINIMUM AUTHENTICATED PRIVILEGES
-- =========================================================

grant
  select,
  insert,
  update,
  delete
on table public.trips
to authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.documents
to authenticated;


-- =========================================================
-- 6. TRIPS — SELECT OWN
-- =========================================================

create policy
  "trips_select_own"
on public.trips
for select
to authenticated
using (
  auth.uid() =
    user_id
);


-- =========================================================
-- 7. TRIPS — INSERT OWN
-- =========================================================

create policy
  "trips_insert_own"
on public.trips
for insert
to authenticated
with check (
  auth.uid() =
    user_id
);


-- =========================================================
-- 8. TRIPS — UPDATE OWN
-- =========================================================

create policy
  "trips_update_own"
on public.trips
for update
to authenticated
using (
  auth.uid() =
    user_id
)
with check (
  auth.uid() =
    user_id
);


-- =========================================================
-- 9. TRIPS — DELETE OWN
-- =========================================================

create policy
  "trips_delete_own"
on public.trips
for delete
to authenticated
using (
  auth.uid() =
    user_id
);


-- =========================================================
-- 10. DOCUMENTS — SELECT OWN
-- =========================================================

create policy
  "documents_select_own"
on public.documents
for select
to authenticated
using (
  auth.uid() =
    user_id
);


-- =========================================================
-- 11. DOCUMENTS — INSERT OWN
-- =========================================================

create policy
  "documents_insert_own"
on public.documents
for insert
to authenticated
with check (
  auth.uid() =
    user_id
);


-- =========================================================
-- 12. DOCUMENTS — UPDATE OWN
-- =========================================================

create policy
  "documents_update_own"
on public.documents
for update
to authenticated
using (
  auth.uid() =
    user_id
)
with check (
  auth.uid() =
    user_id
);


-- =========================================================
-- 13. DOCUMENTS — DELETE OWN
-- =========================================================

create policy
  "documents_delete_own"
on public.documents
for delete
to authenticated
using (
  auth.uid() =
    user_id
);


-- =========================================================
-- 14. INDEXES — TRIPS
-- =========================================================

create index
  trips_user_status_dates_idx
on public.trips (
  user_id,
  status,
  start_date,
  end_date
);


create index
  trips_user_start_date_idx
on public.trips (
  user_id,
  start_date
);


create index
  trips_user_created_idx
on public.trips (
  user_id,
  created_at desc
);


-- =========================================================
-- 15. INDEXES — DOCUMENTS
-- =========================================================

create index
  documents_user_trip_created_idx
on public.documents (
  user_id,
  trip_id,
  created_at desc
);


create index
  documents_user_category_created_idx
on public.documents (
  user_id,
  category,
  created_at desc
);


create index
  documents_user_status_created_idx
on public.documents (
  user_id,
  status,
  created_at desc
);


-- =========================================================
-- 16. UPDATED_AT TRIGGERS
-- =========================================================

create trigger
  trips_set_updated_at
before update
on public.trips
for each row
execute function public.set_updated_at();


create trigger
  documents_set_updated_at
before update
on public.documents
for each row
execute function public.set_updated_at();


-- =========================================================
-- 17. PRIVATE STORAGE BUCKET
-- =========================================================
--
-- IMPORTANT:
--
-- public = false
--
-- Only PDFs.
--
-- Max:
--
-- 15 MB
--
-- matching Universal Add intake limits.
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'life-os-private-documents',
  'life-os-private-documents',
  false,
  15728640,
  array[
    'application/pdf'
  ]::text[]
)
on conflict (
  id
)
do update
set
  name =
    excluded.name,

  public =
    false,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


-- =========================================================
-- 18. STORAGE — SELECT OWN
-- =========================================================
--
-- A user can read only:
--
-- <their-auth-uuid>/...
-- =========================================================

create policy
  "life_os_private_documents_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'life-os-private-documents'

  and split_part(
    name,
    '/',
    1
  ) =
    auth.uid()::text
);


-- =========================================================
-- 19. STORAGE — INSERT OWN
-- =========================================================

create policy
  "life_os_private_documents_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'life-os-private-documents'

  and split_part(
    name,
    '/',
    1
  ) =
    auth.uid()::text
);


-- =========================================================
-- 20. STORAGE — UPDATE OWN
-- =========================================================

create policy
  "life_os_private_documents_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'life-os-private-documents'

  and split_part(
    name,
    '/',
    1
  ) =
    auth.uid()::text
)
with check (
  bucket_id =
    'life-os-private-documents'

  and split_part(
    name,
    '/',
    1
  ) =
    auth.uid()::text
);


-- =========================================================
-- 21. STORAGE — DELETE OWN
-- =========================================================

create policy
  "life_os_private_documents_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'life-os-private-documents'

  and split_part(
    name,
    '/',
    1
  ) =
    auth.uid()::text
);


-- =========================================================
-- 22. TABLE COMMENTS
-- =========================================================

comment on table public.trips is
  'LIFE OS V2 private Travel OS trips owned by the authenticated user.';


comment on table public.documents is
  'LIFE OS V2 private PDF document metadata. Binary content is stored only in the private Supabase Storage bucket.';


comment on column public.trips.readiness_percent is
  'User-reviewed Travel OS readiness value from 0 to 100. It must never be silently changed by AI.';


comment on column public.documents.storage_path is
  'Private Supabase Storage object path. The first path segment must equal the row user_id.';


comment on column public.documents.storage_bucket is
  'Fixed private LIFE OS bucket identifier.';


-- =========================================================
-- 23. VERIFY PUBLIC TABLE RLS
-- =========================================================

do $$
declare

  protected_table_count integer;

begin

  select
    count(*)
  into
    protected_table_count
  from
    pg_class as c

  inner join
    pg_namespace as n
      on n.oid =
        c.relnamespace

  where
    n.nspname =
      'public'

    and c.relname in (
      'trips',
      'documents'
    )

    and c.relrowsecurity =
      true

    and c.relforcerowsecurity =
      true;


  if
    protected_table_count <> 2
  then
    raise exception
      'LIFE OS migration 009 failed: trips and documents must have ENABLE + FORCE RLS.';
  end if;

end;
$$;


-- =========================================================
-- 24. VERIFY PUBLIC TABLE POLICIES
-- =========================================================

do $$
declare

  policy_count integer;

begin

  select
    count(*)
  into
    policy_count
  from
    pg_policies

  where
    schemaname =
      'public'

    and (
      (
        tablename =
          'trips'

        and policyname in (
          'trips_select_own',
          'trips_insert_own',
          'trips_update_own',
          'trips_delete_own'
        )
      )

      or

      (
        tablename =
          'documents'

        and policyname in (
          'documents_select_own',
          'documents_insert_own',
          'documents_update_own',
          'documents_delete_own'
        )
      )
    );


  if
    policy_count <> 8
  then
    raise exception
      'LIFE OS migration 009 failed: expected 8 owner policies, found %.',
      policy_count;
  end if;

end;
$$;


-- =========================================================
-- 25. VERIFY NO ANON TABLE PRIVILEGES
-- =========================================================

do $$
declare

  anon_privilege_count integer;

begin

  select
    count(*)
  into
    anon_privilege_count
  from
    information_schema.role_table_grants

  where
    table_schema =
      'public'

    and table_name in (
      'trips',
      'documents'
    )

    and grantee =
      'anon';


  if
    anon_privilege_count <> 0
  then
    raise exception
      'LIFE OS migration 009 failed: anonymous table privileges detected.';
  end if;

end;
$$;


-- =========================================================
-- 26. VERIFY PRIVATE STORAGE BUCKET
-- =========================================================

do $$
declare

  bucket_public boolean;

  bucket_file_size bigint;

  bucket_mimes text[];

begin

  select
    public,
    file_size_limit,
    allowed_mime_types

  into
    bucket_public,
    bucket_file_size,
    bucket_mimes

  from
    storage.buckets

  where
    id =
      'life-os-private-documents';


  if
    not found
  then
    raise exception
      'LIFE OS migration 009 failed: private document bucket not found.';
  end if;


  if
    bucket_public is distinct from false
  then
    raise exception
      'LIFE OS migration 009 failed: private document bucket became public.';
  end if;


  if
    bucket_file_size <> 15728640
  then
    raise exception
      'LIFE OS migration 009 failed: unexpected Storage file-size limit.';
  end if;


  if
    bucket_mimes is null
    or cardinality(
      bucket_mimes
    ) <> 1
    or array_position(
      bucket_mimes,
      'application/pdf'
    ) is null
  then
    raise exception
      'LIFE OS migration 009 failed: Storage bucket must allow PDF only.';
  end if;

end;
$$;


-- =========================================================
-- 27. VERIFY STORAGE OWNERSHIP POLICIES
-- =========================================================

do $$
declare

  storage_policy_count integer;

begin

  select
    count(*)
  into
    storage_policy_count
  from
    pg_policies

  where
    schemaname =
      'storage'

    and tablename =
      'objects'

    and policyname in (
      'life_os_private_documents_select_own',
      'life_os_private_documents_insert_own',
      'life_os_private_documents_update_own',
      'life_os_private_documents_delete_own'
    );


  if
    storage_policy_count <> 4
  then
    raise exception
      'LIFE OS migration 009 failed: expected 4 private Storage policies, found %.',
      storage_policy_count;
  end if;

end;
$$;


commit;


-- =========================================================
-- LIFE OS V2 — MIGRATION 009 COMPLETE
-- =========================================================
--
-- TRAVEL OS
--
-- trips
--      ✅ authenticated ownership
--      ✅ FORCE RLS
--      ✅ dates
--      ✅ destination
--      ✅ budget
--      ✅ currency
--      ✅ status
--      ✅ readiness 0–100
--
--
-- DOCUMENT VAULT
--
-- documents
--      ✅ authenticated ownership
--      ✅ FORCE RLS
--      ✅ optional trip relationship
--      ✅ PDF metadata only
--      ✅ max 15 MB
--      ✅ owner-bound Storage path
--
--
-- PRIVATE STORAGE
--
-- life-os-private-documents
--      ✅ public = false
--      ✅ PDF only
--      ✅ max 15 MB
--      ✅ SELECT own
--      ✅ INSERT own
--      ✅ UPDATE own
--      ✅ DELETE own
--      ✅ path starts with auth.uid()
--
--
-- NOT DONE HERE:
--
-- ❌ no AI auto-upload
-- ❌ no public URLs
-- ❌ no service_role
-- ❌ no PDF bytes inside PostgreSQL
-- ❌ no OCR
-- ❌ no automatic document execution
-- ❌ no Travel Intake executor yet
--
--
-- User
--      ↓
-- private trip
--      ↓
-- private PDF metadata
--      ↓
-- owner-scoped Storage path
--      ↓
-- private Supabase bucket
--
--
-- Simple outside.
-- Intelligent underneath.
-- Private by default.
-- =========================================================