"use client";

import { useEffect, useRef, useState } from "react";
import waveAnimationData from "@/public/mascot/wave.json";

interface MascotAnimationProps {
  className?: string;
  size?: number;
}

export default function MascotAnimation({
  className = "",
  size = 100,
}: MascotAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let animItem: { destroy: () => void } | null = null;

    import("lottie-web").then((lottieModule) => {
      const lottie = lottieModule.default || lottieModule;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        animItem = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: waveAnimationData,
        });
        setIsLoaded(true);
      }
    });

    return () => {
      if (animItem) {
        animItem.destroy();
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Lottie Animation */}
      <div
        ref={containerRef}
        className="pointer-events-none relative transition-opacity duration-300"
        style={{ width: size, height: size, opacity: isLoaded ? 1 : 0.7 }}
        aria-label="Maskot Pandu menyapa"
      />
    </div>
  );
}
