import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { importUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as auth from '../controllers/auth.controller.js';
import * as docs from '../controllers/document.controller.js';
import {
  loginSchema, createDocumentSchema, updateDocumentSchema, shareDocumentSchema, idParams, shareParams,
} from '../validators/schemas.js';

export function buildRouter({ jwtSecret }) {
  const router = Router();
  const authed = requireAuth(jwtSecret);

  router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

  router.post('/auth/login', validate({ body: loginSchema }), auth.login(jwtSecret));
  router.get('/auth/me', authed, auth.me);

  router.use('/documents', authed);
  router.post('/documents', validate({ body: createDocumentSchema }), docs.create);
  router.post('/documents/import', importUpload, docs.importFile);
  router.get('/documents', docs.list);
  router.get('/documents/:id', validate({ params: idParams }), docs.get);
  router.patch('/documents/:id', validate({ params: idParams, body: updateDocumentSchema }), docs.update);
  router.delete('/documents/:id', validate({ params: idParams }), docs.remove);

  router.get('/documents/:id/shares', validate({ params: idParams }), docs.listShares);
  router.post('/documents/:id/shares', validate({ params: idParams, body: shareDocumentSchema }), docs.addShare);
  router.delete('/documents/:id/shares/:userId', validate({ params: shareParams }), docs.removeShare);

  return router;
}
