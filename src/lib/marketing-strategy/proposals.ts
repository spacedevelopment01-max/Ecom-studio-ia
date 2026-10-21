/** Evidence-led local preparation; these are creative hypotheses, never fabricated market research. */
import { memory, type Project } from "../projects";
import { applyWordingDeep, loadWordingRules } from "../client-wording";
import { createHash } from "node:crypto";
import { canonicalJSON } from "../brain/hash";
import type { MarketingAngle, StrategySource } from "./types";
import { englishAngles, GENERALIST_EXPLANATION_EN } from "./proposals-en";
export { GENERALIST_EXPLANATION_EN } from "./proposals-en";
export const GENERALIST_EXPLANATION =
  "En cherchant à parler à tout le monde, votre message peut devenir moins précis et moins marquant. Un angle ciblé aide une personne à se reconnaître dans votre offre. L'approche généraliste reste possible si elle correspond à votre objectif.";
export function inputDigest(p: Project) {
  const brand = p.brand
    ? (({
        direction,
        paletteMode,
        generatedBy,
        checks,
        validated,
        alternatives,
        taglineAlternatives,
        ...identity
      }) => identity)(p.brand)
    : null;
  return createHash("sha256")
    .update(
      canonicalJSON({
        business: p.business,
        language: p.settings.language ?? "fr",
        product: p.product,
        services: p.services,
        catalog: p.catalog,
        brand,
        strategy: p.strategy,
        sources: p.sources,
        constraints: memory(p.id)
          .filter(
            (m) =>
              m.source === "user" &&
              m.status === "confirmed" &&
              ["correction", "preference", "goal", "fact"].includes(m.kind),
          )
          .map((m) => ({
            kind: m.kind,
            key: m.key,
            value: m.value,
            scope: m.scope,
          })),
      }),
    )
    .digest("hex");
}
export function proposalAnalysis(p: Project) {
  const facts = p.product.facts.filter(
    (f) => f.status === "confirmed" && f.value.trim(),
  );
  const sources: StrategySource[] = [
    ...(p.product.name
      ? [
          {
            kind: "client" as const,
            label: "Offre renseignée",
            value: p.product.name,
          },
        ]
      : []),
    ...(p.product.summary
      ? [
          {
            kind: "client" as const,
            label: "Description du projet (non vérifiée extérieurement)",
            value: p.product.summary,
          },
        ]
      : []),
    ...facts.map((f) => ({
      kind: "confirmed_fact" as const,
      label: f.label,
      value: f.value,
      ref: f.source,
    })),
    ...p.services.services
      .filter((s) => s.name)
      .map((s) => ({
        kind: "client" as const,
        label: "Prestation renseignée",
        value: [s.name, s.description, s.duration, s.price]
          .filter(Boolean)
          .join(" — "),
      })),
  ];
  const missingQuestions: { key: string; question: string }[] = [];
  if (!p.product.name.trim() && !p.services.services.some((s) => s.name.trim()))
    missingQuestions.push({
      key: "offer",
      question: "Quel produit ou quelle prestation proposez-vous précisément ?",
    });
  if (
    !p.product.summary.trim() &&
    !p.services.services.some((s) => s.description?.trim())
  )
    missingQuestions.push({
      key: "usage",
      question:
        "Dans quelle situation votre offre est-elle utilisée, et quel besoin concret aide-t-elle à traiter ?",
    });
  // An AI persona from the old brand phase is not evidence of a validated market. Keep it labelled as a hypothesis.
  const audienceFact = facts.find((f) =>
    /cible|audience|public|client.*(type|profil)/i.test(f.label),
  );
  const audience =
    audienceFact?.value ||
    p.brand?.audience?.trim() ||
    p.strategy?.audience?.[0]?.label?.trim();
  if (audience && !audienceFact)
    sources.push({
      kind: "creative_hypothesis",
      label: "Cible de travail héritée, à valider",
      value: audience,
    });
  for (const source of [...p.sources, ...p.product.sources])
    if (source.type === "link")
      sources.push({
        kind: "client",
        label:
          "Lien fourni, contenu et date non vérifiés par cette préparation locale",
        value:
          "Référence à consulter avant toute affirmation de marché ou de concurrence.",
        ref: source.ref,
      });
  const limits = [
    "Aucune étude de marché ou concurrence vérifiée par ce calcul local. Les cibles et motivations proposées sont des hypothèses créatives à confronter au terrain.",
    "Aucune promesse de ventes, résultat chiffré ou caractéristique nouvelle. Les informations produit et l’identité validée restent inchangées.",
  ];
  if (p.settings.language === "en") {
    const labels: Record<string, string> = {
      "Offre renseignée": "Supplied offer",
      "Description du projet (non vérifiée extérieurement)":
        "Project description (not externally verified)",
      "Prestation renseignée": "Supplied service",
      "Cible de travail héritée, à valider":
        "Inherited working audience, to validate",
      "Lien fourni, contenu et date non vérifiés par cette préparation locale":
        "Supplied link; contents and date not verified by this local preparation",
    };
    for (const source of sources) {
      source.label = labels[source.label] ?? source.label;
      if (source.ref && source.kind === "client")
        source.value =
          "Reference to review before any market or competitor claim.";
    }

    for (const q of missingQuestions)
      q.question =
        q.key === "offer"
          ? "Which product or service do you offer, precisely?"
          : "In which situation is your offer used, and which concrete need does it help address?";
    limits.splice(
      0,
      limits.length,
      "No market or competitor research has been verified by this local preparation. Audiences and motivations are creative hypotheses to validate in practice.",
      "No sales promise, numerical result or new product characteristic. Known facts and the validated identity are preserved.",
    );
  }
  return { sources, missingQuestions, limits, facts, audience };
}
export function buildAngles(p: Project): MarketingAngle[] {
  const a = proposalAnalysis(p),
    name = p.product.name || p.services.services[0]?.name || p.name;
  const service = p.business === "services",
    offer = p.services.services[0],
    detail = a.facts[0]
      ? `${a.facts[0].label} : ${a.facts[0].value}`
      : offer?.description || p.product.summary;
  const summary = p.product.summary || offer?.description || "";
  const cta = service
    ? p.services.contactMode === "booking"
      ? "Préparer mon rendez-vous"
      : p.services.contactMode === "quote"
        ? "Parler de mon projet"
        : "Découvrir la prestation"
    : `Découvrir ${name}`;
  const proof = a.facts
    .map((f) => `${f.label} : ${f.value}`)
    .concat(
      service
        ? p.services.services.map((s) =>
            [s.name, s.description, s.duration, s.price]
              .filter(Boolean)
              .join(" — "),
          )
        : [],
    );
  const usageFact = a.facts.find((f) =>
    /usage|utilisation|besoin|contexte|occasion/i.test(f.label),
  );
  const use =
    usageFact?.value ||
    summary.match(/\bpour\s+([^.!?]+)/i)?.[1]?.trim() ||
    (service ? offer?.description : undefined) ||
    summary;
  const audience =
    a.audience || `les personnes intéressées par ${p.product.category || name}`;
  const need = p.strategy?.audience?.flatMap((x) => x.needs).filter(Boolean)[0];
  const inheritedObjection =
    p.strategy?.audience?.flatMap((x) => x.objections).filter(Boolean)[0] ||
    p.strategy?.platform?.objections?.[0]?.objection;
  const distinctive =
    a.facts.find((f) =>
      /mati[eè]re|finition|style|couleur|format|contenance|dur[eé]e|zone/i.test(
        f.label,
      ),
    ) || a.facts[0];
  const personalDetail = distinctive
    ? `${distinctive.label.toLowerCase()} : ${distinctive.value}`
    : p.product.category || name;
  const shared = {
    source: "creative_hypothesis" as const,
    sources: a.sources,
    proofs: proof,
    exclusions: [
      ...p.product.claimsToAvoid,
      "Ne pas inventer de performances, garanties, avis, prix ou certification.",
      "Aucune personne sans autorisation appropriée ; aucune marque externe.",
    ],
    limits: [
      "Cible et motivation à valider avec le client ; pas un persona prouvé.",
      ...(!proof.length
        ? [
            "Preuve indépendante absente : rester descriptif sur les faits fournis.",
          ]
        : []),
    ],
  };
  const make = (
    v: Omit<MarketingAngle, keyof typeof shared>,
  ): MarketingAngle => ({ ...shared, ...v });
  const angles: MarketingAngle[] = [
    make({
      id: "usage",
      title: service
        ? "Faire place au projet dans sa vie"
        : "Le bon objet, au bon moment",
      audience: `${audience}, lorsque leur priorité est l’usage : ${use || name}.`,
      situation: service
        ? `Avant de réserver ${name} : ${use}. Le premier pas et le déroulement sont les points de décision.`
        : `Quand le besoin se présente : ${use}. ${name} est montré dans ce contexte précis.`,
      notPriority:
        "Les personnes recherchant avant tout un signe de distinction ou une découverte sans usage défini.",
      tension: service
        ? "Avoir envie de commencer, sans savoir comment faire le premier pas."
        : "Vouloir profiter de l’usage sans ajouter de complications au quotidien.",
      motivation: service
        ? `Oser commencer ${p.product.category || name}, dans le contexte décrit : ${use}.`
        : `Retrouver un moment plus simple autour de cet usage : ${use}.`,
      benefit: detail,
      promise: service
        ? `Comprendre comment se déroule ${name} avant de s’engager.`
        : `Trouver la place de ${name} dans votre quotidien.`,
      rationale: `Le récit part de l’usage décrit dans le projet : ${summary}`,
      objections: [
        {
          objection: service
            ? "Comment se passe le premier rendez-vous ?"
            : "Est-ce adapté à mon usage ?",
          answer:
            "Montrer le déroulé et les caractéristiques renseignées, puis demander les détails absents.",
        },
      ],
      tone: "Direct, concret, chaleureux ; phrases courtes centrées sur le geste.",
      messages: [
        service
          ? `${name}, un premier pas à votre rythme.`
          : `${name}, pour ce moment précis.`,
        use || summary,
        detail,
      ],
      visualDirection: service
        ? `Montrer les lieux et le matériel réellement fournis pour ${name}, puis les étapes ; ne pas faire passer une scène générée pour une réalisation.`
        : `Placer ${name} entier dans son contexte d’utilisation ; alterner vue d’ensemble et détail utile, en préservant formes, logo et proportions.`,
      examples: {
        hero: service
          ? `${name} : et si vous faisiez le premier pas ?`
          : `Faites une place à ${name}.`,
        subtext: summary,
        cta,
        advertisement: service
          ? `Le projet vous tente ? Découvrez le déroulé de ${name} et préparez votre première demande.`
          : `Un besoin concret, un objet à comprendre : découvrez comment ${name} s’utilise, puis choisissez en connaissance de cause.`,
      },
    }),
    make({
      id: "reassurance",
      title: "Choisir en sachant pourquoi",
      audience: `${audience}, dans une démarche de comparaison de ${p.product.category || name} ; priorité aux éléments vérifiables plutôt qu’à l’impulsion.`,
      situation: `Avant de choisir ${name}, la personne compare ${personalDetail}${inheritedObjection ? ` et se demande : ${inheritedObjection}` : ". Les éléments utiles restent à vérifier."}`,
      notPriority:
        "Les achats d’impulsion et les personnes déjà décidées sans besoin de comparaison.",
      tension:
        "Avoir peur de faire le mauvais choix ou de découvrir une contrainte trop tard.",
      motivation: `Être rassuré sur son propre choix de ${p.product.category || name}, en comprenant ${personalDetail}.`,
      benefit: detail,
      promise: `Les informations sur ${name}, clairement exposées pour décider.`,
      rationale: `Les éléments disponibles peuvent soutenir la décision sans prétendre que ${name} surpasse ses concurrents.`,
      objections: [
        {
          objection: "Qu’est-ce qui me permet de choisir cette offre ?",
          answer:
            proof[0] ||
            "Demander une preuve ou un détail concret au client ; ne pas inventer de supériorité.",
        },
      ],
      tone: "Posé, précis, transparent sur les limites ; aucun superlatif.",
      messages: [
        `${name}, à regarder de près.`,
        detail,
        `Les détails utiles pour choisir ${p.product.category || name} en connaissance de cause.`,
      ],
      visualDirection: `Gros plans lisibles de ${name} ou du matériel de la prestation, annotations limitées aux faits fournis, séquences de vérification ; aucune fausse comparaison ni sceau de certification.`,
      examples: {
        hero: `${name}. Les détails avant la décision.`,
        subtext: detail,
        cta: service ? "Poser mes questions" : "Voir les détails",
        advertisement: `Avant de choisir ${name}, regardez ce qui compte pour vous : ${detail}. Les autres précisions se demandent, elles ne s’inventent pas.`,
      },
    }),
    make({
      id: "expression",
      title: service
        ? "Un projet qui vous ressemble"
        : "Une place dans votre univers",
      audience: `${audience}, quand l’accord avec leurs goûts ou leur projet personnel compte davantage que la comparaison technique de ${p.product.category || name}.`,
      situation: service
        ? `Préparer une demande personnelle autour de ${name} : expliquer son intention, ses contraintes et ses préférences avant l’échange.`
        : `Composer son propre univers avec ${name} ; porter son attention sur ${personalDetail} plutôt que sur une course aux performances.`,
      notPriority:
        "Les personnes qui cherchent exclusivement un prix bas ou une performance chiffrée.",
      tension:
        "Ne pas vouloir d’un choix impersonnel qui ne correspond pas à sa façon de vivre.",
      motivation: `Se reconnaître dans sa manière de choisir ${name}${need ? ` ; besoin exprimé dans le projet : ${need}` : ""}, sans se conformer à un modèle imposé.`,
      benefit: detail,
      promise: service
        ? `Donner une intention personnelle à votre demande autour de ${name}.`
        : `Découvrir comment ${name} dialogue avec votre univers.`,
      rationale: `La proposition explore la relation à ${name}, sans modifier son apparence ni affirmer un effet émotionnel prouvé.`,
      objections: [
        {
          objection: "Est-ce que cette offre correspond à mes préférences ?",
          answer:
            "Présenter les finitions, possibilités et limites réellement fournies ; ne pas inventer de personnalisation.",
        },
      ],
      tone: "Éditorial, sensible et sobre ; parler de choix personnel sans injonction.",
      messages: [
        `Votre façon d’aborder ${name}.`,
        `${name}, dans votre univers.`,
        detail,
      ],
      visualDirection: service
        ? `Composition éditoriale des lieux et outils fournis ; détails de matières et intentions autour de ${name}, sans faux portrait ni faux chantier.`
        : `Grande image de ${name} dans un environnement cohérent avec ses matières et couleurs connues ; détails de finition, respiration et lumière, pas de modification du produit.`,
      examples: {
        hero: service
          ? `Votre projet. Votre façon de l’aborder.`
          : `${name}, dans votre univers.`,
        subtext: `${summary} Découvrez les détails qui vous parlent, sans vous laisser imposer un style.`,
        cta: service ? "Présenter mon projet" : "Explorer les finitions",
        advertisement: `Il n’y a pas une seule façon d’aimer ${name}. Regardez ses détails, imaginez sa place dans votre univers et choisissez ce qui vous correspond.`,
      },
    }),
    make({
      id: "discovery",
      title: service
        ? "S’autoriser à découvrir"
        : "La curiosité comme premier pas",
      audience: `Les personnes qui découvrent ${p.product.category || name} et ne se reconnaissent pas encore dans le vocabulaire ou les habitudes des connaisseurs.`,
      situation: `Première découverte de ${name}, avant une demande ${service ? "de rendez-vous" : "d’achat"} : comprendre ${personalDetail} et l’usage décrit (${use}).`,
      notPriority:
        "Les experts qui connaissent déjà l’offre et cherchent uniquement des données avancées.",
      tension:
        "Avoir envie de découvrir, mais craindre de ne pas savoir ou de ne pas être à sa place.",
      motivation: `Se sentir légitime à découvrir ${p.product.category || name} sans devoir déjà en maîtriser les codes.`,
      benefit: detail,
      promise: `Entrer dans l’univers de ${name} par une explication accessible.`,
      rationale: `Une porte d’entrée pédagogique à ${p.product.category || name} permet de présenter l’offre sans supposer une expertise.`,
      objections: [
        {
          objection: "Dois-je déjà m’y connaître ?",
          answer:
            "Expliquer le vocabulaire et le déroulé ; ne pas prétendre convenir à tous les niveaux si cela n’est pas confirmé.",
        },
      ],
      tone: "Accueillant, curieux, pédagogique ; jamais condescendant.",
      messages: [
        `Découvrir ${name} à son rythme.`,
        summary,
        `${personalDetail}. Un premier détail pour entrer dans l’univers de ${name}.`,
      ],
      visualDirection: `Séquence de découverte de ${name} : vue entière, détails puis usage ; cadrage ouvert et hiérarchie progressive. Montrer les vraies ressources du projet, sans personne ajoutée.`,
      examples: {
        hero: `Et si vous découvriez ${name} autrement ?`,
        subtext: `${summary} Prenez le temps d’en comprendre les détails, un à un.`,
        cta: service ? "Découvrir le déroulé" : "Commencer la découverte",
        advertisement: `Vous découvrez ${p.product.category || name} ? Commencez par ${name} : une présentation simple, les informations disponibles et vos questions avant toute décision.`,
      },
    }),
    make({
      id: "generalist",
      title: "Généraliste",
      audience: `Les personnes intéressées par ${name}, sans cible prioritaire définie.`,
      situation:
        "Une présentation d’ensemble destinée à plusieurs usages ou publics.",
      notPriority:
        "Aucun public écarté par principe ; pas de promesse de convenir à tout le monde.",
      tension: "Comprendre rapidement ce qui est proposé avant d’approfondir.",
      motivation:
        "Avoir une vue d’ensemble équilibrée et décider de ce que l’on souhaite explorer.",
      benefit: detail,
      promise: `Comprendre l’offre ${name} et accéder à ses informations essentielles.`,
      rationale: GENERALIST_EXPLANATION,
      objections: [
        {
          objection: "Que proposez-vous et où trouver les détails ?",
          answer: summary,
        },
      ],
      tone: "Clair, accueillant et informatif ; bénéfices uniquement étayés.",
      messages: [
        summary,
        detail,
        `${name} : les détails de l’offre et les réponses à vos questions.`,
      ],
      visualDirection: `Vue d’ensemble de ${name}, puis détails, usages et informations pratiques ; conserver son identité et ne pas réduire le visuel à un logo ou une affiche générique.`,
      examples: {
        hero: `Découvrez ${name}.`,
        subtext: summary,
        cta,
        advertisement: `${name} — ${summary} Consultez les détails de l’offre et trouvez les réponses à vos questions.`,
      },
    }),
  ];
  return applyWordingDeep(
    p.settings.language === "en" ? englishAngles(p, a.sources) : angles,
    loadWordingRules(p.id),
  );
}
