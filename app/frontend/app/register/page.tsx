"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, signIn, type TibyUser, ROLE_PATHS } from "@/lib/auth-client";
import MascotAnimation from "@/components/mascot-animation";

function UserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function AtIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
      />
    </svg>
  );
}

function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setError("Konfirmasi password tidak sesuai");
      setLoading(false);
      return;
    }

    try {
      const email = form.email;

      const signUpResult = await authClient.signUp.email({
        email,
        password: form.password,
        name: form.name || form.username,
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
    <div className="flex min-h-screen items-center justify-center bg-tiby-white px-5 py-6">
      <div className="w-full max-w-[340px]">
        {/* Header & Mascot */}
        <div className="flex flex-col items-center text-center">
          <MascotAnimation size={85} className="mb-1" />
          <h1 className="font-heading text-2xl font-600 text-tiby-ink tracking-tight">
            Daftar Akun Tiby
          </h1>
          <p className="mt-0.5 text-xs text-tiby-muted font-body">
            Yuk gabung bersama Pandu untuk hidup lebih sehat
          </p>
        </div>

        {/* Frameless Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Username
            </label>
            <div className="relative mt-0.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <AtIcon />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-4 py-2 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={form.username}
                onChange={handleChange}
                placeholder="username unik"
                autoComplete="username"
                minLength={3}
                maxLength={30}
                required
              />
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Nama Lengkap
            </label>
            <div className="relative mt-0.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <UserIcon />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-4 py-2 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={form.name}
                onChange={handleChange}
                placeholder="nama lengkap Anda"
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Email
            </label>
            <div className="relative mt-0.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <MailIcon />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-4 py-2 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={form.email}
                onChange={handleChange}
                placeholder="email@contoh.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Password
            </label>
            <div className="relative mt-0.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <LockIcon />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-11 py-2 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={form.password}
                onChange={handleChange}
                placeholder="minimal 8 karakter"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-tiby-muted hover:text-tiby-teal-700 transition-colors focus:outline-none focus:text-tiby-teal-700 cursor-pointer"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Konfirmasi Password
            </label>
            <div className="relative mt-0.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <LockIcon />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-11 py-2 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="ulangi password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-tiby-muted hover:text-tiby-teal-700 transition-colors focus:outline-none focus:text-tiby-teal-700 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-tiby-danger p-2.5 text-xs text-tiby-danger-text font-body">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-tiby-teal-600 py-3 text-sm font-medium text-white shadow-[0_4px_14px_rgba(27,158,155,0.25)] transition-all duration-200 hover:bg-tiby-teal-700 hover:shadow-[0_6px_20px_rgba(27,158,155,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? "Mendaftarkan..." : "Daftar"}
          </button>

          {/* Bottom Link */}
          <div className="pt-1.5 text-center text-xs text-tiby-muted font-body">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-medium text-tiby-teal-700 hover:text-tiby-teal-600 transition-colors"
            >
              Masuk
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
