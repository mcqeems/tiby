"use client";

import { useState, useEffect, useCallback } from "react";
import { familyContactsApi } from "@/lib/api/family-contacts";
import type { FamilyContact } from "@/lib/types/family-contact";
import { usePopup } from "@/components/ui/popup-provider";
import { Users, Plus, Trash2, X, Phone, Loader2, Save, BadgeCheck } from "lucide-react";
import WhatsappConnectCard from "@/components/whatsapp/whatsapp-connect-card";

export default function FamilyContactsCard({
  patientId,
  viewer = "patient",
}: {
  patientId: string;
  viewer?: "patient" | "nakes";
}) {
  const { notify, confirm } = usePopup();

  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connectingContact, setConnectingContact] = useState<FamilyContact | null>(
    null,
  );

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await familyContactsApi.getAll(patientId);
      setContacts(res || []);
    } catch {
      // Abaikan error jika belum ada data
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchContacts();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchContacts]);

  const handleDelete = async (contactId: string) => {
    const isConfirmed = await confirm({
      variant: "warning",
      title: "Hapus Kontak Darurat?",
      description:
        "Kontak ini tidak akan dihubungi lagi jika terjadi keadaan darurat.",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      await familyContactsApi.remove(patientId, contactId);
      await notify({
        variant: "success",
        title: "Terhapus",
        description: "Kontak berhasil dihapus.",
        confirmLabel: "Tutup",
      });
      fetchContacts();
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Tidak dapat menghapus kontak.",
        confirmLabel: "Tutup",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.length < 3 || whatsappNumber.length < 8) {
      return notify({
        variant: "warning",
        title: "Validasi Gagal",
        description: "Nama minimal 3 karakter dan No. WA minimal 8 digit.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      const created = await familyContactsApi.create(patientId, {
        fullName,
        whatsappNumber,
        notifyOnEscalation: true, // Selalu true agar sistem bisa menghubungi mereka
      });
      setIsModalOpen(false);
      setFullName("");
      setWhatsappNumber("");
      fetchContacts();
      // A contact is useless until the number proves it can receive messages.
      setConnectingContact(created);
    } catch {
      await notify({
        variant: "danger",
        title: "Gagal",
        description: "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs mt-6">
      <header className="flex items-center justify-between border-b border-gray-100 bg-linear-to-r from-tiby-teal-50/70 to-white px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
            <Users className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="font-heading text-base font-semibold leading-tight text-tiby-ink">
              Kontak Darurat
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">
              {viewer === "nakes"
                ? "Kontak keluarga yang dihubungi jika pasien tidak melapor."
                : "Keluarga yang akan dihubungi sistem jika Anda lupa melapor."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-tiby-teal-50 px-3 py-1.5 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-100 transition"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </header>

      <div className="p-6 sm:p-8">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-tiby-teal-600" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-tiby-muted">
              Belum ada kontak darurat yang ditambahkan.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 sm:hidden inline-flex items-center gap-1.5 rounded-xl bg-tiby-teal-50 px-4 py-2 text-xs font-semibold text-tiby-teal-700"
            >
              <Plus className="w-4 h-4" /> Tambah Kontak
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-tiby-teal-100 text-tiby-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {contact.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-tiby-ink truncate">
                      {contact.fullName}
                    </p>
                    <p className="text-[11px] text-tiby-muted flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {contact.whatsappNumber}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {contact.whatsappVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      <BadgeCheck className="w-3 h-3" /> Terhubung
                    </span>
                  ) : (
                    <button
                      onClick={() => setConnectingContact(contact)}
                      className="rounded-lg bg-tiby-teal-50 px-2.5 py-1.5 text-[10px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-100 hover:bg-tiby-teal-100"
                    >
                      Hubungkan
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL TAMBAH KONTAK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
              <h3 className="font-heading font-bold text-tiby-ink">
                Tambah Kontak Darurat
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:bg-gray-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Ibu Siti"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tiby-ink mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-tiby-teal-600 text-white text-xs font-semibold hover:bg-tiby-teal-700 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {connectingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setConnectingContact(null)}
                className="rounded-lg bg-white/90 p-1.5 text-gray-500 hover:bg-white"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <WhatsappConnectCard
              familyContactId={connectingContact.id}
              title={`WhatsApp ${connectingContact.fullName}`}
              description="Kirim kode dari nomor kontak ini untuk mengaktifkan pemberitahuan."
              onVerified={() => {
                setConnectingContact(null);
                fetchContacts();
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
