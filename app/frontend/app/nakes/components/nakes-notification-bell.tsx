"use client";

import { useState, useEffect, useRef } from "react";
import { faskesApi } from "@/lib/api/faskes";
import type { FaskesAlert } from "@/lib/types/faskes";
import { usePopup } from "@/components/ui/popup-provider";
import { Bell, ShieldAlert, Check, Loader2, Info } from "lucide-react";

export default function NakesNotificationBell() {
  const { notify } = usePopup();

  const [alerts, setAlerts] = useState<FaskesAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await faskesApi.getAlerts({ limit: 5 }); // Ambil 5 terbaru
      setAlerts(res.items || []);
    } catch {
      // Abaikan error agar lonceng tidak crash
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchAlerts();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  // Tutup dropdown jika klik di luar area
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

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah dropdown tertutup saat klik tombol
    try {
      setMarkingId(id);
      await faskesApi.markAlertAsRead(id);

      // Update state lokal tanpa fetch ulang
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
      );
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat menandai notifikasi.",
        confirmLabel: "Tutup",
      });
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tombol Lonceng */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-tiby-muted border border-gray-200 shadow-2xs hover:bg-gray-50 hover:text-tiby-teal-700 transition"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
              <h3 className="font-heading font-semibold text-sm text-tiby-ink">
                Notifikasi Terbaru
              </h3>
              <span className="text-xs text-tiby-muted bg-gray-200 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} Baru
              </span>
            </div>

            <div className="max-h-75 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-tiby-teal-600" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-tiby-muted">
                    Belum ada notifikasi.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alerts.map((alert) => {
                    const isHigh = alert.severity === "HIGH";
                    const isWarning = alert.severity === "WARNING";
                    const Icon = isHigh ? ShieldAlert : isWarning ? Info : Info;

                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-4 transition hover:bg-gray-50 ${!alert.isRead ? "bg-tiby-teal-50/20" : ""}`}
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

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold ${!alert.isRead ? "text-tiby-ink" : "text-gray-500"}`}
                          >
                            {alert.title}
                          </p>
                          <p className="text-xs text-tiby-muted mt-0.5 line-clamp-2 leading-relaxed">
                            {alert.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(alert.createdAt).toLocaleString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            - {alert.patientName}
                          </p>
                        </div>

                        {/* Tombol Centang jika belum dibaca */}
                        {!alert.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(alert.id, e)}
                            disabled={markingId === alert.id}
                            title="Tandai sudah dibaca"
                            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:border-tiby-teal-300 hover:bg-tiby-teal-50 hover:text-tiby-teal-600 transition"
                          >
                            {markingId === alert.id ? (
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

            <div className="border-t border-gray-100 p-2 bg-gray-50/50 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-tiby-teal-700 hover:text-tiby-teal-800"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
