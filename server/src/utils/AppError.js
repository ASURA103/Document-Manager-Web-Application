export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (code = 'NOT_FOUND', message = 'Resource not found.') =>
  new AppError(404, code, message);
