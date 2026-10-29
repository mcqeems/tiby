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
  openGraph: {
    title: "Tiby - Pendamping Cerdas Pengobatan",
    description:
      "Catat keluhan dan obat harian dengan bicara. Pandu mendengarkan tanpa menghakimi.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-tiby-ink selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
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
