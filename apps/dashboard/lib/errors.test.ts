import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '@fitexaa/api-client';
import { actionMessage, applyFieldErrors, errorMessage, errorRef, safeNext } from './errors';
import { MAX_RETRY_WAIT_MS, retryDelay, shouldRetry } from './retry';

test('known codes get plain-language messages; unknown codes fall back to the server message', () => {
  assert.match(errorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'x')), /don’t match/);
  assert.match(errorMessage(new ApiError(429, 'RATE_LIMITED', 'x')), /Too many attempts/);
  assert.match(errorMessage(new ApiError(503, 'API_UNAVAILABLE', 'x')), /temporarily unavailable/);
  assert.match(errorMessage(new ApiError(0, 'NETWORK_ERROR', 'x')), /Could not reach the server/);
  assert.equal(errorMessage(new ApiError(409, 'SOMETHING_NEW', 'Server says so')), 'Server says so');
  assert.equal(errorMessage(new TypeError('boom')), 'Something went wrong. Please try again.');
  assert.match(actionMessage(new ApiError(400, 'PAYMENT_GATEWAY_NOT_CONNECTED', 'x')), /Razorpay/);
  assert.match(actionMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'x')), /don’t match/);
});

test('request id is shown only for server faults', () => {
  assert.equal(errorRef(new ApiError(500, 'INTERNAL_ERROR', 'x', undefined, 'req-1')), 'req-1');
  assert.equal(errorRef(new ApiError(422, 'VALIDATION_ERROR', 'x', undefined, 'req-2')), undefined);
  assert.equal(errorRef(new Error('x')), undefined);
});

test('API field errors land on the matching form field (or its closest parent)', () => {
  const set: Record<string, string> = {};
  const setError = (f: never, e: { message: string }) => void (set[f as string] = e.message);
  const err = new ApiError(422, 'VALIDATION_ERROR', 'Invalid', [
    { path: ['phone'], message: 'Enter a valid mobile number' },
    { path: ['emergencyContact', 'phone'], message: 'Bad contact phone' },
    { path: ['unknownField'], message: 'ignored' },
  ]);
  assert.equal(applyFieldErrors(err, setError, ['phone', 'emergencyContact']), true);
  assert.deepEqual(set, { phone: 'Enter a valid mobile number', emergencyContact: 'Bad contact phone' });

  const dup = new ApiError(409, 'DUPLICATE', 'Duplicate', { fields: ['phone'] });
  const set2: Record<string, string> = {};
  applyFieldErrors(dup, (f: never, e) => void (set2[f as string] = e.message), ['phone']);
  assert.match(set2.phone!, /Another member already has this phone/);

  assert.equal(applyFieldErrors(new ApiError(500, 'INTERNAL_ERROR', 'x'), setError, ['phone']), false);
});

test('safeNext allows only same-site paths (no open redirect)', () => {
  assert.equal(safeNext('/members?q=1'), '/members?q=1');
  for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', '/login?next=/x', '/api/v1/x', '', null]) {
    assert.equal(safeNext(bad), '/');
  }
});

test('retries: never on 4xx, briefly on 5xx and network errors, error shown within about a second', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429]) {
    assert.equal(shouldRetry(0, new ApiError(status, 'X', 'x')), false, `retried ${status}`);
  }
  assert.equal(shouldRetry(0, new ApiError(503, 'API_UNAVAILABLE', 'x')), true);
  assert.equal(shouldRetry(1, new ApiError(500, 'INTERNAL_ERROR', 'x')), true);
  assert.equal(shouldRetry(2, new ApiError(500, 'INTERNAL_ERROR', 'x')), false);
  assert.equal(shouldRetry(0, new ApiError(0, 'NETWORK_ERROR', 'x')), true);
  assert.equal(shouldRetry(0, new TypeError('bug')), false);
  assert.deepEqual([retryDelay(0), retryDelay(1)], [250, 500]);
  assert.ok(MAX_RETRY_WAIT_MS <= 1000, `waits ${MAX_RETRY_WAIT_MS} ms`);
});
