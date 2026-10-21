"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { Home, Users, UserPlus } from "lucide-react";

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
];
