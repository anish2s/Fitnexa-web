'use client';

/**
 * Session state for the dashboard.
 *
 * The access token lives only inside the API client (memory). On load we exchange the HttpOnly
 * refresh cookie for a session; reloads and new tabs therefore stay signed in without storing any
 * token. Signing out in one tab is broadcast to the others.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, createApiClient, type ApiClient, type Me, type Session, type SessionUser } from '@fitexaa/api-client';
import { useSite, type Site } from './site';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason?: 'expired' | 'support-ended' }
  | { status: 'signedIn'; me: Me }
  | { status: 'error'; error: ApiError };

interface AuthApi {
  state: AuthState;
  api: ApiClient;
  signIn: (identifier: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  /**
   * "Log in as owner": use an owner token handed over by the platform console. In memory only, not
   * refreshable, never shared with other tabs. Throws if the token isn't a support session for this gym.
   */
  adoptSupportSession: (token: string, user: SessionUser, expiresIn: number) => Promise<Me>;
  /** Ends the support session on the server and in this tab only (other tabs and the owner's own sign-in are untouched). */
  endSupportSession: () => Promise<void>;
  retry: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

/**
 * What GET /auth/me would say, built from a sign-in or refresh response (same user record from the
 * API), saving a request on every page load. Sessions from a password or the refresh cookie are
 * never support sessions; those are confirmed with /auth/me in adoptSupportSession.
 */
export function meFromSession(session: Session, site: Site): Me {
  return {
    user: session.user,
    scope: site.scope === 'gym' ? 'tenant' : 'platform',
    gym: site.scope === 'gym' ? { name: site.tenant.name, slug: site.tenant.slug } : null,
    impersonatedBy: null,
  };
}
const CHANNEL = 'fx-auth';

export function AuthProvider({ hasSession, children }: { hasSession: boolean; children: ReactNode }) {
  const queryClient = useQueryClient();
  const site = useSite();
  const [state, setState] = useState<AuthState>(hasSession ? { status: 'loading' } : { status: 'signedOut' });
  /** Latest state for callbacks (session listener, other tabs); written after each commit. */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  /** True while this tab runs a support session: cookie restores and other tabs must not replace it. */
  const supportRef = useRef(false);

  const [api] = useState(() => createApiClient());

  // Session lost mid-use (refresh cookie expired, revoked, account disabled).
  useEffect(
    () =>
      api.subscribe((s) => {
        if (!s && stateRef.current.status === 'signedIn') {
          queryClient.clear();
          const wasSupport = supportRef.current;
          supportRef.current = false;
          setState({ status: 'signedOut', reason: wasSupport ? 'support-ended' : 'expired' });
        }
      }),
    [api, queryClient],
  );

  // Cross-tab sign-in/out. Owned by the effect so it is recreated after StrictMode's remount.
  const channelRef = useRef<BroadcastChannel | null>(null);
  const broadcast = useCallback((msg: 'signed-in' | 'signed-out') => {
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      // Channel closed during unmount; other tabs will notice on their next refresh.
    }
  }, []);

  /**
   * Exchange the refresh cookie for a session. Resolves to the next state, or null when a support
   * session was adopted meanwhile (it wins).
   */
  const load = useCallback(async (): Promise<AuthState | null> => {
    try {
      const session = await api.refresh();
      return supportRef.current ? null : { status: 'signedIn', me: meFromSession(session, site) };
    } catch (err) {
      if (supportRef.current) return null;
      if (err instanceof ApiError && err.status !== 0 && err.status < 500) return { status: 'signedOut' };
      return { status: 'error', error: err as ApiError };
    }
  }, [api, site]);

  const restore = useCallback(async () => {
    setState({ status: 'loading' });
    const next = await load();
    if (next) setState(next);
  }, [load]);

  // First load: the initial state is already "loading" when there is a cookie.
  useEffect(() => {
    if (!hasSession) return;
    void load().then((next) => next && setState(next));
  }, [hasSession, load]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<string>) => {
      if (supportRef.current) return; // a support tab follows only its own session
      if (e.data === 'signed-out') {
        api.clear();
        queryClient.clear();
        setState({ status: 'signedOut' });
      } else if (e.data === 'signed-in' && stateRef.current.status !== 'signedIn') {
        void restore();
      }
    };
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [api, queryClient, restore]);

  const value = useMemo<AuthApi>(() => {
    const permissions = new Set(state.status === 'signedIn' ? state.me.user.permissions : []);
    return {
      state,
      api,
      async signIn(identifier, password) {
        const me = meFromSession(await api.login(identifier, password), site);
        setState({ status: 'signedIn', me });
        broadcast('signed-in');
        return me;
      },
      async signOut() {
        await api.logout().catch(() => undefined);
        queryClient.clear();
        setState({ status: 'signedOut' });
        broadcast('signed-out');
      },
      async adoptSupportSession(token, user, expiresIn) {
        supportRef.current = true;
        api.adoptImpersonation(token, user, expiresIn);
        try {
          const me = await api.me();
          if (!me.impersonatedBy || me.scope !== 'tenant') throw new Error('not a support session');
          queryClient.clear();
          setState({ status: 'signedIn', me });
          return me;
        } catch (err) {
          supportRef.current = false;
          api.clear();
          throw err;
        }
      },
      async endSupportSession() {
        await api.post('/api/v1/auth/impersonation/end').catch(() => undefined);
        supportRef.current = false;
        api.clear();
        queryClient.clear();
        setState({ status: 'signedOut', reason: 'support-ended' });
      },
      retry: () => void restore(),
      can: (p) => permissions.has(p),
    };
  }, [state, api, broadcast, queryClient, restore, site]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** For pages inside the signed-in shell. */
export function useMe(): Me {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useMe used while not signed in');
  return state.me;
}
