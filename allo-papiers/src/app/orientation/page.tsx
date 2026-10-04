import { OrientationPanel } from "@/components/orientation";
import { PageTitle, ProNotice } from "@/components/ui";

export const metadata = { title: "Trouver France Services ou un organisme" };

export default function Page() {
  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Orientation" title="Trouver une aide près de chez vous">
        Les espaces France Services accompagnent gratuitement dans les démarches administratives. Les coordonnées affichées proviennent de l'annuaire officiel de l'administration, avec leur source et leur date de mise à jour.
      </PageTitle>
      <div className="card p-5 sm:p-7">
        <OrientationPanel />
      </div>
      <ProNotice className="mt-8" />
    </div>
  );
}
