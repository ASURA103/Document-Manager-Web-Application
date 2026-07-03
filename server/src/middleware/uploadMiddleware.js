import multer from "multer";
import path from "path";

// Store in memory
const storage = multer.memoryStorage();

// Allowed extensions (PRIMARY CHECK)
const allowedExtensions = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".doc",
];

// File filter
const fileFilter = (req, file, cb) => {
  try {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    // Some browsers send generic mime types, so we do NOT strictly rely on MIME
    const isValidExtension = allowedExtensions.includes(extension);

    if (!isValidExtension) {
      return cb(
        new Error(
          "Only .txt, .md, .pdf, .docx, .doc files are supported."
        ),
        false
      );
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (important for pdf/docx)
  },
});

export default upload;