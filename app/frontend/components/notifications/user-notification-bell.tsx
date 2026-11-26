"use client";

import { useEffect, useState } from "react";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { errorMessage } from "@/lib/errors";
import { notificationsApi } from "@/lib/api/notifications";
import NotificationBellView, {
  type BellItem,
} from "@/components/notifications/notification-bell-view";
import MissedCheckInReportModal from "@/components/check-in/missed-check-in-report-modal";
import type { UserNotification } from "@tiby/ts-shared";

import { notify } from "@/lib/toast";

function stringMeta(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const val = metadata?.[key];
  return typeof val === "string" && val.length > 0 ? val : null;
}

export default function UserNotificationBell() {
  const { data: session } = useSession();
  const user = session?.user as TibyUser | undefined;
  const role = user?.role;

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [defaultReportDate, setDefaultReportDate] = useState<string | null>(
    null,
  );

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
      notify.error("Gagal", errorMessage(err, "Tidak dapat menandai notifikasi."));
    }
  };

  const items: BellItem[] = notifications.map((item) => {
    let action: BellItem["action"];

    if (
      role === "PASIEN" &&
      (item.type === "SILENCE_H1_ESCALATION" || item.type === "SILENCE_H1")
    ) {
      const missedDate = stringMeta(item.metadata, "missedDate");
      action = {
        label: "Lapor Sudah Minum Obat",
        onClick: () => {
          setDefaultReportDate(missedDate);
          setReportModalOpen(true);
        },
      };
    } else if (role === "PMO" && item.type === "MISSED_CHECKIN_REPORT") {
      const planId =
        item.treatmentPlanId ?? stringMeta(item.metadata, "treatmentPlanId");
      const reportedDate = stringMeta(item.metadata, "reportedDate");
      const missedReportId = stringMeta(item.metadata, "missedReportId");
      const patientName = stringMeta(item.metadata, "patientName") ?? "Pasien";

      if (planId && reportedDate) {
        const qs = new URLSearchParams({
          patientId: planId,
          patientName,
          date: reportedDate,
        });
        if (missedReportId) qs.set("missedReportId", missedReportId);
        action = {
          label: "Verifikasi & Wakili Check-in",
          href: `/pmo/check-in?${qs.toString()}`,
        };
      }
    }

    return {
      id: item.id,
      title: item.title,
      message: item.message,
      severity: item.severity,
      isRead: item.isRead,
      createdAt: item.createdAt,
      action,
    };
  });

  return (
    <>
      <NotificationBellView
        items={items}
        loading={loading}
        onMarkRead={handleMarkRead}
        emptyText="Belum ada notifikasi."
      />

      {role === "PASIEN" && (
        <MissedCheckInReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          defaultDate={defaultReportDate}
        />
      )}
    </>
  );
}
