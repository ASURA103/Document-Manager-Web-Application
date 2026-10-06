import { z } from 'zod';
import { TITLE_MAX } from '../models/Document.js';
import { PERMISSIONS } from '../models/DocumentShare.js';
import { COMMENT_MAX } from '../models/Comment.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.');

const title = z.string().trim().min(1, 'Title is required.').max(TITLE_MAX);

const tiptapDoc = z
  .object({ type: z.literal('doc'), content: z.array(z.record(z.string(), z.unknown())).optional() })
  .passthrough();

export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export const createDocumentSchema = z.object({ title: title.optional() });

export const updateDocumentSchema = z
  .object({ title: title.optional(), content: tiptapDoc.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, 'Nothing to update.');

export const shareDocumentSchema = z.object({
  email: z.email().max(254),
  permission: z.enum(PERMISSIONS),
});

export const idParams = z.object({ id: objectId });
export const addCommentSchema = z.object({ body: z.string().trim().min(1, 'Write a comment first.').max(COMMENT_MAX, `Comments are limited to ${COMMENT_MAX} characters.`) });
export const updateCommentSchema = z.object({ resolved: z.boolean() });
export const commentParams = z.object({ id: objectId, commentId: objectId });
export const versionParams = z.object({ id: objectId, versionId: objectId });
export const shareParams = z.object({ id: objectId, userId: objectId });
