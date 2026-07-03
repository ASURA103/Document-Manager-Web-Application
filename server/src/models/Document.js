import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    // File Name / Document Title
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: 150,
      default: "Untitled Document",
    },

    // Rich Text HTML Content
    content: {
      type: String,
      default: "",
      trim: true,
    },

    // Document Owner
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Shared Users
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Imported File Information
    importedFile: {
      fileName: {
        type: String,
        default: "",
      },

      fileType: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Prevent duplicate users in sharedWith
documentSchema.pre("save", async function () {
  if (this.sharedWith?.length) {
    this.sharedWith = [
      ...new Set(this.sharedWith.map((id) => id.toString())),
    ];
  }
});

const Document = mongoose.model("Document", documentSchema);

export default Document;