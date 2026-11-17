/** Server-only configuration. */
export const API_URL = (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '');

/** Cookie holding the viewer's theme choice (not sensitive; read on the server to avoid a flash). */
export const THEME_COOKIE = 'fx_theme';

/** The backend's refresh cookie names (dev / production). Only checked for presence, never read. */
export const REFRESH_COOKIES = ['gym_rt', '__Host-gym_rt'];

/** Fitnexa's own accent: platform (super admin) console only. Gym screens use the gym's colour. */
export const FITNEXA_ACCENT = '#6366F1';
