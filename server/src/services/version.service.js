import { DocumentVersion } from '../models/DocumentVersion.js';
import { authorizeDocument } from './access.service.js';
import { emptyDoc } from '../utils/tiptap.js';
import { notFound } from '../utils/AppError.js';

// A snapshot is taken when content is about to be overwritten and the newest snapshot is older than this.
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_VERSIONS = 30;

const sameContent = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const serialize = (v) => ({
  id: v.id,
  title: v.title,
  createdAt: v.createdAt,
  author: v.author && v.author.name ? { id: v.author.id, name: v.author.name } : null,
});

async function prune(documentId) {
  const extra = await DocumentVersion.find({ document: documentId }).sort({ createdAt: -1 }).skip(MAX_VERSIONS).select('_id');
  if (extra.length) await DocumentVersion.deleteMany({ _id: { $in: extra.map((v) => v._id) } });
}

/**
 * Called right before a document's content is overwritten. Snapshots the *previous* content when
 * it is meaningful (not the empty starting document) and the newest snapshot is old enough
 * (or `force` is set, as on restore so a restore can itself be undone).
 */
export async function snapshotBeforeOverwrite(doc, { force = false, now = new Date() } = {}) {
  if (!doc.content || sameContent(doc.content, emptyDoc())) return;
  if (!force) {
    const latest = await DocumentVersion.findOne({ document: doc._id }).sort({ createdAt: -1 }).select('createdAt');
    if (latest && now - latest.createdAt < SNAPSHOT_INTERVAL_MS) return;
  }
  await DocumentVersion.create({ document: doc._id, title: doc.title, content: doc.content, author: doc.lastModifiedBy || doc.owner });
  await prune(doc._id);
}

export const deleteVersionsFor = (documentId) => DocumentVersion.deleteMany({ document: documentId });

export async function listVersions(user, documentId) {
  const { doc } = await authorizeDocument(documentId, user, 'read');
  const versions = await DocumentVersion.find({ document: doc._id }).sort({ createdAt: -1 }).select('-content').populate('author', 'name');
  return versions.map(serialize);
}

// The version must belong to the document in the URL, so a version id from another document is a 404.
async function findVersion(doc, versionId) {
  const version = await DocumentVersion.findOne({ _id: versionId, document: doc._id }).populate('author', 'name');
  if (!version) throw notFound('VERSION_NOT_FOUND', 'Version not found.');
  return version;
}

export async function getVersion(user, documentId, versionId) {
  const { doc } = await authorizeDocument(documentId, user, 'read');
  const version = await findVersion(doc, versionId);
  return { ...serialize(version), content: version.content };
}

export async function restoreVersion(user, documentId, versionId) {
  const { doc } = await authorizeDocument(documentId, user, 'write');
  const version = await findVersion(doc, versionId);
  await snapshotBeforeOverwrite(doc, { force: true }); // keep what is being replaced
  doc.content = version.content;
  doc.lastModifiedBy = user._id;
  await doc.save();
  return { id: doc.id, title: doc.title, content: doc.content, updatedAt: doc.updatedAt };
}
