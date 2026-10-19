"use client";
/**
 * Panneau « Réglages » d'une section : édition MANUELLE, champ par champ, de tout ce que le schéma de la section expose
 * (textes, visuels, liens, boutons, couleurs, formats, dispositions, animations…) et de ses blocs (ajout, ordre,
 * suppression, réglages). Chaque changement passe par `/theme/ops` — exactement les mêmes opérations que les retouches
 * demandées à l'IA dans la discussion — et crée une version restaurable : une seule source de données, manuelle ou IA.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Eye, EyeOff, Film, Image as ImageIcon, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { api, Button, cx, useToast } from "../ui";
import { useT } from "../i18n";
import type { AssetView } from "./common";

type Setting = { type: string; id?: string; label?: string; info?: string; default?: unknown; options?: { value: string; label: string }[]; min?: number; max?: number; step?: number; unit?: string; placeholder?: string };
type BlockSchema = { type: string; name?: string; settings?: Setting[]; limit?: number };
type Block = { id: string; type: string; name: string; settings: Record<string, unknown> };
export type SectionData = {
  template: string; id: string; type: string; name: string; disabled: boolean; locked: boolean; structural: boolean;
  settings: Record<string, unknown>; blocks: Block[]; schema: { settings: Setting[]; blocks: BlockSchema[]; max_blocks?: number }; schemes: { id: string; label: string }[]; files: string[]; videos?: string[]; versionId: string;
};
type Op = Record<string, unknown>;

const isAssetField = (s: Setting) => s.type === "text" && !!s.id && (s.id === "image_asset" || /_asset$/.test(s.id));
/** Nature du fichier attendu par un réglage `*_asset` : vidéo (`video_asset`, `day_video_asset`…) ou image (dont les posters). */
const assetKind = (s: Setting): "image" | "video" => (/(^|_)video_asset$/.test(s.id ?? "") ? "video" : "image");
const TEXT_LIKE = new Set(["text", "url", "video_url", "inline_richtext", "liquid", "html", "font_picker", "link_list", "product", "collection", "collection_list", "blog", "article", "page", "number"]);

/** `version` : identifiant de la version courante du thème ; quand elle change ailleurs (discussion, historique), le panneau
 * relit ses données SANS être remonté : blocs dépliés, défilement et champ en cours restent en place. */
export function SectionSettingsPanel({ projectId, target, version, onClose, onChanged }: { projectId: string; target: { template: string; section: string }; version?: string; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const [data, setData] = useState<SectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});
  const load = useCallback(async () => {
    try { setError(null); setData(await api<SectionData>(`/api/projects/${projectId}/theme/section?template=${encodeURIComponent(target.template)}&section=${encodeURIComponent(target.section)}`)); }
    catch (e) { setError((e as Error).message); }
  }, [projectId, target.template, target.section]);
  useEffect(() => { void load(); }, [load, version]);
  const apply = useCallback(async (ops: Op[], summary: string) => {
    setBusy(true);
    try { await api(`/api/projects/${projectId}/theme/ops`, { body: { ops, summary } }); await load(); onChanged(); }
    catch (e) { toast("bad", (e as Error).message); }
    finally { setBusy(false); }
  }, [projectId, load, onChanged, toast]);
  if (error) return <div className="p-4 text-sm text-bad">{error}</div>;
  if (!data) return <div className="grid h-40 place-items-center text-sm text-muted"><Loader2 className="size-4 animate-spin" /></div>;
  const base = { template: data.template, section: data.id };
  const label = (s: Setting) => s.label ?? s.id ?? "";
  const setSetting = (s: Setting, value: unknown, block?: Block) => apply([{ op: "set_setting", ...base, ...(block ? { block: block.id } : {}), key: s.id, value }], t(`${data.name} · ${label(s)}`, `${data.name} · ${label(s)}`));
  const useMedia = (s: Setting, assetId: string, block?: Block) => apply([{ op: "use_media", ...base, ...(block ? { block: block.id } : {}), key: s.id, assetId }], t(`${data.name} · image`, `${data.name} · image`));
  const canAdd = !data.schema.max_blocks || data.blocks.length < data.schema.max_blocks;
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4" data-section-settings={data.type}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight">{data.name}</p>
          <p className="text-[11px] text-muted">{t("Réglages", "Settings")} · <code className="text-[10px]">{data.type}</code>{data.disabled ? ` · ${t("masquée", "hidden")}` : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!data.structural && <button type="button" onClick={() => apply([{ op: "toggle_section", ...base, disabled: !data.disabled }], data.disabled ? t(`${data.name} affichée`, `${data.name} shown`) : t(`${data.name} masquée`, `${data.name} hidden`))} className="grid size-8 place-items-center rounded-full hover:bg-paper-2" aria-label={data.disabled ? t("Afficher la section", "Show the section") : t("Masquer la section", "Hide the section")} title={data.disabled ? t("Afficher", "Show") : t("Masquer", "Hide")}>{data.disabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
          <button type="button" onClick={onClose} className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs hover:border-ink">{t("← Structure", "← Structure")}</button>
        </div>
      </div>
      {data.locked && <p className="mb-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn"><Lock className="size-3.5" /> {t("Section validée (verrouillée) : déverrouillez-la dans le menu « … » pour la modifier.", "Approved (locked) section: unlock it from the “…” menu to edit it.")}</p>}
      <fieldset disabled={busy || data.locked} className="grid min-w-0 gap-3 disabled:opacity-60">
        {data.schema.settings.map((s, i) => <Field key={s.id ?? `h${i}`} setting={s} value={data.settings[s.id ?? ""]} data={data} projectId={projectId} onApply={(v) => setSetting(s, v)} onMedia={(assetId) => useMedia(s, assetId)} />)}
      </fieldset>
      {data.schema.blocks.length > 0 && (
        <section className="mt-5" aria-label={t("Blocs", "Blocks")}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[.14em] text-muted">{t("Blocs", "Blocks")} · {data.blocks.length}{data.schema.max_blocks ? ` / ${data.schema.max_blocks}` : ""}</p>
          <ul className="grid gap-1.5">
            {data.blocks.map((b, i) => {
              const schema = data.schema.blocks.find((x) => x.type === b.type);
              const open = !!openBlocks[b.id];
              const preview = Object.values(b.settings).find((v) => typeof v === "string" && v && !/^</.test(v) && !/\.(webp|jpe?g|png|svg)$/i.test(v)) as string | undefined;
              return (
                <li key={b.id} className="rounded-xl border border-line bg-card" data-block={b.id}>
                  <div className="flex items-center gap-1 p-1.5">
                    <button type="button" onClick={() => setOpenBlocks((o) => ({ ...o, [b.id]: !open }))} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-paper-2" aria-expanded={open}>
                      {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                      <span className="min-w-0"><span className="block truncate font-medium">{b.name}</span>{preview && !open && <span className="block truncate text-[11px] text-muted">{preview}</span>}</span>
                    </button>
                    <button type="button" disabled={busy || data.locked || i === 0} onClick={() => apply([{ op: "move_block", ...base, block: b.id, position: { index: i - 1 } }], t(`${b.name} remonté`, `${b.name} moved up`))} className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30" aria-label={t("Monter le bloc", "Move block up")}><ArrowUp className="size-3.5" /></button>
                    <button type="button" disabled={busy || data.locked || i === data.blocks.length - 1} onClick={() => apply([{ op: "move_block", ...base, block: b.id, position: { index: i + 1 } }], t(`${b.name} descendu`, `${b.name} moved down`))} className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30" aria-label={t("Descendre le bloc", "Move block down")}><ArrowDown className="size-3.5" /></button>
                    <button type="button" disabled={busy || data.locked} onClick={() => { if (confirm(t(`Supprimer le bloc « ${b.name} » ? (une version précédente reste restaurable)`, `Delete block “${b.name}”? (a previous version stays restorable)`))) void apply([{ op: "remove_block", ...base, block: b.id }], t(`${b.name} supprimé`, `${b.name} removed`)); }} className="grid size-8 place-items-center rounded-full text-bad hover:bg-paper-2 disabled:opacity-30" aria-label={t("Supprimer le bloc", "Delete block")}><Trash2 className="size-3.5" /></button>
                  </div>
                  {open && schema?.settings?.length ? (
                    <fieldset disabled={busy || data.locked} className="grid gap-3 border-t border-line p-3 disabled:opacity-60">
                      {schema.settings.map((s, k) => <Field key={s.id ?? `h${k}`} setting={s} block={schema} value={b.settings[s.id ?? ""]} data={data} projectId={projectId} onApply={(v) => setSetting(s, v, b)} onMedia={(assetId) => useMedia(s, assetId, b)} />)}
                    </fieldset>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <AddBlock schemas={data.schema.blocks} disabled={busy || data.locked || !canAdd} onAdd={(type) => { const schema = data.schema.blocks.find((x) => x.type === type); const settings = Object.fromEntries((schema?.settings ?? []).filter((s) => s.id && s.default !== undefined).map((s) => [s.id!, s.default])); void apply([{ op: "add_block", ...base, type, settings }], t(`Bloc « ${schema?.name ?? type} » ajouté`, `Block “${schema?.name ?? type}” added`)); }} />
        </section>
      )}
      <p className="mt-5 text-[11px] leading-relaxed text-muted">{t("Chaque changement est enregistré aussitôt et crée une version que vous pouvez restaurer (bouton Historique). La discussion et l'IA modifient exactement les mêmes réglages.", "Each change is saved at once and creates a version you can restore (History button). The chat and the AI edit exactly the same settings.")}</p>
    </div>
  );
}

function AddBlock({ schemas, disabled, onAdd }: { schemas: BlockSchema[]; disabled: boolean; onAdd: (type: string) => void }) {
  const t = useT();
  const [type, setType] = useState(schemas[0]?.type ?? "");
  if (!schemas.length) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      {schemas.length > 1 && <select value={type} onChange={(e) => setType(e.target.value)} disabled={disabled} className="h-8 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-xs" aria-label={t("Type de bloc", "Block type")}>{schemas.map((b) => <option key={b.type} value={b.type}>{b.name ?? b.type}</option>)}</select>}
      <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} disabled={disabled} onClick={() => onAdd(type || schemas[0].type)}>{schemas.length > 1 ? t("Ajouter", "Add") : t(`Ajouter « ${schemas[0].name ?? schemas[0].type} »`, `Add “${schemas[0].name ?? schemas[0].type}”`)}</Button>
    </div>
  );
}

/** Un réglage du schéma rendu avec le contrôle adapté à son type ; la valeur s'applique à la validation (Entrée, perte du focus, choix). */
function Field({ setting: s, block, value, data, projectId, onApply, onMedia }: { setting: Setting; block?: BlockSchema; value: unknown; data: SectionData; projectId: string; onApply: (v: unknown) => void; onMedia: (assetId: string) => void }) {
  const t = useT();
  const id = s.id ?? "";
  const [draft, setDraft] = useState<string>(value === undefined || value === null ? "" : String(value));
  useEffect(() => { setDraft(value === undefined || value === null ? "" : String(value)); }, [value]);
  const name = s.label ?? id;
  const info = s.info ? <span className="block text-[11px] font-normal text-muted">{s.info}</span> : null;
  const dirty = draft !== (value === undefined || value === null ? "" : String(value));
  const commitText = () => { if (!dirty) return; let v: unknown = draft; if (s.type === "richtext" && v && !/^\s*</.test(String(v))) v = `<p>${String(v).trim().split(/\n{2,}/).join("</p><p>")}</p>`; if (s.type === "number" || s.type === "range") v = Number(v); onApply(v); };
  if (s.type === "header") return <h4 data-setting={id} className="mt-2 border-b border-line pb-1 text-xs font-semibold uppercase tracking-[.12em] text-muted">{s.label ?? ""}</h4>;
  if (s.type === "paragraph") return <p data-setting={id} className="text-[11px] leading-relaxed text-muted">{s.label ?? ""}</p>;
  if (s.type === "checkbox") {
    const on = value === true || value === "true";
    return <label data-setting={id} className="flex items-center justify-between gap-3 text-sm"><span>{name}{info}</span><button type="button" role="switch" aria-checked={on} aria-label={name} onClick={() => onApply(!on)} className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-signal" : "bg-line")}><span className={cx("absolute top-0.5 size-4 rounded-full bg-white transition-all", on ? "left-4.5" : "left-0.5")} /></button></label>;
  }
  if (s.type === "select" || s.type === "radio" || s.type === "color_scheme") {
    const options = s.type === "color_scheme" ? data.schemes.map((x) => ({ value: x.id, label: x.label })) : s.options ?? [];
    return <label data-setting={id} className="grid gap-1 text-sm"><span className="text-xs font-medium text-ink-2">{name}{info}</span><select value={String(value ?? s.default ?? "")} onChange={(e) => onApply(e.target.value)} className="h-9 rounded-xl border border-line bg-card px-3 text-sm">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  }
  if (s.type === "range") {
    const n = Number(draft || s.default || s.min || 0);
    return <div data-setting={id} className="grid gap-1 text-sm"><span className="flex items-center justify-between text-xs font-medium text-ink-2"><span>{name}{info}</span><span className="tabular-nums text-muted">{n}{s.unit ?? ""}</span></span><input type="range" min={s.min ?? 0} max={s.max ?? 100} step={s.step ?? 1} value={n} onChange={(e) => setDraft(e.target.value)} onPointerUp={commitText} onKeyUp={(e) => { if (/Arrow|Home|End|Page/.test(e.key)) commitText(); }} onBlur={commitText} aria-label={name} className="accent-signal" /></div>;
  }
  if (s.type === "color") {
    const hex = /^#[0-9a-f]{6}$/i.test(draft) ? draft : "#000000";
    return <label data-setting={id} className="grid gap-1 text-sm"><span className="text-xs font-medium text-ink-2">{name}{info}</span><span className="flex items-center gap-2"><input type="color" value={hex} onChange={(e) => setDraft(e.target.value.toUpperCase())} onBlur={commitText} aria-label={name} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-card p-0.5" /><input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitText} onKeyDown={(e) => { if (e.key === "Enter") commitText(); }} className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 font-mono text-xs" placeholder="#RRGGBB" />{dirty && <Check className="size-4 text-signal" aria-hidden />}</span></label>;
  }
  if (s.type === "image_picker") {
    const pair = `${(s.id ?? "image").replace(/^image$/, "image")}_asset`;
    const sibling = (block?.settings ?? data.schema.settings).find((x) => isAssetField(x) && (x.id === pair || assetKind(x) === "image")) ?? null;
    return <div data-setting={id} className="grid gap-1 text-sm"><span className="text-xs font-medium text-ink-2">{name}{info}</span><p className="rounded-xl border border-dashed border-line px-3 py-2 text-[11px] text-muted">{sibling ? t("Image de la boutique installée (choisie dans l'éditeur de la plateforme). Dans le studio, choisissez le fichier image ci-dessous.", "Store image (chosen in the platform's editor). In the studio, pick the image file below.") : t("Image de la boutique installée : se choisit dans l'éditeur de la plateforme après l'export.", "Store image: chosen in the platform's editor after export.")}</p></div>;
  }
  if (s.type === "video") {
    const sibling = (block?.settings ?? data.schema.settings).find((x) => isAssetField(x) && assetKind(x) === "video") ?? null;
    return <div data-setting={id} className="grid gap-1 text-sm"><span className="text-xs font-medium text-ink-2">{name}{info}</span><p className="rounded-xl border border-dashed border-line px-3 py-2 text-[11px] text-muted">{sibling ? t("Vidéo de la boutique installée (choisie dans l'éditeur de la plateforme). Dans le studio, choisissez le fichier vidéo ci-dessous.", "Store video (chosen in the platform's editor). In the studio, pick the video file below.") : t("Vidéo de la boutique installée : se choisit dans l'éditeur de la plateforme après l'export.", "Store video: chosen in the platform's editor after export.")}</p></div>;
  }
  if (isAssetField(s)) { const kind = assetKind(s); return <AssetField id={id} name={name} info={info} kind={kind} value={String(value ?? "")} files={kind === "video" ? data.videos ?? [] : data.files} projectId={projectId} onApply={onApply} onMedia={onMedia} />; }
  if (s.type === "textarea" || s.type === "richtext") {
    return <label data-setting={id} className="grid gap-1 text-sm"><span className="flex items-center justify-between text-xs font-medium text-ink-2"><span>{name}{info}</span>{dirty && <button type="button" onClick={commitText} className="inline-flex items-center gap-1 rounded-full bg-signal px-2 py-0.5 text-[11px] font-medium text-signal-ink"><Check className="size-3" /> {t("Appliquer", "Apply")}</button>}</span><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitText} rows={s.type === "richtext" ? 4 : 3} placeholder={s.placeholder} className="rounded-xl border border-line bg-card px-3 py-2 text-sm leading-relaxed" />{s.type === "richtext" && <span className="text-[10px] text-muted">{t("Mise en forme HTML simple acceptée (<p>, <strong>, <a>) ; un texte brut est mis en paragraphe.", "Simple HTML accepted (<p>, <strong>, <a>); plain text becomes a paragraph.")}</span>}</label>;
  }
  if (TEXT_LIKE.has(s.type)) {
    return <label data-setting={id} className="grid gap-1 text-sm"><span className="flex items-center justify-between text-xs font-medium text-ink-2"><span>{name}{info}</span>{dirty && <button type="button" onClick={commitText} className="inline-flex items-center gap-1 rounded-full bg-signal px-2 py-0.5 text-[11px] font-medium text-signal-ink"><Check className="size-3" /> {t("Appliquer", "Apply")}</button>}</span><input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commitText} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(); } }} placeholder={s.placeholder} type={s.type === "number" ? "number" : "text"} className="h-9 rounded-xl border border-line bg-card px-3 text-sm" /></label>;
  }
  return <p className="text-[11px] text-muted">{name} · {t("réglage non modifiable ici", "setting not editable here")} ({s.type})</p>;
}

/** Fichier image du thème : choix parmi les fichiers connus, ou une image du projet (opération use_media, même donnée). */
function AssetField({ id, name, info, kind = "image", value, files, projectId, onApply, onMedia }: { id: string; name: string; info: React.ReactNode; kind?: "image" | "video"; value: string; files: string[]; projectId: string; onApply: (v: unknown) => void; onMedia: (assetId: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AssetView[] | null>(null);
  const video = kind === "video";
  useEffect(() => { if (!open || assets) return; api<{ assets: AssetView[] }>(`/api/projects/${projectId}/files?kind=${video ? "video" : "image"}&latest=1`).then((r) => setAssets(r.assets.filter((a) => a.status !== "rejected"))).catch(() => setAssets([])); }, [open, assets, projectId, video]);
  const options = useMemo(() => (value && !files.includes(value) ? [value, ...files] : files), [files, value]);
  return (
    <div data-setting={id} className="grid min-w-0 gap-1 text-sm">
      <span className="text-xs font-medium text-ink-2">{name}{info}</span>
      <div className="flex min-w-0 items-center gap-2">
        <select value={value} onChange={(e) => onApply(e.target.value)} className="h-9 w-0 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-sm" aria-label={name}><option value="">{t("— aucun fichier —", "— no file —")}</option>{options.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        <button type="button" onClick={() => setOpen((o) => !o)} className={cx("inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-xs", open ? "border-signal text-signal" : "border-line hover:border-ink")} aria-expanded={open}>{video ? <Film className="size-3.5" /> : <ImageIcon className="size-3.5" />} {video ? t("Mes vidéos", "My videos") : t("Mes images", "My images")}</button>
      </div>
      {open && (
        <div className="rounded-xl border border-line bg-paper-2 p-2">
          {!assets ? <p className="p-2 text-xs text-muted"><Loader2 className="inline size-3 animate-spin" /> {t("Chargement…", "Loading…")}</p> : !assets.length ? <p className="p-2 text-xs text-muted">{video ? t("Aucune vidéo dans ce projet (onglet Vidéos ou import dans Mes fichiers).", "No video in this project yet (Videos tab or upload in My files).") : t("Aucune image dans ce projet.", "No image in this project yet.")}</p> : video ? (
            <ul className="grid gap-1" role="list">
              {assets.slice(0, 48).map((a) => (
                <li key={a.id}><button type="button" onClick={() => { onMedia(a.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg border border-line bg-card px-2 py-1.5 text-left text-xs hover:border-signal" title={a.name} aria-label={t(`Utiliser « ${a.name} »`, `Use “${a.name}”`)}>{a.thumbUrl ? <img src={a.thumbUrl} alt="" className="size-9 shrink-0 rounded object-cover" loading="lazy" /> : <Film className="size-4 shrink-0 text-muted" />}<span className="min-w-0"><span className="block truncate font-medium">{a.name}</span><span className="block text-[10px] text-muted">{a.mime}{a.size ? ` · ${Math.round(a.size / 1024)} ko` : ""}</span></span></button></li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-4 gap-1.5" role="list">
              {assets.slice(0, 48).map((a) => (
                <li key={a.id}><button type="button" onClick={() => { onMedia(a.id); setOpen(false); }} className="block aspect-square w-full overflow-hidden rounded-lg border border-line bg-card hover:border-signal" title={a.name} aria-label={t(`Utiliser « ${a.name} »`, `Use “${a.name}”`)}><img src={a.thumbUrl ?? a.url} alt="" className="size-full object-cover" loading="lazy" /></button></li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"><X className="size-3" /> {t("Fermer", "Close")}</button>
        </div>
      )}
    </div>
  );
}
