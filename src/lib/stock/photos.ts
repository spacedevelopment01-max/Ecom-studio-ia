/**
 * Photos libres de droits (entreprises de services) : vraies photos du métier, gratuites, cherchées avant toute
 * image payante. Pexels et Pixabay (clés gratuites, saisies dans Administration › Fournisseurs IA), puis Openverse
 * (sans clé, uniquement domaine public / CC0). Les photos sont téléchargées et gardées dans la bibliothèque du
 * projet avec leur source et leur auteur ; elles illustrent le métier, ce ne sont pas des photos du client.
 */
import sharp from "sharp";
import { activeProviderKey } from "../ai/config";
import { getSetting } from "../settings";
import { L } from "../i18n-server";

export type StockSource = "pexels" | "pixabay" | "openverse";
export type StockPhoto = { source: StockSource; id: string; url: string; page: string; author: string; license: string; width: number; height: number; alt: string; /** Petite version (choix de la meilleure photo sans tout télécharger). */ thumb?: string; /** Popularité dans la banque (téléchargements, j'aime), quand elle est connue. */ popularity?: number };
export type Orientation = "landscape" | "portrait" | "square";

const TIMEOUT = 15_000;
const get = async (url: string, headers: Record<string, string> = {}) => {
  const r = await fetch(url, { headers: { "User-Agent": "E-COM-STUDIO-IA", ...headers }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`${new URL(url).hostname} ${r.status}`);
  return r.json() as Promise<any>;
};

/** Tests automatiques : jamais d'appel aux banques d'images réelles (réseau lent ou absent, résultats changeants). */
const offline = () => process.env.STOCK_OFFLINE === "1";

/**
 * Règle du propriétaire : les images et vidéos TROUVÉES pour un projet (site, publications, publicités, vidéos)
 * viennent obligatoirement de Pixabay — aucune autre banque, et aucune image générée à leur place pendant la
 * création. Réglage « stock.pixabayOnly » (activé par défaut ; « 0 » pour revenir à Pixabay puis Pexels, Openverse).
 */
export const pixabayOnly = () => getSetting("stock.pixabayOnly") !== "0";

/** Pixabay d'abord (le plus riche en photos d'univers et de lieux, bien décrites par mots-clés), puis Pexels, puis Openverse. */
export const stockSources = (): StockSource[] =>
  pixabayOnly() ? (activeProviderKey("pixabay") ? ["pixabay"] : []) : [...(activeProviderKey("pixabay") ? (["pixabay"] as const) : []), ...(activeProviderKey("pexels") ? (["pexels"] as const) : []), "openverse"];

export async function searchSource(source: StockSource, query: string, orientation: Orientation, lang: "fr" | "en"): Promise<StockPhoto[]> {
  const q = encodeURIComponent(query);
  if (source === "pexels") {
    const key = activeProviderKey("pexels");
    if (!key) return [];
    const j = await get(`https://api.pexels.com/v1/search?query=${q}&per_page=30&orientation=${orientation}&locale=${lang === "fr" ? "fr-FR" : "en-US"}`, { Authorization: key });
    return (j.photos ?? []).map((x: any) => ({ source: "pexels", id: String(x.id), url: x.src?.large2x ?? x.src?.original, page: x.url, author: x.photographer ?? "", license: "Pexels", width: x.width, height: x.height, alt: x.alt ?? "", thumb: x.src?.medium }));
  }
  if (source === "pixabay") {
    const key = activeProviderKey("pixabay");
    if (!key) return [];
    const j = await get(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${q}&image_type=photo&orientation=${orientation === "portrait" ? "vertical" : "horizontal"}&safesearch=true&per_page=60&min_width=1600&order=popular&lang=${lang}`);
    return (j.hits ?? []).map((x: any) => ({ source: "pixabay", id: String(x.id), url: x.largeImageURL ?? x.webformatURL, page: x.pageURL, author: x.user ?? "", license: "Pixabay", width: x.imageWidth, height: x.imageHeight, alt: x.tags ?? "", thumb: x.webformatURL, popularity: (x.downloads ?? 0) + 20 * (x.likes ?? 0) }));
  }
  const j = await get(`https://api.openverse.org/v1/images/?q=${q}&license=cc0,pdm&page_size=20&mature=false`);
  return (j.results ?? [])
    .filter((x: any) => (x.width ?? 0) >= 1000)
    .map((x: any) => ({ source: "openverse", id: String(x.id), url: x.url, page: x.foreign_landing_url ?? x.url, author: x.creator ?? "", license: String(x.license ?? "cc0").toUpperCase(), width: x.width, height: x.height, alt: x.title ?? "", thumb: x.thumbnail }));
}

/**
 * Recherche dans les banques disponibles, dans l'ordre (Pixabay, Pexels, Openverse), sans les photos déjà prises.
 * `enough` : nombre de candidates à réunir avant de s'arrêter (une galerie en demande beaucoup plus qu'un emplacement).
 */
export async function searchStock(queries: string[], orientation: Orientation, lang: "fr" | "en", exclude: Set<string>, enough = 12): Promise<StockPhoto[]> {
  const out: StockPhoto[] = [];
  if (offline()) return out;
  for (const source of stockSources()) {
    for (const query of queries.filter(Boolean)) {
      try {
        for (const p of await searchSource(source, query, orientation, lang)) if (p.url && !exclude.has(`${p.source}:${p.id}`) && !out.some((o) => o.source === p.source && o.id === p.id)) out.push(p);
      } catch (e) {
        console.warn(`[photos libres] ${source} indisponible :`, (e as Error).message);
      }
      if (out.length >= enough) return out;
    }
  }
  return out;
}

/** Télécharge une photo (taille et type vérifiés), ramenée à 2400 px au plus, en JPEG. */
export async function downloadStock(p: StockPhoto): Promise<Buffer> {
  const r = await fetch(p.url, { headers: { "User-Agent": "E-COM-STUDIO-IA" }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`${p.source} ${r.status}`);
  if (!/^image\//.test(r.headers.get("content-type") ?? "image/")) throw new Error(L("ce n'est pas une image", "not an image"));
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 25_000_000) throw new Error(L("image trop lourde", "image too large"));
  return sharp(buf, { failOn: "none" }).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
}

/** Mention de source affichée avec la photo (crédit du photographe, même quand la licence ne l'exige pas). */
export const stockCredit = (p: Pick<StockPhoto, "source" | "author" | "license">) =>
  L(`Photo libre de droits ${p.source === "openverse" ? `(${p.license}, via Openverse)` : `(${p.license})`}${p.author ? `, ${p.author}` : ""} — illustration du métier, pas une photo de vos réalisations`, `Royalty-free photo ${p.source === "openverse" ? `(${p.license}, via Openverse)` : `(${p.license})`}${p.author ? `, ${p.author}` : ""} — illustrates the trade, not a photo of your work`);

/** Vérification d'une clé depuis l'administration (une recherche d'un résultat). */
export async function pingStock(source: "pexels" | "pixabay"): Promise<string> {
  const key = activeProviderKey(source);
  if (!key) throw new Error(L("Aucune clé enregistrée.", "No key saved."));
  try {
    await searchSource(source, "paint", "landscape", "en");
  } catch (e) {
    throw new Error(L(`Clé ${source === "pexels" ? "Pexels" : "Pixabay"} refusée (${(e as Error).message}).`, `${source === "pexels" ? "Pexels" : "Pixabay"} key rejected (${(e as Error).message}).`));
  }
  return L(`Clé ${source === "pexels" ? "Pexels" : "Pixabay"} valide.`, `${source === "pexels" ? "Pexels" : "Pixabay"} key is valid.`);
}

// ---------------------------------------------------------------- vidéos libres de droits

export type StockVideo = { source: "pexels" | "pixabay"; id: string; url: string; page: string; author: string; license: string; width: number; height: number; duration: number; /** Description de la banque (mots-clés Pixabay, titre de la page Pexels) : filtre du métier sans IA. */ alt: string; /** Plan fait par l'IA et publié sur la banque (Pixabay « ai generated ») : toujours proposé, signalé. */ aiGenerated?: boolean; /** Personne seulement en silhouette (acceptée par le client), signalée. */ silhouette?: boolean };

/** Mots du titre d'une page Pexels (« /video/a-man-painting-a-wall-123/ » → « a man painting a wall »). */
const slugWords = (url: string) => (url.match(/\/video\/([^/?#]+)/)?.[1] ?? "").replace(/-\d+$/, "").replace(/-/g, " ");

/** Une recherche de vidéos : texte et langue (la langue d'une requête Pixabay est aussi celle des mots-clés renvoyés). */
export type VideoQuery = string | { q: string; lang: "fr" | "en" };

/** Bilan d'une recherche (pour dire au client POURQUOI rien n'a été trouvé, jamais un échec muet). */
export type StockVideoReport = { noKey: boolean; errors: string[]; raw: number; cartoon: number; tooShort: number };
export const emptyVideoReport = (): StockVideoReport => ({ noKey: false, errors: [], raw: 0, cartoon: 0, tooShort: 0 });

/** Plan fait par l'IA et publié sur la banque (mots-clés Pixabay en anglais ou en français). */
export const aiGeneratedTags = (tags: string) => /\bai[- ]?(generated|genere|generee|generes|generees)\b|\bgeneree? par (l )?ia\b/i.test(tags.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/'/g, " "));

/** Vidéos libres de droits (Pexels, Pixabay : clés gratuites) ; fichier HD de taille raisonnable choisi. */
export async function searchStockVideos(queries: VideoQuery[], orientation: "landscape" | "portrait", lang: "fr" | "en", exclude: Set<string>, enough = 6, report: StockVideoReport = emptyVideoReport()): Promise<StockVideo[]> {
  const out: StockVideo[] = [];
  const spare: StockVideo[] = [];
  if (offline()) return out;
  const pixabay = activeProviderKey("pixabay");
  const pexels = pixabayOnly() ? null : activeProviderKey("pexels");
  if (!pixabay && !pexels) {
    report.noKey = true;
    return out;
  }
  const pick = (files: { width: number; height: number; link: string }[]) =>
    files.filter((f) => f.link && Math.max(f.width, f.height) >= 1080 && Math.max(f.width, f.height) <= 2160).sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? files.filter((f) => f.link).sort((a, b) => b.width * b.height - a.width * a.height)[0];
  // Un même plan trouvé dans les deux langues : ses mots-clés des deux langues sont réunis (le filtre du métier et le
  // texte tapé par le client se comparent alors en français comme en anglais).
  const known = (source: string, id: string) => [...out, ...spare].find((o) => o.source === source && o.id === id);
  for (const item of queries) {
    const query = typeof item === "string" ? item : item.q;
    const ql = typeof item === "string" ? lang : item.lang;
    if (!query?.trim()) continue;
    const q = encodeURIComponent(query.trim());
    if (pixabay) {
      try {
        const j = await get(`https://pixabay.com/api/videos/?key=${encodeURIComponent(pixabay)}&q=${q}&per_page=40&safesearch=true&lang=${ql}`);
        for (const v of j.hits ?? []) {
          report.raw++;
          // Images réalistes seulement : jamais un dessin animé, une illustration, une animation graphique ni un fond
          // vert à détourer. Les plans réalistes faits par l'IA et publiés sur Pixabay (« ai generated ») sont toujours
          // proposés (choix du propriétaire) et signalés, même si leurs mots-clés parlent de « render » ou de « 3d ».
          const tags = String(v.tags ?? "");
          const aiGenerated = aiGeneratedTags(tags);
          const same = known("pixabay", String(v.id));
          if (same) {
            if (!same.alt.includes(tags)) same.alt = `${same.alt}, ${tags}`;
            continue;
          }
          if (/\b(anime|cartoon|animation|animated|illustration|motion graphics?|chroma key|green ?screen|dessin anim[ée]|fond vert)\b/i.test(tags) || (!aiGenerated && /\b(3d|cgi|render)\b/i.test(tags))) {
            report.cartoon++;
            continue;
          }
          if (!(v.duration >= 4)) {
            report.tooShort++;
            continue;
          }
          const files = ["large", "medium", "small"].map((k) => v.videos?.[k]).filter(Boolean).map((x: any) => ({ width: x.width ?? 0, height: x.height ?? 0, link: x.url as string }));
          const wantTall = orientation === "portrait";
          // Pixabay n'a presque que des vidéos horizontales : pour un format vertical, un plan horizontal assez net
          // (recadré au centre au montage) est gardé en réserve, après les plans déjà verticaux. Recadré, il doit
          // faire au moins 1080 px de haut : la version haute définition est alors prise, pas la plus légère.
          const tallEnough = files.filter((x: { width: number; height: number }) => x.height >= 1080 && x.height <= 2160 && x.width > x.height).sort((a: { width: number; height: number }, b: { width: number; height: number }) => a.width * a.height - b.width * b.height)[0];
          const first = pick(files);
          const fits = !!first && (first.height > first.width) === wantTall;
          const f = fits ? first : wantTall ? tallEnough : first;
          const croppable = !!f && wantTall && !fits;
          if (f && (fits || croppable) && !exclude.has(`pixabay:${v.id}`)) (fits ? out : spare).push({ source: "pixabay", id: String(v.id), url: f.link, page: v.pageURL, author: v.user ?? "", license: "Pixabay", width: f.width, height: f.height, duration: v.duration, alt: tags, ...(aiGenerated ? { aiGenerated: true } : {}) });
        }
      } catch (e) {
        report.errors.push(`Pixabay : ${(e as Error).message}`);
        console.warn("[vidéos libres] pixabay indisponible :", (e as Error).message);
      }
    }
    if (pexels) {
      try {
        const j = await get(`https://api.pexels.com/videos/search?query=${q}&per_page=30&orientation=${orientation}&locale=${ql === "fr" ? "fr-FR" : "en-US"}`, { Authorization: pexels });
        for (const v of j.videos ?? []) {
          report.raw++;
          const f = pick((v.video_files ?? []).filter((x: any) => /mp4/.test(x.file_type ?? "video/mp4")).map((x: any) => ({ width: x.width ?? 0, height: x.height ?? 0, link: x.link })));
          if (!(v.duration >= 4)) report.tooShort++;
          else if (f && !exclude.has(`pexels:${v.id}`) && !known("pexels", String(v.id))) out.push({ source: "pexels", id: String(v.id), url: f.link, page: v.url, author: v.user?.name ?? "", license: "Pexels", width: f.width, height: f.height, duration: v.duration, alt: slugWords(v.url ?? "") });
        }
      } catch (e) {
        report.errors.push(`Pexels : ${(e as Error).message}`);
        console.warn("[vidéos libres] pexels indisponible :", (e as Error).message);
      }
    }
    // Présélection plus large : le filtre du métier (gratuit) et le contrôle d'une image choisissent ensuite.
    if (out.length + spare.length >= enough) break;
  }
  return [...out, ...spare];
}

/** Télécharge une vidéo libre de droits (MP4, 80 Mo au plus). */
export async function downloadStockVideo(v: StockVideo): Promise<Buffer> {
  const r = await fetch(v.url, { headers: { "User-Agent": "E-COM-STUDIO-IA" }, signal: AbortSignal.timeout(90_000) });
  if (!r.ok) throw new Error(`${v.source} ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 80_000_000) throw new Error(L("vidéo trop lourde", "video too large"));
  return buf;
}

export const stockVideoCredit = (v: Pick<StockVideo, "license" | "author"> & { aiGenerated?: boolean }) =>
  L(`Vidéo libre de droits (${v.license})${v.author ? `, ${v.author}` : ""}${v.aiGenerated ? " — plan créé par l'IA (publié sur la banque), pas une prise de vue réelle" : ""} — illustration du métier, pas une vidéo de vos réalisations`, `Royalty-free video (${v.license})${v.author ? `, ${v.author}` : ""}${v.aiGenerated ? " — AI-made shot (published on the stock library), not real footage" : ""} — illustrates the trade, not a video of your work`);
