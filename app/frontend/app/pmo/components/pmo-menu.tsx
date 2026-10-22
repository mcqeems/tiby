"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { Home, UserCircle, Users } from "lucide-react";

export const pmoMenuItems: SidebarItem[] = [
  {
    label: "Beranda",
    href: "/pmo",
    icon: <Home className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Pasien Binaan",
    href: "/pmo/pasien",
    icon: <Users className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    // ✅ Tambahkan menu profil
    label: "Profil Saya",
    href: "/pmo/profile",
    icon: <UserCircle className="w-5 md:w-4 h-5 md:h-4" />,
  },
];
