"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { errorMessage } from "@/lib/errors";
import { fadeDown, listItem, staggerParent } from "@/lib/motion";
import { notify } from "@/lib/toast";
import { adminNotificationsApi } from "@/lib/api/admin-notifications";
import { usePopup } from "@/components/ui/popup-provider";
import ErrorNotice from "@/components/ui/error-notice";
import type { UserItem } from "@/lib/api/users";
import type {
  NotificationSeverity,
  NotificationTemplate,
  SendSimulatedNotificationResponse,
  SimulationChannel,
} from "@tiby/ts-shared";
import ChannelSelector, { CHANNEL_META } from "./channel-selector";
import RecipientPicker from "./recipient-picker";
import TemplatePicker from "./template-picker";
import NotificationPreview from "./notification-preview";
import SendResultPanel from "./send-result-panel";
import { Loader2, Send } from "lucide-react";

const SEVERITIES: { value: NotificationSeverity; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Peringatan" },
  { value: "HIGH", label: "Tinggi" },
];

const TITLE_MAX = 120;
const MESSAGE_MAX = 1000;

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={listItem}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs sm:p-6"
    >
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tiby-teal-600 text-xs font-bold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-semibold text-tiby-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-tiby-muted">{description}</p>
        </div>
      </header>
      {children}
    </motion.section>
  );
}

export default function NotificationComposer() {
  const { confirm } = usePopup();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [recipients, setRecipients] = useState<UserItem[]>([]);
  const [channels, setChannels] = useState<SimulationChannel[]>([]);
  const [templateKey, setTemplateKey] = useState("CUSTOM");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<NotificationSeverity>("INFO");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SendSimulatedNotificationResponse | null>(
    null,
  );

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await adminNotificationsApi.getTemplates();
      setTemplates(res.items || []);
    } catch (err: unknown) {
      setTemplatesError(
        errorMessage(err, "Tidak dapat memuat daftar template."),
      );
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadTemplates(), 0);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  const applyTemplate = (template: NotificationTemplate | null) => {
    setTemplateKey(template?.key ?? "CUSTOM");
    if (!template) return;
    setTitle(template.title);
    setMessage(template.body);
    setSeverity(template.severity);
  };

  const missing: string[] = [];
  if (recipients.length === 0) missing.push("Pilih minimal satu penerima.");
  if (channels.length === 0) missing.push("Pilih minimal satu saluran.");
  if (!title.trim()) missing.push("Judul pesan belum diisi.");
  if (!message.trim()) missing.push("Isi pesan belum diisi.");

  const reset = () => {
    setRecipients([]);
    setChannels([]);
    setTemplateKey("CUSTOM");
    setTitle("");
    setMessage("");
    setSeverity("INFO");
    setResult(null);
  };

  const send = async () => {
    if (submitting || missing.length > 0) return;

    const channelLabels = channels.map((c) => CHANNEL_META[c].label).join(", ");
    const confirmed = await confirm({
      variant: "info",
      badgeText: "Konfirmasi",
      title: `Kirim notifikasi ke ${recipients.length} penerima?`,
      description: `${channelLabels} · "${title.trim()}". Pesan ini dikirim sebagai simulasi.`,
      confirmLabel: "Ya, Kirim",
      cancelLabel: "Batal",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await adminNotificationsApi.send({
        recipientUserIds: recipients.map((user) => user.id),
        channels,
        templateKey: templateKey === "CUSTOM" ? undefined : templateKey,
        title: title.trim(),
        message: message.trim(),
        severity,
      });
      setResult(res);

      const { delivered, skipped, failed } = res.summary;
      const detail = `${delivered} terkirim, ${skipped} dilewati, ${failed} gagal.`;
      if (delivered > 0 && failed === 0 && skipped === 0) {
        notify.success("Notifikasi Terkirim", detail);
      } else if (delivered > 0) {
        notify.warning("Sebagian Terkirim", detail);
      } else {
        notify.error("Tidak Ada yang Terkirim", detail);
      }
    } catch (err: unknown) {
      notify.error(
        "Gagal Mengirim",
        errorMessage(err, "Terjadi kesalahan saat mengirim notifikasi."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={staggerParent(0.05)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={fadeDown}>
        <h1 className="font-heading text-xl font-bold text-tiby-ink">
          Simulasi Notifikasi
        </h1>
        <p className="mt-0.5 text-sm text-tiby-muted">
          Kirim pesan uji ke pengguna lewat push, WhatsApp, atau alert aplikasi.
        </p>
      </motion.div>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <StepCard
            step={1}
            title="Penerima"
            description="Cari dan pilih pengguna yang akan menerima pesan simulasi."
          >
            <RecipientPicker selected={recipients} onChange={setRecipients} />
          </StepCard>

          <StepCard
            step={2}
            title="Saluran"
            description="Boleh lebih dari satu. Setiap saluran dilaporkan terpisah."
          >
            <ChannelSelector value={channels} onChange={setChannels} />
          </StepCard>

          <StepCard
            step={3}
            title="Isi Pesan"
            description="Gunakan template yang sudah ada atau tulis pesan sendiri."
          >
            <div className="space-y-4">
              {templatesError && (
                <ErrorNotice>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1">{templatesError}</span>
                    <button
                      type="button"
                      onClick={() => void loadTemplates()}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                    >
                      Coba lagi
                    </button>
                  </div>
                </ErrorNotice>
              )}

              <TemplatePicker
                templates={templates}
                value={templatesLoading ? "CUSTOM" : templateKey}
                onSelect={applyTemplate}
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label
                    htmlFor="notification-title"
                    className="mb-1.5 block text-xs font-semibold text-tiby-ink"
                  >
                    Judul
                  </label>
                  <input
                    id="notification-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder="Contoh: Pengingat Jadwal Kontrol"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                  <p className="mt-1 text-right text-[10px] text-tiby-muted">
                    {title.length}/{TITLE_MAX}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="notification-severity"
                    className="mb-1.5 block text-xs font-semibold text-tiby-ink"
                  >
                    Tingkat
                  </label>
                  <select
                    id="notification-severity"
                    value={severity}
                    onChange={(e) =>
                      setSeverity(e.target.value as NotificationSeverity)
                    }
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600 sm:w-32"
                  >
                    {SEVERITIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 hidden text-[10px] text-transparent sm:block">
                    .
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notification-message"
                  className="mb-1.5 block text-xs font-semibold text-tiby-ink"
                >
                  Isi Pesan
                </label>
                <textarea
                  id="notification-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MESSAGE_MAX}
                  rows={5}
                  placeholder="Tulis isi notifikasi yang akan diterima pengguna…"
                  className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-tiby-ink outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
                <p className="mt-1 text-right text-[10px] text-tiby-muted">
                  {message.length}/{MESSAGE_MAX}
                </p>
              </div>
            </div>
          </StepCard>

          <motion.div
            variants={listItem}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:p-5"
          >
            {missing.length > 0 && (
              <p className="mb-3 text-[11px] text-tiby-muted">
                {missing[0]}
              </p>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={submitting || missing.length > 0}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-tiby-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting
                ? "Mengirim…"
                : `Kirim ke ${recipients.length || 0} penerima`}
            </button>
            <p className="mt-2 text-center text-[10px] text-tiby-muted">
              Kamu akan diminta konfirmasi sebelum pesan dikirim. Setiap
              pengiriman dicatat di audit log.
            </p>
          </motion.div>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <NotificationPreview
              title={title}
              message={message}
              severity={severity}
              channels={channels}
            />
          </div>
        </div>
      </div>

      {result && (
        <SendResultPanel
          result={result}
          retrying={submitting}
          onRetry={() => void send()}
          onReset={reset}
        />
      )}
    </motion.div>
  );
}
