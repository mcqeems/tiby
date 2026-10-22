import type { Metadata } from "next";
import { Geist, Geist_Mono, Fredoka } from "next/font/google";
import { PopupProvider } from "@/components/ui/popup-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Tiby",
    default: "Tiby - Pendamping Cerdas Pengobatan TBC",
  },
  description:
    "Aplikasi pendamping harian pasien TBC berbasis suara. Pantau kepatuhan minum obat, kelola jadwal, dan dapatkan edukasi kesehatan yang aman dan terpercaya.",
  keywords: [
    "TBC",
    "tuberkulosis",
    "kesehatan",
    "pendamping obat",
    "aplikasi kesehatan",
    "pengobatan TBC",
  ],
  authors: [{ name: "Team Argon" }],
  openGraph: {
    title: "Tiby - Pendamping Cerdas Pengobatan TBC",
    description: "Aplikasi pendamping harian pasien TBC berbasis suara.",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PopupProvider>{children}</PopupProvider>
      </body>
    </html>
  );
}
