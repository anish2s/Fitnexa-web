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
import { ApiError, createApiClient, type ApiClient, type Me } from '@fitnexa/api-client';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason?: 'expired' }
  | { status: 'signedIn'; me: Me }
  | { status: 'error'; error: ApiError };

interface AuthApi {
  state: AuthState;
  api: ApiClient;
  signIn: (identifier: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  retry: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthApi | null>(null);
const CHANNEL = 'fx-auth';

export function AuthProvider({ hasSession, children }: { hasSession: boolean; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(hasSession ? { status: 'loading' } : { status: 'signedOut' });
  const stateRef = useRef(state);
  stateRef.current = state;

  const [api] = useState(() =>
    createApiClient({
      onSessionChange: (s) => {
        // Session lost mid-use (refresh cookie expired, revoked, account disabled).
        if (!s && stateRef.current.status === 'signedIn') {
          queryClient.clear();
          setState({ status: 'signedOut', reason: 'expired' });
        }
      },
    }),
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

  const restore = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      await api.refresh();
      setState({ status: 'signedIn', me: await api.me() });
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0 && err.status < 500) setState({ status: 'signedOut' });
      else setState({ status: 'error', error: err as ApiError });
    }
  }, [api]);

  useEffect(() => {
    if (hasSession) void restore();
  }, [hasSession, restore]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<string>) => {
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
        await api.login(identifier, password);
        const me = await api.me();
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
      retry: () => void restore(),
      can: (p) => permissions.has(p),
    };
  }, [state, api, broadcast, queryClient, restore]);

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
