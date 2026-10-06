import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setup, teardown, as } from './helpers.js';
import { PRESENCE_TTL_MS } from '../src/services/presence.service.js';

let api, users, docId;
const beat = (who) => api.post(`/api/documents/${docId}/presence`).set(as(who));
const names = (res) => res.body.data.map((p) => p.name).sort();

beforeAll(async () => {
  ({ api, users } = await setup());
  docId = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
  await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.bob.email, permission: 'viewer' });
});
afterAll(teardown);
afterEach(() => vi.useRealTimers());

describe('presence', () => {
  it('lists the caller, then everyone seen recently, without duplicates', async () => {
    expect(names(await beat(users.alice))).toEqual(['alice']);
    expect(names(await beat(users.bob))).toEqual(['alice', 'bob']);
    expect(names(await beat(users.alice))).toEqual(['alice', 'bob']); // repeated heartbeat does not duplicate
  });

  it('forgets people who stop sending heartbeats (TTL)', async () => {
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start);
    await beat(users.alice); await beat(users.bob);
    vi.setSystemTime(start + PRESENCE_TTL_MS - 1000);
    expect(names(await beat(users.alice))).toEqual(['alice', 'bob']); // bob still within the window
    vi.setSystemTime(start + PRESENCE_TTL_MS + 5000);
    expect(names(await beat(users.alice))).toEqual(['alice']); // bob expired
  });

  it('leaving removes the person immediately', async () => {
    await beat(users.alice); await beat(users.bob);
    expect((await api.delete(`/api/documents/${docId}/presence`).set(as(users.bob))).status).toBe(200);
    expect(names(await beat(users.alice))).toEqual(['alice']);
  });

  it('only people with access can send or see presence (stranger 404, unauthenticated 401)', async () => {
    expect((await beat(users.carol)).status).toBe(404);
    expect((await api.delete(`/api/documents/${docId}/presence`).set(as(users.carol))).status).toBe(404);
    expect((await api.post(`/api/documents/${docId}/presence`)).status).toBe(401);
  });

  it('a user whose access is revoked can no longer appear', async () => {
    await beat(users.bob);
    const bobId = (await api.get('/api/auth/me').set(as(users.bob))).body.data.id;
    await api.delete(`/api/documents/${docId}/shares/${bobId}`).set(as(users.alice));
    expect((await beat(users.bob)).status).toBe(404);
  });

  it('rejects malformed document ids', async () => {
    expect((await api.post('/api/documents/not-an-id/presence').set(as(users.alice))).status).toBe(400);
  });
});
