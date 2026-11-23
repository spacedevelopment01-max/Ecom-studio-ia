/**
 * LA SORTIE STRICTE PARTOUT OÙ UN SCHÉMA EST ATTENDU (23 novembre 2026, recherche sur les coûts, ligne 10). Le
 * fournisseur est tenu de répondre dans la forme du schéma (Anthropic : `output_config.format` ; OpenAI :
 * `strict: true`) : plus de reprise payée pour une réponse mal formée. Ce que le code accepte ne change pas : la
 * réponse est toujours validée ici par le même schéma, et les contraintes que le fournisseur ne sait pas tenir
 * (longueurs, bornes, règles écrites en code) restent vérifiées et réparées comme avant.
 *
 * Un schéma n'est envoyé strict que s'il peut l'être sans rien perdre : un objet ouvert (clés libres, `z.record`,
 * `passthrough`), une valeur de forme libre (`z.unknown`), un n-uplet ou une transformation resteraient fermés ou
 * refusés par le fournisseur ; ces schémas-là partent en JSON libre, comme avant. Un schéma refusé quand même par le
 * fournisseur (refus net, rien n'est facturé) est retenu, et la demande repart en JSON libre.
 */
import { toJSONSchema, type z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PermanentError } from "../jobs";

type Js = Record<string, any>;

/** Ce qui rendrait la sortie stricte plus étroite que ce que le code accepte (ou impossible à envoyer). */
function ouvert(node: unknown): string | null {
  if (node === true || node === false) return "schéma booléen";
  if (!node || typeof node !== "object") return null;
  const n = node as Js;
  if (n.additionalProperties !== undefined && n.additionalProperties !== false) return "objet aux clés libres";
  if (n.patternProperties || n.propertyNames) return "objet aux clés libres";
  if (n.prefixItems || n.items === false) return "n-uplet";
  if (n.not || n.if || n.then || n.else || n.dependentSchemas) return "condition";
  const typed = n.type !== undefined || n.anyOf || n.oneOf || n.allOf || n.$ref || n.const !== undefined || n.enum;
  if (!typed) return "valeur de forme libre";
  for (const k of ["properties", "$defs"] as const) for (const v of Object.values((n[k] ?? {}) as Js)) { const w = ouvert(v); if (w) return w; }
  for (const k of ["anyOf", "oneOf", "allOf"] as const) for (const v of (n[k] ?? []) as unknown[]) { const w = ouvert(v); if (w) return w; }
  if (n.items !== undefined) return ouvert(n.items);
  return null;
}

/** Raison pour laquelle ce schéma part en JSON libre ; null s'il peut partir strict. */
export function raisonSansStrict(schema: z.ZodType): string | null {
  let raw: unknown;
  try { raw = toJSONSchema(schema as any, { reused: "ref" }); } catch { return "transformation"; }
  const w = ouvert(raw);
  if (w) return w;
  try { zodOutputFormat(schema as any); } catch { return "schéma non convertible"; }
  return null;
}

/** Schémas refusés par un fournisseur pendant la vie du processus (clé : fournisseur et empreinte du schéma). */
const refuses = new Set<string>();
export const schemaRefuse = (cle: string) => refuses.has(cle);
export const retenirRefus = (cle: string) => { refuses.add(cle); };
export const oublierRefus = () => refuses.clear();

/** Format strict d'un schéma (le même que celui d'avant pour Anthropic), ou null s'il doit partir en JSON libre. */
export function formatStrict(schema: z.ZodType): ReturnType<typeof zodOutputFormat> | null {
  return raisonSansStrict(schema) ? null : zodOutputFormat(schema as any);
}

/**
 * Refus net du fournisseur portant sur le schéma (400 : rien n'est produit ni facturé). Même message qu'avant pour
 * l'appelant qui l'a demandé strict ; llmJson, quand il a choisi seul la sortie stricte, repart en JSON libre.
 */
export class SchemaRefuse extends PermanentError {}
export const REFUS_DE_SCHEMA = /schema|grammar|output_config|json_schema|response_format|text\.format|structured|responseJsonSchema|too complex|optional (?:param|propert)|union/i;

/**
 * Écarts que le fournisseur ne garantit pas, même en sortie stricte (longueurs, bornes, motifs, règles écrites en
 * code) : ceux-là gardent la réparation d'une fois, comme en JSON libre. Un écart de forme (type, clé, valeur hors
 * liste) ne peut pas venir d'une sortie stricte : il n'est jamais redemandé (rien n'est repayé).
 */
export function seulementContraintes(issues: readonly { code: string }[]): boolean {
  return issues.length > 0 && issues.every((i) => ["custom", "too_small", "too_big", "invalid_format", "not_multiple_of"].includes(i.code));
}

/**
 * OpenAI en mode strict exige que chaque clé soit présente : une clé facultative devient « valeur ou null », et le null
 * est retiré à la lecture (sansNullsFacultatifs), pour que le code reçoive exactement ce qu'il acceptait.
 */
export function schemaPourOpenAI(schema: Js): Js {
  const go = (n: any): any => {
    if (!n || typeof n !== "object") return n;
    const o: Js = { ...n };
    if (o.$defs) o.$defs = Object.fromEntries(Object.entries(o.$defs).map(([k, v]) => [k, go(v)]));
    for (const k of ["anyOf", "allOf"]) if (Array.isArray(o[k])) o[k] = o[k].map(go);
    if (o.items) o.items = go(o.items);
    if (o.properties) {
      const req = new Set<string>(o.required ?? []);
      o.properties = Object.fromEntries(Object.entries(o.properties).map(([k, v]) => [k, req.has(k) ? go(v) : { anyOf: [go(v), { type: "null" }] }]));
      o.required = Object.keys(o.properties);
    }
    return o;
  };
  return go(schema);
}

const accepteNull = (n: any): boolean => !!n && (n.type === "null" || (Array.isArray(n.type) && n.type.includes("null")) || (Array.isArray(n.anyOf) && n.anyOf.some(accepteNull)) || n.const === null || (Array.isArray(n.enum) && n.enum.includes(null)));

/** Retire les null qu'OpenAI met sur les clés facultatives qui n'acceptent pas null (schéma de schemaPourOpenAI). */
export function sansNullsFacultatifs(data: unknown, schema: Js): unknown {
  const root = schema;
  const resoudre = (n: any): any => (n?.$ref && typeof n.$ref === "string" ? root.$defs?.[n.$ref.replace(/^#\/\$defs\//, "")] ?? n : n);
  const go = (v: any, n0: any): any => {
    const n = resoudre(n0);
    if (!n || v == null || typeof v !== "object") return v;
    if (Array.isArray(v)) return n.items ? v.map((x) => go(x, n.items)) : v;
    if (!n.properties) return v;
    const req = new Set<string>(n.required ?? []);
    for (const [k, p] of Object.entries(n.properties as Js)) {
      if (!(k in v)) continue;
      if (v[k] === null && !req.has(k) && !accepteNull(resoudre(p))) delete v[k];
      else v[k] = go(v[k], p);
    }
    return v;
  };
  return go(data, schema);
}
