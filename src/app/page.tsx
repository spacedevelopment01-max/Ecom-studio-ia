import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Camera, Link2, Type, Sparkles, Store, Image as ImageIcon, Film, CalendarDays, FolderTree, BookOpen, Plug, ShieldCheck, MessageSquare } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { AutoVideo, BeforeAfter, DemoTabs, RevealObserver, StepsScroller, type Demo } from "@/components/landing-client";
import { DIRECTIONS } from "@/lib/theme/directions";
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

export default async function Home() {
  const list = demos();
  const d0 = list[0];
  const user = await currentUser();
  const live = paymentsLive();
  const allowance = monthlyAllowanceMicro(1) / EUR;
  const steps = [
    { title: "Vous donnez une photo, un lien ou trois lignes.", text: "Pas de formulaire interminable. Le studio lit la photo, la fiche produit importée ou votre description — et ne vous pose que les questions qui ne se devinent pas, comme le prix.", image: d0?.photo ?? "", tag: "Entrée : photo du produit" },
    { title: "Le produit est isolé au pixel près.", text: "Un détourage local sépare le produit de son décor. Toutes les créations repartent de ces pixels réels : forme, étiquette et couleurs restent celles de votre objet.", image: d0?.images.find((x) => /détour/i.test(x.label))?.src ?? d0?.photo ?? "", tag: "Détourage et couleurs mesurées" },
    { title: "Une marque cohérente se dessine.", text: "Nom (ou le vôtre), positionnement, palette tirée du produit, typographies, logo vectoriel et ton éditorial — réunis dans une charte que vous validez ou corrigez.", image: d0?.images.find((x) => /packshot/i.test(x.label))?.src ?? "", tag: "Direction de marque" },
    { title: "La boutique Shopify se compose.", text: "Un vrai thème Online Store 2.0 : accueil, fiche produit, collection, panier latéral, recherche, FAQ, pages de marque et de livraison — modifiable dans l'éditeur Shopify.", image: d0?.shopDesktop ?? "", tag: "Thème Shopify OS 2.0" },
    { title: "Images et vidéos sortent prêtes à publier.", text: "Packshots, détails, mises en scène, bannières, visuels sociaux et publicités vidéo en 9:16, 1:1, 4:5 et 16:9 — avec textes composés nets et marges de sécurité.", image: d0?.images.find((x) => /scène|scene/i.test(x.label))?.src ?? "", tag: "Images et vidéos" },
    { title: "Le calendrier se remplit, vous validez.", text: "Plusieurs jours ou semaines de publications adaptées à chaque réseau, avec leurs médias et horaires. Rien ne part sans votre accord ou vos règles d'automatisation.", image: d0?.images.find((x) => /social|publication/i.test(x.label))?.src ?? "", tag: "Calendrier éditorial" },
  ];
  return (
    <div className="overflow-x-clip">
      <RevealObserver />
      {/* En-tête */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="E-COM STUDIO IA — accueil">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-2 lg:flex" aria-label="Navigation principale">
            <a href="#parcours" className="hover:text-ink">Le parcours</a>
            <a href="#demonstrations" className="hover:text-ink">Démonstrations</a>
            <a href="#studio" className="hover:text-ink">Le studio</a>
            <a href="#offre" className="hover:text-ink">Offre</a>
            <a href="#questions" className="hover:text-ink">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/studio" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">
                Mon studio <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-paper-2 sm:inline-flex">Connexion</Link>
                <Link href="/inscription" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">Essayer</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Héros */}
        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-2">
                <span className="size-1.5 rounded-full bg-signal pulse-dot" aria-hidden /> Studio de création e-commerce assisté par IA
              </p>
              <h1 className="reveal mt-6 font-display text-[clamp(2.9rem,8.4vw,6.4rem)] font-semibold leading-[0.92]" style={{ ["--d" as any]: 1 }}>
                Une photo.
                <br />
                Une <span className="serif-i font-normal text-signal">marque</span>.
                <br />
                Une boutique qui vend.
              </h1>
              <p className="reveal mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ ["--d" as any]: 2 }}>
                Déposez la photo de votre produit ou collez un lien. L'IA analyse, construit la marque, conçoit le thème Shopify, crée images et vidéos, prépare vos publications — et vous gardez la main à chaque étape.
              </p>
              <div className="reveal mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as any]: 3 }}>
                <Link href={user ? "/studio" : "/inscription"} className="inline-flex h-13 items-center gap-2 rounded-full bg-signal px-7 text-[15px] font-semibold text-signal-ink transition hover:-translate-y-0.5 hover:shadow-soft">
                  Créer ma boutique <ArrowRight className="size-4" />
                </Link>
                <a href="#demonstrations" className="inline-flex h-13 items-center gap-2 rounded-full border border-line bg-card px-6 text-[15px] font-medium hover:border-ink">
                  Voir les démonstrations
                </a>
              </div>
              <ul className="reveal mt-9 grid gap-2 text-sm text-ink-2 sm:grid-cols-3" style={{ ["--d" as any]: 4 }}>
                {[
                  [Camera, "Une ou plusieurs photos"],
                  [Link2, "Ou un lien de fiche produit"],
                  [Type, "Ou quelques lignes"],
                ].map(([Icon, t]: any) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon className="size-4 text-signal" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative lg:col-span-5">
              {d0 ? (
                <div className="reveal relative mx-auto aspect-[4/5] max-w-md" style={{ ["--d" as any]: 2 }}>
                  <img src={d0.photo} alt="Photo d'entrée d'un produit de démonstration" className="absolute left-0 top-6 w-[52%] rotate-[-4deg] rounded-3xl border border-line shadow-soft" />
                  <div className="absolute right-0 top-0 w-[58%] overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink shadow-soft">
                    <AutoVideo src={d0.video} poster={d0.videoPoster} label="Publicité vidéo verticale générée pour la démonstration" className="aspect-[9/16] w-full object-cover" />
                  </div>
                  <img src={d0.shopMobile} alt="Boutique générée affichée sur téléphone" className="absolute bottom-0 left-[8%] w-[44%] rotate-[3deg] rounded-[1.6rem] border-[5px] border-ink object-cover object-top shadow-soft" style={{ aspectRatio: "9/16" }} />
                  <span className="absolute -bottom-7 right-0 text-[11px] text-muted">Démonstration · produit et marque fictifs</span>
                </div>
              ) : (
                <div className="aspect-[4/5] rounded-[2rem] bg-paper-2" />
              )}
            </div>
          </div>
        </section>

        {/* Bandeau */}
        <div className="border-y border-line bg-ink py-4 text-paper" aria-hidden>
          <div className="flex w-max marquee">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-10 pr-10 font-display text-xl sm:text-2xl">
                {["Analyse produit", "Direction de marque", "Logo vectoriel", "Thème Shopify OS 2.0", "Packshots fidèles", "Vidéos 9:16 · 1:1 · 4:5 · 16:9", "Calendrier éditorial", "Publication programmée", "200 prompts sectoriels"].map((t) => (
                  <span key={t} className="flex items-center gap-10">
                    {t} <span className="text-signal">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Parcours */}
        <section id="parcours" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mb-14 max-w-3xl">
            <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Le parcours</p>
            <h2 className="reveal mt-4 font-display text-[clamp(2.2rem,5.5vw,4.4rem)] font-semibold leading-[0.98]">
              Du produit initial à la boutique et aux <span className="serif-i font-normal">publicités</span>.
            </h2>
          </div>
          {d0 && <StepsScroller steps={steps.filter((s) => s.image)} />}
        </section>

        {/* Démonstrations */}
        <section id="demonstrations" className="scroll-mt-20 bg-paper-2 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Démonstrations</p>
                <h2 className="reveal mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">Quatre produits, une seule photo chacun.</h2>
              </div>
              <p className="reveal max-w-md text-sm leading-relaxed text-muted">
                Produits et marques <strong className="text-ink">fictifs</strong>, modélisés en 3D pour la démonstration. Tout le reste — détourage, logo, boutique, images, vidéos — a été produit par le studio lui-même, sans retouche manuelle, avec son moteur local (sans fournisseur d'IA externe).
              </p>
            </div>
            {list.length ? <DemoTabs demos={list} /> : <p className="text-muted">Les démonstrations s'affichent après génération (script « npm run demos »).</p>}
          </div>
        </section>

        {/* Fidélité */}
        {d0 && (
          <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2">
            <div className="reveal">
              <BeforeAfter before={d0.photo} after={d0.images.find((x) => /scène|scene/i.test(x.label))?.src ?? d0.photo} beforeLabel="Photo d'origine" afterLabel="Création du studio" />
            </div>
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Fidélité au produit</p>
              <h2 className="reveal mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1]">Une belle image d'un autre objet est un échec.</h2>
              <p className="reveal mt-5 text-lg leading-relaxed text-ink-2">
                Le studio ne « réinvente » jamais votre produit. Il le détoure, puis compose le décor autour de ses pixels réels. Lorsqu'un fournisseur d'images est activé, seul l'environnement est peint ; le produit d'origine est replacé par-dessus et une vérification visuelle compare la création à votre photo.
              </p>
              <ul className="reveal mt-7 grid gap-3 text-[15px]">
                {["Forme, proportions, étiquette et logo conservés", "Textes publicitaires composés typographiquement — nets et sans faute", "Ombres, cadrages et marges de sécurité contrôlés pour chaque format"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-ok" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Directions */}
        <section className="bg-ink py-24 text-paper sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-12 max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Galerie de directions</p>
              <h2 className="reveal mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                Onze directions artistiques. <span className="serif-i font-normal">Pas</span> onze couleurs.
              </h2>
              <p className="reveal mt-5 max-w-2xl text-lg text-paper/70">Chaque direction a sa composition, son rythme de sections, sa typographie et ses animations. Une base de départ — l'IA personnalise ensuite selon votre produit et vos demandes.</p>
            </div>
            <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
              {DIRECTIONS.map((d, i) => (
                <article key={d.id} className="reveal w-[78vw] shrink-0 snap-start sm:w-[420px]" style={{ ["--d" as any]: i % 4 }}>
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                    <img src={`/demo/directions/${d.id}.jpg`} alt={`Boutique de démonstration en direction ${d.name}`} className="aspect-[4/5] w-full object-cover object-top" loading="lazy" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl">{d.name} <span className="serif-i text-lg text-paper/60">— {d.tagline}</span></h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/65">{d.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Le studio */}
        <section id="studio" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mb-14 max-w-3xl">
            <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">Le studio</p>
            <h2 className="reveal mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">Douze espaces de travail, un seul projet.</h2>
            <p className="reveal mt-5 text-lg text-ink-2">Chaque boutique a son pilote, sa mémoire et ses fichiers. Vous revenez sur n'importe quelle partie sans recommencer : les éléments validés sont réutilisés partout.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              [MessageSquare, "Boutique par conversation", "Discutez à gauche, la boutique s'actualise à droite. Désignez une zone dans l'aperçu, joignez une image, demandez « modifie uniquement ce bouton ». Chaque changement crée une version restaurable."],
              [Store, "Thèmes Shopify réels", "Online Store 2.0 complet, contrôlé avec Theme Check (l'outil officiel de Shopify), exporté en ZIP identique à l'aperçu. WooCommerce et PrestaShop installables ; kits pour Wix et Squarespace."],
              [ImageIcon, "Images fidèles", "Packshots, détails, scènes, bannières, visuels sociaux et publicitaires — rangés, nommés et réutilisables dans la boutique, une vidéo ou une publication."],
              [Film, "Vidéos abouties", "Motion design image par image : typographie animée, révélation du produit, transitions, musique originale, sous-titres. MP4 H.264 en 9:16, 1:1, 4:5 et 16:9."],
              [CalendarDays, "Calendrier qui publie vraiment", "Jour, semaine, mois. Validation à l'unité ou en lot, règles d'automatisation, exécution en arrière-plan même navigateur fermé, reprises sans doublon."],
              [BookOpen, `${PROMPT_STATS.total} prompts sectoriels`, `${PROMPT_STATS.sectors} secteurs, ${PROMPT_STATS.perSector} prompts chacun, complétés automatiquement avec votre produit, votre marque et vos médias — à insérer dans le bon espace.`],
              [FolderTree, "Fichiers organisés", "Dossiers et sous-dossiers par boutique, versions préservées, originaux intacts, liens vers chaque usage (section, publication, campagne, vidéo)."],
              [Plug, "Connexions officielles", "Instagram, Facebook, TikTok, YouTube, Pinterest, Canva et Shopify par leurs autorisations officielles. Jamais de mot de passe. Les limites de chaque API sont affichées."],
              [Sparkles, "Une IA qui se souvient", "Faits confirmés, décisions, corrections et préférences forment une mémoire commune : une correction validée vaut pour toutes les créations suivantes."],
            ].map(([Icon, t, x]: any, i) => (
              <article key={t} className="reveal group rounded-3xl border border-line bg-card p-7 transition hover:-translate-y-1 hover:shadow-soft" style={{ ["--d" as any]: i % 3 }}>
                <span className="grid size-11 place-items-center rounded-2xl bg-paper-2 text-ink transition group-hover:bg-signal group-hover:text-signal-ink">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-2xl">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{x}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Engagements */}
        <section className="border-y border-line bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ShieldCheck className="size-9 text-signal" />
              <h2 className="reveal mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1]">Ce que le studio refuse de faire.</h2>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {[
                ["Inventer", "Une inconnue reste inconnue : pas de certification, de délai, d'avis ou de promesse d'efficacité tirés d'une photo. Elle apparaît « à compléter »."],
                ["Publier sans vous", "Aucune publication ni dépense publicitaire sans votre autorisation. Une fois une règle validée, elle s'exécute comme prévu."],
                ["Obéir aux pages importées", "Un lien importé est une source d'information, jamais une instruction capable de modifier les règles de l'IA."],
                ["Simuler", "Un lien qui ouvre un réseau n'est pas une connexion ; un script n'est pas une vidéo ; une publication préparée n'est pas envoyée."],
              ].map(([t, x], i) => (
                <li key={t} className="reveal rounded-3xl border border-line p-6" style={{ ["--d" as any]: i }}>
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
              <h2 className="reveal mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                Un prix clair. L'IA comprise, <span className="serif-i font-normal">sans quota caché</span>.
              </h2>
              <p className="reveal mt-5 text-lg text-ink-2">Un tiers de votre abonnement alimente votre enveloppe IA, renouvelée chaque mois. Vous créez autant que votre budget le permet : aucune limite arbitraire de créations s'y ajoute.</p>
              <ul className="reveal mt-8 grid gap-3 text-[15px] text-ink-2">
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-ok" /> Jauge de consommation et pourcentages visibles à tout moment</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-ok" /> Alerte à 80 % ; générations en pause seulement quand le budget est épuisé</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-ok" /> Recharges par 10 € — la moitié va à l'IA, le solde est conservé</li>
                <li className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-ok" /> Aucune clé d'API à fournir : les IA sont incluses</li>
              </ul>
            </div>
            <div className="reveal grid gap-4">
              <div className="rounded-[2rem] bg-ink p-8 text-paper sm:p-10">
                <p className="text-sm text-paper/70">Une boutique</p>
                <p className="mt-2 font-display text-6xl font-semibold">{eur(OFFER.basePriceEur)}<span className="text-xl font-normal text-paper/60"> TTC / mois</span></p>
                <p className="mt-4 text-paper/80">dont <strong>{eur(Math.round(allowance * 100) / 100)}</strong> d'enveloppe IA chaque mois</p>
                <hr className="my-6 border-white/15" />
                <div className="grid gap-3 text-sm text-paper/80">
                  <p className="flex justify-between gap-4"><span>Boutique supplémentaire</span><strong className="text-paper">+ {eur(OFFER.extraStorePriceEur)} / mois</strong></p>
                  <p className="flex justify-between gap-4"><span>Enveloppe IA par boutique supplémentaire</span><strong className="text-paper">+ {eur(Math.round((OFFER.extraStorePriceEur / 3) * 100) / 100)}</strong></p>
                  <p className="flex justify-between gap-4"><span>Recharge</span><strong className="text-paper">par tranches de 10 € (5 € d'IA)</strong></p>
                </div>
                <Link href={user ? "/studio/compte" : "/inscription"} className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-signal font-semibold text-signal-ink">
                  {live ? "S'abonner" : "Créer mon compte"} <ArrowRight className="size-4" />
                </Link>
                {!live && <p className="mt-3 text-center text-xs text-paper/60">Le paiement en ligne n'est pas encore ouvert : la création de compte et l'essai du studio sont disponibles.</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="scroll-mt-20 bg-paper-2 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <h2 className="reveal font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1] lg:col-span-4">Questions fréquentes</h2>
            <div className="lg:col-span-8">
              {[
                ["Faut-il savoir écrire des prompts ?", "Non. Une photo, un lien ou quelques lignes suffisent pour démarrer. La bibliothèque de prompts sert à aller plus loin, quand vous le souhaitez."],
                ["Le thème Shopify est-il vraiment installable ?", "Oui : c'est un thème Online Store 2.0 complet (sections, blocs, réglages natifs, panier latéral, recherche, pages). Vous l'importez en ZIP, ou le studio l'installe comme thème non publié si vous connectez votre boutique."],
                ["Que se passe-t-il si une information manque ?", "Elle reste visible « à compléter » dans les textes, et le studio vous pose la question. Quand vous répondez, seuls les passages concernés sont mis à jour — sans écraser ce que vous avez validé."],
                ["Mes publications partent-elles si mon ordinateur est éteint ?", "Oui. Les publications programmées sont exécutées par le serveur, avec reprises contrôlées et protection contre les doublons. Les limites propres à chaque réseau sont indiquées dans le studio."],
                ["Et Canva, CapCut ?", "Canva est relié par son API officielle (envoi, design modifiable, récupération de l'export). CapCut n'offre pas d'API publique de montage : le studio prépare un pack propre (médias, sous-titres, musique, découpage)."],
                ["Puis-je gérer plusieurs boutiques ?", "Oui, chacune avec ses fichiers, sa marque, ses comptes sociaux et son calendrier ; 40 € par boutique supplémentaire."],
              ].map(([q, a]) => (
                <details key={q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl">
                    {q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="scroll-scale relative overflow-hidden rounded-[2rem] bg-signal px-6 py-16 text-signal-ink sm:px-14 sm:py-24">
            <h2 className="max-w-3xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.95]">Votre produit mérite mieux qu'une page blanche.</h2>
            <Link href={user ? "/studio" : "/inscription"} className="mt-10 inline-flex h-13 items-center gap-2 rounded-full bg-ink px-7 font-semibold text-paper">
              Commencer avec une photo <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-10 text-sm text-muted sm:px-6">
          <Logo />
          <p>Démonstrations : produits et marques fictifs. © {new Date().getFullYear()} E-COM STUDIO IA</p>
        </div>
      </footer>
    </div>
  );
}
