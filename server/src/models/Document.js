import mongoose from 'mongoose';

export const TITLE_MAX = 120;

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: TITLE_MAX },
    // Tiptap/ProseMirror JSON; shape is validated at the API boundary.
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Last person to change the content; recorded as the author of the next history snapshot.
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, minimize: false },
);

export const Document = mongoose.model('Document', documentSchema);
