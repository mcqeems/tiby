"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Send, CheckCircle2 } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import { checkInsApi } from "@/lib/api/check-in";
import { errorMessage } from "@/lib/errors";
import { formatLongDateUtc } from "@/lib/format";
import { notify } from "@/lib/toast";
import type {
  MissedCheckInReportItem,
  MissedCheckInSummaryResponse,
} from "@/lib/types/check-in";

interface MissedCheckInReportModalProps {
  open: boolean;
  onClose: () => void;
  summary?: MissedCheckInSummaryResponse | null;
  defaultDate?: string | null;
  onSubmitted?: (report: MissedCheckInReportItem) => void;
}

export default function MissedCheckInReportModal({
  open,
  onClose,
  summary: providedSummary,
  defaultDate,
  onSubmitted,
}: MissedCheckInReportModalProps) {
  const [loadedSummary, setLoadedSummary] =
    useState<MissedCheckInSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [pickedDate, setPickedDate] = useState<string>("");
  const [patientNote, setPatientNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const summary = providedSummary ?? loadedSummary;

  useEffect(() => {
    if (!open || providedSummary !== undefined) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingSummary(true);
      try {
        const res = await checkInsApi.getMissedReports();
        if (active) setLoadedSummary(res);
      } catch (err: unknown) {
        if (active) {
          notify.error(
            "Gagal Memuat",
            errorMessage(err, "Tidak dapat memuat daftar tanggal terlewat."),
          );
        }
      } finally {
        if (active) setLoadingSummary(false);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, providedSummary]);

  const pendingDates = new Set(
    (summary?.reports ?? [])
      .filter((r) => r.status === "PENDING")
      .map((r) => r.reportedDate),
  );
  const eligibleDates = summary?.eligibleDates ?? [];
  const selectableDates = eligibleDates.filter((d) => !pendingDates.has(d));

  const preferredDefault =
    defaultDate && selectableDates.includes(defaultDate)
      ? defaultDate
      : selectableDates[0] ?? "";
  const effectiveDate =
    pickedDate && selectableDates.includes(pickedDate)
      ? pickedDate
      : preferredDefault;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDate) return;

    try {
      setSubmitting(true);
      const created = await checkInsApi.createMissedReport({
        reportedDate: effectiveDate,
        patientNote: patientNote.trim() || undefined,
      });

      if (providedSummary === undefined && loadedSummary) {
        setLoadedSummary({
          ...loadedSummary,
          reports: [created, ...loadedSummary.reports],
        });
      }

      notify.success(
        "Laporan Terkirim ke PMO",
        "PMO telah diberi tahu untuk memverifikasi dan mewakili check-in tanggal tersebut.",
      );
      setPatientNote("");
      setPickedDate("");
      onSubmitted?.(created);
      onClose();
    } catch (err: unknown) {
      notify.error(
        "Gagal Mengirim",
        errorMessage(err, "Laporan tidak dapat dikirim ke PMO."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Lapor Sudah Minum Obat ke PMO"
      description="Jika Anda sudah minum obat pada hari yang terlewat tetapi lupa check-in, kirim konfirmasi agar PMO bisa memverifikasi lewat Wakili Check-in."
      size="md"
    >
      {loadingSummary && !summary ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-tiby-muted">
          <Loader2 className="h-4 w-4 animate-spin text-tiby-teal-600" />
          Memuat tanggal terlewat...
        </div>
      ) : eligibleDates.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Tidak ada hari terlewat</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Semua hari sejak awal pengobatan sudah memiliki catatan dosis lengkap.
            </p>
          </div>
        </div>
      ) : selectableDates.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1.5">
          <p className="font-semibold">Semua hari terlewat sudah dilaporkan</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Laporan Anda saat ini sedang menunggu verifikasi PMO. Setelah PMO melakukan Wakili Check-in, streak dan sisa hari Anda akan diperbarui otomatis.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="missed-report-date"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-tiby-muted"
            >
              <CalendarClock className="h-3.5 w-3.5 text-tiby-teal-600" />
              Pilih Tanggal Terlewat
            </label>
            <select
              id="missed-report-date"
              value={effectiveDate}
              onChange={(e) => setPickedDate(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            >
              {eligibleDates.map((dateStr) => {
                const isPending = pendingDates.has(dateStr);
                return (
                  <option key={dateStr} value={dateStr} disabled={isPending}>
                    {formatLongDateUtc(dateStr)}
                    {isPending ? " — Menunggu Verifikasi PMO" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label
              htmlFor="missed-report-note"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tiby-muted"
            >
              Catatan untuk PMO (Opsional)
            </label>
            <textarea
              id="missed-report-note"
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              maxLength={500}
              placeholder="Contoh: Sudah minum obat jam 08.00 pagi, kemarin lupa check-in di aplikasi."
              className="h-24 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-tiby-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
          </div>

          <div className="rounded-xl border border-tiby-teal-100 bg-tiby-teal-50/70 p-3 text-xs leading-relaxed text-tiby-teal-800">
            Setelah diverifikasi PMO lewat <strong>Wakili Check-in</strong>, catatan harian dan streak Anda akan tersambung kembali dan sisa hari berjalan sesuai streak terbaru.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-tiby-ink hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !effectiveDate}
              className="flex-1 h-11 rounded-xl bg-tiby-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Mengirim..." : "Kirim ke PMO"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
