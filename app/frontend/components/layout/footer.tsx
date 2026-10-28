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
    <footer className="mt-auto w-full border-t border-gray-100 pt-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="flex items-center gap-1 text-xs text-tiby-muted bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            Argon Team
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <p className="text-xs text-tiby-muted">
            &copy; Tiby {currentYear ?? "…"}
          </p>
        </div>
      </div>
    </footer>
  );
}
