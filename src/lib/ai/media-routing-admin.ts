/**
 * Administration › Modèles Images & Vidéos : état réel de chaque modèle (connexion, capacités, qualité, résolution,
 * durées, tarif selon les paramètres, statut chez le fournisseur), principal, secours et mode par type.
 * Lecture seule ; aucun appel aux fournisseurs.
 */
import { EUR } from "../billing";
import { L } from "../i18n-server";
import { getJsonSetting, getSetting } from "../settings";
import { priceFor, providerEnabled, providerKey } from "./config";
import { ALIBABA_REGIONS, alibabaBase, alibabaRegion } from "./alibaba";
import { MEDIA_MODELS, type MediaKind, type MediaModel } from "./media-models";
import { incompatibility, MEDIA_USAGES, mediaBackup, mediaMode, usageMode, mediaPrimary, mediaStats, mediaStatus, rankMedia, selectMedia, shutDown, typicalCostMicro, USAGE_INFO, usageBackup, usageExplicit, usageNeed, usageOff, usagePrimary, usageSettings } from "./media-routing";

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

/**
 * Réglages par USAGE (logos, images produit, retouches produit, publicités, décors, vidéos produit, vidéos UGC) :
 * mode, principal, secours (hérités du réglage général tant qu'ils ne sont pas choisis), modèle qui serait appelé
 * maintenant, et modèles du catalogue avec leur compatibilité pour cet usage.
 */
export function mediaUsageOverview() {
  const settings = usageSettings();
  return MEDIA_USAGES.map((u) => {
    const info = USAGE_INFO[u];
    const own = settings[u] ?? {};
    const primary = usagePrimary(u);
    const backup = usageBackup(u);
    const need = usageNeed(u);
    const off = usageOff(u);
    const pick = off ? null : selectMedia(need);
    const key = (r: { provider: string; model: string } | null) => (r ? `${r.provider}:${r.model}` : null);
    const pm = MEDIA_MODELS.find((m) => `${m.provider}:${m.model}` === key(primary));
    return {
      usage: u,
      kind: info.kind,
      label: L(info.label.fr, info.label.en),
      detail: L(info.detail.fr, info.detail.en),
      mode: usageMode(u),
      modeInherited: !own.mode,
      primary: key(primary)!,
      primaryInherited: primary.inherited,
      // Principal hérité qui ne convient pas à cet usage (ex. modèle sans retouche par masque) : signalé.
      primaryProblem: pm ? incompatibility(pm, need) : L("modèle hors catalogue", "model not in the catalog"),
      backup: key(backup),
      backupInherited: !("backup" in own),
      off,
      canBeOff: !!info.canBeOff,
      current: pick ? { key: `${pick.provider}:${pick.model}`, role: pick.role } : null,
      explicit: usageExplicit(u),
      options: MEDIA_MODELS.filter((m) => m.kind === info.kind).map((m) => {
        const st = mediaStatus(m);
        const priced = !st.reasons.some((r) => /tarif|price/i.test(r));
        return { key: st.key, label: m.label, incompatible: incompatibility(m, need), canBePrimary: !!m.adapter && st.confirmed && priced, canBeBackup: st.usable };
      }),
    };
  });
}

/**
 * Alibaba Cloud (Qwen-Image, Wan) : état RÉEL de validation, étape par étape, pour l'administration. La première étape
 * non remplie donne le message affiché (clé absente, adresse invalide, connexion non testée, modèle non confirmé,
 * modèle non tarifé…) ; toutes remplies : « fournisseur prêt ».
 */
export function alibabaReadiness() {
  const models = MEDIA_MODELS.filter((m) => m.provider === "alibaba").map((m) => {
    const st = mediaStatus(m);
    return { key: st.key, label: m.label, kind: m.kind, confirmed: st.confirmed, priced: !st.reasons.some((r) => /tarif|price/i.test(r)), usable: st.usable, enabled: st.enabled, reasons: st.reasons };
  });
  const { base, problem } = alibabaBase();
  const last = getJsonSetting<{ ok: boolean; at: number; message: string } | null>("provider.alibaba.lastTest", null);
  const usedBy = MEDIA_USAGES.filter((u) => usagePrimary(u).provider === "alibaba" || usageBackup(u)?.provider === "alibaba").map((u) => L(USAGE_INFO[u].label.fr, USAGE_INFO[u].label.en));
  const checks: { id: string; ok: boolean; label: string; fail: string }[] = [
    { id: "key", ok: !!providerKey("alibaba"), label: L("Clé présente (chiffrée)", "Key present (encrypted)"), fail: L("Clé absente", "Key missing") },
    { id: "enabled", ok: providerEnabled("alibaba"), label: L("Fournisseur activé", "Provider enabled"), fail: L("Fournisseur désactivé", "Provider disabled") },
    { id: "endpoint", ok: !problem, label: L("Adresse d'API valide", "Valid API address"), fail: problem ?? L("Adresse d'API invalide", "Invalid API address") },
    { id: "tested", ok: !!last?.ok, label: L("Connexion testée", "Connection tested"), fail: last ? last.message : L("Connexion jamais testée : cliquez sur « Tester réellement »", "Connection never tested: click \"Run a live test\"") },
    { id: "models", ok: models.length > 0, label: L("Modèles image et vidéo disponibles dans le studio", "Image and video models available in the studio"), fail: L("Aucun modèle", "No model") },
    { id: "confirmed", ok: models.some((m) => m.confirmed), label: L("Au moins un modèle autorisé (confirmé)", "At least one model allowed (confirmed)"), fail: L("Aucun modèle confirmé : confirmez-les dans « Modèles Images & Vidéos » après vérification sur la console Alibaba", "No model confirmed: confirm them in \"Image & video models\" after checking the Alibaba console") },
    { id: "priced", ok: models.some((m) => m.priced), label: L("Tarification renseignée", "Pricing set"), fail: L("Modèle non tarifé : saisissez le tarif (par image, ou par seconde en 720P)", "Model not priced: enter the price (per image, or per second at 720P)") },
    { id: "usable", ok: models.some((m) => m.usable && m.enabled), label: L("Génération autorisée", "Generation allowed"), fail: L("Aucun modèle utilisable (clé, confirmation, tarif)", "No usable model (key, confirmation, price)") },
  ];
  const firstFail = checks.find((c) => !c.ok);
  return {
    region: alibabaRegion(),
    regions: (Object.keys(ALIBABA_REGIONS) as (keyof typeof ALIBABA_REGIONS)[]).map((r) => ({ id: r, label: L(ALIBABA_REGIONS[r].label.fr, ALIBABA_REGIONS[r].label.en), base: ALIBABA_REGIONS[r].base })),
    base,
    endpoint: getSetting("provider.alibaba.endpoint") ?? "",
    workspace: getSetting("provider.alibaba.workspace") ?? "",
    lastTest: last,
    checks,
    status: firstFail ? firstFail.fail : L("Fournisseur prêt", "Provider ready"),
    ready: !firstFail,
    models,
    usedBy,
  };
}
