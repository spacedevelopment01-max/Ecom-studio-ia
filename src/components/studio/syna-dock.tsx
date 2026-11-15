"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { useT } from "../i18n";
import { useAgentPanel, useAgentUi } from "./agent-ui-context";
import { SynaThread } from "./syna-thread";

/** Interface classique : le bouton « SINA » ouvre le fil de SINA, le même que dans sa coquille. Fermé à l'arrivée sur un projet. */
export function SynaDock({ projectId }: { projectId: string }) {
  const enabled = useAgentUi(), t = useT(), { open, setOpen } = useAgentPanel();
  const [desktop, setDesktop] = useState(false), [readyProject, setReadyProject] = useState<string | null>(null), [hasOpened, setHasOpened] = useState(false);
  const button = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  useEffect(() => { const media = window.matchMedia("(min-width:1280px)"), update = () => setDesktop(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  useEffect(() => { setOpen(false); setHasOpened(false); setReadyProject(projectId); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && readyProject === projectId) setHasOpened(true); }, [open, readyProject, projectId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    if (!desktop) document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
      if (e.key === "Tab" && !desktop) {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') ?? []).filter((el) => el.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keys); };
  }, [open, desktop, setOpen]);
  if (!enabled) return null;
  const close = () => { setOpen(false); button.current?.focus(); };
  return (
    <>
      <button ref={button} tabIndex={open ? -1 : undefined} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="central-agent-panel" className="fixed bottom-24 right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper shadow-soft lg:bottom-5"><MessageCircle className="size-5" />SINA</button>
      {readyProject === projectId && (open || hasOpened) && (
        <>
          {open && !desktop && <div aria-hidden="true" className="fixed inset-0 z-[80] bg-ink/20" onClick={close} />}
          <aside ref={panel} hidden={!open} style={{ display: open ? undefined : "none" }} aria-hidden={!open} role="dialog" aria-modal={desktop ? undefined : true} id="central-agent-panel" aria-label={t("SINA — conversation du projet", "SINA — project conversation")} className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-[440px] flex-col border-l border-line bg-paper shadow-2xl sm:inset-y-4 sm:right-4 sm:rounded-3xl xl:w-[400px]">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" />SINA</p>
              <button aria-label={t("Replier SINA", "Collapse SINA")} onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-paper-2"><X className="size-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden"><SynaThread key={projectId} projectId={projectId} compact /></div>
          </aside>
        </>
      )}
    </>
  );
}
