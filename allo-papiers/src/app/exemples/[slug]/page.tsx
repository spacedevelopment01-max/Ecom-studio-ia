import { notFound } from "next/navigation";
import Link from "next/link";
import { AnalysisView } from "@/components/analysis-view";
import { EXAMPLES, getExample } from "@/lib/examples";

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ex = getExample((await params).slug);
  return { title: ex ? `Exemple fictif – ${ex.label}` : "Exemple" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const ex = getExample((await params).slug);
  if (!ex) notFound();
  return (
    <div className="container-page max-w-3xl py-8">
      <p className="eyebrow">Exemple fictif · aucun crédit utilisé</p>
      <h1 className="font-display mt-2 text-[2rem] font-semibold md:text-[2.5rem]">{ex.label}</h1>
      <p className="mt-2 text-muted">{ex.intro}</p>
      <details className="card mt-6 p-5" open>
        <summary className="cursor-pointer font-semibold">Le courrier (fictif)</summary>
        <div className="mt-3 rounded-xl border border-line bg-[#fffdf9] p-4 text-[0.98rem] leading-relaxed">
          {ex.letter.map((l, i) => <p key={i} className="mb-2">{l}</p>)}
        </div>
      </details>
      <h2 className="font-display mb-4 mt-10 text-2xl font-semibold">Ce qu'Allô Papiers en retient</h2>
      <AnalysisView analysis={ex.analysis} mode="exemple" />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/nouveau" className="btn btn-primary">Essayer avec mon document</Link>
        <Link href="/" className="btn btn-outline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
