-- =========================================================
-- LIFE OS
-- RLS POLICY PERFORMANCE OPTIMIZATION
--
-- Purpose:
--
-- Evaluate auth.uid() once per SQL statement through an
-- initPlan instead of once for every candidate row.
--
-- Security behavior is unchanged:
--
-- - authenticated role only
-- - row ownership remains mandatory
-- - AAL2 restrictive policies from migration 012 remain active
-- - storage paths remain scoped to the authenticated user
-- =========================================================

begin;


-- =========================================================
-- 1. UNIVERSAL INTAKE
-- =========================================================

alter policy "intake_items_select_own"
on public.intake_items
using (
  (select auth.uid()) = user_id
);


alter policy "intake_items_insert_own"
on public.intake_items
with check (
  (select auth.uid()) = user_id
);


alter policy "intake_items_update_own"
on public.intake_items
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);


-- =========================================================
-- 2. TRAVEL TRIPS
-- =========================================================

alter policy "trips_select_own"
on public.trips
using (
  (select auth.uid()) = user_id
);


alter policy "trips_insert_own"
on public.trips
with check (
  (select auth.uid()) = user_id
);


alter policy "trips_update_own"
on public.trips
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);


alter policy "trips_delete_own"
on public.trips
using (
  (select auth.uid()) = user_id
);


-- =========================================================
-- 3. TRAVEL DOCUMENT METADATA
-- =========================================================

alter policy "documents_select_own"
on public.documents
using (
  (select auth.uid()) = user_id
);


alter policy "documents_insert_own"
on public.documents
with check (
  (select auth.uid()) = user_id
);


alter policy "documents_update_own"
on public.documents
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);


alter policy "documents_delete_own"
on public.documents
using (
  (select auth.uid()) = user_id
);


-- =========================================================
-- 4. PRIVATE DOCUMENT STORAGE
-- =========================================================

alter policy "life_os_private_documents_select_own"
on storage.objects
using (
  bucket_id = 'life-os-private-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);


alter policy "life_os_private_documents_insert_own"
on storage.objects
with check (
  bucket_id = 'life-os-private-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);


alter policy "life_os_private_documents_update_own"
on storage.objects
using (
  bucket_id = 'life-os-private-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
)
with check (
  bucket_id = 'life-os-private-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);


alter policy "life_os_private_documents_delete_own"
on storage.objects
using (
  bucket_id = 'life-os-private-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);


commit;
