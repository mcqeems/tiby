"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { BookOpen, Home, UserCircle, Users } from "lucide-react";

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
    // ✅ Menu Edukasi untuk PMO
    label: "Pusat Edukasi",
    href: "/pmo/edukasi",
    icon: <BookOpen className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Profil Saya",
    href: "/pmo/profile",
    icon: <UserCircle className="w-5 md:w-4 h-5 md:h-4" />,
  },
];
