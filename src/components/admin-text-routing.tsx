"use client";
/**
 * Administration › Modèles et tarifs : routage des modèles de TEXTE entre Anthropic, OpenAI et Google Gemini.
 * Fournisseurs disponibles, modèles compatibles (tarif, effort accepté, usage recommandé), confirmation et
 * activation, mode automatique ou manuel, principal et secours par tâche, coûts observés.
 */
import { Badge, Button, Card, cx } from "./ui";
import { useT } from "./i18n";

export type TextRoutingData = {
  mode: "manual" | "auto";
  providers: { id: string; available: boolean }[];
  models: {
    key: string;
    provider: string;
    model: string;
    label: string;
    tier: string;
    vision: boolean;
    effort: { kind: string; values: string[]; default: string | null };
    limits: { context: number; maxOutput: number };
    verified: boolean;
    source: string;
    use: string;
    price: { unit: string; inputPerM?: number; outputPerM?: number } | null;
    usable: boolean;
    confirmed: boolean;
    enabled: boolean;
    autoEligible: boolean;
    reasons: string[];
  }[];
  tasks: {
    task: string;
    label: string;
    tier: string;
    effort: string | null;
    pinned: boolean;
    manual: { provider: string; model: string; effort?: string; estEur: number | null };
    auto: { primary: string | null; primaryEstEur: number | null; backup: string | null; backupEstEur: number | null } | null;
    observed: { key: string; calls: number; failures: number; avgCostEur: number | null; avgLatencyMs: number | null; avgScore: number | null }[];
  }[];
};

type Post = (b: Record<string, unknown>, msg?: string) => Promise<void>;

const EFFORT_PARAM: Record<string, string> = { anthropic_effort: "output_config.effort", openai_reasoning: "reasoning.effort", gemini_thinking_level: "thinkingLevel" };
const money = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} €`);

export function TextRoutingPanel({ data, post }: { data: TextRoutingData; post: Post }) {
  const t = useT();
  const tierLabel = (x: string) => (x === "strong" ? t("fort", "strong") : x === "standard" ? t("standard", "standard") : t("léger", "light"));
  return (
    <>
      <Card className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="font-display text-lg font-semibold">{t("Choix des modèles de texte", "Text model selection")}</p>
            <p className="text-sm text-ink-2">
              {t(
                "Manuel : chaque tâche utilise le modèle fixé ci-dessous (routage actuel). Automatique : le studio choisit, pour chaque tâche, le modèle le moins cher du niveau de qualité requis parmi les modèles confirmés et activés, en tenant compte de l'historique, de la latence et du budget restant du client. Jamais un niveau inférieur à celui de la tâche.",
                "Manual: each task uses the model set below (current routing). Automatic: for each task, the studio picks the cheapest model of the required quality tier among confirmed and enabled models, taking history, latency and the customer's remaining budget into account. Never a tier below the task's.",
              )}
            </p>
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label={t("Mode de routage", "Routing mode")}>
            {(["manual", "auto"] as const).map((m) => (
              <button key={m} role="radio" aria-checked={data.mode === m} onClick={() => data.mode !== m && post({ routingMode: m }, m === "auto" ? t("Routage automatique activé.", "Automatic routing enabled.") : t("Routage manuel rétabli.", "Manual routing restored."))} className={cx("min-h-11 rounded-full border px-4 text-sm", data.mode === m ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                {m === "manual" ? t("Manuel", "Manual") : t("Automatique", "Automatic")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {data.providers.map((p) => (
            <Badge key={p.id} tone={p.available ? "ok" : "warn"} dot={p.available}>
              {p.id} · {p.available ? t("clé active", "key active") : t("clé absente ou désactivée", "key missing or disabled")}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-5">
        <p className="font-display text-lg font-semibold">{t("Modèles de texte compatibles", "Compatible text models")}</p>
        <p className="mb-4 text-sm text-ink-2">
          {t(
            "Un modèle n'est utilisé que si sa clé est active, son tarif renseigné et ses informations confirmées. OpenAI et Gemini : vérifiez l'identifiant, le tarif et les limites sur les pages officielles, renseignez le tarif dans « Tarifs des fournisseurs », puis cliquez sur « Confirmer ». Ils ne sont jamais activés automatiquement.",
            "A model is only used if its key is active, its price set and its information confirmed. OpenAI and Gemini: check the ID, price and limits on the official pages, enter the price under \"Provider prices\", then click \"Confirm\". They're never enabled automatically.",
          )}
        </p>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="py-2">{t("Modèle", "Model")}</th><th>{t("Niveau", "Tier")}</th><th>{t("Tarif (USD / M jetons)", "Price (USD / M tokens)")}</th><th>{t("Effort accepté", "Accepted effort")}</th><th>{t("Usage recommandé", "Recommended use")}</th><th>{t("État", "Status")}</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.models.map((m) => (
              <tr key={m.key} className="align-top">
                <td className="py-2 pr-2">
                  <span className="font-medium">{m.label}</span>
                  <span className="block font-mono text-xs text-muted">{m.key}</span>
                  <a href={m.source} target="_blank" rel="noreferrer" className="text-xs underline">{t("Source", "Source")}</a>
                </td>
                <td className="pr-2">{tierLabel(m.tier)}</td>
                <td className="pr-2 font-mono text-xs">{m.price && m.price.unit === "tokens" ? `${m.price.inputPerM} / ${m.price.outputPerM}` : <Badge tone="warn">{t("à renseigner", "to enter")}</Badge>}</td>
                <td className="pr-2 text-xs">
                  {m.effort.values.length ? (
                    <>
                      <span className="font-mono">{EFFORT_PARAM[m.effort.kind]}</span>
                      <span className="block">{m.effort.values.join(", ")}</span>
                    </>
                  ) : (
                    <span className="text-muted">{t("aucun réglage", "no setting")}</span>
                  )}
                </td>
                <td className="max-w-[260px] pr-2 text-xs text-ink-2">{m.use}</td>
                <td className="pr-2 text-xs">
                  {m.autoEligible ? <Badge tone="ok" dot>{t("utilisé en automatique", "used in automatic")}</Badge> : m.usable ? <Badge>{t("utilisable, non activé", "usable, not enabled")}</Badge> : <Badge tone="warn">{t("verrouillé", "locked")}</Badge>}
                  {m.reasons.length > 0 && <span className="mt-1 block text-muted">{m.reasons.join(" · ")}</span>}
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex flex-col gap-1.5">
                    {!m.verified && (m.confirmed ? (
                      <Button size="sm" variant="ghost" onClick={() => post({ textModel: { key: m.key, confirm: false } }, t("Confirmation retirée.", "Confirmation removed."))}>{t("Retirer la confirmation", "Remove confirmation")}</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => confirm(t(`Confirmez-vous avoir vérifié l'identifiant, le tarif et les limites de ${m.label} sur la page officielle du fournisseur ?`, `Do you confirm you've checked ${m.label}'s ID, price and limits on the provider's official page?`)) && post({ textModel: { key: m.key, confirm: true } }, t("Modèle confirmé.", "Model confirmed."))}>{t("Confirmer", "Confirm")}</Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => post({ textModel: { key: m.key, enabled: !m.enabled } }, m.enabled ? t("Modèle retiré du routage automatique.", "Model removed from automatic routing.") : t("Modèle activé pour le routage automatique.", "Model enabled for automatic routing."))}>{m.enabled ? t("Désactiver", "Disable") : t("Activer", "Enable")}</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-5">
        <p className="font-display text-lg font-semibold">{t("Modèle par tâche", "Model per task")}</p>
        <p className="mb-4 text-sm text-ink-2">
          {t(
            "Coût théorique d'un appel typique (estimation, coefficient non compris). Le secours n'apparaît que si son tarif est connu : la réservation avant l'appel couvre alors son coût. Une tâche « maintenue en manuel » garde sa route fixée même en mode automatique.",
            "Theoretical cost of a typical call (estimate, multiplier excluded). The backup only shows if its price is known: the pre-call reservation then covers its cost. A task \"kept manual\" keeps its fixed route even in automatic mode.",
          )}
        </p>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="py-2">{t("Tâche", "Task")}</th><th>{t("Manuel (actuel)", "Manual (current)")}</th><th>{t("Automatique : principal", "Automatic: primary")}</th><th>{t("Secours", "Backup")}</th><th>{t("Coûts observés (90 j)", "Observed costs (90 d)")}</th><th>{t("Mode", "Mode")}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.tasks.map((k) => (
              <tr key={k.task} className="align-top">
                <td className="py-2 pr-2">{k.label}<span className="block text-xs text-muted">{tierLabel(k.tier)}{k.effort ? ` · effort ${k.effort}` : ""}</span></td>
                <td className="pr-2 font-mono text-xs">{k.manual.provider}:{k.manual.model}{k.manual.effort ? ` · ${k.manual.effort}` : ""}<span className="block text-muted">{money(k.manual.estEur)}</span></td>
                <td className="pr-2 font-mono text-xs">{k.auto?.primary ?? <span className="text-muted">{t("aucun modèle utilisable", "no usable model")}</span>}{k.auto?.primary && <span className="block text-muted">{money(k.auto.primaryEstEur)}</span>}</td>
                <td className="pr-2 font-mono text-xs">{k.auto?.backup ?? <span className="text-muted">{t("aucun (coût non couvert)", "none (cost not covered)")}</span>}{k.auto?.backup && <span className="block text-muted">{money(k.auto.backupEstEur)}</span>}</td>
                <td className="pr-2 text-xs">
                  {k.observed.length ? k.observed.map((o) => (
                    <span key={o.key} className="block"><span className="font-mono">{o.key}</span> · {o.calls} {t("appels", "calls")} · {money(o.avgCostEur)}{o.avgLatencyMs != null ? ` · ${(o.avgLatencyMs / 1000).toFixed(1)} s` : ""}{o.failures ? ` · ${o.failures} ${t("échecs", "failures")}` : ""}{o.avgScore != null ? ` · ${t("note", "score")} ${o.avgScore}` : ""}</span>
                  )) : <span className="text-muted">{t("aucun appel", "no calls")}</span>}
                </td>
                <td>
                  <Button size="sm" variant="ghost" onClick={() => post({ pinTask: { task: k.task, pinned: !k.pinned } })}>{k.pinned ? t("Maintenu en manuel", "Kept manual") : t("Suit le mode", "Follows mode")}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
