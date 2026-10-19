/**
 * Les trois catégories visibles d'un projet (consigne du 19 octobre, issue #137) :
 *   - « Prestations de services » (clé technique `services`) : une activité qui vend du temps, un savoir-faire, un
 *     rendez-vous ou un devis ; jamais de fiche produit ni de panier imposés ;
 *   - « E-commerce » (clé `catalog`) : un catalogue de produits organisé en collections ;
 *   - « Boutique spécialisée » (clé `specialty`, ancien libellé « dropshipping », remplacé) : une expérience de vente
 *     ciblée autour d'une offre resserrée (un produit phare ou quelques références du même univers). Elle décrit une
 *     façon de vendre, pas la provenance des produits, et n'impose pas un seul produit.
 *
 * La clé technique est stable (enregistrée dans les réglages du projet et les métadonnées de compatibilité) ; le libellé
 * se change ici sans toucher au reste. Module sans dépendance serveur : lu par l'interface.
 */
import type { Lang } from "../i18n";

export type StoreKind = "services" | "catalog" | "specialty";
export const STORE_KINDS: StoreKind[] = ["services", "catalog", "specialty"];

export const STORE_KIND_INFO: Record<StoreKind, { label: { fr: string; en: string }; hint: { fr: string; en: string } }> = {
  services: {
    label: { fr: "Prestations de services", en: "Services" },
    hint: { fr: "Rendez-vous, devis, accompagnement : le site présente l'activité et mène au contact, sans panier.", en: "Appointments, quotes, support: the website presents the business and leads to contact, without a cart." },
  },
  catalog: {
    label: { fr: "E-commerce", en: "E-commerce" },
    hint: { fr: "Un catalogue de produits organisé en collections, avec recherche et filtres.", en: "A product catalog organized into collections, with search and filters." },
  },
  specialty: {
    label: { fr: "Boutique spécialisée", en: "Specialty store" },
    hint: { fr: "Une offre resserrée (un produit phare ou quelques références d'un même univers) racontée comme une page de vente.", en: "A focused offer (a hero product or a few references from one world) told like a sales page." },
  },
};

export const storeKindLabel = (kind: StoreKind, lang: Lang = "fr") => STORE_KIND_INFO[kind].label[lang === "en" ? "en" : "fr"];

export type StoreKindInput = {
  business: "products" | "services";
  storeType: "mono" | "multi" | "niche";
  /** Nombre de produits du catalogue en plus du produit principal. */
  catalogSize: number;
  /** Catégorie confirmée ou corrigée par le client (réglages du projet) : prime sur toute déduction. */
  override?: StoreKind | null;
  /** Objectif principal retenu par la stratégie ou le brief, quand il est connu (achat, devis, rendez-vous…). */
  objective?: "purchase" | "quote" | "appointment" | "contact" | null;
  /** Catégorie recommandée par le parcours amont (contrat Codex), quand elle existe. */
  prepared?: StoreKind | null;
};

export type StoreKindVerdict = {
  kind: StoreKind;
  /** « sure » : la catégorie ne fait pas de doute ; « ask » : le studio doit poser la question simplement au client. */
  confidence: "sure" | "ask";
  /** D'où vient la décision : réglage du client, contrat du parcours amont, ou règles locales sur les données du projet. */
  source: "client" | "preparation" | "rules";
  reasons: { fr: string; en: string }[];
  /** Question à poser quand la catégorie est ambiguë (vide sinon). */
  question?: { fr: string; en: string };
};

/**
 * Classe un projet d'après ses données (type d'entreprise, modèle de vente, taille du catalogue, objectif) — jamais
 * d'après le seul nom du produit. Une vraie ambiguïté (catalogue de niche de taille moyenne, objectif inconnu) remonte
 * une question au lieu d'une décision silencieuse.
 */
export function storeKindOf(input: StoreKindInput): StoreKindVerdict {
  if (input.override) {
    return { kind: input.override, confidence: "sure", source: "client", reasons: [{ fr: "Catégorie confirmée par le client dans les réglages du projet.", en: "Category confirmed by the client in the project settings." }] };
  }
  if (input.business === "services") {
    return {
      kind: "services", confidence: "sure", source: "rules",
      reasons: [{ fr: "Projet créé comme site d'entreprise de services : l'activité vend des prestations, aucune fiche produit ni panier n'est imposé.", en: "Project created as a services business website: the activity sells services; no product page or cart is imposed." }],
    };
  }
  if (input.objective === "quote" || input.objective === "appointment") {
    return {
      kind: "services", confidence: "ask", source: "rules",
      reasons: [{ fr: "Projet de produits mais objectif principal « devis » ou « rendez-vous » : le modèle de vente ressemble à une prestation.", en: "Products project but the main objective is a quote or an appointment: the sales model looks like a service." }],
      question: { fr: "Votre site sert-il à vendre des produits en ligne, ou à obtenir des demandes (devis, rendez-vous) ?", en: "Is your website meant to sell products online, or to receive requests (quotes, appointments)?" },
    };
  }
  if (input.prepared) {
    return { kind: input.prepared, confidence: "sure", source: "preparation", reasons: [{ fr: "Catégorie recommandée par le parcours amont (analyse du projet : offre, modèle de vente, objectifs).", en: "Category recommended by the preparation journey (project analysis: offer, sales model, objectives)." }] };
  }
  if (input.storeType === "multi") {
    return { kind: "catalog", confidence: "sure", source: "rules", reasons: [{ fr: "Boutique multi-produit : un catalogue varié organisé en collections.", en: "Multi-product store: a varied catalog organized into collections." }] };
  }
  if (input.storeType === "mono") {
    return { kind: "specialty", confidence: "sure", source: "rules", reasons: [{ fr: "Boutique mono-produit : toute la boutique raconte une offre ciblée.", en: "Single-product store: the whole store tells one focused offer." }] };
  }
  // Niche : quelques produits d'un même univers → boutique spécialisée tant que le catalogue reste resserré ;
  // au-delà, la frontière avec un e-commerce dépend du client.
  if (input.catalogSize <= 5) {
    return { kind: "specialty", confidence: "sure", source: "rules", reasons: [{ fr: `Boutique de niche avec un catalogue resserré (${input.catalogSize + 1} référence(s)) : une expérience de vente ciblée.`, en: `Niche store with a focused catalog (${input.catalogSize + 1} reference(s)): a targeted selling experience.` }] };
  }
  return {
    kind: input.catalogSize >= 12 ? "catalog" : "specialty", confidence: "ask", source: "rules",
    reasons: [{ fr: `Boutique de niche avec ${input.catalogSize + 1} références : entre une offre ciblée et un catalogue.`, en: `Niche store with ${input.catalogSize + 1} references: between a focused offer and a catalog.` }],
    question: { fr: "Votre boutique est-elle plutôt une boutique spécialisée (une offre resserrée, racontée) ou un e-commerce (un catalogue à explorer) ?", en: "Is your store more a specialty store (a focused, narrated offer) or an e-commerce site (a catalog to browse)?" },
  };
}
