"use client";
/**
 * Liste réordonnable au glisser-déposer (souris et doigt) : on saisit la poignée, les autres éléments
 * s'écartent, on relâche à la nouvelle place. Le clavier garde ses boutons monter / descendre.
 */
import { useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";

export function SortableList<T extends { id: string }>({ items, onMove, render, gap = 6 }: { items: T[]; onMove: (from: number, to: number) => void; render: (item: T, index: number, handle: ReactNode, dragging: boolean) => ReactNode; gap?: number }) {
  const t = useT();
  const list = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; h: number } | null>(null);
  const state = useRef<{ from: number; to: number; startY: number; mids: number[]; h: number } | null>(null);

  const start = (i: number) => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const els = Array.from(list.current?.children ?? []) as HTMLElement[];
    const rects = els.map((el) => el.getBoundingClientRect());
    state.current = { from: i, to: i, startY: e.clientY, mids: rects.map((r) => r.top + r.height / 2), h: rects[i].height + gap };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i, dy: 0, h: rects[i].height + gap });
    e.preventDefault();
  };
  const move = (e: React.PointerEvent) => {
    const s = state.current;
    if (!s) return;
    const dy = e.clientY - s.startY;
    const center = s.mids[s.from] + dy;
    let to = s.from;
    s.mids.forEach((m, j) => {
      if (j < s.from && center < m) to = Math.min(to, j);
      if (j > s.from && center > m) to = Math.max(to, j);
    });
    s.to = to;
    setDrag({ from: s.from, to, dy, h: s.h });
  };
  const end = () => {
    const s = state.current;
    state.current = null;
    if (s && s.to !== s.from) onMove(s.from, s.to);
    setDrag(null);
  };

  return (
    <ul ref={list} className="grid" style={{ gap }}>
      {items.map((item, i) => {
        let shift = 0;
        if (drag && i !== drag.from) {
          if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -drag.h;
          if (drag.from > drag.to && i < drag.from && i >= drag.to) shift = drag.h;
        }
        const isDragged = drag?.from === i;
        const handle = (
          <button type="button" onPointerDown={start(i)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-full text-muted hover:bg-paper-2 active:cursor-grabbing" aria-label={t("Glisser pour déplacer", "Drag to move")} title={t("Glisser pour déplacer", "Drag to move")}>
            <GripVertical className="size-4" />
          </button>
        );
        return (
          <li
            key={item.id}
            className={cx("relative", isDragged ? "z-10" : "transition-transform duration-200")}
            style={{ transform: isDragged ? `translateY(${drag!.dy}px) scale(1.02)` : shift ? `translateY(${shift}px)` : undefined }}
          >
            {render(item, i, handle, isDragged)}
          </li>
        );
      })}
    </ul>
  );
}
