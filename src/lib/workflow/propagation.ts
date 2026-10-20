/**
 * Propagation CONTRÔLÉE d'un changement d'identité de marque (phase 12A).
 *
 * Après une modification de la marque (nom, palette, typographies, logo), le studio LISTE les créations faites avec
 * l'ancienne identité (impact), puis met à jour SEULEMENT celles que le client choisit, sans IA et sans frais :
 *  - boutique / site : nouvelle version du thème (couleurs, typographies, logo, nom), mise en page et retouches gardées ;
 *  - publicités V2 : couleurs, logo et nom remplacés dans le document en calques, nouvelle version rendue ; une
 *    création modifiée par le client n'est jamais écrasée sans son accord explicite ;
 *  - publications V2 non publiées : visuel refait localement (une approbation antérieure ne vaut plus) ;
 *  - exports de thème : nouvel export contrôlé et versionné ;
 *  - vidéos : titres, logo, carte de fin et sous-titres aux nouvelles couleurs, polices, logo et nom, puis nouveau
 *    rendu (local, gratuit) ;
 *  - visuels faits par l'IA (textes dans l'image) : nouvelle version par l'IA, PAYANTE — seulement si le client
 *    l'accepte avec son prix ;
 *  - textes : signalés seulement (à reprendre dans leur éditeur).
 * Rien n'est modifié en silence : chaque mise à jour crée une nouvelle version (l'ancienne reste restaurable).
 */
import { all, json, now, one, run } from "../db";
import { loadProject, currentTheme, saveThemeVersion, remember, type Project } from "../projects";
import { brandAt, brandFingerprint, snapshotOf, type BrandSnapshot } from "../brand-versions";
import { themeFingerprint } from "../theme/compile";
import type { ThemeSpec } from "../theme/spec";
import type { AdDocument, Fill, Layer } from "../ad-doc/types";
import type { VideoDocument } from "../video-v2/types";
import { aiPostEstimate } from "../social-v2/deps";
import { aiPostProbableMicro } from "../ai/estimate";
import type { CmsPlatform } from "../cms-v2/types";
import { L } from "../i18n-server";
import { contrast, hsl, hslToHex, onColor } from "../color";

export type ImpactKind = "theme" | "ad" | "post" | "export" | "video" | "text" | "ai_image";
export type ImpactItem = {
  key: string;
  kind: ImpactKind;
  label: string;
  changes: ("name" | "palette" | "fonts" | "logo" | "identity")[];
  /** Modifié par le client : mis à jour seulement s'il le demande expressément. */
  userEdited: boolean;
  /** Mise à jour automatique possible (sinon : signalé, à reprendre dans l'éditeur). */
  updatable: boolean;
  /** Publication déjà approuvée ou programmée : la mise à jour demandera une nouvelle approbation. */
  reapproval?: boolean;
  /** Mise à jour payante (visuel fait par l'IA) : coût maximal, à accepter par le client. */
  paidMicro?: number;
  createdAt: number;
};

function diff(a: BrandSnapshot | null, b: BrandSnapshot | null): ImpactItem["changes"] {
  if (!a || !b) return [];
  const out: ImpactItem["changes"] = [];
  if (JSON.stringify(a.identity) !== JSON.stringify(b.identity) || JSON.stringify(a.tone) !== JSON.stringify(b.tone)) out.push("identity");
  if (a.name !== b.name) out.push("name");
  if (JSON.stringify(Object.entries(a.palette).sort()) !== JSON.stringify(Object.entries(b.palette).sort())) out.push("palette");
  if (JSON.stringify(a.fonts) !== JSON.stringify(b.fonts)) out.push("fonts");
  if (a.logoAssetId !== b.logoAssetId) out.push("logo");
  return out;
}

/** Créations faites avec une autre identité que l'actuelle. */
export function brandImpact(p: Project): { current: string; items: ImpactItem[] } {
  const cur = snapshotOf(p.brand);
  const fp = brandFingerprint(cur);
  const items: ImpactItem[] = [];
  const stale = (t: number) => {
    const at = brandAt(p.id, t);
    return at && at.fingerprint !== fp ? diff(at.snapshot, cur) : [];
  };
  const th = currentTheme(p.id);
  if (th && !th.spec.imported) {
    const ch = stale(th.version.created_at);
    if (ch.length) items.push({ key: `theme:${th.version.id}`, kind: "theme", label: L(`Boutique / site (version ${th.version.number})`, `Store / website (version ${th.version.number})`), changes: ch, userEdited: th.version.author === "user", updatable: true, createdAt: th.version.created_at });
  }
  for (const r of all<{ doc_key: string; created_at: number; source: string }>("SELECT d.doc_key, d.created_at, d.source FROM ad_documents d WHERE d.project_id = ? AND d.doc_key NOT LIKE 'post:%' AND d.version = (SELECT MAX(version) FROM ad_documents x WHERE x.doc_key = d.doc_key)", p.id)) {
    // Affiches de publications (« post: ») : traitées avec leur publication ci-dessous (visuel refait à la marque).
    const ch = stale(r.created_at);
    if (!ch.length) continue;
    const edited = !!one("SELECT 1 FROM ad_documents WHERE project_id = ? AND doc_key = ? AND source IN ('user','ai_local','ai')", p.id, r.doc_key);
    items.push({ key: `ad:${r.doc_key}`, kind: "ad", label: L("Publicité", "Ad"), changes: ch, userEdited: edited, updatable: true, createdAt: r.created_at });
  }
  for (const r of all<{ id: string; status: string; media: string; network: string; scheduled_at: number; user_edited: number }>("SELECT id, status, media, network, scheduled_at, user_edited FROM posts WHERE project_id = ? AND engine = 'v2' AND status NOT IN ('published','publishing','cancelled') AND media != '[]'", p.id)) {
    const mid = json<string[]>(r.media, [])[0];
    const a = mid ? one<{ created_at: number; origin: string; role: string | null }>("SELECT created_at, origin, role FROM assets WHERE id = ?", mid) : null;
    // Seuls les visuels COMPOSÉS à la marque en dépendent (photos, packshots, scènes, vidéos de la bibliothèque : non).
    if (!a || a.origin !== "generated" || !["social", "ad", "banner"].includes(a.role ?? "")) continue;
    const ch = stale(a.created_at);
    if (!ch.length) continue;
    items.push({ key: `post:${r.id}`, kind: "post", label: L(`Publication ${r.network}`, `${r.network} post`), changes: ch, userEdited: !!r.user_edited, updatable: true, reapproval: ["approved", "scheduled"].includes(r.status), createdAt: a.created_at });
  }
  const themeFp = th ? themeFingerprint(th.spec) : null;
  const seen = new Set<string>();
  for (const r of all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL ORDER BY created_at DESC", p.id)) {
    const m = json<{ platform?: string; fingerprint?: string }>(r.meta, {});
    if (!m.platform || m.platform.endsWith("-csv") || seen.has(m.platform)) continue;
    seen.add(m.platform);
    const ch = stale(r.created_at);
    if (ch.length || (themeFp && m.fingerprint && m.fingerprint !== themeFp && items.some((i) => i.kind === "theme")))
      items.push({ key: `export:${m.platform}`, kind: "export", label: L(`Export ${m.platform}`, `${m.platform} export`), changes: ch, userEdited: false, updatable: true, createdAt: r.created_at });
  }
  for (const r of all<{ doc_key: string; created_at: number }>("SELECT d.doc_key, d.created_at FROM video_documents d WHERE d.project_id = ? AND d.version = (SELECT MAX(version) FROM video_documents x WHERE x.doc_key = d.doc_key)", p.id)) {
    const ch = stale(r.created_at);
    if (!ch.length) continue;
    const edited = !!one("SELECT 1 FROM video_documents WHERE project_id = ? AND doc_key = ? AND source IN ('user','ai_local','ai')", p.id, r.doc_key);
    items.push({ key: `video:${r.doc_key}`, kind: "video", label: L("Vidéo", "Video"), changes: ch, userEdited: edited, updatable: true, createdAt: r.created_at });
  }
  // Visuels faits par l'IA : textes et couleurs DANS l'image → seule une nouvelle version par l'IA les met à jour.
  for (const r of all<{ id: string; meta: string; created_at: number }>("SELECT id, meta, created_at FROM assets WHERE project_id = ? AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.aiPost') IS NOT NULL AND json_extract(meta, '$.aiPost.issues') IS NULL AND json_extract(meta, '$.reformat') IS NULL", p.id)) {
    const ch = stale(r.created_at).filter((c) => c !== "fonts");
    if (!ch.length) continue;
    const ad = !!json<{ aiAd?: boolean }>(r.meta, {}).aiAd;
    items.push({ key: `ai_image:${r.id}`, kind: "ai_image", label: ad ? L("Publicité faite par l'IA (nouvelle version payante)", "AI-made ad (paid new version)") : L("Publication faite par l'IA (nouvelle version payante)", "AI-made post (paid new version)"), changes: ch, userEdited: false, updatable: true, paidMicro: aiImageRedoMicro(), createdAt: r.created_at });
  }
  for (const r of all<{ doc_key: string; created_at: number }>("SELECT d.doc_key, d.created_at FROM content_documents d WHERE d.project_id = ? AND d.version = (SELECT MAX(version) FROM content_documents x WHERE x.doc_key = d.doc_key)", p.id)) {
    const ch = stale(r.created_at).filter((c) => c === "name" || c === "identity");
    if (ch.length) items.push({ key: `text:${r.doc_key}`, kind: "text", label: L("Texte rédigé (nom de marque à revoir)", "Written text (brand name to review)"), changes: ch, userEdited: false, updatable: false, createdAt: r.created_at });
  }
  for (const item of items) if (item.changes.includes("identity")) { item.updatable = false; item.label += L(" — direction complète à adapter dans l’éditeur", " — complete direction to adapt in the editor"); }
  return { current: fp, items };
}

/** Prix maximal d'une nouvelle version d'un visuel fait par l'IA (même calcul que la création guidée). */
/** Devis d'une nouvelle version IA : coût probable (un essai) ; le plafond de la tâche (3 essais au plus) reste `aiPostEstimate`. */
const aiImageRedoMicro = (): number => aiPostProbableMicro();

// ---------------------------------------------------------------- remplacements (sans IA)

/** Correspondance ancienne → nouvelle couleur, rôle par rôle de la palette. */
export function colorMap(oldS: BrandSnapshot, newS: BrandSnapshot): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(oldS.palette)) {
    const n = newS.palette[k];
    if (v && n && v.toLowerCase() !== n.toLowerCase()) m.set(v.toLowerCase(), n);
  }
  return m;
}
/**
 * Couleur ancienne → nouvelle : correspondance exacte d'une couleur de la palette ; sinon, teinte DÉRIVÉE (plus
 * claire, plus foncée : dégradés, ombres) d'une couleur de l'ancienne palette → même écart appliqué à la nouvelle.
 * Les neutres (blanc, noir, gris) ne changent pas.
 */
function swapColor(c: string, m: Map<string, string>): string {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return c;
  const exact = m.get(c.toLowerCase());
  if (exact) return exact;
  const [h, sat, l] = hsl(c);
  if (sat < 0.12) return c;
  let best: { from: string; to: string; d: number } | null = null;
  for (const [from, to] of m) {
    const [fh, fs] = hsl(from);
    const dh = Math.min(Math.abs(h - fh), 360 - Math.abs(h - fh));
    const d = dh / 360 + Math.abs(sat - fs) * 0.5;
    if (dh <= 18 && (!best || d < best.d)) best = { from, to, d };
  }
  if (!best) return c;
  const [fh, fs, fl] = hsl(best.from);
  const [th, ts, tl] = hsl(best.to);
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return hslToHex((th + (h - fh) + 360) % 360, clamp(fs ? (ts * sat) / fs : ts), clamp(tl + (l - fl)));
}
const swapFill = (f: Fill | null, m: Map<string, string>): Fill | null => (f == null ? f : typeof f === "string" ? swapColor(f, m) : { ...f, stops: f.stops.map((s) => ({ ...s, color: swapColor(s.color, m) })) });
const swapName = (t: string, oldName: string, newName: string) => (oldName && newName && oldName !== newName ? t.split(oldName).join(newName) : t);
/** Police des titres → nouvelle police des titres, police des textes → nouvelle police des textes (les autres restent). */
const swapFont = (family: string, oldS: BrandSnapshot, newS: BrandSnapshot) => (!oldS.fonts || !newS.fonts ? family : family === oldS.fonts.heading ? newS.fonts.heading : family === oldS.fonts.body ? newS.fonts.body : family);

/** Document publicitaire aux couleurs, logo et nom actuels (calques verrouillés ou masqués respectés). */
export function rebrandAdDoc(doc: AdDocument, oldS: BrandSnapshot, newS: BrandSnapshot, logoAssetId: string | null): AdDocument {
  const m = colorMap(oldS, newS);
  const layers = doc.layers.map((l): Layer => {
    if (l.locked) return l;
    switch (l.kind) {
      case "text":
        return { ...l, color: swapColor(l.color, m), text: swapName(l.text, oldS.name, newS.name), font: { ...l.font, family: swapFont(l.font.family, oldS, newS) }, shadow: l.shadow ? { ...l.shadow, color: swapColor(l.shadow.color, m) } : null };
      case "button": {
        const fill = swapFill(l.fill, m) as Fill;
        // Texte du bouton lisible sur sa nouvelle couleur (4,5:1), comme à la création.
        const solid = typeof fill === "string" ? fill : fill.stops[0]?.color;
        const color = swapColor(l.color, m);
        return { ...l, fill, color: solid && contrast(color, solid) < 4.5 ? onColor(solid) : color, text: swapName(l.text, oldS.name, newS.name), font: { ...l.font, family: swapFont(l.font.family, oldS, newS) } };
      }
      case "shape":
        return { ...l, fill: swapFill(l.fill, m), stroke: l.stroke ? { ...l.stroke, color: swapColor(l.stroke.color, m) } : null };
      case "image":
        return l.role === "logo" && logoAssetId && oldS.logoAssetId !== newS.logoAssetId ? { ...l, assetId: logoAssetId } : l;
      default:
        return l;
    }
  });
  return { ...doc, layers, brand: { ...doc.brand, palette: { ...doc.brand.palette, ...newS.palette }, name: newS.name || doc.brand.name, fonts: newS.fonts ?? doc.brand.fonts }, meta: { ...doc.meta, source: "engine", ...(doc.meta.recipe ? { recipe: { ...doc.meta.recipe, palette: { ...doc.meta.recipe.palette, ...newS.palette }, brand: newS.name || doc.meta.recipe.brand } } : {}) } };
}

/** Vidéo aux couleurs, polices, logo et nom actuels : titres, carte de fin, sous-titres (plans filmés inchangés). */
export function rebrandVideoDoc(doc: VideoDocument, oldS: BrandSnapshot, newS: BrandSnapshot, logoAssetId: string | null): VideoDocument {
  const asDoc = (layers: Layer[]): AdDocument => ({ version: 1, width: doc.width, height: doc.height, background: "transparent", safe: doc.safe, format: { platform: null, aspect: doc.aspect }, layers, brand: doc.brand, meta: { conceptId: null, source: "engine", createdFrom: null } });
  const m = colorMap(oldS, newS);
  const next = structuredClone(doc);
  next.clips = doc.clips.map((c) => ({
    ...c,
    overlays: c.overlays.length ? rebrandAdDoc(asDoc(c.overlays), oldS, newS, logoAssetId).layers : [],
    source: c.source.kind === "doc" ? { ...c.source, doc: rebrandAdDoc(c.source.doc, oldS, newS, logoAssetId) } : c.source.kind === "color" ? { ...c.source, color: swapColor(c.source.color, m) } : c.source,
  }));
  const st = doc.subtitles.style;
  next.subtitles = { ...doc.subtitles, style: { ...st, family: swapFont(st.family, oldS, newS), color: swapColor(st.color, m), background: st.background ? swapColor(st.background, m) : null }, cues: doc.subtitles.cues.map((q) => ({ ...q, text: swapName(q.text, oldS.name, newS.name) })) };
  next.brand = { ...doc.brand, palette: { ...doc.brand.palette, ...newS.palette }, name: newS.name || doc.brand.name, fonts: newS.fonts ?? doc.brand.fonts };
  return next;
}

/** Thème aux couleurs, typographies, logo et nom actuels ; mise en page et retouches conservées. */
export async function rebrandTheme(p: Project, spec0: ThemeSpec, oldS: BrandSnapshot, newS: BrandSnapshot): Promise<{ spec: ThemeSpec; notes: string[] }> {
  const spec = structuredClone(spec0);
  const notes: string[] = [];
  if (oldS.name !== newS.name && spec.store.shopName === oldS.name) spec.store.shopName = newS.name;
  if (spec.meta?.engine === "v2") {
    // V2 : schémas recalculés par le design system à partir de la nouvelle palette — seulement si le client n'a pas
    // retouché les couleurs (schémas identiques à ceux de l'ancienne identité) ; sinon remplacement couleur par couleur.
    const { websiteIntent } = await import("../theme-v2/intent");
    const { artDirection } = await import("../theme-v2/art-direction");
    const { colorSchemesV2 } = await import("../theme-v2/design-system");
    const language = spec.meta.v2?.language;
    const withBrand = (s: BrandSnapshot): Project => ({ ...p, brand: { ...p.brand!, name: s.name, palette: s.palette as any, fonts: s.fonts ?? p.brand!.fonts } });
    const intent = websiteIntent(p);
    // Anciens schémas : calculés avec ou sans palette validée (le client vient peut-être de la valider en la changeant).
    const unlocked = (q: Project): Project => ({ ...q, brand: { ...q.brand!, validated: (q.brand!.validated ?? []).filter((k) => k !== "palette") } });
    const lockedQ = (q: Project): Project => ({ ...q, brand: { ...q.brand!, validated: [...new Set([...(q.brand!.validated ?? []), "palette"])] } });
    // … et sans le verrou de palette par direction (site créé avant ce verrou).
    const legacy = (q: Project): Project => ({ ...q, brand: { ...q.brand!, paletteMode: undefined } });
    const befores = [withBrand(oldS), unlocked(withBrand(oldS)), lockedQ(withBrand(oldS)), legacy(withBrand(oldS)), legacy(unlocked(withBrand(oldS))), legacy(lockedQ(withBrand(oldS)))].map((q) => JSON.stringify(colorSchemesV2(artDirection(q, intent, { language }))));
    const after = artDirection(withBrand(newS), intent, { language });
    if (befores.includes(JSON.stringify(spec.settings.color_schemes))) spec.settings.color_schemes = colorSchemesV2(after) as any;
    else {
      spec.settings.color_schemes = JSON.parse(remapJson(JSON.stringify(spec.settings.color_schemes), colorMap(oldS, newS)));
      notes.push(L("couleurs du site retouchées à la main : seules les couleurs exactes de l'ancienne palette ont été remplacées", "site colours edited by hand: only the exact old palette colours were replaced"));
    }
    if (newS.fonts && JSON.stringify(oldS.fonts) !== JSON.stringify(newS.fonts) && spec.settings.type_heading_font === oldS.fonts?.heading) {
      spec.settings.type_heading_font = newS.fonts.heading;
      spec.settings.type_body_font = newS.fonts.body;
    }
  } else if (spec.direction) {
    const { colorSchemes } = await import("../theme/directions");
    // Palette verrouillée : le site garde les couleurs de SA direction (la marque a peut-être déjà choisi la suivante).
    const { paletteFor } = await import("../theme/direction-palettes");
    const pal = p.brand?.paletteMode ? paletteFor({ ...p.brand, palette: newS.palette as never }, spec.direction as never) : newS.palette;
    spec.settings.color_schemes = colorSchemes(spec.direction as never, pal as never) as any;
  }
  // Logo : fichiers du thème remplacés par les déclinaisons actuelles (même mécanisme que le choix d'un logo).
  if (oldS.logoAssetId !== newS.logoAssetId && newS.logoAssetId) {
    const { latestAsset } = await import("../engine/images");
    const light = latestAsset(p.id, "logo-light")?.id ?? newS.logoAssetId;
    const horizontal = latestAsset(p.id, "logo-horizontal")?.id ?? newS.logoAssetId;
    const fav = latestAsset(p.id, "favicon")?.id;
    for (const f of Object.keys(spec.files)) {
      const next = /^es-logo-clair-/.test(f) ? light : /^es-logo-/.test(f) ? horizontal : /^es-favicon-/.test(f) && fav ? fav : null;
      if (next) spec.files[f] = next;
    }
  }
  return { spec, notes };
}

const remapJson = (s: string, m: Map<string, string>) => s.replace(/#[0-9a-fA-F]{6}\b/g, (c) => swapColor(c, m));

// ---------------------------------------------------------------- application

/** Versions animées d'une création mise à jour : refaites (locales, gratuites), même animation et même musique. */
async function reanimate(projectId: string, userId: string, docKey: string) {
  const rows = all<{ style: string; music: number | null }>("SELECT json_extract(meta, '$.animatedPost.style') style, json_extract(meta, '$.animatedPost.music') music FROM assets WHERE project_id = ? AND deleted_at IS NULL AND json_extract(meta, '$.animatedPost.docKey') = ? ORDER BY created_at DESC LIMIT 1", projectId, docKey);
  if (!rows.length) return;
  const { animateDocToAsset } = await import("../ad-doc/animate-server");
  await animateDocToAsset(projectId, userId, docKey, (rows[0].style || "pop") as "pop", { music: rows[0].music !== 0 }).catch((e) => console.warn("[marque] version animée", (e as Error).message));
}

export type PropagationResult = { updated: { key: string; kind: ImpactKind; detail: string }[]; skipped: { key: string; reason: string }[] };

/**
 * Met à jour les créations CHOISIES (clés de brandImpact), localement et gratuitement. Une création modifiée par le
 * client n'est mise à jour que si `includeEdited` est vrai ; ce qui n'est pas « updatable » est seulement signalé.
 */
/** Résumé lisible de la mise à jour (mémoire du projet) : nombre de créations par type, mises à jour et laissées. */
function propagationSummary(res: PropagationResult) {
  const NAMES: Record<ImpactKind, [string, string]> = { theme: ["boutique / site", "store / website"], ad: ["publicité(s)", "ad(s)"], post: ["publication(s)", "post(s)"], export: ["export(s)", "export(s)"], video: ["vidéo(s)", "video(s)"], text: ["texte(s)", "text(s)"], ai_image: ["visuel(s) IA (nouvelle version)", "AI visual(s) (new version)"] };
  const count = new Map<ImpactKind, number>();
  for (const u of res.updated) count.set(u.kind, (count.get(u.kind) ?? 0) + 1);
  const parts = [...count].map(([k, n]) => `${n} ${L(NAMES[k][0], NAMES[k][1])}`);
  return L(`Nouvelle identité appliquée : ${parts.join(", ") || "aucune création"} ; ${res.skipped.length} laissée(s) telle(s) quelle(s).`, `New identity applied: ${parts.join(", ") || "no creation"}; ${res.skipped.length} left as is.`);
}

export async function applyBrandUpdate(projectId: string, keys: string[], o: { includeEdited?: boolean; userId?: string; /** Prix accepté pour les nouvelles versions IA (somme) ; sans lui, rien de payant ne part. */ approvedPaidMicro?: number | null } = {}): Promise<PropagationResult> {
  const p = loadProject(projectId);
  const impact = brandImpact(p);
  const newS = snapshotOf(p.brand)!;
  const res: PropagationResult = { updated: [], skipped: [] };
  const postIds: string[] = [];
  const exports: CmsPlatform[] = [];
  const paid = impact.items.filter((i) => keys.includes(i.key) && i.kind === "ai_image");
  const paidTotal = paid.reduce((n, i) => n + (i.paidMicro ?? 0), 0);
  const paidOk = paidTotal > 0 && o.approvedPaidMicro != null && o.approvedPaidMicro >= paidTotal;
  for (const key of keys) {
    const it = impact.items.find((i) => i.key === key);
    if (!it) {
      res.skipped.push({ key, reason: L("déjà à jour", "already up to date") });
      continue;
    }
    if (!it.updatable) {
      res.skipped.push({ key, reason: L("à reprendre dans son éditeur (pas de mise à jour automatique)", "to redo in its editor (no automatic update)") });
      continue;
    }
    if (it.userEdited && !o.includeEdited) {
      res.skipped.push({ key, reason: L("modifié par vous : conservé tel quel (cochez « inclure mes créations modifiées » pour le mettre à jour)", "edited by you: kept as is (tick “include my edited creations” to update it)") });
      continue;
    }
    const oldS = brandAt(p.id, it.createdAt)?.snapshot;
    if (!oldS) continue;
    if (it.kind === "theme") {
      const th = currentTheme(p.id)!;
      const { spec, notes } = await rebrandTheme(p, th.spec, oldS, newS);
      const v = saveThemeVersion(p.id, spec, JSON.stringify({ fr: "Identité de marque mise à jour", en: "Brand identity updated" }), "system");
      res.updated.push({ key, kind: "theme", detail: `v${v.number}${notes.length ? ` — ${notes.join(" ; ")}` : ""}` });
    } else if (it.kind === "ad") {
      const { latestDoc, saveAndRender } = await import("../ad-doc/store");
      const docKey = key.slice(3);
      const cur = latestDoc(p.id, docKey);
      if (!cur) continue;
      const doc = rebrandAdDoc(cur.doc, oldS, newS, p.brand?.logo?.assetId ?? null);
      const v = await saveAndRender(p.id, o.userId ?? p.userId, docKey, doc, L("identité de marque mise à jour", "brand identity updated"));
      run("UPDATE ad_documents SET source = 'engine' WHERE id = ?", v.id);
      res.updated.push({ key, kind: "ad", detail: `v${v.version}` });
      await reanimate(p.id, o.userId ?? p.userId, docKey);
    } else if (it.kind === "video") {
      const { latestVideo, saveVideoVersion } = await import("../video-v2/store");
      const { enqueue } = await import("../jobs");
      const docKey = key.slice(6);
      const cur = latestVideo(p.id, docKey);
      if (!cur) continue;
      const v = saveVideoVersion(p.id, docKey, { ...rebrandVideoDoc(cur.doc, oldS, newS, p.brand?.logo?.assetId ?? null), meta: { ...cur.doc.meta, source: "engine" } }, { note: L("identité de marque mise à jour", "brand identity updated") });
      enqueue({ userId: o.userId ?? p.userId, projectId: p.id, type: "video.v2.render", label: L("Vidéo : nouvelle identité", "Video: new identity"), payload: { projectId: p.id, docKey } });
      res.updated.push({ key, kind: "video", detail: L(`v${v.version}, rendu en cours`, `v${v.version}, rendering`) });
    } else if (it.kind === "ai_image") {
      if (!paidOk) {
        res.skipped.push({ key, reason: L("nouvelle version payante : prix à accepter", "paid new version: price to accept") });
        continue;
      }
      const { getAsset, assetMeta } = await import("../library");
      const { redoRequest } = await import("../media/ai-image-variants");
      const { enqueue } = await import("../jobs");
      const a = getAsset(key.slice(9));
      if (!a) continue;
      const meta = assetMeta<Record<string, any>>(a);
      const request=redoRequest(meta,{aspect:(meta.aspect??"4:5") as "4:5"});
      const {assertJobEntitlements}=await import("../job-entitlements");
      try{assertJobEntitlements("image.ai_post",p.id,{request});}catch(e){res.skipped.push({key,reason:(e as Error).message});continue;}
      enqueue({ userId: o.userId ?? p.userId, projectId: p.id, type: "image.ai_post", label: L("Visuel IA : nouvelle identité", "AI visual: new identity"), payload: { projectId: p.id, costCapMicro: aiPostEstimate(), request } });
      res.updated.push({ key, kind: "ai_image", detail: L("nouvelle version en préparation (l'ancienne est gardée)", "new version being prepared (the old one is kept)") });
    } else if (it.kind === "post") {
      postIds.push(key.slice(5));
    } else if (it.kind === "export") {
      exports.push(key.slice(7) as CmsPlatform);
    }
  }
  if (postIds.length) {
    // Visuels refaits localement (aucune IA) ; l'ancienne approbation ne couvre plus le nouveau visuel.
    const { produceBatch } = await import("../social-v2/production");
    const { realSocialDeps } = await import("../social-v2/deps");
    run(`UPDATE posts SET media = '[]', updated_at = ? WHERE id IN (${postIds.map(() => "?").join(",")})`, now(), ...postIds);
    const r = await produceBatch(loadProject(p.id), postIds, realSocialDeps(null, loadProject(p.id), false), { allowPaid: false, maxCostEur: 0, batchSize: 500 });
    for (const pid of postIds) res.updated.push({ key: `post:${pid}`, kind: "post", detail: L("visuel refait localement, à réapprouver", "visual remade locally, to approve again") });
    if (r.failed) res.skipped.push({ key: "posts", reason: `${r.failed} ${L("visuel(s) non refait(s)", "visual(s) not remade")}` });
  }
  if (exports.length) {
    const th = currentTheme(p.id);
    if (th) {
      const { exportAndRecord } = await import("../cms-v2/record");
      for (const pf of exports) {
        const r = await exportAndRecord({ id: p.id, userId: p.userId }, { spec: th.spec, number: th.version.number, id: th.version.id }, pf, "fr");
        res.updated.push({ key: `export:${pf}`, kind: "export", detail: `${r.name} (${r.verdict})` });
      }
    }
  }
  remember(p.id, { kind: "decision", key: "marque.propagation", value: propagationSummary(res), source: "user", scope: "brand" });
  return res;
}

/**
 * Palette changée par le client (onglet Marque) : le site actuel prend aussitôt ses nouvelles couleurs (localement,
 * gratuitement, nouvelle version du thème, mise en page et retouches conservées). Rien à faire s'il est déjà à jour.
 */
export async function applyPaletteToSite(projectId: string): Promise<boolean> {
  const item = brandImpact(loadProject(projectId)).items.find((i) => i.kind === "theme" && i.changes.includes("palette"));
  if (!item) return false;
  const r = await applyBrandUpdate(projectId, [item.key], { includeEdited: true });
  return r.updated.length > 0;
}

/** Remplace l'ancienne signature par la nouvelle dans un texte (même casse en début de phrase ou en minuscules). */
export function replaceTagline(text: string, from: string, to: string): string {
  const a = from.trim().replace(/[.!…]+$/, "");
  const b = to.trim().replace(/[.!…]+$/, "");
  if (!a || a === b) return text;
  const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(esc, "gi"), (m) => (m === m.toUpperCase() && m !== m.toLowerCase() ? b.toUpperCase() : m[0] === m[0].toLowerCase() ? b.charAt(0).toLowerCase() + b.slice(1) : b.charAt(0).toUpperCase() + b.slice(1)));
}

/**
 * Signature (slogan) changée par le client : le site actuel l'affiche aussitôt (pied de page, textes), localement et
 * gratuitement, dans une nouvelle version du thème (l'ancienne reste restaurable). Rien à faire si elle n'y figure pas.
 */
export function applyTaglineToSite(projectId: string, from: string, to: string): boolean {
  const th = currentTheme(projectId);
  if (!th || !from.trim()) return false;
  const before = JSON.stringify(th.spec);
  // Remplacement dans les valeurs texte seulement (les clés et identifiants ne contiennent jamais la signature).
  const walk = (v: unknown): unknown => (typeof v === "string" ? replaceTagline(v, from, to) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  const spec = walk(th.spec) as ThemeSpec;
  if (JSON.stringify(spec) === before) return false;
  saveThemeVersion(projectId, spec, JSON.stringify({ fr: "Signature de marque mise à jour", en: "Brand tagline updated" }), "system");
  return true;
}

/**
 * Publicités et affiches de publication du studio qui portent l'ancienne signature : nouvelle version rendue avec la
 * nouvelle (localement, sans IA). Une création modifiée à la main par le client n'est pas touchée.
 */
export async function applyTaglineToCreations(projectId: string, userId: string, from: string, to: string): Promise<number> {
  if (!from.trim()) return 0;
  const { latestDoc, saveAndRender } = await import("../ad-doc/store");
  const keys = all<{ doc_key: string }>("SELECT DISTINCT doc_key FROM ad_documents WHERE project_id = ?", projectId).map((r) => r.doc_key);
  let n = 0;
  for (const key of keys) {
    const cur = latestDoc(projectId, key);
    if (!cur || cur.version.source === "user") continue;
    const layers = cur.doc.layers.map((l) => (l.kind === "text" && typeof (l as { text?: unknown }).text === "string" ? { ...l, text: replaceTagline((l as { text: string }).text, from, to) } : l)) as Layer[];
    if (JSON.stringify(layers) === JSON.stringify(cur.doc.layers)) continue;
    const v = await saveAndRender(projectId, userId, key, { ...cur.doc, layers }, L("signature de marque mise à jour", "brand tagline updated"));
    run("UPDATE ad_documents SET source = 'engine' WHERE id = ?", v.id);
    // Affiche d'une publication : la publication montre la nouvelle image (une approbation antérieure ne vaut plus).
    const prev = cur.version.renderedAssetId;
    if (key.startsWith("post:") && prev && v.renderedAssetId) {
      for (const r of all<{ id: string; media: string; status: string }>("SELECT id, media, status FROM posts WHERE project_id = ? AND media LIKE ? AND status NOT IN ('published','publishing')", projectId, `%${prev}%`)) {
        const media = (json<string[]>(r.media, []) ?? []).map((m) => (m === prev ? v.renderedAssetId! : m));
        run("UPDATE posts SET media = ?, status = CASE WHEN status IN ('approved','scheduled') THEN 'review' ELSE status END, updated_at = ? WHERE id = ?", JSON.stringify(media), now(), r.id);
      }
    }
    n++;
  }
  return n;
}
