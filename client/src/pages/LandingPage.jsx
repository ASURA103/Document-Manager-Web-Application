import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
      
      <h1 className="text-4xl font-bold mb-2">
        DocManager
      </h1>

      <p className="text-zinc-400 mb-6 text-center max-w-md">
        A lightweight collaborative document editor for teams.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Login
        </button>

        <button
          onClick={() => navigate("/signup")}
          className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}