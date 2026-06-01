import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigValid = !!supabaseUrl && !!supabaseAnonKey;

export const missingConfigVars = {
  VITE_SUPABASE_URL: !supabaseUrl,
  VITE_SUPABASE_ANON_KEY: !supabaseAnonKey,
};

// ── Stub ────────────────────────────────────────────────────────
// When Supabase env vars are missing, use a mock so Merit runs
// without a real backend. Remove this once you configure Supabase.
// ────────────────────────────────────────────────────────────────
function createStubSupabase() {
  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const fakeUser = {
    id: 'stub-user-id',
    email: 'rjcosta@gmail.com',
    user_metadata: { full_name: 'Demo User', avatar_url: null },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const fakeSession = {
    access_token: 'stub-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'stub-refresh',
    user: fakeUser,
  };

  // Query builder that always returns empty/fake data
  const createQueryBuilder = () => {
    const builder: any = () => builder;
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.single = () => Promise.resolve({ data: null, error: null });
    builder.insert = () => Promise.resolve({ data: null, error: null });
    builder.update = () => builder;
    builder.delete = () => Promise.resolve({ data: null, error: null });
    builder.order = () => builder;
    builder.limit = () => builder;
    builder.range = () => builder;
    builder.then = (resolve: any) => resolve({ data: [], error: null });
    builder.catch = (reject: any) => Promise.reject(reject);
    builder.finally = (cb: any) => Promise.resolve().then(cb);
    return builder;
  };

  let authListeners: Array<(event: string, session: any) => void> = [];

  return {
    auth: {
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authListeners.push(callback);
        // Immediately emit SIGNED_IN so the app boots as logged-in
        setTimeout(() => callback('SIGNED_IN', fakeSession), 0);
        return {
          data: { subscription: { unsubscribe: () => { authListeners = []; } } },
        };
      },
      signOut: () => {
        authListeners.forEach(cb => cb('SIGNED_OUT', null));
        return Promise.resolve({ error: null });
      },
      signInWithOAuth: ({ provider }: { provider: string }) => {
        console.info(`[Supabase Stub] signInWithOAuth(${provider}) — no-op without real Supabase`);
        authListeners.forEach(cb => cb('SIGNED_IN', fakeSession));
        return Promise.resolve({ data: { provider, url: window.location.origin }, error: null });
      },
      signInWithPassword: ({ email, password }: { email: string; password: string }) => {
        console.info(`[Supabase Stub] signInWithPassword demo login`);
        authListeners.forEach(cb => cb('SIGNED_IN', {
          ...fakeSession,
          user: { ...fakeUser, email },
        }));
        return Promise.resolve({ data: { user: { ...fakeUser, email }, session: fakeSession }, error: null });
      },
      signUp: ({ email, password }: { email: string; password: string }) => {
        console.info(`[Supabase Stub] signUp for ${email}`);
        authListeners.forEach(cb => cb('SIGNED_IN', {
          ...fakeSession,
          user: { ...fakeUser, email },
        }));
        return Promise.resolve({ data: { user: { ...fakeUser, email }, session: fakeSession }, error: null });
      },
      resetPasswordForEmail: (email: string) => {
        console.info(`[Supabase Stub] resetPasswordForEmail(${email})`);
        return Promise.resolve({ data: {}, error: null });
      },
      getSession: () => Promise.resolve({ data: { session: fakeSession }, error: null }),
      getUser: () => Promise.resolve({ data: { user: fakeUser }, error: null }),
    },
    from: (table: string) => {
      if (table === 'users') {
        const builder = createQueryBuilder();
        builder.single = () => Promise.resolve({
          data: {
            id: 1,
            uid: fakeUser.id,
            email: fakeUser.email,
            display_name: 'Demo User',
            photo_url: null,
            is_pro: false,
            preview_count: 0,
            last_preview_reset: getCurrentMonth(),
            subscription_status: 'pro_bypass',
            plan_type: 'demo',
            gdpr_consent: true,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
          },
          error: null,
        });
        return builder;
      }
      return createQueryBuilder();
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'stub' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ data: {}, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        download: () => Promise.resolve({ data: new Blob(), error: null }),
      }),
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
    channel: () => ({
      on: () => null,
      subscribe: () => null,
      unsubscribe: () => null,
    }),
  };
}

// ── Init ────────────────────────────────────────────────────────
console.info(
  isSupabaseConfigValid
    ? 'Supabase configured. Using real backend.'
    : 'Supabase not configured. Using stub backend. UI will work for demo.',
);

function createRealSupabase() {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // Manual PKCE code exchange — handles cases where automatic detection
  // fails (e.g. some browsers, race conditions on redirect back).
  ;(async () => {
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) return;

      // Only attempt if a code-verifier exists (PKCE was initiated)
      const hasVerifier = Object.keys(localStorage).some(k =>
        k.includes('auth-token-code-verifier')
      );
      if (!hasVerifier) return;

      const { data: existing } = await client.auth.getSession();
      if (existing?.session?.access_token) {
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      console.info('[Supabase] Exchanging PKCE code...');
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[Supabase] PKCE exchange failed:', error);
      }
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      console.error('[Supabase] PKCE exchange error:', err);
    }
  })();

  return client;
}

export const supabase: any = isSupabaseConfigValid
  ? (() => {
      try {
        const client = createRealSupabase();
        (window as any).__SUPABASE_CLIENT__ = client;
        return client;
      } catch (error) {
        console.error('Supabase init failed:', error);
        return createStubSupabase();
      }
    })()
  : createStubSupabase();

// Error handler for debugging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Supabase Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserDocument(supabaseUser: any, consent: boolean = true) {
  if (!supabaseUser) return;

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('uid', supabaseUser.id)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from('users')
        .insert({
          uid: supabaseUser.id,
          email: supabaseUser.email,
          display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
          photo_url: supabaseUser.user_metadata?.avatar_url || null,
          gdpr_consent: consent,
        });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
        })
        .eq('uid', supabaseUser.id);

      if (error) throw error;
    }
  } catch (err: any) {
    console.error('Error syncing user document:', err);
    handleSupabaseError(err, OperationType.WRITE, `users/${supabaseUser.id}`);
  }
}

// Month String Helper (YYYY-MM)
export const getCurrentMonthString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default supabase;
