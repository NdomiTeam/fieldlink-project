-- =====================================================================
-- 001_init.sql
-- FieldLink v2 — full schema for the new, standalone Supabase project.
-- Students have no account here: every student-scoped row is reached
-- via the Ndomi SSO JWT, never Supabase Auth. Companies and admins use
-- this project's own Supabase Auth.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- company_profiles — one row per Supabase Auth user with role=company.
-- Linked once, at registration, to an Approved company on Ndomi via
-- the lookup-by-email bearer call; never re-checked after that.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ndomi_company_id UUID UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  logo_url        TEXT,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  is_approved     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- admin_profiles — no public self-service: a new row starts
-- is_approved = FALSE and only becomes usable once an existing admin
-- approves it. The very first admin is approved manually (see bottom).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     UUID REFERENCES admin_profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- field_spaces
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_spaces (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  -- Links this row back to the opportunity the student actually picked on
  -- Ndomi's own Discover > Field screen (Ndomi keeps the browsable catalog;
  -- this table only needs to exist so FieldLink can attach required_documents,
  -- slots and deadlines to it). NULL until the first SSO handoff references it.
  ndomi_field_id      UUID UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT,
  location            TEXT,
  category            TEXT,
  slots               INT NOT NULL DEFAULT 1 CHECK (slots >= 0),
  slots_filled        INT NOT NULL DEFAULT 0 CHECK (slots_filled >= 0),
  deadline            TIMESTAMPTZ,
  is_open             BOOLEAN NOT NULL DEFAULT TRUE,
  required_documents  TEXT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_spaces_company ON field_spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_field_spaces_open ON field_spaces(is_open) WHERE is_open;

-- ---------------------------------------------------------------------
-- students — upserted every time an SSO JWT from Ndomi is verified.
-- No login/registration of its own; this is purely a display/query cache.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndomi_user_id           UUID NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL,
  phone                   TEXT,
  picture                 TEXT,
  university_name         TEXT,
  field_of_study          TEXT,
  year_of_study           TEXT,
  faculty_or_department   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- used_sso_tokens — replay protection for the 5-minute Ndomi SSO JWT
-- (jti is unique per token; a row here means that exact token already
-- completed a handoff).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS used_sso_tokens (
  jti       TEXT PRIMARY KEY,
  used_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- payments — one row per TZS 10,000 / 3-application package.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount                 INT NOT NULL DEFAULT 10000,
  currency               TEXT NOT NULL DEFAULT 'TZS',
  provider               TEXT,
  provider_reference     TEXT,
  paid_at                TIMESTAMPTZ,
  applications_included  INT NOT NULL DEFAULT 3,
  applications_used      INT NOT NULL DEFAULT 0 CHECK (applications_used >= 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);

-- ---------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  field_space_id          UUID NOT NULL REFERENCES field_spaces(id) ON DELETE CASCADE,
  payment_id              UUID REFERENCES payments(id),
  status                  TEXT NOT NULL DEFAULT 'pending_admin' CHECK (status IN (
    'pending_admin',
    'approved_to_company',
    'rejected_by_admin',
    'accepted_by_company',
    'rejected_by_company',
    'awaiting_student_confirmation',
    'confirmed',
    'expired'
  )),
  confirmation_deadline   TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, field_space_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_field_space ON applications(field_space_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_confirmation_deadline
  ON applications(confirmation_deadline) WHERE status = 'awaiting_student_confirmation';

-- ---------------------------------------------------------------------
-- application_documents
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL CHECK (document_type IN (
    'introduction_letter', 'national_id', 'cv',
    'academic_transcript', 'passport_photo', 'insurance_proof'
  )),
  storage_path    TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_application_documents_application ON application_documents(application_id);

-- ---------------------------------------------------------------------
-- RLS — students have no Supabase Auth session at all, so every
-- student-facing route goes through supabaseAdmin after the backend
-- verifies the Ndomi SSO JWT itself. RLS here only needs to cover the
-- company/admin portals' own direct reads of their own data.
-- ---------------------------------------------------------------------
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company reads own profile" ON company_profiles;
CREATE POLICY "Company reads own profile" ON company_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin reads own profile" ON admin_profiles;
CREATE POLICY "Admin reads own profile" ON admin_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Company manages own field spaces" ON field_spaces;
CREATE POLICY "Company manages own field spaces" ON field_spaces FOR ALL TO authenticated
  USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Company reads applications to its field spaces" ON applications;
CREATE POLICY "Company reads applications to its field spaces" ON applications FOR SELECT TO authenticated
  USING (field_space_id IN (SELECT id FROM field_spaces WHERE company_id = auth.uid()));

DROP POLICY IF EXISTS "Company updates applications to its field spaces" ON applications;
CREATE POLICY "Company updates applications to its field spaces" ON applications FOR UPDATE TO authenticated
  USING (field_space_id IN (SELECT id FROM field_spaces WHERE company_id = auth.uid()))
  WITH CHECK (field_space_id IN (SELECT id FROM field_spaces WHERE company_id = auth.uid()));

DROP POLICY IF EXISTS "Company reads documents for its applications" ON application_documents;
CREATE POLICY "Company reads documents for its applications" ON application_documents FOR SELECT TO authenticated
  USING (application_id IN (
    SELECT a.id FROM applications a
    JOIN field_spaces fs ON fs.id = a.field_space_id
    WHERE fs.company_id = auth.uid()
  ));

-- Everything else (students, payments, admin-wide application/field-space
-- reads across all companies) is served exclusively via supabaseAdmin
-- after the backend's own role/approval checks — no RLS policy needed
-- because anon/authenticated roles simply have no other path to it.

COMMIT;

-- =====================================================================
-- Manual, one-time step after this migration runs:
--   1. Create the first admin's Supabase Auth user (dashboard or
--      supabase.auth.admin.createUser).
--   2. INSERT INTO admin_profiles (id, name, email, is_approved)
--      VALUES ('<that-user-uuid>', 'First Admin', 'admin@example.com', TRUE);
-- =====================================================================
