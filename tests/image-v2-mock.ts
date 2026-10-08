/**
 * Fournisseurs simulés du moteur Image V2 : banques d'images, relecture et génération. Aucun appel réel, aucune
 * dépense. Une image simulée ne prouve RIEN de la qualité visuelle réelle : elle sert à vérifier les décisions.
 */
import sharp from "sharp";
import type { ImageV2Deps } from "@/lib/image-v2/deps";
import { PEXELS_LICENSE, type StockProvider } from "@/lib/image-v2/sources";
import type { ImageReview, LicenseInfo, StockCandidate, VisualBrief } from "@/lib/image-v2/types";
import { IMAGE_CRITERIA } from "@/lib/image-v2/types";

/** Image de test nette et texturée, différente pour chaque graine (empreintes perceptives distinctes). */
export async function mockImage(seed: number, w = 1280, h = 720): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);
  const fx = 3 + (seed % 7);
  const fy = 2 + ((seed * 5) % 11);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const v = Math.sin((x * fx) / w * Math.PI * 2 + seed) * Math.cos((y * fy) / h * Math.PI * 2 + seed * 0.7);
      const n = ((x * 7919 + y * 104729 + seed * 31) % 37) - 18;
      raw[i] = Math.max(0, Math.min(255, 128 + v * 90 + n));
      raw[i + 1] = Math.max(0, Math.min(255, 110 + v * 70 - n));
      raw[i + 2] = Math.max(0, Math.min(255, 100 + ((seed * 40) % 100) - v * 40));
    }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 88 }).toBuffer();
}

export function candidate(id: string, alt: string, opts: Partial<StockCandidate> & { license?: LicenseInfo } = {}): StockCandidate {
  return { source: opts.source ?? "pexels", id, url: opts.url ?? `https://img.test/${id}.jpg`, page: `https://img.test/${id}`, author: opts.author ?? `auteur-${id}`, width: opts.width ?? 2400, height: opts.height ?? 1600, alt, license: opts.license ?? PEXELS_LICENSE, query: "" };
}

const DIMS = { landscape: { width: 2100, height: 1400 }, portrait: { width: 1400, height: 2100 }, square: { width: 1600, height: 1600 } } as const;

export function mockProvider(id: string, results: (q: string) => StockCandidate[], calls: string[] = []): StockProvider {
  return {
    id,
    label: id,
    available: () => true,
    capabilities: { orientation: true, languages: ["en", "fr"], negativeTerms: false, perPage: 20 },
    metadata: ["alt"],
    license: () => PEXELS_LICENSE,
    formats: ["jpeg"],
    rateLimit: "test",
    // Comme une vraie banque interrogée avec une orientation : des photos dans cette orientation (sauf dimensions imposées).
    search: async (q, o) => (calls.push(q), results(q).map((c) => ({ ...c, source: c.source ?? id, query: q, ...(c.width === 2400 && c.height === 1600 ? DIMS[o] : {}) }))),
  };
}

export function review(score: number, patch: Partial<ImageReview> = {}, crit: Partial<Record<(typeof IMAGE_CRITERIA)[number], number>> = {}): ImageReview {
  return {
    criteria: Object.fromEntries(IMAGE_CRITERIA.map((k) => [k, crit[k] ?? score])) as ImageReview["criteria"],
    shows: "",
    offTopic: false,
    productAltered: false,
    wrongProduct: false,
    textInImage: false,
    deformed: false,
    artifacts: false,
    issues: [],
    fix: { target: "none", instruction: "" },
    ...patch,
  };
}

export type MockLog = { downloads: string[]; reviews: string[]; generations: string[]; prompts: string[] };

/**
 * Outils simulés. `images` : image téléchargée par identifiant (sinon une image générée par graine) ;
 * `reviewFor` : relecture selon l'identifiant du candidat (ou « gen:<n> » pour la n-ième génération).
 */
export function mockDeps(o: {
  providers?: StockProvider[];
  canReview?: boolean;
  canGenerate?: boolean;
  path?: ImageV2Deps["path"];
  reviewFor?: (key: string, brief: VisualBrief, n: number) => ImageReview | Error;
  generate?: (brief: VisualBrief, prompt: string, n: number) => Promise<Buffer>;
  images?: Record<string, Buffer>;
  reference?: Buffer | null;
}): { deps: ImageV2Deps; log: MockLog } {
  const log: MockLog = { downloads: [], reviews: [], generations: [], prompts: [] };
  let seed = 100;
  let gen = 0;
  let reviews = 0;
  const deps: ImageV2Deps = {
    providers: o.providers ?? [],
    canReview: o.canReview ?? true,
    canGenerate: o.canGenerate ?? true,
    path: o.path ?? ((b) => (b.productFidelity ? (b.references.length ? "composite_plate" : "none") : "text_to_image")),
    reference: () => o.reference ?? null,
    async download(c) {
      log.downloads.push(c.id);
      return o.images?.[c.id] ?? mockImage(seed++, c.width, c.height);
    },
    async review(brief, _img, _ref, key) {
      reviews++;
      log.reviews.push(key);
      const id = /:(?:pexels|pixabay|openverse|[a-z]+):([^:]+)$/.exec(key)?.[1] ?? key;
      const r = o.reviewFor ? o.reviewFor(key.includes(":gen:") ? `gen:${gen}` : id, brief, reviews) : review(8.5);
      if (r instanceof Error) throw r;
      return r;
    },
    async generate(brief, prompt) {
      gen++;
      log.generations.push(String(gen));
      log.prompts.push(prompt);
      const f = brief.format;
      return { img: o.generate ? await o.generate(brief, prompt, gen) : await mockImage(500 + gen, f.width, f.height), provider: "mock", model: null, path: deps.path(brief) };
    },
  };
  return { deps, log };
}
