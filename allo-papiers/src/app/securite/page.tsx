import Link from "next/link";
import { AlertTriangle, ArrowDown, Cpu, Fingerprint, Lightbulb, Lock, Server, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/ui";
import { NON_PROMESSES, QUESTIONS, REFLEXES } from "@/content/securite";

export const metadata = {
  title: "Sécurité de vos documents",
  description: "Où vont vos papiers, qui peut les lire, comment les effacer : la sécurité d'Allô Papiers expliquée simplement, limites comprises.",
};

const TRAJET = [
  {
    icon: Smartphone,
    t: "Votre téléphone",
    d: "Vous prenez la photo. Elle part par une connexion chiffrée (HTTPS).",
  },
  {
    icon: Server,
    t: "Notre serveur",
    d: "Il vérifie que c'est bien vous, puis chiffre le fichier (AES-256) avant de l'enregistrer.",
  },
  {
    icon: Lock,
    t: "Votre coffre, en Europe",
    d: "Espace privé chez un hébergeur à Paris, sans adresse publique. Les pièces sensibles s'ouvrent avec votre empreinte ou un code.",
  },
  {
    icon: Cpu,
    t: "L'analyse par l'IA, avec votre accord",
    d: "Le document est lisible le temps du traitement, hors Union européenne. Il ne sert pas à entraîner l'IA et il est supprimé chez le fournisseur sous 30 jours, selon ses conditions.",
    warn: true,
  },
];

export default function Page() {
  return (
    <div className="container-page max-w-4xl pb-12">
      <PageTitle eyebrow="Sécurité" title="Vos papiers, en sécurité. Et vous savez comment.">
        Une fiche de paie, un avis d'imposition ou une pièce d'identité en disent beaucoup sur vous. Avant de les confier à un service d'IA, vous avez le droit de savoir exactement où ils vont. Voici nos réponses, sans jargon, limites comprises.
      </PageTitle>

      {/* Le trajet d'un document */}
      <section className="card neon p-5 sm:p-7" aria-labelledby="titre-trajet">
        <h2 id="titre-trajet" className="flex items-center gap-2.5 text-xl font-semibold"><ShieldCheck className="h-6 w-6 text-orange" aria-hidden /> Le trajet de votre document</h2>
        <ol className="mt-5 grid gap-1">
          {TRAJET.map((x, i) => (
            <li key={x.t} className="reveal" style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
              <div className={`flex gap-4 rounded-2xl p-4 ${x.warn ? "bg-warn-soft/70" : "bg-sand/60"}`}>
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${x.warn ? "bg-white text-warn" : "bg-navy text-[#fdba74]"}`}><x.icon className="h-6 w-6" aria-hidden /></span>
                <div>
                  <p className="font-semibold text-navy">{i + 1}. {x.t}</p>
                  <p className="mt-0.5 text-ink/85">{x.d}</p>
                </div>
              </div>
              {i < TRAJET.length - 1 && <ArrowDown className="mx-auto my-1 h-5 w-5 text-orange" aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.97rem] text-muted">
          Vous pouvez aussi ranger un justificatif dans votre coffre sans le faire lire par l'IA, en choisissant vous-même son type.
        </p>
      </section>

      {/* Questions / réponses */}
      <section className="mt-10" aria-labelledby="titre-questions">
        <h2 id="titre-questions" className="font-display text-[1.8rem] font-semibold">Les questions à poser à n'importe quel service d'IA</h2>
        <div className="mt-4 grid gap-3">
          {QUESTIONS.map((x) => (
            <div key={x.q} className="card reveal p-5">
              <h3 className="text-[1.12rem] font-semibold text-navy">{x.q}</h3>
              <p className={`mt-1 font-semibold ${x.limite ? "text-warn" : "text-ok"}`}>{x.a}</p>
              <p className="mt-2 text-ink/85">{x.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bons réflexes */}
      <section className="card mt-10 bg-navy p-6 text-white sm:p-8" aria-labelledby="titre-reflexes">
        <h2 id="titre-reflexes" className="flex items-center gap-2.5 text-xl font-semibold"><Lightbulb className="h-6 w-6 text-[#fdba74]" aria-hidden /> Les bons réflexes, ici comme ailleurs</h2>
        <ul className="mt-4 grid gap-3">
          {REFLEXES.map((r) => (
            <li key={r} className="flex gap-3 text-white/85"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#fdba74]" aria-hidden />{r}</li>
          ))}
        </ul>
      </section>

      {/* Ce que nous ne promettons pas */}
      <section className="card mt-6 p-6 sm:p-7" aria-labelledby="titre-limites">
        <h2 id="titre-limites" className="flex items-center gap-2.5 text-xl font-semibold"><AlertTriangle className="h-6 w-6 text-warn" aria-hidden /> Ce que nous ne promettons pas</h2>
        <ul className="mt-4 grid gap-2.5">
          {NON_PROMESSES.map((r) => (
            <li key={r} className="flex gap-3 text-ink/85"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-warn" aria-hidden />{r}</li>
          ))}
        </ul>
      </section>

      {/* Vous gardez la main */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/compte/securite" className="card group flex gap-4 p-5 transition hover:border-orange/50">
          <Fingerprint className="h-7 w-7 shrink-0 text-orange" aria-hidden />
          <span><span className="block font-semibold">Gérer mes accès</span><span className="text-muted">Empreinte ou visage, appareils connectés, journal des accès (sans le contenu de vos documents).</span></span>
        </Link>
        <Link href="/compte" className="card group flex gap-4 p-5 transition hover:border-orange/50">
          <Trash2 className="h-7 w-7 shrink-0 text-orange" aria-hidden />
          <span><span className="block font-semibold">Effacer ou télécharger mes données</span><span className="text-muted">Durée de conservation, export, suppression du compte.</span></span>
        </Link>
      </section>
      <p className="mt-8 text-muted">
        Le détail juridique (responsable, sous-traitants, durées, vos droits) se trouve dans la{" "}
        <Link href="/confidentialite" className="font-semibold text-orange underline">politique de confidentialité</Link>.
      </p>
    </div>
  );
}
