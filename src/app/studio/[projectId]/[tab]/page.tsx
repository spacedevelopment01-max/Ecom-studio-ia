import { notFound } from "next/navigation";
import { TabView } from "@/components/studio/tabs";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { cielDuProjet } from "@/lib/ciel/ciel-projet";
import { CielProjet } from "@/components/studio/ciel/ciel-projet";

const VALID = ["pilote", "produit", "marque", "strategie", "boutique", "catalogue", "biens", "carte", "realisations", "rendez-vous", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];

export default async function Page({ params }: { params: Promise<{ tab: string; projectId: string }> }) {
  const { tab, projectId } = await params;
  if (!VALID.includes(tab)) notFound();
  // L'accueil d'un projet est sa constellation : sa porte d'entrée et son tableau de bord (ses neuf étapes avec SINA et
  // ce qui existe déjà), relue en direct.
  if (tab === "pilote") {
    const user = await currentUser();
    const ciel = user && one("SELECT 1 FROM projects WHERE id=? AND user_id=?", projectId, user.id) ? cielDuProjet(projectId, user.id) : null;
    if (!ciel) notFound();
    return <CielProjet ciel={ciel} projectId={projectId} />;
  }
  return <TabView tab={tab} />;
}
