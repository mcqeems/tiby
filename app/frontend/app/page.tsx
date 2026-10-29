import type { Metadata } from "next";
import Navbar from "../components/landing/navbar";
import Hero from "../components/landing/hero";
import Statement from "../components/landing/statement";
import Features from "../components/landing/features";
import Personas from "../components/landing/personas";
import Testimonials from "../components/landing/testimonials";
import CTA from "../components/landing/cta";
import FAQ from "../components/landing/faq";
import Footer from "../components/landing/footer";
import SmoothScroll from "../components/landing/smooth-scroll";


export const metadata: Metadata = {
  title: {
    absolute: "Tiby - Pendamping Cerdas Pengobatan",
  },
  description:
    "Catat keluhan dan obat harian dengan bicara. Pandu mendengarkan tanpa menghakimi, dengan pengingat obat, check-in harian, dan edukasi dari panduan resmi.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tiby - Pendamping Cerdas Pengobatan",
    description:
      "Catat keluhan dan obat harian dengan bicara. Pandu mendengarkan tanpa menghakimi.",
    url: "https://tiby.web.id/",
    siteName: "Tiby",
    locale: "id_ID",
    type: "website",
    // Gambar diisi oleh app/opengraph-image.tsx (konvensi file Next.js).
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiby - Pendamping Cerdas Pengobatan",
    description:
      "Catat keluhan dan obat harian dengan bicara. Pandu mendengarkan tanpa menghakimi.",
    // Gambar diisi oleh app/twitter-image.tsx (konvensi file Next.js).
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Tiby",
      url: "https://tiby.web.id/",
      inLanguage: "id-ID",
    },
    {
      "@type": "SoftwareApplication",
      name: "Tiby",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      url: "https://tiby.web.id/",
      inLanguage: "id-ID",
      description:
        "Aplikasi pendamping harian pasien TBC berbasis suara: check-in suara harian, pengingat minum obat, dan edukasi kesehatan.",
      author: { "@type": "Organization", name: "Team Argon" },
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-tiby-ink selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SmoothScroll>
        <Navbar />
        <main>
        <Hero />
        <Statement />
        <Features />
        <Personas />
        <Testimonials />
        <CTA />
        <FAQ />
        </main>
        <Footer />
      </SmoothScroll>
    </div>
  );
}
