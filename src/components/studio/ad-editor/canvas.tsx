"use client";
/**
 * Canevas interactif de l'éditeur visuel : rendu par le MÊME moteur que l'export (lib/ad-doc/render.ts), et
 * couche d'interaction par-dessus (souris, stylet et doigt via les Pointer Events) : sélection, déplacement avec
 * repères magnétiques, poignées de redimensionnement et de rotation, double-clic (ou double-tap) sur un texte pour
 * le modifier sur place. Le glissement est montré en direct ; un seul pas d'historique est créé au relâchement.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { renderDoc, type RenderEnv } from "@/lib/ad-doc/render";
import { angleAt, hitTest, resizeBox, snapBox, type Guide, type Handle } from "@/lib/ad-doc/geometry";
import type { DocOp } from "@/lib/ad-doc/ops";
import type { AdDocument, Layer } from "@/lib/ad-doc/types";

type Drag =
  | { kind: "move"; id: string; sx: number; sy: number; ox: number; oy: number }
  | { kind: "resize"; id: string; handle: Handle; sx: number; sy: number; box: { x: number; y: number; w: number; h: number }; keep: boolean }
  | { kind: "rotate"; id: string };

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const handlePos = (h: Handle, w: number, hh: number) => ({ x: h.includes("w") ? 0 : h.includes("e") ? w : w / 2, y: h.includes("n") ? 0 : h.includes("s") ? hh : hh / 2 });
const CURSOR: Record<Handle, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

export function EditorCanvas({
  doc,
  env,
  scale,
  selectedId,
  touch,
  onSelect,
  onCommit,
  editingId,
  onEditText,
}: {
  doc: AdDocument;
  env: RenderEnv | null;
  scale: number;
  selectedId: string | null;
  touch: boolean;
  onSelect: (id: string | null) => void;
  onCommit: (ops: DocOp[]) => void;
  editingId: string | null;
  onEditText: (id: string | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<AdDocument | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const drag = useRef<Drag | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const shown = live ?? doc;

  // Rendu (moteur commun à l'export) à chaque changement du document affiché.
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c || !env) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, c.width, c.height);
    renderDoc(ctx, editingId ? { ...shown, layers: shown.layers.map((l) => (l.id === editingId ? { ...l, visible: false } : l)) } : shown, env);
    ctx.restore();
  }, [shown, env, editingId]);

  const point = (e: { clientX: number; clientY: number }) => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  const layerOf = (id: string) => shown.layers.find((l) => l.id === id);

  const down = (e: React.PointerEvent) => {
    if (editingId) return;
    const p = point(e);
    const target = (e.target as HTMLElement).dataset;
    const sel = selectedId ? layerOf(selectedId) : undefined;
    if (sel && target.handle) {
      if (sel.locked) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = target.handle === "rotate" ? { kind: "rotate", id: sel.id } : { kind: "resize", id: sel.id, handle: target.handle as Handle, sx: p.x, sy: p.y, box: { x: sel.x, y: sel.y, w: sel.w, h: sel.h }, keep: e.shiftKey || sel.kind === "image" };
      return;
    }
    const hit = hitTest(shown, p.x, p.y);
    if (!hit) {
      onSelect(null);
      return;
    }
    // Double-tap / double-clic sur un texte : édition sur place.
    const now = Date.now();
    if ((hit.kind === "text" || hit.kind === "button") && lastTap.current?.id === hit.id && now - lastTap.current.at < 350 && !hit.locked) {
      lastTap.current = null;
      onSelect(hit.id);
      onEditText(hit.id);
      return;
    }
    lastTap.current = { id: hit.id, at: now };
    onSelect(hit.id);
    if (hit.locked) return;
    overlay.current!.setPointerCapture(e.pointerId);
    drag.current = { kind: "move", id: hit.id, sx: p.x, sy: p.y, ox: hit.x, oy: hit.y };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    const l = doc.layers.find((x) => x.id === d.id);
    if (!l) return;
    let patch: Partial<Layer> = {};
    if (d.kind === "move") {
      const nx = d.ox + (p.x - d.sx);
      const ny = d.oy + (p.y - d.sy);
      const s = e.altKey ? { dx: 0, dy: 0, guides: [] } : snapBox(doc, { x: nx, y: ny, w: l.w, h: l.h }, l.id, 8 / scale);
      setGuides(s.guides);
      patch = { x: Math.round(nx + s.dx), y: Math.round(ny + s.dy) };
    } else if (d.kind === "resize") {
      const b = resizeBox(d.box, d.handle, p.x - d.sx, p.y - d.sy, d.keep !== e.shiftKey ? true : d.keep);
      patch = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
    } else patch = { rotation: angleAt(l, p.x, p.y, e.shiftKey || touch) };
    setLive({ ...doc, layers: doc.layers.map((x) => (x.id === d.id ? ({ ...x, ...patch } as Layer) : x)) });
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    if (!d || !live) {
      setLive(null);
      return;
    }
    const after = live.layers.find((x) => x.id === d.id)!;
    const before = doc.layers.find((x) => x.id === d.id)!;
    setLive(null);
    if (d.kind === "move" && (after.x !== before.x || after.y !== before.y)) onCommit([{ op: "move", id: d.id, x: after.x, y: after.y }]);
    else if (d.kind === "resize" && (after.w !== before.w || after.h !== before.h || after.x !== before.x || after.y !== before.y)) onCommit([{ op: "resize", id: d.id, x: after.x, y: after.y, w: after.w, h: after.h }]);
    else if (d.kind === "rotate" && after.rotation !== before.rotation) onCommit([{ op: "rotate", id: d.id, rotation: after.rotation }]);
  };

  const sel = selectedId ? shown.layers.find((l) => l.id === selectedId) : undefined;
  const hs = touch ? 26 : 12;
  const W = shown.width * scale;
  const H = shown.height * scale;
  return (
    <div className="relative select-none" style={{ width: W, height: H }}>
      <canvas ref={canvas} width={shown.width} height={shown.height} style={{ width: W, height: H }} className="block rounded-[2px] shadow-[0_8px_40px_rgba(0,0,0,0.18)]" aria-label="Aperçu de la publicité" />
      <div
        ref={overlay}
        className="absolute inset-0 touch-none"
        style={{ cursor: drag.current?.kind === "move" ? "grabbing" : "default" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={(e) => {
          const p = point(e);
          const hit = hitTest(shown, p.x, p.y);
          if (hit && (hit.kind === "text" || hit.kind === "button") && !hit.locked) {
            onSelect(hit.id);
            onEditText(hit.id);
          }
        }}
        data-testid="ad-canvas"
      >
        {/* Zones de sécurité de la plateforme (repères discrets). */}
        <div className="pointer-events-none absolute border border-dashed border-sky-400/40" style={{ left: shown.safe.side * scale, top: shown.safe.top * scale, right: shown.safe.side * scale, bottom: shown.safe.bottom * scale }} />
        {guides.map((g, i) => (
          <div key={i} className="pointer-events-none absolute bg-fuchsia-500" style={g.axis === "x" ? { left: g.at * scale, top: 0, width: 1, height: H } : { top: g.at * scale, left: 0, height: 1, width: W }} />
        ))}
        {sel && sel.visible && !editingId && (
          <div
            className="absolute"
            style={{ left: sel.x * scale, top: sel.y * scale, width: sel.w * scale, height: sel.h * scale, transform: sel.rotation ? `rotate(${sel.rotation}deg)` : undefined, transformOrigin: "center", outline: `2px solid ${sel.locked ? "#9ca3af" : "#7c3aed"}`, outlineOffset: 1, pointerEvents: "none" }}
            data-testid="selection"
          >
            {!sel.locked && (
              <>
                {HANDLES.map((h) => {
                  const pos = handlePos(h, sel.w * scale, sel.h * scale);
                  return <span key={h} data-handle={h} className="absolute rounded-full border-2 border-violet-600 bg-white" style={{ left: pos.x - hs / 2, top: pos.y - hs / 2, width: hs, height: hs, cursor: CURSOR[h], pointerEvents: "auto", touchAction: "none" }} />;
                })}
                <span data-handle="rotate" title="Pivoter" className="absolute rounded-full border-2 border-violet-600 bg-violet-600" style={{ left: (sel.w * scale) / 2 - hs / 2, top: -hs * 2.6, width: hs, height: hs, cursor: "grab", pointerEvents: "auto", touchAction: "none" }} />
                <span className="absolute w-px bg-violet-600" style={{ left: (sel.w * scale) / 2, top: -hs * 1.6, height: hs * 1.6 }} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Zone de saisie posée sur le texte édité (même police, même taille à l'échelle) ; Entrée ou clic ailleurs valide. */
export function InlineText({ layer, scale, onDone }: { layer: Extract<Layer, { kind: "text" | "button" }>; scale: number; onDone: (text: string | null) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [v, setV] = useState(layer.text);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const size = layer.font.size * scale;
  return (
    <textarea
      ref={ref}
      value={v}
      aria-label="Texte"
      data-testid="inline-text"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDone(null);
        if (e.key === "Enter" && (layer.kind === "button" || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onDone(v);
        }
      }}
      className="absolute z-10 resize-none rounded-sm border-2 border-violet-600 bg-white/90 p-0 text-black outline-none"
      style={{ left: layer.x * scale, top: layer.y * scale, width: Math.max(layer.w * scale, 120), minHeight: Math.max(layer.h * scale, size * 1.4), fontSize: Math.max(size, 14), lineHeight: 1.1, fontWeight: layer.font.weight, textAlign: layer.kind === "text" ? layer.align : "center" }}
    />
  );
}
