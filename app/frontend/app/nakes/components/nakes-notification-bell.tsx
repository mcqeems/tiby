"use client";

import { useEffect, useState } from "react";
import { faskesApi } from "@/lib/api/faskes";
import type { FaskesAlert } from "@/lib/types/faskes";
import { usePopup } from "@/components/ui/popup-provider";
import NotificationBellView, {
  type BellItem,
} from "@/components/notifications/notification-bell-view";

export default function NakesNotificationBell() {
  const { notify } = usePopup();
  const [alerts, setAlerts] = useState<FaskesAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await faskesApi.getAlerts({ limit: 50 });
        if (active) setAlerts(res.items || []);
      } catch {
        // Keep the bell quiet; the next mount retries.
      } finally {
        if (active) setLoading(false);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await faskesApi.markAlertAsRead(id);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === id ? { ...alert, isRead: true } : alert,
        ),
      );
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal",
        description:
          err instanceof Error
            ? err.message
            : "Tidak dapat menandai notifikasi.",
        confirmLabel: "Tutup",
      });
    }
  };

  const items: BellItem[] = alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    isRead: alert.isRead,
    createdAt: alert.createdAt,
    meta: alert.patientName,
  }));

  return (
    <NotificationBellView
      items={items}
      loading={loading}
      onMarkRead={handleMarkRead}
      emptyText="Belum ada notifikasi."
    />
  );
}
