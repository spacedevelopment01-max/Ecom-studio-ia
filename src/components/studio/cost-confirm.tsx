"use client";
/**
 * Confirmation simple avant une action qui utilise le forfait : « Cette action utilise 1 vidéo IA. Il vous en restera 3. »
 * Quand le quota est épuisé (ou sans forfait), propose d'ajouter un pack ou de choisir un forfait.
 * Jamais de crédits ni de coûts d'IA. Le serveur vérifie les quotas de toute façon.
 */
import { useCallback, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { api, Button, formatDate, Modal } from "../ui";
import { useLang, useT } from "../i18n";
import { formatEur, PACK_FOR_QUOTA, quotaWord } from "../billing-client";
import { PACKS, type BillingView, type QuotaKey } from "@/lib/plans";

export type CostAction = "pipeline" | "theme" | "images" | "image" | "video-clip" | "ugc";

/** Quota utilisé par une action (null : rien n'est décompté). `many` : un jeu d'images (une par image créée). */
function usage(action: CostAction, videos?: "ai" | "edited" | "none"): { key: QuotaKey; count: number; many?: boolean; ask: boolean } | null {
  switch (action) {
    case "pipeline":
      // La création initiale ne décompte pas les visuels ; les 2 vidéos IA (plans filmés) sont décomptées.
      return videos === "ai" ? { key: "aiVideos", count: 2, ask: true } : null;
    case "images":
      return { key: "visuals", count: 1, many: true, ask: true };
    case "image":
      return { key: "visuals", count: 1, ask: false };
    case "video-clip":
      return { key: "aiVideos", count: 1, ask: true };
    case "ugc":
      return { key: "ugc", count: 1, ask: true };
    default:
      return null;
  }
}

type State = { kind: "confirm" | "empty" | "noplan"; key: QuotaKey; count: number; many?: boolean; billing: BillingView; resolve: (go: boolean) => void };

export function useCostConfirm() {
  const t = useT();
  const { lang } = useLang();
  const [state, setState] = useState<State | null>(null);

  /** Résout vrai si l'action peut partir. */
  const confirm = useCallback(async (action: CostAction, opts: { beats?: number; localOk?: boolean; videos?: "ai" | "edited" | "none" } = {}) => {
    const u = usage(action, opts.videos);
    if (!u) return true;
    let b: BillingView;
    try {
      b = await api<BillingView>("/api/billing");
      if (!b?.quotas) return true;
    } catch {
      return true; // la vérification ne doit jamais bloquer : le serveur contrôle les quotas
    }
    const left = b.quotas[u.key].left;
    const kind: State["kind"] = !b.plan && left < u.count ? "noplan" : left < u.count ? "empty" : "confirm";
    if (kind === "confirm" && !u.ask) return true;
    return new Promise<boolean>((resolve) => setState({ kind, key: u.key, count: u.count, many: u.many, billing: b, resolve }));
  }, []);

  const close = (go: boolean) => {
    state?.resolve(go);
    setState(null);
  };

  const s = state;
  const left = s ? s.billing.quotas[s.key].left : 0;
  const pack = s ? PACK_FOR_QUOTA[s.key] : undefined;
  const title = !s ? "" : s.kind === "noplan" ? t("Inclus dans les forfaits", "Included in the plans") : s.kind === "empty" ? t(`Plus de ${quotaWord(s.key, 2, "fr")} ce mois-ci`, `No ${quotaWord(s.key, 2, "en")} left this month`) : t("Avant de lancer", "Before you start");
  const dialog = (
    <Modal open={!!s} onClose={() => close(false)} title={title}>
      {s && (
        <div className="grid gap-4 text-sm">
          {s.kind === "confirm" ? (
            <p className="flex gap-3 rounded-2xl border border-line bg-paper-2 p-4 text-ink">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
              <span>
                {s.many
                  ? t(`Chaque image créée par l'IA utilise 1 visuel de votre forfait. Il vous en reste ${left}.`, `Each image created by AI uses 1 visual from your plan. You have ${left} left.`)
                  : t(`Cette action utilise ${s.count} ${quotaWord(s.key, s.count, "fr")}. Il vous en restera ${left - s.count}.`, `This uses ${s.count} ${quotaWord(s.key, s.count, "en")}. You'll have ${left - s.count} left.`)}
              </span>
            </p>
          ) : (
            <p className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                {s.kind === "noplan"
                  ? t(`Les ${quotaWord(s.key, 2, "fr")} sont inclus dans les forfaits. Choisissez un forfait pour en profiter.`, `${quotaWord(s.key, 2, "en").replace(/^./, (c) => c.toUpperCase())} come with the plans. Choose a plan to use them.`)
                  : t(`Il vous en reste ${left}, il en faut ${s.count}. Ajoutez un pack ou attendez le ${formatDate(s.billing.periodEnd, { day: "numeric", month: "long" })}.`, `You have ${left} left and ${s.count} are needed. Add a pack or wait until ${formatDate(s.billing.periodEnd, { day: "numeric", month: "long" })}.`)}
              </span>
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>{t("Annuler", "Cancel")}</Button>
            {s.kind === "confirm" ? (
              <Button type="button" icon={<Sparkles className="size-4" />} onClick={() => close(true)}>{t("Continuer", "Continue")}</Button>
            ) : s.kind === "noplan" ? (
              <a href="/studio/compte#forfaits" className="inline-flex h-10 items-center rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">{t("Choisir un forfait", "Choose a plan")}</a>
            ) : pack ? (
              <a href={`/studio/compte?pack=${pack}#packs`} className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper">{t(`Ajouter un ${PACKS[pack].name.fr} (${formatEur(s.billing.packPrices[pack], lang)})`, `Add a ${PACKS[pack].name.en} (${formatEur(s.billing.packPrices[pack], lang)})`)}</a>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
  return { confirm, dialog };
}
