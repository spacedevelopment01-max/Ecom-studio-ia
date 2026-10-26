"use client";
import { useState } from "react";
import { api, Button, Card, Input, useApi, useToast } from "./ui";
import { useT } from "./i18n";
import type { Proposal, Approval } from "@/lib/ai/higgsfield/pricing";
import type { HiggsModel } from "@/lib/ai/higgsfield/catalog";
type Data = {
  configured: boolean;
  disabled: boolean;
  accountAccess: string;
  keyMasked: string;
  secretPresent: boolean;
  models: HiggsModel[];
  proposal: Proposal | null;
  approved: Approval | null;
  readiness: string;
};
export function HiggsfieldAdmin({ onSaved }: { onSaved?: () => void } = {}) {
  const t = useT(),
    toast = useToast();
  const { data, reload } = useApi<Data>("/api/admin/higgsfield");
  const [busy, setBusy] = useState(false),
    [id, setId] = useState(""),
    [secret, setSecret] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [filter, setFilter] = useState(""),
    [overrides, setOverrides] = useState<
      Record<string, { usd: string; reason: string }>
    >({});
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api("/api/admin/higgsfield", { body });
      setSecret("");
      setId("");
      reload();
      onSaved?.();
      toast("ok", t("Enregistré.", "Saved."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <p>{t("Chargement Higgsfield…", "Loading Higgsfield…")}</p>;
  const p = data.proposal,
    rows =
      p?.rows.filter(
        (r) =>
          !filter ||
          `${r.configuration.model} ${r.configuration.resolution} ${r.status} ${r.configuration.seconds}s`
            .toLowerCase()
            .includes(filter.toLowerCase()),
      ) ?? [];
  return (
    <Card
      className="grid grid-cols-1 min-w-0 gap-4 overflow-hidden break-words p-5 [overflow-wrap:anywhere]"
      data-testid="higgsfield-admin"
    >
      <div>
        <h2 className="font-display text-xl font-semibold">
          Higgsfield · {t("tarifs automatiques", "automatic pricing")}
        </h2>
        <p>
          {data.disabled
            ? t("Désactivé", "Disabled")
            : t(
                "Activé pour les modèles approuvés",
                "Enabled for approved models",
              )}{" "}
          ·{" "}
          {data.configured
            ? t(
                "Identifiant et secret chiffrés présents",
                "Encrypted key ID and secret present",
              )
            : t("Identifiant et secret absents", "Key ID and secret missing")}
        </p>
        <p className="text-sm text-ink-2">
          {t(
            "Documentation consultée ; accès aux générations du compte et qualité vidéo non testés. Aucun essai payant lors de la récupération des tarifs.",
            "Documentation reviewed; account generation access and video quality untested. Price retrieval does not generate paid videos.",
          )}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          aria-label={t("Identifiant Higgsfield", "Higgsfield key ID")}
          type="password"
          autoComplete="off"
          value={id}
          placeholder={data.keyMasked || t("Identifiant API", "API key ID")}
          onChange={(e) => setId(e.target.value)}
        />
        <Input
          aria-label={t("Secret Higgsfield", "Higgsfield secret")}
          type="password"
          autoComplete="new-password"
          value={secret}
          placeholder={
            data.secretPresent ? "••••••••" : t("Secret API", "API secret")
          }
          onChange={(e) => setSecret(e.target.value)}
        />
        <Button
          loading={busy}
          disabled={!id.trim() || !secret.trim()}
          onClick={() =>
            act({ action: "credentials", keyId: id, keySecret: secret })
          }
        >
          {t("Enregistrer les deux secrets", "Save both credentials")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={busy} onClick={() => act({ action: "refresh" })}>
          {t("Récupérer / actualiser les tarifs", "Retrieve / refresh prices")}
        </Button>
        <Button variant="ghost" onClick={() => act({ action: "disable" })}>
          {t("Désactiver Higgsfield", "Disable Higgsfield")}
        </Button>
      </div>
      <p className="text-sm">
        {t(
          "Source : estimation officielle du compte, configuration par configuration. Prix publics « à partir de », promotions maximales et cashback exclus. Chaque lancement est réestimé ; une hausse exige votre nouvelle confirmation.",
          "Source: official account estimate for each configuration. Public starting prices, maximum discounts and cashback excluded. Every launch is re-estimated; an increase requires new approval.",
        )}
      </p>
      {data.approved && (
        <p>
          {t("Version approuvée", "Approved revision")} : {data.approved.id} ·{" "}
          {new Date(data.approved.at).toLocaleString()} ·{" "}
          {data.approved.models.length} {t("modèles", "models")}
        </p>
      )}
      {p && (
        <>
          <p>
            {t("Proposition", "Proposal")} {p.id} ·{" "}
            {new Date(p.at).toLocaleString()} ·{" "}
            {p.rows.filter((r) => r.status === "account_estimate").length}/
            {p.rows.length} {t("tarifs acquis", "retrieved prices")}
          </p>
          <p>
            {p.fx
              ? `USD → EUR : ${p.fx.usdToEur.toFixed(6)} · ${p.fx.date} · ${p.fx.source}`
              : t(
                  "Conversion ECB indisponible : activation bloquée.",
                  "ECB conversion unavailable: activation blocked.",
                )}
          </p>
          {p.warnings.map((w) => (
            <p key={w} className="text-bad">
              {w}
            </p>
          ))}
          <fieldset className="grid gap-2">
            <legend>
              {t(
                "Modèles à confirmer en une fois",
                "Models to approve together",
              )}
            </legend>
            {data.models.map((m) => {
              const complete = p.rows
                .filter((r) => r.configuration.model === m.id)
                .every((r) => r.status === "account_estimate");
              return (
                <label key={m.id} className="block leading-relaxed">
                  <input
                    className="mr-2"
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    disabled={!complete}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, m.id]
                          : s.filter((x) => x !== m.id),
                      )
                    }
                  />
                  {m.label} ·{" "}
                  {complete
                    ? t("tarifs complets", "complete prices")
                    : t(
                        "prix manquants : bloqué",
                        "missing prices: blocked",
                      )}{" "}
                  ·{" "}
                  <a
                    className="underline"
                    href={m.docs}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Schéma officiel", "Official schema")}
                  </a>
                </label>
              );
            })}
          </fieldset>
          <Input
            aria-label={t("Filtrer les tarifs", "Filter prices")}
            placeholder={t(
              "Filtrer modèle, résolution, durée…",
              "Filter model, resolution, duration…",
            )}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="max-h-[32rem] min-w-0 w-full max-w-full overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  {[
                    "Configuration",
                    "USD",
                    "Ancien / Previous",
                    "EUR",
                    "Source / date",
                    "État / Status",
                  ].map((h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b">
                    <td className="p-2">
                      {r.configuration.model}
                      <br />
                      {
                        data.models.find((m) => m.id === r.configuration.model)
                          ?.mode
                      }{" "}
                      · {r.configuration.resolution} · {r.configuration.seconds}{" "}
                      s · {r.configuration.aspect} · {t("son", "sound")}{" "}
                      {r.configuration.audio ? "on" : "off"}
                      <details>
                        <summary>
                          {t(
                            "Surcharge manuelle facultative",
                            "Optional manual override",
                          )}
                        </summary>
                        <Input
                          aria-label={`USD ${r.key}`}
                          type="number"
                          min="0.000001"
                          step="any"
                          value={overrides[r.key]?.usd ?? r.overrideUsd ?? ""}
                          onChange={(e) =>
                            setOverrides((o) => ({
                              ...o,
                              [r.key]: {
                                usd: e.target.value,
                                reason:
                                  o[r.key]?.reason ?? r.overrideReason ?? "",
                              },
                            }))
                          }
                        />
                        <Input
                          aria-label={`Motif ${r.key}`}
                          placeholder={t(
                            "Motif obligatoire",
                            "Required reason",
                          )}
                          value={
                            overrides[r.key]?.reason ?? r.overrideReason ?? ""
                          }
                          onChange={(e) =>
                            setOverrides((o) => ({
                              ...o,
                              [r.key]: {
                                usd:
                                  o[r.key]?.usd ?? String(r.overrideUsd ?? ""),
                                reason: e.target.value,
                              },
                            }))
                          }
                        />
                      </details>
                    </td>
                    <td>
                      {r.usd ?? "—"} USD / {t("requête", "request")}
                      {r.overrideUsd ? ` → ${r.overrideUsd}` : ""}
                    </td>
                    <td>
                      {r.oldUsd ?? "—"}
                      {r.usd && r.oldUsd && r.usd !== r.oldUsd
                        ? ` (${((r.usd / r.oldUsd - 1) * 100).toFixed(1)} %)`
                        : ""}
                    </td>
                    <td>
                      {r.usd && p.fx ? (r.usd * p.fx.usdToEur).toFixed(4) : "—"}
                    </td>
                    <td>
                      <a className="underline" href={r.source}>
                        {t("Estimation officielle", "Official estimate")}
                      </a>
                      <br />
                      {new Date(r.retrievedAt).toLocaleString()}
                    </td>
                    <td>
                      {r.problem ??
                        t("Estimation du compte", "Account estimate")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            {t(
              "Ces montants couvrent un plan brut. Une publicité assemblée additionne les plans, la voix et les autres étapes affichées dans le devis du studio ; le coût du montage dépend de son parcours. Les estimations ne sont pas des factures.",
              "These amounts cover one raw shot. An assembled ad adds shots, voice and other stages shown in the studio quote; montage cost depends on its workflow. Estimates are not invoices.",
            )}
          </p>
          {p.discovered.filter((id) => !data.models.some((m) => m.id === id))
            .length > 0 && (
            <details>
              <summary>
                {t(
                  "Modèles découverts sans adaptateur validé (désactivés)",
                  "Discovered models without a validated adapter (disabled)",
                )}
              </summary>
              <p>
                {p.discovered
                  .filter((id) => !data.models.some((m) => m.id === id))
                  .join(", ")}
              </p>
            </details>
          )}
          <Button
            loading={busy}
            disabled={!selected.length || !p.fx}
            style={{
              whiteSpace: "normal",
              height: "auto",
              minHeight: 40,
              padding: "10px 16px",
            }}
            onClick={() =>
              act({
                action: "approve",
                proposal: p.id,
                models: selected,
                overrides: Object.entries(overrides)
                  .filter(([, v]) => v.usd)
                  .map(([key, v]) => ({
                    key,
                    usd: Number(v.usd),
                    reason: v.reason,
                  })),
              })
            }
          >
            {t(
              "Confirmer les tarifs et activer les modèles sélectionnés",
              "Confirm prices and activate selected models",
            )}
          </Button>
        </>
      )}
    </Card>
  );
}
