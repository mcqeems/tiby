"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function PageHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const roleRoot = segments[0] ? `/${segments[0]}` : "/";

  const formatLabel = (segment: string) => {
    const map: Record<string, string> = {
      admin: "Admin",
      nakes: "Tenaga Kesehatan",
      pmo: "Pengawas PMO",
      pasien: "Pasien",
      facilities: "Fasilitas Kesehatan",
      users: "Manajemen Akun",
      onboarding: "Onboarding Pasien",
      "check-in": "Check-in Harian",
      riwayat: "Riwayat Terapi",
    };
    return (
      map[segment] ||
      segment.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1.5 text-xs text-tiby-muted border-b border-gray-200 pb-4"
    >
      <Link
        href={roleRoot}
        className="flex items-center gap-1.5 hover:text-tiby-teal-700 transition font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Beranda</span>
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        // Jika di halaman beranda utama role (misal /nakes), tampilkan label role saja
        return (
          <div key={href} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            {isLast ? (
              <span className="font-semibold text-tiby-ink">
                {index === 0
                  ? `Panel ${formatLabel(segment)}`
                  : formatLabel(segment)}
              </span>
            ) : (
              <Link href={href} className="hover:text-tiby-teal-700 transition">
                {formatLabel(segment)}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
