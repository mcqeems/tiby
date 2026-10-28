import GuidanceView from "@/components/guidance/guidance-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tanya Pandu",
  description:
    "Tanyakan hal umum seputar pengobatan, dijawab dari panduan resmi Kemenkes/WHO.",
  robots: "noindex, nofollow",
};

export default function PasienGuidancePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuidanceView />
    </div>
  );
}
