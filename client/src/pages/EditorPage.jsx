import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Layout from "../components/Layout";

import {
  createDocument,
  updateDocument,
  getDocumentById,
} from "../services/documentService";

import {
  exportTXT,
  exportPDF,
  exportMD,
  exportDOCX,
} from "../utils/exportDocument";

export default function EditorPage() {
  const navigate = useNavigate();
const { id } = useParams();

const isNew = !id || id === "new";

  const editorRef = useRef(null);
  const changeFontSize = (size) => {
    document.execCommand("fontSize", false, size);
  };

  const [title, setTitle] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===========================
  // LOAD DOCUMENT
  // ===========================

  useEffect(() => {
    if (isNew) {
      setTitle("");

      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }

      return;
    }

    const loadDocument = async () => {
      try {
        setLoading(true);

        const res = await getDocumentById(id);

        const doc = res.data.document || res.data;

        setTitle(doc.title || "");

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = doc.content || "";
            editorRef.current.focus();
          }
        }, 50);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  // ===========================
  // FORMAT FUNCTIONS
  // ===========================

  const format = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const heading1 = () => {
    document.execCommand("formatBlock", false, "<h1>");
  };

  const heading2 = () => {
    document.execCommand("formatBlock", false, "<h2>");
  };

  const paragraph = () => {
    document.execCommand("formatBlock", false, "<p>");
  };

  const bulletList = () => {
    document.execCommand("insertUnorderedList");
  };

  const numberList = () => {
    document.execCommand("insertOrderedList");
  };

  // ===========================
  // SAVE DOCUMENT
  // ===========================

  const handleSave = async () => {
    const content = editorRef.current.innerHTML;

    if (!title.trim()) {
      alert("Please enter document title");
      return;
    }

    try {
      if (isNew) {
        await createDocument({
          title,
          content,
        });
      } else {
        await updateDocument(id, {
          title,
          content,
        });
      }

      alert("Document Saved Successfully");
      setTimeout(() => {
    navigate("/dashboard");
}, 500);
    } catch (err) {
      console.log(err);
      alert("Unable to save document.");
    }
  };

  // ===========================
  // EXPORT
  // ===========================

  const plainText = () => {
    return editorRef.current.innerText;
  };

  const downloadTXT = () => {
    exportTXT(title, plainText());
    setDownloadOpen(false);
  };

  const downloadMD = () => {
    exportMD(title, plainText());
    setDownloadOpen(false);
  };

  const downloadPDF = () => {
    exportPDF(title, plainText());
    setDownloadOpen(false);
  };

  const downloadDOCX = async () => {
    await exportDOCX(title, plainText());
    setDownloadOpen(false);
  };
  useEffect(() => {
    const close = () => setDownloadOpen(false);

    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, []);
  return (
    <Layout>
      <div className="flex flex-col h-full bg-zinc-950 text-white">
        {/* ================= HEADER ================= */}

        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">
              {isNew ? "Create Document" : "Edit Document"}
            </h2>

            <p className="text-sm text-zinc-400">
              {isNew
                ? "Create a rich text document"
                : "Edit your saved document"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
            >
              Back
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDownloadOpen(!downloadOpen);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
              >
                Download
              </button>

              {downloadOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl z-50">
                  <button
                    onClick={downloadTXT}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-800"
                  >
                    .txt
                  </button>

                  <button
                    onClick={downloadMD}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-800"
                  >
                    .md
                  </button>

                  <button
                    onClick={downloadPDF}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-800"
                  >
                    .pdf
                  </button>

                  <button
                    onClick={downloadDOCX}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-800"
                  >
                    .docx
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </div>

        {/* ================= TITLE ================= */}

        <div className="px-6 pt-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Name"
            className="w-full bg-transparent border-b border-zinc-700 pb-3 text-3xl font-bold outline-none"
          />
        </div>

        {/* ================= TOOLBAR ================= */}

        <div className="flex flex-wrap gap-2 px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <select
            onChange={(e) => changeFontSize(e.target.value)}
            className="bg-zinc-800 px-2 rounded"
            defaultValue=""
          >
            <option value="" disabled>
              Size
            </option>
            <option value="2">12</option>
            <option value="3">16</option>
            <option value="4">18</option>
            <option value="5">24</option>
            <option value="6">32</option>
          </select>
          <button
            onClick={() => format("bold")}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            <strong>B</strong>
          </button>

          <button
            onClick={() => format("italic")}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 italic"
          >
            I
          </button>

          <button
            onClick={() => format("underline")}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 underline"
          >
            U
          </button>

          <button
            onClick={heading1}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            H1
          </button>

          <button
            onClick={heading2}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            H2
          </button>

          <button
            onClick={paragraph}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            P
          </button>

          <button
            onClick={bulletList}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            • List
          </button>

          <button
            onClick={numberList}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            1. List
          </button>
          <button
            onClick={() => format("justifyLeft")}
            className="px-3 py-2 rounded bg-zinc-800"
          >
            Left
          </button>

          <button
            onClick={() => format("justifyCenter")}
            className="px-3 py-2 rounded bg-zinc-800"
          >
            Center
          </button>

          <button
            onClick={() => format("justifyRight")}
            className="px-3 py-2 rounded bg-zinc-800"
          >
            Right
          </button>
          <button
            onClick={() => format("undo")}
            className="px-3 py-2 rounded bg-zinc-800"
          >
            Undo
          </button>

          <button
            onClick={() => format("redo")}
            className="px-3 py-2 rounded bg-zinc-800"
          >
            Redo
          </button>
        </div>
        {/* ================= DOCUMENT PAGE ================= */}

        <div className="flex-1 overflow-auto bg-zinc-800 py-10">
          {loading ? (
            <div className="flex justify-center mt-20">
              <h2 className="text-lg">Loading document...</h2>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="
                  bg-white
                  text-black
                  w-[794px]
                  min-h-[1100px]
                  shadow-2xl
                  rounded-md
                  p-12
                "
              >
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={true}
                  className="
                    outline-none
                    min-h-[950px]
                    text-[17px]
                    leading-8
                    prose
                    max-w-none
                  "
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
