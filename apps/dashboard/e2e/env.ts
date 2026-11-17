/** Hosts and demo credentials (backend `npm run seed` with SEED_PASSWORD). */
export const PORT = process.env.E2E_PORT ?? '3000';
export const GYM = `http://powerhouse.localhost:${PORT}`;
export const GYM_LIGHT = `http://fitzone.localhost:${PORT}`;
export const PLATFORM = `http://admin.localhost:${PORT}`;
export const UNKNOWN = `http://no-such-gym.localhost:${PORT}`;
export const PASSWORD = process.env.E2E_PASSWORD ?? '';
if (!PASSWORD) throw new Error('Set E2E_PASSWORD to the backend seed password (SEED_PASSWORD).');
