/**
 * Informations légales de l'éditeur, en un seul endroit (pages légales et pied de page).
 * Les valeurs « [À compléter : …] » sont à renseigner avant l'ouverture commerciale :
 * elles restent visibles tant qu'elles ne sont pas remplies, rien n'est inventé.
 * Fichier partagé : chaque texte existe en français et en anglais (`company(lang)`, `legalLinks(lang)`).
 */
import { pick, type Lang } from "./i18n";

const COMPANY_I18N = {
  brand: { fr: "E-COM STUDIO IA", en: "E-COM STUDIO IA" },
  legalName: { fr: "[À compléter : raison sociale]", en: "[To complete: company name]" },
  legalForm: { fr: "[À compléter : forme juridique et capital]", en: "[To complete: legal form and share capital]" },
  address: { fr: "[À compléter : adresse du siège]", en: "[To complete: registered office address]" },
  registration: { fr: "[À compléter : RCS ou SIRET]", en: "[To complete: RCS or SIRET number]" },
  vat: { fr: "[À compléter : n° de TVA intracommunautaire]", en: "[To complete: EU VAT number]" },
  director: { fr: "[À compléter : directeur de la publication]", en: "[To complete: publication director]" },
  email: { fr: "[À compléter : e-mail de contact]", en: "[To complete: contact email]" },
  host: { fr: "[À compléter : hébergeur du studio (nom, adresse, téléphone)]", en: "[To complete: studio hosting provider (name, address, phone)]" },
  mediator: { fr: "[À compléter : médiateur de la consommation]", en: "[To complete: consumer mediator]" },
  updated: { fr: "3 octobre 2026", en: "October 3, 2026" },
} as const;

type CompanyKey = keyof typeof COMPANY_I18N;

/** Informations de l'éditeur dans la langue demandée. */
export function company(lang: Lang): Record<CompanyKey, string> {
  return Object.fromEntries(Object.entries(COMPANY_I18N).map(([k, v]) => [k, pick(lang, v.fr, v.en)])) as Record<CompanyKey, string>;
}

/** Version française (compatibilité). */
export const COMPANY = company("fr");

export function legalLinks(lang: Lang) {
  return [
    { href: "/mentions-legales", label: pick(lang, "Mentions légales", "Legal notice") },
    { href: "/conditions", label: pick(lang, "Conditions générales", "Terms and conditions") },
    { href: "/confidentialite", label: pick(lang, "Confidentialité", "Privacy") },
    { href: "/cookies", label: "Cookies" },
    { href: "/contact", label: "Contact" },
  ];
}

/** Version française (compatibilité). */
export const LEGAL_LINKS = legalLinks("fr");
