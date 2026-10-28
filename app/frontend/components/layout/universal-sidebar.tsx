"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleSignOut } from "@/app/role-guard";
import type { TibyUser } from "@/lib/auth-client";
import ThemeToggle from "@/components/theme/theme-toggle";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface UniversalSidebarProps {
  user?: TibyUser;
  brandName: string;
  brandSubtitle: string;
  brandInitial: string;
  roleTitle: string;
  items: SidebarItem[];
}

const STORAGE_KEY = "tiby-sidebar-collapsed";

const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(callback: () => void) {
  collapsedListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    collapsedListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

function setCollapsedValue(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* noop */
  }
  collapsedListeners.forEach((listener) => listener());
}

function Tooltip({ text, show }: { text: string; show: boolean }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-tiby-ink px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {text}
    </span>
  );
}

function LogoutIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
      />
    </svg>
  );
}

function ChevronIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

export default function UniversalSidebar({
  user,
  brandName,
  brandSubtitle,
  brandInitial,
  roleTitle,
  items,
}: UniversalSidebarProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  const toggleCollapsed = () => setCollapsedValue(!collapsed);

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    const rootPaths = ["/pasien", "/nakes", "/pmo", "/admin", "/faskes"];
    if (rootPaths.includes(href)) return false;
    return pathname.startsWith(`${href}/`);
  };

  const labelCls = `overflow-hidden whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${
    collapsed ? "w-0 opacity-0" : "opacity-100"
  }`;

  const avatarText = user?.name?.[0] || user?.username?.[0] || brandInitial;

  // Filter menu profil agar tidak muncul di mobile bottom bar
  const mobileItems = items.filter((item) => !item.href.endsWith("/profile"));

  return (
    <>
      <aside
        aria-label={`Sidebar ${brandName}`}
        data-collapsed={collapsed}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-tiby-teal-100 bg-white px-4 py-5 shadow-xs transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex ${
          collapsed ? "w-19" : "w-66"
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-tiby-teal-100 bg-white text-tiby-muted shadow-sm transition hover:border-tiby-teal-600 hover:bg-tiby-teal-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
        >
          <ChevronIcon
            className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        <div className="space-y-7">
          <div className="flex h-10 items-center pl-0.5">
            <div
              className={`relative h-10 overflow-hidden transition-[width] duration-300 motion-reduce:transition-none ${
                collapsed ? "w-10" : "w-full"
              }`}
            >
              <Image
                src={collapsed ? "/logo/logo-only.png" : "/logo/logo.png"}
                alt={`${brandName} ${brandSubtitle}`}
                width={collapsed ? 40 : 200}
                height={collapsed ? 40 : 48}
                priority
                className="h-10 w-auto max-w-none object-contain object-left"
              />
            </div>
          </div>

          <nav aria-label="Menu Utama" className="space-y-1">
            {items.map((item) => {
              const isActive = isItemActive(item.href);
              return (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={`relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-3 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
                      isActive
                        ? "bg-tiby-teal-50 text-tiby-teal-700"
                        : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full bg-tiby-teal-600 transition-opacity ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                      {item.icon}
                    </span>
                    <span className={labelCls}>{item.label}</span>
                  </Link>
                  <Tooltip text={item.label} show={collapsed} />
                </div>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-tiby-teal-100 pt-4">
          <ThemeToggle variant="sidebar" collapsed={collapsed} />
          <div
            className={`flex items-center rounded-xl ${
              collapsed ? "justify-center" : "gap-3 bg-tiby-teal-50/60 p-2.5"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tiby-teal-600 text-xs font-bold uppercase text-white">
              {avatarText}
            </div>
            <div
              className={`min-w-0 transition-opacity duration-200 motion-reduce:transition-none ${
                collapsed ? "hidden opacity-0" : "opacity-100"
              }`}
            >
              <p className="truncate text-xs font-semibold text-tiby-ink">
                {user?.name || user?.username}
              </p>
              <p className="truncate text-[11px] text-tiby-muted">
                {roleTitle}
              </p>
            </div>
          </div>

          <div className="group relative border-t border-tiby-teal-100 pt-2">
            <button
              type="button"
              onClick={() => handleSignOut()}
              aria-label="Keluar"
              className="flex h-10 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-3 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <LogoutIcon />
              </span>
              <span className={labelCls}>Keluar</span>
            </button>
            <Tooltip text="Keluar" show={collapsed} />
          </div>
        </div>
      </aside>

      {/* ─── MOBILE BOTTOM BAR (Teks Dikembalikan) ─── */}
      <nav
        aria-label="Navigasi Mobile"
        className="fixed inset-x-3 bottom-3 z-40 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch gap-1 rounded-2xl border border-tiby-teal-100 bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(15,60,60,0.12)] backdrop-blur-xl">
          {mobileItems.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition active:scale-95 ${
                  isActive
                    ? "bg-tiby-teal-50 text-tiby-teal-700"
                    : "text-tiby-muted active:bg-gray-50"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                  {item.icon}
                </span>
                <span
                  className={`max-w-full truncate text-[10px] leading-none ${
                    isActive ? "font-bold" : "font-semibold"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
