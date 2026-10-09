"use client";
/**
 * Administration › Modèles Images & Vidéos : fournisseur, modèle, connexion, capacités, qualité et résolution,
 * durées, prix selon les paramètres, mode manuel ou automatique, principal, secours compatible, désactivation.
 */
import { Badge, Button, Card, cx } from "./ui";
import { useT } from "./i18n";

type MediaModelRow = {
  key: string;
  provider: string;
  model: string;
  label: string;
  connection: "connected" | "disabled" | "missing";
  caps: string[];
  quality: number;
  resolution: string;
  aspects: string[];
  durations: number[] | null;
  status: "stable" | "preview" | "legacy" | "deprecated" | "shutdown";
  replacement: string | null;
  priceNote: string;
  price: { unit: string; perImage?: number; perSecond?: number; inputPerM?: number; outputPerM?: number } | null;
  typicalEur: number | null;
  typicalLabel: string;
  usable: boolean;
  confirmed: boolean;
  enabled: boolean;
  reasons: string[];
  verified: { id: boolean; price: boolean };
  adapter: boolean;
  source: string;
  use: string;
  score: number | null;
  observed: { calls: number; failures: number; avgCostEur: number | null; avgLatencyMs: number | null; avgScore: number | null } | null;
};

export type MediaRoutingData = { kind: "image" | "video"; mode: "manual" | "auto"; primary: string; backup: string | null; autoPick: string | null; models: MediaModelRow[] }[];

type Post = (b: Record<string, unknown>, msg?: string) => Promise<void>;

const priceText = (p: MediaModelRow["price"]) =>
  !p ? null : p.unit === "image" ? `${p.perImage} $ / image` : p.unit === "video_second" ? `${p.perSecond} $ / s` : `${p.inputPerM} / ${p.outputPerM} $ / M`;

export function MediaRoutingPanel({ data, post }: { data: MediaRoutingData; post: Post }) {
  const t = useT();
  const quality = (q: number) => (q === 3 ? t("haut de gamme", "premium") : q === 2 ? t("standard", "standard") : t("économique", "budget"));
  const status: Record<MediaModelRow["status"], { label: string; tone: "ok" | "warn" | "bad" | undefined }> = {
    stable: { label: t("stable", "stable"), tone: "ok" },
    preview: { label: t("aperçu", "preview"), tone: "warn" },
    legacy: { label: t("ancienne génération", "previous generation"), tone: "warn" },
    deprecated: { label: t("abandonné", "deprecated"), tone: "bad" },
    shutdown: { label: t("arrêté", "shut down"), tone: "bad" },
  };
  const conn = { connected: t("clé active", "key active"), disabled: t("désactivé", "disabled"), missing: t("aucune clé", "no key") };
  return (
    <>
      <Card className="grid gap-2 p-5">
        <p className="font-display text-lg font-semibold">{t("Modèles Images & Vidéos", "Image & video models")}</p>
        <p className="text-sm text-ink-2">
          {t(
            "Les IA d'images créent les concepts (décors, ambiances, symboles, logos) ; le studio garde la main sur le nom exact de la marque, la fidélité au produit (pixels réels replacés), les déclinaisons, les contrôles de qualité et les exports. Manuel : le principal choisi ici, puis le secours si le principal est indisponible ou refuse sans rien facturer. Automatique : le studio choisit selon le besoin (fidélité, texte, son), la qualité, les résultats observés, puis le coût et le budget restant — jamais seulement le moins cher.",
            "Image AIs create the concepts (sets, moods, symbols, logos); the studio keeps control of the exact brand name, product fidelity (real pixels put back), variations, quality checks and exports. Manual: the primary chosen here, then the backup if the primary is unavailable or refuses without charging. Automatic: the studio picks by need (fidelity, text, sound), quality, observed results, then cost and remaining budget — never just the cheapest.",
          )}
        </p>
        <p className="text-sm text-ink-2">
          {t(
            "Un nouveau modèle reste verrouillé tant que son tarif officiel n'est pas saisi dans « Modèles et tarifs › Tarifs des fournisseurs » (par image ou par seconde) puis confirmé ici. Chaque génération, secours compris, réserve son coût maximal avant l'envoi.",
            "A new model stays locked until its official price is entered under \"Models and pricing › Provider prices\" (per image or per second) and then confirmed here. Each generation, backups included, reserves its maximum cost before sending.",
          )}
        </p>
      </Card>
      {data.map((k) => (
        <Card key={k.kind} className="grid gap-4 overflow-x-auto p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{k.kind === "image" ? t("Images, logos et visuels publicitaires", "Images, logos and ad visuals") : t("Vidéos produit et UGC", "Product and UGC videos")}</p>
              <p className="text-xs text-muted">
                {t("Principal", "Primary")} : <span className="font-mono">{k.primary}</span> · {t("Secours", "Backup")} : <span className="font-mono">{k.backup ?? t("aucun", "none")}</span>
                {k.mode === "auto" && <> · {t("Choix automatique actuel", "Current automatic pick")} : <span className="font-mono">{k.autoPick ?? t("aucun modèle utilisable", "no usable model")}</span></>}
              </p>
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={t("Mode", "Mode")}>
              {(["manual", "auto"] as const).map((m) => (
                <button key={m} role="radio" aria-checked={k.mode === m} onClick={() => k.mode !== m && post({ mediaMode: { kind: k.kind, mode: m } }, m === "auto" ? t("Mode automatique activé.", "Automatic mode enabled.") : t("Mode manuel rétabli.", "Manual mode restored."))} className={cx("min-h-11 rounded-full border px-4 text-sm", k.mode === m ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                  {m === "manual" ? t("Manuel", "Manual") : t("Automatique", "Automatic")}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2">{t("Modèle", "Model")}</th>
                <th>{t("Connexion", "Connection")}</th>
                <th>{t("Capacités", "Capabilities")}</th>
                <th>{t("Qualité · résolution", "Quality · resolution")}</th>
                <th>{t("Prix", "Price")}</th>
                <th>{t("État", "Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {k.models.map((m) => {
                const isPrimary = m.key === k.primary;
                const isBackup = m.key === k.backup;
                return (
                  <tr key={m.key} className="align-top">
                    <td className="py-2 pr-2">
                      <span className="font-medium">{m.label}</span>
                      <span className="block break-all font-mono text-xs text-muted">{m.key}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {isPrimary && <Badge tone="ok" dot>{t("principal", "primary")}</Badge>}
                        {isBackup && <Badge>{t("secours", "backup")}</Badge>}
                        <Badge tone={status[m.status].tone}>{status[m.status].label}</Badge>
                      </span>
                      {m.replacement && <span className="mt-1 block text-xs text-muted">{t("Remplaçant conseillé", "Suggested replacement")} : <span className="font-mono">{m.replacement}</span></span>}
                      <a href={m.source} target="_blank" rel="noreferrer" className="text-xs underline">{t("Source", "Source")}</a>
                    </td>
                    <td className="pr-2 text-xs"><Badge tone={m.connection === "connected" ? "ok" : "warn"} dot={m.connection === "connected"}>{conn[m.connection]}</Badge></td>
                    <td className="max-w-[220px] pr-2 text-xs text-ink-2">{m.caps.join(" · ")}<span className="mt-1 block text-muted">{m.use}</span></td>
                    <td className="pr-2 text-xs">
                      {quality(m.quality)}
                      <span className="block text-muted">{m.resolution}</span>
                      {m.durations && <span className="block text-muted">{t("Durées", "Lengths")} : {m.durations.length > 3 ? `${m.durations[0]}–${m.durations[m.durations.length - 1]} s` : m.durations.map((d) => `${d} s`).join(", ")}</span>}
                    </td>
                    <td className="max-w-[200px] pr-2 text-xs">
                      {priceText(m.price) ? <span className="font-mono">{priceText(m.price)}</span> : <Badge tone="warn">{t("à renseigner", "to enter")}</Badge>}
                      {m.typicalEur != null && <span className="block text-muted">≈ {m.typicalEur.toLocaleString("fr-FR")} € · {m.typicalLabel}</span>}
                      <span className="block text-muted">{m.priceNote}</span>
                      {m.observed && <span className="block text-muted">{t("Observé", "Observed")} : {m.observed.calls} · {m.observed.failures} {t("échecs", "failures")}{m.observed.avgScore != null ? ` · ${t("note", "score")} ${m.observed.avgScore}` : ""}</span>}
                    </td>
                    <td className="pr-2 text-xs">
                      {m.usable ? (m.enabled ? <Badge tone="ok" dot>{t("utilisable", "usable")}</Badge> : <Badge>{t("désactivé", "disabled")}</Badge>) : <Badge tone="warn">{t("verrouillé", "locked")}</Badge>}
                      {m.reasons.length > 0 && <span className="mt-1 block text-muted">{m.reasons.join(" · ")}</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        {!isPrimary && <Button size="sm" variant="secondary" disabled={!m.confirmed || !m.price || !m.adapter} onClick={() => post({ mediaPrimary: { kind: k.kind, key: m.key } }, t("Principal enregistré.", "Primary saved."))}>{t("Choisir comme principal", "Set as primary")}</Button>}
                        {!isPrimary && (isBackup ? (
                          <Button size="sm" variant="ghost" onClick={() => post({ mediaBackup: { kind: k.kind, key: null } }, t("Secours retiré.", "Backup removed."))}>{t("Retirer le secours", "Remove backup")}</Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={!m.usable} onClick={() => post({ mediaBackup: { kind: k.kind, key: m.key } }, t("Secours enregistré.", "Backup saved."))}>{t("Choisir comme secours", "Set as backup")}</Button>
                        ))}
                        {!(m.verified.id && m.verified.price) && (m.confirmed ? (
                          <Button size="sm" variant="ghost" onClick={() => post({ mediaModel: { key: m.key, confirm: false } }, t("Confirmation retirée.", "Confirmation removed."))}>{t("Retirer la confirmation", "Remove confirmation")}</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => confirm(t(`Confirmez-vous avoir vérifié l'identifiant et le tarif de ${m.label} sur la page officielle du fournisseur ?`, `Do you confirm you've checked ${m.label}'s ID and price on the provider's official page?`)) && post({ mediaModel: { key: m.key, confirm: true } }, t("Modèle confirmé.", "Model confirmed."))}>{t("Confirmer", "Confirm")}</Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => post({ mediaModel: { key: m.key, enabled: !m.enabled } }, m.enabled ? t("Modèle désactivé.", "Model disabled.") : t("Modèle activé.", "Model enabled."))}>{m.enabled ? t("Désactiver", "Disable") : t("Activer", "Enable")}</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}
    </>
  );
}
