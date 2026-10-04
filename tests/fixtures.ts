import { buildSpec } from "@/lib/theme/directions";
import { localCopy } from "@/lib/engine/local-copy";
import { emptyProduct } from "@/lib/project-types";
import type { DirectionId } from "@/lib/theme/directions";
import { runWithLang } from "@/lib/i18n-server";
import { serviceTermsHtml } from "@/lib/engine/services-text";

export const product = {
  ...emptyProduct(),
  name: "Sérum Éclat",
  sector: "beaute" as const,
  facts: [
    { key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed" as const, source: "photo" as const },
    { key: "shipping", label: "Livraison", value: "", status: "unknown" as const, source: "ai" as const },
  ],
};

export const catalogSample = {
  products: [
    { title: "Brosse nettoyante", handle: "brosse-nettoyante", vendor: "Maison Ondine", description_html: "<p>Brosse</p>", price: 2490, compare_at_price: 2990, currency: "EUR", options: [], variants: [], images: ["es-packshot.jpg"], tags: ["Soin du visage"] },
    { title: "Rouleau de jade", handle: "rouleau-de-jade", vendor: "Maison Ondine", description_html: "<p>Rouleau</p>", price: 1990, compare_at_price: null, currency: "EUR", options: ["Pierre"], variants: [{ title: "Jade", options: ["Jade"], price: 1990, available: true }, { title: "Quartz rose", options: ["Quartz rose"], price: 2190, available: true }], images: ["es-packshot.jpg"], tags: ["Outils"] },
  ],
  collections: [
    { handle: "soin-du-visage", title: "Soin du visage", description: "", products: ["serum-eclat", "brosse-nettoyante"] },
    { handle: "outils", title: "Outils", description: "", products: ["rouleau-de-jade"] },
  ],
};

export function sampleSpec(direction: DirectionId = "atelier", storeType: "mono" | "multi" | "niche" = "mono") {
  const copy = localCopy(product, { name: "Maison Ondine", tagline: "Le soin, simplement.", story: "", values: [] });
  return buildSpec({
    direction,
    shopName: "Maison Ondine",
    palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" },
    copy,
    images: { hero: "es-hero.jpg", cutout: "es-cutout.webp", packshot: "es-packshot.jpg" },
    files: {},
    product: { title: "Sérum Éclat", handle: "serum-eclat", vendor: "Maison Ondine", description_html: "<p>Desc</p>", price: 3490, compare_at_price: null, currency: "EUR", options: ["Contenance"], variants: [{ title: "30 ml", options: ["30 ml"], price: 3490, available: true }, { title: "50 ml", options: ["50 ml"], price: 4990, available: true }], images: ["es-packshot.jpg"], tags: [] },
    ...(storeType === "mono" ? {} : { storeType, ...catalogSample }),
  });
}

/** Entreprise de services (cabinet de kinésithérapie) : prestations, coordonnées et prise de rendez-vous. */
export const serviceProfile = {
  services: [
    { name: "Séance de kinésithérapie", description: "Bilan, rééducation et conseils adaptés à votre situation.", price: "50 €", duration: "45 min" },
    { name: "Rééducation sportive", description: "Reprise progressive après une blessure.", price: "60 €", duration: "1 h" },
    { name: "Massage bien-être", description: "Détente musculaire en fin de semaine.", price: "", duration: "30 min" },
  ],
  area: "Lyon 6e et alentours",
  address: "12 rue Vendôme\n69006 Lyon",
  phone: "04 72 00 00 00",
  email: "contact@cabinet-ondine.fr",
  hours: "Lundi – vendredi : 8 h – 19 h\nSamedi : 9 h – 12 h",
  bookingUrl: "https://calendly.com/cabinet-ondine/seance",
  contactMode: "booking" as const,
};
export const serviceProduct = { ...emptyProduct(), name: "Cabinet Ondine", sector: "sante" as const, summary: "Cabinet de kinésithérapie à Lyon.", facts: [] };

export function serviceSpec(direction: DirectionId = "atelier", lang: "fr" | "en" = "fr", services: typeof serviceProfile | (Omit<typeof serviceProfile, "contactMode"> & { contactMode: "booking" | "quote" | "call" | "form" }) = serviceProfile, opts: { noPhotos?: boolean } = {}) {
  const copy = runWithLang({ content: lang }, () => localCopy(serviceProduct, { name: "Cabinet Ondine", tagline: "Bouger mieux, durablement.", story: "", values: [] }, { business: "services", services }));
  return buildSpec({
    direction,
    shopName: "Cabinet Ondine",
    palette: { primary: "#2F5D62", secondary: "#DCE8E4", accent: "#E0A458", light: "#F4F7F5", dark: "#14201F" },
    copy,
    images: opts.noPhotos ? { hero: "es-hero.jpg" } : { hero: "es-hero.jpg", scene1: "es-scene-1.jpg", scene2: "es-scene-2.jpg" },
    files: {},
    product: { title: "Cabinet Ondine", handle: "cabinet-ondine", vendor: "Cabinet Ondine", description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] },
    language: lang,
    business: "services",
    services,
    servicesTermsHtml: runWithLang({ content: lang }, () => serviceTermsHtml(services)),
  });
}
