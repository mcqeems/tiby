"use client";

import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api/notifications";
import { usePopup } from "@/components/ui/popup-provider";
import NotificationBellView, {
  type BellItem,
} from "@/components/notifications/notification-bell-view";
import type { UserNotification } from "@tiby/ts-shared";

export default function UserNotificationBell() {
  const { notify } = usePopup();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await notificationsApi.list({ limit: 50 });
        if (active) setNotifications(res.items || []);
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
      const updated = await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? updated : item)),
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

  const items: BellItem[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    severity: item.severity,
    isRead: item.isRead,
    createdAt: item.createdAt,
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
