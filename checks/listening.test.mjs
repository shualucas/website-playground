import test from 'node:test';
import assert from 'node:assert/strict';
import { createListeningHandler } from '../api/listening.js';

const response = () => ({ headers: {}, statusCode: 0, body: '', setHeader(k, v) { this.headers[k] = v; }, end(body = '') { this.body = body; } });
const track = (name, playing = false) => ({ name, artist: { '#text': 'Fixture artist' }, url: 'https://www.last.fm/music/fixture', image: [{ size: 'small', '#text': 'https://example.com/small.jpg' }, { size: 'large', '#text': 'https://example.com/large.jpg' }], ...(playing ? { '@attr': { nowplaying: 'true' } } : { date: { uts: '1234567890' } }) });

test('an unconfigured account makes no external request', async () => {
  const res = response();
  await createListeningHandler({ fetcher: () => { throw Error('Unexpected fetch'); } })({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(JSON.parse(res.body).code, "LISTENING_NOT_CONFIGURED");
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test('returns the current song and five completed scrobbles, with a 20-second cache and no exposed key', async () => {
  let calls = 0, now = 0;
  const handler = createListeningHandler({ apiKey: 'fixture-key', clock: () => now, fetcher: async endpoint => {
    const url = new URL(endpoint); assert.equal(url.origin, 'https://ws.audioscrobbler.com');
    assert.equal(url.searchParams.get('method'), 'user.getrecenttracks'); assert.equal(url.searchParams.get('user'), 'shualucas');
    assert.equal(url.searchParams.get('api_key'), 'fixture-key'); assert.equal(url.searchParams.get('limit'), '6');
    calls++;
    return { ok: true, json: async () => ({ recenttracks: { track: [track('Current', true), ...Array.from({ length: 6 }, (_, i) => track(`Past ${i}`))] } }) };
  } });
  const a = response(), b = response(), c = response();
  await handler({ method: 'GET' }, a); now = 19999; await handler({ method: 'GET' }, b);
  assert.equal(calls, 1); assert.equal(b.body, a.body);
  const data = JSON.parse(a.body);
  assert.equal(data.track.playing, true); assert.equal(data.track.artwork, 'https://example.com/large.jpg');
  assert.deepEqual(data.recent.map(song => song.title), ['Past 0', 'Past 1', 'Past 2', 'Past 3', 'Past 4']);
  assert(data.recent.every(song => !song.playing)); assert(!a.body.includes('fixture-key'));
  now = 20000; await handler({ method: 'GET' }, c); assert.equal(calls, 2);
});

test('simultaneous requests share one upstream lookup', async () => {
  let finish, calls = 0;
  const handler = createListeningHandler({ apiKey: 'fixture-key', fetcher: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const a = response(), b = response();
  const pending = [handler({ method: 'GET' }, a), handler({ method: 'GET' }, b)];
  finish({ ok: true, json: async () => ({ recenttracks: { track: [track('Recent')] } }) }); await Promise.all(pending);
  assert.equal(calls, 1); assert.equal(a.body, b.body);
});

test('empty listening history and missing artwork have usable values', async () => {
  for (const tracks of [[], [{ name: 'No art', artist: { '#text': 'Artist' } }]]) {
    const res = response();
    await createListeningHandler({ apiKey: 'fixture-key', fetcher: async () => ({ ok: true, json: async () => ({ recenttracks: { track: tracks } }) }) })({ method: 'GET' }, res);
    const data = JSON.parse(res.body);
    if (!tracks.length) assert.deepEqual(data, { track: null, recent: [] });
    else { assert.equal(data.track.artwork, ''); assert.equal(data.track.url, 'https://www.last.fm/user/shualucas'); assert.equal(data.track.playing, false); }
  }
});

test('upstream failure returns a generic error and is not cached', async () => {
  const res = response();
  await createListeningHandler({ apiKey: 'fixture-key', fetcher: async () => { throw Error('fixture-key'); } })({ method: 'GET' }, res);
  assert.equal(res.statusCode, 502); assert(!res.body.includes('fixture-key')); assert.equal(res.headers['Cache-Control'], 'no-store');
});
