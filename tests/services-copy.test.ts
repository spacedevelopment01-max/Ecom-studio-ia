import { describe, expect, it } from "vitest";
import { withContentLang } from "@/lib/i18n-server";
import { localCopy } from "@/lib/engine/local-copy";
import { guessSector, localBrand, localThemeCommand } from "@/lib/engine/local";
import { localPlan } from "@/lib/engine/calendar";
import { localAds, SERVICE_AD_CTAS } from "@/lib/engine/ads";
import { proposeTaglines, logoProposals } from "@/lib/engine/identity";
import { serviceTermsHtml } from "@/lib/engine/services-text";
import { emptyProduct, emptyServiceProfile, isServiceSector, SECTORS, sectorLabel, type ServiceProfile } from "@/lib/project-types";
import { lintClaims } from "@/lib/ai/tasks";
import { servicesContext } from "@/lib/ai/context";
import { libraryPrompts, PROMPT_STATS } from "@/lib/prompts-library";
import type { Project } from "@/lib/projects";
import { sampleSpec } from "./fixtures";

/** Toutes les chaînes d'une valeur (objets et tableaux parcourus ; les clés techniques ne comptent pas). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const PRODUCT_FR = /\b(panier|livraisons?|produits?|commandes?|expédition|retours?|packshot)\b/i;
const PRODUCT_EN = /\b(cart|shipping|delivery|products?|orders?|returns?|packshot|shop now)\b/i;
const FRENCH = /\b(le|la|les|des|du|une|votre|vos|pour|avec|et)\b|[«»]|À compléter/i;
/** Montants : euros, dollars, livres. */
const MONEY = /\d+(?:[.,]\d+)?\s?(?:€|eur\b)|[$£€]\s?\d/gi;

const plumberServices: ServiceProfile = {
  ...emptyServiceProfile(),
  services: [
    { name: "Dépannage de fuite", description: "Recherche et réparation de fuites d'eau." },
    { name: "Installation de chauffe-eau", description: "" },
  ],
  area: "Lyon et alentours",
  phone: "04 78 00 00 00",
  contactMode: "quote",
};
const coachServices: ServiceProfile = {
  ...emptyServiceProfile(),
  services: [
    { name: "Séance individuelle", description: "Une heure de coaching sportif personnalisé.", duration: "1 h", price: "60 €" },
    { name: "Cours collectif", description: "" },
  ],
  address: "12 rue des Lilas, Nantes",
  hours: "Lun–Sam 7 h–20 h",
  bookingUrl: "https://calendly.com/exemple-coach",
  contactMode: "booking",
};
const plumberServicesEn: ServiceProfile = { ...plumberServices, services: [{ name: "Leak repair", description: "Finding and fixing water leaks." }, { name: "Water heater installation", description: "" }], area: "Greater Boston" };
const coachServicesEn: ServiceProfile = { ...coachServices, services: [{ name: "Private session", description: "One hour of personal fitness coaching.", duration: "1 hr", price: "$60" }, { name: "Group class", description: "" }], address: "12 Lilac Street, Austin", hours: "Mon–Sat 7am–8pm" };

const plumberProduct = (lang: "fr" | "en") => ({ ...emptyProduct(), name: lang === "en" ? "Boston plumbing and heating" : "Plombier chauffagiste à Lyon", category: lang === "en" ? "Plumbing and heating" : "Plomberie et chauffage", sector: "batiment" as const, summary: "" });
const coachProduct = (lang: "fr" | "en") => ({ ...emptyProduct(), name: lang === "en" ? "Personal fitness coaching" : "Coaching sportif personnalisé", category: lang === "en" ? "Fitness coaching" : "Coaching sportif", sector: "coaching" as const, summary: "" });

function project(kind: "plumber" | "coach", lang: "fr" | "en"): Project {
  const product = kind === "plumber" ? plumberProduct(lang) : coachProduct(lang);
  const services = kind === "plumber" ? (lang === "en" ? plumberServicesEn : plumberServices) : lang === "en" ? coachServicesEn : coachServices;
  const p = { id: `p-${kind}`, name: product.name, business: "services", services, product, catalog: [], settings: { language: lang }, brand: null, strategy: null } as unknown as Project;
  const b = withContentLang(lang, () => localBrand(product, kind === "plumber" ? (lang === "en" ? "Northside Plumbing" : "Aplomb Services") : "Studio Élan", p));
  return { ...p, brand: b.brand, strategy: b.strategy } as Project;
}

const CASES = [
  ["plumber", "fr"],
  ["plumber", "en"],
  ["coach", "fr"],
  ["coach", "en"],
] as const;

describe("entreprises de services : textes générés (moteur local)", () => {
  for (const [kind, lang] of CASES) {
    it(`${kind} (${lang}) : vocabulaire de services, aucun tarif inventé`, () => {
      withContentLang(lang, () => {
        const p = project(kind, lang);
        const copy = localCopy(p.product, p.brand!, p);
        const posts = localPlan(p, { startDate: "2026-01-05", days: 7, perDay: 1, slots: ["10:00"], timezone: "Europe/Paris", networks: [{ network: "instagram" }, { network: "facebook" }], goals: "", tone: "", mix: { photo: 100, video: 0, text: 0 }, link: "https://exemple.fr", approval: "manual" });
        const ads = localAds(p, lang, 4);
        const taglines = proposeTaglines(p);
        const logos = logoProposals(p).map((x) => x.concept);
        const all = { copy, brand: p.brand, strategy: p.strategy, posts: posts.map(({ title, caption, angle, hashtags, visual }) => ({ title, caption, angle, hashtags, headline: visual.headline })), ads, taglines, logos };
        const text = strings(all);
        const forbidden = lang === "fr" ? PRODUCT_FR : PRODUCT_EN;
        expect(text.filter((s) => forbidden.test(s)), "vocabulaire produit").toEqual([]);
        if (lang === "en") expect(text.filter((s) => FRENCH.test(s)).filter((s) => !/Lun|Lilas|Nantes|Lyon/.test(s)), "mots français").toEqual([]);

        // Tarifs : seulement ceux saisis par le client.
        const given = (p.services.services.map((s) => s.price).filter(Boolean) as string[]).map((x) => x.replace(/\s/g, ""));
        const money = text.flatMap((s) => s.match(MONEY) ?? []).map((m) => m.replace(/\s/g, ""));
        for (const m of money) expect(given.some((g) => g.includes(m) || m.includes(g.replace(/[^\d]/g, ""))), `tarif ${m}`).toBe(true);
        if (kind === "plumber") expect(money).toEqual([]);
        else expect(strings(copy).join(" ")).toContain(lang === "en" ? "$60" : "60 €");

        // Vocabulaire attendu et appel à l'action selon le mode de contact.
        const joined = text.join(" ");
        if (lang === "fr") expect(joined).toMatch(/prestations?/i);
        else expect(joined).toMatch(/services?/i);
        expect(copy.hero.cta).toBe(kind === "plumber" ? (lang === "en" ? "Request a quote" : "Demander un devis") : lang === "en" ? "Book an appointment" : "Prendre rendez-vous");
        expect(copy.shipping.heading).toBe(lang === "en" ? "Practical information" : "Infos pratiques");
        expect(copy.features.items.map((x) => x.title)).toEqual(p.services.services.map((s) => s.name));
        for (const a of ads) expect(SERVICE_AD_CTAS[lang]).toContain(a.cta);
        expect(ads[0].cta).toBe(kind === "plumber" ? SERVICE_AD_CTAS[lang][1] : SERVICE_AD_CTAS[lang][0]);
        // Les inconnues restent visibles (jamais comblées).
        expect(joined).toContain(lang === "en" ? "[To complete: " : "[À compléter : ");
        // Ce que le client a saisi est repris.
        if (kind === "plumber") expect(joined).toContain(lang === "en" ? "Greater Boston" : "Lyon et alentours");
        // Coach en rendez-vous en ligne : la prise de rendez-vous est proposée, le lien est porté par le bouton (pas d'adresse web en clair).
        else expect(joined).toContain(lang === "en" ? "Pick a time slot online" : "Choisissez votre créneau en ligne");
        // Publications : angles de services (coulisses, équipe, rendez-vous…), jamais de packshot.
        expect(posts.every((x) => x.visual.kind !== "packshot")).toBe(true);
        expect(posts.map((x) => x.angle)).toContain(lang === "en" ? "Behind the scenes" : "Coulisses");
      });
    });
  }

  it("conditions de prestation en espaces réservés, sans tarif inventé", () => {
    withContentLang("fr", () => {
      const html = serviceTermsHtml(plumberServices);
      expect(html).toContain("Annulation et report");
      expect(html).toContain("[À compléter : délai et conditions d'annulation]");
      expect(html.match(MONEY)).toBeNull();
    });
    withContentLang("en", () => expect(serviceTermsHtml(coachServicesEn)).toContain("Private session (1 hr · $60)"));
  });

  it("secteurs de services : libellés FR/EN et détection locale depuis la description", () => {
    const services = SECTORS.filter((s) => s.kind === "services");
    expect(services.length).toBeGreaterThanOrEqual(10);
    for (const s of services) {
      expect(isServiceSector(s.id)).toBe(true);
      expect(sectorLabel(s.id, "en")).not.toBe("Not determined");
      expect(sectorLabel(s.id, "fr")).not.toBe(sectorLabel(s.id, "en"));
    }
    expect(isServiceSector("beaute")).toBe(false);
    const cases: [string, string][] = [
      ["Plombier chauffagiste à Lyon, dépannage et installation", "batiment"],
      ["Licensed plumber serving Boston", "batiment"],
      ["Coach sportif à domicile à Nantes", "coaching"],
      ["Personal trainer and fitness coach", "coaching"],
      ["Salon de coiffure et barbier", "bienetre"],
      ["Cabinet de kinésithérapie", "sante"],
      ["Cabinet d'avocats en droit du travail", "conseil"],
      ["Restaurant bistronomique", "restauration"],
      ["Agence immobilière familiale", "immobilier"],
      ["Cours particuliers de piano", "formation"],
      ["Photographe de mariage", "evenementiel"],
      ["Aide à domicile pour seniors", "domicile"],
      ["Agence web et graphiste freelance", "agence"],
    ];
    for (const [text, sector] of cases) expect(guessSector(text, "services"), text).toBe(sector);
    // Les boutiques de produits gardent leurs secteurs.
    expect(guessSector("Bougie parfumée")).toBe("maison");
  });

  it("chat de la boutique (moteur local) : commandes de services comprises", () => {
    const spec = sampleSpec();
    const r = localThemeCommand(spec, "ajoute une section équipe", null, "services");
    expect(r.ops.length + r.reply.length).toBeGreaterThan(0);
    const help = localThemeCommand(spec, "rends-le plus joli", null, "services");
    expect(help.reply).not.toMatch(/livraison|panier|\blots\b/i);
    expect(help.reply).toMatch(/rendez-vous|appointment|booking/i);
  });

  it("IA : le contexte décrit l'activité de services et interdit d'inventer tarifs, diplômes et délais", () => {
    withContentLang("fr", () => {
      const p = project("plumber", "fr");
      const ctx = servicesContext(p);
      expect(ctx).toContain("ENTREPRISE DE SERVICES");
      expect(ctx).toContain("Dépannage de fuite");
      expect(ctx).toContain("tarif : non communiqué");
      expect(ctx).toMatch(/Ne jamais inventer : tarif/);
      // Allégations à risque : devis gratuit et rapidité non fournis sont signalés ; le tarif saisi du coach est accepté.
      const issues = lintClaims({ hero: "Devis gratuit, intervention en 30 minutes, 7j/7, plombier qualifié depuis 1998, dès 49 €." }, p).map((i) => i.term.toLowerCase());
      expect(issues.length).toBeGreaterThanOrEqual(5);
      const coach = project("coach", "fr");
      expect(lintClaims({ text: "Séance individuelle : 60 €." }, coach)).toEqual([]);
    });
  });

  it("bibliothèque de prompts : secteurs de services avec des prompts propres au métier", () => {
    for (const lang of ["fr", "en"] as const) {
      const prompts = libraryPrompts(lang);
      expect(prompts).toHaveLength(PROMPT_STATS.total);
      const plumber = prompts.filter((x) => x.sector === "batiment");
      expect(plumber).toHaveLength(PROMPT_STATS.perSector);
      const body = plumber.map((x) => x.body).join("\n");
      expect(body).toMatch(lang === "fr" ? /rendez-vous|devis/ : /book|quote/i);
      expect(plumber.find((x) => x.category === "packshot")?.categoryLabel).toBe(lang === "fr" ? "Portrait professionnel" : "Professional portrait");
    }
  });
});
