import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { importUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as auth from '../controllers/auth.controller.js';
import * as docs from '../controllers/document.controller.js';
import {
  loginSchema, createDocumentSchema, updateDocumentSchema, shareDocumentSchema, idParams, shareParams, versionParams, addCommentSchema, updateCommentSchema, commentParams,
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

  router.get('/documents/:id/versions', validate({ params: idParams }), docs.listVersions);
  router.get('/documents/:id/versions/:versionId', validate({ params: versionParams }), docs.getVersion);
  router.post('/documents/:id/versions/:versionId/restore', validate({ params: versionParams }), docs.restoreVersion);

  router.get('/documents/:id/comments', validate({ params: idParams }), docs.listComments);
  router.post('/documents/:id/comments', validate({ params: idParams, body: addCommentSchema }), docs.addComment);
  router.patch('/documents/:id/comments/:commentId', validate({ params: commentParams, body: updateCommentSchema }), docs.updateComment);
  router.delete('/documents/:id/comments/:commentId', validate({ params: commentParams }), docs.removeComment);

  router.post('/documents/:id/presence', validate({ params: idParams }), docs.heartbeat);
  router.delete('/documents/:id/presence', validate({ params: idParams }), docs.leavePresence);

  router.get('/documents/:id/shares', validate({ params: idParams }), docs.listShares);
  router.post('/documents/:id/shares', validate({ params: idParams, body: shareDocumentSchema }), docs.addShare);
  router.delete('/documents/:id/shares/:userId', validate({ params: shareParams }), docs.removeShare);

  return router;
}
