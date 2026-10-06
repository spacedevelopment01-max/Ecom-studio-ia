"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "../ui";

/**
 * Vignette d'une direction avec le contenu du projet (photos, nom, textes) : capture faite par le serveur, ou,
 * sans navigateur de captures sur l'installation, la page rendue en direct en miniature. Jamais l'exemple d'un autre projet.
 */
export function DirectionThumb({ projectId, direction, fallback, sandbox, className, version }: { projectId: string; direction: string; fallback: string; sandbox?: string; className?: string; version?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "live" | "error">("loading");
  const box = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const FRAME_W = 1280;
  return (
    <span ref={box} className={cx("relative block w-full overflow-hidden bg-paper-2", className)}>
      {state === "loading" && <span className="skeleton absolute inset-0" aria-hidden />}
      {state === "error" && <img src={fallback} alt="" className="absolute inset-0 size-full object-cover object-top" loading="lazy" />}
      {(state === "loading" || state === "ok") && <img src={`/api/projects/${projectId}/theme/direction-thumb?d=${direction}${version ? `&v=${encodeURIComponent(version)}` : ""}`} alt="" className={cx("absolute inset-0 size-full object-cover object-top transition-opacity duration-500", state === "ok" ? "opacity-100" : "opacity-0")} loading="lazy" onLoad={() => setState("ok")} onError={() => setState("live")} />}
      {state === "live" && w > 0 && (
        <iframe
          src={`/preview/${projectId}/v/dir-${direction}?es_raw=1${version ? `&v=${encodeURIComponent(version)}` : ""}`}
          title=""
          aria-hidden
          tabIndex={-1}
          loading="lazy"
          sandbox={sandbox ?? "allow-scripts"}
          onError={() => setState("error")}
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
          style={{ width: FRAME_W, height: box.current ? (box.current.clientHeight * FRAME_W) / Math.max(1, w) : (FRAME_W * 3) / 4, transform: `scale(${w / FRAME_W})` }}
        />
      )}
    </span>
  );
}
