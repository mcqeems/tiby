"use client";

import { motion } from "motion/react";
import { listItem, staggerParent } from "@/lib/motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type {
  SendSimulatedNotificationResponse,
  SimulationDeliveryStatus,
} from "@tiby/ts-shared";
import { CHANNEL_META } from "./channel-selector";

const STATUS_META: Record<
  SimulationDeliveryStatus,
  { label: string; className: string }
> = {
  DELIVERED: {
    label: "Terkirim",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  NO_SUBSCRIPTION: {
    label: "Tanpa perangkat",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SKIPPED_UNVERIFIED: {
    label: "Belum terverifikasi",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SKIPPED_WAHA_DISABLED: {
    label: "WAHA nonaktif",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  NOT_APPLICABLE: {
    label: "Tidak berlaku",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  FAILED: {
    label: "Gagal",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface SendResultPanelProps {
  result: SendSimulatedNotificationResponse;
  retrying: boolean;
  onRetry: () => void;
  onReset: () => void;
}

export default function SendResultPanel({
  result,
  retrying,
  onRetry,
  onReset,
}: SendResultPanelProps) {
  const { summary, results } = result;
  const tone =
    summary.failed > 0 || summary.delivered === 0
      ? "border-red-200"
      : summary.skipped > 0
        ? "border-amber-200"
        : "border-emerald-200";

  return (
    <motion.section
      variants={staggerParent(0.04)}
      initial="hidden"
      animate="visible"
      aria-live="polite"
      className={`overflow-hidden rounded-2xl border bg-white shadow-2xs ${tone}`}
    >
      <header className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold text-tiby-ink">
            Hasil Pengiriman
          </h2>
          <p className="mt-0.5 text-xs text-tiby-muted">
            {summary.recipients} penerima · {summary.delivered} terkirim ·{" "}
            {summary.skipped} dilewati · {summary.failed} gagal
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-tiby-ink transition hover:bg-gray-50 disabled:opacity-60"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Kirim lagi
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-tiby-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-tiby-teal-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Mulai baru
          </button>
        </div>
      </header>

      <ul className="divide-y divide-gray-100">
        {results.map((recipient) => (
          <motion.li
            key={recipient.userId}
            variants={listItem}
            className="px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-tiby-ink">
                {recipient.name}
              </span>
              <span className="font-mono text-[11px] text-tiby-muted">
                @{recipient.username || "-"}
              </span>
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-600">
                {recipient.role}
              </span>
            </div>

            <ul className="mt-2 space-y-1.5">
              {recipient.channels.map((channel) => {
                const status = STATUS_META[channel.status];
                return (
                  <li
                    key={channel.channel}
                    className="flex flex-wrap items-center gap-2 text-[11px]"
                  >
                    <span className="w-16 shrink-0 font-semibold text-tiby-muted">
                      {CHANNEL_META[channel.channel].label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${status.className}`}
                    >
                      {channel.status === "DELIVERED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : channel.status === "FAILED" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {status.label}
                    </span>
                    {channel.detail && (
                      <span className="text-tiby-muted">{channel.detail}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
