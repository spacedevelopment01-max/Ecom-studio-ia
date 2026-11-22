/**
 * L'ordre et la variété des sections (cahier `docs/sina-savoir/theme-ordre-et-variete.md`, décisions du propriétaire du
 * 16 novembre 2026). Les partitions en données, les dix règles d'or, les contrôles sans IA (une règle, un test), les
 * règles de variété, le juge de l'ordre, le second regard séparé et le devis. IA simulée, aucun appel réel.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/custom-theme/partitions";
import * as O from "@/lib/syna-agent/custom-theme/ordre";
import * as PR from "@/lib/syna-agent/custom-theme/preuves";
import * as SR from "@/lib/syna-agent/custom-theme/second-regard";
import * as K from "@/lib/syna-agent/custom-theme/knowledge";
import * as IC from "@/lib/syna-agent/custom-theme/identity-card";
import { ORDRE_PIECES } from "@/lib/syna-agent/custom-theme/tenue-ordre";
import { TENUE_SECTIONS, tenueSection } from "@/lib/syna-agent/custom-theme/tenue";
import { STYLES_PRODUIT, STYLES_SERVICES, stylesBrief } from "@/lib/syna-agent/custom-theme/styles-de-page";
import { DESIGN_REVIEW_SYSTEM, DESIGN_SYSTEM, DesignSchema, designPrompt, pageOrderGaps, type Design } from "@/lib/syna-agent/custom-theme/design";
import { SECTORS } from "@/lib/syna-agent/custom-theme/references";
import * as F from "./tenue-fauteuil-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const CAHIER = fs.readFileSync(path.join(process.cwd(), "docs/sina-savoir/theme-ordre-et-variete.md"), "utf8");
const partie = (n: number) => CAHIER.split(/\n(?=## )/).find((b) => b.startsWith(`## ${n}.`))!;
const flat = (x: string) => x.replace(/\s+/g, " ").trim();
const labels = (x: string) => flat(x).replace(/\.$/, "").split(" › ");
const listes = (md: string) => [...`\n${md}\n\n`.matchAll(/\n- ([^:\n]+) : ([\s\S]*?)(?=\n- |\n\n)/g)].map((m) => ({ nom: m[1].trim(), labels: labels(m[2]) }));
const dePartition = (p: P.Partition) => ({ nom: p.nom, labels: p.moments.map((x) => x.label) });

// ── de quoi écrire une page en une ligne
const pg = (key: string, ids: string[], label = key) => ({ key, label, sections: ids.map((section) => ({ section })) });
const SERVICE: O.OrdreFacts = { business: "services", products: 1, types: ["service-proximite"], mobile: true, zoneConnue: true, preuves: new Set() };
const BOUTIQUE: O.OrdreFacts = { business: "products", products: 1, types: ["marque-createur", "produit-heros"], mobile: false, zoneConnue: false, preuves: new Set() };
const pourquoi = "Ses clients veulent d'abord savoir s'il se déplace chez eux, puis le prix de chaque prestation.";
/** Accueil d'un service qui se déplace, sans avis ni réalisations ni photo de la personne : dix sections vraies. */
const ACCUEIL_SERVICE = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
const serviceDesign = (ids: string[], partition = "service-proximite:zone-dabord") => ({ pages: [pg("home", ids, "Accueil")], partitions: [{ page: "home", partition, why: pourquoi }] });
const ACCUEIL_BOUTIQUE = ["tn-ouverture", "tn-produits", "tn-atouts", "tn-fabrication", "tn-places", "tn-appel-produit", "tn-emotion", "tn-composition", "tn-questions", "tn-infolettre"];
const boutiqueDesign = (ids: string[], partition = "marque-createur:produits-dabord") => ({ pages: [pg("home", ids, "Accueil")], partitions: [{ page: "home", partition, why: "Un seul produit fait à la main : on le montre tout de suite, puis ce qui le rend sûr." }] });
const refus = (d: O.OrdreDesign, f: O.OrdreFacts) => O.ordreGaps(d, f).refus;

describe("les partitions en données (cahier, parties 3 et 4)", () => {
  it("chaque pièce citée par un moment existe dans la bibliothèque à tenue ; chaque pièce de la bibliothèque porte son trait d'ordre", () => {
    for (const p of P.TOUTES_LES_PARTITIONS) for (const x of p.moments) for (const id of x.pieces) expect(tenueSection(id), `${p.id} · ${x.label} · ${id}`).not.toBeNull();
    for (const s of TENUE_SECTIONS) { expect(s.ordre, s.id).toBe(ORDRE_PIECES[s.id]); expect(s.ordre!.forme, s.id).toBeTruthy(); }
    expect(Object.keys(ORDRE_PIECES).sort()).toEqual(TENUE_SECTIONS.map((s) => s.id).sort());
    // Chaque moment a son libellé du cahier et la question du visiteur à laquelle il répond.
    for (const p of P.TOUTES_LES_PARTITIONS) for (const x of p.moments) { expect(x.label.length, p.id).toBeGreaterThan(2); expect(x.question, `${p.id} · ${x.label}`).toMatch(/\?$/); }
  });

  it("les partitions de l'accueil sont celles du cahier, mot pour mot et dans le même ordre : sept types, trois partitions chacun", () => {
    const cahier = listes(partie(3));
    expect(cahier).toHaveLength(21);
    expect(P.TYPES_ACCUEIL.flatMap((t) => t.partitions).map(dePartition)).toEqual(cahier);
    expect(P.TYPES_ACCUEIL).toHaveLength(7);
    for (const t of P.TYPES_ACCUEIL) {
      expect(t.partitions, t.id).toHaveLength(3);
      // Le nom et le « pour qui » du type sont ceux du cahier.
      expect(flat(partie(3))).toContain(`**${t.nom}** (${t.pour})`);
      for (const p of t.partitions) { expect(p.source).toBe("cahier"); expect(p.moments.length).toBeGreaterThanOrEqual(10); }
    }
  });

  it("les partitions de la fiche produit et de la page d'une prestation sont celles du cahier, une par style de page (une seule source avec les styles)", () => {
    const cahier = listes(partie(4));
    expect(cahier).toHaveLength(12);
    expect([...P.PARTITIONS_FICHE, ...P.PARTITIONS_PRESTATION].map(dePartition)).toEqual(cahier);
    expect(P.PARTITIONS_FICHE.map((p) => p.type)).toEqual(STYLES_PRODUIT.map((s) => s.id));
    expect(P.PARTITIONS_PRESTATION.map((p) => p.type)).toEqual(STYLES_SERVICES.map((s) => s.id));
    // Les « moments » d'un style viennent de sa partition : ils ne sont écrits qu'à un endroit.
    for (const s of STYLES_PRODUIT) expect(s.moments).toBe(P.partitionLine(P.partitionDuStyle(s.id, "products")!));
    for (const s of STYLES_SERVICES) expect(s.moments).toBe(P.partitionLine(P.partitionDuStyle(s.id, "services")!));
    expect(stylesBrief("services")).toContain("identifiant « prestation:devis-artisan »");
    expect(stylesBrief("products")).toContain(`: ${P.partitionLine(P.partitionById("fiche:mode")!)}.`);
    // Chaque type d'accueil renvoie à des styles de page et à des métiers que le code connaît.
    const styles = new Set([...STYLES_PRODUIT, ...STYLES_SERVICES].map((s) => s.id)), secteurs = new Set(SECTORS.map((s) => s.key));
    for (const t of P.TYPES_ACCUEIL) { for (const s of t.styles) expect(styles.has(s), `${t.id} ${s}`).toBe(true); for (const s of t.secteurs) expect(secteurs.has(s), `${t.id} ${s}`).toBe(true); }
  });

  it("boutique, réalisations, à propos, contact, questions : la partition du cahier d'abord, puis deux variantes écrites ici (mêmes moments, autre ordre), avec la règle de la page", () => {
    const cahier = [...`${partie(4)}\n\n`.matchAll(/\*\*([^*]+)\*\* \(règle : ([^)]*)\) : ([\s\S]*?)(?=\n\n)/g)].map((m) => ({ regle: flat(m[2]), labels: labels(m[3]) }));
    const pages = ["boutique", "realisations", "a-propos", "contact", "questions"] as const;
    expect(cahier).toHaveLength(pages.length);
    pages.forEach((page, i) => {
      const list = P.PARTITIONS_AUTRES.filter((p) => p.page === page);
      expect(list.map((p) => p.source), page).toEqual(["cahier", "ecrite", "ecrite"]);
      expect(list[0].moments.map((x) => x.label), page).toEqual(cahier[i].labels);
      expect(P.REGLE_DE_PAGE[page]).toBe(cahier[i].regle);
      // Les variantes : exactement les mêmes moments, dans un autre ordre.
      for (const v of list.slice(1)) { expect(v.moments.map((x) => x.label).sort(), v.id).toEqual([...cahier[i].labels].sort()); expect(v.moments.map((x) => x.label), v.id).not.toEqual(cahier[i].labels); }
    });
    // Leurs règles de page tiennent dans les variantes : les produits d'abord ; la personne et la preuve avant les valeurs ; l'action la plus simple d'abord ; les questions qui bloquent en premier.
    for (const p of P.PARTITIONS_AUTRES) {
      const keys = p.moments.map((x) => x.key);
      if (p.page === "boutique") { expect(keys.slice(0, 4)).toEqual(["boutique-titre", "sous-familles", "filtres", "boutique-produits"]); expect(keys.indexOf("reassurance")).toBeGreaterThanOrEqual(keys.length - 3); }
      if (p.page === "a-propos") { expect(keys[0]).toBe("qui-je-suis"); expect(keys.indexOf("preuves-diplomes")).toBeLessThan(keys.indexOf("valeurs")); }
      if (p.page === "contact") expect(keys[0]).toBe("appeler-ecrire");
      if (p.page === "questions") expect(keys.slice(0, 2)).toEqual(["presentation", "questions-bloquent"]);
      if (p.page === "realisations") expect(keys.indexOf("realisations-lieu-date")).toBeLessThan(4);
    }
    expect(P.REGLE_DE_PAGE.prestation).toBe("le prix ou son mode de calcul et le bouton dès le premier écran, puis en bas");
  });

  it("chaque moment du cahier a sa pièce (module « partitions », 17 novembre 2026) ; un moment dont le fait manque au dossier est sauté, jamais inventé", () => {
    // Avant ce module, sept libellés n'avaient aucune pièce : annulation et conditions, délais, filtres par type, offre,
    // offre de première visite, privatisation, réseaux.
    expect(P.momentsSansPiece()).toEqual([]);
    const brief = P.partitionsBrief({ business: "services", types: ["rendez-vous"], dossier: { preuves: [], products: 1 } });
    expect(brief).toContain("[à sauter : offre de première visite]");
    expect(brief).toMatch(/offre de première visite · « [^»]+ » · pièces : tn-offre-visite · À SAUTER pour ce client \(le dossier n'a pas la preuve réelle qu'il demande\)/);
    // Le client a donné son offre : le moment existe.
    const avec = P.partitionsBrief({ business: "services", types: ["rendez-vous"], dossier: { preuves: ["offre-visite"], products: 1 } });
    expect(avec).not.toContain("[à sauter : offre de première visite]");
  });

  it("chaque partition peut se monter sans deux dispositions pareilles à la suite (sauf le catalogue, dont deux moments de cartes se suivent dans le cahier)", () => {
    const forme = (id: string) => tenueSection(id)!.ordre!.forme;
    const montable = (p: P.Partition) => {
      const ms = p.moments.filter((x) => x.pieces.length);
      const dfs = (i: number, prev: string | null, used: string[]): boolean => {
        if (i === ms.length) return true;
        if (ms[i].pieces.some((id) => used.includes(id))) return dfs(i + 1, prev, used);
        return ms[i].pieces.some((id) => !(prev && forme(prev) === forme(id)) && dfs(i + 1, id, [...used, id]));
      };
      return dfs(0, null, []);
    };
    expect(P.TOUTES_LES_PARTITIONS.filter((p) => !montable(p)).map((p) => p.id)).toEqual(["catalogue:collections-dabord", "catalogue:guide-dabord"]);
  });

  it("le type d'accueil se déduit du métier et du catalogue ; en cas de doute, deux types sont donnés", () => {
    expect(P.typesAccueilPermis({ business: "services", products: 1, secteur: "domicile", mobile: true })).toEqual(["service-proximite"]);
    expect(P.typesAccueilPermis({ business: "services", products: 1, secteur: "batiment", mobile: true })).toEqual(["service-proximite", "devis"]);
    expect(P.typesAccueilPermis({ business: "services", products: 1, secteur: "beaute", lieu: true })).toEqual(["rendez-vous", "lieu"]);
    expect(P.typesAccueilPermis({ business: "services", products: 1, secteur: "restaurant", lieu: true })).toEqual(["lieu"]);
    expect(P.typesAccueilPermis({ business: "services", products: 1, secteur: null })).toEqual(["service-proximite", "rendez-vous", "devis"]);
    expect(P.typesAccueilPermis({ business: "products", products: 1 })).toEqual(["produit-heros", "marque-createur"]);
    expect(P.typesAccueilPermis({ business: "products", products: 8 })).toEqual(["marque-createur"]);
    expect(P.typesAccueilPermis({ business: "products", products: 20 })).toEqual(["marque-createur", "catalogue"]);
    expect(P.typesAccueilPermis({ business: "products", products: 60 })).toEqual(["catalogue"]);
    // La page d'une clé : importante, utilitaire, ou ni l'un ni l'autre.
    expect(["home", "product-x", "shop", "about", "contact", "aide", "cart", "404", "legal", "compte"].map((k) => P.pageKind(k, "products"))).toEqual(["accueil", "fiche", "boutique", "a-propos", "contact", "questions", "utilitaire", "utilitaire", "utilitaire", null]);
    expect(["prestations", "carte", "realisations", "reservation"].map((k) => P.pageKind(k, "services"))).toEqual(["prestation", "prestation", "realisations", null]);
    // Lecture indulgente du choix du concepteur.
    const permises = P.partitionsPermises("accueil", { types: ["service-proximite"], business: "services" });
    expect(P.readPartition("Zone d'abord", permises)?.id).toBe("service-proximite:zone-dabord");
    expect(P.readPartition("zone-dabord", permises)?.id).toBe("service-proximite:zone-dabord");
    expect(P.readPartition("lieu:carte-dabord", permises)).toBeNull();
  });
});

describe("les dix règles d'or et la lecture du cahier", () => {
  it("un seul texte, avec les mots du cahier, donné au concepteur, au juge de l'ordre et au second regard", () => {
    const regles = [...`\n${partie(2)}\n\n`.matchAll(/\n\d+\. ([\s\S]*?)(?=\n\d+\. |\n\n)/g)].map((m) => flat(m[1]).replace(/\*\*/g, ""));
    expect(regles).toHaveLength(10);
    for (const r of regles) expect(P.REGLES_D_OR, r).toContain(r);
    for (const system of [DESIGN_SYSTEM, DESIGN_REVIEW_SYSTEM, SR.SECOND_REGARD_SYSTEM]) expect(system).toContain(P.REGLES_D_OR);
    expect(P.REGLES_D_OR).toMatch(/au moins 10 sections sur chaque page importante/);
    expect(P.REGLES_D_OR).toMatch(/pages utilitaires restent courtes : panier, page introuvable, mentions légales, recherche, remerciement/);
    // Le juge de l'ordre connaît les services autant que les boutiques, la partition et le minimum.
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/LE JUGE DE L'ORDRE/);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/sites de services[^.]*autant que les boutiques/);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/LA PARTITION de la page[^]*Une raison qui irait à n'importe qui est refusée/);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/au moins 10 sections sur chaque page importante/);
    // Ce qui contredisait le cahier a quitté la consigne.
    for (const system of [DESIGN_SYSTEM, DESIGN_REVIEW_SYSTEM]) {
      expect(system).not.toMatch(/dans le dernier tiers|jamais une preuve avant|2e, 3e ou 4e position|COLLECTION \(2 à 4|CONTACT \(1 à 3|les questions tôt|en dessous de 8/);
    }
  });

  it("le cahier est lu par le concepteur et les juges, sans son introduction ni ses parties 2, 3, 4, 7, 8 et 9 : aucun projet d'essai n'entre dans une consigne", () => {
    const book = K.themeBook("ordre");
    expect(book).toMatch(/^## 1\. Le nombre de sections/);
    expect(book).toMatch(/## 5\. Les règles de variété[^]*## 6\. Les juges/);
    expect(book).not.toMatch(/Bécane|Lunex|vélo|## [234789]\./i);
    expect(K.onlyParts("intro Bécane\n## 1. Un\na\n## 7. Exemple\nBécane\n## 9. Fin\nz", [1, 9])).toBe("## 1. Un\na\n## 9. Fin\nz");
    for (const who of ["concepteur", "relecteur", "secondRegard", "juge"] as const) {
      expect(K.THEME_READS[who] as readonly string[], who).toContain("ordre");
      expect(K.themeKnowledge(who)).not.toMatch(/Bécane|Lunex/);
    }
    expect(K.themeKnowledgeReady()).toEqual({ ok: true });
    // Ni les consignes, ni ce qui est dit au concepteur pour un client, ne portent l'exemple du cahier.
    const brief = P.partitionsBrief({ business: "services", types: ["service-proximite"], dossier: { preuves: [], products: 1 }, angle: "sur", prises: { accueil: ["service-proximite:zone-dabord"] } });
    const prompt = designPrompt({ brief: "FICHE", family: "classique", site: { business: "services", products: 1 }, has: [], lacks: [], preuves: PR.preuvesBrief(PR.preuvesDe([])), partitions: brief });
    for (const text of [DESIGN_SYSTEM, DESIGN_REVIEW_SYSTEM, SR.SECOND_REGARD_SYSTEM, P.REGLES_D_OR, brief, PR.preuvesBrief(PR.preuvesDe([])), PR.QUESTION_DES_PREUVES]) expect(text).not.toMatch(/Bécane|Lunex|vélo|infusion|toilett|fauteuil/i);
    // Ce que le concepteur reçoit : ses partitions permises, l'angle, celle du dernier site du même métier interdite, les preuves.
    expect(prompt).toContain(brief);
    expect(brief).toContain("- service-proximite:zone-dabord (Zone d'abord) : ouverture (métier, ville, « Réserver », téléphone) › « je viens jusque chez toi » (zone et délais)");
    expect(brief).not.toContain("rendez-vous:reservation-dabord");
    expect(brief).toMatch(/L'ANGLE DÉPLACE LES SECTIONS[^\n]*l'angle sûr fait monter les garanties, l'émotion le moment de vie, l'audace « nous et les autres »[^\n]*angle SÛR/);
    expect(brief).toMatch(/DÉJÀ PRISE par le dernier site du même métier : service-proximite:zone-dabord — INTERDITE cette fois/);
    expect(brief).toMatch(/« je viens jusque chez toi » \(zone et délais\) · « Tu viens jusque chez moi, et sous quel délai \? » · pièces : tn-zone/);
    expect(brief).toMatch(/\[à sauter : avis réels\]/);
    expect(prompt).toMatch(/PREUVES RÉELLES AU DOSSIER[^\n]*aucune pour l'instant/);
    // Deux types possibles : le doute est dit, les deux jeux de partitions sont donnés.
    const doute = P.partitionsBrief({ business: "products", types: ["produit-heros", "marque-createur"], dossier: { preuves: [], products: 1 } });
    expect(doute).toMatch(/types possibles \(il y a doute/);
    expect(doute).toContain("produit-heros:achat-dabord");
    expect(doute).toContain("marque-createur:moment-dabord");
  });

  it("le concepteur choisit une partition par page importante : le champ est lu avec indulgence, jamais un appel payé perdu", () => {
    const base = { visitor: "v".repeat(30), levers: ["a b c", "d e f"], objections: [], concept: "c".repeat(30), header: "tn-entete", footer: "tn-pied", search: null, corrections: [], pages: [{ key: "home", label: "Accueil", journey: "j".repeat(30), sections: [{ section: "tn-ouverture", why: "w".repeat(12), says: "s".repeat(12), photos: "aucune" }] }] };
    expect(DesignSchema.parse({ ...base, partitions: [{ page: "home", partition: "service-proximite:zone-dabord", why: pourquoi }] }).partitions).toHaveLength(1);
    expect(DesignSchema.parse(base).partitions).toBeUndefined();
    expect(DesignSchema.parse({ ...base, partitions: "zone d'abord" }).partitions).toBeUndefined();
    expect(DESIGN_SYSTEM).toMatch(/champ « partitions » : la page, l'identifiant de la partition, et pourquoi elle va à CE client/);
  });
});

describe("ce que le client n'a pas : les preuves réelles du dossier", () => {
  it("les preuves se lisent dans ce que le client a dit ; « aucun » n'est jamais une preuve", () => {
    const p = PR.preuvesDe([
      { title: "assurance", value: "Responsabilité civile professionnelle, contrat n° 4471" },
      { title: "avis", value: "aucun pour l'instant" },
      { title: "depuis quand", value: "à mon compte depuis 2019" },
      { value: "Pas de parution dans la presse" },
      { title: "chiffres", value: "environ 400 interventions par an" },
    ]);
    expect([...p.ids].sort()).toEqual(["anciennete", "chiffres", "qualifications"]);
    expect(p.manque.map((x) => x.id)).toEqual(expect.arrayContaining(["avis", "presse", "realisations", "equipe"]));
    expect(PR.preuvesDe([], { avis: "12 avis d'une vraie source" }).ids.has("avis")).toBe(true);
    const brief = PR.preuvesBrief(p);
    expect(brief).toMatch(/PREUVES RÉELLES AU DOSSIER[^\n]*assurances, diplômes, labels ou certifications \(« assurance : Responsabilité civile/);
    expect(brief).toMatch(/PREUVES ABSENTES DU DOSSIER : des avis réels de clients[^\n]*SAUTÉ, jamais rempli, jamais remplacé par la marque qui se cite elle-même/);
  });

  it("SINA demande ses preuves au client avant de créer le site (règle générale, sans exemple de métier)", async () => {
    const J = await import("@/lib/syna-agent/journey");
    const guide = J.STEP_GUIDES[6]!;
    expect(guide).toContain(PR.QUESTION_DES_PREUVES);
    expect(guide.indexOf(PR.QUESTION_DES_PREUVES)).toBeLessThan(guide.indexOf("2) LA CRÉATION"));
    expect(PR.QUESTION_DES_PREUVES).toMatch(/les avis déjà reçus[^]*les réalisations[^]*son assurance, ses diplômes[^]*depuis quand il exerce[^]*ses chiffres vrais/);
    expect(PR.QUESTION_DES_PREUVES).toMatch(/start\.note/);
    expect(PR.QUESTION_DES_PREUVES).toMatch(/n'en invente jamais/);
  });

  it("une pièce qui demande une preuve absente du dossier est refusée (le moment se saute) ; avec la preuve, elle passe ; les réalisations d'artisans restent permises", () => {
    const avecAvis = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-avis", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(avecAvis), SERVICE).join("\n")).toMatch(/« Les avis des clients » \(tn-avis\) demande des avis réels de clients, que le dossier n'a pas : saute ce moment/);
    expect(refus(serviceDesign(avecAvis), { ...SERVICE, preuves: new Set(["avis"] as const) })).toEqual([]);
    expect(refus(serviceDesign(ACCUEIL_SERVICE), SERVICE).join("\n")).not.toMatch(/tn-avant-apres\) demande/);
    expect(P.momentTenable(P.MOMENTS.avis as P.Moment, { preuves: [], products: 1 }).ok).toBe(false);
    expect(P.momentTenable(P.MOMENTS["autres-produits"] as P.Moment, { preuves: [], products: 1 }).ok).toBe(false);
  });
});

describe("les contrôles automatiques de l'ordre, sans IA (une règle, un test)", () => {
  it("un accueil de service et un accueil de boutique qui suivent leur partition passent tous les contrôles", () => {
    const s = O.ordreGaps(serviceDesign(ACCUEIL_SERVICE), SERVICE);
    expect(s.refus).toEqual([]);
    expect(s.notes.join("\n")).toMatch(/aucune vraie preuve au dossier/);
    expect(refus(boutiqueDesign(ACCUEIL_BOUTIQUE), BOUTIQUE)).toEqual([]);
  });

  it("l'accueil qui a mal tourné à l'essai réel est refusé, règle par règle", () => {
    // ouverture › formule › prestations › comment ça marche › émotion › pour qui › citation › zone › questions › appel final
    const rate = ["tn-ouverture", "tn-equation", "tn-prestations", "tn-comment", "tn-emotion", "tn-pour-qui", "tn-citation", "tn-zone", "tn-questions", "tn-final"];
    const r = refus(serviceDesign(rate), SERVICE).join("\n");
    expect(r).toMatch(/« tu viens jusque chez moi \? » doit avoir sa réponse au plus tard en 3e position \(règle d'or 2\)[^\n]*\(ici en 8e\)/);
    expect(r).toMatch(/« L'équation » \(tn-equation, 2e\) est une pièce abstraite[^\n]*jamais avant l'offre \(règle d'or 5/);
    expect(r).toMatch(/tn-emotion, 5e\) est une pièce abstraite[^\n]*jamais avant la première preuve ou réassurance/);
    expect(r).toMatch(/la partition « service-proximite:zone-dabord » place « « je viens jusque chez toi » \(zone et délais\) » juste après l'ouverture/);
  });

  it("règle 3 : l'offre au plus tard en 3e position sur l'accueil", () => {
    const tard = ["tn-ouverture", "tn-zone", "tn-atouts", "tn-prestations", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(tard), SERVICE).join("\n")).toMatch(/l'offre arrive en 4e position \(tn-prestations\) ; elle arrive au plus tard en 3e \(règle d'or 3\)/);
    const sans = ACCUEIL_SERVICE.filter((x) => x !== "tn-prestations");
    expect(refus(serviceDesign(sans), SERVICE).join("\n")).toMatch(/l'accueil ne montre pas l'offre/);
  });

  it("règle 2 : la question qui bloque au plus tard en 3e (service qui se déplace : la zone ; boutique : le prix)", () => {
    const zoneTard = ["tn-ouverture", "tn-prestations", "tn-atouts", "tn-zone", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(zoneTard, "service-proximite:prestations-dabord"), SERVICE).join("\n")).toMatch(/règle d'or 2[^\n]*tn-zone[^\n]*ici en 4e/);
    // Un service où l'on vient (pas de déplacement) : la zone n'est pas réclamée.
    expect(refus(serviceDesign(zoneTard, "service-proximite:prestations-dabord"), { ...SERVICE, mobile: false }).join("\n")).not.toMatch(/règle d'or 2/);
    // L'ouverture de métier dit la zone quand elle est au dossier, pas sinon.
    const parOuverture = ["tn-ouverture-metier", "tn-prestations", "tn-atouts", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-zone", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(parOuverture, "service-proximite:prestations-dabord"), SERVICE).join("\n")).not.toMatch(/règle d'or 2/);
    expect(refus(serviceDesign(parOuverture, "service-proximite:prestations-dabord"), { ...SERVICE, zoneConnue: false }).join("\n")).toMatch(/règle d'or 2/);
    // Boutique : une pièce qui montre les prix dans les trois premières.
    const prixTard = ["tn-ouverture", "tn-places", "tn-guide-choix", "tn-produits", "tn-atouts", "tn-fabrication", "tn-emotion", "tn-composition", "tn-questions", "tn-infolettre"];
    expect(refus(boutiqueDesign(prixTard, "marque-createur:moment-dabord"), { ...BOUTIQUE, products: 3 }).join("\n")).toMatch(/le prix doit se voir au plus tard en 3e position \(règle d'or 2\)[^\n]*ici en 4e/);
  });

  it("règle 4 : une vraie preuve avant la 5e section quand le dossier en a une ; une citation de la marque n'est jamais une preuve", () => {
    const f = { ...SERVICE, preuves: new Set(["avis"] as const) };
    const tard = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-avant-apres", "tn-deroule", "tn-avis", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(tard), f).join("\n")).toMatch(/le dossier a de vraies preuves \(des avis réels de clients\) : l'une d'elles arrive avant la 5e section \(règle d'or 4\), ici en 7e \(tn-avis\) ; jamais la marque qui se cite elle-même/);
    const tot = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-avis", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(tot), f)).toEqual([]);
    // La marque qui se cite elle-même à la place de la preuve : toujours refusé.
    const citation = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-citation", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(citation), f).join("\n")).toMatch(/règle d'or 4/);
    for (const id of ["tn-citation", "tn-citation-photo", "tn-manifeste", "tn-equation", "tn-emotion"]) { expect(ORDRE_PIECES[id].traits, id).toContain("abstrait"); expect(ORDRE_PIECES[id].traits, id).not.toContain("preuve"); }
    // Les pièces de preuve disent la preuve réelle qu'elles demandent.
    for (const [id, o] of Object.entries(ORDRE_PIECES)) if (o.traits?.includes("preuve")) expect(o.preuve, id).toBeTruthy();
  });

  it("règle 5 : le concret avant l'abstrait, sur l'accueil comme sur les autres pages", () => {
    // Après l'offre et la première réassurance, la pièce abstraite passe.
    const apres = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-emotion", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(apres), SERVICE)).toEqual([]);
    // Avant la première réassurance : refusée, même après l'offre.
    const avant = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-citation", "tn-atouts", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(avant), SERVICE).join("\n")).toMatch(/tn-citation, 4e\)[^\n]*jamais avant la première preuve ou réassurance \(règle d'or 5/);
    // À propos : la conviction de marque n'ouvre jamais la page.
    const about = { pages: [pg("about", ["tn-manifeste", "tn-histoire", "tn-fabrication", "tn-contact"])], partitions: [{ page: "about", partition: "a-propos:histoire-dabord", why: pourquoi }] };
    expect(refus(about, SERVICE).join("\n")).toMatch(/tn-manifeste, 1e\) est une pièce abstraite/);
  });

  it("règle 6 : jamais deux dispositions pareilles à la suite", () => {
    const deux = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-engagements", "tn-deroule", "tn-texte-photo", "tn-avant-apres", "tn-questions", "tn-final"];
    expect(refus(serviceDesign(deux), SERVICE).join("\n")).toMatch(/deux dispositions pareilles à la suite \(tn-atouts, tn-engagements : liste de lignes\) ; le rythme alterne \(règle d'or 6\)/);
    // Les pièces d'un métier se suivent sans faute quand leurs dispositions diffèrent (l'ancien contrôle « même famille à la suite » les refusait).
    expect(pageOrderGaps({ pages: [{ key: "home", label: "Accueil", journey: "", sections: ACCUEIL_SERVICE.map((section) => ({ section, why: "", says: "", photos: "" })) }] } as never)).toEqual([]);
  });

  it("règle 7 : chaque rôle une seule fois (une section de cartes, un « Produit vedette », jamais deux fois la même pièce sur une page)", async () => {
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const page = (key: string, ids: string[]) => ({ key, label: key, sections: ids.map((id, i) => ({ uid: `s${key}${i}`, id })) });
    const t = { version: 1, family: "classique", style: "x", header: { uid: "h", id: "tn-entete" }, footer: { uid: "f", id: "tn-pied" }, search: null, rev: 1, at: 1,
      pages: [page("home", ["tn-ouverture", "tn-produits", "tn-rayons", "tn-achat", "tn-atouts", "tn-atouts"]), page("product", ["tn-achat", "tn-achat"])] } as never;
    const bad = S.checkCustomTheme(t).filter((x) => x.level === "bloquant").map((x) => x.text).join("\n");
    expect(bad).toMatch(/2 sections de cartes sur « home »[^\n]*une seule par page/);
    expect(bad).toMatch(/deux sections « Produit vedette » sur « product »/);
    expect(bad).toMatch(/« Trois atouts vrais » deux fois/);
  });

  it("règles 8 et 9 : les doutes dans les trois dernières sections, la page finit par l'action", () => {
    const doutesTot = ["tn-ouverture", "tn-zone", "tn-prestations", "tn-atouts", "tn-questions", "tn-deroule", "tn-texte-photo", "tn-avant-apres", "tn-comment", "tn-final"];
    expect(refus(serviceDesign(doutesTot), SERVICE).join("\n")).toMatch(/les doutes sont levés juste avant la fin \(règle d'or 8\)/);
    const sansAction = [...ACCUEIL_SERVICE.slice(0, 9), "tn-mosaique"];
    expect(refus(serviceDesign(sansAction), SERVICE).join("\n")).toMatch(/la page finit par l'action \(règle d'or 9[^\n]*ici tn-mosaique/);
    // Le formulaire puis les questions : permis (deux partitions du cahier finissent ainsi).
    const formulaire = [...ACCUEIL_SERVICE.slice(0, 8), "tn-devis", "tn-questions"];
    expect(refus(serviceDesign(formulaire), SERVICE)).toEqual([]);
    // La fiche produit finit par les autres produits, ou par l'appel final.
    const fiche = (last: string) => ({ pageStyle: "simple", pages: [pg("product", ["tn-achat", "tn-description", "tn-places", "tn-atouts", "tn-composition", "tn-fabrication", "tn-de-pres", "tn-garanties", "tn-questions", last])] });
    expect(refus(fiche("tn-final"), BOUTIQUE)).toEqual([]);
    expect(refus(fiche("tn-produits"), BOUTIQUE)).toEqual([]);
    expect(refus(fiche("tn-mosaique"), BOUTIQUE).join("\n")).toMatch(/règle d'or 9/);
  });

  it("dix sections au moins sur chaque page importante : le contrôle donne les moments encore libres, et ne pousse jamais à inventer", () => {
    const neuf = ACCUEIL_SERVICE.filter((x) => x !== "tn-deroule");
    const r = O.ordreGaps(serviceDesign(neuf), SERVICE);
    expect(r.refus.join("\n")).toMatch(/9 sections ; une page importante en a au moins 10\. Moments encore libres de sa partition, que le dossier peut remplir : déroulé en étapes \(tn-deroule ou tn-comment\)\. N'ajoute rien d'autre : jamais une section de remplissage/);
    // Les moments dont la preuve manque ne sont jamais proposés.
    expect(r.refus.join("\n")).not.toMatch(/avis réels \(/);
    // Plus aucun moment libre que le dossier puisse remplir : rien n'est réclamé, c'est noté pour le compte rendu.
    const contact = { pages: [pg("contact", ["tn-urgence", "tn-contact", "tn-acces", "tn-zone", "tn-questions", "tn-final"], "Contact")], partitions: [{ page: "contact", partition: "contact:formulaire-ensuite", why: pourquoi }] };
    const c = O.ordreGaps(contact, SERVICE);
    expect(c.refus).toEqual([]);
    expect(c.notes.join("\n")).toMatch(/« Contact » \(contact\) : 6 sections, moins de 10 ; aucun moment de sa partition ne reste que le dossier puisse remplir sans remplissage/);
    // Une seule section de cartes : un moment de cartes n'est pas proposé quand la page en a déjà une.
    const libres = O.momentsLibres(P.partitionById("catalogue:collections-dabord")!, ["tn-ouverture", "tn-rayons"], { ...BOUTIQUE, products: 30 });
    expect(libres.map((x) => x.moment.key)).not.toContain("meilleures-ventes");
    expect(libres.map((x) => x.moment.key)).toContain("reassurance");
    // Les pages utilitaires restent courtes.
    expect(refus({ pages: [pg("404", ["tn-404", "tn-produits", "tn-atouts", "tn-final"], "Page introuvable")] }, BOUTIQUE).join("\n")).toMatch(/4 sections ; une page utilitaire reste courte \(3 au plus/);
    expect(refus({ pages: [pg("cart", ["tn-panier"])] }, BOUTIQUE)).toEqual([]);
  });

  it("le contrôle bloquant passe de 8 et 7 à 10 sur l'accueil et la fiche produit ; les autres pages importantes sont « à revoir »", async () => {
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    expect(S.MIN_SECTIONS).toEqual({ home: 10, product: 10 });
    const page = (key: string, label: string, ids: string[]) => ({ key, label, sections: ids.map((id, i) => ({ uid: `s${key}${i}`, id })) });
    const t = { version: 1, family: "classique", style: "x", header: { uid: "h", id: "tn-entete" }, footer: { uid: "f", id: "tn-pied" }, search: null, rev: 1, at: 1,
      pages: [page("home", "Accueil", ACCUEIL_BOUTIQUE.slice(0, 9)), page("product", "Fiche produit", ["tn-achat", "tn-description", "tn-places", "tn-atouts", "tn-composition", "tn-fabrication", "tn-de-pres", "tn-garanties", "tn-questions"]), page("about", "Notre histoire", ["tn-histoire"]), page("cart", "Panier", ["tn-panier"])] } as never;
    const problems = S.checkCustomTheme(t, { business: "products", products: 1 });
    const of = (level: string) => problems.filter((x) => x.level === level).map((x) => x.text);
    expect(of("bloquant")).toContain("« Accueil » n'a que 9 section(s) : au moins 10 (accueil)");
    expect(of("bloquant")).toContain("« Fiche produit » n'a que 9 section(s) : au moins 10 (fiche produit)");
    expect(of("à revoir").join("\n")).toMatch(/« Notre histoire » n'a que 1 section\(s\) : une page importante en a au moins 10, sans remplissage/);
    expect(problems.map((x) => x.text).join("\n")).not.toMatch(/Panier » n'a que/);
  });

  it("la partition : manquante, inconnue, hors des types permis ou sans raison propre au client, elle revient au concepteur", () => {
    expect(refus({ pages: [pg("home", ACCUEIL_SERVICE, "Accueil")] }, SERVICE).join("\n")).toMatch(/partition manquante ou inconnue \(champ « partitions », page « home »\) : choisis-en une parmi service-proximite:zone-dabord, service-proximite:preuve-dabord, service-proximite:prestations-dabord/);
    expect(refus(serviceDesign(ACCUEIL_SERVICE, "lieu:carte-dabord"), SERVICE).join("\n")).toMatch(/partition manquante ou inconnue/);
    expect(refus({ pages: [pg("home", ACCUEIL_SERVICE, "Accueil")], partitions: [{ page: "home", partition: "service-proximite:zone-dabord", why: "Parce que." }] }, SERVICE).join("\n")).toMatch(/dis pourquoi la partition « service-proximite:zone-dabord » va à CE client \(son angle, ses preuves, ses clients\)/);
    // La fiche produit prend la partition de son style, sans avoir à la redire.
    const r = O.partitionChoisie({ pageStyle: "technique", pages: [] }, pg("product", []), "fiche", BOUTIQUE);
    expect(r.partition?.id).toBe("fiche:technique");
  });
});

describe("les règles de variété qui se comptent (2, 4, 5, 6 et 7)", () => {
  const site = (o: Partial<O.SiteMonte> = {}): O.SiteMonte => ({ metier: "domicile", partitions: { home: "service-proximite:zone-dabord" }, header: "tn-entete-liens:classique", footer: "tn-pied-complet:colonnes", opening: "tn-ouverture:bandeau", pages: { home: ["tn-ouverture:bandeau", "tn-atouts:lignes", "tn-questions:filets", "tn-final:sombre-centre"] }, ...o });
  const mine = (o: Partial<O.VarieteDesign> = {}): O.VarieteDesign => ({ famille: "confiance-savoir-faire", partitions: { home: "service-proximite:preuve-dabord" }, header: "tn-entete:sangle", footer: "tn-pied-reassurance", opening: "tn-ouverture:dans-la-photo", pages: { home: ["tn-ouverture:dans-la-photo", "tn-atouts:numeros", "tn-questions:cartes", "tn-final:encadre"] }, ...o });
  const opts = { kinds: { home: "accueil" as const }, plusieurs: () => true };

  it("règle 2 : jamais la même partition que le dernier site du même métier", () => {
    expect(O.varieteGaps(mine(), [site()], "domicile", opts)).toEqual([]);
    expect(O.varieteGaps(mine({ partitions: { home: "service-proximite:zone-dabord" } }), [site()], "domicile", opts).join("\n")).toMatch(/la partition « service-proximite:zone-dabord » est celle du dernier site monté pour le même métier/);
    // Un autre métier, ou un site plus ancien du même métier : permis.
    expect(O.varieteGaps(mine({ partitions: { home: "service-proximite:zone-dabord" } }), [site({ metier: "batiment" })], "domicile", opts)).toEqual([]);
    expect(O.varieteGaps(mine({ partitions: { home: "service-proximite:zone-dabord" } }), [site({ partitions: { home: "service-proximite:prestations-dabord" } }), site()], "domicile", opts)).toEqual([]);
    // Une page qui n'a qu'une partition (la fiche d'un style) n'est pas concernée.
    expect(O.varieteGaps(mine({ partitions: { home: "service-proximite:zone-dabord" } }), [site()], "domicile", { ...opts, plusieurs: () => false })).toEqual([]);
  });

  it("règle 6 : l'en-tête, le pied de page et l'ouverture ne sont jamais ceux des trois derniers sites du même métier", () => {
    const r = O.varieteGaps(mine({ header: "tn-entete-liens:classique", footer: "tn-pied-complet:colonnes", opening: "tn-ouverture:bandeau" }), [site({ metier: "autre" }), site(), site({ header: "x", footer: "y", opening: "z" })], "domicile", opts).join("\n");
    expect(r).toMatch(/l'en-tête « tn-entete-liens:classique » est déjà celui d'un des trois derniers sites du même métier : il tourne ; encore libres : tn-entete:sangle ou tn-entete-annonce/);
    expect(r).toMatch(/le pied de page « tn-pied-complet:colonnes »/);
    expect(r).toMatch(/l'ouverture « tn-ouverture:bandeau »[^\n]*encore libres : tn-ouverture:dans-la-photo/);
    // Le quatrième site en arrière ne compte plus.
    expect(O.varieteGaps(mine({ header: "tn-entete-liens:classique" }), [site({ header: "a" }), site({ header: "b" }), site({ header: "c" }), site()], "domicile", opts)).toEqual([]);
    // Un seul choix permis (l'en-tête d'un site de services) : rien ne peut tourner, rien n'est refusé.
    expect(O.varieteGaps(mine({ header: "tn-entete-services:services" }), [site({ header: "tn-entete-services:services" })], "domicile", { ...opts, choix: { entete: ["tn-entete-services:services"] } })).toEqual([]);
    // Tous les choix pris par les trois derniers : seul celui du tout dernier reste interdit.
    const pris = [site({ opening: "tn-ouverture:bandeau" }), site({ opening: "tn-ouverture:dans-la-photo" })];
    expect(O.varieteGaps(mine({ opening: "tn-ouverture:dans-la-photo" }), pris, "domicile", opts)).toEqual([]);
    expect(O.varieteGaps(mine({ opening: "tn-ouverture:bandeau" }), pris, "domicile", opts).join("\n")).toMatch(/l'ouverture « tn-ouverture:bandeau » est déjà celui du dernier site/);
  });

  it("règle 7 : jamais la même combinaison de dispositions qu'un site précédent du même métier", () => {
    const pareil = mine({ pages: { home: ["tn-ouverture:bandeau", "tn-atouts:lignes", "tn-questions:filets", "tn-final:sombre-centre", "tn-zone"] } });
    expect(O.varieteGaps(pareil, [site()], "domicile", opts).join("\n")).toMatch(/même combinaison de dispositions qu'un site déjà monté pour le même métier \(tn-ouverture:bandeau, tn-atouts:lignes, tn-questions:filets, tn-final:sombre-centre\)/);
    expect(O.varieteGaps(mine(), [site()], "domicile", opts)).toEqual([]);
  });

  it("règles 4 et 5 : la carte d'identité couvre toutes les pages importantes ; cinq lignes différentes sur neuf avec un site du même métier, quatre avec les autres, jamais le même trio", () => {
    const pages = (home: string[], sell: string[], about: string[]) => [{ key: "home", sections: home }, { key: "prestations", sections: sell }, { key: "about", sections: about }, { key: "contact", sections: ["tn-contact"] }];
    const about = ["tn-fondateur", "tn-fabrication", "tn-engagements", "tn-zone", "tn-contact"];
    const a = IC.cardOf(pages(["tn-ouverture:bandeau", "tn-zone", "tn-prestations", "tn-atouts"], ["tn-prestations", "tn-deroule"], about), { header: "h1", footer: "f1" });
    expect(a.others).toEqual({ "a-propos": about, contact: ["tn-contact"] });
    expect(a.own).toContain("tn-zone");
    // Une autre page importante à l'identique : refusée, quel que soit le reste.
    const b = IC.cardOf(pages(["tn-ouverture:dans-la-photo", "tn-prestations", "tn-zone", "tn-labels", "tn-questions"], ["tn-tarifs", "tn-comment", "tn-rdv"], about), { header: "h2", footer: "f2" });
    expect(IC.pagesIdentiques(b, a)).toEqual(["a-propos"]);
    expect(IC.registryGaps(b, [a]).join("\n")).toMatch(/à propos : exactement la même suite de pièces qu'un thème déjà monté pour une autre marque ; la carte d'identité couvre toutes les pages importantes/);
    // Quatre lignes différentes : assez pour un autre métier, pas pour le même (il en faut cinq).
    const base = IC.cardOf([{ key: "home", sections: ["tn-ouverture:bandeau", "tn-produits", "tn-atouts", "tn-questions"] }, { key: "product", sections: ["tn-achat", "tn-description", "tn-places"] }], { header: "h1", footer: "f1" });
    const quatre = IC.cardOf([{ key: "home", sections: ["tn-ouverture:titre-centre", "tn-atouts", "tn-produits", "tn-questions"] }, { key: "product", sections: ["tn-achat", "tn-description", "tn-places"] }], { header: "h2", footer: "f2" });
    const { common, compared } = IC.commonLines(quatre, base);
    expect(compared - common.length).toBe(4);
    expect(IC.registryGaps(quatre, [base])).toEqual([]);
    expect(IC.registryGaps(quatre, [base], () => true).join("\n")).toMatch(/trop proche d'un thème déjà monté pour le même métier[^\n]*au moins 5 lignes différentes sur 9 entre deux sites du même métier/);
    expect([IC.SAME_TRADE_MIN_DIFF, IC.REGISTRY_MIN_DIFF]).toEqual([5, 4]);
    // Jamais le même trio ouverture, en-tête, ordre de l'accueil.
    const trio = IC.cardOf([{ key: "home", sections: ["tn-ouverture:bandeau", "tn-produits-vente", "tn-engagements", "tn-questions"] }, { key: "product", sections: ["tn-achat", "tn-mesures"] }], { header: "h1", footer: "f9" });
    expect(IC.registryGaps(trio, [base]).join("\n")).toMatch(/même ouverture, même en-tête et même ordre d'accueil/);
  });
});

describe("le second regard séparé et le devis", () => {
  it("un appel distinct, une consigne distincte, qui ne corrige pas : conforme ou non conforme, page par page, avec la règle enfreinte", () => {
    expect(SR.SECOND_REGARD_SYSTEM).not.toBe(DESIGN_REVIEW_SYSTEM);
    expect(SR.SECOND_REGARD_SYSTEM).toMatch(/tu ne corriges RIEN/);
    expect(SR.SECOND_REGARD_SYSTEM).toMatch(/« conforme » ou « non conforme »/);
    expect(SR.SECOND_REGARD_SYSTEM).toMatch(/le prix et la livraison au plus tard en 3e position/);
    const v = SR.SecondRegardSchema.parse({ pages: [{ page: "home", verdict: "Non-conforme", regles: ["règle d'or 5 : la formule en 2e position passe avant l'offre"] }, { page: "about", verdict: "CONFORME" }] });
    expect(v.pages.map((p) => p.verdict)).toEqual(["non conforme", "conforme"]);
    expect(SR.secondRegardRefus(v)).toEqual(["second regard, page « home » : règle d'or 5 : la formule en 2e position passe avant l'offre"]);
    const d = { pages: [{ key: "home", label: "Accueil", journey: "", sections: [{ section: "tn-zone", why: "Il veut savoir si on vient chez lui.", says: "Les villes desservies.", photos: "" }] }] } as never;
    const prompt = JSON.parse(SR.secondRegardPrompt({ brief: "DOSSIER", preuves: "PREUVES", business: "services", angle: "sur", design: d, pages: [{ key: "home", partition: P.partitionById("service-proximite:zone-dabord"), why: pourquoi }] }));
    expect(prompt.pagesAVerifier[0]).toMatchObject({ page: "home", raisonDuChoix: pourquoi, partitionChoisie: { identifiant: "service-proximite:zone-dabord" } });
    expect(prompt.pagesAVerifier[0].sections[0]).toMatchObject({ position: 1, piece: "La zone d'intervention" });
    expect(prompt.preuvesDuDossier).toBe("PREUVES");
  });

  it("le devis compte le second regard : deux avis au plus, un d'ordinaire", async () => {
    const T = await import("@/lib/syna-agent/custom-theme/tools");
    const X = await import("@/lib/syna-agent/custom-theme/site-job");
    const D = await import("@/lib/syna-agent/custom-theme/design");
    const Og = await import("@/lib/syna-agent/custom-theme/originality");
    const c = T.designCost(true);
    expect(c.calls).toEqual({ max: 7, usual: 4 });
    // Depuis le 17 novembre 2026 : la part de chaque relecteur se calcule sur le vrai tarif de sa route (jamais moins que l'ancien montant fixe).
    expect(T.secondRegardCapMicro()).toBeGreaterThanOrEqual(SR.SECOND_REGARD_CAP_MICRO);
    expect(T.originalityCapMicro()).toBeGreaterThanOrEqual(Og.ORIGINALITY_CAP_MICRO);
    expect(c.max).toBe(D.DESIGN_CAP_MICRO * D.DESIGN_CALLS_MAX + T.secondRegardCapMicro() * SR.SECOND_REGARD_CALLS_MAX + T.originalityCapMicro() * Og.ORIGINALITY_CALLS_MAX + T.designKnowledge(true).max);
    expect(c.usual).toBeGreaterThanOrEqual(D.DESIGN_TYPICAL_MICRO + SR.SECOND_REGARD_TYPICAL_MICRO + Og.ORIGINALITY_TYPICAL_MICRO + T.designKnowledge(true).usual);
    expect(c.usual).toBeLessThan(c.max);
    expect(T.designCost(false).calls).toEqual({ max: 5, usual: 3 });
    // Le devis du site entier porte cette conception : il monte d'au moins le plafond des deux avis du second regard.
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const q = X.siteQuote({ business: "services", products: 1 });
      const sans = q.maxMicro - T.secondRegardCapMicro() * SR.SECOND_REGARD_CALLS_MAX - K.knowledgeCapMicro("secondRegard", "quality_control", SR.SECOND_REGARD_CALLS_MAX);
      expect(sans).toBeGreaterThan(0);
      expect(q.maxMicro - sans).toBeGreaterThanOrEqual(300_000);
    } finally { delete T.customPhotoDeps.unit; }
  });
});

describe("la conception de bout en bout, IA simulée", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const { saveBrand, remember } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { createProduct } = await import("@/lib/products/catalog");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  async function client() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Un fauteuil enveloppant en tissu terracotta." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Calme." }, { field: "setup", value: "1 produit" }, { field: "market", value: "France." },
      { field: "price", value: "à définir" }, { field: "difference", value: "Bien fait." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    ctx.projectId = pid;
    saveBrand(pid, F.FAUTEUIL_BRAND as any);
    const prod: string[] = [];
    for (const f of F.PRODUCT_PHOTOS.slice(0, 2)) prod.push((await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" })).id);
    createProduct(pid, { title: "Fauteuil Alcôve terracotta", images: prod.map((assetId) => ({ assetId })) } as any);
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
    return { user, cid, ctx, pid };
  }
  const pick = (section: string, construction?: string) => ({ section, ...(construction ? { construction } : {}), why: "Le moment où le visiteur a besoin de cela.", says: "Les vrais faits de la marque, sans rien inventer.", photos: "aucune" });
  const page = (key: string, label: string, ids: (string | [string, string])[]) => ({ key, label, journey: "Le visiteur arrive, comprend, ressent, puis agit sans hésiter.", sections: ids.map((x) => (Array.isArray(x) ? pick(x[0], x[1]) : pick(x))) });
  const FICHE: (string | [string, string])[] = [["tn-achat", "simple"], "tn-description", "tn-places", "tn-atouts", "tn-composition", "tn-fabrication", "tn-de-pres", "tn-garanties", "tn-questions", "tn-final"];
  const design = (home: (string | [string, string])[], partition: string): Design => ({
    visitor: "Une personne qui veut un coin à elle pour lire.", levers: ["ce que le produit change dans la journée", "sa silhouette"], objections: [],
    concept: "Le fauteuil dans sa niche : tout le site reprend l'arrondi du mur.", header: "tn-entete", headerConstruction: "centre", footer: "tn-pied-complet", footerConstruction: "colonnes", search: null, corrections: [],
    tenue: { ...F.FAUTEUIL_TENUE, cadre: "droit" }, famille: "maison-chaleureuse", familleWhy: "Les tons chauds de la planche et sa police de titre fine.", pageStyle: "simple", pageStyleWhy: "Un objet fait par un artisan.",
    partitions: [{ page: "home", partition, why: "Un seul fauteuil, fait à la main : on le montre tout de suite, puis ce qui le rend sûr pour un lecteur qui partage son salon." }],
    pages: [page("home", "Accueil", home), page("product", "Fiche produit", FICHE), page("cart", "Panier", ["tn-panier"]), page("compte", "Mon compte", ["tn-compte"]), page("about", "Notre histoire", ["tn-histoire"]), page("contact", "Contact", ["tn-contact"]), page("aide", "Aide", ["tn-questions"]), page("legal", "Informations légales", ["tn-legal"]), page("404", "Page introuvable", ["tn-404"])],
  } as Design);
  const BON: (string | [string, string])[] = [["tn-ouverture", "dans-la-photo"], "tn-produits", "tn-atouts", "tn-fabrication", "tn-places", "tn-appel-produit", "tn-emotion", "tn-composition", "tn-questions", "tn-infolettre"];
  // La formule abstraite en deuxième position, les produits en quatrième.
  const MAUVAIS: (string | [string, string])[] = [["tn-ouverture", "dans-la-photo"], "tn-equation", "tn-atouts", "tn-produits", "tn-places", "tn-appel-produit", "tn-emotion", "tn-composition", "tn-questions", "tn-infolettre"];

  it("le juge de l'ordre corrige, le second regard revérifie sans corriger, le concepteur fait UNE reprise, les contrôles sans IA repassent ; la partition est gardée avec le site et interdite au suivant du même métier", async () => {
    const { ctx, pid } = await client();
    const calls: { system: string; prompt: string; key: string }[] = [], seconds: { prompt: any; key: string }[] = [];
    T.customDesignDeps.call = async (system, prompt, key) => { calls.push({ system, prompt, key }); return calls.length < 3 ? design(MAUVAIS, "marque-createur:produits-dabord") : design(BON, "marque-createur:produits-dabord"); };
    T.customDesignDeps.second = async (prompt, key) => { seconds.push({ prompt: JSON.parse(prompt), key }); return seconds.length === 1 ? { pages: [{ page: "home", verdict: "non conforme", regles: ["règle d'or 5 : une formule en 2e position, avant les produits"] }, { page: "product", verdict: "conforme", regles: [] }] } : { pages: [{ page: "home", verdict: "conforme" }] }; };
    try {
      const r = await fr(() => T.runDesign(ctx, {}, { kind: "full" }));
      if (!r.ok) throw new Error(r.result.summary);
      expect(r.calls).toBe(3);
      // 1) le concepteur, avec les règles d'or, ses partitions permises et les preuves du dossier.
      expect(calls[0].system).toContain("directeur de création");
      expect(calls[0].system).toContain(P.REGLES_D_OR);
      expect(calls[0].system).toContain("══ CAHIER : L'ORDRE ET LA VARIÉTÉ DES SECTIONS");
      expect(calls[0].prompt).toMatch(/LES PARTITIONS \(les ordres de départ des pages importantes\)/);
      expect(calls[0].prompt).toContain("marque-createur:produits-dabord");
      expect(calls[0].prompt).toContain("produit-heros:probleme-dabord"); // un seul produit : il y a doute, les deux types sont donnés
      expect(calls[0].prompt).toMatch(/PREUVES RÉELLES AU DOSSIER[^\n]*aucune pour l'instant/);
      // 2) le juge de l'ordre relit et corrige.
      expect(calls[1].system).toContain("LE JUGE DE L'ORDRE");
      expect(calls[1].key).toMatch(/-review$/);
      // 3) le second regard, séparé : il reçoit les pages importantes avec leur partition.
      expect(seconds).toHaveLength(2);
      expect(seconds[0].key).toMatch(/-second$/);
      expect(seconds[0].prompt.pagesAVerifier.map((x: any) => x.page)).toEqual(["home", "product", "about", "contact", "aide"]);
      expect(seconds[0].prompt.pagesAVerifier[0].partitionChoisie.identifiant).toBe("marque-createur:produits-dabord");
      expect(seconds[0].prompt.pagesAVerifier[1].partitionChoisie.identifiant).toBe("fiche:simple");
      // 4) une seule reprise, par le CONCEPTEUR, avec les refus des contrôles sans IA et du second regard.
      expect(calls[2].system).toContain("directeur de création");
      expect(calls[2].system).not.toContain("LE JUGE DE L'ORDRE");
      expect(calls[2].key).toMatch(/-fix$/);
      expect(calls[2].prompt).toMatch(/second regard, page « home » : règle d'or 5/);
      expect(calls[2].prompt).toMatch(/« L'équation » \(tn-equation, 2e\) est une pièce abstraite/);
      expect(calls[2].prompt).toMatch(/l'offre arrive en 4e position/);
      expect(calls[2].prompt).toMatch(/« Notre histoire » : partition manquante ou inconnue[^\n]*a-propos:histoire-dabord/);
      // 5) le second regard relit la reprise : plus rien de lui ne reste ; ce que les contrôles refusent encore est dit.
      expect(seconds[1].key).toMatch(/-second-2$/);
      expect(r.left.join("\n")).not.toMatch(/second regard/);
      expect(r.left.join("\n")).not.toMatch(/tn-equation|règle d'or 3/);
      expect(r.left.join("\n")).toMatch(/« Notre histoire » : partition manquante ou inconnue/);
      expect(r.left.join("\n")).toMatch(/« Accueil » : aucune vraie preuve au dossier/);
      // Gardés avec le site : son métier et la partition de chaque page importante.
      expect(r.t.metier).toBe("mobilier");
      expect(r.t.partitions).toEqual({ home: "marque-createur:produits-dabord", product: "fiche:simple" });
      expect(r.t.pages.find((x) => x.key === "home")!.sections.map((x) => x.id)).toEqual(BON.map((x) => (Array.isArray(x) ? x[0] : x)));
      // La signature de la famille et le signe de la marque (17 novembre 2026) : dits au concepteur, contrôlés, rendus à sa
      // reprise, puis posés sans IA (fonds de section de la famille, signe complété) ; rien n'en reste « à revoir ».
      expect(calls[0].system).toContain("RÉGLAGES DE CHAQUE SECTION");
      // Depuis l'audit du site du 22 novembre 2026 (6.2), le Studio pose le signe lui-même AVANT de décider la reprise :
      // ce point ne part plus à la reprise payée du concepteur.
      expect(calls[2].prompt).not.toMatch(/signe : le signe de la marque n'a pas de forme/);
      expect(r.t.tenue).toMatchObject({ signeForme: "couture" });
      expect(r.t.pages.find((x) => x.key === "home")!.sections.filter((x) => x.reglages?.fond === "doux").length).toBeGreaterThanOrEqual(2);
      expect(r.left.join("\n")).not.toMatch(/^(signature|signe) : /m);
      S.saveCustomTheme(pid, r.t);
    } finally { delete T.customDesignDeps.call; delete T.customDesignDeps.second; }

    // Le site suivant du même métier : la partition du dernier lui est dite interdite, et le contrôle la refuse.
    const next = await client();
    const prompts: string[] = [];
    T.customDesignDeps.call = async (_s, prompt) => { prompts.push(prompt); return design(BON, "marque-createur:produits-dabord"); };
    try {
      expect(T.recentSites(next.pid)[0].site).toMatchObject({ metier: "mobilier", partitions: { home: "marque-createur:produits-dabord" }, header: "tn-entete:centre", footer: "tn-pied-complet:colonnes", opening: "tn-ouverture:dans-la-photo" });
      const r = await fr(() => T.runDesign(next.ctx, {}, { kind: "full" }));
      if (!r.ok) throw new Error(r.result.summary);
      expect(prompts[0]).toMatch(/DÉJÀ PRISE par le dernier site du même métier : marque-createur:produits-dabord — INTERDITE cette fois/);
      const left = r.left.join("\n");
      expect(left).toMatch(/page « home » : la partition « marque-createur:produits-dabord » est celle du dernier site monté pour le même métier/);
      expect(left).toMatch(/l'en-tête « tn-entete:centre » est déjà celui d'un des trois derniers sites du même métier/);
      expect(left).toMatch(/l'ouverture « tn-ouverture:dans-la-photo »/);
      // Sans second regard simulé, il ne passe pas (comme le juge de l'originalité) : rien n'est payé en test.
      expect(left).not.toMatch(/second regard/);
    } finally { delete T.customDesignDeps.call; }
  });

  it("un second regard qui refuse encore après la reprise, ou qui tombe en panne, est dit dans « à revoir » ; les preuves notées par SINA arrivent au concepteur", async () => {
    const { ctx, pid } = await client();
    remember(pid, { kind: "fact", key: "syna.assurance", value: "Responsabilité civile professionnelle, contrat n° 4471", source: "user", origin: "syna", status: "confirmed" } as never);
    expect([...T.dossierPreuves(ctx).ids]).toContain("qualifications");
    const prompts: string[] = [];
    T.customDesignDeps.call = async (_s, prompt) => { prompts.push(prompt); return design(BON, "marque-createur:produits-dabord"); };
    T.customDesignDeps.second = async () => ({ pages: [{ page: "home", verdict: "non conforme", regles: ["règle d'or 1 : le premier écran ne dit pas pour qui"] }] });
    try {
      const r = await fr(() => T.runDesign(ctx, {}, { kind: "full" }));
      if (!r.ok) throw new Error(r.result.summary);
      expect(prompts[0]).toMatch(/PREUVES RÉELLES AU DOSSIER[^\n]*assurances, diplômes, labels ou certifications/);
      expect(r.calls).toBe(3); // jamais plus d'une reprise
      expect(r.left.join("\n")).toMatch(/second regard, page « home » : règle d'or 1 : le premier écran ne dit pas pour qui \(encore là après la reprise\)/);
      T.customDesignDeps.second = async () => { throw new Error("réponse illisible"); };
      const r2 = await fr(() => T.runDesign(ctx, {}, { kind: "full" }));
      if (!r2.ok) throw new Error(r2.result.summary);
      expect(r2.left.join("\n")).toMatch(/second regard sur l'ordre des pages non fait \(réponse illisible\)/);
    } finally { delete T.customDesignDeps.call; delete T.customDesignDeps.second; }
  });
});
