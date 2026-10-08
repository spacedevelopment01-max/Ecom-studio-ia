/**
 * Retouches vidéo en langage naturel. Les demandes simples deviennent des opérations locales (gratuites) :
 * « Raccourcis l'introduction », « Change la musique », « Agrandis les sous-titres », « Fais une version plus
 * dynamique », « Supprime le troisième plan »… Une demande qui exige un nouveau plan ou une nouvelle version est
 * ANNONCÉE (choix gratuit proposé d'abord, coût affiché ensuite) : jamais exécutée, jamais toute la vidéo régénérée.
 */
import type { VideoOp } from "./ops";
import type { MusicMood, VideoDocument } from "./types";

export type VideoEditResult =
  | { local: true; ops: VideoOp[]; summary: string }
  | { local: false; reason: string; choice?: { clipId: string; free: "library"; paid: "shot" }; paid?: { kind: "shot" | "regenerate"; clipId: string | null } };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ORD: [RegExp, number][] = [
  [/\b(premier|1er|first|1st)\b/, 0],
  [/\b(deuxieme|second|2e|2eme|2nd)\b/, 1],
  [/\b(troisieme|3e|3eme|third|3rd)\b/, 2],
  [/\b(quatrieme|4e|4eme|fourth|4th)\b/, 3],
  [/\b(cinquieme|5e|5eme|fifth|5th)\b/, 4],
  [/\b(sixieme|6e|6eme|sixth|6th)\b/, 5],
];

/** Plan désigné : ordinal, « dernier », « introduction », « fin », numéro (« plan 3 »). */
export function targetClip(doc: VideoDocument, t: string): string | null {
  if (/\b(intro|introduction|ouverture|accroche|debut|hook|opening)\b/.test(t)) return doc.clips.find((c) => c.part === "hook")?.id ?? doc.clips[0]?.id ?? null;
  if (/\b(dernier|derniere|last|carte de fin|end card|fin\b)/.test(t)) return doc.clips[doc.clips.length - 1]?.id ?? null;
  const n = t.match(/\bplan\s*(?:n°|no|numero)?\s*(\d{1,2})\b|\bshot\s*(\d{1,2})\b/);
  if (n) return doc.clips[Number(n[1] ?? n[2]) - 1]?.id ?? null;
  for (const [re, k] of ORD) if (re.test(t)) return doc.clips[k]?.id ?? null;
  return null;
}

const round = (v: number) => Math.round(v * 10) / 10;
const MOODS: MusicMood[] = ["calm", "warm", "pulse"];

export function localVideoEdit(doc: VideoDocument, instruction: string): VideoEditResult {
  const t = norm(instruction);
  const clipId = targetClip(doc, t);

  // Nouvelle version, régénération, nouveaux plans : génération (annoncée, jamais lancée ici).
  if (/(nouvelle version|regenere|refai[st] (toute )?la video|autre version|new version|regenerate|avec l'ia|tourne|filme)/.test(t) && !/dynamique|rythm|calme|lent/.test(t)) return { local: false, reason: "génération demandée : coût affiché et accord demandé avant de lancer", paid: { kind: "regenerate", clipId } };

  // Remplacer un plan : la bibliothèque d'abord (gratuit), la génération ensuite (payante, annoncée).
  if (/(remplace|change|replace|swap)\b.*\b(plan|image|photo|sequence|shot|clip)/.test(t)) {
    if (!clipId) return { local: false, reason: "précisez le plan (« le deuxième plan », « l'introduction »…)" };
    return { local: false, reason: "remplacement : choisissez un média de la bibliothèque (gratuit) ou un nouveau plan généré (coût affiché)", choice: { clipId, free: "library", paid: "shot" } };
  }

  // Version plus dynamique / plus calme : rythme, transitions, musique — en local.
  if (/(plus dynamique|plus rythm|plus nerveu|plus rapide|more dynamic|faster|punchier)/.test(t)) {
    const ops: VideoOp[] = doc.clips.flatMap((c, k) => [
      ...(c.source.kind === "doc" && c.part === "cta" ? [] : [{ op: "duration", clipId: c.id, durationS: round(Math.max(1.2, c.durationS * 0.8)) } as VideoOp]),
      ...(k > 0 ? [{ op: "transition", clipId: c.id, kind: "cut" } as VideoOp] : []),
    ]);
    ops.push({ op: "music", music: { source: "synth", mood: "pulse", gainDb: doc.audio.music?.gainDb ?? -14 } });
    return { local: true, ops, summary: "plans raccourcis de 20 %, coupes franches, musique rythmée" };
  }
  if (/(plus calme|plus lent|plus pose|slower|calmer|plus doux)/.test(t)) {
    const ops: VideoOp[] = doc.clips.flatMap((c, k) => [{ op: "duration", clipId: c.id, durationS: round(Math.min(60, c.durationS * 1.15)) } as VideoOp, ...(k > 0 ? [{ op: "transition", clipId: c.id, kind: "fade", durationS: 0.5 } as VideoOp] : [])]);
    ops.push({ op: "music", music: { source: "synth", mood: "calm", gainDb: doc.audio.music?.gainDb ?? -14 } });
    return { local: true, ops, summary: "plans allongés de 15 %, fondus, musique calme" };
  }

  // Durée d'un plan : raccourcir / allonger (l'introduction par défaut si rien n'est précisé).
  const shorten = /(raccourci|plus court|reduis la duree|coupe|shorten|shorter|trim)/.test(t);
  const lengthen = /(allonge|plus long|prolonge|lengthen|longer|extend)/.test(t);
  if ((shorten || lengthen) && !/sous[- ]?titre|subtitle|musique|music/.test(t)) {
    const id = clipId ?? doc.clips[0]?.id;
    const c = doc.clips.find((x) => x.id === id);
    if (!c) return { local: false, reason: "plan introuvable" };
    const secs = t.match(/(\d+(?:[.,]\d+)?)\s*(s|sec|secondes?|seconds?)\b/);
    const d = secs ? (shorten ? c.durationS - Number(secs[1].replace(",", ".")) : c.durationS + Number(secs[1].replace(",", "."))) : shorten ? c.durationS * 0.7 : c.durationS * 1.3;
    return { local: true, ops: [{ op: "duration", clipId: c.id, durationS: round(Math.max(1.2, d)) }], summary: `${c.label} : ${c.durationS} s → ${round(Math.max(1.2, d))} s` };
  }

  // Musique.
  if (/(musique|music|son de fond|soundtrack)/.test(t)) {
    if (/(coupe|supprime|enleve|sans musique|retire|mute|remove|no music)/.test(t)) return { local: true, ops: [{ op: "music", music: null }], summary: "musique retirée" };
    const cur = doc.audio.music?.source === "synth" ? doc.audio.music.mood : null;
    const mood: MusicMood = /calme|douce|calm|soft/.test(t) ? "calm" : /dynamique|rythm|energ|pulse|upbeat/.test(t) ? "pulse" : /chaleur|warm|chaud/.test(t) ? "warm" : MOODS[(MOODS.indexOf(cur ?? "calm") + 1) % MOODS.length];
    if (/(moins fort|plus bas|baisse|quieter|lower)/.test(t) && doc.audio.music) return { local: true, ops: [{ op: "audio_gain", track: "music", gainDb: doc.audio.music.gainDb - 4 }], summary: "musique baissée de 4 dB" };
    if (/(plus fort|monte|louder|raise)/.test(t) && doc.audio.music) return { local: true, ops: [{ op: "audio_gain", track: "music", gainDb: doc.audio.music.gainDb + 3 }], summary: "musique montée de 3 dB" };
    return { local: true, ops: [{ op: "music", music: { source: "synth", mood, gainDb: doc.audio.music?.gainDb ?? -14 } }], summary: `musique : ${mood} (composée par le studio, droits inclus)` };
  }

  // Sous-titres : taille, position, activation.
  if (/(sous[- ]?titre|subtitle|caption)/.test(t)) {
    const s = doc.subtitles.style;
    if (/(agrandi|plus grand|plus gros|bigger|larger|increase)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { size: Math.round(s.size * 1.2) } }], summary: `sous-titres agrandis (${s.size} → ${Math.round(s.size * 1.2)} px)` };
    if (/(reduis|plus petit|smaller|decrease)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { size: Math.round(s.size * 0.85) } }], summary: "sous-titres réduits" };
    if (/(en haut|top)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { position: "top", offsetY: 0 } }], summary: "sous-titres en haut" };
    if (/(au milieu|centre|middle)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { position: "middle", offsetY: 0 } }], summary: "sous-titres au milieu" };
    if (/(en bas|bottom)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { position: "bottom", offsetY: 0 } }], summary: "sous-titres en bas" };
    if (/(monte|remonte|move up|higher)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { offsetY: s.offsetY - Math.round(doc.height * 0.05) } }], summary: "sous-titres remontés" };
    if (/(descend|baisse|move down|lower)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { offsetY: s.offsetY + Math.round(doc.height * 0.05) } }], summary: "sous-titres descendus" };
    if (/(supprime|enleve|desactive|sans|remove|off|hide)/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { enabled: false } }], summary: "sous-titres masqués (toujours exportés en fichier)" };
    if (/(active|affiche|show|on)\b/.test(t)) return { local: true, ops: [{ op: "subtitle_style", patch: { enabled: true } }], summary: "sous-titres affichés" };
  }

  // Supprimer / dupliquer un plan.
  if (/(supprime|enleve|retire|delete|remove)/.test(t) && clipId) return { local: true, ops: [{ op: "remove", clipId }], summary: `plan supprimé (${doc.clips.find((c) => c.id === clipId)?.label})` };

  // Transitions.
  if (/(transition|fondu|fade|coupe franche|cut)/.test(t)) {
    const kind = /fondu|fade/.test(t) ? "fade" : /glisse|slide/.test(t) ? "slide" : /zoom/.test(t) ? "zoom" : "cut";
    const targets = clipId ? [clipId] : doc.clips.slice(1).map((c) => c.id);
    return { local: true, ops: targets.map((id) => ({ op: "transition", clipId: id, kind, durationS: 0.4 }) as VideoOp), summary: `transitions : ${kind}` };
  }

  // Texte à l'écran : « Remplace le texte de l'introduction par … » / « Change le titre en … ».
  const quoted = instruction.match(/[«"“]\s*([^»"”]{2,80})\s*[»"”]/)?.[1] ?? instruction.match(/\b(?:par|en|to|with)\s+(.{2,80})$/i)?.[1];
  if (/(texte|titre|title|text|phrase)/.test(t) && quoted) {
    const id = clipId ?? doc.clips[0]?.id;
    const c = doc.clips.find((x) => x.id === id);
    const layer = c ? (c.overlays.find((l) => l.kind === "text") ?? (c.source.kind === "doc" ? c.source.doc.layers.find((l) => l.kind === "text" || l.kind === "button") : undefined)) : undefined;
    if (c && layer) return { local: true, ops: [{ op: "text", clipId: c.id, layerId: layer.id, text: quoted.trim() }], summary: `texte de « ${c.label} » remplacé` };
  }

  return { local: false, reason: "demande non reconnue comme une retouche simple : reformulez, ou demandez une nouvelle version (coût affiché avant)" };
}
