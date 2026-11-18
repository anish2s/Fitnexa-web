/** Server-only configuration. */
export const API_URL = (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '');

/** Cookie holding the viewer's theme choice (not sensitive; read on the server to avoid a flash). */
export const THEME_COOKIE = 'fx_theme';

/** The backend's refresh cookie names (dev / production). Only checked for presence, never read. */
export const REFRESH_COOKIES = ['gym_rt', '__Host-gym_rt'];

/** Fitnexa's own accent: platform (super admin) console only. Gym screens use the gym's colour. */
export const FITNEXA_ACCENT = '#6366F1';

/**
 * How many proxies in front of this server append to X-Forwarded-For (Cloudflare = 1; Cloudflare plus
 * a platform load balancer = 2). The visitor's IP is the entry that many places from the right.
 * 0 (local development): the connecting address, which Next.js puts in X-Forwarded-For when the
 * request has none. In production this server must be reachable only through those proxies.
 */
export const TRUSTED_PROXY_HOPS = Math.max(0, Math.min(5, Number(process.env.TRUSTED_PROXY_HOPS ?? 0) || 0));
