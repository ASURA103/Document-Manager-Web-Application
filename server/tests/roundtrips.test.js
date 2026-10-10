import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown, as, countCommands, PASSWORD } from './helpers.js';

// Each MongoDB command is a network round trip. With a remote database (about 0.2 s each in production) the
// number of commands, not CPU, decides how long an endpoint takes, so the hot paths have a budget.
let api, users, ownDoc, sharedDoc;
const REPORT = [];
const body = (t) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });

beforeAll(async () => {
  ({ api, users } = await setup());
  ownDoc = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
  sharedDoc = (await api.post('/api/documents').set(as(users.bob)).send({})).body.data.id;
  await api.post(`/api/documents/${sharedDoc}/shares`).set(as(users.bob)).send({ email: users.alice.email, permission: 'editor' });
  await api.patch(`/api/documents/${ownDoc}`).set(as(users.alice)).send({ content: body('first') });
});
afterAll(async () => {
  console.log('\nDB ROUND TRIPS PER REQUEST\n' + REPORT.map((r) => `  ${r.name.padEnd(46)} ${String(r.n).padStart(2)}  ${r.cmds.join(',')}`).join('\n'));
  await teardown();
});

const measure = async (name, fn, budget) => {
  const cmds = await countCommands(fn);
  REPORT.push({ name, n: cmds.length, cmds });
  if (budget !== undefined) expect(cmds.length, `${name}: ${cmds.join(',')}`).toBeLessThanOrEqual(budget);
};

describe('database round trips per request', () => {
  it('login (also returns the dashboard data: one request instead of two)', () => measure('POST /auth/login (incl. document lists)', () => api.post('/api/auth/login').send({ email: users.alice.email, password: PASSWORD }), 3));
  it('auth/me', () => measure('GET  /auth/me', () => api.get('/api/auth/me').set(as(users.alice)), 0));
  it('list documents', () => measure('GET  /documents (1 owned + 1 shared)', () => api.get('/api/documents').set(as(users.alice)), 2));
  it('open own document', () => measure('GET  /documents/:id (owner)', () => api.get(`/api/documents/${ownDoc}`).set(as(users.alice)), 2));
  it('open shared document', () => measure('GET  /documents/:id (editor via share)', () => api.get(`/api/documents/${sharedDoc}`).set(as(users.alice)), 3));
  it('autosave (steady state: snapshot already taken recently)', async () => {
    await api.patch(`/api/documents/${ownDoc}`).set(as(users.alice)).send({ content: body('second') }); // may take the first snapshot
    await measure('PATCH /documents/:id content (autosave, steady state)', () => api.patch(`/api/documents/${ownDoc}`).set(as(users.alice)).send({ content: body('third') }), 3);
  });
  it('comments list', () => measure('GET  /documents/:id/comments', () => api.get(`/api/documents/${ownDoc}/comments`).set(as(users.alice))));
});
