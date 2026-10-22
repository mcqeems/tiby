"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { Home, Users, UserPlus, UserCircle, FileText } from "lucide-react";

export const nakesMenuItems: SidebarItem[] = [
  {
    label: "Beranda",
    href: "/nakes",
    icon: <Home className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Daftar Pasien",
    href: "/nakes/pasien",
    icon: <Users className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Onboarding Pasien",
    href: "/nakes/onboarding",
    icon: <UserPlus className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Tiket Tindak Lanjut",
    href: "/nakes/tiket",
    icon: <FileText className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Profil Saya",
    href: "/nakes/profile",
    icon: <UserCircle className="w-5 md:w-4 h-5 md:h-4" />,
  },
];
