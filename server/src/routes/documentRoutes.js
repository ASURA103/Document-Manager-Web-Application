import express from "express";

import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  importDocument,
  downloadDocument,
} from "../controller/documentController.js";

const router = express.Router();

/*
========================================
Documents
========================================
*/

// Get all documents
// Create document
router
  .route("/")
  .get(protect, getDocuments)
  .post(protect, createDocument);

/*
========================================
Import Document
========================================
*/

router.post(
  "/import",
  protect,
  upload.single("file"),
  importDocument
);

/*
========================================
Download Document
========================================
*/

router.get(
  "/:id/download",
  protect,
  downloadDocument
);

/*
========================================
Share Document
========================================
*/

router.post(
  "/:id/share",
  protect,
  shareDocument
);

/*
========================================
Single Document
========================================
*/

router
  .route("/:id")
  .get(protect, getDocumentById)
  .put(protect, updateDocument)
  .delete(protect, deleteDocument);

export default router;