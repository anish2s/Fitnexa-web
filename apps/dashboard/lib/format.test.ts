import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inr, inrShort, paiseToRupees, rupeesToPaise } from './format';

// The API sends integer paise; these are the only places they become rupees (and back).

test('inr: whole rupees without decimals, paise shown when present, Indian grouping', () => {
  assert.equal(inr(150000), '₹1,500');
  assert.equal(inr(34250000), '₹3,42,500');
  assert.equal(inr(100050), '₹1,000.50');
  assert.equal(inr(1), '₹0.01');
  assert.equal(inr(0), '₹0');
  assert.equal(inr(150000, true), '₹1,500.00');
  assert.equal(inr(-10000), '-₹100');
});

test('inrShort for chart axes', () => {
  assert.equal(inrShort(34250000), '₹3.4L');
  assert.equal(inrShort(8500000), '₹85k');
  assert.equal(inrShort(120000000_0), '₹1.2Cr');
  assert.equal(inrShort(99900), '₹999');
  assert.equal(inrShort(100000), '₹1k');
});

test('rupeesToPaise: typed amounts to exact integers (no float drift)', () => {
  assert.equal(rupeesToPaise('4500'), 450000);
  assert.equal(rupeesToPaise('4,500.50'), 450050);
  assert.equal(rupeesToPaise('₹ 1,00,000'), 10000000);
  assert.equal(rupeesToPaise('0.1'), 10);
  assert.equal(rupeesToPaise('19.99'), 1999); // 19.99 * 100 would be 1998.9999…
  assert.equal(rupeesToPaise('1.005'), null); // more than paise precision
  assert.equal(rupeesToPaise('-5'), null);
  assert.equal(rupeesToPaise('abc'), null);
  assert.equal(rupeesToPaise(''), null);
});

test('paiseToRupees round-trips with rupeesToPaise', () => {
  assert.equal(paiseToRupees(450000), '4500');
  assert.equal(paiseToRupees(450050), '4500.50');
  assert.equal(paiseToRupees(5), '0.05');
  for (const p of [0, 1, 99, 100, 1999, 450050, 123456789]) assert.equal(rupeesToPaise(paiseToRupees(p)), p);
});
