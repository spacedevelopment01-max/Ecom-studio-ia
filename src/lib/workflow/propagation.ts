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
 *  - vidéos et textes : signalés seulement (à reprendre dans leur éditeur).
 * Rien n'est modifié en silence : chaque mise à jour crée une nouvelle version (l'ancienne reste restaurable).
 */
import { all, json, now, one, run } from "../db";
import { loadProject, currentTheme, saveThemeVersion, remember, type Project } from "../projects";
import { brandAt, brandFingerprint, snapshotOf, type BrandSnapshot } from "../brand-versions";
import { themeFingerprint } from "../theme/compile";
import type { ThemeSpec } from "../theme/spec";
import type { AdDocument, Fill, Layer } from "../ad-doc/types";
import type { CmsPlatform } from "../cms-v2/types";
import { L } from "../i18n-server";
import { contrast, hsl, hslToHex, onColor } from "../color";

export type ImpactKind = "theme" | "ad" | "post" | "export" | "video" | "text";
export type ImpactItem = {
  key: string;
  kind: ImpactKind;
  label: string;
  changes: ("name" | "palette" | "fonts" | "logo")[];
  /** Modifié par le client : mis à jour seulement s'il le demande expressément. */
  userEdited: boolean;
  /** Mise à jour automatique possible (sinon : signalé, à reprendre dans l'éditeur). */
  updatable: boolean;
  /** Publication déjà approuvée ou programmée : la mise à jour demandera une nouvelle approbation. */
  reapproval?: boolean;
  createdAt: number;
};

function diff(a: BrandSnapshot | null, b: BrandSnapshot | null): ImpactItem["changes"] {
  if (!a || !b) return [];
  const out: ImpactItem["changes"] = [];
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
  for (const r of all<{ doc_key: string; created_at: number; source: string }>("SELECT d.doc_key, d.created_at, d.source FROM ad_documents d WHERE d.project_id = ? AND d.version = (SELECT MAX(version) FROM ad_documents x WHERE x.doc_key = d.doc_key)", p.id)) {
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
    if (ch.length) items.push({ key: `video:${r.doc_key}`, kind: "video", label: L("Vidéo (à reprendre dans l'éditeur vidéo)", "Video (to redo in the video editor)"), changes: ch, userEdited: false, updatable: false, createdAt: r.created_at });
  }
  for (const r of all<{ doc_key: string; created_at: number }>("SELECT d.doc_key, d.created_at FROM content_documents d WHERE d.project_id = ? AND d.version = (SELECT MAX(version) FROM content_documents x WHERE x.doc_key = d.doc_key)", p.id)) {
    const ch = stale(r.created_at).filter((c) => c === "name");
    if (ch.length) items.push({ key: `text:${r.doc_key}`, kind: "text", label: L("Texte rédigé (nom de marque à revoir)", "Written text (brand name to review)"), changes: ch, userEdited: false, updatable: false, createdAt: r.created_at });
  }
  return { current: fp, items };
}

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

/** Document publicitaire aux couleurs, logo et nom actuels (calques verrouillés ou masqués respectés). */
export function rebrandAdDoc(doc: AdDocument, oldS: BrandSnapshot, newS: BrandSnapshot, logoAssetId: string | null): AdDocument {
  const m = colorMap(oldS, newS);
  const layers = doc.layers.map((l): Layer => {
    if (l.locked) return l;
    switch (l.kind) {
      case "text":
        return { ...l, color: swapColor(l.color, m), text: swapName(l.text, oldS.name, newS.name), shadow: l.shadow ? { ...l.shadow, color: swapColor(l.shadow.color, m) } : null };
      case "button": {
        const fill = swapFill(l.fill, m) as Fill;
        // Texte du bouton lisible sur sa nouvelle couleur (4,5:1), comme à la création.
        const solid = typeof fill === "string" ? fill : fill.stops[0]?.color;
        const color = swapColor(l.color, m);
        return { ...l, fill, color: solid && contrast(color, solid) < 4.5 ? onColor(solid) : color, text: swapName(l.text, oldS.name, newS.name) };
      }
      case "shape":
        return { ...l, fill: swapFill(l.fill, m), stroke: l.stroke ? { ...l.stroke, color: swapColor(l.stroke.color, m) } : null };
      case "image":
        return l.role === "logo" && logoAssetId && oldS.logoAssetId !== newS.logoAssetId ? { ...l, assetId: logoAssetId } : l;
      default:
        return l;
    }
  });
  return { ...doc, layers, brand: { ...doc.brand, palette: { ...doc.brand.palette, ...newS.palette }, name: newS.name || doc.brand.name, fonts: newS.fonts ?? doc.brand.fonts }, meta: { ...doc.meta, source: "engine" } };
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
    const before = colorSchemesV2(artDirection(withBrand(oldS), intent, { language }));
    const after = artDirection(withBrand(newS), intent, { language });
    if (JSON.stringify(spec.settings.color_schemes) === JSON.stringify(before)) spec.settings.color_schemes = colorSchemesV2(after) as any;
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
    spec.settings.color_schemes = colorSchemes(spec.direction as never, newS.palette as never) as any;
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

export type PropagationResult = { updated: { key: string; kind: ImpactKind; detail: string }[]; skipped: { key: string; reason: string }[] };

/**
 * Met à jour les créations CHOISIES (clés de brandImpact), localement et gratuitement. Une création modifiée par le
 * client n'est mise à jour que si `includeEdited` est vrai ; ce qui n'est pas « updatable » est seulement signalé.
 */
export async function applyBrandUpdate(projectId: string, keys: string[], o: { includeEdited?: boolean; userId?: string } = {}): Promise<PropagationResult> {
  const p = loadProject(projectId);
  const impact = brandImpact(p);
  const newS = snapshotOf(p.brand)!;
  const res: PropagationResult = { updated: [], skipped: [] };
  const postIds: string[] = [];
  const exports: CmsPlatform[] = [];
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
  remember(p.id, { kind: "decision", key: "marque.propagation", value: JSON.stringify({ updated: res.updated.map((u) => u.key), skipped: res.skipped.map((s) => s.key) }), source: "user", scope: "brand" });
  return res;
}
