import multer from 'multer';
import path from 'node:path';
import { AppError } from '../utils/AppError.js';

export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB

// Browsers report inconsistent MIME types (e.g. .csv as application/vnd.ms-excel on Windows, .md as
// octet-stream), so the extension is the primary check, MIME must be plausible, and file content is
// verified again during parsing (zip signature, UTF-8/binary check).
const GENERIC = ['application/octet-stream', ''];
const ALLOWED = {
  '.txt': ['text/plain', ...GENERIC],
  '.md': ['text/markdown', 'text/x-markdown', 'text/plain', ...GENERIC],
  '.markdown': ['text/markdown', 'text/x-markdown', 'text/plain', ...GENERIC],
  '.html': ['text/html', 'text/plain', ...GENERIC],
  '.htm': ['text/html', 'text/plain', ...GENERIC],
  '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', ...GENERIC],
  '.tsv': ['text/tab-separated-values', 'text/plain', ...GENERIC],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ...GENERIC],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ...GENERIC],
};

// Memory storage: the file is parsed and discarded, never written to disk or executed.
export const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED[ext] || !ALLOWED[ext].includes(file.mimetype)) {
      return cb(new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Unsupported file type. Use .txt, .md, .html, .csv, .tsv, .docx or .xlsx.'));
    }
    cb(null, true);
  },
}).single('file');
