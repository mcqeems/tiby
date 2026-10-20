"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, type TibyUser, ROLE_PATHS } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn.username({
        username,
        password,
        rememberMe: true,
      });

      if (result.error) {
        throw new Error(result.error.message || "Username atau password salah");
      }

      const user = result.data?.user as TibyUser | undefined;
      const role = (user?.role || "PASIEN").toUpperCase();
      router.push(ROLE_PATHS[role] ?? "/pasien");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal login";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-tiby-white px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-600 text-tiby-ink">Masuk ke Tiby</h1>
          <p className="mt-1 text-sm text-tiby-muted font-body">Login dengan username &amp; password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-tiby-ink font-body">
              Username
            </label>
            <input
              id="username"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-tiby-ink font-body">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm font-body" style={{ color: "#9B1C1C" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-tiby-teal-600 px-6 py-3 text-white font-medium font-body transition hover:bg-tiby-teal-700 disabled:opacity-50"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
          <p className="text-center text-sm text-tiby-muted font-body">
            Belum punya akun?{" "}
            <a href="/register" className="text-tiby-teal-700">
              Daftar
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
