"use client";
import { Sparkles } from "lucide-react";
import { Card } from "../ui";
import { NewProject } from "./home";
import { useProject } from "./project-context";

/** Projet créé sans entrée produit : on démarre la création quand le client est prêt. */
export function StartCreation() {
  const { id, data, reload } = useProject();
  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-signal-soft text-signal"><Sparkles className="size-5" /></span>
        <div>
          <h2 className="font-display text-2xl font-semibold">Démarrer la création</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Ajoutez une photo, un lien de fiche produit ou quelques lignes : le studio analyse le produit puis enchaîne marque, boutique, images, vidéos et calendrier. Vous pouvez aussi explorer les onglets avant.</p>
        </div>
      </div>
      <NewProject projectId={id} compact existingPhotos={data?.counts.original ?? 0} onDone={() => reload()} />
    </Card>
  );
}
