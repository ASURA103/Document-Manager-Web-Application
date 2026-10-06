import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown, as } from './helpers.js';
import { DocumentVersion } from '../src/models/DocumentVersion.js';
import { MAX_VERSIONS } from '../src/services/version.service.js';

let api, users, docId, otherDocId;
const body = (text) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const save = (id, text, who = users.alice) => api.patch(`/api/documents/${id}`).set(as(who)).send({ content: body(text) });
// Mongoose treats createdAt as immutable, so move snapshots into the past with the native driver.
const ageSnapshots = (id, minutes = 10) => DocumentVersion.collection.updateMany(
  { document: new (DocumentVersion.base.Types.ObjectId)(id) },
  [{ $set: { createdAt: { $subtract: ['$createdAt', minutes * 60 * 1000] } } }], // shift back, preserving their order
);
const versions = async (id, who = users.alice) => (await api.get(`/api/documents/${id}/versions`).set(as(who))).body.data;

beforeAll(async () => {
  ({ api, users } = await setup());
  docId = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
  otherDocId = (await api.post('/api/documents').set(as(users.alice)).send({})).body.data.id;
});
afterAll(teardown);

describe('version history: snapshot rules', () => {
  it('does not snapshot the empty starting document, nor an unchanged save', async () => {
    await save(docId, 'A'); // overwrites the empty starter -> no snapshot
    await save(docId, 'A'); // identical content -> nothing to record
    expect(await versions(docId)).toHaveLength(0);
  });

  it('snapshots the previous content on the next change', async () => {
    await save(docId, 'B');
    const list = await versions(docId);
    expect(list).toHaveLength(1);
    expect(list[0].author.name).toBe('alice');
    expect(list[0].content).toBeUndefined(); // list stays light
  });

  it('does not snapshot again within the 5-minute window', async () => {
    await save(docId, 'C');
    await save(docId, 'D');
    expect(await versions(docId)).toHaveLength(1);
  });

  it('snapshots again once the newest snapshot is old enough, newest first', async () => {
    await ageSnapshots(docId);
    await save(docId, 'E'); // snapshots D
    const list = await versions(docId);
    expect(list).toHaveLength(2);
    const newest = (await api.get(`/api/documents/${docId}/versions/${list[0].id}`).set(as(users.alice))).body.data;
    expect(JSON.stringify(newest.content)).toContain('"D"');
    const oldest = (await api.get(`/api/documents/${docId}/versions/${list[1].id}`).set(as(users.alice))).body.data;
    expect(JSON.stringify(oldest.content)).toContain('"A"');
  });

  it('records the editor who wrote the content as the snapshot author', async () => {
    await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.carol.email, permission: 'editor' });
    await ageSnapshots(docId);
    await save(docId, 'F', users.carol); // snapshots E (written by alice)
    await ageSnapshots(docId);
    await save(docId, 'G', users.alice); // snapshots F (written by carol)
    const list = await versions(docId);
    expect(list[0].author.name).toBe('carol');
  });

  it('keeps at most MAX_VERSIONS snapshots (oldest pruned)', async () => {
    for (let i = 0; i < MAX_VERSIONS + 4; i += 1) { await ageSnapshots(otherDocId); await save(otherDocId, `v${i}`); }
    expect((await versions(otherDocId)).length).toBe(MAX_VERSIONS);
  });
});

describe('version history: restore and access', () => {
  it('restores an old version and keeps the replaced content as a new snapshot (undoable)', async () => {
    const before = await versions(docId);
    const oldest = before[before.length - 1];
    const res = await api.post(`/api/documents/${docId}/versions/${oldest.id}/restore`).set(as(users.alice));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data.content)).toContain('"A"');
    const doc = (await api.get(`/api/documents/${docId}`).set(as(users.alice))).body.data;
    expect(JSON.stringify(doc.content)).toContain('"A"');
    const after = await versions(docId);
    expect(after.length).toBe(before.length + 1);
    const newest = (await api.get(`/api/documents/${docId}/versions/${after[0].id}`).set(as(users.alice))).body.data;
    expect(JSON.stringify(newest.content)).toContain('"G"'); // what was replaced
  });

  it('viewer can read history but not restore', async () => {
    await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.bob.email, permission: 'viewer' });
    const list = await versions(docId, users.bob);
    expect(list.length).toBeGreaterThan(0);
    expect((await api.get(`/api/documents/${docId}/versions/${list[0].id}`).set(as(users.bob))).status).toBe(200);
    expect((await api.post(`/api/documents/${docId}/versions/${list[0].id}/restore`).set(as(users.bob))).status).toBe(403);
  });

  it('editor can restore', async () => {
    const list = await versions(docId, users.carol);
    expect((await api.post(`/api/documents/${docId}/versions/${list[0].id}/restore`).set(as(users.carol))).status).toBe(200);
  });

  it('stranger gets 404 for list, read and restore', async () => {
    const list = await versions(docId);
    const stranger = users.bob; // not used below as a sharee for otherDocId
    expect((await api.get(`/api/documents/${otherDocId}/versions`).set(as(stranger))).status).toBe(404);
    expect((await api.get(`/api/documents/${otherDocId}/versions/${list[0].id}`).set(as(stranger))).status).toBe(404);
    expect((await api.post(`/api/documents/${otherDocId}/versions/${list[0].id}/restore`).set(as(stranger))).status).toBe(404);
  });

  it('a version id from another document is a 404 even for the owner (no cross-document access)', async () => {
    const list = await versions(docId);
    expect((await api.get(`/api/documents/${otherDocId}/versions/${list[0].id}`).set(as(users.alice))).status).toBe(404);
    expect((await api.post(`/api/documents/${otherDocId}/versions/${list[0].id}/restore`).set(as(users.alice))).status).toBe(404);
  });

  it('rejects malformed ids and requires authentication', async () => {
    expect((await api.get(`/api/documents/${docId}/versions/not-an-id`).set(as(users.alice))).status).toBe(400);
    expect((await api.get(`/api/documents/${docId}/versions`)).status).toBe(401);
  });

  it('deleting a document deletes its history', async () => {
    await api.delete(`/api/documents/${otherDocId}`).set(as(users.alice));
    expect(await DocumentVersion.countDocuments({ document: otherDocId })).toBe(0);
  });
});
