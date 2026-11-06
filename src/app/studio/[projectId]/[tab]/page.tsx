import { notFound } from "next/navigation";
import { TabView } from "@/components/studio/tabs";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { synaAgentEnabled } from "@/lib/syna-agent/enabled";
import { journeyOfProject, underConstruction } from "@/lib/syna-agent/construction";
import { FIELD_LABEL, JOURNEY_STEPS, START_FIELDS, currentStep } from "@/lib/syna-agent/journey";
import { ChantierView, type ChantierData } from "@/components/studio/chantier-view";

const VALID = ["pilote", "produit", "marque", "strategie", "boutique", "catalogue", "biens", "carte", "realisations", "rendez-vous", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];

export default async function Page({ params }: { params: Promise<{ tab: string; projectId: string }> }) {
  const { tab, projectId } = await params;
  if (!VALID.includes(tab)) notFound();
  // Mode chantier (#492) : la page Pilote montre l'avancée du parcours SINA (étapes 0 à 13 et fiche de départ) au lieu
  // de l'ancien parcours, le temps de la construction.
  const user = await currentUser();
  if (tab === "pilote" && user && synaAgentEnabled() && one("SELECT 1 FROM projects WHERE id=? AND user_id=?", projectId, user.id) && underConstruction(projectId)) {
    const j = journeyOfProject(projectId)!;
    const data: ChantierData = {
      current: currentStep(j), mode: j.mode, keep: j.keep,
      steps: JOURNEY_STEPS.map((s) => ({ n: s.n, fr: s.fr, en: s.en, status: j.steps[s.n]?.status ?? "todo" })),
      fiche: START_FIELDS.filter((f) => j.start[f]).map((f) => ({ fr: FIELD_LABEL[f].fr, en: FIELD_LABEL[f].en, value: j.start[f]!.status === "answered" ? (f === "business" ? (j.start[f]!.value === "services" ? "Des services" : "Des produits") : j.start[f]!.value) : j.start[f]!.status === "later" ? "Plus tard" : "Rien de particulier", later: j.start[f]!.status === "later" })),
    };
    return <ChantierView data={data} />;
  }
  return <TabView tab={tab} />;
}
