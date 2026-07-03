import { useState } from "react";
import { signupUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const res = await signupUser({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      login(res.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-[380px] bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <h1 className="text-2xl font-semibold mb-1">Create account</h1>

        <p className="text-sm text-zinc-400 mb-6">
          Start managing your documents
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-2 rounded mb-3 text-sm">
            {error}
          </div>
        )}

        <input
          name="name"
          placeholder="Full name"
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="w-full mb-4 p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p className="text-xs text-zinc-400 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
