import { useEffect, useState } from "react";
import {
  getDocuments,
  deleteDocument,
  shareDocument,
} from "../services/documentService";

import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [shareId, setShareId] = useState(null);
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  // ================= LOAD DOCS =================
  const loadDocs = async () => {
    try {
      const res = await getDocuments();

      setDocs([
        ...(res.data.ownedDocuments || []),
        ...(res.data.sharedDocuments || []),
      ]);
    } catch (err) {
      console.log("LOAD ERROR:", err);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // ================= CREATE =================
  const handleCreate = () => {
    navigate("/document/new");
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      loadDocs();
    } catch (err) {
      console.log(err);
    }
  };

  // ================= SHARE =================
  const handleShare = async () => {
    if (!shareId || !email) return;

    try {
      await shareDocument(shareId, email);
      setShareId(null);
      setEmail("");
    } catch (err) {
      console.log(err);
    }
  };

  // ================= UPLOAD =================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/documents/import",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.message || "File imported successfully");

      // refresh dashboard properly
      await loadDocs();

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ================= UI =================
  return (
    <Layout>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">My Documents</h2>

        <div className="flex gap-3 items-center">

          {/* UPLOAD */}
          <label className="bg-purple-600 px-4 py-2 rounded cursor-pointer">
            {uploading ? "Uploading..." : "Upload File"}
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          {/* CREATE */}
          <button
            onClick={handleCreate}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            + Create Document
          </button>

        </div>
      </div>

      {/* DOCUMENT LIST */}
      <div className="grid md:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <div
            key={doc._id}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded"
          >
            <h3 className="font-semibold mb-3">{doc.title}</h3>

            <div className="flex gap-2 flex-wrap text-sm">

              <button
                onClick={() => navigate(`/document/${doc._id}`)}
                className="bg-blue-600 px-2 py-1 rounded"
              >
                Open
              </button>

              <button
                onClick={() => navigate(`/document/${doc._id}`)}
                className="bg-yellow-600 px-2 py-1 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => setShareId(doc._id)}
                className="bg-green-600 px-2 py-1 rounded"
              >
                Share
              </button>

              <button
                onClick={() => handleDelete(doc._id)}
                className="bg-red-600 px-2 py-1 rounded"
              >
                Delete
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* SHARE MODAL */}
      {shareId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded w-96">

            <h3 className="mb-3 font-semibold">Share Document</h3>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full p-2 bg-zinc-800 rounded mb-3"
            />

            <div className="flex justify-end gap-2">

              <button
                onClick={() => setShareId(null)}
                className="px-3 py-1 bg-zinc-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleShare}
                className="px-3 py-1 bg-green-600 rounded"
              >
                Share
              </button>

            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}