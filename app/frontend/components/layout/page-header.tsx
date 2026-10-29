"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Home, LogOut } from "lucide-react";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { usersApi } from "@/lib/api/users";
import { readAvatar, subscribeAvatar } from "@/lib/avatar";
import { handleSignOut } from "@/app/role-guard";

export default function PageHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;

  // Same avatar source as the sidebar: published by the profile page after
  // upload, seeded below from /api/users/me (the session carries no `image`).
  const publishedAvatar = useSyncExternalStore(
    subscribeAvatar,
    readAvatar,
    () => undefined,
  );
  const [sessionAvatar, setSessionAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id || publishedAvatar !== undefined) return;
    let active = true;
    usersApi
      .getMe()
      .then((me) => {
        if (active) setSessionAvatar(me.image ?? null);
      })
      .catch(() => {
        // Keep the initial-letter fallback; header must never break the page.
      });
    return () => {
      active = false;
    };
  }, [user?.id, publishedAvatar]);

  const image =
    publishedAvatar !== undefined ? publishedAvatar : sessionAvatar;

  const segments = pathname.split("/").filter(Boolean);
  const roleRoot = segments[0] ? `/${segments[0]}` : "/";

  const role = segments[0] || "pasien";
  const profileUrl = `/${role}/profile`;
  const avatarText = user?.name?.[0] || user?.username?.[0] || "?";

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
      riwayat: "Riwayat Check-In",
    };
    return (
      map[segment] ||
      segment.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  return (
    <>
      {/* ─── TAMPILAN DESKTOP (KODE ASLI ANDA) ─── */}
      <nav
        aria-label="Breadcrumb"
        className="hidden md:flex mb-6 items-center gap-1.5 text-xs text-tiby-muted border-b border-gray-200 pb-4"
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
                <Link
                  href={href}
                  className="hover:text-tiby-teal-700 transition"
                >
                  {formatLabel(segment)}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* ─── TAMPILAN MOBILE (LOGO + PROFIL + LOGOUT) ─── */}
      <header className="flex md:hidden w-full items-center justify-between mb-6 pb-4 border-b border-gray-200">
        {/* Logo Kiri */}
        <Link href={roleRoot}>
          <Image
            src="/logo/logo.png"
            alt="Tiby Logo"
            width={1024}
            height={448}
            sizes="100px"
            preload
            loading="eager"
            className="h-auto w-[100px] object-contain"
          />
        </Link>

        {/* Profil & Logout Kanan */}
        <div className="flex items-center gap-2">
          <Link
            href={profileUrl}
            className="flex items-center gap-2 bg-tiby-teal-50 px-2.5 py-1.5 rounded-xl border border-tiby-teal-100 hover:bg-tiby-teal-100 transition"
          >
            <div className="w-6 h-6 rounded-full bg-tiby-teal-600 flex items-center justify-center overflow-hidden text-white text-[10px] font-bold">
              {image ? (
                // One-off plain img: S3 avatar host is dynamic
                // (S3_PUBLIC_BASE_URL), so next/image remotePatterns cannot cover it.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={`Foto profil ${user?.name || user?.username || ""}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarText.toUpperCase()
              )}
            </div>
            <span className="text-[11px] font-bold text-tiby-teal-800 max-w-17.5 truncate">
              {user?.name?.split(" ")[0] || "Profil"}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => handleSignOut()}
            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
    </>
  );
}
