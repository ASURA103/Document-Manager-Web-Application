import { Comment } from '../models/Comment.js';
import { authorizeDocument } from './access.service.js';
import { AppError, notFound } from '../utils/AppError.js';

// Who may do what with a given comment. Enforced here; the flags are also sent so the UI can hide buttons.
const canResolve = (role, comment, user) => role === 'owner' || role === 'editor' || comment.author.equals(user._id);
const canDelete = (role, comment, user) => role === 'owner' || comment.author.equals(user._id);

const serialize = (c, role, user) => ({
  id: c.id,
  body: c.body,
  resolved: c.resolved,
  createdAt: c.createdAt,
  author: c.author && c.author.name ? { id: c.author.id, name: c.author.name } : null,
  permissions: { resolve: canResolve(role, { author: c.author._id || c.author }, user), delete: canDelete(role, { author: c.author._id || c.author }, user) },
});

// The comment must belong to the document in the URL, so an id from another document is a 404.
async function findComment(doc, commentId) {
  const comment = await Comment.findOne({ _id: commentId, document: doc._id }).populate('author', 'name');
  if (!comment) throw notFound('COMMENT_NOT_FOUND', 'Comment not found.');
  return comment;
}

export const deleteCommentsFor = (documentId) => Comment.deleteMany({ document: documentId });

export async function listComments(user, documentId) {
  const { doc, role } = await authorizeDocument(documentId, user, 'read');
  const comments = await Comment.find({ document: doc._id }).sort({ createdAt: 1 }).populate('author', 'name');
  return comments.map((c) => serialize(c, role, user));
}

export async function addComment(user, documentId, { body }) {
  const { doc, role } = await authorizeDocument(documentId, user, 'comment');
  const comment = await Comment.create({ document: doc._id, author: user._id, body });
  await comment.populate('author', 'name');
  return serialize(comment, role, user);
}

export async function setResolved(user, documentId, commentId, { resolved }) {
  const { doc, role } = await authorizeDocument(documentId, user, 'comment');
  const comment = await findComment(doc, commentId);
  if (!canResolve(role, comment, user)) throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  comment.resolved = resolved;
  await comment.save();
  return serialize(comment, role, user);
}

export async function removeComment(user, documentId, commentId) {
  const { doc, role } = await authorizeDocument(documentId, user, 'comment');
  const comment = await findComment(doc, commentId);
  if (!canDelete(role, comment, user)) throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  await comment.deleteOne();
}
