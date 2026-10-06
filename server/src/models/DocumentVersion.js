import mongoose from 'mongoose';

// A snapshot of a document's content at an earlier point in time (for history and restore).
const versionSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    title: { type: String, required: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    // Who wrote this content (the last person to save it).
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

versionSchema.index({ document: 1, createdAt: -1 });

export const DocumentVersion = mongoose.model('DocumentVersion', versionSchema);
