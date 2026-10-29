"use client";

import { useState, useEffect } from "react";
import { errorMessage } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Mascot from "@/components/mascot";
import { ArrowLeft } from "lucide-react";
import { roleHome } from "@/lib/roles";
import {
  signIn,
  type TibyUser,
  useSession,
} from "@/lib/auth-client";

function AtIcon({ className = "w-5 h-5" }: { className?: string }) {
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

function LockIcon({ className = "w-5 h-5" }: { className?: string }) {
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

function EyeIcon({ className = "w-5 h-5" }: { className?: string }) {
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

function EyeOffIcon({ className = "w-5 h-5" }: { className?: string }) {
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillIdentifier = searchParams.get("prefill") || "";
  const { data: session, isPending } = useSession();

  const [identifier, setIdentifier] = useState(prefillIdentifier);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user as TibyUser;
      const role = (user.role || "PASIEN").toUpperCase();
      router.replace(roleHome(role));
    }
  }, [session, isPending, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const value = identifier.trim();
    if (!value) {
      setError("Masukkan username atau email.");
      return;
    }

    setLoading(true);

    try {
      const isEmail = EMAIL_PATTERN.test(value);
      const result = isEmail
        ? await signIn.email({
            email: value.toLowerCase(),
            password,
            rememberMe: true,
          })
        : await signIn.username({
            username: value,
            password,
            rememberMe: true,
          });

      if (result.error) {
        throw new Error("Username/email atau password salah");
      }

      const user = result.data?.user as TibyUser | undefined;
      const role = (user?.role || "PASIEN").toUpperCase();
      router.push(roleHome(role));
    } catch (err: unknown) {
      const message = errorMessage(err, "Username/email atau password salah");
      setError(message);
      notify.error("Login Gagal", message);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-tiby-teal-100 border-t-tiby-teal-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-tiby-muted">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-tiby-ink shadow-sm border border-gray-200 transition-all hover:bg-gray-50 hover:shadow-md"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>

      <div className="flex w-full max-w-5xl flex-col md:flex-row overflow-hidden rounded-3xl bg-white shadow-2xl shadow-gray-200/50 border border-gray-100 min-h-150">
        <div className="relative hidden w-full md:flex md:w-1/2 flex-col justify-between p-10 sm:p-12 text-white overflow-hidden bg-tiby-teal-900">
          <Image
            src="/bg-login.png"
            alt="Tiby Login Background"
            fill
            className="object-cover z-0"
            preload
            loading="eager"
          />

          <div className="absolute inset-0 bg-linear-to-t from-tiby-teal-900/90 via-tiby-teal-900/40 to-transparent z-10" />

          <div className="relative z-20">
            <h1 className="font-heading text-4xl font-bold mb-4 tracking-tight">
              Login
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-xs font-medium">
              Silakan masuk untuk melanjutkan pendampingan dan pemantauan
              rutinitas sehatmu.
            </p>
          </div>

          <div className="relative z-20 flex items-center gap-3.5 border-l-4 border-white/30 pl-4">
            <div className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
              <Mascot
                emotion="happy"
                size={40}
                altText="Pandu"
              />
            </div>
            <div>
              <p className="font-heading font-bold text-lg leading-tight tracking-wide text-white">
                Tiby Health
              </p>
              <p className="text-[10px] text-white/80 uppercase tracking-widest font-semibold mt-0.5">
                Pendamping Cerdas
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full md:w-1/2 flex-col p-8 sm:p-12 relative bg-white">
          <div className="absolute top-8 right-8 hidden sm:block sm:top-10 sm:right-10">
            <Image
              src="/logo/logo.png"
              alt="Tiby Logo"
              width={1024}
              height={448}
              sizes="120px"
              className="h-auto w-[120px] object-contain"
              preload
              loading="eager"
            />
          </div>

          {/* Container Form */}
          <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto space-y-6 mt-12 md:mt-0">
            <div className="text-center md:text-left space-y-2">
              <h2 className="font-heading text-2xl font-bold text-tiby-ink tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-sm text-tiby-muted">
                Masukkan kredensial akun Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold text-tiby-ink mb-2"
                >
                  Username atau Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-tiby-muted">
                    <AtIcon />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:border-tiby-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-tiby-ink mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-tiby-muted">
                    <LockIcon />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 py-3.5 text-sm text-tiby-ink placeholder:text-gray-400 transition-all focus:border-tiby-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-tiby-teal-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600 font-medium">
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

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-gray-300 text-tiby-teal-600 focus:ring-tiby-teal-600"
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs text-tiby-muted cursor-pointer"
                  >
                    Ingat saya
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-tiby-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-tiby-teal-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-tiby-teal-700 hover:shadow-xl disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none cursor-pointer flex justify-center items-center"
                >
                  {loading ? "Memproses..." : "Login"}
                </button>
              </div>

              <div className="pt-4 text-center text-xs text-tiby-muted font-body leading-relaxed">
                Akun Tiby dibuat oleh Tenaga Kesehatan (Nakes) di Faskes Anda.
                Hubungi Faskes untuk mendapatkan akses.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
