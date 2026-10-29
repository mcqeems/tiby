// lib/toast.tsx — sonner wrapper with the Tiby toast template.
//
// Every toast shows a looping mascot that carries the status (alert art for
// errors, animated empathy for warnings/info, animated idle for success),
// then title + message. Styling lives on `tiby-toast*` classes in globals.css
// so light/dark follow the palette variables. Blocking confirms stay on
// usePopup(); this is for fire-and-forget success/error/warning/info feedback.

import { toast } from "sonner";
import Mascot from "@/components/mascot";

export type ToastVariant = "success" | "danger" | "warning" | "info";

function ToastBody({
  variant,
  title,
  message,
}: {
  variant: ToastVariant;
  title: string;
  message?: string;
}) {
  // ponytail: alert/empathy-static are stroke-only (no Lottie), so the
  // animated flag is a type error there — plain render, no flag.
  const mascot =
    variant === "danger" ? (
      <Mascot emotion="alert" size={44} className="shrink-0" />
    ) : variant === "warning" ? (
      <Mascot emotion="empathy" size={44} className="shrink-0" />
    ) : (
      <Mascot emotion="idle" animated loop size={44} className="shrink-0" />
    );
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="tiby-toast-mascot shrink-0">{mascot}</span>
      <div className="min-w-0 flex-1">
        <p className="tiby-toast-title">{title}</p>
        {message && <p className="tiby-toast-description">{message}</p>}
      </div>
    </div>
  );
}

function show(
  variant: ToastVariant,
  title: string,
  message?: string,
): string | number {
  const fn =
    variant === "success"
      ? toast.success
      : variant === "danger"
        ? toast.error
        : variant === "warning"
          ? toast.warning
          : toast.info;
  return fn(<ToastBody variant={variant} title={title} message={message} />, {
    // Sonner's own status icon never renders; the mascot carries the status.
    icon: null,
    classNames: { toast: `tiby-toast tiby-toast-${variant}` },
  });
}

export const notify = {
  success: (title: string, message?: string) => show("success", title, message),
  error: (title: string, message?: string) => show("danger", title, message),
  warning: (title: string, message?: string) => show("warning", title, message),
  info: (title: string, message?: string) => show("info", title, message),
};
