/**
 * Bibliothèque musicale du studio (Administration › Musiques) : des morceaux choisis par le propriétaire, déposés
 * avec leur licence, et classés par style (acoustique, bistrot, lounge, calme, cinématique, inspirant, pop). Les
 * vidéos les prennent EN PREMIER, selon le style du produit ou du métier ; puis la banque Openverse ; puis la
 * musique composée par le studio. Le propriétaire vérifie lui-même que la licence permet un usage publicitaire
 * (l'interface le rappelle) : rien n'est téléchargé depuis YouTube ni ailleurs par le studio.
 */
import { nanoid } from "nanoid";
import { getJsonSetting, setJsonSetting } from "./settings";
import { putFile, readFile, removeFile, storagePath } from "./storage";
import { all } from "./db";
import { saveAsset, type Asset } from "./library";
import type { Project } from "./projects";
import { L } from "./i18n-server";
import { SONG_STYLES, type SongStyle } from "./media/song";
import { execTool } from "./exec-tool";

export type MusicMoodLib = "calm" | "pulse" | "warm";

export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  /** Licence telle que donnée par l'artiste (ex. « CC BY 4.0 », « Licence libre — crédit obligatoire »). */
  license: string;
  /** Page d'origine (artiste, album, téléchargement officiel). */
  sourceUrl: string;
  /** Styles où la piste convient ; vide = tous. */
  styles: SongStyle[];
  mood: MusicMoodLib;
  durationS: number;
  /** Début du passage utilisé (introduction calme sautée). */
  startS: number;
  key: string;
  mime: string;
  enabled: boolean;
  createdAt: number;
};

const SETTING = "music.library";
export const MUSIC_MAX_BYTES = 30 * 1048576;

export const listTracks = (): LibraryTrack[] => getJsonSetting<LibraryTrack[]>(SETTING, []);
const saveTracks = (t: LibraryTrack[]) => setJsonSetting(SETTING, t);

/** Format audio reconnu à ses premiers octets (jamais au nom du fichier). */
export function sniffAudio(b: Uint8Array): { mime: string; ext: string } | null {
  const s = (a: number, n: number) => String.fromCharCode(...b.slice(a, a + n));
  if (s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: "audio/mpeg", ext: "mp3" };
  if (s(0, 4) === "OggS") return { mime: "audio/ogg", ext: "ogg" };
  if (s(0, 4) === "RIFF" && s(8, 4) === "WAVE") return { mime: "audio/wav", ext: "wav" };
  if (s(0, 4) === "fLaC") return { mime: "audio/flac", ext: "flac" };
  if (s(4, 4) === "ftyp") return { mime: "audio/mp4", ext: "m4a" };
  return null;
}

async function probeDuration(file: string): Promise<number> {
  const { stdout } = await execTool("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return Number(stdout) || 0;
}

export type TrackInput = { title: string; artist: string; license: string; sourceUrl?: string; styles?: SongStyle[]; mood?: MusicMoodLib };

/** Ajoute un morceau (fichier vérifié : vrai audio, durée mesurée, début du passage utile calculé). */
export async function addTrack(data: Uint8Array, input: TrackInput): Promise<LibraryTrack> {
  if (data.length > MUSIC_MAX_BYTES) throw new Error(L("Le fichier dépasse 30 Mo.", "The file exceeds 30 MB."));
  const fmt = sniffAudio(data);
  if (!fmt) throw new Error(L("Format non pris en charge : MP3, OGG, WAV, FLAC ou M4A.", "Unsupported format: MP3, OGG, WAV, FLAC or M4A."));
  if (!input.license.trim()) throw new Error(L("Indiquez la licence du morceau.", "Enter the track's license."));
  const id = nanoid(12);
  const key = `music/${id}.${fmt.ext}`;
  putFile(key, data);
  const file = storagePath(key);
  const durationS = await probeDuration(file).catch(() => 0);
  if (durationS < 8) {
    removeFile(key);
    throw new Error(L("Morceau illisible ou trop court (8 s au moins).", "Unreadable or too short track (8 s minimum)."));
  }
  const { musicStart } = await import("./stock/music");
  const startS = durationS >= 45 ? await musicStart(file) : 0;
  const t: LibraryTrack = {
    id,
    title: input.title.trim().slice(0, 120) || L("Sans titre", "Untitled"),
    artist: input.artist.trim().slice(0, 120),
    license: input.license.trim().slice(0, 200),
    sourceUrl: (input.sourceUrl ?? "").trim().slice(0, 300),
    styles: (input.styles ?? []).filter((x) => SONG_STYLES.includes(x)),
    mood: input.mood ?? "pulse",
    durationS: Math.round(durationS * 10) / 10,
    startS,
    key,
    mime: fmt.mime,
    enabled: true,
    createdAt: Date.now(),
  };
  saveTracks([t, ...listTracks()]);
  return t;
}

export function updateTrack(id: string, patch: Partial<Pick<LibraryTrack, "title" | "artist" | "license" | "sourceUrl" | "styles" | "mood" | "enabled">>): LibraryTrack {
  const all = listTracks();
  const k = all.findIndex((t) => t.id === id);
  if (k < 0) throw new Error(L("Morceau introuvable.", "Track not found."));
  const next = { ...all[k], ...patch, styles: (patch.styles ?? all[k].styles).filter((x) => SONG_STYLES.includes(x)) };
  if (!next.license.trim()) throw new Error(L("La licence est obligatoire.", "The license is required."));
  all[k] = next;
  saveTracks(all);
  return next;
}

export function removeTrack(id: string) {
  const t = listTracks().find((x) => x.id === id);
  if (t) removeFile(t.key);
  saveTracks(listTracks().filter((x) => x.id !== id));
}

export const trackData = (t: LibraryTrack): Buffer => readFile(t.key);

/** Mention à faire figurer avec la vidéo. */
export const libraryCredit = (t: Pick<LibraryTrack, "title" | "artist" | "license" | "sourceUrl">) =>
  L(`Musique : « ${t.title} »${t.artist ? ` par ${t.artist}` : ""} (${t.license})${t.sourceUrl ? ` — ${t.sourceUrl}` : ""}`, `Music: "${t.title}"${t.artist ? ` by ${t.artist}` : ""} (${t.license})${t.sourceUrl ? ` — ${t.sourceUrl}` : ""}`);

const hash = (s: string) => {
  let h = 2166136261 >>> 0;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

/**
 * Morceau de la bibliothèque pour une vidéo : style du produit ou du métier d'abord (pistes classées dans ce
 * style), assez long pour la vidéo ; parmi les pistes qui conviennent, une variante par projet (deux clients du même
 * métier n'ont pas toujours la même musique).
 */
export function pickTrack(style: SongStyle, mood: MusicMoodLib, durationS: number, seed: string): LibraryTrack | null {
  const on = listTracks().filter((t) => t.enabled);
  const long = (t: LibraryTrack) => t.durationS - t.startS >= durationS + 1;
  const tiers = [on.filter((t) => t.styles.includes(style) && long(t)), on.filter((t) => t.styles.length === 0 && t.mood === mood && long(t)), on.filter((t) => t.styles.includes(style))];
  const list = tiers.find((x) => x.length) ?? [];
  if (!list.length) return null;
  return [...list].sort((a, b) => a.id.localeCompare(b.id))[hash(`${seed}:${style}`) % list.length];
}

/** Copie (une fois) le morceau choisi dans la bibliothèque du projet : le rendu ne lit que les fichiers du projet. */
export async function libraryMusicForProject(p: Project, style: SongStyle, mood: MusicMoodLib, durationS: number): Promise<{ assetId: string; licence: string; credit: string; startS?: number } | null> {
  const t = pickTrack(style, mood, durationS, p.id);
  if (!t) return null;
  const credit = libraryCredit(t);
  const kept = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'music' AND deleted_at IS NULL AND json_extract(meta, '$.libraryTrackId') = ? LIMIT 1", p.id, t.id)[0];
  if (kept) return { assetId: kept.id, licence: t.license, credit, startS: t.startS };
  const a = await saveAsset({ projectId: p.id, userId: p.userId, data: trackData(t), name: `musique-${t.id}.${t.key.split(".").pop()}`, mime: t.mime, role: "music", folderKey: "videos.ads", origin: "import", meta: { libraryTrackId: t.id, credit, licence: t.license } });
  return { assetId: a.id, licence: t.license, credit, startS: t.startS };
}

