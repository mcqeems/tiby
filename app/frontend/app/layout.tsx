import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Fredoka } from "next/font/google";
import { MotionConfig } from "motion/react";
import { PopupProvider } from "@/components/ui/popup-provider";
import AppToaster from "@/components/ui/app-toaster";
import ServiceWorkerRegister from "@/components/pwa/service-worker-register";
import ThemeSync from "@/components/theme/theme-sync";
import { THEME_SCRIPT } from "@/lib/theme";
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
  appleWebApp: {
    capable: true,
    title: "Tiby",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Tiby - Pendamping Cerdas Pengobatan TBC",
    description: "Aplikasi pendamping harian pasien TBC berbasis suara.",
    type: "website",
  },
};
export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Every animation in the app honours the OS reduced-motion setting. */}
        <MotionConfig reducedMotion="user">
          <PopupProvider>
            <Suspense fallback={null}>
              <ThemeSync />
            </Suspense>
            <ServiceWorkerRegister />
            {children}
            <AppToaster />
          </PopupProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
