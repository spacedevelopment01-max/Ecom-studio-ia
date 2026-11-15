/**
 * Outils communs aux sections « à tenue » du thème sur mesure (13 novembre 2026). Les sections sont rangées par
 * module (tenue.ts : le socle ; tenue-produit.ts, tenue-services.ts, tenue-recit.ts), chacun avec sa feuille
 * (public/sections/tenue.css, tenue-produit.css, tenue-services.css, tenue-recit.css). Règles d'écriture d'une section :
 * docs/sina-savoir/sections-a-tenue.md. Gratuit, sans IA.
 */
import type { LibSection, Trait } from "./library";
import type { SectionGroupId } from "./section-groups";

export const TENUE_TAG = "tenue";

export type Construction = { key: string; label: string };
export type TenueSection = LibSection & {
  /** Les façons de bâtir la section (attribut data-tn-c) ; vide : une seule. La première est celle par défaut. */
  constructions: Construction[];
  trait: Trait;
  /** Famille de sections dans la banque (sinon déduite du rôle). */
  group?: SectionGroupId;
  /** Photos impossibles à inventer (« ton équipe », « les photos de tes clients ») : jamais posée sans ses vraies photos. */
  authentic?: string;
  /** Section de cartes (familles, collections) : une seule section de cartes par page. */
  cards?: boolean;
  /** Réservée à un genre de produit ou à un métier, dit en clair au concepteur (« aliments pour animaux »). */
  only?: string;
  /** Pour un site de produits ou de services seulement (sinon les deux). */
  pour?: "produits" | "services";
  /** Les vraies données que la section lit (catalogue, prestations, avis du client…), dites au concepteur. */
  data?: string;
};

/** Photo d'exemple de la bibliothèque (public/sections/photos), posée en fond. */
export const ph = (file: string) => `style="background-image:url(photos/${file})"`;

export const sec = (o: {
  id: string; title: string; kind: string; role: string; does: string; html: string; trait: Trait;
  constructions?: Construction[]; tags?: string[]; anim?: string;
  group?: SectionGroupId; authentic?: string; cards?: boolean; only?: string; pour?: "produits" | "services"; data?: string;
}): TenueSection => ({
  id: o.id, title: o.title, kind: o.kind, does: o.does, anim: o.anim ?? "Aucune animation : la page reste calme.", family: "classique", style: null, role: o.role,
  tags: [TENUE_TAG, ...(o.tags ?? ["shop"])], demoFrame: false, html: o.html, constructions: o.constructions ?? [], trait: o.trait,
  ...(o.group ? { group: o.group } : {}), ...(o.authentic ? { authentic: o.authentic } : {}), ...(o.cards ? { cards: true } : {}),
  ...(o.only ? { only: o.only } : {}), ...(o.pour ? { pour: o.pour } : {}), ...(o.data ? { data: o.data } : {}),
});

/** Un volet qui s'ouvre (sans script) : question ou titre, puis sa réponse. */
export const VOLET = (q: string, a: string, open = false) => `<details${open ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`;
