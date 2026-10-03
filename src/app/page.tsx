import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Camera, Link2, Type, Sparkles, Store, Image as ImageIcon, Film, CalendarDays, FolderTree, BookOpen, Plug, ShieldCheck, MessageSquare, Pause, Palette, Lock } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { AutoVideo, BeforeAfter, DemoTabs, RevealObserver, ScrollFX, ThemeShowcase, VideoChapters, type Demo } from "@/components/landing-client";
import { directionCards } from "@/lib/theme/directions";
import { OFFER, monthlyAllowanceMicro, EUR } from "@/lib/billing";
import { paymentsLive } from "@/lib/payments";
import { currentUser } from "@/lib/auth";
import { PROMPT_STATS } from "@/lib/prompts-library";

export const dynamic = "force-dynamic";

function demos(): Demo[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", "manifest.json"), "utf8")).demos;
  } catch {
    return [];
  }
}

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

/** Titre animé mot à mot (les espaces sont conservés pour la lecture et le copier-coller). */
function Words({ text, className = "", d = 0 }: { text: string; className?: string; d?: number }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((w, i) => (
        <span key={i} className={`w ${className}`} style={{ ["--i" as any]: i, ["--d" as any]: d }}>
          {w}
          {i < parts.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </>
  );
}

const SECTIONS_COUNT = (() => {
  try {
    return fs.readdirSync(path.join(process.cwd(), "theme-base", "sections")).filter((f) => f.endsWith(".liquid")).length;
  } catch {
    return 40;
  }
})();

export default async function Home() {
  const list = demos();
  const d0 = list[0];
  const user = await currentUser();
  const live = paymentsLive();
  const allowance = monthlyAllowanceMicro(1) / EUR;
  const themes = directionCards();
  const cta = user ? "/studio" : "/inscription";
  const chapters = [
    { tag: "Analyse", title: "Une photo suffit pour démarrer.", text: "Le studio détoure votre produit au pixel près, mesure sa palette sur l'objet et dessine logo et charte. Pas encore de photo ? Ouvrez le studio quand même : vous l'ajouterez plus tard.", video: "/explainers/photo.mp4", poster: "/explainers/photo.jpg" },
    { tag: "Boutique sur mesure", title: "Votre thème, créé de A à Z par l'IA.", text: "Couleurs et typographies de votre marque, mise en page pensée pour votre produit, sections inédites codées pour lui : un vrai thème Shopify Online Store 2.0, unique, que vous retouchez ensuite en discutant.", video: "/explainers/themes.mp4", poster: "/explainers/themes.jpg" },
    { tag: "Retouche", title: "Vous modifiez en discutant.", text: "Désignez un élément dans l'aperçu et demandez ce que vous voulez : seul cet élément change. Chaque modification crée une version que vous pouvez restaurer.", video: "/explainers/chat.mp4", poster: "/explainers/chat.jpg" },
    { tag: "Images et vidéos", title: "Chaque visuel au bon format.", text: "Packshots, scènes, publicités et vidéos montées en 1:1, 4:5, 9:16 et 16:9, toujours à partir des pixels réels de votre produit, avec des textes nets.", video: "/explainers/formats.mp4", poster: "/explainers/formats.jpg" },
    { tag: "Calendrier", title: "Vous validez, le studio publie.", text: "Des semaines de publications préparées pour chaque réseau. Rien ne part sans votre accord ; une fois vos comptes connectés, la publication programmée tourne même navigateur fermé.", video: "/explainers/cal.mp4", poster: "/explainers/cal.jpg" },
  ];
  const features: [any, string, string][] = [
    [MessageSquare, "Boutique par conversation", "Discutez à gauche, la boutique s'actualise à droite. Désignez une zone, joignez une image, demandez « modifie uniquement ce bouton »."],
    [Palette, "Thème sur mesure par l'IA", "Identité, composition et sections codées pour votre produit. Online Store 2.0 complet, contrôlé avec Theme Check (l'outil officiel de Shopify), exporté en ZIP identique à l'aperçu."],
    [ImageIcon, "Images fidèles", "Packshots, détails, scènes, bannières, visuels sociaux et publicitaires — rangés et réutilisables partout."],
    [Film, "Vidéos abouties", "Typographie animée, révélation du produit, transitions, musique originale, sous-titres. MP4 en 9:16, 1:1, 4:5 et 16:9."],
    [CalendarDays, "Calendrier qui publie", "Jour, semaine, mois. Validation à l'unité ou en lot, règles d'automatisation, reprises sans doublon."],
    [Pause, "Pause et reprise", "Mettez une création en pause, reprenez-la plus tard : les étapes terminées sont conservées, rien n'est refait."],
    [BookOpen, `${PROMPT_STATS.total} prompts sectoriels`, `${PROMPT_STATS.sectors} secteurs, complétés automatiquement avec votre produit, votre marque et vos médias.`],
    [FolderTree, "Fichiers organisés", "Dossiers par boutique, versions préservées, originaux intacts, liens vers chaque usage."],
    [Plug, "Connexions officielles", "Instagram, Facebook, TikTok, YouTube, Pinterest, Canva et Shopify par leurs autorisations officielles. Jamais de mot de passe."],
    [Sparkles, "Une IA qui se souvient", "Faits confirmés, décisions et corrections forment une mémoire commune, respectée par toutes les créations suivantes."],
  ];
  const span = ["lg:col-span-3", "lg:col-span-3", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "lg:col-span-3"];
  return (
    <div className="overflow-x-clip">
      <RevealObserver />
      <ScrollFX />
      {/* En-tête */}
      <header className="glass sticky top-0 z-50 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="E-COM STUDIO IA — accueil">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-2 lg:flex" aria-label="Navigation principale">
            <a href="#video" className="hover:text-ink">En vidéo</a>
            <a href="#sur-mesure" className="hover:text-ink">Sur mesure</a>
            <a href="#demonstrations" className="hover:text-ink">Démonstrations</a>
            <a href="#studio" className="hover:text-ink">Le studio</a>
            <a href="#offre" className="hover:text-ink">Offre</a>
            <a href="#questions" className="hover:text-ink">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/studio" className="btn-glow inline-flex h-10 items-center gap-2 rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">
                Mon studio <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-paper-2 sm:inline-flex">Connexion</Link>
                <Link href="/inscription" className="btn-glow inline-flex h-10 items-center gap-2 rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">Essayer</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Héros */}
        <section className="relative isolate">
          <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
          <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:pb-28">
            <div className="lg:col-span-6">
              <p className="reveal glass inline-flex items-center gap-2.5 rounded-full border border-line py-1.5 pl-1.5 pr-4 text-xs font-medium uppercase tracking-[.16em] text-signal">
                <span className="grid size-7 place-items-center rounded-full bg-signal-soft"><Sparkles className="size-3.5" /></span>
                Le studio e-commerce nouvelle génération
              </p>
              <h1 className="words mt-7 font-display text-[clamp(3rem,8.2vw,6.4rem)] font-semibold leading-[0.93]">
                <Words text="Une photo." />
                <br />
                <Words text="Une marque." d={2} />
                <br />
                <Words text="Une boutique qui vend." className="text-gradient pb-1" d={4} />
              </h1>
              <p className="reveal mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ ["--d" as any]: 6 }}>
                Déposez la photo de votre produit, collez un lien — ou commencez sans rien. L'IA construit la marque, le thème Shopify, les images, les vidéos et vos publications. Vous gardez la main à chaque étape.
              </p>
              <div className="reveal mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as any]: 7 }}>
                <Link href={cta} className="btn-glow inline-flex h-14 items-center gap-2.5 rounded-full bg-signal px-7 text-[15px] font-semibold text-signal-ink transition hover:-translate-y-0.5">
                  <Sparkles className="size-4" /> Créer avec l'IA
                </Link>
                <a href="#video" className="glass inline-flex h-14 items-center gap-2 rounded-full border border-line px-7 text-[15px] font-medium transition hover:border-ink">
                  Voir en vidéo
                </a>
              </div>
              <ul className="reveal mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" style={{ ["--d" as any]: 8 }}>
                <li className="flex items-center gap-2"><Lock className="size-4 text-signal" aria-hidden /> Espace privé</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> Essai sans carte bancaire</li>
                <li className="flex items-center gap-2"><Pause className="size-4 text-signal" aria-hidden /> Pause et reprise à tout moment</li>
              </ul>
            </div>
            <div className="relative lg:col-span-6">
              <div data-sfx className="sfx-tilt reveal reveal-scale relative mx-auto max-w-[560px]" style={{ ["--d" as any]: 3 }}>
                <div className="neon on overflow-hidden rounded-[2rem] border border-line bg-[#070B17] shadow-[0_40px_120px_-40px_var(--glow)]">
                  <AutoVideo src="/explainers/hero.mp4" poster="/explainers/hero.jpg" label="Vidéo : trois produits réels, trois boutiques générées" className="aspect-square w-full object-cover" />
                </div>
                {d0 && (
                  <div data-sfx className="sfx-rise absolute -right-4 bottom-[14%] hidden w-[22%] sm:block lg:-right-12">
                    <img src={d0.shopMobile} alt="Boutique générée affichée sur téléphone" className="aspect-[9/17] w-full rounded-[1.3rem] border-[5px] border-[#0A1024] object-cover object-top shadow-soft" />
                  </div>
                )}
                <ul className="mt-6 flex flex-wrap justify-center gap-2">
                  {["Thème Shopify OS 2.0", "Vidéos 9:16 · 1:1 · 4:5 · 16:9", "Palette mesurée sur le produit"].map((t, i) => (
                    <li key={t} className="floaty glass rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-2 shadow-soft" style={{ animationDelay: `${-i * 2}s` }}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Bandeau */}
        <div className="border-y border-white/10 bg-[#0A1024] py-4 text-white" aria-hidden>
          <div className="marquee flex w-max">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-10 pr-10 font-display text-xl sm:text-2xl">
                {["Analyse produit", "Direction de marque", "Logo vectoriel", "Thème sur mesure par l'IA", "Packshots fidèles", "Vidéos 9:16 · 1:1 · 4:5 · 16:9", "Retouche en discutant", "Calendrier éditorial", "Pause et reprise"].map((t) => (
                  <span key={t} className="flex items-center gap-10">
                    {t} <span className="text-[#7CC4FF]">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* En vidéo */}
        <section id="video" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mb-10 max-w-3xl lg:mb-4">
            <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Le studio en vidéo</p>
            <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.6vw,4.4rem)] font-semibold leading-[0.98]">
              <Words text="Cinq vidéos de dix secondes" /> <Words text="pour tout comprendre." className="text-gradient" d={3} />
            </h2>
          </div>
          <VideoChapters chapters={chapters} />
        </section>

        {/* Chiffres */}
        <section className="border-y border-line bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-line lg:grid-cols-4">
            {[
              [1, "thème unique, composé pour votre marque"],
              [SECTIONS_COUNT, "sections modifiables dans l'éditeur"],
              [4, "formats vidéo par création"],
              [PROMPT_STATS.total, "prompts sectoriels"],
            ].map(([n, l], i) => (
              <div key={l as string} className="reveal bg-card px-5 py-10 sm:px-8 sm:py-14" style={{ ["--d" as any]: i }}>
                <p className="text-gradient font-display text-5xl font-semibold sm:text-7xl" data-count data-to={n}>{n}</p>
                <p className="mt-2 text-sm text-muted sm:text-base">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sur mesure, de A à Z */}
        <section id="sur-mesure" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Sur mesure</p>
              <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.2vw,4.4rem)] font-semibold leading-[0.96]">
                <Words text="Un thème créé pour votre marque," /> <Words text="de A à Z." className="text-gradient" d={5} />
              </h2>
              <p className="reveal mt-5 text-[17px] leading-relaxed text-ink-2">Pas un modèle repeint : l'IA du studio conçoit votre boutique comme le ferait une agence, puis la vérifie elle-même avant de vous la montrer.</p>
            </div>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["01", "Identité", "Logo, palette mesurée sur votre produit, typographies et ton éditorial : la marque d'abord, le thème ensuite."],
                ["02", "Composition", "Les sections sont choisies et ordonnées pour raconter votre produit : ouverture, preuves, détails, usage, questions."],
                ["03", "Sections inédites", "Quand rien n'existe pour votre idée, l'IA code une nouvelle section Shopify (animation, présentation, comparateur), réglable dans l'éditeur."],
                ["04", "Relecture visuelle", "Le studio photographie la boutique sur ordinateur et téléphone, la note comme un directeur artistique et corrige ce qui se voit."],
                ["05", "Retouches en discutant", "« Plus premium », « ce bouton en noir », « ajoute une section avis » : seul l'élément visé change, chaque version reste restaurable."],
                ["06", "Prête pour Shopify", "Online Store 2.0, contrôlée avec Theme Check, exportée en ZIP identique à l'aperçu ou installée directement dans votre boutique."],
              ].map(([n, t, d], i) => (
                <li key={n} className="reveal rounded-3xl border border-line bg-card p-6" style={{ ["--d" as any]: i }}>
                  <p className="font-display text-sm font-semibold text-signal">{n}</p>
                  <h3 className="mt-3 font-display text-xl font-semibold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </li>
              ))}
            </ol>
            <p className="reveal mt-6 text-xs text-muted">Conception sur mesure avec l'IA du studio. Sans IA, le moteur intégré part de l'une des onze directions, aux couleurs et au logo de votre marque.</p>
          </div>
        </section>

        {/* Thèmes */}
        <ThemeShowcase themes={themes}>
          <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Les thèmes</p>
              <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.2vw,4.4rem)] font-semibold leading-[0.96]">
                <Words text="Onze points de départ." /> <Words text="Ou aucun." className="text-gradient" d={3} />
              </h2>
            </div>
            <div>
              <p className="reveal text-[17px] leading-relaxed text-ink-2">L'IA peut partir de l'une de ces onze directions — chacune avec sa composition, ses typographies et ses animations — ou composer un thème entièrement nouveau pour votre produit. Dans tous les cas, tout reste modifiable : en discutant avec le studio, puis dans l'éditeur Shopify.</p>
              <Link href={user ? "/studio/themes" : "/inscription"} className="reveal mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-medium hover:border-ink">
                Voir la galerie <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </ThemeShowcase>

        {/* Démonstrations */}
        <section id="demonstrations" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Démonstrations</p>
                <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                  <Words text={`${(["Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"][list.length - 1] ?? list.length)} produits,`} /> <Words text="une seule photo chacun." className="text-gradient" d={2} />
                </h2>
              </div>
              <p className="reveal max-w-md text-sm leading-relaxed text-muted">
                Les marques sont <strong className="text-ink">créées par le studio</strong>. Chaque démonstration part d'un vrai produit vendu en marque blanche par un fournisseur : photo d'origine retouchée, inscriptions du fabricant retirées, marque et étiquettes refaites. Détourage, logo, boutique, images et vidéos sont produits par le studio lui-même, avec son moteur local.
              </p>
            </div>
            {list.length ? <DemoTabs demos={list} /> : <p className="text-muted">Les démonstrations s'affichent après génération (script « npm run demos »).</p>}
          </div>
          {list.length > 0 && (
            <div className="mt-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <h3 className="reveal font-display text-3xl font-semibold sm:text-4xl">{list.length} publicités vidéo, aucun montage à la main.</h3>
                <p className="reveal mt-2 text-muted">Générées par le studio à partir de chaque photo : révélation du produit, textes animés, musique originale.</p>
              </div>
              <div className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))] scroll-px-4 sm:scroll-px-6 lg:scroll-px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))]">
                {list.map((d, i) => (
                  <figure key={d.id} className="reveal w-[46vw] shrink-0 snap-start sm:w-[220px]" style={{ ["--d" as any]: i % 4 }}>
                    <div className="overflow-hidden rounded-[1.6rem] border-[5px] border-[#0A1024] bg-[#0A1024] shadow-soft">
                      <AutoVideo src={d.video} poster={d.videoPoster} label={`Publicité vidéo 9:16 pour ${d.brand}`} className="aspect-[9/16] w-full object-cover" />
                    </div>
                    <figcaption className="mt-2 text-sm"><span className="font-medium">{d.brand}</span> <span className="text-muted">· {d.sector}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Fidélité */}
        {d0 && (
          <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 sm:px-6 sm:pb-32 lg:grid-cols-2">
            <div className="reveal reveal-scale">
              <BeforeAfter before={d0.photo} after={d0.images.find((x) => /scène|scene/i.test(x.label))?.src ?? d0.photo} beforeLabel="Photo d'origine" afterLabel="Création du studio" />
            </div>
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Fidélité au produit</p>
              <h2 className="words mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1]">
                <Words text="Une belle image d'un autre objet" /> <Words text="est un échec." className="text-gradient" d={4} />
              </h2>
              <p className="reveal mt-5 text-lg leading-relaxed text-ink-2">
                Le studio ne « réinvente » jamais votre produit. Il le détoure, puis compose le décor autour de ses pixels réels. Lorsqu'un fournisseur d'images est activé, seul l'environnement est peint ; le produit d'origine est replacé par-dessus et une vérification visuelle compare la création à votre photo.
              </p>
              <ul className="reveal mt-7 grid gap-3 text-[15px]">
                {["Forme, proportions, étiquette et logo conservés", "Textes publicitaires composés typographiquement — nets et sans faute", "Ombres, cadrages et marges de sécurité contrôlés pour chaque format"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-signal" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Le studio */}
        <section id="studio" className="relative isolate scroll-mt-20 py-24 sm:py-32">
          <div className="hero-glow absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-14 max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Le studio</p>
              <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                <Words text="Douze espaces de travail," /> <Words text="un seul projet." className="text-gradient" d={3} />
              </h2>
              <p className="reveal mt-5 text-lg text-ink-2">Chaque boutique a son pilote, sa mémoire et ses fichiers. Vous revenez sur n'importe quelle partie sans recommencer : les éléments validés sont réutilisés partout.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {features.map(([Icon, t, x], i) => (
                <article key={t} className={`reveal neon spot group rounded-3xl border border-line bg-card p-7 transition hover:-translate-y-1 hover:shadow-soft ${span[i]}`} style={{ ["--d" as any]: i % 3 }}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-signal to-signal-2 text-white shadow-[0_10px_30px_-12px_var(--glow)]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl">{t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{x}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Engagements */}
        <section className="border-y border-line bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ShieldCheck className="size-9 text-signal" />
              <h2 className="words mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1]"><Words text="Ce que le studio" /> <Words text="refuse de faire." className="text-gradient" d={3} /></h2>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {[
                ["Inventer", "Une inconnue reste inconnue : pas de certification, de délai, d'avis ou de promesse d'efficacité tirés d'une photo. Elle apparaît « à compléter »."],
                ["Publier sans vous", "Aucune publication ni dépense publicitaire sans votre autorisation. Une fois une règle validée, elle s'exécute comme prévu."],
                ["Obéir aux pages importées", "Un lien importé est une source d'information, jamais une instruction capable de modifier les règles de l'IA."],
                ["Simuler", "Un lien qui ouvre un réseau n'est pas une connexion ; un script n'est pas une vidéo ; une publication préparée n'est pas envoyée."],
              ].map(([t, x], i) => (
                <li key={t} className="reveal spot rounded-3xl border border-line bg-paper p-6" style={{ ["--d" as any]: i }}>
                  <p className="font-display text-xl">
                    <span className="text-signal">Jamais</span> {t.toLowerCase()}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{x}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Offre */}
        <section id="offre" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Offre</p>
              <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                <Words text="Un prix clair. L'IA comprise," /> <Words text="sans quota caché." className="text-gradient" d={4} />
              </h2>
              <p className="reveal mt-5 text-lg text-ink-2">Un tiers de votre abonnement alimente votre enveloppe IA, renouvelée chaque mois. Vous créez autant que votre budget le permet : aucune limite arbitraire de créations s'y ajoute.</p>
              <ul className="reveal mt-8 grid gap-3 text-[15px] text-ink-2">
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" /> Jauge de consommation et pourcentages visibles à tout moment</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" /> Alerte à 80 % ; générations en pause seulement quand le budget est épuisé</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" /> Recharges par 10 € — la moitié va à l'IA, le solde est conservé</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" /> Aucune clé d'API à fournir : les IA sont incluses</li>
              </ul>
            </div>
            <div className="reveal reveal-scale grid gap-4">
              <div className="neon on relative overflow-hidden rounded-[2rem] bg-[#0A1024] p-8 text-white sm:p-10">
                <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(61,110,240,.55),transparent_65%)]" aria-hidden />
                <p className="text-sm text-white/70">Une boutique</p>
                <p className="mt-2 font-display text-6xl font-semibold">{eur(OFFER.basePriceEur)}<span className="text-xl font-normal text-white/60"> TTC / mois</span></p>
                <p className="mt-4 text-white/80">dont <strong>{eur(Math.round(allowance * 100) / 100)}</strong> d'enveloppe IA chaque mois</p>
                <hr className="my-6 border-white/15" />
                <div className="grid gap-3 text-sm text-white/80">
                  <p className="flex justify-between gap-4"><span>Boutique supplémentaire</span><strong className="text-white">+ {eur(OFFER.extraStorePriceEur)} / mois</strong></p>
                  <p className="flex justify-between gap-4"><span>Enveloppe IA par boutique supplémentaire</span><strong className="text-white">+ {eur(Math.round((OFFER.extraStorePriceEur / 3) * 100) / 100)}</strong></p>
                  <p className="flex justify-between gap-4"><span>Recharge</span><strong className="text-white">par tranches de 10 € (5 € d'IA)</strong></p>
                </div>
                <Link href={user ? "/studio/compte" : "/inscription"} className="btn-glow mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#3D6EF0] font-semibold text-white">
                  {live ? "S'abonner" : "Créer mon compte"} <ArrowRight className="size-4" />
                </Link>
                {!live && <p className="mt-3 text-center text-xs text-white/60">Le paiement en ligne n'est pas encore ouvert : la création de compte et l'essai du studio sont disponibles.</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="scroll-mt-20 bg-paper-2 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <h2 className="words font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1] lg:col-span-4"><Words text="Questions" /> <Words text="fréquentes" className="text-gradient" d={1} /></h2>
            <div className="lg:col-span-8">
              {[
                ["Faut-il une photo pour commencer ?", "Non. Vous pouvez ouvrir le studio sans rien, explorer les espaces et les thèmes, puis ajouter une photo, un lien ou quelques lignes quand vous êtes prêt : la création démarre à ce moment-là."],
                ["Puis-je arrêter une création en cours ?", "Oui. Le bouton « Pause » arrête la création à la fin de l'étape en cours ; « Reprendre » repart de là. Les étapes déjà terminées sont conservées et ne sont ni refaites ni refacturées."],
                ["Faut-il savoir écrire des prompts ?", "Non. Une photo, un lien ou quelques lignes suffisent pour démarrer. La bibliothèque de prompts sert à aller plus loin, quand vous le souhaitez."],
                ["Le thème Shopify est-il vraiment installable ?", "Oui : c'est un thème Online Store 2.0 complet (sections, blocs, réglages natifs, panier latéral, recherche, pages). Vous l'importez en ZIP, ou le studio l'installe comme thème non publié si vous connectez votre boutique."],
                ["Puis-je changer de thème après coup ?", "Oui, à tout moment depuis l'onglet Boutique (bouton « Thèmes »). Textes, images et produit sont conservés ; l'ancienne version reste restaurable."],
                ["Que se passe-t-il si une information manque ?", "Elle reste visible « à compléter » dans les textes, et le studio vous pose la question. Quand vous répondez, seuls les passages concernés sont mis à jour — sans écraser ce que vous avez validé."],
                ["Mes publications partent-elles si mon ordinateur est éteint ?", "Oui, une fois vos comptes connectés. Les publications programmées sont exécutées par le serveur, avec reprises contrôlées et protection contre les doublons. Les limites propres à chaque réseau sont indiquées dans le studio."],
                ["Puis-je gérer plusieurs boutiques ?", "Oui, chacune avec ses fichiers, sa marque, ses comptes sociaux et son calendrier ; 40 € par boutique supplémentaire."],
              ].map(([q, a]) => (
                <details key={q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl">
                    {q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line transition group-open:rotate-45 group-open:border-signal group-open:bg-signal group-open:text-white">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="scroll-scale relative isolate overflow-hidden rounded-[2rem] bg-[#0A1024] px-6 py-16 text-white sm:px-14 sm:py-24">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_400px_at_85%_0%,rgba(61,110,240,.6),transparent_60%),radial-gradient(600px_400px_at_0%_100%,rgba(124,196,255,.25),transparent_60%)]" aria-hidden />
            <h2 className="words max-w-3xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.95]">
              <Words text="Votre produit mérite mieux" /> <Words text="qu'une page blanche." className="bg-gradient-to-r from-[#7CC4FF] to-white bg-clip-text text-transparent" d={4} />
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={cta} className="btn-glow inline-flex h-14 items-center gap-2 rounded-full bg-[#3D6EF0] px-7 font-semibold text-white">
                <Sparkles className="size-4" /> Créer avec l'IA <ArrowUpRight className="size-4" />
              </Link>
              <a href="#themes" className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 font-medium text-white hover:border-white/50">Revoir les thèmes</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-10 text-sm text-muted sm:px-6">
          <Logo />
          <p>Démonstrations : produits réels de fournisseurs, marques créées par le studio. © {new Date().getFullYear()} E-COM STUDIO IA</p>
        </div>
      </footer>
    </div>
  );
}
