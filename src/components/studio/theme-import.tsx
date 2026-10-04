"use client";
/** Import du thème Shopify du client (ZIP) et rapport d'analyse : pages, sections, réglages, points d'attention. */
import { useRef, useState } from "react";
import { FileArchive, Layers, TriangleAlert, Upload } from "lucide-react";
import { api, Badge, Button, Modal, useToast } from "../ui";
import type { ImportReport } from "@/lib/theme/import";
import { useT } from "../i18n";

export function ThemeImportModal({ open, onClose, projectId, onImported, report: existing }: { open: boolean; onClose: () => void; projectId: string; onImported: () => void; report?: ImportReport | null }) {
  const toast = useToast();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const shown = report ?? existing ?? null;
  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) return toast("bad", t("Choisissez le fichier .zip du thème téléchargé depuis Shopify.", "Choose the theme .zip file downloaded from Shopify."));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("theme", f);
      const r = await api<{ report: ImportReport; number: number }>(`/api/projects/${projectId}/theme/import`, { form: fd });
      setReport(r.report);
      onImported();
      toast("ok", t(`Thème « ${r.report.name} » importé (version ${r.number}) : vous pouvez le modifier dans le studio.`, `Theme “${r.report.name}” imported (version ${r.number}): you can edit it in the studio.`));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <Modal open={open} onClose={() => { setReport(null); onClose(); }} title={shown ? t(`Analyse du thème « ${shown.name} »`, `Analysis of the “${shown.name}” theme`) : t("Importer mon thème Shopify", "Import my Shopify theme")} wide>
      {!shown ? (
        <div className="grid gap-4 text-sm">
          <p className="text-ink-2">{t("Le studio lit votre thème, le découpe en pages, sections, blocs et réglages, puis vous le modifiez ici comme dans l'éditeur Shopify : réorganiser, ajouter ou supprimer des sections, changer les textes et les couleurs, ou demander des améliorations en discutant. Chaque modification crée une version restaurable, et l'export redonne un thème complet à réimporter dans Shopify.", "The studio reads your theme and breaks it down into pages, sections, blocks and settings. You then edit it here just like in the Shopify editor: reorder, add or remove sections, change text and colors, or ask for improvements in the chat. Every change creates a version you can restore, and the export gives you a complete theme to re-upload to Shopify.")}</p>
          <ol className="grid gap-1.5 rounded-2xl bg-paper-2 p-4 text-ink-2">
            <li><strong className="text-ink">1.</strong> {t("Dans Shopify :", "In Shopify:")} <em>{t("Boutique en ligne › Thèmes", "Online Store › Themes")}</em>.</li>
            <li><strong className="text-ink">2.</strong> {t("Sur votre thème : bouton", "On your theme: the")} <em>…</em> {t("›", "button ›")} <em>{t("Télécharger le fichier du thème", "Download theme file")}</em>. {t("Shopify vous l'envoie par e-mail.", "Shopify emails it to you.")}</li>
            <li><strong className="text-ink">3.</strong> {t("Déposez ici le fichier .zip reçu.", "Drop the .zip file you received here.")}</li>
          </ol>
          <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }} disabled={busy} className="grid place-items-center gap-2 rounded-3xl border-2 border-dashed border-line p-8 text-center hover:border-ink disabled:opacity-60">
            {busy ? <span className="text-sm">{t("Analyse du thème en cours…", "Analyzing the theme…")}</span> : <><Upload className="size-6 text-signal" /><span className="font-medium">{t("Choisir ou déposer le fichier .zip du thème", "Choose or drop the theme .zip file")}</span><span className="text-xs text-muted">{t("Thèmes Online Store 2.0 (Dawn, Sense, Prestige, Impulse…), 60 Mo au plus", "Online Store 2.0 themes (Dawn, Sense, Prestige, Impulse…), 60 MB max")}</span></>}
          </button>
          <p className="text-xs text-muted">{t("Votre thème actuel du studio reste disponible dans l'historique des versions.", "Your current studio theme remains available in the version history.")}</p>
        </div>
      ) : (
        <Report r={shown} onClose={() => { setReport(null); onClose(); }} />
      )}
    </Modal>
  );
}

function Report({ r, onClose }: { r: ImportReport; onClose: () => void }) {
  const t = useT();
  const settingsCount = r.settingsGroups.reduce((n, g) => n + g.settings, 0);
  return (
    <div className="grid gap-5 text-sm">
      <div className="flex flex-wrap gap-2">
        {r.version && <Badge tone="neutral">{t("Version", "Version")} {r.version}</Badge>}
        {r.author && <Badge tone="neutral">{r.author}</Badge>}
        <Badge tone="ok">{t(`${r.files.jsonTemplates} pages découpées`, `${r.files.jsonTemplates} pages parsed`)}</Badge>
        <Badge tone="ok">{t(`${r.files.sections} sections`, `${r.files.sections} sections`)}</Badge>
        <Badge tone="neutral">{t(`${r.files.snippets} extraits`, `${r.files.snippets} snippets`)}</Badge>
        <Badge tone="neutral">{t(`${r.files.assets} fichiers de style et médias`, `${r.files.assets} style and media files`)}</Badge>
        <Badge tone="neutral">{t(`${settingsCount} réglages généraux`, `${settingsCount} global settings`)}</Badge>
      </div>
      {r.warnings.length > 0 && (
        <div className="grid gap-1.5 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4" /> {t("Points d'attention", "Things to watch")}</p>
          <ul className="list-disc pl-5 text-xs leading-relaxed">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><Layers className="size-4 text-signal" /> {t("Pages et sections", "Pages and sections")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {r.pages.slice(0, 12).map((p) => (
            <div key={p.template} className="rounded-2xl border border-line p-3">
              <p className="font-medium">{p.label} <span className="text-xs text-muted">· {p.sections.length} section{p.sections.length > 1 ? "s" : ""}</span></p>
              <ol className="mt-1.5 grid gap-0.5 text-xs text-ink-2">
                {p.sections.map((s, i) => <li key={s.id}>{i + 1}. {s.name}{s.blocks ? ` · ${s.blocks} ${t("bloc", "block")}${s.blocks > 1 ? "s" : ""}` : ""}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><FileArchive className="size-4 text-signal" /> {t("Sections disponibles à l'ajout", "Sections available to add")}</p>
        <p className="text-xs text-ink-2">{r.sections.filter((s) => s.addable).map((s) => s.name).join(" · ") || t("Aucune section n'a de préréglage : on peut les modifier mais pas en ajouter de nouvelles.", "No section has a preset: they can be edited, but new ones can't be added.")}</p>
      </div>
      <div className="flex justify-end"><Button type="button" onClick={onClose}>{t("Modifier mon thème", "Edit my theme")}</Button></div>
    </div>
  );
}
