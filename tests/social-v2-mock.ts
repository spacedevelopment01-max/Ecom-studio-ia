/**
 * Outils Social V2 simulés : AUCUN appel d'IA, AUCUNE publication réelle, aucune dépense. Le publieur simulé
 * enregistre chaque envoi (pour vérifier l'absence de doublon) et peut simuler un délai dépassé, un refus, une
 * limite de débit, un jeton expiré.
 */
import sharp from "sharp";
import { saveAsset } from "@/lib/library";
import { PermanentError } from "@/lib/jobs";
import type { MediaResult, Publisher, SocialDeps } from "@/lib/social-v2/deps";
import type { Project } from "@/lib/projects";

export async function fakeImage(p: Project, name: string, kind: "image" | "video" = "image") {
  const data = await sharp({ create: { width: 64, height: 80, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().toBuffer();
  return saveAsset({ projectId: p.id, userId: p.userId, data, name, mime: kind === "video" ? "video/mp4" : "image/jpeg", role: "social", origin: "generated", status: "approved", ...(kind === "video" ? { kind: "video" } : {}) });
}

export type DepsLog = { image: number; video: number; ad: number; local: number; rewrite: number; paid: number };

export function mockSocialDeps(o: { aiActive?: boolean; cost?: number; rewrite?: (caption: string) => string } = {}): { deps: SocialDeps; log: DepsLog } {
  const log: DepsLog = { image: 0, video: 0, ad: 0, local: 0, rewrite: 0, paid: 0 };
  const cost = o.cost ?? 100_000;
  const make = async (p: Project, postId: string, by: MediaResult["by"], paid: boolean): Promise<MediaResult> => {
    const a = await fakeImage(p, `${by}-${postId.slice(0, 6)}.jpg`);
    if (paid) log.paid++;
    return { assetId: a.id, costMicro: paid ? cost : 0, by };
  };
  const deps: SocialDeps = {
    aiActive: o.aiActive ?? false,
    image: async (p, post, m) => (log.image++, make(p, post.id, "image_v2", m.allowPaid)),
    video: async (_p, _post, m) => (log.video++, m.allowPaid && log.paid++, { assetId: null, costMicro: m.allowPaid ? cost : 0, by: "video_v2", note: "vidéo simulée : aucune" }),
    ad: async (p, post, m) => (log.ad++, make(p, post.id, "ads_v2", m.allowPaid)),
    local: async (p, post) => (log.local++, make(p, post.id, "local", false)),
    rewrite: async (_p, post) => (log.rewrite++, { title: post.title, caption: o.rewrite ? o.rewrite(post.caption) : `${post.caption}\n\nVersion plus premium.`, hashtags: [], costMicro: 20_000 }),
    estimate: (kind) => (kind === "rewrite" ? 20_000 : cost),
  };
  return { deps, log };
}

export type PubMode = "ok" | "timeout" | "permanent" | "reconnect" | "rate" | "hang";
export function mockPublisher(o: { mode?: PubMode | (() => PubMode); verifiable?: boolean; existing?: string | null; delayMs?: number } = {}): { publisher: Publisher; sent: string[] } {
  const sent: string[] = [];
  const publisher: Publisher = {
    async publish(post) {
      const mode = typeof o.mode === "function" ? o.mode() : o.mode ?? "ok";
      sent.push(post.id);
      if (o.delayMs) await new Promise((r) => setTimeout(r, o.delayMs));
      if (mode === "hang") await new Promise((r) => setTimeout(r, 5_000));
      if (mode === "timeout") throw new Error("fetch failed: socket hang up");
      if (mode === "permanent") throw new PermanentError("Instagram a refusé le média : format");
      if (mode === "reconnect") throw Object.assign(new PermanentError("Autorisation expirée : reconnectez le compte."), { reconnect: true });
      if (mode === "rate") throw new Error("Limite de débit Meta atteinte, nouvel essai plus tard");
      return { remoteId: `remote-${post.id}`, url: `https://example.test/p/${post.id}` };
    },
    findExisting: async () => o.existing ?? null,
    canVerify: () => !!o.verifiable,
  };
  return { publisher, sent };
}
