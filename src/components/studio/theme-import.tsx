"use client";
/** Import du thème Shopify du client (ZIP) et rapport d'analyse : pages, sections, réglages, points d'attention. */
import { useRef, useState } from "react";
import { FileArchive, Layers, TriangleAlert, Upload } from "lucide-react";
import { api, Badge, Button, Modal, useToast } from "../ui";
import type { ImportReport } from "@/lib/theme/import";

export function ThemeImportModal({ open, onClose, projectId, onImported, report: existing }: { open: boolean; onClose: () => void; projectId: string; onImported: () => void; report?: ImportReport | null }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const shown = report ?? existing ?? null;
  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) return toast("bad", "Choisissez le fichier .zip du thème téléchargé depuis Shopify.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("theme", f);
      const r = await api<{ report: ImportReport; number: number }>(`/api/projects/${projectId}/theme/import`, { form: fd });
      setReport(r.report);
      onImported();
      toast("ok", `Thème « ${r.report.name} » importé (version ${r.number}) : vous pouvez le modifier dans le studio.`);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <Modal open={open} onClose={() => { setReport(null); onClose(); }} title={shown ? `Analyse du thème « ${shown.name} »` : "Importer mon thème Shopify"} wide>
      {!shown ? (
        <div className="grid gap-4 text-sm">
          <p className="text-ink-2">Le studio lit votre thème, le découpe en pages, sections, blocs et réglages, puis vous le modifiez ici comme dans l'éditeur Shopify : réorganiser, ajouter ou supprimer des sections, changer les textes et les couleurs, ou demander des améliorations en discutant. Chaque modification crée une version restaurable, et l'export redonne un thème complet à réimporter dans Shopify.</p>
          <ol className="grid gap-1.5 rounded-2xl bg-paper-2 p-4 text-ink-2">
            <li><strong className="text-ink">1.</strong> Dans Shopify : <em>Boutique en ligne › Thèmes</em>.</li>
            <li><strong className="text-ink">2.</strong> Sur votre thème : bouton <em>…</em> › <em>Télécharger le fichier du thème</em>. Shopify vous l'envoie par e-mail.</li>
            <li><strong className="text-ink">3.</strong> Déposez ici le fichier .zip reçu.</li>
          </ol>
          <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }} disabled={busy} className="grid place-items-center gap-2 rounded-3xl border-2 border-dashed border-line p-8 text-center hover:border-ink disabled:opacity-60">
            {busy ? <span className="text-sm">Analyse du thème en cours…</span> : <><Upload className="size-6 text-signal" /><span className="font-medium">Choisir ou déposer le fichier .zip du thème</span><span className="text-xs text-muted">Thèmes Online Store 2.0 (Dawn, Sense, Prestige, Impulse…), 60 Mo au plus</span></>}
          </button>
          <p className="text-xs text-muted">Votre thème actuel du studio reste disponible dans l'historique des versions.</p>
        </div>
      ) : (
        <Report r={shown} onClose={() => { setReport(null); onClose(); }} />
      )}
    </Modal>
  );
}

function Report({ r, onClose }: { r: ImportReport; onClose: () => void }) {
  return (
    <div className="grid gap-5 text-sm">
      <div className="flex flex-wrap gap-2">
        {r.version && <Badge tone="neutral">Version {r.version}</Badge>}
        {r.author && <Badge tone="neutral">{r.author}</Badge>}
        <Badge tone="ok">{r.files.jsonTemplates} pages découpées</Badge>
        <Badge tone="ok">{r.files.sections} sections</Badge>
        <Badge tone="neutral">{r.files.snippets} extraits</Badge>
        <Badge tone="neutral">{r.files.assets} fichiers de style et médias</Badge>
        <Badge tone="neutral">{r.settingsGroups.reduce((n, g) => n + g.settings, 0)} réglages généraux</Badge>
      </div>
      {r.warnings.length > 0 && (
        <div className="grid gap-1.5 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4" /> Points d'attention</p>
          <ul className="list-disc pl-5 text-xs leading-relaxed">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><Layers className="size-4 text-signal" /> Pages et sections</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {r.pages.slice(0, 12).map((p) => (
            <div key={p.template} className="rounded-2xl border border-line p-3">
              <p className="font-medium">{p.label} <span className="text-xs text-muted">· {p.sections.length} section{p.sections.length > 1 ? "s" : ""}</span></p>
              <ol className="mt-1.5 grid gap-0.5 text-xs text-ink-2">
                {p.sections.map((s, i) => <li key={s.id}>{i + 1}. {s.name}{s.blocks ? ` · ${s.blocks} bloc${s.blocks > 1 ? "s" : ""}` : ""}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><FileArchive className="size-4 text-signal" /> Sections disponibles à l'ajout</p>
        <p className="text-xs text-ink-2">{r.sections.filter((s) => s.addable).map((s) => s.name).join(" · ") || "Aucune section n'a de préréglage : on peut les modifier mais pas en ajouter de nouvelles."}</p>
      </div>
      <div className="flex justify-end"><Button type="button" onClick={onClose}>Modifier mon thème</Button></div>
    </div>
  );
}
