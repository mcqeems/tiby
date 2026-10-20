"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, signIn, type TibyUser, ROLE_PATHS } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password tidak sama");
      setLoading(false);
      return;
    }

    try {
      // Gunakan email dummy jika tidak diisi, username dikirim sebagai field tambahan
      // yang di-hook oleh plugin username di server
      const email = form.email || `${form.username}@tiby.local`;

      const signUpResult = await authClient.signUp.email({
        email,
        password: form.password,
        name: form.name || form.username,
        // Field ini di-pick oleh plugin username di server saat sign-up
        username: form.username,
      });

      if (signUpResult.error) {
        throw new Error(signUpResult.error.message || "Gagal mendaftar");
      }

      // Login langsung setelah register berhasil
      const signInResult = await signIn.username({
        username: form.username,
        password: form.password,
        rememberMe: true,
      });

      if (signInResult.error) {
        // Register berhasil tapi login gagal — arahkan ke login
        router.push("/login");
        return;
      }

      const user = signInResult.data?.user as TibyUser | undefined;
      const role = (user?.role || "PASIEN").toUpperCase();
      router.push(ROLE_PATHS[role] ?? "/pasien");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mendaftar";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-tiby-white px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-600 text-tiby-ink">Daftar Akun Tiby</h1>
          <p className="mt-1 text-sm text-tiby-muted font-body">Buat akun baru</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-tiby-ink font-body">Username</label>
            <input
              name="username"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              minLength={3}
              maxLength={30}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-tiby-ink font-body">Nama Lengkap</label>
            <input
              name="name"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-tiby-ink font-body">Email (opsional)</label>
            <input
              type="email"
              name="email"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-tiby-ink font-body">Password</label>
            <input
              type="password"
              name="password"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-tiby-ink font-body">Konfirmasi Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="mt-1 w-full rounded-xl border border-tiby-teal-100 px-4 py-2 font-body text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
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
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
          <p className="text-center text-sm text-tiby-muted font-body">
            Sudah punya akun?{" "}
            <a href="/login" className="text-tiby-teal-700">
              Masuk
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
