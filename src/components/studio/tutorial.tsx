"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, PlayCircle, X } from "lucide-react";
import { cx, Modal } from "../ui";
import { useLang, useT } from "../i18n";
import { TUTORIALS, TUTORIAL_IDS, tutorialBusiness, tutorialFile, tutorialFor, type TutorialId, type TutorialTiming } from "@/lib/tutorials";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SEEN = (id: string) => `ecs-tuto-seen-${id}`;

/** Bouton « Tutoriel » de l'en-tête du studio, et conseil de première visite sous l'en-tête. */
export function TutorialButton({ tab, business }: { tab: string; business?: "products" | "services" }) {
  const t = useT();
  const id = tutorialFor(tab, business);
  const [open, setOpen] = useState<TutorialId | null>(null);
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (!id) return;
    try { setNudge(!localStorage.getItem(SEEN(id))); } catch { setNudge(false); }
  }, [id]);
  if (!id || !TUTORIALS[id].steps.length) return null;
  const seen = () => { try { localStorage.setItem(SEEN(id), "1"); } catch {} setNudge(false); };
  const show = () => { seen(); setOpen(id); };
  return (
    <>
      <button type="button" onClick={show} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-medium transition hover:border-ink" title={t("Comment fonctionne cet onglet ? Vidéo de 1 à 2 minutes", "How does this tab work? 1–2 minute video")}>
        <PlayCircle className="size-4 text-signal" aria-hidden />
        <span className="hidden md:inline">{t("Tutoriel", "Tutorial")}</span>
        <span className="sr-only md:hidden">{t("Tutoriel", "Tutorial")}</span>
      </button>
      {/* Portail : l'en-tête floute son fond (backdrop-filter), ce qui piégerait un élément « fixed » à l'intérieur. */}
      {nudge && createPortal(<TutorialNudge id={id} onWatch={show} onClose={seen} />, document.body)}
      {open && createPortal(<TutorialPlayer id={open} business={business} onPick={setOpen} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

/** Entrée « Tutoriels » du menu latéral : ouvre le tutoriel de l'onglet affiché (ou celui du Pilote), avec la liste des autres. */
export function TutorialsMenuLink({ tab, business, folded }: { tab: string; business?: "products" | "services"; folded?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState<TutorialId | null>(null);
  const start = (): TutorialId => {
    const id = tutorialFor(tab, business);
    return id && TUTORIALS[id].steps.length ? id : "pilote";
  };
  const label = t("Tutoriels vidéo", "Video tutorials");
  return (
    <>
      <button type="button" onClick={() => setOpen(start())} title={folded ? label : undefined} aria-label={folded ? label : undefined} className={cx("flex items-center gap-3 rounded-xl py-2 text-left text-ink-2 hover:bg-paper-2", folded ? "justify-center" : "px-3")}>
        <GraduationCap className="size-4 shrink-0" />{!folded && ` ${label}`}
      </button>
      {open && createPortal(<TutorialPlayer id={open} business={business} onPick={setOpen} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

function TutorialNudge({ id, onWatch, onClose }: { id: TutorialId; onWatch: () => void; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div data-tuto-nudge className="fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal"><GraduationCap className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("Première visite ?", "First time here?")}</p>
        <p className="mt-0.5 text-sm text-muted">{t(`Le tutoriel « ${TUTORIALS[id].title.fr} » montre l'essentiel en vidéo.`, `The "${TUTORIALS[id].title.en}" tutorial shows the essentials on video.`)}</p>
        <button type="button" onClick={onWatch} className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink"><PlayCircle className="size-4" aria-hidden /> {t("Regarder", "Watch")}</button>
      </div>
      <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink" aria-label={t("Masquer", "Dismiss")} lang={lang}><X className="size-4" /></button>
    </div>
  );
}

/** Lecteur : vidéo, étapes cliquables (guide écrit), questions fréquentes et autres tutoriels. */
export function TutorialPlayer({ id, business, onPick, onClose }: { id: TutorialId; business?: "products" | "services"; onPick: (id: TutorialId) => void; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const L = lang === "en" ? "en" : "fr";
  const def = TUTORIALS[id];
  const video = useRef<HTMLVideoElement>(null);
  const [timing, setTiming] = useState<TutorialTiming | null>(null);
  const [missing, setMissing] = useState(false);
  const [unplayable, setUnplayable] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setTiming(null); setMissing(false); setUnplayable(false); setNow(0);
    let alive = true;
    fetch(tutorialFile(id, L, "json")).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => alive && setTiming(j)).catch(() => alive && setMissing(true));
    return () => { alive = false; };
  }, [id, L]);
  const current = timing ? timing.steps.reduce((acc, s, i) => (now >= s ? i : acc), -1) : -1;
  // La liste des étapes suit la vidéo : l'étape en cours reste visible dans sa colonne (sans faire défiler la fenêtre).
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = list.current;
    const el = box?.querySelector<HTMLElement>(`[data-step="${current}"]`);
    if (!box || !el) return;
    if (box.scrollHeight > box.clientHeight + 1) {
      // Ordinateur : la colonne des étapes défile seule, à côté de la vidéo.
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      if (top < box.scrollTop + 24 || top + el.offsetHeight > box.scrollTop + box.clientHeight - 24) box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: "smooth" });
      return;
    }
    // Téléphone : la vidéo reste en haut ; la fenêtre suit l'étape en cours si l'on suivait déjà les étapes (étape précédente visible).
    const dlg = box.closest<HTMLElement>("[role=dialog]");
    const sticky = dlg?.querySelector<HTMLElement>("[data-tuto-video]");
    if (!dlg || !sticky) return;
    const floor = sticky.getBoundingClientRect().bottom + 8;
    const ceil = dlg.getBoundingClientRect().bottom - 8;
    const prev = box.querySelector<HTMLElement>(`[data-step="${current - 1}"]`)?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const following = !prev || (prev.bottom > floor && prev.top < ceil);
    if (following && (r.top < floor || r.bottom > ceil)) dlg.scrollBy({ top: r.top - floor, behavior: "smooth" });
  }, [current]);
  const seek = (i: number) => {
    const v = video.current;
    if (!v || !timing) return;
    v.currentTime = timing.steps[i];
    void v.play().catch(() => {});
  };
  // Les autres tutoriels utiles à ce type de projet.
  const others = TUTORIAL_IDS.filter((x) => x !== id && TUTORIALS[x].steps.length && (business === "services" ? x !== "produit" && x !== "boutique" : tutorialBusiness(x) === "products"));
  return (
    <Modal open onClose={onClose} title={`${t("Tutoriel", "Tutorial")} · ${def.title[L]}`} xl>
      <p className="-mt-2 mb-4 text-sm text-muted">{def.summary[L]}</p>
      {/* Vidéo et étapes côte à côte, toujours visibles ensemble : la colonne des étapes a la hauteur de la vidéo et défile seule
          (elle suit l'étape en cours) ; sur téléphone, la vidéo reste en haut pendant qu'on fait défiler les étapes. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div data-tuto-video className="sticky -top-5 z-10 -mx-5 min-w-0 bg-card px-5 pb-2 sm:-top-7 sm:-mx-7 sm:px-7 lg:static lg:mx-0 lg:px-0 lg:pb-0">
          {unplayable && !missing ? (
            <div className="grid aspect-[16/10] place-items-center rounded-2xl border border-dashed border-line bg-paper-2 p-6 text-center text-sm text-muted">
              <p>{t("Ce navigateur ne lit pas la vidéo ici.", "This browser can't play the video here.")} <a href={tutorialFile(id, L, "mp4")} target="_blank" rel="noreferrer" className="font-medium text-signal underline underline-offset-4">{t("Ouvrir la vidéo", "Open the video")}</a></p>
            </div>
          ) : missing ? (
            <div className="grid aspect-[16/10] place-items-center rounded-2xl border border-dashed border-line bg-paper-2 p-6 text-center text-sm text-muted">{t("La vidéo de cet onglet arrive bientôt. En attendant, suivez les étapes écrites ci-contre.", "The video for this tab is coming soon. Meanwhile, follow the written steps alongside.")}</div>
          ) : (
            <video key={`${id}-${L}`} ref={video} src={tutorialFile(id, L, "mp4")} poster={tutorialFile(id, L, "jpg")} controls autoPlay playsInline preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onError={() => setUnplayable(true)} className="aspect-[16/10] max-h-[45dvh] w-full rounded-2xl border border-line bg-[#0A1024] object-contain lg:max-h-[calc(92dvh-12rem)]">
              {t("Votre navigateur ne lit pas cette vidéo.", "Your browser can't play this video.")}
            </video>
          )}
        </div>
        <div className="relative min-w-0">
          <div ref={list} className="flex flex-col lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted">{t("Les étapes", "Steps")}</p>
          <ol className="grid gap-1.5 pb-1">
            {def.steps.map((s, i) => (
              <li key={i} data-step={i}>
                <button type="button" onClick={() => seek(i)} disabled={!timing} className={cx("flex w-full gap-3 rounded-xl border p-2.5 text-left text-sm transition", current === i ? "border-signal bg-signal-soft" : "border-transparent hover:bg-paper-2", !timing && "cursor-default")}>
                  <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", current === i ? "bg-signal text-signal-ink" : "bg-paper-2 text-ink-2")}>{i + 1}</span>
                  <span className="min-w-0 flex-1 leading-snug">{s[L]}</span>
                  {timing && <span className="shrink-0 text-xs tabular-nums text-muted">{fmt(timing.steps[i])}</span>}
                </button>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </div>
      {def.faq?.length ? (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted">{t("Vous bloquez ?", "Stuck?")}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {def.faq.map((f, i) => (
              <details key={i} className="group rounded-2xl border border-line p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold">{f.q[L]}</summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.a[L]}</p>
              </details>
            ))}
          </div>
        </div>
      ) : null}
      {others.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted">{t("Les autres tutoriels", "Other tutorials")}</p>
          <div className="flex flex-wrap gap-2">
            {others.map((x) => (
              <button key={x} type="button" onClick={() => onPick(x)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink"><PlayCircle className="size-3.5 text-signal" aria-hidden /> {TUTORIALS[x].title[L]}</button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
