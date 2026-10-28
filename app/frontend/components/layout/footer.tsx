"use client";

import { startTransition, useEffect, useState } from "react";
import { Heart } from "lucide-react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    startTransition(() => {
      setCurrentYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="mt-auto w-full border-t border-gray-100 pt-6 pb-16 md:pb-0 px-6 md:px-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <p className="text-sm font-heading font-bold text-tiby-ink">
            Tiby <span className="text-tiby-teal-600">Health</span>
          </p>
          <span className="hidden md:inline text-gray-300">|</span>
          <p className="text-xs text-tiby-muted">
            &copy; {currentYear ?? "…"} Tim Argon - Universitas Darussalam
            Gontor.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
         

          <div className="flex items-center gap-1 text-xs text-tiby-muted bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <span>Dibuat dengan</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
            <span>untuk Kesehatan Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
