"use client";
/**
 * Logos complets dessinés par l'IA d'images (OpenAI de préférence) d'après le brief du directeur artistique :
 * création en tâche de fond, contrôle du nom, et « Utiliser ce logo » qui le met partout (site, favicon, charte).
 */
import { useState } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { api, Badge, Button, Card, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";

type FullLogo = { id: string; url: string; concept: string; warning: string | null; score: number | null };

export function FullLogoPanel({ onApplied }: { onApplied?: () => void }) {
  const { id, data } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: list, reload } = useApi<{ logos: FullLogo[]; running: boolean; current: string | null }>(`/api/projects/${id}/brand/full-logo`, { poll: 4000 });
  if (!data?.ai?.image) return null;
  const running = !!list?.running || busy === "create";
  async function create() {
    setBusy("create");
    try {
      await api(`/api/projects/${id}/brand/full-logo`, { body: { action: "create" } });
      toast("ok", t("Création des logos complets lancée : comptez une à deux minutes.", "Full logos are being created: allow one to two minutes."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function use(logo: FullLogo) {
    setBusy(logo.id);
    try {
      await api(`/api/projects/${id}/brand/full-logo`, { body: { action: "use", assetId: logo.id } });
      toast("ok", t("Logo appliqué partout : site, favicon et charte.", "Logo applied everywhere: site, favicon and brand guide."));
      reload();
      onApplied?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card className="p-5 sm:p-7">
      <SectionTitle
        title={t("Logo complet dessiné par l'IA", "Full logo drawn by AI")}
        action={<Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={running} onClick={create}>{list?.logos.length ? t("Deux autres logos", "Two more logos") : t("Créer deux logos complets", "Create two full logos")}</Button>}
      >
        {t("Le directeur artistique décrit votre entreprise en détail, l'IA d'images dessine le logo entier (symbole et nom), puis le nom est vérifié lettre par lettre. Fichier PNG haute définition.", "The art director describes your business in detail, the image AI draws the whole logo (symbol and name), then the name is checked letter by letter. High-resolution PNG file.")}
      </SectionTitle>
      {running && <p className="mb-3 text-sm text-ink-2" role="status">{t("Dessin en cours…", "Drawing…")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(list?.logos ?? []).map((l) => {
          const on = list?.current === l.id;
          return (
            <figure key={l.id} className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="grid aspect-[3/2] place-items-center bg-[repeating-conic-gradient(#f3f3f3_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-4">
                <img src={l.url} alt={t("Logo complet", "Full logo")} className="max-h-full max-w-full object-contain" />
              </div>
              <figcaption className="grid gap-2 p-3 text-xs">
                <span className="text-ink-2">{l.concept}</span>
                {l.warning && <span className="flex items-start gap-1.5 rounded-lg bg-warn-soft px-2 py-1.5 text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t("À vérifier : ", "To check: ")}{l.warning}</span>}
                <div className="flex items-center justify-between gap-2">
                  {l.score !== null && <Badge>{t(`Contrôle ${l.score}/10`, `Check ${l.score}/10`)}</Badge>}
                  <Button size="sm" variant={on ? "secondary" : "primary"} icon={on ? <Check className="size-4" /> : undefined} disabled={on || !!busy} loading={busy === l.id} onClick={() => use(l)}>{on ? t("Utilisé", "In use") : t("Utiliser ce logo", "Use this logo")}</Button>
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Card>
  );
}
