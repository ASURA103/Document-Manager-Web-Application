import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { setup, teardown, as } from './helpers.js';

let api, users;
beforeAll(async () => ({ api, users } = await setup()));
afterAll(teardown);

const upload = (name, data, type) =>
  api.post('/api/documents/import').set(as(users.alice)).attach('file', Buffer.from(data), { filename: name, contentType: type });

const hasMark = (node, mark) =>
  JSON.stringify(node).includes(`"type":"${mark}"`);

describe('file import', () => {
  it('imports .txt as paragraphs and titles it from the filename', async () => {
    const res = await upload('notes.txt', '\n\nline one\n\n\nline three\n\n', 'text/plain');
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('notes');
    // blank lines (leading, middle, trailing) are separators, not stored as empty paragraphs
    expect(res.body.data.content.content).toHaveLength(2);
    expect(res.body.data.content.content.every((p) => p.content?.length)).toBe(true);
    expect(res.body.data.role).toBe('owner');
  });

  it('imports .md preserving headings, bold and lists', async () => {
    const res = await upload('readme.md', '# Title\n\n**bold** text\n\n- a\n- b\n', 'text/markdown');
    expect(res.status).toBe(201);
    const c = res.body.data.content;
    expect(hasMark(c, 'heading')).toBe(true);
    expect(hasMark(c, 'bold')).toBe(true);
    expect(hasMark(c, 'bulletList')).toBe(true);
  });

  it('imports .docx', async () => {
    const buf = fs.readFileSync(new URL('./fixtures/sample.docx', import.meta.url));
    const res = await api.post('/api/documents/import').set(as(users.alice))
      .attach('file', buf, { filename: 'sample.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body.data.content)).toContain('Docx bold');
    expect(hasMark(res.body.data.content, 'bold')).toBe(true);
  });

  it('persists the imported document for later reopen', async () => {
    const created = await upload('persist.txt', 'keep me', 'text/plain');
    const res = await api.get(`/api/documents/${created.body.data.id}`).set(as(users.alice));
    expect(JSON.stringify(res.body.data.content)).toContain('keep me');
  });

  it.each([
    ['evil.exe', 'MZ', 'application/octet-stream', 415],
    ['script.js', 'alert(1)', 'text/javascript', 415],
    ['run.sh', '#!/bin/sh', 'text/x-sh', 415],
    ['a.zip', 'PK', 'application/zip', 415],
    ['empty.txt', '', 'text/plain', 422],
    ['binary.txt', 'ab\u0000cd', 'text/plain', 422],
    ['fake.docx', 'not a zip', 'application/octet-stream', 422],
    ['ws.txt', '   \n  ', 'text/plain', 422],
  ])('rejects %s', async (name, data, type, status) => {
    const res = await upload(name, data, type);
    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);
  });

  it('rejects files over 1 MB with 413', async () => {
    const res = await upload('big.txt', 'a'.repeat(1024 * 1024 + 1), 'text/plain');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('strips path components from filenames and requires auth', async () => {
    const res = await upload('../../etc/passwd.txt', 'x', 'text/plain');
    expect(res.body.data.title).toBe('passwd');
    const anon = await api.post('/api/documents/import').attach('file', Buffer.from('x'), 'a.txt');
    expect(anon.status).toBe(401);
  });

  it('returns 400 when no file is sent', async () => {
    const res = await api.post('/api/documents/import').set(as(users.alice));
    expect(res.status).toBe(400);
  });
});

describe('spreadsheet, csv and html import', () => {
  const textOf = (c) => JSON.stringify(c);

  it('imports .csv as a table with a header row, handling quoted commas and newlines', async () => {
    const res = await upload('data.csv', 'Name,Note\r\n"Smith, Ann","line1\nline2"\r\nBob,"say ""hi"""\r\n', 'text/csv');
    expect(res.status).toBe(201);
    const table = res.body.data.content.content[0];
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(3);
    expect(table.content[0].content[0].type).toBe('tableHeader');
    expect(textOf(table)).toContain('Smith, Ann');
    expect(textOf(table)).toContain('say \\"hi\\"');
  });

  it('accepts the Windows csv MIME type', async () => {
    expect((await upload('win.csv', 'a,b\n1,2', 'application/vnd.ms-excel')).status).toBe(201);
  });

  it('imports .tsv', async () => {
    const res = await upload('t.tsv', 'a\tb\n1\t2', 'text/tab-separated-values');
    expect(res.status).toBe(201);
    expect(res.body.data.content.content[0].type).toBe('table');
  });

  it('imports .xlsx as a table', async () => {
    const buf = fs.readFileSync(new URL('./fixtures/sample.xlsx', import.meta.url));
    const res = await api.post('/api/documents/import').set(as(users.alice))
      .attach('file', buf, { filename: 'sheet.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(201);
    const s = textOf(res.body.data.content);
    expect(s).toContain('"type":"table"');
    expect(s).toContain('Ann');
    expect(s).toContain('42');
  });

  it('rejects a fake .xlsx and an oversized sheet', async () => {
    expect((await upload('fake.xlsx', 'not a zip', 'application/octet-stream')).status).toBe(422);
    const tooManyCols = Array.from({ length: 31 }, (_, i) => `c${i}`).join(',');
    expect((await upload('wide.csv', `${tooManyCols}\n1`, 'text/csv')).status).toBe(422);
    const tooManyRows = Array.from({ length: 1001 }, (_, i) => `r${i}`).join('\n');
    expect((await upload('long.csv', tooManyRows, 'text/csv')).status).toBe(422);
  });

  it('imports .html and strips scripts, event handlers and javascript: links', async () => {
    const html = '<h1>Title</h1><p onclick="x()">Hi <b>there</b> <a href="javascript:alert(1)">bad</a> <a href="https://ok.example">ok</a></p><script>alert(1)</script><style>p{}</style>';
    const res = await upload('page.html', html, 'text/html');
    expect(res.status).toBe(201);
    const s = textOf(res.body.data.content);
    expect(s).toContain('Title');
    expect(s).toContain('https://ok.example');
    expect(s).not.toMatch(/script|onclick|javascript:|alert\(1\)/i);
  });

  it('still rejects unsupported types', async () => {
    expect((await upload('doc.pdf', '%PDF-1.4', 'application/pdf')).status).toBe(415);
    expect((await upload('old.xls', 'x', 'application/vnd.ms-excel')).status).toBe(415);
  });
});

describe('trailing empty blocks', () => {
  it('are trimmed from html imports', async () => {
    const res = await upload('t.html', '<p>Body</p><p></p><p>&nbsp;</p><p><br></p>', 'text/html');
    expect(res.status).toBe(201);
    const blocks = res.body.data.content.content;
    const last = blocks[blocks.length - 1];
    expect(last.type === 'paragraph' && !last.content).toBe(false);
  });
});
