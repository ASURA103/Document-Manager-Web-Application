import { useState } from "react";
import { shareDocument } from "../services/documentService";

export default function ShareModal({ docId, onClose }) {
  const [email, setEmail] = useState("");

  const handleShare = async () => {
    if (!email) return;

    await shareDocument(docId, email);
    alert("Document shared successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-zinc-900 p-6 rounded-xl w-96 border border-zinc-800">
        <h2 className="text-lg mb-4">Share Document</h2>

        <input
          className="w-full p-2 bg-zinc-800 rounded mb-4"
          placeholder="Enter email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-700 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleShare}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}