import type { Metadata } from "next";
import { Suspense } from "react";
import LoginView from "./components/login-view";


export const metadata: Metadata = {
  title: "Masuk ke Akun",
  description:
    "Masuk ke aplikasi Tiby untuk melanjutkan pengobatan dan pendampingan harian Anda.",
  robots: "noindex, nofollow", // Penting: Jangan biarkan halaman login di-index Google
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-tiby-muted">
          Memuat...
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}