/**
 * Décision du chef d'orchestre du 26 novembre 2026 : « aligner tous ces textes dans un même lot gratuit : tutoiement, aucun
 * mot technique, aucun euro pour l'IA (règle du propriétaire) ».
 *
 * Source de vérité : les textes que le client lit dans ces fichiers (premier argument de `L(…)` ou de `t(…)`, la phrase
 * française, et la phrase anglaise alignée) ne vouvoient jamais, ne nomment jamais le fournisseur, une interface technique
 * (API, code d'erreur, commande), un identifiant de modèle, ni un montant en euros lié à l'IA. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

/** Fichiers dont TOUS les textes `L(…)` / `t(…)` sont lus par le client (notifications, messages de tâche, écrans). */
const FICHIERS = [
  "src/lib/social-v2/scheduler.ts",
  "src/lib/social-v2/automations.ts",
  "src/lib/engine/cutouts.ts",
  "src/lib/engine/images.ts",
  "src/lib/syna-agent/mockup-code/job.ts",
  "src/lib/tool-errors.ts",
  "src/lib/http.ts",
  "src/app/syna-fondations/vitrine.tsx",
  "src/components/studio/syna-thread.tsx",
  "src/components/studio/cost-confirm.tsx",
  "src/components/studio/visual-choice.tsx",
  "src/components/studio/social-create.tsx",
  "src/components/studio/tab-images.tsx",
  "src/components/studio/ad-editor/ai-ad-creator.tsx",
];

/** Textes de la marque du client, écrits pour SES clients (le vouvoiement y est le sien) : jamais une phrase au client. */
const TEXTES_DE_LA_MARQUE = [/partout où vous allez/];
const VOUVOIEMENT = /\b(vous|votre|vos|vôtre)\b/i;
const TECHNIQUE = /fournisseur|\bprovider\b|\bAPI\b|moteur local|local engine|erreur \d{3}|error \d{3}|Codespace|sudo|apt-get|ENOENT/i;
const MODELE = /\b(gpt-?\d|gpt-image|dall-?e|sora|veo|kling|seedream|seedance|flux|imagen|claude-|gemini|qwen)/i;
const EUROS_IA = /\d\s?€|€\s?\d/;

/** Les chaînes littérales passées en premier et second argument de `L(` ou `t(` (simples, doubles ou gabarits). */
function textesDe(src: string): string[] {
  const out: string[] = [];
  const re = /\b(?:L|t)\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1\s*,\s*(["'`])((?:\\.|(?!\3)[\s\S])*?)\3/g;
  for (const m of src.matchAll(re)) out.push(m[2], m[4]);
  return out;
}

describe("textes du client alignés : tutoiement, aucun mot technique, aucun euro pour l'IA", () => {
  for (const f of FICHIERS) {
    it(f, () => {
      const textes = textesDe(fs.readFileSync(f, "utf8"));
      expect(textes.length, f).toBeGreaterThan(0);
      for (const x of textes) {
        if (!TEXTES_DE_LA_MARQUE.some((r) => r.test(x))) expect(x, `${f} : ${x}`).not.toMatch(VOUVOIEMENT);
        expect(x, `${f} : ${x}`).not.toMatch(TECHNIQUE);
        expect(x, `${f} : ${x}`).not.toMatch(MODELE);
        expect(x, `${f} : ${x}`).not.toMatch(EUROS_IA);
      }
    });
  }

  it("les phrases relevées le 26 novembre 2026 ont disparu des écrans, des notifications et des messages de tâche", () => {
    const anciennes: [string, RegExp][] = [
      ["src/lib/billing.ts", /faites vérifier le résultat incertain|Reprenez son suivi/],
      ["src/lib/ai/media-providers.ts", /conservé chez le fournisseur/],
      ["src/lib/social-v2/autopilot.ts", /recharge de 10 €|ajoutez une recharge|€10 top-up/],
      ["src/lib/social-v2/autopilot.ts", /relisez-les|sans votre accord/],
      ["src/lib/engine/custom-theme.ts", /\bVotre thème|votre marque|Réessayez|Relancez|Créez d'abord|Choisissez d'abord/],
      ["src/lib/engine/calendar.ts", /n'a pas pu être utilisée \(\$\{aiFailed/],
      ["src/components/billing-client.tsx", /moteur local|local engine/],
      ["src/components/studio/asset-viewer.tsx", /API officielle Canva|a\.meta\.provider \?/],
      ["src/components/studio/tab-videos.tsx", /fournisseur désactivé|forfait Découverte/],
    ];
    for (const [f, rx] of anciennes) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(rx);
  });

  it("l'étape déjà lancée : phrase de SINA tutoyée, sans euro ni mot technique, reconnue par son code", async () => {
    const { operationPending } = await import("@/lib/billing");
    const { CODE_DEJA_LANCEE, UserFacingError } = await import("@/lib/jobs");
    const { runWithLang } = await import("@/lib/i18n-server");
    for (const ui of ["fr", "en"] as const) {
      let e: unknown;
      try { runWithLang({ ui, content: ui }, () => operationPending()); } catch (x) { e = x; }
      expect(e).toBeInstanceOf(UserFacingError);
      expect((e as InstanceType<typeof UserFacingError>).code).toBe(CODE_DEJA_LANCEE);
      const m = (e as Error).message;
      expect(m).not.toMatch(VOUVOIEMENT);
      expect(m).not.toMatch(TECHNIQUE);
      expect(m).not.toMatch(EUROS_IA);
      expect(m).not.toMatch(/incertain|uncertain/i);
    }
  });

  it("ffmpeg absent : le client lit une phrase simple ; la marche à suivre reste au Studio", async () => {
    const { detailOutilManquant, friendlyToolError, outilManquant } = await import("@/lib/tool-errors");
    const { runWithLang } = await import("@/lib/i18n-server");
    const fr = runWithLang({ ui: "fr", content: "fr" }, () => friendlyToolError("spawn ffmpeg ENOENT"));
    expect(fr).toMatch(/Je n'ai pas pu préparer la vidéo/);
    expect(fr).not.toMatch(TECHNIQUE);
    expect(fr).not.toMatch(/ffmpeg/);
    expect(outilManquant("spawn ffprobe ENOENT")).toBe(true);
    expect(detailOutilManquant("spawn ffmpeg ENOENT")).toMatch(/sudo apt-get install -y ffmpeg/);
  });

  it("un outil de SINA en panne : le fil le dit comme SINA, et la panne reste reconnue (anciens résumés compris)", async () => {
    const { PREFIXE_ECHEC_FR, PREFIXE_ECHEC_EN, vraiEchec } = await import("@/lib/syna-agent/conversation");
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("L(PREFIXE_ECHEC_FR, PREFIXE_ECHEC_EN)");
    expect(vraiEchec({ tool: "catalogue.update", summary: `${PREFIXE_ECHEC_FR}base indisponible` })).toBe(true);
    expect(vraiEchec({ tool: "catalogue.update", summary: `${PREFIXE_ECHEC_EN}database unavailable` })).toBe(true);
    expect(vraiEchec({ tool: "catalogue.update", summary: "Échec de l'outil : base indisponible" })).toBe(true);
    expect(vraiEchec({ tool: "catalogue.update", summary: "Produit introuvable" })).toBe(false);
    const fil = fs.readFileSync("src/components/studio/syna-thread.tsx", "utf8");
    expect(fil).not.toMatch(/t\("Erreur : "|L'exécution s'est arrêtée/);
  });
});
