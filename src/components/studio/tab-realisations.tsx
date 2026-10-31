"use client";
/**
 * Onglet « Réalisations » (artisans : Atelier Rive, APLAT, PHASE, #239 phase 3) : chaque projet saisi une fois — titre,
 * résumé, demande, travail réalisé, catégorie, lieu et date si vous souhaitez les communiquer, photos du projet, photo
 * « avant » facultative. L'accueil, la page « Réalisations » (filtrable par catégorie) et la fiche de chaque projet les
 * affichent toutes seules, sans toucher au thème.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, Save, Send, X } from "lucide-react";
import { api, Badge, Button, Card, Empty, Input, Modal, Spinner, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { MediaPicker } from "./common";

type Status = "draft" | "published" | "withdrawn" | "archived";
type Photo = { assetId: string; alt: string };
type Real = { id: string; handle: string; title: string; summary: string; need: string; work: string; category: string; location: string; period: string; photos: Photo[]; before: Photo | null; status: Status };
const STATUS: Record<Status, { fr: string; en: string; tone: "neutral" | "ok" | "warn" | "bad" }> = {
  draft: { fr: "Brouillon", en: "Draft", tone: "neutral" }, published: { fr: "En ligne", en: "Live", tone: "ok" },
  withdrawn: { fr: "Retirée", en: "Withdrawn", tone: "warn" }, archived: { fr: "Archivée", en: "Archived", tone: "bad" },
};
const EMPTY: Omit<Real, "id" | "handle" | "status"> = { title: "", summary: "", need: "", work: "", category: "", location: "", period: "", photos: [], before: null };

export default function TabRealisations() {
  const t = useT();
  const toast = useToast();
  const { id, data: project } = useProject();
  const { data, reload } = useApi<{ realisations: Real[] }>(`/api/projects/${id}/realisations`);
  const [editing, setEditing] = useState<Partial<Real> | null>(null);
  const versionId = project?.theme?.versionId ?? null;
  const post = async (payload: Record<string, unknown>, done?: string) => {
    try { await api(`/api/projects/${id}/realisations`, { body: payload }); if (done) toast("ok", done); await reload(); return true; }
    catch (e) { toast("bad", (e as Error).message); return false; }
  };
  if (!data) return <Spinner />;
  const list = data.realisations;
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= list.length) return; const n = list.map((x) => x.id); [n[i], n[j]] = [n[j], n[i]]; post({ action: "order", ids: n }); };
  const preview = (r?: Real) => versionId ? `/preview/${id}/v/${versionId}/pages/${r && r.status === "published" ? r.handle : "realisations"}${r && r.status !== "published" ? `?es_realisation=${r.id}` : ""}` : null;

  return (
    <div className="mx-auto max-w-5xl" data-tab-realisations>
      <Card className="mb-6 p-5">
        <p className="font-semibold">{t("Vos réalisations", "Your projects")}</p>
        <p className="mt-1 text-sm text-muted">{t("Une fiche par chantier : photos, ce qui a été demandé, ce qui a été fait. Publiez-la : l'accueil, la page « Réalisations » (filtrable par catégorie) et la fiche du projet l'affichent toutes seules. Le site hébergé se met à jour à la prochaine publication (onglet Site).", "One entry per job: photos, what was asked, what was done. Publish it: the home page, the Projects page (filterable by category) and the project page show it by themselves. The hosted site updates on its next publication (Website tab).")}</p>
        <p className="mt-2 text-xs text-muted">{t("Uniquement vos propres photos de chantier, avec l'accord de vos clients. Le lieu et la date ne s'affichent que si vous les indiquez.", "Only your own photos of the work, with your clients' consent. Location and date are only shown if you enter them.")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing({ ...EMPTY })}>{t("Ajouter une réalisation", "Add a project")}</Button>
          {preview() && list.some((r) => r.status === "published") && <a className="inline-flex items-center gap-1 text-sm underline" href={preview()!} target="_blank" rel="noreferrer"><Eye className="size-4" /> {t("Voir la page dans l'aperçu", "See the page in the preview")}</a>}
        </div>
      </Card>

      {!list.length ? <Empty title={t("Aucune réalisation", "No project yet")}>{t("Ajoutez votre premier chantier : deux ou trois photos et une phrase suffisent.", "Add your first job: two or three photos and one sentence are enough.")}</Empty> : (
        <ul className="grid gap-3">
          {list.map((r, i) => (
            <li key={r.id} data-realisation={r.title}>
              <Card className="flex flex-wrap items-center gap-3 p-3 text-sm">
                {r.photos[0] ? <img src={`/api/files/${r.photos[0].assetId}?thumb=1`} alt="" className="size-16 shrink-0 rounded-lg object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs text-muted">{t("Photo ?", "Photo?")}</span>}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>{" "}<Badge tone={STATUS[r.status].tone} dot>{t(STATUS[r.status].fr, STATUS[r.status].en)}</Badge>
                  {r.category && <Badge className="ml-1">{r.category}</Badge>}
                  {r.before && <Badge tone="signal" className="ml-1">{t("Avant / après", "Before / after")}</Badge>}
                  <span className="block text-xs text-muted">{[r.summary, r.location, r.period, t(`${r.photos.length} photo(s)`, `${r.photos.length} photo(s)`)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" aria-label={t("Monter", "Up")} icon={<ArrowUp className="size-4" />} onClick={() => move(i, -1)}>{""}</Button>
                  <Button size="sm" variant="ghost" aria-label={t("Descendre", "Down")} icon={<ArrowDown className="size-4" />} onClick={() => move(i, 1)}>{""}</Button>
                  {preview(r) && r.status !== "archived" && <a className="inline-flex items-center gap-1 px-2 text-xs underline" href={preview(r)!} target="_blank" rel="noreferrer">{t("Aperçu", "Preview")}</a>}
                  <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>{t("Modifier", "Edit")}</Button>
                  {r.status !== "published" && r.status !== "archived" && <Button size="sm" onClick={() => post({ action: "status", id: r.id, status: "published" }, t(`« ${r.title} » publiée.`, `“${r.title}” published.`))}>{t("Publier", "Publish")}</Button>}
                  {r.status === "published" && <Button size="sm" variant="ghost" onClick={() => post({ action: "status", id: r.id, status: "withdrawn" }, t("Réalisation retirée du site.", "Project withdrawn from the site."))}>{t("Retirer", "Withdraw")}</Button>}
                  {r.status !== "archived" && r.status !== "published" && <Button size="sm" variant="ghost" onClick={() => post({ action: "status", id: r.id, status: "archived" })}>{t("Archiver", "Archive")}</Button>}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && <RealModal real={editing} onClose={() => setEditing(null)} onSave={async (realisation, publish) => {
        const ok = editing.id
          ? await post({ action: "update", id: editing.id, realisation }, t("Réalisation enregistrée.", "Project saved."))
          : await (async () => { try { const r = await api<{ realisation: Real }>(`/api/projects/${id}/realisations`, { body: { action: "create", realisation } }); if (publish) await api(`/api/projects/${id}/realisations`, { body: { action: "status", id: r.realisation.id, status: "published" } }); toast("ok", publish ? t("Réalisation publiée.", "Project published.") : t("Réalisation enregistrée en brouillon.", "Project saved as draft.")); await reload(); return true; } catch (e) { toast("bad", (e as Error).message); await reload(); return false; } })();
        if (ok) setEditing(null);
      }} />}
    </div>
  );
}

function RealModal({ real, onClose, onSave }: { real: Partial<Real>; onClose: () => void; onSave: (r: Record<string, unknown>, publish: boolean) => void }) {
  const t = useT();
  const [f, setF] = useState<Omit<Real, "id" | "handle" | "status">>({ ...EMPTY, ...real });
  const [picker, setPicker] = useState<"photos" | "before" | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const thumb = (p: Photo, onRemove: () => void, onAlt: (alt: string) => void, label: string) => (
    <li key={p.assetId} className="grid w-28 gap-1 text-xs">
      <span className="relative"><img src={`/api/files/${p.assetId}?thumb=1`} alt="" className="h-20 w-28 rounded-lg object-cover" />
        <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label={t(`Retirer ${label}`, `Remove ${label}`)} onClick={onRemove}><X className="size-3" /></button></span>
      <Input className="text-xs" placeholder={t("Description de la photo", "Photo description")} aria-label={t(`Description de ${label}`, `Description of ${label}`)} value={p.alt} onChange={(e) => onAlt(e.target.value)} />
    </li>
  );
  return (
    <Modal open onClose={onClose} title={real.id ? t("Modifier la réalisation", "Edit project") : t("Nouvelle réalisation", "New project")}>
      <div className="grid gap-3" data-realisation-form>
        <label className="grid gap-1 text-sm">{t("Titre du projet *", "Project title *")}<Input placeholder={t("ex. Séjour repeint en vert sauge", "e.g. Living room painted sage green")} value={f.title} onChange={set("title")} /></label>
        <label className="grid gap-1 text-sm">{t("Résumé (une phrase, affichée sur les vignettes)", "Summary (one sentence, shown on cards)")}<Input value={f.summary} onChange={set("summary")} maxLength={160} /></label>
        <label className="grid gap-1 text-sm">{t("La demande du client (facultatif)", "The client's request (optional)")}<Textarea rows={2} value={f.need} onChange={set("need")} /></label>
        <label className="grid gap-1 text-sm">{t("Le travail réalisé", "The work done")}<Textarea rows={3} value={f.work} onChange={set("work")} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">{t("Catégorie (filtre)", "Category (filter)")}<Input placeholder={t("ex. Peinture", "e.g. Painting")} value={f.category} onChange={set("category")} maxLength={40} /></label>
          <label className="grid gap-1 text-sm">{t("Lieu ou zone (facultatif)", "Location or area (optional)")}<Input placeholder={t("ex. Villeurbanne", "e.g. Brighton")} value={f.location} onChange={set("location")} maxLength={80} /></label>
          <label className="grid gap-1 text-sm">{t("Date (facultatif)", "Date (optional)")}<Input placeholder={t("ex. Mars 2026", "e.g. March 2026")} value={f.period} onChange={set("period")} maxLength={40} /></label>
        </div>
        <div className="grid gap-2 text-sm">
          <span>{t("Photos du projet (la première est la photo principale) *", "Project photos (the first one is the main photo) *")}</span>
          <ul className="flex flex-wrap gap-2">
            {f.photos.map((p, i) => thumb(p, () => setF({ ...f, photos: f.photos.filter((_, j) => j !== i) }), (alt) => setF({ ...f, photos: f.photos.map((x, j) => (j === i ? { ...x, alt } : x)) }), t(`la photo ${i + 1}`, `photo ${i + 1}`)))}
          </ul>
          <span><Button size="sm" variant="secondary" disabled={f.photos.length >= 12} onClick={() => setPicker("photos")}>{t("Ajouter des photos du projet", "Add project photos")}</Button></span>
        </div>
        <div className="grid gap-2 text-sm">
          <span>{t("Photo « avant » (facultatif : affiche une comparaison avant / après)", "“Before” photo (optional: shows a before / after comparison)")}</span>
          {f.before ? <ul className="flex">{thumb(f.before, () => setF({ ...f, before: null }), (alt) => setF({ ...f, before: { ...f.before!, alt } }), t("la photo avant", "the before photo"))}</ul>
            : <span><Button size="sm" variant="secondary" onClick={() => setPicker("before")}>{t("Choisir la photo « avant »", "Choose the “before” photo")}</Button></span>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={<Save className="size-4" />} onClick={() => onSave(f, false)} data-realisation-save>{t("Enregistrer", "Save")}</Button>
          {!real.id && <Button icon={<Send className="size-4" />} onClick={() => onSave(f, true)}>{t("Enregistrer et publier", "Save and publish")}</Button>}
        </div>
      </div>
      <MediaPicker open={!!picker} onClose={() => setPicker(null)} multiple={picker === "photos"} kinds={["image"]} title={picker === "before" ? t("Choisir la photo « avant »", "Choose the “before” photo") : t("Choisir des photos du projet", "Choose project photos")} onPick={(list) => {
        if (picker === "before" && list[0]) setF({ ...f, before: { assetId: list[0].id, alt: "" } });
        if (picker === "photos") setF({ ...f, photos: [...f.photos, ...list.filter((a) => !f.photos.some((p) => p.assetId === a.id)).map((a) => ({ assetId: a.id, alt: "" }))].slice(0, 12) });
        setPicker(null);
      }} />
    </Modal>
  );
}
