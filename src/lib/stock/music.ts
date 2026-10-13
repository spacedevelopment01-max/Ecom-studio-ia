/**
 * Banque de musiques libres de droits pour les vidéos : Openverse (catalogue ouvert de la fondation WordPress, sans
 * clé), qui réunit Jamendo, Freesound, ccMixter et Wikimedia. Seules les licences qui autorisent l'usage COMMERCIAL
 * et la synchronisation avec une vidéo sont gardées (CC0, domaine public, CC BY, CC BY-SA) — jamais « NC »
 * (non commercial) ni « ND » (pas de modification). La licence, l'auteur et la page d'origine sont enregistrés avec
 * la piste ; la mention à faire figurer (CC BY) est rendue par `musicCredit`.
 * Sans réseau ou sans résultat convenable : la musique composée par le studio prend le relais (jamais de silence).
 */
import { all } from "../db";
import { saveAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { getSetting } from "../settings";
import { L } from "../i18n-server";
import type { SongStyle } from "../media/song";

export type MusicMood = "calm" | "pulse" | "warm";

export type StockTrack = {
  source: "openverse";
  id: string;
  title: string;
  author: string;
  /** Licence normalisée (« CC0 », « CC BY 4.0 »…). */
  license: string;
  licenseUrl: string;
  page: string;
  url: string;
  provider: string;
  durationS: number;
  filetype: string;
  tags: string[];
};

const TIMEOUT = 20_000;
const offline = () => process.env.STOCK_OFFLINE === "1";
/** Réglage « stock.music » : « 0 » pour n'utiliser que la musique composée par le studio. */
export const musicLibraryOn = () => getSetting("stock.music") !== "0";

/** Recherches par humeur (mots courts : la banque y répond mieux qu'aux phrases). */
export const MOOD_QUERIES: Record<MusicMood, string[]> = {
  pulse: ["upbeat", "happy pop", "corporate upbeat", "energetic", "funk"],
  calm: ["calm piano", "ambient", "soft acoustic", "chill", "relaxing"],
  warm: ["acoustic", "feel good", "ukulele", "warm guitar", "positive"],
};

/**
 * Recherches et genres attendus par style du produit ou du métier : une piste n'est gardée que si sa description
 * cite l'un des genres du style (folk pour un artisan, lounge ou jazz pour un cosmétique, accordéon pour un bistrot…).
 */
export const STYLE_MUSIC: Record<SongStyle, { queries: string[]; genres: string[] }> = {
  acoustic: { queries: ["acoustic guitar upbeat", "folk happy", "acoustic", "ukulele"], genres: ["acoustic", "folk", "guitar", "ukulele", "country", "singer-songwriter"] },
  bistro: { queries: ["gypsy jazz", "accordion", "jazz manouche", "swing"], genres: ["jazz", "swing", "accordion", "manouche", "gypsy", "french", "bossa", "musette"] },
  lounge: { queries: ["lounge", "chill jazz", "bossa nova", "chillout"], genres: ["lounge", "chill", "chillout", "jazz", "bossa", "smooth", "downtempo", "lofi", "lo-fi"] },
  calm: { queries: ["calm piano", "ambient piano", "relaxing"], genres: ["piano", "ambient", "calm", "relax", "relaxing", "meditation", "peaceful", "new age"] },
  cinematic: { queries: ["cinematic piano", "orchestral", "emotional strings"], genres: ["cinematic", "orchestral", "strings", "piano", "soundtrack", "score", "classical"] },
  corporate: { queries: ["corporate", "inspiring", "motivational"], genres: ["corporate", "inspiring", "motivational", "uplifting", "business", "positive"] },
  pop: { queries: ["upbeat pop", "happy", "energetic"], genres: ["pop", "upbeat", "happy", "energetic", "dance", "electronic", "funk", "indie"] },
};

/** Mots qui écartent une piste (effet sonore, voix parlée, ambiance sombre ou angoissante). */
const AVOID = /\b(sfx|sound ?effect|effect|foley|field recording|noise|speech|voice|spoken|podcast|horror|scary|creepy|dark|drone|siren|alarm|glitch|explosion|loop kit|sample pack|ringtone)\b/i;

/** Licence utilisable pour une publicité (commerciale, modifiable) ; null sinon. */
export function usableLicense(code: string, version?: string | null): string | null {
  const c = code.toLowerCase().trim();
  if (/nc|nd/.test(c)) return null;
  if (c === "cc0") return "CC0";
  if (c === "pdm") return L("Domaine public", "Public domain");
  if (c === "by" || c === "by-sa") return `CC ${c.toUpperCase()}${version ? ` ${version}` : ""}`;
  return null;
}

/** Mention à faire figurer avec la vidéo (obligatoire en CC BY, conseillée sinon). */
export function musicCredit(t: Pick<StockTrack, "title" | "author" | "license" | "page">): string {
  return L(`Musique : « ${t.title} »${t.author ? ` par ${t.author}` : ""} (${t.license}) — ${t.page}`, `Music: "${t.title}"${t.author ? ` by ${t.author}` : ""} (${t.license}) — ${t.page}`);
}

/** Pistes trouvées pour une humeur, assez longues pour la vidéo, licence commerciale seulement. */
export async function searchStockMusic(mood: MusicMood, minS: number, exclude = new Set<string>(), style?: SongStyle): Promise<StockTrack[]> {
  if (offline()) return [];
  const out: StockTrack[] = [];
  const want = style ? STYLE_MUSIC[style] : null;
  for (const q of want?.queries ?? MOOD_QUERIES[mood]) {
    try {
      const r = await fetch(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license_type=commercial&category=music&page_size=20&mature=false`, { headers: { "User-Agent": "E-COM-STUDIO-IA" }, signal: AbortSignal.timeout(TIMEOUT) });
      if (!r.ok) throw new Error(`openverse ${r.status}`);
      const j = (await r.json()) as { results?: any[] };
      for (const x of j.results ?? []) {
        const license = usableLicense(String(x.license ?? ""), x.license_version);
        const durationS = Number(x.duration ?? 0) / 1000;
        const tags: string[] = (x.tags ?? []).map((t: any) => String(t?.name ?? t)).filter(Boolean);
        const text = `${x.title ?? ""} ${tags.join(" ")} ${(x.genres ?? []).join(" ")}`;
        const type = String(x.filetype ?? "").toLowerCase();
        if (!license || !x.url || exclude.has(`openverse:${x.id}`) || out.some((o) => o.id === String(x.id))) continue;
        // Assez longue pour toute la vidéo (une piste trop courte bouclerait), pas un fichier énorme.
        if (!(durationS >= minS + 2 && durationS <= 600)) continue;
        if (AVOID.test(text)) continue;
        // Style du produit ou du métier : la piste doit en citer un genre.
        if (want && !want.genres.some((g) => new RegExp(`\\b${g}\\b`, "i").test(text))) continue;
        if (type && !["mp3", "ogg", "wav", "flac", "m4a", "oga"].includes(type)) continue;
        if (Number(x.filesize ?? 0) > 25_000_000) continue;
        out.push({ source: "openverse", id: String(x.id), title: String(x.title ?? "Sans titre").slice(0, 120), author: String(x.creator ?? "").slice(0, 80), license, licenseUrl: String(x.license_url ?? ""), page: String(x.foreign_landing_url ?? x.url), url: String(x.url), provider: String(x.provider ?? x.source ?? "openverse"), durationS, filetype: type || "mp3", tags });
      }
    } catch (e) {
      console.warn("[musique libre] openverse indisponible :", (e as Error).message);
      break;
    }
    if (out.length >= 8) break;
  }
  return out;
}

/** Télécharge une piste (audio, 25 Mo au plus). */
export async function downloadStockMusic(t: StockTrack): Promise<{ data: Buffer; mime: string }> {
  const r = await fetch(t.url, { headers: { "User-Agent": "E-COM-STUDIO-IA" }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${t.provider} ${r.status}`);
  const mime = (r.headers.get("content-type") ?? "").split(";")[0].trim() || "audio/mpeg";
  if (!/^audio\/|application\/ogg|octet-stream/.test(mime)) throw new Error(L("ce n'est pas un fichier audio", "not an audio file"));
  const data = Buffer.from(await r.arrayBuffer());
  if (data.length > 25_000_000) throw new Error(L("fichier trop lourd", "file too large"));
  if (data.length < 20_000) throw new Error(L("fichier audio vide", "empty audio file"));
  return { data, mime: /octet-stream/.test(mime) ? (t.filetype === "ogg" ? "audio/ogg" : "audio/mpeg") : mime };
}

/** Pistes de la banque déjà gardées dans le projet (réutilisées avant toute nouvelle recherche). */
function keptTracks(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'music' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.stockMusic') IS NOT NULL ORDER BY created_at DESC LIMIT 20", projectId);
}

/**
 * Musique de la vidéo : une piste libre de droits de la bonne humeur, gardée dans la bibliothèque du projet avec sa
 * licence. `avoid` : pistes à ne pas reprendre (deux vidéos d'un même projet n'ont pas la même musique si possible).
 */
export async function projectMusic(p: Project, mood: MusicMood, durationS: number, avoid = new Set<string>(), style?: SongStyle): Promise<{ assetId: string; licence: string; credit: string } | null> {
  if (!musicLibraryOn()) return null;
  const meta = (a: Asset) => {
    try {
      return (typeof a.meta === "string" ? JSON.parse(a.meta) : a.meta)?.stockMusic as (StockTrack & { mood: MusicMood; style?: SongStyle }) | undefined;
    } catch {
      return undefined;
    }
  };
  for (const a of keptTracks(p.id)) {
    const m = meta(a);
    if (m && m.mood === mood && (m.style ?? null) === (style ?? null) && m.durationS >= durationS + 2 && !avoid.has(a.id)) return { assetId: a.id, licence: m.license, credit: musicCredit(m) };
  }
  const taken = new Set(keptTracks(p.id).map((a) => `openverse:${meta(a)?.id}`));
  for (const t of (await searchStockMusic(mood, durationS, taken, style)).slice(0, 3)) {
    try {
      const f = await downloadStockMusic(t);
      const ext = f.mime.includes("ogg") ? "ogg" : f.mime.includes("wav") ? "wav" : "mp3";
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: f.data, name: `musique-${t.id}.${ext}`, mime: f.mime, role: "music", folderKey: "videos.ads", origin: "import", meta: { stockMusic: { ...t, mood, ...(style ? { style } : {}) }, credit: musicCredit(t) } });
      return { assetId: a.id, licence: t.license, credit: musicCredit(t) };
    } catch (e) {
      console.warn("[musique libre] piste non téléchargée :", (e as Error).message);
    }
  }
  return null;
}
