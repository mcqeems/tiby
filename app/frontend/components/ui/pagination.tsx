"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The "Hal X / Y" pager every list screen had its own copy of.
 * Keeps the buttons named for screen readers — they are icon only.
 */
export default function Pagination({
  page,
  totalPages,
  loading = false,
  onChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  loading?: boolean;
  onChange: (page: number) => void;
  className?: string;
}) {
  const last = Math.max(1, totalPages);
  const buttonClass =
    "p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1 || loading}
        aria-label="Halaman sebelumnya"
        className={buttonClass}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs font-medium text-tiby-ink px-2">
        Hal {page} / {last}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(last, page + 1))}
        disabled={page >= last || loading}
        aria-label="Halaman berikutnya"
        className={buttonClass}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
