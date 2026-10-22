"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, type TibyUser, ROLE_PATHS } from "@/lib/auth-client";
import MascotAnimation from "@/components/mascot-animation";


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

export default function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillUsername = searchParams.get("prefill") || "";

  const [username, setUsername] = useState(prefillUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center bg-tiby-white px-5 py-6">
      <div className="w-full max-w-85">
        {/* Header & Mascot */}
        <div className="flex flex-col items-center text-center">
          <MascotAnimation size={95} className="mb-2" />
          <h1 className="font-heading text-2xl font-600 text-tiby-ink tracking-tight">
            Masuk ke Tiby
          </h1>
          <p className="mt-1 text-xs text-tiby-muted font-body">
            Senang melihatmu kembali! Yuk pantau rutinitas sehatmu
          </p>
        </div>

        {/* Frameless Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Username
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <AtIcon />
              </div>
              <input
                id="username"
                type="text"
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-4 py-2.5 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-tiby-ink font-body pl-1"
            >
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tiby-muted">
                <LockIcon />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full rounded-2xl border border-tiby-teal-100 bg-white pl-10 pr-11 py-2.5 font-body text-sm text-tiby-ink placeholder:text-tiby-muted/50 shadow-[0_2px_8px_rgba(27,158,155,0.04)] transition-all duration-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
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

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text font-body">
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

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-tiby-teal-600 py-3 text-sm font-medium text-white shadow-[0_4px_14px_rgba(27,158,155,0.25)] transition-all duration-200 hover:bg-tiby-teal-700 hover:shadow-[0_6px_20px_rgba(27,158,155,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="pt-2 text-center text-xs text-tiby-muted font-body">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-medium text-tiby-teal-700 hover:text-tiby-teal-600 transition-colors"
            >
              Daftar sekarang
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


