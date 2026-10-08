/**
 * Opérations d'édition du document vidéo : pures, gratuites (aucune IA), réversibles par l'historique.
 * Modifier un texte, remplacer une image, couper, réordonner, ajuster une durée, changer la musique ou la voix,
 * ajouter ou supprimer un plan, déplacer et styler les sous-titres, changer les transitions. Les textes et
 * éléments graphiques passent par les opérations de l'éditeur publicitaire (`ad-doc/ops`).
 */
import { applyOp as applyDocOp, type DocOp } from "../ad-doc/ops";
import type { AdDocument } from "../ad-doc/types";
import type { AudioTracks, Clip, ClipSource, SubtitleStyle, Transition, VideoDocument } from "./types";

export const MIN_CLIP_S = 0.8;
export const MAX_CLIP_S = 60;

export type VideoOp =
  | { op: "text"; clipId: string; layerId: string; text: string }
  | { op: "overlay"; clipId: string; docOp: DocOp }
  | { op: "source_doc"; clipId: string; docOp: DocOp }
  | { op: "replace_media"; clipId: string; media: { kind: "image"; assetId: string } | { kind: "video"; assetId: string; durationS: number } }
  | { op: "trim"; clipId: string; inS: number; outS: number }
  | { op: "duration"; clipId: string; durationS: number }
  | { op: "reorder"; clipId: string; index: number }
  | { op: "remove"; clipId: string }
  | { op: "add"; clip: Clip; index?: number }
  | { op: "duplicate"; clipId: string; newId: string }
  | { op: "transition"; clipId: string; kind: Transition; durationS?: number }
  | { op: "subtitle_text"; cueId: string; text: string }
  | { op: "subtitle_style"; patch: Partial<SubtitleStyle> }
  | { op: "music"; music: AudioTracks["music"] }
  | { op: "voice"; voiceId: string | null }
  | { op: "audio_gain"; track: "voice" | "music"; gainDb: number }
  | { op: "disclosure"; text: string | null };

export class VideoOpError extends Error {}

const clone = <T,>(x: T): T => structuredClone(x);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (v: number) => Math.round(v * 100) / 100;

/** Les calques posés sur un plan passent par l'éditeur publicitaire (mêmes règles : verrouillage, validation). */
function overlayDoc(doc: VideoDocument, c: Clip): AdDocument {
  return { version: 1, width: doc.width, height: doc.height, background: "transparent", safe: doc.safe, format: { platform: null, aspect: doc.aspect }, layers: c.overlays, brand: doc.brand, meta: { conceptId: null, source: "user", createdFrom: null } };
}

function clipOf(doc: VideoDocument, id: string): Clip {
  const c = doc.clips.find((x) => x.id === id);
  if (!c) throw new VideoOpError(`plan introuvable : ${id}`);
  return c;
}

/** Sous-titres et voix d'un plan ramenés à sa nouvelle durée (jamais au-delà de la fin du plan). */
function clampToClip(doc: VideoDocument, c: Clip) {
  doc.subtitles.cues = doc.subtitles.cues.flatMap((q) => (q.clipId !== c.id ? [q] : q.fromS >= c.durationS - 0.1 ? [] : [{ ...q, toS: round(Math.min(q.toS, c.durationS - 0.05)) }]));
  for (const v of doc.audio.voice) if (v.clipId === c.id) v.durationS = round(Math.min(v.durationS, Math.max(0, c.durationS - v.offsetS)));
}

export function applyVideoOp(input: VideoDocument, o: VideoOp): VideoDocument {
  const doc = clone(input);
  const touch = (c: Clip) => (c.userEdited = true);
  switch (o.op) {
    case "text": {
      const c = clipOf(doc, o.clipId);
      if (c.source.kind === "doc" && c.source.doc.layers.some((l) => l.id === o.layerId)) c.source.doc = applyDocOp(c.source.doc, { op: "text", id: o.layerId, text: o.text });
      else c.overlays = applyDocOp(overlayDoc(doc, c), { op: "text", id: o.layerId, text: o.text }).layers;
      touch(c);
      break;
    }
    case "overlay": {
      const c = clipOf(doc, o.clipId);
      c.overlays = applyDocOp(overlayDoc(doc, c), o.docOp).layers;
      touch(c);
      break;
    }
    case "source_doc": {
      const c = clipOf(doc, o.clipId);
      if (c.source.kind !== "doc") throw new VideoOpError("ce plan n'est pas une composition");
      c.source.doc = applyDocOp(c.source.doc, o.docOp);
      touch(c);
      break;
    }
    case "replace_media": {
      const c = clipOf(doc, o.clipId);
      const prevMotion = c.source.kind === "image" ? c.source.motion : "push_in";
      c.source = o.media.kind === "image" ? { kind: "image", assetId: o.media.assetId, motion: prevMotion, crop: null } : { kind: "video", assetId: o.media.assetId, inS: 0, outS: round(Math.min(o.media.durationS, Math.max(c.durationS, MIN_CLIP_S))), muted: true };
      if (o.media.kind === "video") c.durationS = round(clamp(Math.min(c.durationS, o.media.durationS), MIN_CLIP_S, MAX_CLIP_S));
      clampToClip(doc, c);
      touch(c);
      break;
    }
    case "trim": {
      const c = clipOf(doc, o.clipId);
      if (c.source.kind !== "video") throw new VideoOpError("seul un plan vidéo se coupe (les autres : durée)");
      const inS = Math.max(0, o.inS);
      const outS = Math.max(inS + MIN_CLIP_S, o.outS);
      c.source = { ...c.source, inS: round(inS), outS: round(outS) };
      c.durationS = round(clamp(outS - inS, MIN_CLIP_S, MAX_CLIP_S));
      clampToClip(doc, c);
      touch(c);
      break;
    }
    case "duration": {
      const c = clipOf(doc, o.clipId);
      let d = clamp(o.durationS, MIN_CLIP_S, MAX_CLIP_S);
      if (c.source.kind === "video") d = Math.min(d, c.source.outS - c.source.inS);
      c.durationS = round(d);
      clampToClip(doc, c);
      touch(c);
      break;
    }
    case "reorder": {
      const i = doc.clips.findIndex((x) => x.id === o.clipId);
      if (i < 0) throw new VideoOpError(`plan introuvable : ${o.clipId}`);
      const [c] = doc.clips.splice(i, 1);
      doc.clips.splice(clamp(Math.round(o.index), 0, doc.clips.length), 0, c);
      break;
    }
    case "remove": {
      if (doc.clips.length <= 1) throw new VideoOpError("une vidéo garde au moins un plan");
      clipOf(doc, o.clipId);
      doc.clips = doc.clips.filter((x) => x.id !== o.clipId);
      doc.subtitles.cues = doc.subtitles.cues.filter((q) => q.clipId !== o.clipId);
      doc.audio.voice = doc.audio.voice.filter((v) => v.clipId !== o.clipId);
      doc.audio.sfx = doc.audio.sfx.filter((v) => v.clipId !== o.clipId);
      break;
    }
    case "add": {
      if (doc.clips.some((x) => x.id === o.clip.id)) throw new VideoOpError(`identifiant déjà pris : ${o.clip.id}`);
      const c = { ...clone(o.clip), durationS: round(clamp(o.clip.durationS, MIN_CLIP_S, MAX_CLIP_S)), userEdited: true };
      doc.clips.splice(clamp(o.index ?? doc.clips.length, 0, doc.clips.length), 0, c);
      break;
    }
    case "duplicate": {
      const i = doc.clips.findIndex((x) => x.id === o.clipId);
      if (i < 0) throw new VideoOpError(`plan introuvable : ${o.clipId}`);
      if (doc.clips.some((x) => x.id === o.newId)) throw new VideoOpError(`identifiant déjà pris : ${o.newId}`);
      doc.clips.splice(i + 1, 0, { ...clone(doc.clips[i]), id: o.newId, userEdited: true });
      doc.subtitles.cues.push(...doc.subtitles.cues.filter((q) => q.clipId === o.clipId).map((q) => ({ ...q, id: `${q.id}-copie-${o.newId}`, clipId: o.newId })));
      break;
    }
    case "transition": {
      const c = clipOf(doc, o.clipId);
      c.transitionIn = { kind: o.kind, durationS: o.kind === "cut" ? 0 : round(clamp(o.durationS ?? c.transitionIn.durationS ?? 0.4, 0.15, Math.min(1.2, c.durationS / 2))) };
      touch(c);
      break;
    }
    case "subtitle_text": {
      const q = doc.subtitles.cues.find((x) => x.id === o.cueId);
      if (!q) throw new VideoOpError(`sous-titre introuvable : ${o.cueId}`);
      q.text = o.text.replace(/\s+/g, " ").trim();
      if (!q.text) doc.subtitles.cues = doc.subtitles.cues.filter((x) => x.id !== o.cueId);
      break;
    }
    case "subtitle_style": {
      const s = { ...doc.subtitles.style, ...o.patch };
      s.size = round(clamp(s.size, 16, Math.min(doc.width, doc.height) * 0.12));
      s.offsetY = round(clamp(s.offsetY, -doc.height * 0.4, doc.height * 0.4));
      s.maxChars = Math.round(clamp(s.maxChars, 12, 60));
      doc.subtitles.style = s;
      break;
    }
    case "music":
      if (o.music?.source === "library" && !o.music.licence.trim()) throw new VideoOpError("musique sans licence enregistrée : refusée");
      doc.audio.music = o.music;
      break;
    case "voice":
      doc.audio.voiceId = o.voiceId;
      // Une autre voix : les enregistrements existants ne correspondent plus (à réenregistrer).
      doc.audio.voice = doc.audio.voice.map((v) => ({ ...v, assetId: null }));
      break;
    case "audio_gain":
      if (o.track === "music" && doc.audio.music) doc.audio.music = { ...doc.audio.music, gainDb: round(clamp(o.gainDb, -40, 6)) };
      if (o.track === "voice") doc.audio.voice = doc.audio.voice.map((v) => ({ ...v, gainDb: round(clamp(o.gainDb, -20, 12)) }));
      break;
    case "disclosure":
      // La mention « générée par IA » ne se retire pas quand un personnage ou un plan généré est présent.
      if (!o.text && hasGenerated(doc)) throw new VideoOpError("mention obligatoire : la vidéo contient des plans ou un personnage générés par l'IA");
      doc.disclosure = o.text;
      break;
  }
  doc.meta = { ...doc.meta, source: "user" };
  return doc;
}

export const applyVideoOps = (doc: VideoDocument, ops: VideoOp[]) => ops.reduce(applyVideoOp, doc);

/** Un plan généré (vidéo IA, personnage) est-il présent ? */
export function hasGenerated(doc: VideoDocument): boolean {
  return doc.clips.some((c) => c.generated);
}

/** Historique : annuler / rétablir, réglages continus fusionnés (même clé, moins d'une seconde). */
export class VideoHistory {
  private past: VideoDocument[] = [];
  private future: VideoDocument[] = [];
  private last: { key: string; at: number } | null = null;
  constructor(public current: VideoDocument, private limit = 60) {}
  apply(o: VideoOp, merge?: string) {
    const next = applyVideoOp(this.current, o);
    const now = Date.now();
    if (!(merge && this.last?.key === merge && now - this.last.at < 1000)) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.last = merge ? { key: merge, at: now } : null;
    this.future = [];
    return (this.current = next);
  }
  applyAll(ops: VideoOp[]) {
    const next = applyVideoOps(this.current, ops);
    this.past.push(this.current);
    this.last = null;
    this.future = [];
    return (this.current = next);
  }
  undo() {
    this.last = null;
    const p = this.past.pop();
    if (!p) return this.current;
    this.future.push(this.current);
    return (this.current = p);
  }
  redo() {
    const n = this.future.pop();
    if (!n) return this.current;
    this.past.push(this.current);
    return (this.current = n);
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
}

export type { ClipSource };
