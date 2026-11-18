import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowed, PAGE_RULES, type SessionRole } from './page-rules';

const owner: SessionRole = { scope: 'tenant', role: 'owner' };
const staff: SessionRole = { scope: 'tenant', role: 'staff' };
const member: SessionRole = { scope: 'tenant', role: 'member' };
const admin: SessionRole = { scope: 'platform', role: 'super_admin' };

test('owner-only gym pages: owners yes; staff and members no; never on the platform host', () => {
  assert.equal(allowed(PAGE_RULES.staff, 'gym', owner), true);
  assert.equal(allowed(PAGE_RULES.staff, 'gym', staff), false);
  assert.equal(allowed(PAGE_RULES.staff, 'gym', member), false);
  assert.equal(allowed(PAGE_RULES.staff, 'platform', admin), false);
});

test('audit log: owner on a gym host, super admin on the platform host', () => {
  assert.equal(allowed(PAGE_RULES.auditLog, 'gym', owner), true);
  assert.equal(allowed(PAGE_RULES.auditLog, 'gym', staff), false);
  assert.equal(allowed(PAGE_RULES.auditLog, 'platform', admin), true);
});

test('platform console pages exist only on the platform host, for super admins', () => {
  assert.equal(allowed(PAGE_RULES.gyms, 'gym', owner), false);
  assert.equal(allowed(PAGE_RULES.gyms, 'platform', admin), true);
});

test('no session cookie: the page is let through to the client shell (sign-in, or an in-memory support session)', () => {
  assert.equal(allowed(PAGE_RULES.staff, 'gym', null), true);
  assert.equal(allowed(PAGE_RULES.gyms, 'platform', null), true);
  assert.equal(allowed(PAGE_RULES.gyms, 'gym', null), false); // wrong host is a 404 regardless
});

test('guarded paths include their sub-pages; everything else is not guarded here', async () => {
  const { ruleFor } = await import('./page-rules');
  assert.equal(ruleFor('/staff'), PAGE_RULES.staff);
  assert.equal(ruleFor('/audit-log'), PAGE_RULES.auditLog);
  assert.equal(ruleFor('/gyms/new'), PAGE_RULES.gyms);
  assert.equal(ruleFor('/gyms/66f0a1b2c3d4e5f6a7b8c9d0'), PAGE_RULES.gyms);
  for (const p of ['/', '/members', '/reports', '/settings', '/staffing', '/page-not-found']) assert.equal(ruleFor(p), undefined, p);
});
