import Link from "next/link";
import { FAQ } from "@/content/legal";
import { PageTitle, ProNotice } from "@/components/ui";

export const metadata = { title: "Aide et questions fréquentes" };

export default function Page() {
  const cats = [...new Set(FAQ.map((f) => f.category))];
  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Aide" title="Questions fréquentes">
        Une question qui n'est pas ici&nbsp;? Écrivez-nous à <a className="font-semibold text-orange underline" href="mailto:contact@allopapiers.fr">contact@allopapiers.fr</a>.
      </PageTitle>
      <div className="card mb-8 p-5">
        <p className="font-semibold">Premiers pas sur téléphone</p>
        <ol className="mt-2 grid list-decimal gap-1.5 pl-6">
          <li>Appuyez sur <strong>Comprendre un document</strong>, puis connectez-vous avec votre email (lien reçu par email, sans mot de passe).</li>
          <li>Choisissez le type de document, puis <strong>Prendre une photo</strong> : posez la feuille à plat, bien éclairée, sans reflet.</li>
          <li>Ajoutez les autres pages du même courrier, vérifiez qu'elles sont lisibles, puis lancez l'analyse.</li>
          <li>Lisez le résultat, cochez les étapes, confirmez la date limite pour recevoir des rappels.</li>
        </ol>
        <Link href="/exemples/caf-justificatifs" className="mt-4 inline-block font-semibold text-orange underline">Voir un exemple de résultat</Link>
      </div>
      {cats.map((c) => (
        <section key={c} className="mt-8">
          <h2 className="text-xl font-semibold">{c}</h2>
          <div className="mt-3 grid gap-2">
            {FAQ.filter((f) => f.category === c).map((f) => (
              <details key={f.q} className="card group p-0">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold">
                  {f.q}
                  <span className="text-2xl text-orange transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="px-5 pb-5 text-ink/85">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <ProNotice className="mt-10" />
    </div>
  );
}
