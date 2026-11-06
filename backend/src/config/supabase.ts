import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

if (!supabaseServiceRoleKey) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will fail.');
}

/**
 * This is Ndomi's own Supabase project (a separate FieldLink project
 * couldn't be created due to a billing hold), so every FieldLink table
 * lives in its own "fieldlink" Postgres schema instead of "public" to
 * stay fully separate from Ndomi's own tables — see migrations/001_init.sql.
 * Every client below is pinned to that schema so plain `.from('table')`
 * calls never accidentally touch Ndomi's "public" schema.
 */
const FIELDLINK_SCHEMA = 'fieldlink';

/**
 * Client for user-facing operations (uses anon key, respects RLS)
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: FIELDLINK_SCHEMA },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Admin client (uses service_role key, bypasses RLS)
 * Students have no account here at all, so every student-scoped read/write
 * (SSO upsert, applications, document uploads) goes through this client with
 * manual ownership checks rather than relying on a student RLS policy.
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema: FIELDLINK_SCHEMA },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Create a Supabase client scoped to a company/admin's own session token
 * (Supabase Auth, this project) — used so RLS policies on companies/admins
 * apply normally for their own portal reads/writes.
 */
export function createUserClient(accessToken: string): SupabaseClient<any, 'fieldlink', any> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: FIELDLINK_SCHEMA },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
