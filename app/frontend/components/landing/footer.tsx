"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import Image from "next/image";

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-gray-500 transition-colors hover:text-gray-900"
      >
        {children}
      </Link>
    </li>
  );
}

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    startTransition(() => {
      setCurrentYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="mx-auto max-w-6xl px-6 pb-10">
      <div className="overflow-hidden rounded-[2.5rem] bg-gray-50 px-8 py-14 md:px-14">
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
              <FooterLink href="#peran">Untuk Semua</FooterLink>
              <FooterLink href="#faq">Keamanan</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gray-900">
              Sumber Daya
            </h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#">Edukasi Kemenkes</FooterLink>
              <FooterLink href="#">Blog Kesehatan</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold text-gray-900">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#">Kebijakan Privasi</FooterLink>
              <FooterLink href="#">Syarat Ketentuan</FooterLink>
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
    </footer>
  );
}
