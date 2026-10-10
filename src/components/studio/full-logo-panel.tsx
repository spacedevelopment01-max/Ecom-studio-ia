"use client";
/**
 * Logo complet dessiné par l'IA d'images : symbole, nom, activités (et slogan validé) dans une seule image, comme une
 * agence le livrerait ; chaque logo est relu par l'IA (nom exact, aucun texte inventé). Les essais refusés ne sont pas
 * montrés, seulement comptés.
 */
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { api, Badge, Button, Card, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";

type View = { logos: { id: string; url: string; concept: string; warning: string | null; score: number | null; verdict: string | null }[]; rejected: number; running: boolean; current: string | null };

export function FullLogoPanel({ onApplied }: { onApplied?: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, reload } = useApi<View>(`/api/projects/${id}/brand/full-logo`, { poll: 5000 });
  async function post(body: Record<string, unknown>, ok: string, key: string) {
    setBusy(key);
    try {
      await api(`/api/projects/${id}/brand/full-logo`, { body });
      toast("ok", ok);
      reload();
      if (body.action === "use") onApplied?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const create = () => {
    if (!window.confirm(t("Créer 3 logos complets avec l'IA d'images ? Chaque logo est une image payante (jusqu'à 6 images si des reprises sont nécessaires), décomptée de votre budget IA.", "Create 3 full logos with the image AI? Each logo is a paid image (up to 6 images if retries are needed), counted against your AI budget."))) return;
    post({ action: "create" }, t("Création lancée : quelques minutes.", "Creation started: a few minutes."), "gen");
  };
  const logos = data?.logos ?? [];
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title={t("Logo complet dessiné par l'IA", "Full logo drawn by AI")}
        action={
          <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={busy === "gen" || !!data?.running} disabled={!!data?.running} onClick={create}>
            {t("Créer 3 logos complets", "Create 3 full logos")}
          </Button>
        }
      >
        {t("Un logo d'agence en une seule image : monogramme ou symbole lié à votre métier, nom de la marque, activités (et votre slogan s'il est validé). Chaque logo est relu par l'IA : nom exact, aucun mot inventé. C'est une image (PNG), pas un fichier vectoriel.", "An agency-style logo in a single image: monogram or symbol tied to your trade, brand name, activities (and your slogan if validated). Each logo is reviewed by AI: exact name, no invented words. It is an image (PNG), not a vector file.")}
      </SectionTitle>
      {data?.running && <p className="mb-3 text-sm text-ink-2">{t("Création en cours…", "Creating…")}</p>}
      {!!logos.length && (
        <div className="grid gap-4 sm:grid-cols-3">
          {logos.map((l) => (
            <div key={l.id} className="rounded-xl border border-line p-3">
              <img src={l.url} alt={l.concept || t("Logo complet", "Full logo")} className="mb-2 aspect-square w-full rounded-lg bg-[#F4F3EF] object-contain p-3" />
              <div className="mb-2 flex flex-wrap gap-2">
                {l.verdict === "FINAL" && l.score != null && <Badge tone="good">{t(`Validé ${l.score}/10`, `Approved ${l.score}/10`)}</Badge>}
                {l.warning && <Badge tone="warn">{t("À vérifier", "To check")}</Badge>}
                {data?.current === l.id && <Badge tone="info">{t("Appliqué", "Applied")}</Badge>}
              </div>
              {l.concept && <p className="text-sm">{l.concept}</p>}
              {l.warning && <p className="mt-1 text-xs text-warn">{l.warning}</p>}
              <Button className="mt-3" size="sm" icon={<Check className="size-4" />} loading={busy === l.id} disabled={data?.current === l.id} onClick={() => post({ action: "use", assetId: l.id }, t("Logo appliqué à la marque.", "Logo applied to the brand."), l.id)}>
                {t("Utiliser ce logo", "Use this logo")}
              </Button>
            </div>
          ))}
        </div>
      )}
      {!!data?.rejected && <p className="mt-3 text-xs text-muted">{t(`${data.rejected} essai(s) refusé(s) par le contrôle (non proposés).`, `${data.rejected} attempt(s) rejected by the check (not offered).`)}</p>}
    </Card>
  );
}
