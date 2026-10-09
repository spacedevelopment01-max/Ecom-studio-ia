/**
 * Administration › Modèles Images & Vidéos : état réel de chaque modèle (connexion, capacités, qualité, résolution,
 * durées, tarif selon les paramètres, statut chez le fournisseur), principal, secours et mode par type.
 * Lecture seule ; aucun appel aux fournisseurs.
 */
import { EUR } from "../billing";
import { L } from "../i18n-server";
import { getSetting } from "../settings";
import { priceFor } from "./config";
import { MEDIA_MODELS, type MediaKind, type MediaModel } from "./media-models";
import { mediaBackup, mediaMode, mediaPrimary, mediaStats, mediaStatus, rankMedia, shutDown, typicalCostMicro } from "./media-routing";

const eur = (micro: number | null) => (micro == null ? null : Math.round((micro / EUR) * 1000) / 1000);

function capsOf(m: MediaModel): string[] {
  const c = m.caps;
  return [
    c.maskEdit && L("retouche par masque (fidélité produit)", "mask editing (product fidelity)"),
    c.references && L(`${c.references} image(s) de référence`, `${c.references} reference image(s)`),
    m.needsReference && L("exige une référence", "requires a reference"),
    c.transparent && L("fond transparent", "transparent background"),
    c.textInImage && L("texte dans l'image", "text in image"),
    c.imageToVideo && L("image vers vidéo", "image to video"),
    c.textToVideo && L("texte vers vidéo", "text to video"),
    c.audio && L("son natif", "native audio"),
    c.people && L("personnes", "people"),
  ].filter(Boolean) as string[];
}

export function mediaRoutingOverview() {
  const kinds: MediaKind[] = ["image", "video"];
  return kinds.map((kind) => {
    const primary = mediaPrimary(kind);
    const backup = mediaBackup(kind);
    const stats = mediaStats(kind);
    const ranking = rankMedia(kind === "image" ? { kind } : { kind, imageToVideo: true });
    return {
      kind,
      mode: mediaMode(kind),
      primary: `${primary.provider}:${primary.model}`,
      backup: backup ? `${backup.provider}:${backup.model}` : null,
      autoPick: ranking.find((r) => !r.excluded) ? `${ranking.find((r) => !r.excluded)!.model.provider}:${ranking.find((r) => !r.excluded)!.model.model}` : null,
      models: MEDIA_MODELS.filter((m) => m.kind === kind).map((m) => {
        const st = mediaStatus(m);
        const s = stats[st.key];
        return {
          key: st.key,
          provider: m.provider,
          model: m.model,
          label: m.label,
          connection: st.connected ? "connected" : getSetting(`provider.${m.provider}.disabled`) === "1" ? "disabled" : "missing",
          caps: capsOf(m),
          quality: m.quality,
          resolution: m.resolution,
          aspects: m.aspects,
          durations: m.durations ?? null,
          status: shutDown(m) ? "shutdown" : m.status,
          replacement: m.replacement ?? null,
          priceNote: m.priceNote,
          price: priceFor(m.provider, m.model),
          typicalEur: eur(typicalCostMicro(m)),
          typicalLabel: kind === "video" ? L(`plan de ${m.typical.seconds ?? 8} s`, `${m.typical.seconds ?? 8} s shot`) : L("1 image", "1 image"),
          usable: st.usable,
          confirmed: st.confirmed,
          enabled: st.enabled,
          reasons: st.reasons,
          verified: m.verified,
          adapter: !!m.adapter,
          source: m.source,
          use: L(m.use.fr, m.use.en),
          score: ranking.find((r) => r.model === m)?.score ?? null,
          observed: s ? { calls: s.calls, failures: s.failures, avgCostEur: eur(s.avgCostMicro), avgLatencyMs: s.avgLatencyMs, avgScore: s.avgScore } : null,
        };
      }),
    };
  });
}
