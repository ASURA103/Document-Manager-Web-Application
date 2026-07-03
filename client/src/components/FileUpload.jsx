import { importDocument } from "../services/documentService";

export default function FileUpload({ onSuccess }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const res = await importDocument(file);
    onSuccess(res.data);
  };

  return (
    <div>
      <input
        type="file"
        accept=".txt,.md"
        onChange={handleFile}
        className="text-sm"
      />
    </div>
  );
}