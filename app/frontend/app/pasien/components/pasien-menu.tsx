"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { Home, Pill, Clock, UserCircle } from "lucide-react"; // ✅ Tambahkan UserCircle

export const pasienMenuItems: SidebarItem[] = [
  {
    label: "Beranda",
    href: "/pasien",
    icon: <Home className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Check-in Harian",
    href: "/pasien/check-in",
    icon: <Pill className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Riwayat Terapi",
    href: "/pasien/riwayat",
    icon: <Clock className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    // ✅ Tambahkan menu profil
    label: "Profil Saya",
    href: "/pasien/profile",
    icon: <UserCircle className="w-5 md:w-4 h-5 md:h-4" />,
  },
];
