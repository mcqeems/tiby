import type { Metadata } from "next";
import ContactView from "./components/contact-view";

export const metadata: Metadata = {
  title: "Hubungi Admin",
  description:
    "Hubungi tim admin Tiby untuk pendaftaran Fasilitas Kesehatan (Faskes), kerja sama layanan, atau dukungan teknis.",
};

export default function ContactPage() {
  return <ContactView />;
}
