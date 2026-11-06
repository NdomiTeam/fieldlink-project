-- =====================================================================
-- 002_storage_bucket.sql
-- Private bucket for application documents. No public policy at all —
-- every read happens through a server-generated short-lived signed URL
-- (service-role), every write through the backend's own upload route.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;
