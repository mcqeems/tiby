"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ModalCard, ModalOverlay } from "@/components/ui/modal-frame";
import Image from "next/image";

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-gray-500 transition-colors hover:text-gray-900"
      >
        {children}
      </Link>
    </li>
  );
}

function LegalButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="text-gray-500 transition-colors hover:text-gray-900"
      >
        {children}
      </button>
    </li>
  );
}

const PRIVASI_BODY = [
  {
    h: "Status aplikasi",
    p: "Tiby adalah prototipe yang dibuat Tim Argon untuk kompetisi pengembangan web UINIC 8.0. Aplikasi ini adalah alat bantu kepatuhan pengobatan dan bukan pengganti dokter, Nakes, atau Faskes — keputusan medis dan diagnosis tetap berada di tangan tenaga kesehatan.",
  },
  {
    h: "Rekaman suara",
    p: "Rekaman suara Anda hanya diproses untuk mengubah ucapan menjadi teks check-in, lalu dihapus segera setelah diproses sesuai UU PDP. Kami hanya menyimpan hasil ekstraksi teksnya.",
  },
  {
    h: "Data pribadi",
    p: "Nama, nomor WhatsApp, dan data pendampingan Anda dienkripsi saat disimpan dan hanya dipakai untuk pengingat jadwal serta pemantauan kepatuhan. Nomor WhatsApp tidak pernah dibagikan ke pihak ketiga.",
  },
  {
    h: "Notifikasi netral",
    p: "Seluruh notifikasi aplikasi dan WhatsApp disusun netral tanpa menyebut kondisi medis Anda, agar aman dibaca di tempat umum atau saat ponsel dipinjam orang lain.",
  },
  {
    h: "Hak Anda",
    p: "Anda dapat meminta akses, perbaikan, atau penghapusan data melalui Nakes di Faskes Anda, serta mencabut persetujuan berbagi data kapan saja dari halaman profil.",
  },
];

const SYARAT_BODY = [
  {
    h: "Tujuan aplikasi",
    p: "Tiby dikembangkan Tim Argon sebagai peserta kompetisi pengembangan web UINIC 8.0 untuk membantu pasien mencatat kepatuhan minum obat harian. Tiby tidak memberikan diagnosis, tidak meresepkan obat, dan tidak menggantikan dokter, Nakes, maupun Faskes.",
  },
  {
    h: "Akun",
    p: "Akun dibuat oleh Tenaga Kesehatan (Nakes) di Faskes — tidak ada pendaftaran mandiri. Jaga kerahasiaan kredensial Anda dan segera laporkan ke Faskes bila akun disalahgunakan.",
  },
  {
    h: "Kewajiban pengguna",
    p: "Isi laporan harian dengan jujur, ikuti jadwal yang dikonfirmasi bersama Faskes, dan tetap konsultasikan setiap keluhan ke tenaga kesehatan. Laporan yang tidak akurat dapat mengganggu pemantauan.",
  },
  {
    h: "Ketersediaan",
    p: "Sebagai prototipe kompetisi, fitur dan data dapat berubah atau direset sewaktu-waktu tanpa pemberitahuan. Layanan diberikan apa adanya selama masa pengembangan.",
  },
];

function LegalModal({
  open,
  title,
  sections,
  onClose,
}: {
  open: boolean;
  title: string;
  sections: { h: string; p: string }[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <ModalOverlay label={title} onClose={onClose}>
          <ModalCard className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-heading text-lg font-bold text-tiby-ink">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {sections.map((s) => (
                <div key={s.h}>
                  <h4 className="text-sm font-bold text-tiby-ink">{s.h}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {s.p}
                  </p>
                </div>
              ))}
            </div>
          </ModalCard>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
}

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [openDoc, setOpenDoc] = useState<"privasi" | "syarat" | null>(null);

  useEffect(() => {
    startTransition(() => {
      setCurrentYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="mx-auto max-w-6xl px-6 pb-10">
      <div className="overflow-hidden rounded-[2.5rem] bg-gray-100 px-8 py-14 md:px-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Image
              src="/logo/logo.png"
              height={100}
              width={100}
              alt="logo tiby"
            />
            <p className="mt-4 max-w-[16rem] text-xs leading-relaxed text-gray-500">
              Pendamping Cerdas Pengobatan TBC
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gray-900">Produk</h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#fitur">Fitur</FooterLink>
              <FooterLink href="#peran">Peran</FooterLink>
              <FooterLink href="#faq">Keamanan</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gray-900">
              Sumber Daya
            </h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink
                external
                href="https://p2.kemkes.go.id/wp-content/uploads/2025/12/Buku-Petunjuk-Teknis-Penatalaksanaan-Tuberkulosis-Sensitif-Obat-di-Indonesia_FINAL.pdf"
              >
                Juknis TB Kemenkes 2025
              </FooterLink>
              <FooterLink
                external
                href="https://who.int/publications/i/item/9789240107243"
              >
                Panduan WHO Module 4 (2025)
              </FooterLink>
              <FooterLink external href="https://www.halodoc.com/artikel">
                Blog Kesehatan Halodoc
              </FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gray-900">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <LegalButton onClick={() => setOpenDoc("privasi")}>
                Kebijakan Privasi
              </LegalButton>
              <LegalButton onClick={() => setOpenDoc("syarat")}>
                Syarat Ketentuan
              </LegalButton>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-gray-200/70 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center">
          <p>&copy; {currentYear ?? "…"} Tiby — Tim Argon</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-semibold text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Kembali ke atas
            <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <LegalModal
        open={openDoc === "privasi"}
        title="Kebijakan Privasi"
        sections={PRIVASI_BODY}
        onClose={() => setOpenDoc(null)}
      />
      <LegalModal
        open={openDoc === "syarat"}
        title="Syarat & Ketentuan"
        sections={SYARAT_BODY}
        onClose={() => setOpenDoc(null)}
      />
    </footer>
  );
}
