import Link from "next/link";
import { DemoVideo } from "@/components/demo-video";
import { PageTitle, ProNotice } from "@/components/ui";

export const metadata = { title: "Démonstrations vidéo" };

const VIDEOS = [
  { id: "comprendre-un-courrier", title: "Comprendre un courrier", text: "Photo du courrier, analyse, date limite citée, rappels, étapes à cocher et brouillon de réponse." },
  { id: "rediger-un-courrier", title: "Rédiger un courrier", text: "Sans document : on cherche sa démarche, on répond à quelques questions, on relit, puis PDF." },
  { id: "suivre-ses-demarches", title: "Suivre ses démarches", text: "Un dossier par démarche : pièces à fournir, chronologie, « Mon problème est réglé », échéances." },
  { id: "coffre-fort-et-envoi", title: "Coffre-fort et recommandé", text: "Ouverture protégée du coffre, puis récapitulatif complet et validation explicite avant tout envoi." },
];

export default function Page() {
  return (
    <div className="container-page max-w-5xl pb-10">
      <PageTitle eyebrow="Démonstrations" title="Le site en fonctionnement, en vidéo">
        Ces vidéos ont été enregistrées sur Allô Papiers, sur un écran de téléphone, en <strong>mode démonstration</strong> : les documents et les résultats sont fictifs, et aucun courrier n'est réellement envoyé.
      </PageTitle>
      <div className="grid gap-10 sm:grid-cols-2">
        {VIDEOS.map((v, i) => (
          <article key={v.id} className="reveal grid content-start gap-4" style={{ ["--reveal-delay" as string]: `${(i % 2) * 90}ms` }}>
            <div className="mx-auto w-full max-w-[20rem]">
              <DemoVideo src={`/videos/${v.id}.mp4`} poster={`/videos/${v.id}.jpg`} title={`Vidéo : ${v.title}`} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">{v.title}</h2>
              <p className="mx-auto mt-1 max-w-sm text-muted">{v.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/nouveau" className="btn btn-primary">Essayer avec mon document</Link>
        <Link href="/#film" className="btn btn-outline">Revoir le film d'explication</Link>
      </div>
      <ProNotice className="mx-auto mt-10 max-w-3xl" />
    </div>
  );
}
