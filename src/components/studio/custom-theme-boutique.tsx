"use client";
/**
 * Thème sur mesure dans l'onglet Boutique (demande du propriétaire du 9 novembre 2026 : « la sélection des éléments à
 * changer doit se faire dans l'onglet Boutique pour que le client le voie en plus grand ») : le thème monté par SINA en
 * grand (pages, ordinateur ou téléphone), le client DÉSIGNE un élément (titre, texte, bouton, image, section), écrit ce
 * qu'il veut, et sa demande part à SINA, qui ne change que cet élément. L'aperçu se recharge à chaque nouvelle version.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, ExternalLink, Monitor, Send, Smartphone, Store, X } from "lucide-react";
import { api, Button, cx, useApi } from "../ui";
import { useT } from "../i18n";
import { useAgentPanel } from "./agent-ui-context";

export type CustomThemeInfo = { rev: number; family: string; style: string; chosen: boolean; pages: { key: string; label: string }[]; sampleTexts: boolean; /** Repère des photos du catalogue : l'aperçu se recharge dès qu'un produit reçoit sa photo. */ photos?: string } | null;
type Picked = { uid: string; page: string | null; kind: string; path: string | null; text: string | null; src: string | null; role: string | null };

const DESKTOP_W = 1280;

/** Message envoyé à SINA pour un élément désigné (format lu par SINA, voir la consigne de l'étape 6). */
export function designationMessage(p: Picked, pageLabel: string, ask: string): string {
  const where = [`section ${p.uid}`, p.page ? `page ${pageLabel}` : "", p.kind, p.path ? `adresse ${p.path}` : "", p.src ? `photo ${p.src}` : "", p.text ? `« ${p.text.slice(0, 160)} »` : ""].filter(Boolean).join(" · ");
  return `[Élément désigné · ${where}] ${ask.trim()}`;
}

export function CustomThemeBoutique({ projectId, onShowStore }: { projectId: string; onShowStore?: () => void }) {
  const t = useT();
  const { data: info, reload } = useApi<CustomThemeInfo>(`/api/projects/${projectId}/custom-theme/info`);
  const { setOpen: openSina } = useAgentPanel();
  const frame = useRef<HTMLIFrameElement>(null), box = useRef<HTMLDivElement>(null);
  // Lot 4 : le clic désigne tout de suite (« le client clique sur n'importe quel élément ») ; « Naviguer » rend les liens.
  const [page, setPage] = useState<string | null>(null), [phone, setPhone] = useState(false), [picking, setPicking] = useState(true);
  const [picked, setPicked] = useState<Picked | null>(null), [ask, setAsk] = useState(""), [sending, setSending] = useState(false), [sent, setSent] = useState(""), [error, setError] = useState("");
  const [boxW, setBoxW] = useState(0);
  // Nouvelle version (SINA a modifié le thème) : relecture régulière, l'aperçu se recharge sur la page en cours.
  useEffect(() => { const h = setInterval(() => reload(), 5000); return () => clearInterval(h); }, [reload]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const post = useCallback((m: object) => frame.current?.contentWindow?.postMessage({ source: "ct-studio", ...m }, "*"), []);
  const current = page ?? info?.pages[0]?.key ?? "home";
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "ct-preview" || e.source !== frame.current?.contentWindow) return;
      if (d.type === "ready") { post({ type: "go", page: current }); if (picking) post({ type: "pick", on: true }); }
      if (d.type === "page" && typeof d.page === "string") setPage(d.page);
      if (d.type === "picked") { setPicked({ uid: String(d.uid), page: d.page ?? null, kind: String(d.kind), path: d.path ?? null, text: d.text ?? null, src: d.src ?? null, role: d.role ?? null }); setSent(""); }
    };
    addEventListener("message", on);
    return () => removeEventListener("message", on);
  }, [current, picking, post]);
  if (!info) return null;
  const label = (k: string | null) => info.pages.find((p) => p.key === k)?.label ?? k ?? "";
  const scale = !phone && boxW > 0 && boxW < DESKTOP_W ? boxW / DESKTOP_W : 1;
  const height = 760;

  async function send() {
    if (!picked || !ask.trim() || !info) return;
    setSending(true); setError("");
    try {
      const view = await api<{ conversationId: string }>("/api/syna/open", { body: { projectId } });
      await api(`/api/syna/${view.conversationId}`, { body: { requestId: crypto.randomUUID(), text: designationMessage(picked, label(picked.page), ask), attachmentIds: [] } });
      // Le fil de SINA s'ouvre et se relit : le client suit la modification en direct.
      openSina(true);
      window.dispatchEvent(new CustomEvent("syna:refresh"));
      setSent(ask.trim()); setAsk(""); setPicked(null); post({ type: "unpick" });
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }

  return (
    <div className="space-y-3" data-custom-theme-boutique>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("Ton site", "Your site")}{info.chosen ? ` · ✓ ${t("validé", "approved")}` : ""}</h2>
          <p className="text-xs text-muted">{t("Clique sur ce que tu veux changer (un titre, un texte, une photo, un bouton, un détail) et dis-le à SINA : elle ne modifie que lui.", "Click anything you want changed and tell SINA: she only changes that.")}{info.sampleTexts ? ` ${t("Des textes et des photos d'exemple restent à remplacer.", "Some sample texts and photos remain.")}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onShowStore && <Button size="sm" variant="ghost" onClick={onShowStore}><Store className="size-3.5" /> {t("Boutique actuelle", "Current store")}</Button>}
          <a className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs hover:border-ink" href={`/api/projects/${projectId}/custom-theme?rev=${info.rev}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> {t("Ouvrir en grand", "Open full size")}</a>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("Pages du site", "Site pages")}>
          {info.pages.map((p) => <button key={p.key} type="button" role="tab" aria-selected={p.key === current} className={cx("rounded-full border px-3 py-1 text-xs", p.key === current ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")} onClick={() => { setPage(p.key); post({ type: "go", page: p.key }); }}>{p.label}</button>)}
        </div>
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" aria-pressed={!phone} className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs", !phone ? "border-ink bg-ink text-paper" : "border-line bg-card")} onClick={() => setPhone(false)}><Monitor className="size-3.5" /> {t("Ordinateur", "Desktop")}</button>
        <button type="button" aria-pressed={phone} className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs", phone ? "border-ink bg-ink text-paper" : "border-line bg-card")} onClick={() => setPhone(true)}><Smartphone className="size-3.5" /> {t("Téléphone", "Phone")}</button>
        <span className="mx-1 h-5 w-px bg-line" />
        <Button size="sm" variant={picking ? "primary" : "secondary"} onClick={() => { const on = !picking; setPicking(on); post({ type: "pick", on }); }} data-ct-pick>
          <Crosshair className="size-3.5" /> {picking ? t("Clic = modifier (touche ici pour naviguer)", "Click = edit (tap here to browse)") : t("Naviguer (touche ici pour modifier en cliquant)", "Browsing (tap here to edit by clicking)")}
        </Button>
      </div>
      {picked && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/30 bg-paper-2 p-3 text-sm" data-ct-picked>
        <p className="w-full"><b>{t("Élément désigné", "Selected element")}</b> : {picked.kind}{picked.page ? ` (${label(picked.page)})` : ""}{picked.text ? ` · « ${picked.text.slice(0, 120)} »` : ""}</p>
        <input className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2" autoFocus value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} placeholder={t("Que veux-tu changer ? (texte, photo, couleur, taille, retirer…)", "What should change?")} aria-label={t("Ce que tu veux changer", "What to change")} />
        <Button size="sm" disabled={sending || !ask.trim()} onClick={() => void send()}><Send className="size-3.5" /> {t("Envoyer à SINA", "Send to SINA")}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setPicked(null); post({ type: "unpick" }); }} aria-label={t("Retirer la désignation", "Clear selection")}><X className="size-3.5" /></Button>
      </div>}
      {sent && <p className="text-xs text-muted" data-ct-sent>✓ {t(`Demande envoyée à SINA : « ${sent} ». L'aperçu se met à jour dès qu'elle a fini.`, `Sent to SINA: “${sent}”.`)}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div ref={box} className="overflow-hidden rounded-2xl border border-line bg-paper-2" style={{ height }}>
        <div className="mx-auto h-full" style={{ width: phone ? 390 : "100%" }}>
          <iframe ref={frame} key={`${info.rev}:${info.photos ?? ""}`} title={t("Ton site", "Your site")} src={`/api/projects/${projectId}/custom-theme?studio=1&embed=1&rev=${info.rev}${info.photos ? `&ph=${info.photos}` : ""}`}
            className="block border-0 bg-white" style={phone ? { width: 390, height } : { width: DESKTOP_W, height: height / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }} />
        </div>
      </div>
    </div>
  );
}
