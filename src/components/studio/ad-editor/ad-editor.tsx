"use client";
/**
 * Éditeur visuel des publicités (plein écran) : canevas central rendu par le moteur de l'export, outils, calques,
 * propriétés, zoom, repères, annuler / rétablir, enregistrement versionné, restauration, formats, exports et
 * retouches en langage naturel. Toute modification manuelle est gratuite (aucun appel d'IA) ; une demande qui exige
 * une génération est annoncée avec son coût (forfait) et attend l'accord du client.
 *
 * Ordinateur : barre d'outils, calques à gauche, propriétés à droite. Téléphone et tablette étroite : interface
 * tactile dédiée — canevas plein écran, barre d'outils en bas, panneaux en tiroirs, poignées agrandies, double-tap
 * pour modifier un texte au clavier.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, Circle, Download, Hand, History as HistoryIcon, ImagePlus, Layers, Maximize2, Minus, MoreHorizontal, Plus, Redo2, Save, Send, SlidersHorizontal, Square, Type, Undo2, X, Copy, Ratio, PenLine } from "lucide-react";
import { api, Button, cx, Modal, Spinner, useToast } from "../../ui";
import { useT } from "../../i18n";
import { MediaPicker } from "../common";
import { useCostConfirm } from "../cost-confirm";
import { useProject } from "../project-context";
import { History, type DocOp } from "@/lib/ad-doc/ops";
import { localAdEdit } from "@/lib/ad-doc/local-edit";
import { newLayerId } from "@/lib/ad-doc/geometry";
import type { AdDocument, Layer } from "@/lib/ad-doc/types";
import type { RenderEnv } from "@/lib/ad-doc/render";
import { browserEnv, docImages, ensureDocFonts, useFontCatalog } from "./resources";
import { EditorCanvas, InlineText } from "./canvas";
import { IconBtn, LayersPanel, PropertiesPanel } from "./panels";

type Version = { id: string; docKey: string; version: number; source: string; note: string; renderedAssetId: string | null; createdAt: number };
type View = { docKey: string; doc: AdDocument; version: Version; versions: Version[]; metrics: { minFontPx: number; textContrast: number; textShare: number }; problems: { layerId: string; code: string; message: string }[]; edit?: { local: boolean; reason?: string; summary?: string; paid?: { kind: "image" | "creative"; reason: string; imageRequest?: { kind: string; topic: string } } | null } };

const FORMATS: { platform: string; aspect: string; label: string }[] = [
  { platform: "meta_feed", aspect: "1:1", label: "1:1 · Meta" },
  { platform: "meta_feed", aspect: "4:5", label: "4:5 · Meta" },
  { platform: "meta_story", aspect: "9:16", label: "9:16 · Stories / Reels" },
  { platform: "google_display", aspect: "16:9", label: "16:9 · Google" },
  { platform: "linkedin", aspect: "1:1", label: "1:1 · LinkedIn" },
  { platform: "pinterest", aspect: "2:3", label: "2:3 · Pinterest" },
];

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1023px)");
    const on = () => setM(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return m;
}

const draftKey = (docKey: string) => `ad-editor:${docKey}`;
const readDraft = (docKey: string): { doc: AdDocument; base: number; at: number } | null => {
  try {
    const raw = localStorage.getItem(draftKey(docKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AdEditor({ projectId, docKey: initialKey, onClose }: { projectId: string; docKey: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const cost = useCostConfirm();
  const { data: project } = useProject();
  const mobile = useIsMobile();
  const catalog = useFontCatalog();
  const [docKey, setDocKey] = useState(initialKey);
  const [view, setView] = useState<View | null>(null);
  const hist = useRef<History | null>(null);
  const [doc, setDoc] = useState<AdDocument | null>(null);
  const [env, setEnv] = useState<RenderEnv | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [stage, setStage] = useState({ w: 800, h: 600 });
  const [sheet, setSheet] = useState<null | "add" | "props" | "layers" | "more">(null);
  const [panel, setPanel] = useState<null | "versions" | "formats" | "export" | "problems">(null);
  const [picker, setPicker] = useState<null | "replace" | "add">(null);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [photoChoice, setPhotoChoice] = useState<View["edit"] | null>(null);
  const [draft, setDraft] = useState<{ doc: AdDocument } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const base = `/api/projects/${projectId}/ads/docs/${docKey}`;

  const load = useCallback(
    async (key = docKey) => {
      const v = await api<View>(`/api/projects/${projectId}/ads/docs/${key}`);
      setView(v);
      hist.current = new History(v.doc);
      setDoc(v.doc);
      setDirty(false);
      setSelected(null);
      const d = readDraft(key);
      // Brouillon non enregistré plus récent que la version enregistrée : proposé, jamais imposé.
      setDraft(d && d.base === v.version.version && JSON.stringify(d.doc) !== JSON.stringify(v.doc) ? { doc: d.doc } : null);
    },
    [docKey, projectId],
  );
  useEffect(() => {
    load().catch((e) => toast("bad", (e as Error).message));
  }, [load, toast]);

  // Polices et images chargées avant le rendu (aperçu identique à l'export).
  useEffect(() => {
    if (!doc || !catalog) return;
    let live = true;
    (async () => {
      await ensureDocFonts(catalog, doc).catch(() => undefined);
      const imgs = await docImages(doc);
      if (live) setEnv(browserEnv(catalog, imgs));
    })();
    return () => {
      live = false;
    };
  }, [doc, catalog]);

  // Taille disponible pour le canevas (ajustement automatique du zoom).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  const fit = doc ? Math.min((stage.w - (mobile ? 24 : 64)) / doc.width, (stage.h - (mobile ? 24 : 64)) / doc.height) : 1;
  const scale = Math.max(0.05, fit * zoom);

  const commit = useCallback(
    (next: AdDocument) => {
      setDoc(next);
      setDirty(true);
      try {
        localStorage.setItem(draftKey(docKey), JSON.stringify({ doc: next, base: view?.version.version ?? 0, at: Date.now() }));
      } catch {
        /* stockage indisponible : le travail reste en mémoire jusqu'à l'enregistrement */
      }
    },
    [docKey, view],
  );
  const apply = useCallback(
    (op: DocOp, merge?: string) => {
      if (!hist.current) return;
      try {
        commit(hist.current.apply(op, merge));
      } catch (e) {
        toast("bad", (e as Error).message.includes("verrouillé") ? t("Cet élément est verrouillé : déverrouillez-le dans les calques.", "This element is locked: unlock it in the layers.") : (e as Error).message);
      }
    },
    [commit, toast, t],
  );
  const applyMany = useCallback((ops: DocOp[]) => hist.current && ops.length && commit(hist.current.applyAll(ops)), [commit]);
  const undo = () => hist.current?.canUndo && commit(hist.current.undo());
  const redo = () => hist.current?.canRedo && commit(hist.current.redo());

  const save = useCallback(async () => {
    if (!doc) return null;
    setSaving(true);
    try {
      const v = await api<View>(base, { body: { action: "save", doc, note: "modification manuelle" } });
      setView(v);
      setDirty(false);
      try {
        localStorage.removeItem(draftKey(docKey));
      } catch {}
      toast("ok", t(`Enregistré (version ${v.version.version}).`, `Saved (version ${v.version.version}).`));
      return v;
    } catch (e) {
      toast("bad", (e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [base, doc, docKey, t, toast]);

  // Raccourcis clavier (ordinateur) : annuler, rétablir, enregistrer, supprimer, dupliquer, déplacer au clavier.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (editing || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") (e.preventDefault(), e.shiftKey ? redo() : undo());
      else if (mod && e.key.toLowerCase() === "y") (e.preventDefault(), redo());
      else if (mod && e.key.toLowerCase() === "s") (e.preventDefault(), save());
      else if (selected && mod && e.key.toLowerCase() === "d") (e.preventDefault(), duplicate());
      else if (selected && (e.key === "Delete" || e.key === "Backspace")) (e.preventDefault(), remove());
      else if (selected && e.key.startsWith("Arrow")) {
        const l = doc?.layers.find((x) => x.id === selected);
        if (!l) return;
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        apply({ op: "move", id: l.id, x: l.x + (e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0), y: l.y + (e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0) }, `${l.id}:nudge`);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!view || !doc) {
    return (
      <div className="fixed inset-0 z-[95] grid place-items-center bg-paper">
        <Spinner />
      </div>
    );
  }
  const layer = selected ? doc.layers.find((l) => l.id === selected) ?? null : null;

  // ---------------------------------------------------------------- actions
  const addText = () => {
    const id = newLayerId(doc, "texte");
    const w = doc.width * 0.6;
    applyMany([{ op: "add", layer: { id, name: t("Texte", "Text"), role: "body", kind: "text", text: t("Votre texte", "Your text"), font: { family: doc.brand.fonts.body, weight: 600, size: Math.round(doc.width * 0.05), italic: false }, color: doc.brand.palette.dark ?? "#111111", align: "center", lineHeight: 1.15, letterSpacing: 0, uppercase: false, autoFit: null, shadow: null, x: (doc.width - w) / 2, y: doc.height * 0.42, w, h: doc.width * 0.08, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "center", v: "middle" } } }]);
    setSelected(id);
    setSheet(null);
  };
  const addShape = (shape: "rect" | "ellipse" | "line") => {
    const id = newLayerId(doc, shape === "rect" ? "rectangle" : shape === "ellipse" ? "cercle" : "ligne");
    const s = doc.width * 0.22;
    applyMany([{ op: "add", layer: { id, name: shape === "rect" ? t("Rectangle", "Rectangle") : shape === "ellipse" ? t("Cercle", "Circle") : t("Ligne", "Line"), role: "shape", kind: "shape", shape, fill: shape === "line" ? null : (doc.brand.palette.accent ?? "#7C3AED"), stroke: shape === "line" ? { color: doc.brand.palette.dark ?? "#111111", width: 6 } : null, radius: shape === "rect" ? 16 : 0, shadow: null, x: (doc.width - s) / 2, y: (doc.height - (shape === "line" ? 12 : s)) / 2, w: s, h: shape === "line" ? 12 : s, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "center", v: "middle" } } }]);
    setSelected(id);
    setSheet(null);
  };
  const addImageLayer = (assetId: string) => {
    const id = newLayerId(doc, "image");
    const w = doc.width * 0.4;
    applyMany([{ op: "add", layer: { id, name: t("Image", "Image"), role: "image", kind: "image", assetId, fit: "cover", crop: null, radius: 12, shadow: null, x: (doc.width - w) / 2, y: (doc.height - w) / 2, w, h: w, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "center", v: "middle" } } }]);
    setSelected(id);
  };
  const duplicate = () => layer && !layer.locked && (applyMany([{ op: "duplicate", id: layer.id, newId: newLayerId(doc, layer.id.replace(/-\d+$/, "")) }]), undefined);
  const remove = () => {
    if (!layer || layer.locked) return;
    apply({ op: "remove", id: layer.id });
    setSelected(null);
  };
  const upload = async (f: File) => {
    const form = new FormData();
    form.append("files", f);
    form.append("role", "ad-source");
    try {
      const r = await api<{ assets: { id: string }[] }>(`/api/projects/${projectId}/files`, { form });
      const a = r.assets?.[0];
      if (!a) return;
      if (layer?.kind === "image") apply({ op: "image", id: layer.id, assetId: a.id });
      else addImageLayer(a.id);
      toast("ok", t("Photo importée dans la bibliothèque.", "Photo uploaded to the library."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const photoLayer = () => doc.layers.find((l) => l.kind === "image" && (l.role === "background" || l.role === "image"))?.id ?? null;

  /** Génération d'image payante, seulement après accord (forfait affiché), puis pose sur la photo de la création. */
  const generateBackground = async (topic: string) => {
    if (!(await cost.confirm("images"))) return;
    setBusy(t("Image en préparation (IA)…", "Image being prepared (AI)…"));
    try {
      const r = await api<{ jobId: string }>(`/api/projects/${projectId}/images/v2`, { body: { action: "generate", request: { kind: "ambiance", topic, aspect: doc.width > doc.height * 1.3 ? "16:9" : doc.height > doc.width * 1.3 ? "9:16" : doc.height > doc.width * 1.1 ? "4:5" : "1:1", count: 1, allowGenerate: true } } });
      for (let i = 0; i < 300; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const jobs = await api<{ jobs: { id: string; status: string; result: any; error: string | null }[] }>(`/api/projects/${projectId}/jobs?type=image.v2`);
        const j = jobs.jobs.find((x) => x.id === r.jobId);
        if (!j || j.status === "queued" || j.status === "running") continue;
        const asset = j.result?.outcomes?.find((o: { assetId: string | null }) => o.assetId)?.assetId;
        if (j.status !== "done" || !asset) throw new Error(j.error || t("Aucune image retenue par le contrôle de qualité.", "No image passed the quality check."));
        const target = photoLayer();
        if (target) apply({ op: "image", id: target, assetId: asset });
        else addImageLayer(asset);
        toast("ok", t("Nouvelle image posée : enregistrez pour la garder.", "New image placed: save to keep it."));
        return;
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /** Retouche en langage naturel : locale et gratuite si possible ; sinon annoncée (rien n'est dépensé sans accord). */
  const askEdit = async () => {
    const q = ask.trim();
    if (!q) return;
    const r = localAdEdit(doc, q);
    if (r.local) {
      applyMany(r.ops);
      setAsk("");
      toast("ok", t(`Fait sans IA : ${r.summary}.`, `Done without AI: ${r.summary}.`));
      return;
    }
    if (r.paid?.kind === "image") {
      setPhotoChoice({ local: false, paid: r.paid, reason: r.reason });
      return;
    }
    if (r.paid?.kind === "creative") {
      if (!window.confirm(t("Une nouvelle version demande une proposition de l'IA (rédaction et création). Elle s'ajoutera à vos créations, sans modifier celle-ci. Continuer ?", "A new version needs an AI proposal (copy and creative). It will be added to your creatives without changing this one. Continue?"))) return;
      // Avec l'IA, les nouvelles photos utilisent le forfait : quota affiché et accord demandé avant toute dépense.
      if (project?.ai.llm && !(await cost.confirm("images"))) return;
      try {
        await api(`/api/projects/${projectId}/campaigns/v2`, { body: { action: "generate", count: 1 } });
        toast("ok", t("Nouvelle proposition en préparation : elle apparaîtra dans vos créations.", "New proposal in progress: it will appear in your creatives."));
      } catch (e) {
        toast("bad", (e as Error).message);
      }
      return;
    }
    toast("bad", r.reason);
  };

  const exportAs = async (format: "png" | "jpeg" | "json") => {
    // L'export suit la version enregistrée : on enregistre d'abord si besoin (ce que l'on voit = ce que l'on exporte).
    if (dirty && !(await save())) return;
    window.location.href = `${base}?export=${format}`;
    setPanel(null);
  };
  const restore = async (version: number) => {
    if (dirty && !window.confirm(t("Des modifications ne sont pas enregistrées : les abandonner pour restaurer cette version ?", "Some changes are not saved: discard them to restore this version?"))) return;
    try {
      await api(base, { body: { action: "restore", version } });
      await load();
      toast("ok", t(`Version ${version} restaurée (l'historique est conservé).`, `Version ${version} restored (history kept).`));
      setPanel(null);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const reformat = async (f: { platform: string; aspect: string }) => {
    if (dirty && !(await save())) return;
    try {
      const v = await api<View>(base, { body: { action: "reflow", platform: f.platform, aspect: f.aspect } });
      setDocKey(v.docKey);
      await load(v.docKey);
      toast("ok", t(`Copie au format ${f.aspect} créée : vos modifications sont conservées.`, `${f.aspect} copy created: your changes are kept.`));
      setPanel(null);
      setSheet(null);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const duplicateCreative = async () => {
    if (dirty && !(await save())) return;
    const v = await api<View>(base, { body: { action: "duplicate" } });
    setDocKey(v.docKey);
    await load(v.docKey);
    toast("ok", t("Copie créée : vous modifiez maintenant la copie.", "Copy created: you are now editing the copy."));
  };
  const close = () => {
    if (dirty && !window.confirm(t("Des modifications ne sont pas enregistrées. Fermer quand même ? (Elles restent proposées à la prochaine ouverture.)", "Some changes are not saved. Close anyway? (They will be offered next time.)"))) return;
    onClose();
  };

  const problems = view.problems;
  const textLayer = layer && (layer.kind === "text" || layer.kind === "button") ? layer : null;
  const editingLayer = editing ? (doc.layers.find((l) => l.id === editing) as Extract<Layer, { kind: "text" | "button" }> | undefined) : undefined;

  const canvasEl = (
    <div className="relative">
      <EditorCanvas doc={doc} env={env} scale={scale} selectedId={selected} touch={mobile} editingId={editing} onSelect={(id) => (setSelected(id), mobile && id && setSheet(null))} onCommit={(ops) => applyMany(ops)} onEditText={setEditing} />
      {editingLayer && (
        <InlineText
          layer={editingLayer}
          scale={scale}
          onDone={(text) => {
            setEditing(null);
            if (text != null && text !== editingLayer.text) apply({ op: "text", id: editingLayer.id, text });
          }}
        />
      )}
      {!env && <div className="absolute inset-0 grid place-items-center"><Spinner /></div>}
    </div>
  );

  const propsPanel = catalog && <PropertiesPanel doc={doc} layer={layer} apply={apply} catalog={catalog} onPickImage={() => setPicker("replace")} onUploadImage={upload} onDuplicate={duplicate} onDelete={remove} />;
  const layersPanel = <LayersPanel doc={doc} selectedId={selected} onSelect={(id) => (setSelected(id), setSheet(null))} apply={apply} />;
  const askBox = (
    <form className="flex items-center gap-2" onSubmit={(e) => (e.preventDefault(), askEdit())}>
      <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("Demander une retouche : « Agrandis le titre », « Bouton en vert »…", "Ask for a change: “Make the title bigger”, “Green button”…")} className="h-10 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-ink" aria-label={t("Demander une retouche", "Ask for a change")} data-testid="ask-input" />
      <Button type="submit" size="sm" icon={<Send className="size-4" />} disabled={!ask.trim()}>{t("Appliquer", "Apply")}</Button>
    </form>
  );

  const status = (
    <span className={cx("text-xs", dirty ? "text-warn" : "text-muted")} data-testid="save-status">
      {dirty ? t("Modifications non enregistrées", "Unsaved changes") : t(`Enregistré · version ${view.version.version}`, `Saved · version ${view.version.version}`)}
    </span>
  );

  const versionsList = (
    <div className="grid max-h-[50dvh] gap-2 overflow-y-auto" data-testid="versions">
      {view.versions.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{t("Version", "Version")} {v.version} · {v.source === "engine" ? t("création du studio", "studio creative") : v.source === "user" ? t("vos modifications", "your changes") : t("retouche", "edit")}</p>
            <p className="truncate text-xs text-muted">{new Date(v.createdAt).toLocaleString()} {v.note ? `· ${v.note}` : ""}</p>
          </div>
          {v.version !== view.version.version ? <Button size="sm" variant="secondary" onClick={() => restore(v.version)}>{t("Restaurer", "Restore")}</Button> : <span className="text-xs text-muted">{t("actuelle", "current")}</span>}
        </div>
      ))}
    </div>
  );
  const formatsList = (
    <div className="grid gap-2 sm:grid-cols-2">
      {FORMATS.map((f) => (
        <Button key={`${f.platform}-${f.aspect}`} variant="secondary" disabled={f.aspect === doc.format.aspect && f.platform === doc.format.platform} onClick={() => reformat(f)}>{f.label}</Button>
      ))}
      <p className="text-xs text-muted sm:col-span-2">{t("Une copie adaptée est créée : textes, couleurs, images et éléments ajoutés sont conservés ; textes, bouton, logo et produit restent entiers dans la zone visible.", "An adapted copy is created: text, colours, images and added elements are kept; text, button, logo and product stay whole in the visible area.")}</p>
    </div>
  );
  const exportList = (
    <div className="grid gap-2">
      <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => exportAs("png")} data-testid="export-png">PNG</Button>
      <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => exportAs("jpeg")} data-testid="export-jpeg">JPEG</Button>
      <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => exportAs("json")}>{t("Document éditable (JSON)", "Editable document (JSON)")}</Button>
      <p className="text-xs text-muted">{t("L'export est rendu par le même moteur que l'aperçu : il correspond exactement à ce que vous voyez (version enregistrée).", "The export is rendered by the same engine as the preview: it matches what you see exactly (saved version).")}</p>
    </div>
  );
  const problemsList = (
    <div className="grid gap-2 text-sm" data-testid="problems">
      {problems.length ? problems.map((p, i) => (
        <button key={i} type="button" className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-left text-warn" onClick={() => (setSelected(p.layerId), setPanel(null))}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span><strong>{doc.layers.find((l) => l.id === p.layerId)?.name ?? p.layerId}</strong> : {p.message}</span>
        </button>
      )) : <p className="text-muted">{t("Aucun problème relevé sur la version enregistrée.", "No issue found on the saved version.")}</p>}
      <p className="text-xs text-muted">{t("Ces contrôles (lisibilité, zones de sécurité, affirmations) signalent ; vous gardez le dernier mot.", "These checks (legibility, safe areas, claims) only flag; you keep the final say.")}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-paper text-ink" data-testid="ad-editor" data-ready={env ? "1" : "0"}>
      {/* Barre supérieure */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-card px-2 sm:gap-2 sm:px-3">
        <IconBtn label={t("Fermer l'éditeur", "Close the editor")} onClick={close} testId="close-editor"><ChevronLeft className="size-5" /></IconBtn>
        {!mobile && <p className="mr-2 hidden truncate font-display text-lg lg:block">{t("Éditeur de publicité", "Ad editor")} · {doc.format.aspect}</p>}
        <IconBtn label={t("Annuler", "Undo")} onClick={undo} disabled={!hist.current?.canUndo} testId="undo"><Undo2 className="size-4" /></IconBtn>
        <IconBtn label={t("Rétablir", "Redo")} onClick={redo} disabled={!hist.current?.canRedo} testId="redo"><Redo2 className="size-4" /></IconBtn>
        {!mobile && (
          <>
            <span className="mx-1 h-6 w-px bg-line" />
            <IconBtn label={t("Ajouter un texte", "Add text")} onClick={addText} testId="add-text"><Type className="size-4" /></IconBtn>
            <IconBtn label={t("Ajouter un rectangle", "Add a rectangle")} onClick={() => addShape("rect")} testId="add-rect"><Square className="size-4" /></IconBtn>
            <IconBtn label={t("Ajouter un cercle", "Add a circle")} onClick={() => addShape("ellipse")} testId="add-ellipse"><Circle className="size-4" /></IconBtn>
            <IconBtn label={t("Ajouter une ligne", "Add a line")} onClick={() => addShape("line")}><Minus className="size-4" /></IconBtn>
            <IconBtn label={t("Ajouter une image", "Add an image")} onClick={() => setPicker("add")}><ImagePlus className="size-4" /></IconBtn>
            <span className="mx-1 h-6 w-px bg-line" />
            <IconBtn label={t("Zoom arrière", "Zoom out")} onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}><Minus className="size-4" /></IconBtn>
            <button type="button" className="h-8 rounded-lg px-2 text-xs tabular-nums hover:bg-paper-2" onClick={() => setZoom(1)} title={t("Ajuster à l'écran", "Fit to screen")}>{Math.round(scale * 100)} %</button>
            <IconBtn label={t("Zoom avant", "Zoom in")} onClick={() => setZoom((z) => Math.min(6, z * 1.2))}><Plus className="size-4" /></IconBtn>
            <IconBtn label={t("Ajuster à l'écran", "Fit to screen")} onClick={() => setZoom(1)}><Maximize2 className="size-4" /></IconBtn>
          </>
        )}
        <div className="flex-1" />
        {!mobile && status}
        {!mobile && (
          <>
            <IconBtn label={t("Problèmes relevés", "Flagged issues")} onClick={() => setPanel("problems")} active={problems.length > 0}><span className="relative"><AlertTriangle className="size-4" />{problems.length > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-warn px-1 text-[10px] text-white">{problems.length}</span>}</span></IconBtn>
            <IconBtn label={t("Formats", "Formats")} onClick={() => setPanel("formats")}><Ratio className="size-4" /></IconBtn>
            <IconBtn label={t("Versions", "Versions")} onClick={() => setPanel("versions")} testId="open-versions"><HistoryIcon className="size-4" /></IconBtn>
            <IconBtn label={t("Dupliquer la création", "Duplicate the creative")} onClick={duplicateCreative}><Copy className="size-4" /></IconBtn>
            <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => setPanel("export")} data-testid="open-export">{t("Exporter", "Export")}</Button>
          </>
        )}
        <Button size="sm" icon={<Save className="size-4" />} loading={saving} disabled={!dirty && !saving} onClick={save} data-testid="save">{t("Enregistrer", "Save")}</Button>
      </header>

      {draft && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warn-soft px-4 py-2 text-sm text-warn" role="status">
          {t("Des modifications non enregistrées ont été retrouvées sur cet appareil.", "Unsaved changes were found on this device.")}
          <Button size="sm" variant="secondary" onClick={() => (hist.current?.reset(doc), applyMany([]), setDoc(draft.doc), hist.current?.reset(draft.doc), setDirty(true), setDraft(null))}>{t("Les reprendre", "Recover them")}</Button>
          <Button size="sm" variant="ghost" onClick={() => { try { localStorage.removeItem(draftKey(docKey)); } catch {} setDraft(null); }}>{t("Ignorer", "Discard")}</Button>
        </div>
      )}
      {busy && <div className="flex items-center gap-2 border-b border-line bg-card px-4 py-2 text-sm"><Spinner /> {busy}</div>}

      {mobile ? (
        <>
          <div ref={stageRef} className="relative grid min-h-0 flex-1 place-items-center overflow-auto bg-paper-2 p-3" onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
            {canvasEl}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-card px-3 py-1">{status}{problems.length > 0 && <button type="button" className="text-xs text-warn underline" onClick={() => setPanel("problems")}>{t(`${problems.length} point(s) à vérifier`, `${problems.length} issue(s)`)}</button>}</div>
          {/* Barre d'outils inférieure (tactile) */}
          <nav className="grid shrink-0 grid-cols-5 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]" data-testid="mobile-toolbar">
            {(
              [
                ["add", <Plus key="a" className="size-5" />, t("Ajouter", "Add")],
                ["text", <PenLine key="t" className="size-5" />, t("Texte", "Text")],
                ["props", <SlidersHorizontal key="p" className="size-5" />, t("Réglages", "Settings")],
                ["layers", <Layers key="l" className="size-5" />, t("Calques", "Layers")],
                ["more", <MoreHorizontal key="m" className="size-5" />, t("Plus", "More")],
              ] as const
            ).map(([k, icon, label]) => (
              <button
                key={k}
                type="button"
                data-testid={`m-${k}`}
                disabled={k === "text" && !textLayer}
                onClick={() => (k === "text" ? textLayer && setEditing(textLayer.id) : setSheet(sheet === k ? null : (k as "add")))}
                className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] disabled:opacity-30", sheet === k && "text-violet-600")}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
          {sheet && (
            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[80] max-h-[55dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-card p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.2)]" data-testid={`sheet-${sheet}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium">{sheet === "add" ? t("Ajouter", "Add") : sheet === "props" ? t("Réglages de l'élément", "Element settings") : sheet === "layers" ? t("Calques", "Layers") : t("Plus", "More")}</p>
                <IconBtn label={t("Fermer", "Close")} onClick={() => setSheet(null)}><X className="size-5" /></IconBtn>
              </div>
              {sheet === "add" && (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      [t("Texte", "Text"), <Type key="t" className="size-6" />, addText],
                      [t("Rectangle", "Rectangle"), <Square key="r" className="size-6" />, () => addShape("rect")],
                      [t("Cercle", "Circle"), <Circle key="c" className="size-6" />, () => addShape("ellipse")],
                      [t("Ligne", "Line"), <Minus key="l" className="size-6" />, () => addShape("line")],
                      [t("Image", "Image"), <ImagePlus key="i" className="size-6" />, () => (setSheet(null), setPicker("add"))],
                    ] as const
                  ).map(([label, icon, fn]) => (
                    <button key={label} type="button" onClick={fn} className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line text-sm">{icon}{label}</button>
                  ))}
                </div>
              )}
              {sheet === "props" && propsPanel}
              {sheet === "layers" && layersPanel}
              {sheet === "more" && (
                <div className="grid gap-4">
                  {askBox}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setPanel("export")}>{t("Exporter", "Export")}</Button>
                    <Button variant="secondary" onClick={() => setPanel("versions")}>{t("Versions", "Versions")}</Button>
                    <Button variant="secondary" onClick={() => setPanel("formats")}>{t("Formats", "Formats")}</Button>
                    <Button variant="secondary" onClick={duplicateCreative}>{t("Dupliquer", "Duplicate")}</Button>
                    <Button variant="secondary" onClick={() => setZoom((z) => Math.min(4, z * 1.25))}>{t("Zoom +", "Zoom +")}</Button>
                    <Button variant="secondary" onClick={() => setZoom(1)}>{t("Ajuster", "Fit")}</Button>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted"><Hand className="size-4" /> {t("Touchez un élément pour le sélectionner, glissez pour le déplacer, tirez les poignées pour le redimensionner ; touchez deux fois un texte pour l'écrire au clavier.", "Tap an element to select it, drag to move it, pull the handles to resize it; double-tap a text to type it.")}</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
          <aside className="min-h-0 overflow-y-auto border-r border-line bg-card p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">{t("Calques", "Layers")}</p>
            {layersPanel}
          </aside>
          <main className="flex min-h-0 flex-col">
            <div ref={stageRef} className="relative grid min-h-0 flex-1 place-items-center overflow-auto bg-paper-2" onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
              {canvasEl}
            </div>
            <div className="border-t border-line bg-card p-3">{askBox}</div>
          </main>
          <aside className="min-h-0 overflow-y-auto border-l border-line bg-card p-4">{propsPanel}</aside>
        </div>
      )}

      <Modal open={panel === "versions"} onClose={() => setPanel(null)} title={t("Versions enregistrées", "Saved versions")}>{versionsList}</Modal>
      <Modal open={panel === "formats"} onClose={() => setPanel(null)} title={t("Adapter à un autre format", "Adapt to another format")}>{formatsList}</Modal>
      <Modal open={panel === "export"} onClose={() => setPanel(null)} title={t("Exporter", "Export")}>{exportList}</Modal>
      <Modal open={panel === "problems"} onClose={() => setPanel(null)} title={t("Points à vérifier", "Things to check")}>{problemsList}</Modal>
      <Modal open={!!photoChoice} onClose={() => setPhotoChoice(null)} title={t("Remplacer la photo", "Replace the photo")}>
        <div className="grid gap-3 text-sm">
          <Button variant="secondary" onClick={() => (setPhotoChoice(null), setSelected(photoLayer()), setPicker(photoLayer() ? "replace" : "add"))}>{t("Choisir dans la bibliothèque (gratuit)", "Choose from the library (free)")}</Button>
          <Button onClick={() => { const topic = photoChoice?.paid?.imageRequest?.topic ?? ask; setPhotoChoice(null); setAsk(""); generateBackground(topic); }}>{t("Créer une nouvelle image avec l'IA…", "Create a new image with AI…")}</Button>
          <p className="text-xs text-muted">{t("La création par l'IA utilise votre forfait : le nombre exact vous est indiqué avant de lancer.", "AI creation uses your plan: the exact amount is shown before starting.")}</p>
        </div>
      </Modal>
      <MediaPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        kinds={["image", "logo"]}
        title={picker === "replace" ? t("Remplacer l'image", "Replace the image") : t("Ajouter une image", "Add an image")}
        onPick={(a) => {
          const id = a[0]?.id;
          if (!id) return;
          const target = picker === "replace" ? (layer?.kind === "image" ? layer.id : photoLayer()) : null;
          if (target) apply({ op: "image", id: target, assetId: id });
          else addImageLayer(id);
        }}
      />
      {cost.dialog}
    </div>
  );
}
