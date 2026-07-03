import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950">
      <p className="text-sm text-zinc-400">
        Welcome, <span className="text-white">{user?.name}</span>
      </p>

      <button
        onClick={logout}
        className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded-md text-sm"
      >
        Logout
      </button>
    </div>
  );
}