import mongoose from 'mongoose';

export const COMMENT_MAX = 2000;

// Document-level comment (not anchored to a text range).
const commentSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: COMMENT_MAX },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commentSchema.index({ document: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
