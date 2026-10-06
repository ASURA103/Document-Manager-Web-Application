import path from 'node:path';
import { marked } from 'marked';
import mammoth from 'mammoth';
import readXlsxFile from 'read-excel-file/node';
import { generateJSON } from '@tiptap/html/server';
import { tiptapExtensions } from '../utils/tiptap.js';
import { TITLE_MAX } from '../models/Document.js';
import { AppError } from '../utils/AppError.js';
import { createDocument } from './document.service.js';

// Spreadsheet limits keep a 1 MB file (which can expand a lot once parsed) from producing a huge document.
const MAX_ROWS = 1000;
const MAX_COLS = 30;
const MAX_SHEETS = 5;

const invalid = (message) => new AppError(422, 'INVALID_FILE', message);
const isZip = (buffer) => buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;

function decodeText(buffer) {
  if (buffer.includes(0)) throw invalid('File appears to be binary, not text.');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    throw invalid('File is not valid UTF-8 text.');
  }
}

// Blank lines separate paragraphs; they are not stored as empty paragraphs (paragraph spacing comes from styling).
const textToDoc = (text) => ({
  type: 'doc',
  content: text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] })),
});

const isEmptyParagraph = (node) => node.type === 'paragraph' && !(node.content && node.content.length);

// Imports (docx/html/markdown) can end with empty blocks; drop them, keeping at least one block.
function trimTrailingEmpty(doc) {
  const content = [...(doc.content || [])];
  while (content.length > 1 && isEmptyParagraph(content[content.length - 1])) content.pop();
  return { ...doc, content };
}

// generateJSON keeps only nodes/marks defined in the schema, so stray HTML (scripts, styles, iframes) is dropped.
const htmlToDoc = (html) => generateJSON(html, tiptapExtensions);

// RFC 4180-style parser: quoted fields, escaped quotes, delimiters/newlines inside quotes.
export function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Builds Tiptap table JSON directly (no HTML), so cell values can never inject markup.
function rowsToTable(rows) {
  if (rows.length > MAX_ROWS) throw invalid(`Spreadsheet has too many rows (max ${MAX_ROWS}).`);
  const width = Math.max(...rows.map((r) => r.length));
  if (width > MAX_COLS) throw invalid(`Spreadsheet has too many columns (max ${MAX_COLS}).`);
  const cell = (value, header) => {
    const text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    return {
      type: header ? 'tableHeader' : 'tableCell',
      content: [text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' }],
    };
  };
  return {
    type: 'table',
    content: rows.map((r, ri) => ({
      type: 'tableRow',
      content: Array.from({ length: width }, (_, ci) => cell(r[ci], ri === 0)),
    })),
  };
}

async function xlsxToDoc(buffer) {
  if (!isZip(buffer)) throw invalid('File is not a valid .xlsx.');
  let sheets;
  try {
    sheets = await readXlsxFile(buffer);
  } catch {
    throw invalid('Unable to read .xlsx file.');
  }
  const nonEmpty = sheets.filter((s) => s.data.some((r) => r.some((c) => c !== null && c !== '')));
  if (nonEmpty.length > MAX_SHEETS) throw invalid(`Workbook has too many sheets (max ${MAX_SHEETS}).`);
  const content = nonEmpty.flatMap((s) => [
    ...(nonEmpty.length > 1 ? [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: String(s.sheet).slice(0, 100) }] }] : []),
    rowsToTable(s.data),
    { type: 'paragraph' },
  ]);
  return { type: 'doc', content };
}

async function convert(ext, buffer) {
  switch (ext) {
    case '.txt':
      return textToDoc(decodeText(buffer));
    case '.md':
    case '.markdown':
      return htmlToDoc(await marked.parse(decodeText(buffer), { async: true }));
    case '.html':
    case '.htm':
      return htmlToDoc(decodeText(buffer));
    case '.csv':
    case '.tsv': {
      const rows = parseDelimited(decodeText(buffer), ext === '.tsv' ? '\t' : ',');
      return { type: 'doc', content: [rowsToTable(rows), { type: 'paragraph' }] };
    }
    case '.xlsx':
      return xlsxToDoc(buffer);
    case '.docx':
      if (!isZip(buffer)) throw invalid('File is not a valid .docx.');
      try {
        const { value } = await mammoth.convertToHtml({ buffer });
        return htmlToDoc(value);
      } catch {
        throw invalid('Unable to read .docx file.');
      }
    default:
      throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Unsupported file type.');
  }
}

// Title comes from the base name only; never trust the client-supplied path.
const titleFromFilename = (originalname) => {
  const base = path.basename(originalname.replace(/\\/g, '/'), path.extname(originalname));
  return base.replace(/[\u0000-\u001f]/g, '').trim().slice(0, TITLE_MAX) || 'Imported Document';
};

export async function importDocument(user, file) {
  if (!file) throw new AppError(400, 'NO_FILE', 'No file uploaded. Send a "file" field.');
  if (file.size === 0) throw invalid('File is empty.');

  const ext = path.extname(file.originalname).toLowerCase();
  const content = trimTrailingEmpty(await convert(ext, file.buffer));
  const hasText = JSON.stringify(content).includes('"text"');
  if (!content?.content?.length || !hasText) throw invalid('File has no importable content.');

  return createDocument(user, { title: titleFromFilename(file.originalname), content });
}
