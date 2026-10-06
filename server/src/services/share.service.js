import { DocumentShare } from '../models/DocumentShare.js';
import { User } from '../models/User.js';
import { authorizeDocument } from './access.service.js';
import { AppError, notFound } from '../utils/AppError.js';

const serializeShare = (s) => ({
  user: { id: s.user.id, name: s.user.name, email: s.user.email },
  permission: s.permission,
  createdAt: s.createdAt,
});

export async function listShares(user, documentId) {
  const { doc } = await authorizeDocument(documentId, user, 'manage');
  await doc.populate('owner', 'name email');
  const shares = await DocumentShare.find({ document: doc._id }).populate('user', 'name email');
  return {
    owner: { id: doc.owner.id, name: doc.owner.name, email: doc.owner.email },
    shares: shares.map(serializeShare),
  };
}

export async function addShare(user, documentId, { email, permission }) {
  const { doc } = await authorizeDocument(documentId, user, 'manage');
  const target = await User.findOne({ email });
  if (!target) throw notFound('USER_NOT_FOUND', 'No user with that email.');
  if (target._id.equals(doc.owner)) {
    throw new AppError(400, 'CANNOT_SHARE_WITH_OWNER', 'The owner already has full access.');
  }
  try {
    const share = await DocumentShare.create({ document: doc._id, user: target._id, permission });
    await share.populate('user', 'name email');
    return serializeShare(share);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'ALREADY_SHARED', 'Document is already shared with that user.');
    }
    throw err;
  }
}

export async function removeShare(user, documentId, targetUserId) {
  const { doc } = await authorizeDocument(documentId, user, 'manage');
  const result = await DocumentShare.deleteOne({ document: doc._id, user: targetUserId });
  if (result.deletedCount === 0) throw notFound('SHARE_NOT_FOUND', 'Share not found.');
}
