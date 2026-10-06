import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler = (_req, _res, next) =>
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found.'));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let { status, code, message } = err;

  if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large.' : 'Invalid upload.';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Malformed JSON body.';
  } else if (!(err instanceof AppError)) {
    // Unknown error: log server-side, never leak internals to the client.
    console.error(err);
    status = 500; code = 'INTERNAL_ERROR'; message = 'Something went wrong.';
  }

  res.status(status).json({ success: false, error: { code, message } });
};
