/**
 * Les épreuves PROPOSÉES de la méthode des graphistes, rejouées comme des essais ordinaires tant que le propriétaire n'a
 * pas donné son accord écrit (`tests/epreuves/a-sceller-methode-des-graphistes.ts`). Aucune n'est dans le catalogue ni
 * scellée ; aucun sceau n'est touché. Aucun appel payant.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { EPREUVES } from "./epreuves/catalogue";
import { EPREUVES_A_SCELLER } from "./epreuves/a-sceller-methode-des-graphistes";
import { finaliserUneEsquisse, consigneDeFinalisation, LIGNE_D_EVOLUTION, controleDuTexte, raisonsDuRefus, type RelectureDuLogo } from "@/lib/syna-agent/logo-finalisation";
import { demandeDeRecherche, lancerLesPlanches } from "@/lib/syna-agent/logo-recherche";
import { requeteDePlanche, champsDeFinalisation } from "@/lib/ai/media-providers";
import { basculer, messageDuChoix } from "@/lib/syna-agent/choix-esquisses";

const proposee = (id: string, fn: () => Promise<void> | void) => {
  const e = EPREUVES_A_SCELLER.find((x) => x.id === id);
  if (!e) throw new Error(`épreuve proposée inconnue : ${id}`);
  it(`${id} (proposée, remplacerait ${e.remplacerait}) — ${e.attendu}`, fn);
};

describe("les épreuves proposées ne sont ni au catalogue ni scellées (elles attendent l'accord écrit du propriétaire)", () => {
  it("aucune n'est au catalogue, aucune n'a de sceau ; les épreuves qu'elles remplaceraient existent encore, intactes", () => {
    const sceaux = JSON.parse(fs.readFileSync("tests/epreuves/sceaux.json", "utf8"));
    for (const e of EPREUVES_A_SCELLER) {
      expect(EPREUVES.some((x) => x.id === e.id), e.id).toBe(false);
      expect(sceaux[e.id], e.id).toBeUndefined();
      const ancienne = EPREUVES.find((x) => x.id === e.remplacerait);
      expect(ancienne && sceaux[ancienne.id], e.remplacerait).toBeTruthy();
      expect(ancienne!.remplaceePar, e.remplacerait).toBeUndefined();
      expect(fs.existsSync(e.source)).toBe(true);
    }
    expect(EPREUVES_A_SCELLER.map((e) => e.id).sort()).toEqual(["esquisses-choisies-selon-le-forfait", "finalisation-ecrite-par-le-plus-fort", "logo-refait-une-fois-avec-ses-raisons", "planches-de-recherche-demande-exacte", "relecteur-du-logo-fini"]);
  });
});

const NOM = "Halo", METIER = "une entreprise qui fabrique des bougies parfumées en cire végétale";
const TEXTE = `Transforme cette esquisse en véritable logo contemporain pour ${NOM}, ${METIER}. Conserve l'idée centrale : un halo autour du H. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
const bon: RelectureDuLogo = { nomLu: NOM, ideeConservee: true, evolution: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" };
const png = () => sharp({ create: { width: 300, height: 120, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 200, height: 60, channels: 3, background: "#222222" } }, left: 50, top: 30 }]).png().toBuffer();

describe("les épreuves proposées de la méthode des graphistes", () => {
  proposee("logo-refait-une-fois-avec-ses-raisons", async () => {
    const envoyes: string[] = [];
    const r = await finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un halo", texte: TEXTE }),
      finaliser: async (_e, t) => { envoyes.push(t); return png(); },
      relire: async () => ({ ...bon, note: 5 }),
      detourer: async (p) => ({ ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: NOM, metier: METIER, esquisse: await png() });
    expect(r.ok).toBe(false);
    expect(envoyes).toHaveLength(2);
    expect(envoyes[1]).toBe(`${TEXTE} À corriger : il n'est pas au niveau (5/10, il faut 8).`);
  });
  proposee("esquisses-choisies-selon-le-forfait", async () => {
    const { controleDuChoix, esquissesAChoisir } = await import("@/lib/syna-agent/logo-graphistes");
    expect([esquissesAChoisir("creer"), esquissesAChoisir("vendre"), esquissesAChoisir("dominer")]).toEqual([2, 3, 4]);
    const etat = { max: 3, esquisses: [3, 7, 11, 12].map((numero) => ({ numero, assetId: "a", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null })) };
    expect(controleDuChoix(etat, [3, 7, 11])).toBeNull();
    expect(controleDuChoix(etat, [7, 11])).toBeNull();
    expect(controleDuChoix(etat, [7])).toBeTruthy();
    expect(controleDuChoix(etat, [3, 7, 11, 12])).toBeTruthy();
    expect(controleDuChoix(etat, [5])).toBeTruthy();
    let s: number[] = []; for (const n of [11, 3, 7, 12]) s = basculer(s, n, 3);
    expect(messageDuChoix(s)).toBe("Je choisis les esquisses 3, 7 et 11");
  });
  proposee("finalisation-ecrite-par-le-plus-fort", async () => {
    const { vraisAppels } = await import("@/lib/syna-agent/logo-graphistes");
    expect(typeof vraisAppels).toBe("function");
    const t = await import("@/lib/ai/text-models");
    expect(t.textModel("openai", "gpt-6.2-astra")).toMatchObject({ tier: "strong", vision: true });
    const c = consigneDeFinalisation(NOM, METIER);
    expect(c).toContain(LIGNE_D_EVOLUTION);
    expect(c).not.toMatch(/#[0-9a-f]{6}/i);
    expect(controleDuTexte(TEXTE, NOM, METIER)).toEqual([]);
    expect(champsDeFinalisation(TEXTE)).toEqual({ model: "gpt-image-2.6-sunburst", prompt: TEXTE, quality: "high", size: "auto", background: "opaque", output_format: "png", n: 1 });
  });
  proposee("planches-de-recherche-demande-exacte", async () => {
    const prompt = demandeDeRecherche({ nom: NOM, metier: { metier: METIER, court: "la bougie", piste: "savoir-faire" } });
    expect(prompt).not.toMatch(/couleur|typograph|#|fond blanc uni|refus|client/i);
    const vus: string[] = [];
    await lancerLesPlanches(async (m, p) => { vus.push(`${m}|${p}`); return { png: Buffer.from(""), requestId: null, usage: null, coutMicro: null }; }, prompt);
    expect(vus.sort()).toEqual([`gpt-image-2.5-sunburst|${prompt}`, `gpt-image-2.6-flare|${prompt}`]);
    expect(requeteDePlanche("gpt-image-2.5-sunburst", prompt)).not.toHaveProperty("complexity");
    expect(requeteDePlanche("gpt-image-2.6-flare", prompt)).toMatchObject({ complexity: "medium" });
    expect(demandeDeRecherche({ nom: NOM, metier: { metier: METIER, court: "la bougie", piste: "savoir-faire" }, eviter: ["un H auréolé"] })).toBe(`${prompt} Évite ces pistes déjà présentées : un H auréolé.`);
  });
  proposee("relecteur-du-logo-fini", () => {
    expect(raisonsDuRefus(bon, NOM)).toEqual([]);
    for (const v of [{ nomLu: "Hal0" }, { ideeConservee: false }, { evolution: false }, { arche: true }, { phrase: "Lumière éternelle", phraseDitLeMetier: false }, { note: 7 }]) expect(raisonsDuRefus({ ...bon, ...v }, NOM)).toHaveLength(1);
  });
});
