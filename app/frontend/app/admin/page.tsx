import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description:
    "Pusat komando Super Admin untuk mengelola fasilitas kesehatan dan akun nakes.",
  robots: "noindex, nofollow",
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider block mb-0.5">
          Pusat Kontrol Nasional
        </span>
        <h1 className="font-heading text-2xl font-600 text-tiby-ink">
          Ringkasan Sistem Tiby
        </h1>
        <p className="mt-1 text-xs text-tiby-muted">
          Kelola master fasilitas kesehatan dan penugasan tenaga kesehatan
          secara terpusat.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs">
          <h3 className="font-heading text-sm font-600 text-tiby-ink mb-1">
            Master Fasilitas
          </h3>
          <p className="text-xs text-tiby-muted mb-4">
            Tambah, edit, atau pantau fasilitas kesehatan yang terdaftar di
            sistem.
          </p>
          <a
            href="/admin/facilities"
            className="inline-flex items-center gap-2 rounded-full bg-tiby-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tiby-teal-700 transition"
          >
            Kelola Fasilitas →
          </a>
        </div>

        <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs">
          <h3 className="font-heading text-sm font-600 text-tiby-ink mb-1">
            Manajemen Pengguna
          </h3>
          <p className="text-xs text-tiby-muted mb-4">
            Kelola akun administrator, nakes, dan atur penugasan faskes mereka.
          </p>
          <a
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-full border border-tiby-teal-100 bg-white px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition"
          >
            Kelola Akun →
          </a>
        </div>
      </div>
    </div>
  );
}
