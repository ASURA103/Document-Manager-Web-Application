import mongoose from 'mongoose';

export const PERMISSIONS = ['viewer', 'editor'];

const shareSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    permission: { type: String, enum: PERMISSIONS, required: true },
  },
  { timestamps: true },
);

shareSchema.index({ document: 1, user: 1 }, { unique: true });

export const DocumentShare = mongoose.model('DocumentShare', shareSchema);
