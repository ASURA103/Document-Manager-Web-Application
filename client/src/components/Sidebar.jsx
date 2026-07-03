import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 p-4">
      
      <h1 className="text-xl font-bold mb-6">
        DocManager
      </h1>

      <button
        onClick={() => navigate("/dashboard")}
        className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800"
      >
        📄 Dashboard
      </button>

    </div>
  );
}