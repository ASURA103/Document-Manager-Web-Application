import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { DocumentShare } from '../models/DocumentShare.js';
import { AppError, notFound } from '../utils/AppError.js';

// Role capabilities. Owner > editor > viewer.
const CAN = {
  read: ['owner', 'editor', 'viewer'],
  write: ['owner', 'editor'],
  manage: ['owner'], // rename, share, delete
};

/**
 * Single authorization choke point for every document operation.
 * - Unknown id, malformed id, or no access at all -> 404 (does not reveal existence).
 * - Has access but not enough permission (e.g. viewer writing) -> 403.
 */
export async function authorizeDocument(documentId, user, action) {
  if (!mongoose.isValidObjectId(documentId)) throw notFound('DOCUMENT_NOT_FOUND', 'Document not found.');

  const doc = await Document.findById(documentId);
  if (!doc) throw notFound('DOCUMENT_NOT_FOUND', 'Document not found.');

  let role = null;
  if (doc.owner.equals(user._id)) {
    role = 'owner';
  } else {
    const share = await DocumentShare.findOne({ document: doc._id, user: user._id });
    if (share) role = share.permission;
  }

  if (!role) throw notFound('DOCUMENT_NOT_FOUND', 'Document not found.');
  if (!CAN[action].includes(role)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  }
  return { doc, role };
}
