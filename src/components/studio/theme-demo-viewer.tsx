"use client";
import { Check, Laptop, Lock, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ThemeDemoStatus } from "@/lib/theme/theme-demos";
import type { DirectionCard } from "@/lib/theme/directions";
import { Button, cx } from "../ui";
import { useT } from "../i18n";

const DESKTOP_W = 1280;
const MOBILE_W = 390;

/**
 * Démo intégrale d'un thème, en plein écran : la boutique de démonstration complète (nos produits, visuels, logos et
 * textes), navigable page par page, en ordinateur ou en téléphone. Rien n'est envoyé au projet pendant la visite :
 * le seul geste qui le modifie est « Choisir ce thème », qui passe par le parcours habituel (nouvelle version restaurable).
 */
export function ThemeDemoViewer({ theme, status, onClose, onChoose, choosing, current, blocked }: { theme: DirectionCard; status: ThemeDemoStatus; onClose: () => void; onChoose?: () => void; choosing?: boolean; current?: boolean; blocked?: string | null }) {
  const t = useT();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [page, setPage] = useState(status.pages[0]?.file ?? "accueil.html");
  const [src, setSrc] = useState(`/api/theme-demos/${theme.id}/${page}`);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    // Échap ferme la démo seule (la galerie des thèmes reste ouverte derrière).
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); closeRef.current(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const switchDevice = (d: "desktop" | "mobile") => { setDevice(d); setSrc(`/api/theme-demos/${theme.id}/${page}`); };
  const go = (file: string) => { setPage(file); setSrc(`/api/theme-demos/${theme.id}/${file}?p=${Date.now()}`); };
  // Page réellement affichée (navigation par les menus et liens de la démo) : le sélecteur suit.
  const onLoad = () => {
    try {
      const file = frame.current?.contentWindow?.location.pathname.split("/").pop();
      if (file && status.pages.some((p) => p.file === file)) setPage(file);
    } catch { /* page hors démo : le sélecteur garde sa valeur */ }
  };

  const mobile = device === "mobile";
  const scale = mobile ? 1 : Math.min(1, size.w / DESKTOP_W || 1);
  const frameW = mobile ? Math.min(MOBILE_W, size.w) : size.w >= DESKTOP_W ? size.w : DESKTOP_W;
  const frameH = mobile ? size.h : size.h / scale;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-paper" role="dialog" aria-modal="true" aria-label={t(`Démo complète du thème ${theme.name}`, `Full demo of the ${theme.name} theme`)} data-theme-demo={theme.id}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-3 py-2 sm:px-4">
        <div className="order-1 min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold sm:text-lg">{t("Démo complète", "Full demo")} · {theme.name}{status.title && status.title.toLowerCase() !== theme.name.toLowerCase() ? <span className="font-normal text-muted"> · {status.title}</span> : null}</p>
          <p className="text-xs text-muted sm:truncate" data-demo-note>{t("Contenus de démonstration : votre projet n'est pas modifié pendant la visite.", "Demo content: your project is not changed while you browse.")}</p>
        </div>
        <button type="button" onClick={onClose} className="order-2 grid size-9 shrink-0 place-items-center rounded-full border border-line bg-card hover:border-ink sm:order-4" aria-label={t("Fermer la démo", "Close the demo")} autoFocus><X className="size-4" aria-hidden /></button>
        <div className="order-3 flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="theme-demo-page">{t("Page de la démo", "Demo page")}</label>
          <select id="theme-demo-page" value={page} onChange={(e) => go(e.target.value)} className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm sm:max-w-[260px] sm:flex-none" data-demo-pages>
            {status.pages.map((p) => <option key={p.file} value={p.file}>{p.label}</option>)}
          </select>
          <div className="inline-flex rounded-full border border-line p-0.5" role="group" aria-label={t("Affichage", "Display")}>
            <button type="button" aria-pressed={!mobile} onClick={() => switchDevice("desktop")} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs", !mobile ? "bg-ink text-paper" : "text-ink-2")} data-device="desktop"><Laptop className="size-4" aria-hidden /> <span className="hidden sm:inline">{t("Ordinateur", "Desktop")}</span><span className="sr-only sm:hidden">{t("Ordinateur", "Desktop")}</span></button>
            <button type="button" aria-pressed={mobile} onClick={() => switchDevice("mobile")} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs", mobile ? "bg-ink text-paper" : "text-ink-2")} data-device="mobile"><Smartphone className="size-4" aria-hidden /> <span className="hidden sm:inline">{t("Téléphone", "Phone")}</span><span className="sr-only sm:hidden">{t("Téléphone", "Phone")}</span></button>
          </div>
          {current ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-signal/10 px-3 text-sm font-medium"><Check className="size-4" aria-hidden /> {t("Thème actuel", "Current theme")}</span>
          ) : blocked ? (
            <span className="inline-flex w-full items-start gap-1.5 rounded-2xl bg-paper-2 px-3 py-1.5 text-xs text-muted sm:w-auto sm:max-w-[340px]" data-demo-blocked><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {blocked}</span>
          ) : onChoose ? (
            <Button size="sm" onClick={onChoose} disabled={choosing} loading={choosing} data-choose-theme={theme.id}>{t("Choisir ce thème", "Choose this theme")}</Button>
          ) : null}
        </div>
      </div>
      <div ref={box} className={cx("relative min-h-0 flex-1 overflow-hidden", mobile ? "bg-paper-2 py-3" : "bg-white")}>
        {size.w > 0 && (
          <div className={cx("mx-auto h-full overflow-hidden bg-white", mobile && "rounded-[28px] border border-line shadow-soft")} style={{ width: mobile ? frameW : size.w }}>
            <iframe
              ref={frame}
              key={device}
              src={src}
              onLoad={onLoad}
              title={t(`Boutique de démonstration ${theme.name}`, `${theme.name} demo store`)}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="block origin-top-left border-0 bg-white"
              style={{ width: frameW, height: mobile ? frameH - 24 : frameH, transform: scale < 1 ? `scale(${scale})` : undefined }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
