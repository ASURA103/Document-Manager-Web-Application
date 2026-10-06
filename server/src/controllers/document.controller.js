import * as documents from '../services/document.service.js';
import * as shares from '../services/share.service.js';
import * as versions from '../services/version.service.js';
import { importDocument } from '../services/import.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const create = async (req, res) => ok(res, await documents.createDocument(req.user, req.body), 201);
export const importFile = async (req, res) => ok(res, await importDocument(req.user, req.file), 201);
export const list = async (req, res) => ok(res, await documents.listDocuments(req.user));
export const get = async (req, res) => ok(res, await documents.getDocument(req.user, req.params.id));
export const update = async (req, res) =>
  ok(res, await documents.updateDocument(req.user, req.params.id, req.body));
export const remove = async (req, res) => {
  await documents.deleteDocument(req.user, req.params.id);
  ok(res, { deleted: true });
};

export const listVersions = async (req, res) => ok(res, await versions.listVersions(req.user, req.params.id));
export const getVersion = async (req, res) => ok(res, await versions.getVersion(req.user, req.params.id, req.params.versionId));
export const restoreVersion = async (req, res) => ok(res, await versions.restoreVersion(req.user, req.params.id, req.params.versionId));

export const listShares = async (req, res) => ok(res, await shares.listShares(req.user, req.params.id));
export const addShare = async (req, res) =>
  ok(res, await shares.addShare(req.user, req.params.id, req.body), 201);
export const removeShare = async (req, res) => {
  await shares.removeShare(req.user, req.params.id, req.params.userId);
  ok(res, { removed: true });
};
