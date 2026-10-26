"use client";
/**
 * Administration › Thèmes et forfaits (mission #190) : grille thème × forfait. Les familles n'existent plus : chaque
 * forfait reçoit sa liste de thèmes. Tant qu'un forfait est « à choisir », tous les thèmes proposés lui restent ouverts
 * (aucune répartition n'est décidée à la place de Thomas).
 */
import { useEffect, useState } from "react";
import { api, Badge, Button, Card, useApi, useToast } from "./ui";
import { useLang, useT } from "./i18n";
import { PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";

type View = { rights: { plans: Partial<Record<PlanId, string[] | null>>; updatedAt?: number; updatedBy?: string }; undecided: PlanId[]; themes: { id: string; name: string }[]; withdrawn: string[] };

export function ThemeRightsAdmin() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, setData } = useApi<View>("/api/admin/theme-rights");
  const [draft, setDraft] = useState<Partial<Record<PlanId, string[] | null>>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setDraft(data.rights.plans); }, [data]);
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  const all = data.themes.map((x) => x.id);
  const listOf = (p: PlanId) => draft[p];
  const decided = (p: PlanId) => Array.isArray(listOf(p));
  const has = (p: PlanId, id: string) => (decided(p) ? listOf(p)!.includes(id) : true);
  const toggle = (p: PlanId, id: string) => {
    const cur = decided(p) ? listOf(p)! : all;
    setDraft({ ...draft, [p]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  const save = async () => {
    setBusy(true);
    try {
      const v = await api<View>("/api/admin/theme-rights", { method: "POST", body: { plans: Object.fromEntries(PLAN_IDS.map((p) => [p, draft[p] ?? null])) } });
      setData(v);
      toast("ok", t("Droits des thèmes enregistrés.", "Theme rights saved."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5" data-admin-theme-rights>
      <h2 className="font-display text-xl font-semibold">{t("Thèmes ouverts par forfait", "Themes open per plan")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-2">
        {t(
          "Plus de familles : chaque forfait reçoit sa propre liste de thèmes. Un forfait « à choisir » garde tous les thèmes du catalogue en attendant votre choix. Le thème déjà utilisé par un projet reste toujours utilisable par ce projet.",
          "No more families: each plan gets its own list of themes. A plan marked “to choose” keeps every catalogue theme until you decide. A theme already used by a project always stays usable for that project.",
        )}
      </p>
      {data.withdrawn.length > 0 && <p className="mt-2 text-sm text-muted">{t(`Retirés du catalogue (créés avant les maquettes, conservés pour les projets qui les utilisent) : ${data.withdrawn.join(", ")}.`, `Withdrawn from the catalogue (created before the mockups, kept for the projects using them): ${data.withdrawn.join(", ")}.`)}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-semibold">{t("Thème", "Theme")}</th>
              {PLAN_IDS.map((p) => (
                <th key={p} className="px-3 py-2 text-center font-semibold">
                  {PLANS[p].name[lang]} <span className="font-normal text-muted">({PLANS[p].price.month} €)</span>
                  <div className="mt-1">{decided(p) ? <Badge tone="ok">{t(`${listOf(p)!.length} choisi(s)`, `${listOf(p)!.length} chosen`)}</Badge> : <Badge tone="warn">{t("Répartition à choisir", "To choose")}</Badge>}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.themes.map((th) => (
              <tr key={th.id} className="border-t border-line">
                <td className="py-2 pr-3">{th.name}</td>
                {PLAN_IDS.map((p) => (
                  <td key={p} className="px-3 py-2 text-center">
                    <input type="checkbox" aria-label={`${th.name} — ${PLANS[p].name[lang]}`} checked={has(p, th.id)} onChange={() => toggle(p, th.id)} className={decided(p) ? "" : "opacity-60"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PLAN_IDS.map((p) => decided(p) && (
          <Button key={p} variant="ghost" size="sm" onClick={() => setDraft({ ...draft, [p]: null })}>{t(`Remettre ${PLANS[p].name.fr} « à choisir »`, `Reset ${PLANS[p].name.en} to “to choose”`)}</Button>
        ))}
        <Button onClick={save} loading={busy}>{t("Enregistrer", "Save")}</Button>
      </div>
      {data.rights.updatedAt && <p className="mt-2 text-xs text-muted">{t("Dernière modification : ", "Last change: ")}{new Date(data.rights.updatedAt).toLocaleString(lang === "en" ? "en-GB" : "fr-FR")}{data.rights.updatedBy ? ` — ${data.rights.updatedBy}` : ""}</p>}
    </Card>
  );
}
