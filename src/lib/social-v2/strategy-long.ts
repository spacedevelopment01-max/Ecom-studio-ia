/**
 * Stratégie de communication LONG TERME (12 mois) : vision, publics, entonnoir (faire connaître → faire confiance →
 * faire agir → fidéliser), feuille de route par trimestre, temps forts réels de l'année, rythme, indicateurs et
 * rituels de suivi. Gratuite et déterministe (aucune IA), construite sur la stratégie éditoriale et les seuls faits
 * vérifiés : aucun chiffre, résultat ni client n'est inventé. Les objectifs chiffrés restent « [À compléter] » tant
 * que les premières mesures réelles n'existent pas.
 */
import type { Project } from "../projects";
import { keyMoments } from "../engine/social-quality";
import type { Archetype, Objective, Pillar, SocialStrategy } from "./strategy";

type Tr = (fr: string, en: string) => string;
export type FunnelStage = { id: "awareness" | "trust" | "action" | "loyalty"; title: string; goal: string; share: number; pillars: string[]; content: string[]; kpis: string[] };
export type Quarter = { id: string; title: string; months: string; focus: string; pillars: string[]; rhythm: string; milestones: string[]; kpis: string[] };
export type Persona = { name: string; need: string; channel: string; confirmed: boolean };
export type LongTermStrategy = {
  horizon: string;
  vision: string;
  personas: Persona[];
  funnel: FunnelStage[];
  roadmap: Quarter[];
  moments: { label: string; date: string; month: string; prepare: string }[];
  seasons: { period: string; idea: string }[];
  rhythm: { perWeek: string; mix: string; channels: string[] };
  rituals: { when: string; what: string }[];
  kpis: { name: string; why: string; target: string }[];
  nextActions: string[];
};

const STAGE_OF: Record<Objective, FunnelStage["id"]> = { brand: "awareness", local: "awareness", educate: "trust", demonstrate: "trust", engage: "loyalty", sell: "action", convert: "action" };

/** Publics probables par type d'activité : présentés comme HYPOTHÈSES à confirmer (sauf le public déclaré). */
function personasFor(a: Archetype, t: Tr, declared: string | null, city: string | null): Persona[] {
  const near = city ? t(` autour de ${city}`, ` around ${city}`) : "";
  const list: Record<Archetype, Persona[]> = {
    trade: [
      { name: t(`Particuliers qui préparent des travaux${near}`, `Homeowners planning work${near}`), need: t("être rassurés sur le sérieux, le déroulé et le devis", "reassurance on reliability, process and quote"), channel: "Facebook, Instagram", confirmed: false },
      { name: t("Professionnels et gestionnaires (syndics, agences, commerces)", "Professionals and managers (property managers, agencies, shops)"), need: t("un artisan fiable, joignable, qui respecte les délais annoncés", "a reliable, reachable tradesperson who keeps stated deadlines"), channel: "LinkedIn, Facebook", confirmed: false },
    ],
    restaurant: [
      { name: t(`Habitants et travailleurs du quartier${near}`, `Locals and people working nearby${near}`), need: t("savoir ce qu'il y a à la carte et quand venir", "know what's on the menu and when to come"), channel: "Instagram, Facebook", confirmed: false },
      { name: t("Groupes et occasions (anniversaires, équipes)", "Groups and occasions (birthdays, teams)"), need: t("réserver facilement pour plusieurs personnes", "book easily for several people"), channel: "Facebook, Instagram", confirmed: false },
    ],
    service: [
      { name: t(`Personnes qui cherchent ce service${near}`, `People looking for this service${near}`), need: t("comprendre la prestation et le premier pas", "understand the service and the first step"), channel: "Instagram, Facebook", confirmed: false },
      { name: t("Clients déjà venus", "Past customers"), need: t("revenir et recommander", "come back and recommend"), channel: "Facebook, Instagram", confirmed: false },
    ],
    beauty: [
      { name: t("Personnes attentives à leur routine", "People who care about their routine"), need: t("savoir quand et comment utiliser le produit", "know when and how to use the product"), channel: "Instagram, TikTok, Pinterest", confirmed: false },
      { name: t("Acheteurs de cadeaux", "Gift buyers"), need: t("une idée cadeau claire, au bon moment", "a clear gift idea, at the right time"), channel: "Instagram, Pinterest", confirmed: false },
    ],
    tech: [
      { name: t("Passionnés qui comparent les caractéristiques", "Enthusiasts who compare specs"), need: t("des caractéristiques précises et une démonstration", "precise specs and a demo"), channel: "YouTube, Instagram, TikTok", confirmed: false },
      { name: t("Acheteurs pratiques", "Practical buyers"), need: t("voir le produit servir dans la vraie vie", "see the product used in real life"), channel: "Instagram, Facebook", confirmed: false },
    ],
    saas: [
      { name: t("Décideurs qui ont le problème résolu par le logiciel", "Decision makers who have the problem the software solves"), need: t("voir la valeur en démonstration", "see the value in a demo"), channel: "LinkedIn", confirmed: false },
      { name: t("Utilisateurs au quotidien", "Day-to-day users"), need: t("des méthodes et astuces d'utilisation", "methods and usage tips"), channel: "LinkedIn, YouTube", confirmed: false },
    ],
    product: [
      { name: t("Personnes qui découvrent le produit", "People discovering the product"), need: t("comprendre à quoi il sert et pour qui", "understand what it's for and who it's for"), channel: "Instagram, Facebook, Pinterest", confirmed: false },
      { name: t("Acheteurs prêts à commander", "Buyers ready to order"), need: t("lever les derniers doutes (prix, livraison, usage)", "remove the last doubts (price, delivery, use)"), channel: "Instagram, Facebook", confirmed: false },
    ],
  };
  const out = list[a];
  return declared ? [{ name: declared, need: t("public déclaré dans votre projet", "audience declared in your project"), channel: out[0].channel, confirmed: true }, ...out] : out;
}

/** Périodes propices par type d'activité (conseils généraux, à adapter : aucune promesse de résultat). */
function seasonsFor(a: Archetype, t: Tr): { period: string; idea: string }[] {
  switch (a) {
    case "trade":
      return [
        { period: t("Janvier – février", "January – February"), idea: t("projets de l'année : expliquer le déroulé d'un devis", "the year's projects: explain how a quote works") },
        { period: t("Mars – juin", "March – June"), idea: t("saison des travaux : montrer les étapes, conseils avant chantier", "work season: show the steps, pre-job advice") },
        { period: t("Septembre – novembre", "September – November"), idea: t("préparer l'hiver : entretien, isolation, rénovation intérieure", "prepare for winter: maintenance, insulation, interior work") },
      ];
    case "restaurant":
      return [
        { period: t("Printemps – été", "Spring – summer"), idea: t("produits de saison, terrasse si vous en avez une", "seasonal produce, terrace if you have one") },
        { period: t("Novembre – décembre", "November – December"), idea: t("repas de groupe et fêtes : réservation à l'avance", "group meals and holidays: book ahead") },
      ];
    case "beauty":
      return [
        { period: t("Printemps – été", "Spring – summer"), idea: t("routine adaptée à la saison (seulement les usages confirmés)", "season-appropriate routine (confirmed uses only)") },
        { period: t("Novembre – décembre", "November – December"), idea: t("idées cadeaux et coffrets existants", "gift ideas and existing sets") },
      ];
    case "saas":
      return [
        { period: t("Septembre et janvier", "September and January"), idea: t("rentrée et nouvelle année : organisation, nouvelles méthodes", "back to work and new year: organisation, new methods") },
      ];
    default:
      return [
        { period: t("Novembre – décembre", "November – December"), idea: t("fêtes de fin d'année : idée cadeau, délais de livraison réels", "year-end holidays: gift idea, real delivery times") },
        { period: t("Septembre", "September"), idea: t("rentrée : remettre le produit en avant auprès des nouveaux publics", "back to school: put the product forward to new audiences") },
      ];
  }
}

export function longTermStrategy(p: Project, s: SocialStrategy, o: { lang?: "fr" | "en"; start?: Date; perDay?: number; city?: string | null; declaredAudience?: string | null; connected?: number } = {}): LongTermStrategy {
  const lang = o.lang ?? "fr";
  const t: Tr = (fr, en) => (lang === "en" ? en : fr);
  const start = o.start ?? new Date();
  const ymd = start.toISOString().slice(0, 10);
  const monthName = (offset: number) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const span = (from: number) => `${monthName(from)} → ${monthName(from + 2)}`;
  const byStage = (id: FunnelStage["id"]) => s.pillars.filter((x) => STAGE_OF[x.objective] === id);
  const titles = (xs: Pillar[]) => xs.map((x) => x.title);
  const share = (id: FunnelStage["id"]) => Math.round(byStage(id).reduce((n, x) => n + x.share, 0) * 100);
  const services = p.business === "services";
  const conversion = s.ctas[0] ?? t("Nous contacter", "Contact us");
  const perDay = Math.max(1, o.perDay ?? 1);
  const target = t("[À compléter : objectif chiffré après 4 semaines de mesures réelles]", "[To complete: numeric target after 4 weeks of real measurements]");

  const funnel: FunnelStage[] = [
    { id: "awareness", title: t("Faire connaître", "Get known"), goal: t("être vu par les bonnes personnes, régulièrement", "be seen by the right people, regularly"), share: share("awareness"), pillars: titles(byStage("awareness")), content: [t("vidéos courtes et visuels forts", "short videos and strong visuals"), services ? t("zone d'intervention et coulisses réelles", "service area and real behind the scenes") : t("le produit dans son univers", "the product in its world")], kpis: [t("Portée", "Reach"), t("Nouveaux abonnés", "New followers")] },
    { id: "trust", title: t("Faire confiance", "Build trust"), goal: t("prouver le savoir-faire avec des faits vérifiés", "prove expertise with verified facts"), share: share("trust"), pillars: titles(byStage("trust")), content: [t("carrousels pédagogiques, réponses aux questions", "educational carousels, answers to questions"), t("démonstrations et caractéristiques confirmées", "demos and confirmed features")], kpis: [t("Enregistrements", "Saves"), t("Partages", "Shares")] },
    { id: "action", title: t("Faire agir", "Drive action"), goal: t(`transformer l'intérêt en « ${conversion} »`, `turn interest into "${conversion}"`), share: share("action"), pillars: titles(byStage("action")), content: [t("offre ou prestation précise avec un seul appel à l'action", "one precise offer or service with a single call to action"), t("rappel des informations pratiques", "reminder of practical info")], kpis: [t("Clics vers le site", "Clicks to the website"), services ? t("Demandes reçues (devis, appels, rendez-vous)", "Enquiries received (quotes, calls, bookings)") : t("Ventes issues des réseaux", "Sales from social")] },
    { id: "loyalty", title: t("Fidéliser", "Build loyalty"), goal: t("faire revenir et recommander", "bring people back and get recommendations"), share: share("loyalty"), pillars: titles(byStage("loyalty")), content: [t("questions à la communauté, réponses aux commentaires", "questions to the community, replies to comments"), t("avis réels de clients (jamais inventés)", "real customer reviews (never invented)")], kpis: [t("Commentaires", "Comments"), t("Messages reçus", "Messages received")] },
  ];

  const roadmap: Quarter[] = [
    { id: "q1", title: t("Poser les bases", "Lay the foundations"), months: span(0), focus: t("une présence régulière et reconnaissable, et une première mesure", "a regular, recognisable presence and a first baseline"), pillars: titles([...byStage("awareness"), ...byStage("trust")].slice(0, 3)), rhythm: t(`${Math.max(3, Math.min(7, perDay * 4))} publications par semaine`, `${Math.max(3, Math.min(7, perDay * 4))} posts per week`), milestones: [t("comptes reliés et profils complets (photo, description, lien)", "accounts linked and profiles complete (photo, bio, link)"), t("charte appliquée à toutes les publications", "brand guidelines applied to every post"), t("4 semaines publiées sans interruption", "4 weeks published without a gap"), t("relever les premiers chiffres (portée, abonnés, clics)", "record the first numbers (reach, followers, clicks)")], kpis: [t("Régularité (publications prévues / publiées)", "Consistency (planned / published posts)"), t("Portée moyenne", "Average reach")] },
    { id: "q2", title: t("Installer la confiance", "Build trust"), months: span(3), focus: t("prouver le savoir-faire : pédagogie, coulisses réelles, réponses aux questions", "prove expertise: education, real behind the scenes, answers to questions"), pillars: titles(byStage("trust")).length ? titles(byStage("trust")) : titles(s.pillars.slice(0, 2)), rhythm: t("garder le rythme, plus de carrousels et de vidéos courtes", "keep the pace, more carousels and short videos"), milestones: [t("une série pédagogique récurrente (ex. chaque mardi)", "a recurring educational series (e.g. every Tuesday)"), t("réutiliser les 3 publications les plus enregistrées", "reuse the 3 most-saved posts"), t("collecter de vrais avis clients avec leur accord", "collect real customer reviews with consent")], kpis: [t("Enregistrements et partages", "Saves and shares"), t("Taux d'engagement", "Engagement rate")] },
    { id: "q3", title: t("Accélérer", "Accelerate"), months: span(6), focus: t(`plus de contenus qui mènent à « ${conversion} », sans saturer`, `more content leading to "${conversion}", without overdoing it`), pillars: titles(byStage("action")).length ? titles(byStage("action")) : titles(s.pillars.slice(-2)), rhythm: t("2 contenus d'action par semaine au plus, le reste en confiance", "at most 2 action posts per week, the rest trust-building"), milestones: [t("tester une petite publicité sur la meilleure publication (budget fixé par vous)", "test a small ad on the best post (budget set by you)"), t("une page d'atterrissage claire pour chaque offre", "a clear landing page for each offer"), t("mesurer les demandes ou ventes venues des réseaux", "measure enquiries or sales coming from social")], kpis: [t("Clics vers le site", "Clicks to the website"), services ? t("Demandes reçues", "Enquiries received") : t("Ventes", "Sales")] },
    { id: "q4", title: t("Fidéliser et préparer l'année 2", "Build loyalty and prepare year 2"), months: span(9), focus: t("communauté, temps forts de fin d'année, bilan", "community, year-end key dates, review"), pillars: titles(byStage("loyalty")).length ? titles(byStage("loyalty")) : titles(s.pillars.slice(0, 2)), rhythm: t("rythme stable, contenus de saison préparés à l'avance", "steady pace, seasonal content prepared ahead"), milestones: [t("bilan de l'année : ce qui a marché, ce qui s'arrête", "year review: what worked, what stops"), t("nouvelle répartition des piliers selon les résultats réels", "new pillar mix based on real results"), t("calendrier de l'année 2 préparé", "year 2 calendar prepared")], kpis: [t("Abonnés fidèles (commentaires, messages)", "Loyal followers (comments, messages)"), t("Clients revenus ou recommandés", "Returning or referred customers")] },
  ];

  const moments = keyMoments(ymd, 365, p.product.sector ?? null, lang).map((m) => {
    const d = new Date(`${m.date}T00:00:00Z`);
    return { label: m.label, date: m.date, month: d.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }), prepare: t("préparer 2 à 3 semaines avant", "prepare 2 to 3 weeks ahead") };
  });

  const nextActions = [
    ...(o.connected ? [] : [t("Relier vos comptes dans Outils avancés › Connexions (sinon les publications sont à publier à la main).", "Link your accounts in Advanced tools › Connections (otherwise posts must be published by hand).")]),
    ...s.gaps.slice(0, 4).map((g) => t(`Compléter : ${g}`, `Complete: ${g}`)),
    t("Activer « Ma communication automatique » pour préparer chaque semaine sans y penser (rien ne part sans votre accord).", "Turn on \"My automatic communication\" to prepare each week automatically (nothing goes out without your approval)."),
  ];

  return {
    horizon: `${monthName(0)} → ${monthName(11)}`,
    vision: t(`${s.objectives[0] ?? "Être reconnu dans son domaine"}, avec une communication régulière, honnête et reconnaissable.`, `${s.objectives[0] ?? "Be recognised in your field"}, with regular, honest and recognisable communication.`),
    personas: personasFor(s.archetype, t, o.declaredAudience ?? null, o.city ?? null),
    funnel,
    roadmap,
    moments,
    seasons: seasonsFor(s.archetype, t),
    rhythm: { perWeek: t(`${Math.max(3, Math.min(14, perDay * 7))} publications par semaine au rythme actuel`, `${Math.max(3, Math.min(14, perDay * 7))} posts per week at the current pace`), mix: s.formats.slice(0, 4).map((f) => `${f.format} ${Math.round(f.share * 100)} %`).join(" · "), channels: s.channels.map((c) => `${c.platform} — ${c.why}`) },
    rituals: [
      { when: t("Chaque semaine (15 min)", "Every week (15 min)"), what: t("relire et valider les publications de la semaine suivante", "review and approve next week's posts") },
      { when: t("Chaque mois (30 min)", "Every month (30 min)"), what: t("regarder les 3 meilleures et les 3 moins bonnes publications, ajuster les piliers", "look at the 3 best and 3 weakest posts, adjust the pillars") },
      { when: t("Chaque trimestre (1 h)", "Every quarter (1 h)"), what: t("passer à l'étape suivante de la feuille de route et fixer les objectifs chiffrés", "move to the next roadmap step and set numeric targets") },
    ],
    kpis: [
      { name: t("Régularité", "Consistency"), why: t("la base de tout : publier ce qui était prévu", "the foundation: publish what was planned"), target: t("100 % des publications prévues", "100% of planned posts") },
      { name: t("Portée", "Reach"), why: t("combien de personnes voient vos contenus", "how many people see your content"), target },
      { name: t("Engagement (enregistrements, partages, commentaires)", "Engagement (saves, shares, comments)"), why: t("ce qui intéresse vraiment votre public", "what really interests your audience"), target },
      { name: services ? t("Demandes reçues", "Enquiries received") : t("Ventes issues des réseaux", "Sales from social"), why: t("le résultat qui compte pour l'activité", "the result that matters for the business"), target },
    ],
    nextActions,
  };
}
