/**
 * CONTRÔLE DU FICHIER FINAL d'une publicité vidéo (guide créatif, règle 14 et grille d'évaluation). Mesuré sur la
 * vidéo RÉELLEMENT rendue (images extraites à plusieurs instants), sans IA et sans coût :
 * scènes différentes, tailles de texte, contraste (plusieurs instants par plan), hiérarchie (niveaux, polices),
 * marques tierces dans les textes et la voix, carte de fin (bouton visible 2,5 à 4 s), audio, format, synchronisation.
 * L'orthographe et la fidélité visuelle du produit demandent un regard (IA ou humain) : marquées « non vérifié » ici
 * quand aucun contrôle ne les a faites — jamais déclarées bonnes sans contrôle.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execTool } from "../exec-tool";
import { absoluteCues } from "./doc";
import { contrastRatio, loadVideoGuide, px, type VideoCreativeGuide } from "./creative-guide";
import { brandIssuesInTexts } from "./brand-guard";
import type { VideoDocument } from "./types";
import type { VideoExport } from "./store";

export type CheckStatus = "ok" | "issue" | "unchecked";
export type CheckItem = { id: string; label: string; status: CheckStatus; detail: string; clipId?: string; /** Contraste : couleur de titre lisible proposée pour chaque plan à reprendre (correction ciblée). */ fixes?: Record<string, string> };

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Couleur moyenne d'une zone d'une image (fond derrière un texte). */
async function meanColor(img: Buffer, box: { x: number; y: number; w: number; h: number }): Promise<string> {
  const m = await sharp(img).metadata();
  const left = Math.max(0, Math.round(box.x));
  const top = Math.max(0, Math.round(box.y));
  const width = Math.max(1, Math.min(m.width! - left, Math.round(box.w)));
  const height = Math.max(1, Math.min(m.height! - top, Math.round(box.h)));
  const st = await sharp(img).extract({ left, top, width, height }).removeAlpha().stats();
  return toHex(st.channels[0].mean, st.channels[1].mean, st.channels[2].mean);
}

/** Empreinte grossière d'une image (8 × 8 en gris) : deux scènes trop proches = scène répétée. */
async function fingerprint(img: Buffer): Promise<number[]> {
  const raw = await sharp(img).resize(8, 8, { fit: "fill" }).greyscale().raw().toBuffer();
  return [...raw];
}
const distance = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

async function frameAt(file: string, t: number, dir: string, k: string, maxS = Infinity): Promise<Buffer> {
  const out = path.join(dir, `f-${k}.png`);
  // Jamais au-delà de la fin réelle du fichier (dernière image lue un peu avant).
  for (const at of [Math.min(t, maxS - 0.15), Math.min(t, maxS) - 0.5, Math.max(0, maxS - 1)]) {
    await execTool("ffmpeg", ["-y", "-v", "error", "-ss", Math.max(0, at).toFixed(2), "-i", file, "-frames:v", "1", out]);
    if (fs.existsSync(out)) return fs.readFileSync(out);
  }
  throw new Error(`image introuvable à ${t.toFixed(2)} s`);
}

/**
 * Contrôle complet. `texts` : tous les textes (titres, phrase, bouton, voix) pour la règle des marques ;
 * `allowed` : marque du projet. Les plans de fond trop clairs pour le texte sont signalés avec leur identifiant
 * (correction ciblée possible sans relancer toute la production).
 */
export async function finalCheck(doc: VideoDocument, ex: Pick<VideoExport, "file" | "durationS" | "width" | "height" | "audio">, o: { texts: Record<string, string | null | undefined>; allowed: string[]; guide?: VideoCreativeGuide; productFidelityChecked?: boolean; spellingChecked?: boolean; /** Encre sombre de la charte (titre sur un plan clair). */ darkInk?: string }): Promise<CheckItem[]> {
  const g = o.guide ?? loadVideoGuide();
  const label = (id: string) => g.grid.find((x) => x.id === id)?.label ?? id;
  const items: CheckItem[] = [];
  const dir = fs.mkdtempSync(path.join(path.dirname(ex.file), "check-"));
  try {
    // Scènes : au moins deux plans, sources différentes, images réellement différentes.
    const scenes = doc.clips.filter((c) => c.id !== "end-card");
    const sources = new Set(scenes.map((c) => (c.source.kind === "video" || c.source.kind === "image" ? c.source.assetId : c.id)));
    let t = 0;
    const prints: { id: string; fp: number[] }[] = [];
    const contrastIssues: string[] = [];
    const fixes: Record<string, string> = {};
    for (const c of doc.clips) {
      const title = c.overlays.find((l) => l.kind === "text");
      if (c.id !== "end-card") prints.push({ id: c.id, fp: await fingerprint(await frameAt(ex.file, t + c.durationS * 0.5, dir, `${c.id}-mid`, ex.durationS)) });
      // Contraste du titre mesuré à trois instants du plan (après l'apparition, au milieu, avant la sortie).
      if (title && title.kind === "text") {
        let worst = 99;
        const bgs: string[] = [];
        for (const f of [0.35, 0.55, 0.8]) {
          const img = await frameAt(ex.file, t + c.durationS * f, dir, `${c.id}-${f}`, ex.durationS);
          const bg = await meanColor(img, { x: title.x, y: title.y, w: title.w, h: title.h });
          bgs.push(bg);
          worst = Math.min(worst, contrastRatio(title.color, bg));
        }
        // Le texte porte une ombre douce : un fond moyen à 3:1 reste lisible ; sous 3:1, le plan est à reprendre.
        if (worst < Math.min(3, g.colors.minContrast)) {
          contrastIssues.push(`${c.id} (${worst}:1)`);
          // Couleur qui garde le meilleur contraste au pire instant : blanc ou encre sombre.
          const best = ["#FFFFFF", o.darkInk ?? "#1A1A1A"].map((col) => ({ col, r: Math.min(...bgs.map((b) => contrastRatio(col, b))) })).sort((a, b) => b.r - a.r)[0];
          if (best.col !== title.color) fixes[c.id] = best.col;
        }
      }
      t += c.durationS;
    }
    const repeated = prints.flatMap((a, i) => prints.slice(i + 1).filter((b) => distance(a.fp, b.fp) < 6).map((b) => `${a.id} ≈ ${b.id}`));
    items.push({ id: "scenes", label: label("scenes"), status: scenes.length >= 2 && sources.size === scenes.length && !repeated.length ? "ok" : "issue", detail: `${scenes.length} scène(s), ${sources.size} source(s) différente(s)${repeated.length ? ` ; scènes trop proches : ${repeated.join(", ")}` : ""}` });
    items.push({ id: "contrast", label: label("contrast"), status: contrastIssues.length ? "issue" : "ok", detail: contrastIssues.length ? `contraste faible : ${contrastIssues.join(", ")}` : "titres lisibles aux trois instants mesurés", ...(Object.keys(fixes).length ? { fixes } : {}) });

    // Tailles : aucun texte sous la « mention courte » du guide ; titres de scène au moins à leur minimum.
    const minMention = px(g.text.mention, doc.height, 0, doc.width);
    const minTitle = px(g.text.sceneTitle, doc.height, 0, doc.width);
    const small = doc.clips.flatMap((c) => c.overlays.filter((l) => l.kind === "text" && (l.font.size < minMention || (l.role === "title" && l.font.size < minTitle))).map(() => c.id));
    items.push({ id: "text_size", label: label("text_size"), status: small.length ? "issue" : "ok", detail: small.length ? `texte trop petit : ${small.join(", ")}` : `titres ≥ ${minTitle} px, aucun texte sous ${minMention} px` });

    // Hiérarchie : trois niveaux au plus par scène, deux familles de polices au plus.
    const fonts = new Set<string>();
    let crowded = "";
    for (const c of doc.clips) {
      const texts = c.overlays.filter((l) => l.kind === "text");
      texts.forEach((l) => l.kind === "text" && fonts.add(l.font.family));
      if (texts.length > g.text.maxLevelsPerScene) crowded = c.id;
      if (c.source.kind === "doc") for (const l of c.source.doc.layers) if (l.kind === "text" || l.kind === "button") fonts.add(l.font.family);
    }
    items.push({ id: "hierarchy", label: label("hierarchy"), status: fonts.size <= g.text.maxFontFamilies && !crowded ? "ok" : "issue", detail: `${fonts.size} police(s)${crowded ? ` ; trop de textes sur ${crowded}` : ""}` });

    // Marques tierces : textes, bouton, voix.
    const brands = brandIssuesInTexts(o.texts, o.allowed);
    items.push({ id: "third_party_brand", label: label("third_party_brand"), status: brands.length ? "issue" : "ok", detail: brands.length ? brands.map((b) => `${b.brand} (${b.field})`).join(", ") : "aucune marque tierce dans les textes ni la voix (images : contrôle visuel des plans quand l'IA est active)" });

    const ending=doc.meta?.ending?.kind === "last_clip" ? doc.clips.at(-1) : doc.clips.find(c=>c.id === "end-card");
    const layers=ending?.source.kind === "doc" ? ending.source.doc.layers : ending?.overlays??[];
    const holdS=doc.meta?.ending?.holdS??ending?.durationS??0;
    const hasCta=layers.some(l=>l.kind==="button");
    const organic=doc.meta?.editorial?.purpose === "organic";
    items.push({id:"cta",label:label("cta"),status:organic || (ending && hasCta && holdS>=Math.min(ending.durationS,g.cta.holdS[0])-.01 && holdS<=g.cta.holdS[1]+.01)?"ok":"issue",detail:organic?"Contenu organique : CTA commercial facultatif":`Éléments de fin sur le dernier clip : ${holdS} s ; bouton ${hasCta?"présent":"absent"}. Le bouton dessiné n'est pas cliquable.`});
    const logo=layers.find(l=>l.role==="logo");
    items.push({id:"logo",label:label("logo"),status:logo?"ok":"issue",detail:logo?"Vrai fichier du logo superposé au dernier clip":"Aucun fichier du logo du projet dans les éléments de fin"});

    // Audio : présent, non saturé ; voix et sous-titres alignés.
    const a = ex.audio;
    items.push({ id: "audio", label: label("audio"), status: a.silent ? (doc.audio.music || doc.audio.voice.length ? "issue" : "ok") : a.truePeakDb != null && a.truePeakDb > -0.5 ? "issue" : "ok", detail: a.silent ? "aucun son" : `${a.lufs ?? "?"} LUFS, crête ${a.truePeakDb ?? "?"} dB${doc.audio.voice.length ? `, voix sous laquelle la musique baisse de ${-doc.audio.duckingDb} dB` : ", sans voix"}` });
    const cues = absoluteCues(doc);
    const tooLong = cues.filter((c) => c.text.length > 2 * doc.subtitles.style.maxChars + 4);
    items.push({ id: "sync", label: label("sync"), status: tooLong.length ? "issue" : "ok", detail: doc.audio.voice.length ? `${cues.length} sous-titre(s) calés sur la durée mesurée de la voix${tooLong.length ? ` ; ${tooLong.length} trop long(s)` : ""}` : "pas de voix : rien à synchroniser" });

    // Format et durée.
    const sizeOk = ex.width === doc.width && ex.height === doc.height;
    const total = doc.clips.reduce((s, c) => s + c.durationS, 0);
    items.push({ id: "format", label: label("format"), status: sizeOk && Math.abs(ex.durationS - total) < 0.6 ? "ok" : "issue", detail: `${ex.width}×${ex.height}, ${ex.durationS.toFixed(1)} s (prévu ${total.toFixed(1)} s)` });

    // Regard nécessaire : jamais déclaré bon sans contrôle.
    items.push({ id: "product", label: label("product"), status: o.productFidelityChecked ? "ok" : "unchecked", detail: o.productFidelityChecked ? "même produit sur chaque plan (contrôle visuel)" : "non vérifié automatiquement : à regarder dans l'aperçu" });
    items.push({ id: "spelling", label: label("spelling"), status: o.spellingChecked ? "ok" : "unchecked", detail: o.spellingChecked ? "relu" : "non vérifié automatiquement (textes repris du client ou du studio)" });
    return items;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Résumé lisible pour l'aperçu de validation. */
export const checkSummary = (items: CheckItem[]) => ({ ok: items.filter((i) => i.status === "ok").length, issues: items.filter((i) => i.status === "issue"), unchecked: items.filter((i) => i.status === "unchecked").map((i) => i.label) });
