"use client";

import type { SidebarItem } from "@/components/layout/universal-sidebar";
import { Home, Building2, Users, BookOpen } from "lucide-react";

export const adminMenuItems: SidebarItem[] = [
  {
    label: "Beranda",
    href: "/admin",
    icon: <Home className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Fasilitas Kesehatan",
    href: "/admin/facilities",
    icon: <Building2 className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Manajemen Akun",
    href: "/admin/users",
    icon: <Users className="w-5 md:w-4 h-5 md:h-4" />,
  },
  {
    label: "Kelola Edukasi",
    href: "/admin/education",
    icon: <BookOpen className="w-5 md:w-4 h-5 md:h-4" />,
  },
];
