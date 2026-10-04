import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { QUESTIONS } from "@/content/securite";

/**
 * Bloc d'accueil « sécurité d'abord » : les questions à poser avant de confier un papier à une IA,
 * avec nos réponses (y compris la limite : l'IA lit le document le temps de l'analyse).
 */
export function SecurityQuestions() {
  return (
    <section id="securite" className="relative overflow-hidden border-y border-line bg-[linear-gradient(180deg,#fff,rgba(239,233,222,0.55))] py-16 md:py-20" aria-labelledby="titre-securite">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(15,30,54,0.10),transparent_65%)]" aria-hidden />
      <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-14">
        <div className="reveal lg:sticky lg:top-28 lg:self-start">
          <p className="inline-flex items-center gap-2 rounded-full bg-navy px-3.5 py-1.5 text-[0.9rem] font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-[#fdba74]" aria-hidden /> La sécurité d'abord
          </p>
          <h2 id="titre-securite" className="font-display mt-4 text-[2.1rem] font-semibold leading-tight md:text-[2.7rem]">
            Avant de confier vos papiers à une IA, posez-vous ces questions.
          </h2>
          <p className="mt-4 text-[1.08rem] text-muted">
            Avis d'imposition, fiche de paie, pièce d'identité&nbsp;: ce sont parmi les documents les plus sensibles que vous possédez. Beaucoup de personnes les déposent dans une application d'IA sans savoir où ils partent, qui peut les lire, ni s'ils serviront à entraîner l'IA.
          </p>
          <p className="mt-3 text-[1.08rem] font-semibold text-navy">Ici, chaque réponse est écrite. Y compris ce que nous ne pouvons pas promettre.</p>
          <Link href="/securite" className="btn btn-navy mt-6">
            <Lock className="h-5 w-5" aria-hidden /> Tout savoir sur la sécurité <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        <ul className="grid gap-3">
          {QUESTIONS.map((x, i) => (
            <li key={x.q} className="reveal" style={{ ["--reveal-delay" as string]: `${(i % 4) * 70}ms` }}>
              <details className={`card group p-0 ${i === 0 ? "neon" : ""}`} open={i === 0}>
                <summary className="flex min-h-16 cursor-pointer items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy font-display text-[1.05rem] font-semibold text-white" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[1.12rem] font-semibold text-navy">{x.q}</span>
                    <span className={`mt-0.5 block font-semibold ${x.limite ? "text-warn" : "text-ok"}`}>{x.a}</span>
                  </span>
                  <span className="mt-1 text-2xl leading-none text-orange transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="px-5 pb-5 pl-[4.25rem] text-ink/85">{x.detail}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
