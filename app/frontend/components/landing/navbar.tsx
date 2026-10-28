"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { BookOpen, Play, ArrowUpRight } from "lucide-react";
import { EASE } from "./shared";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 20);
  });

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-gray-100/80 bg-white/80 py-4 backdrop-blur-xl shadow-sm" 
          : "border-transparent bg-transparent py-6" 
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/mascot/logo.png"
            alt="Tiby Logo"
            width={120}
            height={32}
            className="object-contain"
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="#faq"
            className="hidden items-center gap-2 rounded-full bg-gray-50/80 px-6 py-3 text-[15px] font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
          >
            <BookOpen className="h-4 w-4" />
            FAQ
          </Link>

          <Link
            href="/demo"
            className="hidden items-center gap-2 rounded-full bg-gray-50/80 px-6 py-3 text-[15px] font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:flex"
          >
            <Play className="h-4 w-4" />
            Mode Demo
          </Link>

          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full bg-[#0F172A] px-7 py-3 text-[15px] font-semibold text-white transition-all hover:bg-black hover:shadow-lg"
          >
            Buka App
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
