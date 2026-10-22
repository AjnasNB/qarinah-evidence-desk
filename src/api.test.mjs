import test from 'node:test';
import assert from 'node:assert/strict';
import { resultLabel, timeLabel } from './api.js';

test('pasted nonprimitive timestamps cannot crash the preview or run coercion', () => {
  let coerced = false;
  const malformed = JSON.parse('{"toString":null,"valueOf":null}');
  const values = [malformed, Object.create(null), null, undefined, [], true, 1n, Symbol('date'), {
    [Symbol.toPrimitive]() { coerced = true; throw new Error('Must not run'); },
  }];
  for (const value of values) assert.equal(timeLabel(value), 'Unknown time');
  assert.equal(coerced, false);
});

test('timestamp labels retain valid primitive dates and reject invalid dates', () => {
  assert.notEqual(timeLabel('2026-10-22T12:00:00.000Z'), 'Unknown time');
  assert.notEqual(timeLabel(0), 'Unknown time');
  for (const value of ['', 'not-a-date', NaN, Infinity, -Infinity]) {
    assert.equal(timeLabel(value), 'Unknown time');
  }
});

test('deterministic ready and hold results never claim model assistance', () => {
  for (const releaseDecision of ['ready', 'hold']) {
    assert.equal(resultLabel({ status: 'answered', mode: 'retrieval-only', releaseDecision }), 'Deterministic release review');
  }
  assert.equal(resultLabel({ status: 'answered', mode: 'nemotron' }), 'Model-assisted answer');
  assert.equal(resultLabel({ status: 'answered', mode: 'retrieval-only' }), 'Evidence review');
  assert.equal(resultLabel({ status: 'abstained', mode: 'retrieval-only' }), 'Answer withheld');
});
