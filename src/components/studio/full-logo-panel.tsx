"use client";
/**
 * Logos complets créés par l'ancien générateur (avant le Logo V2 « logo complet ») : toujours consultables et
 * utilisables. Les nouveaux logos complets se créent dans le panneau Logo (styles, original conservé, contrôle adapté).
 */
import { useState } from "react";
import { Check } from "lucide-react";
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
  const logos = data?.logos ?? [];
  if (!logos.length) return null;
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle title={t("Logos complets déjà créés", "Full logos already created")}>
        {t("Créés par l'ancien générateur : vous pouvez toujours en utiliser un. Les nouveaux logos complets se créent dans le panneau Logo ci-dessus.", "Created by the previous generator: you can still use one. New full logos are created in the Logo panel above.")}
      </SectionTitle>
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
