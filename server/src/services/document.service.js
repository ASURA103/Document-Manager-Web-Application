import { Document } from '../models/Document.js';
import { User } from '../models/User.js';
import { DocumentShare } from '../models/DocumentShare.js';
import { emptyDoc } from '../utils/tiptap.js';
import { authorizeDocument } from './access.service.js';
import { AppError } from '../utils/AppError.js';
import { deleteVersionsFor, snapshotBeforeOverwrite } from './version.service.js';
import { deleteCommentsFor } from './comment.service.js';

const idOf = (d) => d.id ?? String(d._id); // works for Mongoose documents and lean objects
const personOf = (u) => ({ id: u.id ?? String(u._id), name: u.name, email: u.email });

const summary = (doc, role, owner) => ({
  id: idOf(doc),
  title: doc.title,
  owner,
  role,
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
});

export const serializeDocument = (doc, role, owner) => ({ ...summary(doc, role, owner), content: doc.content });

// The caller already knows who they are (from the token), so only a non-owner needs the owner looked up.
async function ownerOf(doc, role, user) {
  if (role === 'owner') return personOf(user);
  const owner = await User.findById(doc.owner).select('name email').lean();
  return owner ? personOf(owner) : null;
}

export async function createDocument(user, { title, content } = {}) {
  const doc = await Document.create({
    title: title || 'Untitled Document',
    content: content || emptyDoc(),
    owner: user._id,
  });
  return serializeDocument(doc, 'owner', personOf(user));
}

// One database round: owned documents and shared documents (with owner names) are fetched together.
// Content is excluded; results are plain objects.
export async function listDocuments(user) {
  const [owned, shares] = await Promise.all([
    Document.find({ owner: user._id }).select('-content').sort({ updatedAt: -1 }).lean(),
    DocumentShare.aggregate([
      { $match: { user: user._id } },
      { $lookup: { from: 'documents', localField: 'document', foreignField: '_id', as: 'doc', pipeline: [{ $project: { content: 0 } }] } },
      { $unwind: '$doc' },
      { $lookup: { from: 'users', localField: 'doc.owner', foreignField: '_id', as: 'owner', pipeline: [{ $project: { name: 1, email: 1 } }] } },
      { $unwind: '$owner' },
      { $sort: { 'doc.updatedAt': -1 } },
    ]),
  ]);
  const me = personOf(user);
  return {
    owned: owned.map((d) => summary(d, 'owner', me)),
    shared: shares.map((s) => summary(s.doc, s.permission, personOf(s.owner))),
  };
}

export async function getDocument(user, id) {
  const { doc, role } = await authorizeDocument(id, user, 'read');
  return serializeDocument(doc, role, await ownerOf(doc, role, user));
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
  return serializeDocument(doc, role, await ownerOf(doc, role, user));
}

export async function deleteDocument(user, id) {
  const { doc } = await authorizeDocument(id, user, 'manage');
  await Promise.all([doc.deleteOne(), DocumentShare.deleteMany({ document: doc._id }), deleteVersionsFor(doc._id), deleteCommentsFor(doc._id)]);
}
