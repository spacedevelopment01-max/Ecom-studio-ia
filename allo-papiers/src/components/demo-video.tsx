"use client";

import { useEffect, useRef } from "react";

/** Vidéo muette qui démarre quand elle est visible et s'arrête quand on la quitte (économise la batterie). */
export function DemoVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // lecture uniquement à la demande
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      aria-label={title}
      className="aspect-[12/25] w-full rounded-[1.4rem] border border-line bg-navy object-cover shadow-[0_30px_60px_-30px_rgba(15,30,54,0.5)]"
    >
      <source src={src.replace(/\.mp4$/, ".webm")} type="video/webm" />
      <source src={src} type="video/mp4" />
    </video>
  );
}
