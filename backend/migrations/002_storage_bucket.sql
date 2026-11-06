-- =====================================================================
-- 002_storage_bucket.sql
-- Private bucket for application documents. Prefixed "fieldlink-"
-- since this is Ndomi's existing Supabase project (shared bucket
-- namespace, unlike the schema-isolated tables in 001_init.sql) — this
-- avoids any chance of colliding with one of Ndomi's own bucket names.
-- No public policy at all — every read happens through a
-- server-generated short-lived signed URL (service-role), every write
-- through the backend's own upload route.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('fieldlink-documents', 'fieldlink-documents', false)
ON CONFLICT (id) DO NOTHING;
