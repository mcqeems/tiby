"use client";

import Image from "next/image";
import { Bell, Info, ShieldAlert } from "lucide-react";
import type {
  NotificationSeverity,
  SimulationChannel,
} from "@tiby/ts-shared";
import { CHANNEL_META } from "./channel-selector";

interface NotificationPreviewProps {
  title: string;
  message: string;
  severity: NotificationSeverity;
  channels: SimulationChannel[];
}

function severityIcon(severity: NotificationSeverity) {
  if (severity === "HIGH") return ShieldAlert;
  if (severity === "WARNING") return Info;
  return Info;
}

function severityClasses(severity: NotificationSeverity) {
  if (severity === "HIGH") return "bg-red-100 text-red-600";
  if (severity === "WARNING") return "bg-amber-100 text-amber-600";
  return "bg-blue-100 text-blue-600";
}

/**
 * What the recipient will actually see. Only the selected channels render so
 * the panel never promises a delivery the admin did not ask for.
 */
export default function NotificationPreview({
  title,
  message,
  severity,
  channels,
}: NotificationPreviewProps) {
  const displayTitle = title.trim() || "Judul notifikasi";
  const displayMessage =
    message.trim() || "Isi pesan akan tampil di sini saat kamu mulai menulis.";
  // Mirrors the server-side zero-stigma guard on push and WhatsApp.
  const stripped = /(tbc|tuberkulosis)/i.test(`${title} ${message}`);
  const Icon = severityIcon(severity);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
      <header className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <h2 className="font-heading text-base font-semibold text-tiby-ink">
          Pratinjau
        </h2>
        <p className="mt-0.5 text-xs text-tiby-muted">
          Tampilan pesan di sisi penerima.
        </p>
      </header>

      <div className="space-y-5 p-5">
        {channels.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-xs text-tiby-muted">
            Pilih saluran untuk melihat pratinjau.
          </p>
        ) : (
          channels.map((channel) => (
            <div key={channel}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-tiby-muted">
                {CHANNEL_META[channel].label}
              </p>

              {channel === "PUSH" && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <Image
                      src="/icon-192.png"
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-tiby-ink">
                        {displayTitle}
                      </p>
                      <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-tiby-muted">
                        {displayMessage}
                      </p>
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                        Tiby · sekarang
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {channel === "WHATSAPP" && (
                <div className="rounded-2xl bg-[#efeae2] p-3">
                  <div className="max-w-[95%] rounded-xl rounded-tl-sm bg-[#d9fdd3] px-3 py-2 shadow-2xs">
                    <p className="text-[11px] font-bold leading-snug text-gray-900">
                      {displayTitle}
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-[11px] leading-relaxed text-gray-800">
                      {displayMessage}
                    </p>
                    <p className="mt-1 text-right text-[9px] text-gray-500">
                      sekarang ✓✓
                    </p>
                  </div>
                </div>
              )}

              {channel === "ALERT" && (
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${severityClasses(severity)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-tiby-ink">
                        {displayTitle}
                      </p>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tiby-teal-600" />
                    </div>
                    <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-tiby-muted">
                      {displayMessage}
                    </p>
                    <p className="mt-1 text-[9px] text-gray-400">sekarang</p>
                  </div>
                  <Bell className="mt-1 h-3.5 w-3.5 shrink-0 text-gray-300" />
                </div>
              )}
            </div>
          ))
        )}

        {stripped && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Kata &quot;TBC&quot; atau &quot;Tuberkulosis&quot; akan dihapus
            otomatis dari pesan Push dan WhatsApp sesuai aturan bebas stigma.
          </p>
        )}
      </div>
    </section>
  );
}
