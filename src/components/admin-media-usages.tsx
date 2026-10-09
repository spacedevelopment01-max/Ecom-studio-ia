"use client";
/**
 * Administration › Images & Vidéos › Réglages par usage : pour chaque usage (logos, images produit, retouches
 * produit, publicités, décors et ambiances, vidéos produit, vidéos UGC), un principal, un secours et un mode
 * choisis indépendamment. Sans choix propre, l'usage suit le réglage général de son type.
 */
import { Badge, Button, Card, cx, Field, Select } from "./ui";
import { useT } from "./i18n";

export type MediaUsageData = {
  usage: string;
  kind: "image" | "video";
  label: string;
  detail: string;
  mode: "manual" | "auto";
  modeInherited: boolean;
  primary: string;
  primaryInherited: boolean;
  primaryProblem: string | null;
  backup: string | null;
  backupInherited: boolean;
  off: boolean;
  canBeOff: boolean;
  current: { key: string; role: "primary" | "backup" | "auto" } | null;
  explicit: boolean;
  options: { key: string; label: string; incompatible: string | null; canBePrimary: boolean; canBeBackup: boolean }[];
}[];

type Post = (b: Record<string, unknown>, msg?: string) => Promise<void>;

const INHERIT = "__inherit__";
const NONE = "__none__";

export function MediaUsagesPanel({ data, post }: { data: MediaUsageData; post: Post }) {
  const t = useT();
  const label = (u: MediaUsageData[number], key: string | null) => (key ? u.options.find((o) => o.key === key)?.label ?? key : t("aucun", "none"));
  const send = (usage: string, b: Record<string, unknown>, msg: string) => post({ mediaUsage: { usage, ...b } }, msg);
  return (
    <Card className="grid gap-4 p-5">
      <div>
        <p className="font-display text-lg font-semibold">{t("Réglages par usage", "Settings per usage")}</p>
        <p className="text-sm text-ink-2">
          {t(
            "Chaque usage a son propre modèle principal, son secours et son mode. Tant qu'un réglage n'est pas choisi ici, l'usage suit le réglage général de son type (tableaux ci-dessous). Seuls les modèles confirmés, tarifés et capables de l'usage peuvent être choisis.",
            "Each usage has its own primary model, backup and mode. Until a setting is chosen here, the usage follows the general setting of its type (tables below). Only confirmed, priced models able to serve the usage can be chosen.",
          )}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {data.map((u) => {
          const own = !u.primaryInherited || !u.backupInherited || !u.modeInherited || u.off;
          return (
            <section key={u.usage} aria-labelledby={`usage-${u.usage}`} className="grid gap-3 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id={`usage-${u.usage}`} className="font-semibold">
                    {u.label} <span className="text-xs font-normal text-muted">· {u.kind === "image" ? t("image", "image") : t("vidéo", "video")}</span>
                  </h3>
                  <p className="text-xs text-muted">{u.detail}</p>
                </div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={t(`Mode : ${u.label}`, `Mode: ${u.label}`)}>
                  {(["manual", "auto"] as const).map((m) => (
                    <button key={m} role="radio" aria-checked={u.mode === m} onClick={() => u.mode !== m && send(u.usage, { mode: m }, m === "auto" ? t(`${u.label} : mode automatique.`, `${u.label}: automatic mode.`) : t(`${u.label} : mode manuel.`, `${u.label}: manual mode.`))} className={cx("min-h-11 rounded-full border px-4 text-sm", u.mode === m ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                      {m === "manual" ? t("Manuel", "Manual") : t("Automatique", "Automatic")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("Principal", "Primary")} htmlFor={`p-${u.usage}`} hint={u.primaryInherited ? t("suit le réglage général", "follows the general setting") : undefined}>
                  <Select id={`p-${u.usage}`} value={u.primaryInherited ? INHERIT : u.primary} onChange={(e) => send(u.usage, { primary: e.target.value === INHERIT ? null : e.target.value }, t(`${u.label} : principal enregistré.`, `${u.label}: primary saved.`))}>
                    <option value={INHERIT}>{t("Réglage général", "General setting")}{u.primaryInherited ? ` (${label(u, u.primary)})` : ""}</option>
                    {u.options.map((o) => (
                      <option key={o.key} value={o.key} disabled={!o.canBePrimary || !!o.incompatible}>
                        {o.label}{o.incompatible ? ` — ${o.incompatible}` : !o.canBePrimary ? ` — ${t("à confirmer / tarif à saisir", "to confirm / price to enter")}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("Secours", "Backup")} htmlFor={`b-${u.usage}`} hint={u.backupInherited ? t("suit le réglage général", "follows the general setting") : undefined}>
                  <Select id={`b-${u.usage}`} value={u.backupInherited ? INHERIT : u.backup ?? NONE} onChange={(e) => send(u.usage, e.target.value === INHERIT ? { inheritBackup: true } : { backup: e.target.value === NONE ? null : e.target.value }, t(`${u.label} : secours enregistré.`, `${u.label}: backup saved.`))}>
                    <option value={INHERIT}>{t("Réglage général", "General setting")}{u.backupInherited ? ` (${label(u, u.backup)})` : ""}</option>
                    <option value={NONE}>{t("Aucun secours", "No backup")}</option>
                    {u.options.filter((o) => o.key !== u.primary).map((o) => (
                      <option key={o.key} value={o.key} disabled={!o.canBeBackup || !!o.incompatible}>
                        {o.label}{o.incompatible ? ` — ${o.incompatible}` : !o.canBeBackup ? ` — ${t("non utilisable", "not usable")}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {u.canBeOff && (
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={u.off} onChange={(e) => send(u.usage, { off: e.target.checked }, e.target.checked ? t("Retouche par masque coupée : décor généré + produit composé.", "Mask retouching off: generated set + composited product.") : t("Retouche par masque rétablie.", "Mask retouching restored."))} />
                  {t("Ne pas retoucher par masque (les photos produit passent par « Images produit » : décor généré + produit composé)", "Don't use mask retouching (product photos go through \"Product images\": generated set + composited product)")}
                </label>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {t("Appelé maintenant", "Called now")} :{" "}
                  {u.off ? <Badge>{t("coupé", "off")}</Badge> : u.current ? (
                    <>
                      <span className="font-mono">{u.current.key}</span>{" "}
                      <Badge tone="ok" dot>{u.current.role === "primary" ? t("principal", "primary") : u.current.role === "backup" ? t("secours", "backup") : t("automatique", "automatic")}</Badge>
                    </>
                  ) : (
                    <Badge tone="warn">{u.explicit ? t("modèle choisi inutilisable (clé, tarif ou capacité) : génération bloquée, aucun autre modèle en silence", "chosen model unusable (key, price or capability): generation blocked, no other model silently") : t("aucun modèle du catalogue utilisable : repli historique du Router V2", "no usable catalog model: historical Router V2 fallback")}</Badge>
                  )}
                </span>
                {own && <Button size="sm" variant="ghost" onClick={() => send(u.usage, { reset: true }, t(`${u.label} : réglage général rétabli.`, `${u.label}: general setting restored.`))}>{t("Revenir au réglage général", "Back to general setting")}</Button>}
              </div>
              {u.primaryProblem && <p className="text-xs text-warn">{t("Le principal ne convient pas à cet usage", "The primary doesn't fit this usage")} : {u.primaryProblem}. {u.explicit ? t("Le secours prend le relais s'il convient ; sinon rien n'est généré.", "The backup takes over if it fits; otherwise nothing is generated.") : t("Le secours, puis le repli historique du Router V2, prennent le relais.", "The backup, then the historical Router V2 fallback, take over.")}</p>}
            </section>
          );
        })}
      </div>
    </Card>
  );
}
