import { AppError } from '../utils/AppError.js';

// validate({ body, params, query }) -> parsed values replace the originals.
export const validate = (schemas) => (req, _res, next) => {
  for (const part of ['params', 'body', 'query']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(' ');
      throw new AppError(400, 'VALIDATION_ERROR', message);
    }
    if (part === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true });
    } else {
      req[part] = result.data;
    }
  }
  next();
};
