"use client";
import { Sparkles } from "lucide-react";
import { Card } from "../ui";
import { NewProject } from "./home";
import { useProject } from "./project-context";
import { useT } from "../i18n";

/** Projet créé sans entrée produit : on démarre la création quand le client est prêt. */
export function StartCreation() {
  const { id, data, reload } = useProject();
  const t = useT();
  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-soft text-signal"><Sparkles className="size-5" /></span>
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("Démarrer la création", "Start creating")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("Une boutique : ajoutez une photo, un lien de fiche produit ou quelques lignes. Un site de services : décrivez votre activité. Le studio enchaîne ensuite marque, site, images, vidéos et calendrier. Vous pouvez aussi explorer les onglets avant.", "A store: add a photo, a product page link or a few lines. A services website: describe your business. The studio then builds the brand, website, images, videos and calendar. You can also explore the tabs first.")}</p>
        </div>
      </div>
      <NewProject projectId={id} compact existingPhotos={data?.counts.original ?? 0} initialBusiness={data?.business} initialPlatform={data?.project.platform} initialServices={data?.services} onDone={() => reload()} key={data ? "ready" : "loading"} />
    </Card>
  );
}
