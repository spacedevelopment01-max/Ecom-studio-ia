/**
 * Rôles de contenu des sections (consigne de Thomas du 21 octobre 2026, 19 h 50, § 4 « adaptation client »).
 *
 * Une section n'est pas qu'un type : elle a un RÔLE dans le parcours (faire se reconnaître, montrer l'idée, prouver par
 * les faits, faire se projeter, aider à choisir, lever une objection, rassurer, appeler à l'action, recueillir un
 * contact). Ce registre dit, pour chaque type de section du catalogue actif, quel rôle elle tient et quels champs de
 * l'angle marketing du projet (contrat de Codex, `MarketingAngle` dans src/lib/marketing-strategy/types.ts) doivent
 * nourrir son titre et son texte. Il ne rédige rien : c'est le moteur central (section-copy-*) qui écrit, à partir de
 * l'angle actif du client. Ici, seulement la carte « rôle → champs » et ce qu'il ne faut jamais écrire.
 *
 * Exemples avant / après tirés des démonstrations réécrites : docs/coordination/ROLES-CONTENU-THEMES.md.
 */

/** Champs de l'angle marketing (noms du contrat `MarketingAngle`, sans dépendance à son module). */
export type AngleField =
  | "audience" | "situation" | "tension" | "motivation" | "benefit" | "promise" | "proofs" | "objections" | "limits"
  | "tone" | "messages" | "exclusions" | "examples.hero" | "examples.subtext" | "examples.cta";

export type ContentRoleId =
  | "hook" | "idea" | "facts" | "usage" | "choice" | "method" | "objections" | "proof" | "call" | "collect" | "story"
  | "practical" | "structural";

export type ContentRole = {
  id: ContentRoleId;
  /** Ce que la section doit accomplir pour le visiteur. */
  job: string;
  /** Champs de l'angle qui nourrissent le titre (dans l'ordre de préférence). */
  heading: AngleField[];
  /** Champs de l'angle qui nourrissent le texte. */
  text: AngleField[];
  /** Ce qui ne doit jamais être écrit dans ce rôle. */
  never: string;
};

export const CONTENT_ROLES: Record<ContentRoleId, ContentRole> = {
  hook: { id: "hook", job: "Le visiteur se reconnaît dans sa situation et comprend en une phrase ce que l'offre change.", heading: ["examples.hero", "promise"], text: ["examples.subtext", "tension", "situation"], never: "Un slogan interchangeable, une note ou un avis, une urgence." },
  idea: { id: "idea", job: "Une seule phrase qui pose l'angle, sans le répéter ailleurs mot pour mot.", heading: ["promise", "benefit"], text: ["motivation"], never: "Reprendre l'accroche de l'ouverture." },
  facts: { id: "facts", job: "Montrer ce que l'on voit ou sait vraiment : détails visibles, finitions, données fournies.", heading: ["benefit"], text: ["proofs"], never: "Une caractéristique, un chiffre ou une matière non fournis (dire « non renseigné » ou masquer)." },
  usage: { id: "usage", job: "Faire se projeter : un lieu, un moment, un geste concret de la cible.", heading: ["situation", "messages"], text: ["situation", "benefit"], never: "« En situation », « Chez vous », « Au quotidien » sans scène précise." },
  choice: { id: "choice", job: "Aider à choisir : quelle pièce, quelle offre, pour qui.", heading: ["benefit", "messages"], text: ["audience", "benefit"], never: "Une remise sur un prix de référence inventé, un stock ou un délai fictifs." },
  method: { id: "method", job: "Dire comment cela se passe, étape par étape, avec ce qui est réellement convenu.", heading: ["situation"], text: ["proofs", "limits"], never: "Un délai, un transporteur ou un tarif non fournis." },
  objections: { id: "objections", job: "Répondre aux vraies hésitations de la cible, puis dire en une question ce que permet la démonstration.", heading: ["objections"], text: ["objections", "limits"], never: "Une réponse qui invente (livraison, garantie, propriété) ; une question sans réponse affichée." },
  proof: { id: "proof", job: "Montrer des preuves réelles (avis, références, engagements) fournies par le client.", heading: ["proofs"], text: ["proofs", "limits"], never: "Un avis, une note, un témoignage ou une garantie inventés, même étiquetés « fictif » : section vide et honnête, ou masquée." },
  call: { id: "call", job: "Un appel final qui reprend la situation du début, avec un bouton qui dit où il mène.", heading: ["motivation", "examples.cta"], text: ["benefit"], never: "« Commander » quand l'achat est désactivé ; une urgence." },
  collect: { id: "collect", job: "Recueillir un contact en disant exactement ce que l'on recevra.", heading: ["tone"], text: ["tone"], never: "Une promesse d'offre ou de nouveauté non prévue." },
  story: { id: "story", job: "Raconter pourquoi la marque existe, à partir de ce que le client a fourni.", heading: ["motivation", "promise"], text: ["motivation", "limits"], never: "Un fondateur, une date, un atelier ou un chiffre inventés." },
  practical: { id: "practical", job: "Coordonnées, horaires, zones : seulement s'ils sont connus.", heading: [], text: [], never: "Une adresse ou un horaire inventés (section masquée sinon)." },
  structural: { id: "structural", job: "Gabarit de page (panier, recherche, page légale) : pas d'angle.", heading: [], text: [], never: "Un texte légal ou une politique inventés." },
};

const ROLE_TYPES: Record<Exclude<ContentRoleId, "structural">, string[]> = {
  hook: ["cv-hero", "ed-opening", "fs-campaign"],
  idea: ["ed-statement", "rich-text"],
  facts: ["features-grid", "cv-feature", "ed-finishes", "cv-hotspots", "cv-specs", "cv-ingredients", "content-tabs", "stats", "marquee", "fs-dimensions", "fs-care", "fs-making", "fs-equipment", "ed-study"],
  usage: ["ed-scene", "ed-diptych", "cv-stories", "cv-gallery", "cv-alternating", "cv-cards", "fs-lookbook", "image-with-text", "ref-narrative", "portfolio", "fs-video", "fs-needs", "fs-case"],
  choice: ["featured-purchase", "purchase-offers", "comparison-table", "fs-products", "fs-collections", "product-recommendations", "services-list", "pricing", "cv-banner"],
  method: ["timeline", "how-to", "cv-steps", "booking", "booking-calendar", "fs-service"],
  objections: ["faq", "v2-faq"],
  proof: ["cv-reviews", "testimonials", "cv-quote", "fs-reviews", "fs-press", "fs-references", "fs-results", "fs-credentials", "cv-guarantee", "fs-commitments"],
  call: ["cta-banner"],
  collect: ["newsletter", "newsletter-media", "contact-form", "ed-contact"],
  story: ["about", "team", "fs-journal", "cv-article"],
  practical: ["practical-info", "fs-stores"],
};

/** Type de section → rôle. */
export const SECTION_CONTENT_ROLE: Record<string, ContentRoleId> = Object.fromEntries(
  Object.entries(ROLE_TYPES).flatMap(([role, types]) => types.map((t) => [t, role as ContentRoleId])),
);

/** Rôle d'un type de section ; gabarits (`main-*`, page légale…) : « structural » ; type inconnu : null. */
export function contentRole(type: string): ContentRole | null {
  const id = SECTION_CONTENT_ROLE[type] ?? (type.startsWith("main-") || type === "legal-page" ? "structural" : null);
  return id ? CONTENT_ROLES[id] : null;
}

/** Titres génériques interchangeables : à remplacer par un titre tiré de l'angle (rôle de la section). */
export const GENERIC_TITLES = ["En situation", "Chez vous", "Au quotidien", "Au fil de la journée", "Le détail qui change tout", "Ils en parlent", "Envie de changer", "Recevez nos nouvelles", "Pourquoi nous choisir"];
