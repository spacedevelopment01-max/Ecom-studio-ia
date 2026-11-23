"use client";
/**
 * Le carnet des juges : chaque image relue par SINA (gardée ou refusée, et pourquoi), avec oui ou non du propriétaire ;
 * l'accord entre le relecteur et lui se mesure ici.
 */
import { useState } from "react";
import { api, Badge, Button, Card, useApi, useToast } from "./ui";
import { useT } from "./i18n";

type Image = { assetId: string; travail: string; garde: boolean; raison: string; proprietaire: "oui" | "non" | null; at: number };
type Accord = { jugees: number; accords: number; part: number | null; mesure: boolean; laissePasser: number; tropSevere: number; parTravail: { travail: string; jugees: number; part: number | null }[] };

export function JugesAdmin() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ images: Image[]; accord: Accord }>("/api/admin/verdicts");
  const [busy, setBusy] = useState<string | null>(null);
  const juger = async (assetId: string, verdict: "oui" | "non") => {
    setBusy(assetId);
    try { await api("/api/admin/verdicts", { body: { assetId, verdict } }); reload(); } catch (e) { toast("bad", (e as Error).message); } finally { setBusy(null); }
  };
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  const a = data.accord, pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)} %`);
  return (
    <>
      <Card className="p-5">
        <p className="font-display text-lg font-semibold">{t("Le relecteur et toi", "The reviewer and you")}</p>
        <p className="mt-1 text-sm text-ink-2">{a.mesure
          ? t(`Sur ${a.jugees} images que tu as jugées, le relecteur a dit comme toi ${pct(a.part)} du temps. Il a laissé passer ${a.laissePasser} image(s) que tu refuses, et refusé ${a.tropSevere} image(s) que tu aimes.`, `Over ${a.jugees} images you judged, the reviewer agreed with you ${pct(a.part)} of the time.`)
          : t(`Accord pas encore mesuré : ${a.jugees} image(s) jugée(s) sur les 20 qu'il faut au moins. Dis oui si l'image est au niveau d'une campagne haut de gamme, non sinon.`, `Agreement not measured yet: ${a.jugees} of at least 20 images judged.`)}</p>
        {a.parTravail.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{a.parTravail.map((x) => <Badge key={x.travail}>{x.travail} : {pct(x.part)} ({x.jugees})</Badge>)}</div>}
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.images.length === 0 && <Card className="p-5 text-sm text-muted">{t("Aucune image relue pour l'instant.", "No reviewed image yet.")}</Card>}
        {data.images.map((im) => (
          <Card key={im.assetId} className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/verdicts/${im.assetId}`} alt={im.travail} className="aspect-square w-full bg-paper-2 object-contain" loading="lazy" />
            <div className="space-y-2 p-4 text-sm">
              <p className="font-medium">{im.travail}</p>
              <p>{im.garde ? <Badge tone="ok">{t("Gardée par le relecteur", "Kept by the reviewer")}</Badge> : <Badge tone="bad">{t("Refusée par le relecteur", "Refused by the reviewer")}</Badge>}</p>
              {im.raison && <p className="text-xs text-ink-2">{im.raison}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant={im.proprietaire === "oui" ? "primary" : "ghost"} disabled={busy === im.assetId} onClick={() => juger(im.assetId, "oui")}>{t("Oui", "Yes")}</Button>
                <Button size="sm" variant={im.proprietaire === "non" ? "primary" : "ghost"} disabled={busy === im.assetId} onClick={() => juger(im.assetId, "non")}>{t("Non", "No")}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
