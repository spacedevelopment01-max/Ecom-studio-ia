import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Camera,
  Check,
  ClipboardList,
  FileSearch,
  FolderOpen,
  GitCompare,
  HeartHandshake,
  Lock,
  MessagesSquare,
  PenLine,
  ShieldCheck,
  Stamp,
  UserRound,
} from "lucide-react";
import { ScrollStory } from "@/components/scroll-story";
import { ExplainerFilm } from "@/components/explainer-film";
import { ProNotice } from "@/components/ui";

const ORGANISMES = ["Impôts", "CAF", "CPAM", "Amendes", "Banque", "Assurance", "URSSAF", "Mairie", "Énergie"];

const PARCOURS = [
  { icon: ClipboardList, title: "Mes courriers", text: "Impôts, CAF, CPAM, banque… Comprendre la demande et préparer la réponse.", tags: ["Échéances", "Réponses"], plan: "Gratuit · courriers simples", plus: false },
  { icon: FileSearch, title: "Travail et paie", text: "Fiche de paie, contrat, avenant, documents de fin de contrat : repérer ce qui compte.", tags: ["Lignes expliquées", "Points à vérifier"], plan: "Plus · 4,99 € / mois", plus: true },
  { icon: Stamp, title: "Contrats, logement, notaire", text: "Bail, assurance, devis, acte de notaire : repérer les engagements avant de signer.", tags: ["Avant de signer", "Points à préciser"], plan: "Plus · 4,99 € / mois", plus: true },
  { icon: ShieldCheck, title: "Vérifier un document", text: "Repérer les incohérences et savoir comment vérifier auprès de l'émetteur.", tags: ["Cohérence", "Origine à confirmer"], plan: "Plus · 4,99 € / mois", plus: true },
];

const OUTILS = [
  { icon: MessagesSquare, title: "Discuter avec le document", text: "« Que dois-je faire maintenant ? » Les réponses citent le passage concerné." },
  { icon: FolderOpen, title: "Dossiers", text: "Courriers, réponses, pièces manquantes et prochaine action, au même endroit." },
  { icon: GitCompare, title: "Comparer", text: "Deux fiches de paie, deux versions d'un contrat, un devis et une facture." },
  { icon: UserRound, title: "Préparer un rendez-vous", text: "Une fiche claire pour France Services, un avocat, un notaire ou le service paie." },
  { icon: BellRing, title: "Rappels", text: "Un email avant chaque échéance que vous avez confirmée. Jamais sur une date inventée." },
  { icon: PenLine, title: "Rédaction guidée", text: "Démission, résiliation, réclamation… quelques questions, un courrier propre en PDF." },
];

export default function Home() {
  return (
    <>
      {/* ───── Accueil ───── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.22),transparent_65%)]" aria-hidden />
        <div className="container-page grid items-center gap-12 pb-16 pt-10 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-wide text-muted">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange/40 motion-reduce:hidden" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-orange" />
              </span>
              La paperasse en mode simplifié.
            </p>
            <h1 className="font-display mt-5 text-[2.75rem] font-semibold leading-[1.05] text-navy sm:text-[3.4rem] lg:text-[4rem]">
              Un document <br className="hidden sm:block" />
              <em className="font-medium text-orange">incompréhensible&nbsp;?</em>
            </h1>
            <div className="underline-grow mt-4 h-1 w-48 rounded-full bg-gradient-to-r from-orange to-transparent" aria-hidden />
            <p className="mt-6 max-w-xl text-[1.2rem] leading-relaxed text-muted">
              Courrier, fiche de paie ou contrat&nbsp;: prenez-le en photo. Allô Papiers vous explique ce qu'il dit, ce qu'on attend de vous, et prépare une réponse que vous pouvez modifier.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/nouveau" className="btn btn-primary text-[1.08rem]">
                <Camera className="h-6 w-6" aria-hidden /> Comprendre un document <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link href="/courriers" className="btn btn-outline text-[1.08rem]">
                Rédiger un courrier
              </Link>
            </div>
            <Link href="/exemples/caf-justificatifs" className="mt-6 inline-flex items-center gap-2 border-b-2 border-line pb-1 text-[1.05rem] font-semibold text-navy hover:border-orange">
              Voir un exemple <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <ul className="mt-8 grid gap-2 text-[1rem] text-ok">
              <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5 shrink-0" aria-hidden /> 3 documents simples gratuits chaque mois, sans carte bancaire</li>
              <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5 shrink-0" aria-hidden /> Aucun envoi sans votre validation</li>
            </ul>
          </div>

          {/* Visuel : courrier → résultat (exemple fictif) */}
          <div className="reveal relative mx-auto w-full max-w-md" aria-label="Exemple fictif d'analyse">
            <div className="rounded-[2rem] border border-line bg-sand/70 p-4 shadow-[0_30px_60px_-30px_rgba(15,30,54,0.35)] sm:p-6">
              <div className="float-soft rounded-xl bg-white p-5 shadow-md" style={{ ["--r" as string]: "-1.5deg" }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Organisme · exemple fictif</p>
                <p className="mt-2 text-sm text-muted">Objet : mise à jour de votre dossier</p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/80">Nous vous invitons à nous transmettre les pièces justificatives nécessaires à l'actualisation de votre situation.</p>
                <p className="mt-3 inline rounded bg-[#f6e7b8] px-1 text-[0.95rem] leading-loose text-navy [box-decoration-break:clone]">Merci de compléter votre dossier avant la date indiquée.</p>
              </div>
              <div className="my-3 flex justify-center text-orange" aria-hidden>↓</div>
              <div className="neon card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ok-soft text-ok"><HeartHandshake className="h-6 w-6" aria-hidden /></span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted">L'essentiel</p>
                      <p className="font-semibold">Voilà ce que cela veut dire.</p>
                    </div>
                  </div>
                  <span className="chip shrink-0 bg-warn-soft text-warn">À traiter</span>
                </div>
                <p className="mt-3 text-[1.02rem] text-ink/85">Il manque des justificatifs à votre dossier. Envoyez-les pour permettre son traitement.</p>
                <ul className="mt-3 grid gap-2 text-[0.95rem]">
                  <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-ok-soft text-ok"><Check className="h-4 w-4" /></span> Rassembler les documents demandés</li>
                  <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-ok-soft text-ok"><Check className="h-4 w-4" /></span> Les envoyer avant la date citée</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Organismes ───── */}
      <section className="border-y border-line bg-sand/60 py-8" aria-label="Types de courriers">
        <p className="text-center text-[0.85rem] font-bold uppercase tracking-[0.2em] text-muted">Pour les courriers du quotidien</p>
        <ul className="container-page mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[1.1rem] text-navy">
          {ORGANISMES.map((o, i) => (
            <li key={o} className="flex items-center gap-5">
              {o}
              {i < ORGANISMES.length - 1 && <span className="text-muted/50" aria-hidden>·</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* ───── Trois étapes (séquence animée) ───── */}
      <div id="fonctionnement">
        <ScrollStory />
      </div>

      {/* ───── Parcours ───── */}
      <section className="container-page py-20" aria-labelledby="titre-parcours">
        <div className="reveal max-w-2xl">
          <p className="eyebrow">Un document, une aide adaptée</p>
          <h2 id="titre-parcours" className="font-display mt-3 text-[2.1rem] font-semibold md:text-[2.7rem]">Par où commençons-nous&nbsp;?</h2>
          <p className="mt-3 text-muted">Choisissez votre type de document. Les parcours avancés font partie de l'offre Plus.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {PARCOURS.map((p, i) => (
            <article key={p.title} className={`reveal card relative flex flex-col p-6 ${i === 0 ? "neon" : ""}`} style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
              <div className="absolute left-6 top-0 h-1 w-16 rounded-b bg-orange" aria-hidden />
              <div className="flex items-center justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-soft text-orange"><p.icon className="h-7 w-7" aria-hidden /></span>
                <span className="font-display text-xl text-muted">0{i + 1}</span>
              </div>
              <p className={`mt-4 rounded-xl px-3 py-2 text-[0.95rem] font-semibold ${p.plus ? "bg-orange-soft text-orange-dark" : "bg-ok-soft text-ok"}`}>{p.plan}</p>
              <h3 className="mt-4 text-2xl font-semibold">{p.title}</h3>
              <p className="mt-2 flex-1 text-muted">{p.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.tags.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
              <Link href="/nouveau" className="mt-5 border-t border-line pt-4 font-semibold text-orange hover:text-orange-dark">
                Ouvrir cet espace <ArrowRight className="inline h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
        <div className="reveal mt-6 overflow-hidden rounded-[1.4rem] bg-navy p-7 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-9">
          <div>
            <h3 className="text-2xl font-semibold md:text-3xl">Vous avez une démarche, mais aucun document&nbsp;?</h3>
            <p className="mt-2 text-white/80">Démission, résiliation, réclamation, réparations… Préparez votre courrier avec quelques questions.</p>
          </div>
          <Link href="/courriers" className="btn btn-primary mt-6 w-full shrink-0 md:mt-0 md:w-auto">Rédiger un courrier</Link>
        </div>
      </section>

      {/* ───── Film d'explication ───── */}
      <section id="film" className="overflow-hidden border-y border-line bg-[radial-gradient(70%_60%_at_50%_40%,rgba(251,146,60,0.14),transparent_70%)] py-20" aria-labelledby="titre-film">
        <div className="container-page">
          <div className="reveal mx-auto max-w-2xl text-center">
            <p className="eyebrow">En images</p>
            <h2 id="titre-film" className="font-display mt-3 text-[2.1rem] font-semibold md:text-[2.7rem]">Ce que vous pouvez faire, en six petits films.</h2>
            <p className="mt-3 text-muted">Exemples fictifs. Touchez un chapitre pour le revoir, ou mettez en pause.</p>
          </div>
          <div className="mt-12">
            <ExplainerFilm />
          </div>
          <p className="mt-10 text-center">
            <Link href="/demonstrations" className="btn btn-outline">Voir les vidéos du site en fonctionnement</Link>
          </p>
        </div>
      </section>

      {/* ───── Outils ───── */}
      <section className="bg-sand/50 py-20" aria-labelledby="titre-outils">
        <div className="container-page">
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Au-delà du résumé</p>
            <h2 id="titre-outils" className="font-display mt-3 text-[2.1rem] font-semibold md:text-[2.7rem]">Votre démarche, étape par étape.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OUTILS.map((o, i) => (
              <div key={o.title} className="reveal card p-6 transition-transform duration-300 hover:-translate-y-1" style={{ ["--reveal-delay" as string]: `${(i % 3) * 80}ms` }}>
                <o.icon className="h-7 w-7 text-orange" aria-hidden />
                <h3 className="mt-3 text-xl font-semibold">{o.title}</h3>
                <p className="mt-1.5 text-muted">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Confidentialité ───── */}
      <section id="confidentialite" className="bg-navy py-20 text-white" aria-labelledby="titre-conf">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="reveal">
            <p className="text-[0.95rem] font-semibold tracking-wide text-[#fdba74]">Vous gardez le contrôle</p>
            <h2 id="titre-conf" className="font-display mt-3 text-[2.2rem] font-semibold md:text-[2.8rem]">Des décisions qui restent les vôtres.</h2>
            <p className="mt-4 text-white/80">Allô Papiers vous aide à comprendre et à répondre, mais ne remplace pas un avocat ou un professionnel habilité.</p>
            <p className="mt-4 text-white/70">
              Pour être analysé, votre document doit être lisible temporairement par notre serveur et par notre fournisseur d'IA. Nous ne prétendons pas à un chiffrement « de bout en bout ». <Link href="/confidentialite" className="font-semibold text-[#fdba74] underline">Tout est expliqué ici.</Link>
            </p>
          </div>
          <ul className="grid gap-7">
            {[
              { icon: Lock, t: "Un coffre-fort, le même pour tous", d: "Stockage privé en Europe, fichiers chiffrés, aucune adresse publique. Ouverture par empreinte, visage ou code de l'appareil (clé d'accès), ou par code reçu par email." },
              { icon: Check, t: "Aucun envoi sans votre accord", d: "Vous relisez le texte, l'adresse, les pièces jointes et le prix, puis vous cochez « J'ai relu et je valide cet envoi en mon nom »." },
              { icon: UserRound, t: "Un relais humain si nécessaire", d: "Pour une situation complexe : orientation vers France Services, l'organisme ou un professionnel." },
              { icon: ShieldCheck, t: "Jamais vos mots de passe", d: "Allô Papiers ne se connecte jamais à vos comptes CAF, Ameli, impôts ou banque. Vous restez seul à y accéder." },
            ].map((x, i) => (
              <li key={x.t} className="reveal flex gap-4" style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#fdba74]"><x.icon className="h-6 w-6" aria-hidden /></span>
                <div>
                  <h3 className="text-xl font-semibold">{x.t}</h3>
                  <p className="mt-1 text-white/75">{x.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── Tarifs ───── */}
      <section id="tarifs" className="container-page py-20" aria-labelledby="titre-tarifs">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow">Des tarifs simples</p>
          <h2 id="titre-tarifs" className="font-display mt-3 text-[2.2rem] font-semibold md:text-[2.8rem]">Un coup de main, à votre rythme.</h2>
          <p className="mt-3 text-muted">Pas de paiement à l'unité, pas de passage automatique à un abonnement.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="reveal card flex flex-col p-7">
            <h3 className="text-2xl font-semibold">Gratuit</h3>
            <p className="mt-2"><span className="font-display text-5xl font-semibold">0&nbsp;€</span></p>
            <p className="mt-1 text-muted">Sans carte bancaire</p>
            <ul className="mt-6 grid flex-1 gap-3">
              {["3 documents administratifs simples par mois", "Explication en français simple", "Étapes à cocher et échéance repérée", "Brouillon de réponse modifiable", "Rédaction guidée de courriers", "Coffre-fort et sécurité identiques à l'offre Plus"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-ok" aria-hidden />{t}</li>
              ))}
            </ul>
            <Link href="/nouveau" className="btn btn-outline mt-8 w-full">Commencer gratuitement</Link>
          </div>
          <div className="reveal neon card flex flex-col p-7" style={{ ["--reveal-delay" as string]: "100ms" }}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold">Plus</h3>
              <span className="chip bg-orange-soft text-orange-dark">Parcours avancés</span>
            </div>
            <p className="mt-2"><span className="font-display text-5xl font-semibold">4,99&nbsp;€</span> <span className="text-muted">/ mois</span></p>
            <p className="mt-1 text-muted">Résiliable en un clic depuis votre compte</p>
            <ul className="mt-6 grid flex-1 gap-3">
              {[
                "Au-delà des 3 documents gratuits : jusqu'à 30 documents par mois",
                "Paie, travail, contrats, bail, notaire, courriers d'avocat",
                "Repérage d'anomalies et aide à la vérification",
                "Discussion avec vos documents (150 questions / mois)",
                "Comparaisons (20 / mois) et suivi des dossiers",
                "Fiches de rendez-vous préparées par l'IA",
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-orange" aria-hidden />{t}</li>
              ))}
            </ul>
            <Link href="/compte/abonnement" className="btn btn-primary mt-8 w-full">Découvrir l'offre Plus</Link>
          </div>
        </div>
        <div className="reveal mx-auto mt-8 max-w-4xl rounded-2xl border border-line bg-white/70 p-6">
          <h3 className="text-lg font-semibold">Qu'est-ce qui compte comme un document&nbsp;?</h3>
          <p className="mt-2 text-muted">
            Un document = un même courrier, jusqu'à 10 pages (photos ou PDF) analysées ensemble. Les pages d'un même courrier ne sont jamais comptées séparément. Les exemples et les analyses qui échouent ne consomment aucun crédit. Les compteurs repartent à zéro le 1er de chaque mois.
          </p>
        </div>
      </section>

      {/* ───── Exemples + fin ───── */}
      <section className="container-page pb-6" aria-labelledby="titre-exemples">
        <div className="reveal card grid gap-6 p-7 md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
          <div>
            <p className="eyebrow">Exemples fictifs</p>
            <h2 id="titre-exemples" className="font-display mt-2 text-[2rem] font-semibold">Voyez à quoi ressemble un résultat.</h2>
            <p className="mt-2 text-muted">Ces exemples sont écrits à la main pour illustrer le service. Ils ne consomment aucun crédit.</p>
          </div>
          <div className="grid gap-3">
            <Link href="/exemples/caf-justificatifs" className="btn btn-outline w-full justify-between">Demande de justificatifs <ArrowRight className="h-5 w-5" aria-hidden /></Link>
            <Link href="/exemples/amende-stationnement" className="btn btn-outline w-full justify-between">Avis de paiement <ArrowRight className="h-5 w-5" aria-hidden /></Link>
          </div>
        </div>
        <ProNotice className="reveal mx-auto mt-8 max-w-4xl" />
      </section>
    </>
  );
}
