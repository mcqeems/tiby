"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, Info, Loader2, ShieldAlert } from "lucide-react";
import { popover } from "@/lib/motion";

export interface BellItem {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "HIGH";
  isRead: boolean;
  createdAt: string;
  meta?: string;
}

interface NotificationBellViewProps {
  items: BellItem[];
  loading: boolean;
  onMarkRead: (id: string) => Promise<void>;
  emptyText?: string;
  title?: string;
}

export default function NotificationBellView({
  items,
  loading,
  onMarkRead,
  emptyText = "Belum ada notifikasi.",
  title = "Notifikasi Terbaru",
}: NotificationBellViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setMarkingId(id);
      await onMarkRead(id);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Buka notifikasi"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-tiby-muted shadow-2xs transition hover:bg-gray-50 hover:text-tiby-teal-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={popover}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 z-50 mt-2 w-80 origin-top-right sm:w-96"
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
                <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                  {title}
                </h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-tiby-muted">
                  {unreadCount} Baru
                </span>
              </div>

              <div className="max-h-75 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-tiby-teal-600" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-tiby-muted">{emptyText}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const isHigh = item.severity === "HIGH";
                      const isWarning = item.severity === "WARNING";
                      const Icon = isHigh ? ShieldAlert : Info;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-4 transition hover:bg-gray-50 ${!item.isRead ? "bg-tiby-teal-50/20" : ""}`}
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isHigh
                                ? "bg-red-100 text-red-600"
                                : isWarning
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold ${!item.isRead ? "text-tiby-ink" : "text-gray-500"}`}
                            >
                              {item.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-tiby-muted">
                              {item.message}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-400">
                              {formatTime(item.createdAt)}
                              {item.meta ? ` - ${item.meta}` : ""}
                            </p>
                          </div>

                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={(e) => void handleMarkAsRead(item.id, e)}
                              disabled={markingId === item.id}
                              title="Tandai sudah dibaca"
                              aria-label={`Tandai ${item.title} sudah dibaca`}
                              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:border-tiby-teal-300 hover:bg-tiby-teal-50 hover:text-tiby-teal-600"
                            >
                              {markingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-tiby-teal-700 hover:text-tiby-teal-800"
                >
                  Tutup Panel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
