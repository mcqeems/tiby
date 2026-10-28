import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Pendaftaran Akun",
  description:
    "Akun Tiby dibuat oleh Tenaga Kesehatan di Faskes Anda, bukan melalui pendaftaran mandiri.",
  robots: "noindex, nofollow",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-tiby-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-heading text-xl font-semibold text-tiby-ink">
          Akun dibuat oleh Faskes
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-tiby-muted">
          Pendaftaran mandiri tidak tersedia. Tenaga Kesehatan (Nakes) di
          Faskes Anda akan membuatkan akun pasien atau PMO, lalu memberikan
          username dan password untuk masuk.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-tiby-muted">
          Sudah punya akun? Silakan masuk dengan kredensial dari Faskes.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-tiby-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-tiby-teal-700"
        >
          Masuk ke Tiby
        </Link>
      </section>
    </main>
  );
}
