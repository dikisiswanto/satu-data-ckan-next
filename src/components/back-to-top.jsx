"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const updateVisibility = () => {
      frame = 0;
      setVisible(window.scrollY > 560);
    };
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="public-back-to-top"
      aria-label="Kembali ke bagian atas halaman"
      title="Kembali ke atas"
      onClick={() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }}
    >
      <ArrowUp size={19} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
