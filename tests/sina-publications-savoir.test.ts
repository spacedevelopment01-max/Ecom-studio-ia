/**
 * Le savoir des publications de SINA (14 novembre 2026) : onze cahiers de métier tirés de recherches sur le web et une
 * bibliothèque de 250 modèles de publication pour 29 secteurs (docs/sina-savoir/publications-*.md,
 * references/modeles-publications.json). Ce que lisent la stratège et le juge, et comment le secteur du client est
 * reconnu, sans IA. Aucun appel d'IA.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as K from "@/lib/syna-agent/posts-knowledge";
import { POSTS_JUDGE_SYSTEM, POSTS_PLAN_SYSTEM } from "@/lib/syna-agent/posts-plan";

const DIR = path.join(process.cwd(), "docs", "sina-savoir");

describe("SINA — le savoir des publications", () => {
  it("onze cahiers dans le dépôt, avec leurs règles pour SINA, leurs sources et leurs limites", () => {
    const files = fs.readdirSync(DIR).filter((f) => /^publications-.*\.md$/.test(f));
    expect(files).toHaveLength(11);
    for (const f of files) {
      const md = fs.readFileSync(path.join(DIR, f), "utf8");
      expect(md, f).toMatch(/^# /);
      expect(md, f).toMatch(/\n##[^\n]*Ce que SINA doit en tirer/);
      expect(md, f).toMatch(/\n##\s+Sources/);
      expect(md, f).toMatch(/\n##\s+Limites/);
      expect(md.length, f).toBeGreaterThan(15_000);
    }
    // Les cahiers des spécialistes sont tous parmi eux.
    for (const b of Object.values(K.POSTS_BOOKS)) expect(files).toContain(b.file);
    expect(fs.existsSync(path.join(DIR, "methode-publications.md"))).toBe(true);
  });

  it("un cahier tel que le lit un spécialiste : règles en tête, ni sources, ni adresses, ni renvois, sous le plafond", () => {
    for (const b of Object.keys(K.POSTS_BOOKS) as K.PostsBook[]) {
      const t = K.postsBook(b);
      expect(t.length, b).toBeLessThanOrEqual(K.MAX_POSTS_BOOK_CHARS);
      expect(t.length, b).toBeGreaterThan(2000);
      // La partie « Ce que SINA doit en tirer » passe en tête : coupé au plafond, le cahier garde ses règles.
      expect(t.indexOf("Ce que SINA doit en tirer"), b).toBeGreaterThan(0);
      expect(t.indexOf("Ce que SINA doit en tirer"), b).toBeLessThan(300);
      expect(t, b).not.toMatch(/https?:\/\//);
      expect(t, b).not.toMatch(/\n##\s+Sources/);
      expect(t, b).not.toMatch(/\[\d+\]/);
      expect(t, b).not.toMatch(/\((?:extrait|métier|lu)\)/);
    }
    expect(K.postsKnowledgeReady()).toEqual({ ok: true });
  });

  it("chaque spécialiste lit ses cahiers, annoncés pour ce qu'ils sont", () => {
    const stratege = K.postsEducated(POSTS_PLAN_SYSTEM, "stratege"), juge = K.postsEducated(POSTS_JUDGE_SYSTEM, "juge");
    expect(stratege.startsWith(POSTS_PLAN_SYSTEM)).toBe(true);
    for (const b of K.POSTS_READS.stratege) expect(stratege).toContain(`══ CAHIER : ${K.POSTS_BOOKS[b].title} ══`);
    for (const b of K.POSTS_READS.juge) expect(juge).toContain(`══ CAHIER : ${K.POSTS_BOOKS[b].title} ══`);
    expect(juge).not.toContain(K.POSTS_BOOKS.ligne.title);
    expect(stratege).toMatch(/tu ne recopies aucun de leurs exemples/);
    // La règle du propriétaire est dans la consigne : images d'OpenAI, jamais une image créée comme preuve.
    expect(POSTS_PLAN_SYSTEM).toMatch(/modèle d'images d'OpenAI/);
    expect(POSTS_PLAN_SYSTEM).toMatch(/ne prouve jamais rien/);
    // 0 à 3 mots-dièse et une fin sans ordre (décision du 22 novembre 2026 ; avant : « Mots-dièse : 3 à 5 »).
    expect(POSTS_PLAN_SYSTEM).toMatch(/Mots-dièse : 0 à 3/);
    expect(POSTS_PLAN_SYSTEM).toMatch(/ne finit jamais sur un ordre au lecteur/);
    // Coût : la lecture des cahiers est comptée, au plus moins d'un euro par appel.
    expect(K.postsKnowledgeCapMicro("stratege", "strategy")).toBeGreaterThan(0);
    expect(K.postsKnowledgeCapMicro("stratege", "strategy")).toBeLessThan(1_000_000);
  });

  it("la bibliothèque : 29 secteurs, 250 modèles complets, des mots qui se lisent", () => {
    const sectors = K.publicationSectors();
    expect(sectors).toHaveLength(29);
    expect(sectors.filter((s) => s.famille === "produit")).toHaveLength(14);
    expect(sectors.filter((s) => s.famille === "service")).toHaveLength(15);
    expect(new Set(sectors.map((s) => s.id)).size).toBe(29);
    expect(sectors.reduce((n, s) => n + s.modeles.length, 0)).toBe(250);
    for (const s of sectors) {
      expect(s.modeles.length, s.id).toBeGreaterThanOrEqual(6);
      expect(s.aEviter.length, s.id).toBeGreaterThan(0);
      expect(() => new RegExp(s.mots, "u"), s.id).not.toThrow();
      for (const m of s.modeles) {
        expect(["arrêter", "donner envie", "prouver", "faire sourire", "rendre service", "vendre"], `${s.id} : ${m.nom}`).toContain(m.role);
        expect(["image", "carrousel", "vidéo courte", "story"], `${s.id} : ${m.nom}`).toContain(m.format);
        for (const k of ["ceQuOnVoit", "legende", "donnees", "risque"] as const) expect(m[k].length, `${s.id} : ${m.nom} : ${k}`).toBeGreaterThan(10);
        // Ce qu'on lit sur l'image peut être « rien » (une image d'ambiance n'a pas de texte).
        expect(m.ceQuOnLit.trim().length, `${s.id} : ${m.nom} : ceQuOnLit`).toBeGreaterThan(2);
      }
    }
  });

  it("le secteur du client est reconnu sans IA, dans sa famille seulement", () => {
    const id = (offer: string, b: "products" | "services") => K.publicationSectorOf(offer, b)?.id ?? null;
    expect(id("Des infusions de fruits en vrac à boire froides", "products")).toBe("the-cafe");
    expect(id("Un sérum éclat et une crème pour le visage", "products")).toBe("cosmetiques");
    // Ce qu'il vend compte double : un sérum à la vitamine C reste un soin, pas un complément alimentaire.
    expect(K.publicationSectorOf("Soin visage haut de gamme à la vitamine C", "products", "Sérum Éclat")?.id).toBe("cosmetiques");
    expect(id("Un tapis de yoga, une brique et une sangle", "products")).toBe("sport");
    expect(id("Fauteuil terracotta et lampe de chevet", "products")).toBe("maison");
    expect(id("Barbier pour hommes : coupe, barbe, rasage au coupe-chou", "services")).toBe("barbier");
    expect(id("Électricien : dépannage et rénovation électrique", "services")).toBe("batiment");
    expect(id("Je répare les vélos chez les gens", "services")).toBe("reparation");
    expect(id("Agence de voyages sur mesure", "services")).toBeNull();
    // Un barbier n'est jamais lu comme une marque de produits.
    expect(K.publicationSectorOf("barbier, rasage", "products")?.famille ?? "produit").toBe("produit");
  });

  it("ce que lisent la stratège et le juge d'un secteur : sans comptes ni adresses ; les vraies photos exigées sont dites", () => {
    const r = K.publicationModelsFor("barbier pour hommes, rasage", "services");
    expect(r.sector?.id).toBe("barbier");
    expect(r.forPlanner).toMatch(/^MODÈLES DE PUBLICATION DU SECTEUR « barbier et coiffeur pour hommes »/);
    expect(r.forPlanner).toMatch(/On voit : [\s\S]*On lit : [\s\S]*Il faut savoir du client : [\s\S]*Ce qui le fait rater : /);
    expect(r.forPlanner).toMatch(/À ÉVITER DANS CE SECTEUR/);
    expect(r.forPlanner).not.toMatch(/https?:\/\//);
    expect(r.forPlanner.length).toBeLessThanOrEqual(K.MAX_MODELS_CHARS + K.MAX_REAL_POSTS_CHARS + 2000);
    expect(r.forJudge).toMatch(/MODÈLES QUI EXIGENT UNE VRAIE PHOTO DU CLIENT/);
    const none = K.publicationModelsFor("agence de voyages", "services");
    expect(none.sector).toBeNull();
    expect(none.forPlanner).toMatch(/AUCUN SECTEUR RECONNU/);
    expect(none.forJudge).toBe("");
  });

  it("vraies publications prises sur les réseaux : des images seulement, décrites, chacune dans un secteur connu", () => {
    // Demandes du propriétaire du 14 novembre 2026 : « aller chercher sur les réseaux des publications pour prendre
    // exemple » ; « C'est les publications images que tu dois regarder pas vidéos ».
    const raw = JSON.parse(fs.readFileSync(K.realPostsFile(), "utf8")) as { publications: K.RealPost[]; regle: string };
    expect(raw.regle).toMatch(/jamais/);
    const all = raw.publications, ids = new Set(K.publicationSectors().map((s) => s.id));
    expect(all.length).toBeGreaterThanOrEqual(80);
    expect(K.realPosts()).toHaveLength(all.length);
    expect(new Set(all.map((p) => p.url)).size).toBe(all.length);
    for (const p of all) {
      expect(["image", "carrousel"], p.url).toContain(p.format);
      expect(p.url, "une publication en image, jamais un reel").toMatch(/^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/);
      for (const s of p.secteurs) expect(ids.has(s), `${p.url} : secteur ${s}`).toBe(true);
      expect(["oui", "oui sans les personnes", "non"]).toContain(p.faisableParSina);
      expect(p.note, p.url).toBeGreaterThanOrEqual(1);
      expect(p.note, p.url).toBeLessThanOrEqual(10);
      expect(p.idee.length, p.url).toBeGreaterThan(20);
      // Ce que lisent les spécialistes ne cite jamais le compte.
      const core = K.accountCore(p.compte);
      if (core.length >= 4) expect(`${p.idee} ${p.pourquoiCaMarche} ${p.aEviter}`.toLowerCase(), p.url).not.toContain(core);
    }
    // Le secteur de l'essai (thé, café, infusions) en a assez pour servir de barre.
    expect(all.filter((p) => p.secteurs.includes("the-cafe")).length).toBeGreaterThanOrEqual(20);
  });

  it("la stratège lit les vraies publications qu'elle peut suivre ; le juge les lit toutes, sans compte ni adresse", () => {
    const planner = K.realPostsText("the-cafe", "stratege"), judge = K.realPostsText("fleuriste", "juge");
    expect(planner).toMatch(/^VRAIES PUBLICATIONS EN IMAGE DE CE SECTEUR/);
    expect(planner).toMatch(/jamais l'image ni les mots/);
    expect(planner).not.toMatch(/exige la vraie photo/);
    expect(planner.length).toBeLessThanOrEqual(K.MAX_REAL_POSTS_CHARS);
    // Un fleuriste : des fleurs créées passeraient pour son arrivage ; le juge le sait.
    expect(judge).toMatch(/exige la vraie photo du commerçant/);
    for (const t of [planner, judge]) {
      expect(t).not.toMatch(/https?:\/\/|instagram\.com|@\w/);
      for (const p of K.realPosts()) { const c = K.accountCore(p.compte); if (c.length >= 5) expect(t.toLowerCase(), c).not.toMatch(new RegExp(`(?<!\\p{L})${c}(?!\\p{L})`, "u")); }
    }
    // Les modèles du secteur arrivent avec ses vraies publications ; un secteur sans relevé n'a que ses modèles.
    const tea = K.publicationModelsFor("Des infusions de fruits en vrac à boire froides", "products");
    expect(tea.forPlanner).toContain("VRAIES PUBLICATIONS EN IMAGE");
    expect(tea.forJudge).toContain("VRAIES PUBLICATIONS EN IMAGE");
    expect(K.realPostsText("conseil", "stratege")).toBe("");
    expect(K.accountCore("drinkpoppi")).toBe("poppi");
    expect(K.accountCore("kusmiteaparis")).toBe("kusmi");
  });

  it("règles en tête : la partie « Ce que SINA doit en tirer » remonte sous le titre, une seule fois", () => {
    const md = "# Titre\n\nIntroduction.\n\n## 1. Partie\n\nTexte.\n\n## 9. Ce que SINA doit en tirer\n\n1. Règle une.\n\n---\n\n## Sources\n\n1. Source.";
    const out = K.rulesFirst(md);
    expect(out.indexOf("Ce que SINA doit en tirer")).toBeLessThan(out.indexOf("## 1. Partie"));
    expect(out.match(/Ce que SINA doit en tirer/g)).toHaveLength(1);
    expect(out).toContain("1. Règle une.");
    expect(K.rulesFirst("# Sans règles\n\nTexte.")).toBe("# Sans règles\n\nTexte.");
  });
});
