"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { faskesApi } from "@/lib/api/faskes";
import type { FaskesTicket } from "@/lib/types/faskes";
import PublicLoading from "@/components/ui/public-loading";
import TicketResolveModal from "./ticket-resolve-modal";
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LIMIT = 20;

export default function TicketList() {
  const [tickets, setTickets] = useState<FaskesTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("OPEN");
  const [selectedTicket, setSelectedTicket] = useState<FaskesTicket | null>(
    null,
  );

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await faskesApi.getTickets({
        status: filterStatus === "ALL" ? undefined : filterStatus,
        page,
        limit: LIMIT,
      });
      setTickets(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat tiket.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchTickets();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchTickets]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 w-full sm:w-48 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">Open (Baru)</option>
            <option value="IN_PROGRESS">In Progress (Ditangani)</option>
            <option value="RESOLVED_CLOSED">Selesai (Closed)</option>
          </select>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-tiby-teal-50 px-4 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-100 transition disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <PublicLoading message="Memuat tiket tindak lanjut..." />
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold text-tiby-ink">
            Tidak Ada Tiket
          </h3>
          <p className="text-sm text-tiby-muted mt-1">
            Saat ini tidak ada eskalasi pasien yang perlu ditangani.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => {
            const isHigh = ticket.priority === "CRITICAL";
            const isClosed = ticket.status === "RESOLVED_CLOSED";

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col md:flex-row gap-4 justify-between md:items-center transition hover:border-tiby-teal-200 ${
                  isHigh ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isHigh
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ticket.priority}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isClosed
                          ? "bg-gray-100 text-gray-600"
                          : "bg-tiby-teal-100 text-tiby-teal-700"
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <span className="text-xs text-tiby-muted flex items-center gap-1 ml-auto md:ml-0">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ticket.openedAt).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-lg text-tiby-ink">
                      {ticket.patientName}
                    </h3>
                    <p className="text-sm text-tiby-muted mt-1">
                      Sumber:{" "}
                      <span className="font-semibold text-tiby-ink">
                        {ticket.triggerSource}
                      </span>
                    </p>
                    {ticket.pmoNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm border border-gray-100">
                        <p className="font-semibold text-xs text-gray-500 mb-1">
                          Catatan Awal:
                        </p>
                        {/* ✅ FIX: Ganti kutip dua dengan entitas HTML */}
                        <p className="text-tiby-ink italic">
                          &ldquo;{ticket.pmoNotes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6">
                  {isClosed ? (
                    <div className="text-left md:text-right space-y-1">
                      <p className="text-xs text-gray-500 font-semibold">
                        Diselesaikan pada:
                      </p>
                      <p className="text-sm text-tiby-ink">
                        {new Date(ticket.closedAt!).toLocaleString("id-ID")}
                      </p>
                      {/* ✅ FIX: Ganti kutip dua dengan entitas HTML */}
                      <p className="text-xs text-tiby-muted italic max-w-xs md:text-right mt-2">
                        &ldquo;{ticket.resolutionNotes}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
                    >
                      <FileText className="w-4 h-4" />
                      Tindak Lanjut
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3">
          <span className="text-xs text-tiby-muted">
            Menampilkan <strong>{(page - 1) * LIMIT + 1}</strong> -{" "}
            <strong>{Math.min(page * LIMIT, total)}</strong> dari{" "}
            <strong>{total}</strong> tiket
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-tiby-ink px-2">
              Hal {page} / {Math.ceil(total / LIMIT) || 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(total / LIMIT), p + 1))
              }
              disabled={page >= Math.ceil(total / LIMIT) || loading}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedTicket && (
          <TicketResolveModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onSuccess={() => {
              setSelectedTicket(null);
              fetchTickets();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
