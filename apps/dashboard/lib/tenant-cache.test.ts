import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invalidateTenantCache, resolveHost, TENANT_CACHE_TTL_MS, type HostContext } from './tenant-cache';

const gym = (host: string): HostContext => ({ scope: 'platform', host });

function counter(result: (host: string) => HostContext) {
  const calls: string[] = [];
  return { calls, fetch: (host: string) => async () => (calls.push(host), result(host)) };
}

test('one API call per host per minute; hosts are cached separately', async () => {
  invalidateTenantCache();
  const c = counter(gym);
  const t0 = 1_000_000;
  await resolveHost('powerhouse.localhost', c.fetch('powerhouse.localhost'), t0);
  await resolveHost('POWERHOUSE.localhost', c.fetch('powerhouse.localhost'), t0 + 1000);
  await resolveHost('fitzone.localhost', c.fetch('fitzone.localhost'), t0 + 2000);
  assert.deepEqual(c.calls, ['powerhouse.localhost', 'fitzone.localhost']);
  await resolveHost('powerhouse.localhost', c.fetch('powerhouse.localhost'), t0 + TENANT_CACHE_TTL_MS);
  assert.equal(c.calls.length, 3); // expired after 60 s
});

test('concurrent page loads for one host share a single call', async () => {
  invalidateTenantCache();
  const c = counter(gym);
  await Promise.all(Array.from({ length: 10 }, () => resolveHost('a.localhost', c.fetch('a.localhost'), 5)));
  assert.equal(c.calls.length, 1);
});

test('"API down" is never cached', async () => {
  invalidateTenantCache();
  const c = counter((host) => ({ scope: 'unavailable', host }));
  await resolveHost('b.localhost', c.fetch('b.localhost'), 10);
  await resolveHost('b.localhost', c.fetch('b.localhost'), 11);
  assert.equal(c.calls.length, 2);
});

test('edits drop the cached copy (one host, or all for platform edits)', async () => {
  invalidateTenantCache();
  const c = counter(gym);
  await resolveHost('c.localhost', c.fetch('c.localhost'), 20);
  await resolveHost('d.localhost', c.fetch('d.localhost'), 20);
  invalidateTenantCache('c.localhost');
  await resolveHost('c.localhost', c.fetch('c.localhost'), 21);
  await resolveHost('d.localhost', c.fetch('d.localhost'), 21);
  assert.deepEqual(c.calls, ['c.localhost', 'd.localhost', 'c.localhost']);
  invalidateTenantCache();
  await resolveHost('d.localhost', c.fetch('d.localhost'), 22);
  assert.equal(c.calls.length, 4);
});
