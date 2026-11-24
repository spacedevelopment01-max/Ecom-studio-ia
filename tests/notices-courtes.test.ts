/**
 * Banc gratuit des notices d'outils de SINA (23 novembre 2026, notices plus courtes) : aucune IA. Les notices sont plus
 * courtes, et aucune règle n'est perdue : chaque nom d'argument, chaque valeur permise, chaque borne, chaque motif et
 * chaque valeur par défaut du schéma se retrouve dans l'écriture courte ; les règles des notices réécrites sont toujours
 * là ; la longueur totale ne remonte pas.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allTools, argsCourts, toolEntry } from "@/lib/syna-agent/registry";

/** Tout ce que le schéma JSON impose, en morceaux de texte qui doivent apparaître dans l'écriture courte. */
function regles(n: any, out: string[] = []): string[] {
  if (!n || typeof n !== "object") return out;
  if (Array.isArray(n)) { n.forEach((x) => regles(x, out)); return out; }
  for (const k of Object.keys(n.properties ?? {})) out.push(`${k}${(n.required ?? []).includes(k) ? ":" : "?:"}`);
  for (const v of n.enum ?? []) out.push(JSON.stringify(v));
  if (n.const !== undefined) out.push(JSON.stringify(n.const));
  for (const k of ["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]) if (typeof n[k] === "number" && Math.abs(n[k]) < Number.MAX_SAFE_INTEGER) out.push(String(n[k]));
  if (n.pattern) out.push(n.pattern);
  if (n.default !== undefined) out.push(`défaut ${JSON.stringify(n.default)}`);
  for (const k of ["properties", "$defs"]) for (const v of Object.values(n[k] ?? {})) regles(v, out);
  for (const k of ["items", "anyOf", "oneOf", "allOf", "additionalProperties", "propertyNames"]) if (n[k] && typeof n[k] === "object") regles(n[k], out);
  return out;
}

/** Les règles des notices réécrites, qui doivent rester mot pour mot. */
const GARDEES: Record<string, string[]> = {
  "start.answer": ["Ses mots, sans rien ajouter", "pose-lui la question", "« later » seulement s'il dit répondre plus tard", "refusé pour business, offer, audience", "« none » seulement", "Gratuit, utilisable avant la création du projet"],
  "start.note": ["ses mots exacts, rien d'ajouté ni reformulé", "le même sujet remplace la note précédente", "« fait », « aime » ou « refuse »", "en cas de doute : « tout »", "Refusé s'il ne l'a pas dit dans son dernier message", "relue en entier avant chaque création"],
  "start.keep": ["TEL QUEL", "keep: []", "textes EXACTS", "Un logo gardé qui contient le nom garde aussi ce nom"],
  "atelier.etat": ["Gratuit", "à lire avant de lui proposer l'atelier", "part de son budget du mois", "plafond de vidéos", "conditions de l'atelier"],
  "atelier.creer": ["PAYANT", "rien ne part sans sa confirmation", "toujours fait par OpenAI et relu par le juge qui lit l'étiquette", "30 au plus", "SES mots tels quels", "Jamais de personne sans sa photo et son accord écrit", "lui est dite telle quelle"],
  "atelier.placer": ["SEULEMENT quand le client te le demande", "rien n'est publié", "aucune diffusion", "ne part nulle part", "restent sur leurs emplacements", "jamais deux fois la même photo sur son site"],
  "calendar.plan": ["MANUEL", "le client publie lui-même", "offertes (Instagram et Facebook)", "seulement si le client le demande", "Les cases déjà cochées « publié » sont gardées", "Rien n'est inventé", "Aucune publication automatique"],
  "shop.offers": ["QUE LE CLIENT A DONNÉES", "SEULEMENT ce qu'il donne", "remisesConfirmees (true seulement quand il confirme", "seulement pour un vrai programme de fidélité", "N'invente JAMAIS une offre, un pourcentage ou une date", "s'ajoute d'elle-même aux paliers"],
  "shop.discounts_check": ["Gratuit, sans IA", "que si la boutique le tient", "l'emporte ensuite sur ce que le client a déclaré", "(data.guide)"],
  "catalogue.photos": ["(gratuit)", "la première devient la photo principale", "replace:true", "Jamais une image créée par l'IA", "sans refaire le site"],
  "ads.create": ["PAYANT", "UNE PAR TYPE DE CLIENT", "jamais deux pour le même", "chaque image contrôlée avant d'être montrée", "jamais devinés"],
  "identity.propose": ["VRAIMENT différentes", "2, 3 ou 4 selon son forfait", "PLANCHE", "paroles réelles de clients avec leur page", "le Studio montre le devis", "les autres restent identiques"],
  "identity.choose": ["PAR LE CLIENT (jamais à sa place)", "mot pour mot", "Gratuit"],
  // L'ancienne série de logos est retirée (accord du 24 novembre 2026) : un autre logo passe par logo.autre ou logo.pistes.
  "brand.finish": ["logo.autre ou logo.pistes, jamais ici", "le Studio montre le prix avant", "fond retiré"],
  "angles.propose": ["TROIS TYPES DE CLIENTS différents", "un sûr, un d'émotion, un audacieux", "Tu relis chaque angle sévèrement avant de le montrer", "un seul accord pour toute l'étape", "avec SES mots", "les angles déjà montrés ne sont pas refaits"],
  "gallery.create": ["PAYANT", "accord écrit du client d'abord", "CARRÉES", "UNIQUEMENT avec les faits donnés par le client", "une image ratée n'est pas posée et elle est signalée", "accordEcrit = ses mots exacts"],
};

describe("banc gratuit des notices d'outils", () => {
  it("l'écriture courte des arguments garde chaque règle du schéma", () => {
    const manquantes: string[] = [];
    for (const t of allTools()) {
      let schema: unknown;
      try { schema = z.toJSONSchema(t.args, { unrepresentable: "any" }); } catch { continue; }
      const court = argsCourts(schema);
      for (const r of regles(schema)) if (!court.includes(r)) manquantes.push(`${t.name} : ${r}`);
    }
    expect(manquantes).toEqual([]);
  });

  it("les règles des notices réécrites sont toujours là", () => {
    const tools = new Map(allTools().map((t) => [t.name, t.description]));
    const perdues = Object.entries(GARDEES).flatMap(([name, rules]) => (tools.has(name) ? rules.filter((r) => !tools.get(name)!.includes(r)).map((r) => `${name} : ${r}`) : [`${name} : outil absent`]));
    expect(perdues).toEqual([]);
  });

  it("la longueur totale des notices baisse (avant : 120 684 signes, dont 62 743 de descriptions)", () => {
    const tools = allTools();
    const total = tools.reduce((a, t) => a + toolEntry(t).length, 0), descriptions = tools.reduce((a, t) => a + t.description.length, 0);
    expect(descriptions).toBeLessThanOrEqual(61_750);
    expect(total).toBeLessThanOrEqual(92_500);
  });

  it("l'écriture courte se lit : facultatif marqué, bornes et valeur par défaut dites en mots", () => {
    const S = z.object({ a: z.string().min(1).max(80), b: z.enum(["x", "y"]).default("x"), c: z.array(z.number().int().min(0)).max(3).optional(), d: z.record(z.string(), z.boolean()) });
    expect(argsCourts(z.toJSONSchema(S))).toBe('{a: texte (1 à 80 signes), b: "x"|"y" (défaut "x"), c?: [entier (≥ 0)] (≤ 3 éléments), d: {[clé]: booléen}}');
  });
});
