import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-zinc-400 mt-2">Page not found</p>

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-4 bg-blue-600 px-4 py-2 rounded"
      >
        Go Home
      </button>
    </div>
  );
}