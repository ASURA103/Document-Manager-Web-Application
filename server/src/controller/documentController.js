import fs from "fs";
import path from "path";
import User from "../models/User.js";
import Document from "../models/Document.js";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

const parsePdf = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err) => {
      reject(err.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = pdfData.Pages.map((page) =>
        page.Texts.map((t) =>
          decodeURIComponent(t.R[0].T)
        ).join(" ")
      ).join("\n");

      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
};
/*
=========================================================
IMPORT DOCUMENT (.txt / .md)
POST /api/documents/import
Private
=========================================================
*/

export const importDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const ext = req.file.originalname
      .toLowerCase()
      .split(".")
      .pop();

    let content = "";
    let title = req.file.originalname.replace(/\.[^/.]+$/, "");

    // =========================
    // TXT / MD
    // =========================
    if (ext === "txt" || ext === "md") {
      content = req.file.buffer.toString("utf8");
    }

    // =========================
    // PDF
    // =========================
  else if (ext === "pdf") {
  content = await parsePdf(req.file.buffer);
}

    // =========================
    // DOCX / DOC
    // =========================
    else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer,
      });

      content = result.value || "";
    }

    // =========================
    // CREATE DOCUMENT
    // =========================
    const document = await Document.create({
      title,
      content,
      owner: req.user._id,
      importedFile: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Document imported successfully",
      document,
    });
  } catch (error) {
    console.error("IMPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import document",
    });
  }
};
/*
=========================================================
DOWNLOAD DOCUMENT
GET /api/documents/:id/download
Private
=========================================================
*/

export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "txt" } = req.query;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const isOwner = document.owner.toString() === req.user._id.toString();

    const isShared = document.sharedWith.some(
      (userId) => userId.toString() === req.user._id.toString(),
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const tempFolder = path.join(process.cwd(), "temp");

    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder);
    }

    let extension = ".txt";

    switch (type) {
      case "md":
        extension = ".md";
        break;

      case "txt":
      default:
        extension = ".txt";
    }

    const fileName = `${document.title}${extension}`;

    const filePath = path.join(tempFolder, fileName);

    fs.writeFileSync(filePath, document.content || "");

    res.download(filePath, fileName, () => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Download failed.",
    });
  }
};

/*
=========================================================
CREATE DOCUMENT
POST /api/documents
Private
=========================================================
*/

export const createDocument = async (req, res) => {
  try {
    const { title, content } = req.body;

    const document = await Document.create({
      title: title?.trim() || "Untitled Document",

      content: content || "",

      owner: req.user._id,
    });

    res.status(201).json({
      success: true,

      message: "Document created successfully.",

      document,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to create document.",
    });
  }
};

/*
=========================================================
GET ALL DOCUMENTS
GET /api/documents
Private
=========================================================
*/

export const getDocuments = async (req, res) => {
  try {
    const ownedDocuments = await Document.find({
      owner: req.user._id,
    })
      .populate("owner", "name email")
      .sort({ updatedAt: -1 });

    const sharedDocuments = await Document.find({
      sharedWith: req.user._id,
    })
      .populate("owner", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,

      ownedDocuments,

      sharedDocuments,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch documents.",
    });
  }
};
/*
=========================================================
GET SINGLE DOCUMENT
GET /api/documents/:id
Private
=========================================================
*/

export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const isOwner = document.owner._id.toString() === req.user._id.toString();

    const isShared = document.sharedWith.some(
      (user) => user._id.toString() === req.user._id.toString(),
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this document.",
      });
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Get Document Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch document.",
    });
  }
};

/*
=========================================================
UPDATE DOCUMENT
PUT /api/documents/:id
Private (Owner Only)
=========================================================
*/

export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can edit this document.",
      });
    }

    if (title !== undefined) {
      document.title = title.trim() || "Untitled Document";
    }

    if (content !== undefined) {
      // IMPORTANT:
      // Store HTML so formatting (bold, italic, headings, lists)
      // is preserved when reopening the document.
      document.content = content;
    }

    await document.save();

    res.status(200).json({
      success: true,
      message: "Document updated successfully.",
      document,
    });
  } catch (error) {
    console.error("Update Document Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update document.",
    });
  }
};
/*
=========================================================
DELETE DOCUMENT
DELETE /api/documents/:id
Private (Owner Only)
=========================================================
*/

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can delete this document.",
      });
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Document Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete document.",
    });
  }
};

/*
=========================================================
SHARE DOCUMENT
POST /api/documents/:id/share
Private (Owner Only)
=========================================================
*/

export const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can share this document.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You already own this document.",
      });
    }

    const alreadyShared = document.sharedWith.some(
      (sharedUser) => sharedUser.toString() === user._id.toString(),
    );

    if (alreadyShared) {
      return res.status(400).json({
        success: false,
        message: "Document is already shared with this user.",
      });
    }

    document.sharedWith.push(user._id);

    await document.save();

    await document.populate("sharedWith", "name email");

    res.status(200).json({
      success: true,
      message: "Document shared successfully.",
      document,
    });
  } catch (error) {
    console.error("Share Document Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to share document.",
    });
  }
};

