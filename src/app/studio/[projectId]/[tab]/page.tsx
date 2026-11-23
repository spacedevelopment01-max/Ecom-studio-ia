import { notFound } from "next/navigation";
import { TabView } from "@/components/studio/tabs";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { dashboardOf } from "@/lib/syna-agent/dashboard";
import { ProjectDashboard } from "@/components/studio/project-dashboard";
import { suiviDuProjet } from "@/lib/syna-agent/rendez-vous";

const VALID = ["pilote", "produit", "marque", "strategie", "boutique", "catalogue", "biens", "carte", "realisations", "rendez-vous", "atelier", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];

export default async function Page({ params }: { params: Promise<{ tab: string; projectId: string }> }) {
  const { tab, projectId } = await params;
  if (!VALID.includes(tab)) notFound();
  // L'accueil d'un projet est son tableau de bord : ses neuf étapes avec SINA et ce qui existe déjà, relu en direct.
  if (tab === "pilote") {
    const user = await currentUser();
    const data = user && one("SELECT 1 FROM projects WHERE id=? AND user_id=?", projectId, user.id) ? dashboardOf(projectId) : null;
    if (!data) notFound();
    // « Ta journée est prête » et « le point du mois » (engagements 6 et 1), allumés : lus par le code, sans IA.
    const suivi = data.building ? null : await suiviDuProjet(projectId);
    return <ProjectDashboard data={data} suivi={suivi} />;
  }
  return <TabView tab={tab} />;
}
