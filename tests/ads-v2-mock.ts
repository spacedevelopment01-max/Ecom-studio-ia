/**
 * Outils simulés du moteur publicitaire V2 : rédaction, relecture, image. Aucun appel réel, aucune dépense.
 * Une création simulée ne prouve rien de sa qualité réelle : ces outils servent à vérifier les décisions.
 */
import { saveAsset } from "@/lib/library";
import type { AdsV2Deps } from "@/lib/ads-v2/deps";
import type { CopySet } from "@/lib/ads-v2/copy";
import { AD_CRITERIA, type AdReview } from "@/lib/ads-v2/types";
import { mockImage } from "./image-v2-mock";

export function adReview(score: number, patch: Partial<AdReview> = {}, crit: Partial<Record<(typeof AD_CRITERIA)[number], number>> = {}): AdReview {
  return { criteria: Object.fromEntries(AD_CRITERIA.map((k) => [k, crit[k] ?? score])) as AdReview["criteria"], issues: [], claimProblems: [], productAltered: false, textIllegible: false, generic: false, fix: { target: "none", instruction: "" }, ...patch };
}

/** Rédaction simulée : une annonce par angle du prompt, propre (aucune affirmation). */
export function cleanCopies(prompt: string): CopySet {
  const n = (prompt.match(/^\d+\. /gm) ?? []).length || 1;
  const H = ["Le bouchon se visse d'un geste", "Le flacon tient dans la main", "La pipette dose sans excès", "La texture fond sur la peau", "Un rituel du matin plus court", "Le verre ambré protège la formule"];
  return { ads: Array.from({ length: n }, (_, k) => ({ angle: `a${k}`, hook: H[k], hookB: `Regardez : ${H[(k + 3) % 6].toLowerCase()}`, primary: `${H[k]}.\n\nUn détail précis, visible dès la première image.`, headline: H[k].split(" ").slice(0, 4).join(" "), description: "Marque", cta: "Découvrir", visual: "" })) };
}

export type AdMockLog = { copyCalls: string[]; reviews: number; images: { aspect: string; variant: number | null; kind: string }[] };

export function mockAdDeps(o: {
  userId: string;
  projectId: string;
  canWrite?: boolean;
  canReview?: boolean;
  write?: (prompt: string, n: number) => CopySet | Error;
  review?: (n: number) => AdReview | Error;
  cutout?: { id: string; data: Buffer } | null;
  logo?: { id: string; data: Buffer } | null;
  noImage?: boolean;
}): { deps: AdsV2Deps; log: AdMockLog } {
  const log: AdMockLog = { copyCalls: [], reviews: 0, images: [] };
  let seed = 900;
  const deps: AdsV2Deps = {
    canWrite: o.canWrite ?? true,
    canReview: o.canReview ?? true,
    async writeCopy(_s, prompt) {
      log.copyCalls.push(prompt);
      const r = o.write ? o.write(prompt, log.copyCalls.length) : cleanCopies(prompt);
      if (r instanceof Error) throw r;
      return r;
    },
    async review() {
      log.reviews++;
      const r = o.review ? o.review(log.reviews) : adReview(8.6);
      if (r instanceof Error) throw r;
      return r;
    },
    async image(req) {
      log.images.push({ aspect: String(req.aspect), variant: req.variant ?? null, kind: req.kind });
      if (o.noImage) return null;
      const [w, h] = req.aspect === "16:9" ? [1920, 1080] : req.aspect === "1:1" ? [1200, 1200] : [1080, 1350];
      const data = await mockImage(seed++, w, h);
      const a = await saveAsset({ projectId: o.projectId, userId: o.userId, data, name: "image-v2.jpg", mime: "image/jpeg", role: "ambiance", origin: "generated", meta: { imageV2: { briefHash: `mock${seed}` }, gate: { verdict: "FINAL" } } });
      return { assetId: a.id, data };
    },
    cutout: () => o.cutout ?? null,
    logo: () => o.logo ?? null,
  };
  return { deps, log };
}
