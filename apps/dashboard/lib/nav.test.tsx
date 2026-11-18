import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GYM_ROUTES, PLATFORM_ROUTES, visibleNav } from './nav';

/**
 * Role → menu. Permission sets as GET /auth/me returns them, copied from the backend's
 * ROLE_PERMISSIONS (fitexaa-backend src/auth/permissions.ts); the menu shows only what they unlock.
 */
const STAFF = [
  'gym:read', 'members:read', 'members:create', 'members:update', 'plans:read', 'memberships:read',
  'memberships:manage', 'payments:read', 'payments:record', 'attendance:read', 'attendance:checkin', 'dashboard:read',
];
const OWNER = [
  ...STAFF, 'gym:update', 'branding:update', 'staff:read', 'staff:manage', 'members:archive', 'members:import',
  'plans:manage', 'payments:refund', 'reports:read', 'audit:read', 'privacy:manage', 'renewals:manage',
];

const menu = (sections: typeof GYM_ROUTES, perms: string[]) =>
  visibleNav(sections, (p) => perms.includes(p)).map((s) => `${s.label}: ${s.routes.map((r) => r.label).join(', ')}`);

test('owner sees every gym screen', () => {
  assert.deepEqual(menu(GYM_ROUTES, OWNER), [
    'Main: Overview, Front desk, Members, Renewals',
    'Finance: Payments, Plans, Reports',
    'Account: Staff, Audit log, Settings',
  ]);
});

test('front-desk staff: no reports, staff or audit log; settings still there (My account)', () => {
  assert.deepEqual(menu(GYM_ROUTES, STAFF), [
    'Main: Overview, Front desk, Members, Renewals',
    'Finance: Payments, Plans',
    'Account: Settings',
  ]);
});

test('a staff member granted reports gets Reports, nothing else', () => {
  assert.deepEqual(menu(GYM_ROUTES, [...STAFF, 'reports:read'])[1], 'Finance: Payments, Plans, Reports');
});

test('no permissions: only Settings; empty sections disappear', () => {
  assert.deepEqual(menu(GYM_ROUTES, []), ['Account: Settings']);
});

test('super admin (no gym permissions) gets the platform console menu', () => {
  assert.deepEqual(menu(PLATFORM_ROUTES, []), ['Platform: Gyms, Audit log', 'Account: Settings']);
});
