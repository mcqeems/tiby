"use client";

import { MotionConfig } from "motion/react";
import Navbar from "../components/landing/navbar";
import Hero from "../components/landing/hero";
import Features from "../components/landing/features";
import Personas from "../components/landing/personas";
import Testimonials from "../components/landing/testimonials";
import CTA from "../components/landing/cta";
import FAQ from "../components/landing/faq";
import Footer from "../components/landing/footer";

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-clip bg-white font-body text-tiby-ink selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <Personas />
          <Testimonials />
          <CTA />
          <FAQ />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
