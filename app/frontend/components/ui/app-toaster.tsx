"use client";

import { Toaster } from "sonner";

/** Sonner host: bottom-right, 3s, above the modal layer (z-[60]). */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: "tiby-toast",
          title: "tiby-toast-title",
          description: "tiby-toast-description",
          closeButton: "tiby-toast-close",
        },
      }}
      style={{ "--z-index": 100 } as React.CSSProperties}
    />
  );
}
