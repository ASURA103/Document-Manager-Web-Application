import { Document } from '../models/Document.js';
import { DocumentShare } from '../models/DocumentShare.js';
import { emptyDoc } from '../utils/tiptap.js';
import { authorizeDocument } from './access.service.js';
import { AppError } from '../utils/AppError.js';
import { deleteVersionsFor, snapshotBeforeOverwrite } from './version.service.js';

const summary = (doc, role) => ({
  id: doc.id,
  title: doc.title,
  owner: doc.owner && doc.owner.name ? { id: doc.owner.id, name: doc.owner.name, email: doc.owner.email } : doc.owner,
  role,
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
});

export const serializeDocument = (doc, role) => ({ ...summary(doc, role), content: doc.content });

export async function createDocument(user, { title, content } = {}) {
  const doc = await Document.create({
    title: title || 'Untitled Document',
    content: content || emptyDoc(),
    owner: user._id,
  });
  return serializeDocument(doc, 'owner');
}

// Two queries total (no N+1): owned docs, and shares with populated document + owner. Content is excluded.
export async function listDocuments(user) {
  const [owned, shares] = await Promise.all([
    Document.find({ owner: user._id }).select('-content').populate('owner', 'name email').sort({ updatedAt: -1 }),
    DocumentShare.find({ user: user._id }).populate({
      path: 'document',
      select: '-content',
      populate: { path: 'owner', select: 'name email' },
    }),
  ]);
  const shared = shares
    .filter((s) => s.document)
    .map((s) => summary(s.document, s.permission))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { owned: owned.map((d) => summary(d, 'owner')), shared };
}

export async function getDocument(user, id) {
  const { doc, role } = await authorizeDocument(id, user, 'read');
  await doc.populate('owner', 'name email');
  return serializeDocument(doc, role);
}

export async function updateDocument(user, id, { title, content }) {
  // Renaming is owner-only; content edits need write access.
  const { doc, role } = await authorizeDocument(id, user, title !== undefined ? 'manage' : 'write');
  if (title !== undefined && content !== undefined && role !== 'owner') {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  }
  if (title !== undefined) doc.title = title;
  if (content !== undefined && JSON.stringify(content) !== JSON.stringify(doc.content)) {
    await snapshotBeforeOverwrite(doc); // history: keep the previous content (rate-limited, capped)
    doc.content = content;
    doc.lastModifiedBy = user._id;
  }
  await doc.save();
  await doc.populate('owner', 'name email');
  return serializeDocument(doc, role);
}

export async function deleteDocument(user, id) {
  const { doc } = await authorizeDocument(id, user, 'manage');
  await Promise.all([doc.deleteOne(), DocumentShare.deleteMany({ document: doc._id }), deleteVersionsFor(doc._id)]);
}
