import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

// Node 20 has no native WebSocket global; supabase-js's Realtime client
// requires one even though this backend never uses realtime features at
// all. Providing `ws` here satisfies the constructor so createClient()
// doesn't throw on startup.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realtimeOptions: { transport: any } = { transport: WebSocket };

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
  realtime: realtimeOptions,
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
      realtime: realtimeOptions,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Reads Ndomi's OWN tables directly (companies, profiles) — safe because
 * this is genuinely the same Postgres database/project, not a separate
 * system reached over the network. Used so a company can log into
 * FieldLink with the exact same email/password they already use for
 * their Ndomi account, instead of a brand-new FieldLink-only signup.
 * Read-only by convention: never write into Ndomi's own schema from here.
 */
export const ndomiPublicSchema = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema: 'public' },
      realtime: realtimeOptions,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * A fresh, throwaway client for one signInWithPassword call.
 *
 * IMPORTANT: never call .auth.signInWithPassword() on the shared
 * `supabaseAdmin`/`supabaseClient` singletons above — despite
 * persistSession:false, signing in still sets that client INSTANCE's
 * in-memory session, and every later `.from()` call on that same
 * instance (from any concurrent request, since it's a module-level
 * singleton) then goes out as that end user, not as service_role. That
 * was a real bug here: a company login's own signIn silently downgraded
 * the shared admin client, so the company_profiles upsert right after
 * it got rejected by RLS as if it were an ordinary authenticated user.
 */
export function createAuthOnlyClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: realtimeOptions,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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
    realtime: realtimeOptions,
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
