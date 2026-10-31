import test from 'node:test';
import assert from 'node:assert/strict';
import { resultUrl } from '../src/result-navigation.js';
import { domainComparison } from '../src/progress-data.js';
const uuid = '038342ad-0b62-4a8b-858b-07aa129470cd';
test('historical recording UUID survives both detail-screen round trips', () => {
  for (const page of ['progress.html', 'scores-and-recommendations.html']) {
    const outgoing = new URL(resultUrl(page, 'registered', uuid), 'http://localhost');
    const incoming = new URL(resultUrl('results.html', outgoing.searchParams.get('mode'), outgoing.searchParams.get('record')), 'http://localhost');
    assert.equal(incoming.searchParams.get('record'), uuid);
    assert.equal(incoming.searchParams.get('mode'), 'registered');
  }
});
test('current and Quick Launcher URLs never acquire historical context', () => {
  assert.equal(resultUrl('results.html', 'registered'), 'results.html?mode=registered');
  assert.equal(resultUrl('results.html', 'quick', uuid), 'results.html?mode=quick');
});
test('Dashboard and Progress use identical domain comparison labels and tones', () => {
  const current = { domainScores: { sleep: 7.5, diet: 6.2, body: 8, mental: null, activity: 0 } };
  const previous = { domainScores: { sleep: 6.7, diet: 6.6, body: 8, mental: 8, activity: 1 } };
  assert.deepEqual(domainComparison(current, previous, 'sleep'), { delta: 0.8, text: '(+0.8)', direction: 'up' });
  assert.deepEqual(domainComparison(current, previous, 'diet'), { delta: -0.4, text: '(−0.4)', direction: 'down' });
  assert.deepEqual(domainComparison(current, previous, 'body'), { delta: 0, text: '(0.0)', direction: 'flat' });
  for (const [latest, prior, id] of [[current, null, 'sleep'], [current, previous, 'mental'], [current, previous, 'vitals']]) {
    assert.deepEqual(domainComparison(latest, prior, id), { delta: null, text: 'No previous comparison', direction: 'flat' });
  }
  assert.equal(domainComparison(current, previous, 'activity').delta, -1);
});
