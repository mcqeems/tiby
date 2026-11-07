"use client";

import { BellRing, Check, Inbox, MessageCircle, type LucideIcon } from "lucide-react";
import type { SimulationChannel } from "@tiby/ts-shared";

export const CHANNEL_META: Record<
  SimulationChannel,
  { label: string; description: string; icon: LucideIcon }
> = {
  PUSH: {
    label: "Push",
    description:
      "Tampil di perangkat penerima yang sudah berlangganan notifikasi push.",
    icon: BellRing,
  },
  WHATSAPP: {
    label: "WhatsApp",
    description:
      "Dikirim lewat WhatsApp ke nomor yang sudah terverifikasi.",
    icon: MessageCircle,
  },
  ALERT: {
    label: "Alert",
    description:
      "Masuk ke lonceng notifikasi pasien/PMO atau pusat notifikasi faskes untuk nakes.",
    icon: Inbox,
  },
};

interface ChannelSelectorProps {
  value: SimulationChannel[];
  onChange: (next: SimulationChannel[]) => void;
}

export default function ChannelSelector({
  value,
  onChange,
}: ChannelSelectorProps) {
  const toggle = (channel: SimulationChannel) => {
    onChange(
      value.includes(channel)
        ? value.filter((item) => item !== channel)
        : [...value, channel],
    );
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(
        Object.keys(CHANNEL_META) as SimulationChannel[]
      ).map((channel) => {
        const meta = CHANNEL_META[channel];
        const Icon = meta.icon;
        const active = value.includes(channel);

        return (
          <button
            key={channel}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(channel)}
            className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 ${
              active
                ? "border-tiby-teal-500 bg-tiby-teal-50/60 shadow-2xs"
                : "border-gray-200 bg-white hover:border-tiby-teal-200 hover:bg-gray-50"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
                  active
                    ? "bg-white text-tiby-teal-700 ring-tiby-teal-200"
                    : "bg-gray-50 text-tiby-muted ring-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  active
                    ? "border-tiby-teal-600 bg-tiby-teal-600 text-white"
                    : "border-gray-300 bg-white text-transparent"
                }`}
              >
                <Check className="h-3 w-3" />
              </span>
            </span>
            <span className="text-sm font-semibold text-tiby-ink">
              {meta.label}
            </span>
            <span className="text-[11px] leading-relaxed text-tiby-muted">
              {meta.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
