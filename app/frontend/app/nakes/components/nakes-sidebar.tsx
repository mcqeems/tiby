"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleSignOut } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";

interface NakesSidebarProps {
  user?: TibyUser;
  roleTitle?: string;
}

export default function NakesSidebar({
  user,
  roleTitle = "Tenaga Kesehatan",
}: NakesSidebarProps) {
  const pathname = usePathname();

  const isPatientsActive = pathname === "/nakes";
  const isOnboardingActive = pathname === "/nakes/onboarding";

  return (
    <>
      {/* DESKTOP SIDEBAR (250px) */}
      <aside
        aria-label="Sidebar Navigasi Nakes"
        className="hidden md:flex w-[250px] shrink-0 flex-col justify-between border-r border-tiby-teal-100 bg-white p-6 shadow-xs sticky top-0 h-screen"
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tiby-teal-600 text-white font-heading font-600 text-lg shadow-sm">
              T
            </span>
            <div>
              <span className="font-heading text-lg font-600 text-tiby-ink tracking-tight block leading-tight">
                Tiby Nakes
              </span>
              <span className="text-[10px] text-tiby-muted uppercase tracking-wider font-semibold">
                Dashboard Klinis
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav aria-label="Menu Utama Nakes" className="space-y-1.5">
            <Link
              href="/nakes"
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                isPatientsActive
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <span>Daftar Pasien</span>
            </Link>

            <Link
              href="/nakes/onboarding"
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                isOnboardingActive
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span>Onboarding Pasien</span>
            </Link>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-tiby-teal-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700 font-bold text-xs">
              {user?.name?.[0] || user?.username?.[0] || "N"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-tiby-ink truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-[11px] text-tiby-muted truncate">
                {roleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSignOut()}
            className="w-full rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM BAR */}
      <nav
        aria-label="Navigasi Mobile Nakes"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-tiby-teal-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] px-6 py-2.5 flex justify-around"
      >
        <Link
          href="/nakes"
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
            isPatientsActive ? "text-tiby-teal-700" : "text-tiby-muted"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <span className="text-[10px]">Pasien</span>
        </Link>

        <Link
          href="/nakes/onboarding"
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
            isOnboardingActive ? "text-tiby-teal-700" : "text-tiby-muted"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          <span className="text-[10px]">Onboarding</span>
        </Link>

        <button
          onClick={() => handleSignOut()}
          className="flex flex-col items-center gap-1 text-xs font-semibold text-red-600 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
          <span className="text-[10px]">Keluar</span>
        </button>
      </nav>
    </>
  );
}
