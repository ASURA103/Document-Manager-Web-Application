import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown, as } from './helpers.js';

let api, users, docId;
const content = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }] }],
};

beforeAll(async () => {
  ({ api, users } = await setup());
  const res = await api.post('/api/documents').set(as(users.alice)).send({});
  docId = res.body.data.id;
});
afterAll(teardown);

describe('document lifecycle', () => {
  it('creates an Untitled Document owned by the caller with an empty Tiptap doc', async () => {
    const res = await api.get(`/api/documents/${docId}`).set(as(users.alice));
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Untitled Document');
    expect(res.body.data.role).toBe('owner');
    expect(res.body.data.content.type).toBe('doc');
  });

  it('persists rename and rich-text content', async () => {
    const patch = await api.patch(`/api/documents/${docId}`).set(as(users.alice)).send({ title: '  Plan  ', content });
    expect(patch.status).toBe(200);
    const res = await api.get(`/api/documents/${docId}`).set(as(users.alice));
    expect(res.body.data.title).toBe('Plan');
    expect(res.body.data.content).toEqual(content);
  });

  it('rejects empty titles and malformed ids', async () => {
    expect((await api.patch(`/api/documents/${docId}`).set(as(users.alice)).send({ title: '   ' })).status).toBe(400);
    expect((await api.get('/api/documents/not-an-id').set(as(users.alice))).status).toBe(400);
  });

  it('requires authentication', async () => {
    expect((await api.get('/api/documents')).status).toBe(401);
  });
});

describe('extended editor content', () => {
  it('round-trips alignment, colour, size, link, highlight and checklist nodes', async () => {
    const rich = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [
          { type: 'text', text: 'styled', marks: [
            { type: 'textStyle', attrs: { color: '#d93025', fontSize: '24px', fontFamily: 'Georgia' } },
            { type: 'highlight', attrs: { color: '#fff475' } },
            { type: 'link', attrs: { href: 'https://example.com' } },
          ] },
        ] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] }] },
      ],
    };
    const created = await api.post('/api/documents').set(as(users.alice)).send({});
    const id2 = created.body.data.id;
    expect((await api.patch(`/api/documents/${id2}`).set(as(users.alice)).send({ content: rich })).status).toBe(200);
    expect((await api.get(`/api/documents/${id2}`).set(as(users.alice))).body.data.content).toEqual(rich);
  });
});

describe('authorization (IDOR)', () => {
  it('hides the document from a user with no access (read and write)', async () => {
    const get = await api.get(`/api/documents/${docId}`).set(as(users.bob));
    expect(get.status).toBe(404);
    const patch = await api.patch(`/api/documents/${docId}`).set(as(users.bob)).send({ content });
    expect(patch.status).toBe(404);
    expect((await api.delete(`/api/documents/${docId}`).set(as(users.bob))).status).toBe(404);
    expect((await api.get(`/api/documents/${docId}/shares`).set(as(users.bob))).status).toBe(404);
  });

  it('does not list the document for an unrelated user', async () => {
    const res = await api.get('/api/documents').set(as(users.bob));
    expect(res.body.data.owned).toHaveLength(0);
    expect(res.body.data.shared).toHaveLength(0);
  });

  it('viewer can read but not write, rename, share or delete', async () => {
    const share = await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.bob.email, permission: 'viewer' });
    expect(share.status).toBe(201);
    expect((await api.get(`/api/documents/${docId}`).set(as(users.bob))).body.data.role).toBe('viewer');
    expect((await api.patch(`/api/documents/${docId}`).set(as(users.bob)).send({ content })).status).toBe(403);
    expect((await api.patch(`/api/documents/${docId}`).set(as(users.bob)).send({ title: 'x' })).status).toBe(403);
    expect((await api.post(`/api/documents/${docId}/shares`).set(as(users.bob)).send({ email: users.carol.email, permission: 'viewer' })).status).toBe(403);
    expect((await api.delete(`/api/documents/${docId}`).set(as(users.bob))).status).toBe(403);
  });

  it('shared document appears in the recipient list with owner and permission', async () => {
    const res = await api.get('/api/documents').set(as(users.bob));
    expect(res.body.data.shared).toHaveLength(1);
    expect(res.body.data.shared[0]).toMatchObject({ id: docId, role: 'viewer', owner: { email: users.alice.email } });
    expect(res.body.data.shared[0].content).toBeUndefined();
  });

  it('editor can write content but cannot rename', async () => {
    await api.post(`/api/documents/${docId}/shares`).set(as(users.alice)).send({ email: users.carol.email, permission: 'editor' });
    const edited = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited by carol' }] }] };
    expect((await api.patch(`/api/documents/${docId}`).set(as(users.carol)).send({ content: edited })).status).toBe(200);
    expect((await api.patch(`/api/documents/${docId}`).set(as(users.carol)).send({ title: 'Hijack' })).status).toBe(403);
    expect((await api.get(`/api/documents/${docId}`).set(as(users.alice))).body.data.content).toEqual(edited);
  });
});

describe('sharing validation', () => {
  it('rejects duplicates, unknown users, invalid permission and sharing with owner', async () => {
    const url = `/api/documents/${docId}/shares`;
    expect((await api.post(url).set(as(users.alice)).send({ email: users.bob.email, permission: 'editor' })).status).toBe(409);
    expect((await api.post(url).set(as(users.alice)).send({ email: 'ghost@example.com', permission: 'viewer' })).status).toBe(404);
    expect((await api.post(url).set(as(users.alice)).send({ email: users.bob.email, permission: 'admin' })).status).toBe(400);
    expect((await api.post(url).set(as(users.alice)).send({ email: users.alice.email, permission: 'viewer' })).status).toBe(400);
  });

  it('revoking a share removes access', async () => {
    const bobId = (await api.get('/api/auth/me').set(as(users.bob))).body.data.id;
    expect((await api.delete(`/api/documents/${docId}/shares/${bobId}`).set(as(users.alice))).status).toBe(200);
    expect((await api.get(`/api/documents/${docId}`).set(as(users.bob))).status).toBe(404);
  });
});
