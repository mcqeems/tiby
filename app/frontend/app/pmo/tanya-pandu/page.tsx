import GuidanceView from "@/components/guidance/guidance-view";
import type { Metadata } from "next";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Tanya Pandu",
  description:
    "Tanyakan hal umum seputar pengobatan, dijawab dari panduan resmi Kemenkes/WHO.",
  robots: "noindex, nofollow",
};

export default function PmoGuidancePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuidanceView />
    </div>
  );
}
