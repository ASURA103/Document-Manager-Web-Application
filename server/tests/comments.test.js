import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown, as } from './helpers.js';
import { Comment } from '../src/models/Comment.js';

let api, users, docId, otherDocId;
const post = (id, body, who = users.alice) => api.post(`/api/documents/${id}/comments`).set(as(who)).send({ body });
const list = async (id, who = users.alice) => (await api.get(`/api/documents/${id}/comments`).set(as(who))).body.data;

beforeAll(async () => {
  ({ api, users } = await setup());
  docId = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
  otherDocId = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
  await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.bob.email, permission: 'viewer' });
  await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.carol.email, permission: 'editor' });
});
afterAll(teardown);

describe('comments: add and read', () => {
  it('owner, editor and viewer can all comment, and everyone with access sees them in order', async () => {
    expect((await post(docId, 'Owner note')).status).toBe(201);
    expect((await post(docId, 'Editor note', users.carol)).status).toBe(201);
    expect((await post(docId, 'Viewer note', users.bob)).status).toBe(201);
    for (const who of [users.alice, users.bob, users.carol]) {
      const c = await list(docId, who);
      expect(c.map((x) => x.body)).toEqual(['Owner note', 'Editor note', 'Viewer note']);
      expect(c[0].author.name).toBe('alice');
    }
  });

  it('a stranger cannot read or write comments (404)', async () => {
    const stranger = users.bob; // has no access to otherDocId
    expect((await api.get(`/api/documents/${otherDocId}/comments`).set(as(stranger))).status).toBe(404);
    expect((await post(otherDocId, 'hi', stranger)).status).toBe(404);
  });

  it('validates the body: empty, whitespace-only, too long', async () => {
    expect((await post(docId, '')).status).toBe(400);
    expect((await post(docId, '   ')).status).toBe(400);
    expect((await post(docId, 'x'.repeat(2001))).status).toBe(400);
    expect((await post(docId, 'x'.repeat(2000))).status).toBe(201);
  });

  it('requires authentication and rejects malformed ids', async () => {
    expect((await api.get(`/api/documents/${docId}/comments`)).status).toBe(401);
    expect((await api.get('/api/documents/not-an-id/comments').set(as(users.alice))).status).toBe(400);
  });

  it('stores comment text as data (markup is returned verbatim, never interpreted by the API)', async () => {
    const r = await post(docId, '<img src=x onerror=alert(1)>');
    expect(r.body.data.body).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('comments: resolve and delete rules', () => {
  let ownerC, viewerC;
  beforeAll(async () => {
    const c = await list(docId);
    ownerC = c.find((x) => x.body === 'Owner note');
    viewerC = c.find((x) => x.body === 'Viewer note');
  });

  it('permission flags match the rules', async () => {
    const asBob = await list(docId, users.bob);
    expect(asBob.find((x) => x.id === viewerC.id).permissions).toEqual({ resolve: true, delete: true }); // own comment
    expect(asBob.find((x) => x.id === ownerC.id).permissions).toEqual({ resolve: false, delete: false });
    const asCarol = await list(docId, users.carol);
    expect(asCarol.find((x) => x.id === ownerC.id).permissions).toEqual({ resolve: true, delete: false }); // editor can resolve, not delete
    const asAlice = await list(docId);
    expect(asAlice.every((x) => x.permissions.resolve && x.permissions.delete)).toBe(true); // owner can do both
  });

  it('a viewer cannot resolve or delete someone else\'s comment (403)', async () => {
    expect((await api.patch(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.bob)).send({ resolved: true })).status).toBe(403);
    expect((await api.delete(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.bob))).status).toBe(403);
  });

  it('an editor can resolve any comment but cannot delete another person\'s', async () => {
    expect((await api.patch(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.carol)).send({ resolved: true })).body.data.resolved).toBe(true);
    expect((await api.delete(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.carol))).status).toBe(403);
  });

  it('an author can resolve and delete their own comment (even as a viewer)', async () => {
    expect((await api.patch(`/api/documents/${docId}/comments/${viewerC.id}`).set(as(users.bob)).send({ resolved: true })).status).toBe(200);
    expect((await api.delete(`/api/documents/${docId}/comments/${viewerC.id}`).set(as(users.bob))).status).toBe(200);
    expect((await list(docId)).some((x) => x.id === viewerC.id)).toBe(false);
  });

  it('the owner can delete anyone\'s comment', async () => {
    const r = await post(docId, 'to be removed', users.carol);
    expect((await api.delete(`/api/documents/${docId}/comments/${r.body.data.id}`).set(as(users.alice))).status).toBe(200);
  });

  it('rejects a bad resolve payload', async () => {
    expect((await api.patch(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.alice)).send({ resolved: 'yes' })).status).toBe(400);
    expect((await api.patch(`/api/documents/${docId}/comments/${ownerC.id}`).set(as(users.alice)).send({})).status).toBe(400);
  });

  it('a comment id from another document is a 404, even for the owner of both', async () => {
    const r = await post(otherDocId, 'on the other doc');
    const id = r.body.data.id;
    expect((await api.patch(`/api/documents/${docId}/comments/${id}`).set(as(users.alice)).send({ resolved: true })).status).toBe(404);
    expect((await api.delete(`/api/documents/${docId}/comments/${id}`).set(as(users.alice))).status).toBe(404);
  });

  it('deleting a document deletes its comments', async () => {
    await api.delete(`/api/documents/${otherDocId}`).set(as(users.alice));
    expect(await Comment.countDocuments({ document: otherDocId })).toBe(0);
  });
});
