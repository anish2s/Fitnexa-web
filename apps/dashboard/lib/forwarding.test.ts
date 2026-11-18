import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, forwardedHeaders } from './forwarding';

test('no proxy in front (development): the address Next.js recorded', () => {
  assert.equal(clientIp('127.0.0.1', 0), '127.0.0.1');
  assert.equal(clientIp('::1', 0), '::1');
  assert.equal(clientIp(null, 0), undefined);
});

test('behind N proxies: the entry N from the right; anything the visitor added on the left is ignored', () => {
  // Cloudflare appended the real visitor after a forged value.
  assert.equal(clientIp('6.6.6.6, 203.0.113.7', 1), '203.0.113.7');
  // Cloudflare → load balancer → us.
  assert.equal(clientIp('6.6.6.6, 203.0.113.7, 172.16.0.2', 2), '203.0.113.7');
  assert.equal(clientIp('2001:db8::1', 1), '2001:db8::1');
  assert.equal(clientIp('[2001:db8::1]', 1), '2001:db8::1');
  // Shorter chain than configured, or junk: no IP rather than a wrong one.
  assert.equal(clientIp('203.0.113.7', 2), undefined);
  assert.equal(clientIp('not-an-ip', 1), undefined);
});

test('forwarded headers name the host and the visitor, never what the browser claimed', () => {
  const h = new Headers({ host: 'fitzone.localhost:3002', 'x-forwarded-for': '198.51.100.4' });
  assert.deepEqual(forwardedHeaders(h, 'http'), {
    'x-forwarded-host': 'fitzone.localhost:3002',
    'x-forwarded-proto': 'http',
    'x-forwarded-for': '198.51.100.4',
  });
  assert.equal(forwardedHeaders(new Headers({ host: 'a.localhost' }))['x-forwarded-for'], undefined);
});
