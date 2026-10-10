import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { setup, teardown, as, PASSWORD, JWT_SECRET } from './helpers.js';

let api, users;
beforeAll(async () => ({ api, users } = await setup()));
afterAll(teardown);

describe('authentication', () => {
  it('logs in with the correct password and never returns the hash', async () => {
    const res = await api.post('/api/auth/login').send({ email: users.alice.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrong = await api.post('/api/auth/login').send({ email: users.alice.email, password: 'nope' });
    const unknown = await api.post('/api/auth/login').send({ email: 'ghost@example.com', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('rejects missing password and operator-injection payloads', async () => {
    expect((await api.post('/api/auth/login').send({ email: users.alice.email })).status).toBe(400);
    const inj = await api.post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(inj.status).toBe(400);
  });

  it('treats a legacy user without a password hash as invalid credentials (401, not a crash)', async () => {
    const { User } = await import('../src/models/User.js');
    await User.collection.insertOne({ name: 'Legacy', email: 'legacy@example.com' }); // bypasses schema validation on purpose
    const res = await api.post('/api/auth/login').send({ email: 'legacy@example.com', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('no longer exposes a public user list', async () => {
    expect((await api.get('/api/auth/users')).status).toBe(404);
  });

  it('rejects forged and malformed tokens', async () => {
    expect((await api.get('/api/auth/me').set({ Authorization: 'Bearer abc.def.ghi' })).status).toBe(401);
    expect((await api.get('/api/auth/me').set(as(users.alice))).body.data.email).toBe(users.alice.email);
  });
});

describe('identity from the signed token and login payload', () => {
  it('login also returns the dashboard data, and only for a correct password', async () => {
    const ok = await api.post('/api/auth/login').send({ email: users.alice.email, password: PASSWORD });
    expect(ok.body.data.documents).toEqual({ owned: expect.any(Array), shared: expect.any(Array) });
    const bad = await api.post('/api/auth/login').send({ email: users.alice.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(JSON.stringify(bad.body)).not.toMatch(/documents|owned|shared/);
  });

  it('a signed token identifies the user without a database lookup (works even after the user row is gone)', async () => {
    const { User } = await import('../src/models/User.js');
    const temp = await User.create({ name: 'Temp', email: 'temp@example.com', passwordHash: await User.hashPassword('x') });
    const token = (await api.post('/api/auth/login').send({ email: 'temp@example.com', password: 'x' })).body.data.token;
    await User.deleteOne({ _id: temp._id });
    const me = await api.get('/api/auth/me').set({ Authorization: `Bearer ${token}` });
    expect(me.status).toBe(200); // documented trade-off: valid until the 12 h token expires
    expect(me.body.data.email).toBe('temp@example.com');
  });

  it('an older token that carries only the user id still works if the user exists, and is rejected if not', async () => {
    const { User } = await import('../src/models/User.js');
    const alice = await User.findOne({ email: users.alice.email });
    const legacy = jwt.sign({ sub: alice.id }, JWT_SECRET, { expiresIn: '1h' });
    expect((await api.get('/api/auth/me').set({ Authorization: `Bearer ${legacy}` })).status).toBe(200);
    const gone = jwt.sign({ sub: '64b64b64b64b64b64b64b64b' }, JWT_SECRET, { expiresIn: '1h' });
    expect((await api.get('/api/auth/me').set({ Authorization: `Bearer ${gone}` })).status).toBe(401);
  });

  it('rejects a token with a malformed subject', async () => {
    const bad = jwt.sign({ sub: 'not-an-id', name: 'x', email: 'x@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await api.get('/api/auth/me').set({ Authorization: `Bearer ${bad}` });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    const noSub = jwt.sign({ name: 'x', email: 'x@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    expect((await api.get('/api/auth/me').set({ Authorization: `Bearer ${noSub}` })).status).toBe(401);
  });
});

describe('http hardening', () => {
  it('sets security headers, hides stack info, and limits CORS to the client origin', async () => {
    const ok = await api.get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['x-powered-by']).toBeUndefined();
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    const evil = await api.get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const bad = await api.post('/api/documents').set(as(users.alice)).set('Content-Type', 'application/json').send('{bad');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.js|node_modules/);
  });
});
