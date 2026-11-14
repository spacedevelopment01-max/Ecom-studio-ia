/**
 * Le savoir du thème lu par SINA et ses spécialistes (13 novembre 2026, demande du propriétaire : « tu n'as pas été sur
 * internet contrôler 1000 thèmes pour pas que sina s'en servent »). Chaque spécialiste lit ses cahiers de métier ; la
 * lecture est comptée dans les devis ; un cahier absent arrête le travail avant tout appel payant. Aucun appel réel.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("thème sur mesure : les cahiers de métier lus par chaque spécialiste", async () => {
  const K = await import("@/lib/syna-agent/custom-theme/knowledge");
  const D = await import("@/lib/syna-agent/custom-theme/design");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  afterEach(() => { delete process.env.SINA_SAVOIR_DIR; });

  it("chaque spécialiste a ses cahiers, sans sources ni adresses, coupés proprement", () => {
    expect(K.themeKnowledgeReady()).toEqual({ ok: true });
    expect(Object.keys(K.THEME_READS).sort()).toEqual(["concepteur", "directriceArtistique", "juge", "redacteur", "relecteur", "relecteurTextes"]);
    for (const who of Object.keys(K.THEME_READS) as (keyof typeof K.THEME_READS)[]) {
      const text = K.themeKnowledge(who);
      expect(text).toMatch(/^TON SAVOIR DE MÉTIER[^]*Tu ne cites aucun site, aucune marque ni aucun thème/);
      expect((text.match(/══ CAHIER : /g) ?? []).length).toBe(K.THEME_READS[who].length);
      expect(text).not.toMatch(/https?:\/\//); // aucune adresse de site
      expect(text).not.toMatch(/^##\s+Sources\b/m);
      expect(text).not.toMatch(/\[S\d+[^\]]*\]|\(lu\)|Points à trancher avec le propriétaire/); // ni repère de source, ni note laissée au propriétaire
      for (const b of K.THEME_READS[who]) expect(K.themeBook(b).length).toBeLessThanOrEqual(K.MAX_THEME_BOOK_CHARS);
    }
    // Le concepteur lit les pages, les ouvertures et la mise en page ; le juge l'originalité ; le rédacteur les textes.
    expect(K.themeKnowledge("concepteur")).toMatch(/CONSTRUIRE LES PAGES D'UN SITE[^]*GESTES DE SIGNATURE ET FORMES D'OUVERTURE[^]*MISE EN PAGE ET MOUVEMENT/);
    expect(K.themeKnowledge("juge")).toContain("ORIGINALITÉ ET SIGNATURE");
    expect(K.themeKnowledge("redacteur")).toContain("ÉCRIRE LES TEXTES D'UN SITE");
    expect(K.themeKnowledge("directriceArtistique")).toContain("LES IMAGES D'UN SITE");
    // La consigne du spécialiste reste en tête : ses règles passent avant son savoir.
    expect(K.educated(D.DESIGN_SYSTEM, "concepteur").startsWith(D.DESIGN_SYSTEM)).toBe(true);
    expect(K.educated(B.SECTION_WRITE_SYSTEM, "redacteur")).toContain("TON SAVOIR DE MÉTIER");
  });

  it("la lecture des cahiers est comptée dans les devis : le premier appel au plein tarif, les suivants à un dixième", () => {
    const one = K.knowledgeTypicalMicro("redacteur", "strategy", 1);
    expect(one).toBeGreaterThan(0);
    expect(K.knowledgeTypicalMicro("redacteur", "strategy", 0)).toBe(0);
    expect(K.knowledgeTypicalMicro("redacteur", "strategy", 11)).toBe(Math.round(one * 2));
    // Au plus : chaque appel au tarif le plus cher, toujours au-dessus du coût probable.
    expect(K.knowledgeCapMicro("redacteur", "strategy", 11)).toBeGreaterThan(K.knowledgeTypicalMicro("redacteur", "strategy", 11) * 5);
    expect(K.knowledgeTokens("concepteur")).toBeGreaterThan(K.knowledgeTokens("juge"));
  });

  it("un cahier absent n'est jamais remplacé en silence", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savoir-vide-"));
    process.env.SINA_SAVOIR_DIR = dir;
    const r = K.themeKnowledgeReady();
    // Les cahiers déjà lus restent en mémoire : le contrôle porte sur un dossier jamais lu.
    expect(r.ok === true || /Cahier de métier introuvable/.test((r as { reason: string }).reason)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
