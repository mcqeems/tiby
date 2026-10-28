"use client";

import type {
  RiskSortedPatientItem,
  PatientStatusHistoryItem,
} from "@tiby/ts-shared";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";

interface PatientHistoryModalProps {
  patient: RiskSortedPatientItem;
  historyItems: PatientStatusHistoryItem[];
  loading: boolean;
  onClose: () => void;
}

export default function PatientHistoryModal({
  patient,
  historyItems,
  loading,
  onClose,
}: PatientHistoryModalProps) {
  return (
    <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
      <ModalCard className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-tiby-teal-100 max-h-[85vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-tiby-teal-100">
          <div>
            <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider">
              Riwayat Kepatuhan Longitudinal
            </span>
            <h3 className="font-heading text-lg font-600 text-tiby-ink">
              {patient.patientName}
            </h3>
            <p className="text-xs text-tiby-muted">
              ID Rencana Terapi: {patient.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-tiby-muted hover:bg-gray-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Timeline / Items Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <p className="py-8 text-center text-xs text-tiby-muted">
              Memuat riwayat check-in...
            </p>
          ) : historyItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-tiby-muted">
              Belum ada log riwayat status tercatat untuk pasien ini.
            </p>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-tiby-teal-100 bg-tiby-teal-50/30 p-3 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-tiby-teal-700">
                    {item.eventType}
                  </span>
                  <span className="text-[10px] text-tiby-muted">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-tiby-ink leading-relaxed">
                  {item.reasonOrSummary}
                </p>
                <p className="text-[10px] text-tiby-muted mt-1">
                  Aktor: {item.actorRole}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer Modal */}
        <div className="pt-3 border-t border-tiby-teal-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-tiby-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}
