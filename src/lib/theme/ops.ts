/**
 * Retouches ciblées du thème. L'IA (ou le moteur local) ne réécrit jamais la
 * boutique entière : elle propose des opérations précises, validées contre
 * les schémas des sections, puis appliquées sur une copie. Les éléments
 * verrouillés (validés par le client) ne sont modifiés que s'ils sont
 * explicitement visés.
 */
import { z } from "zod";
import { Liquid } from "liquidjs";
import {
  cloneSpec,
  coerceSetting,
  containerOf,
  globalSettingDefaults,
  parseSchemaBlock,
  sectionSchema,
  settingsSchema,
  withDefaults,
  type SectionInstance,
  type ThemeSpec,
} from "./spec";

const Position = z.object({ after: z.string().optional(), before: z.string().optional(), index: z.number().int().optional() }).optional();
const Value = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const Settings = z.record(z.string(), Value);

export const OpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_setting"), template: z.string(), section: z.string(), block: z.string().optional(), key: z.string(), value: Value }),
  z.object({ op: z.literal("set_global"), key: z.string(), value: Value }),
  z.object({ op: z.literal("set_scheme_color"), scheme: z.enum(["scheme-1", "scheme-2", "scheme-3", "scheme-4"]), key: z.enum(["background", "surface", "text", "muted", "accent", "accent_text", "border"]), value: z.string() }),
  z.object({ op: z.literal("add_section"), template: z.string(), type: z.string(), settings: Settings.optional(), blocks: z.array(z.object({ type: z.string(), settings: Settings.optional() })).optional(), position: Position }),
  z.object({ op: z.literal("remove_section"), template: z.string(), section: z.string() }),
  z.object({ op: z.literal("move_section"), template: z.string(), section: z.string(), position: z.object({ after: z.string().optional(), before: z.string().optional(), index: z.number().int().optional() }) }),
  z.object({ op: z.literal("toggle_section"), template: z.string(), section: z.string(), disabled: z.boolean() }),
  z.object({ op: z.literal("replace_section"), template: z.string(), section: z.string(), type: z.string(), settings: Settings.optional(), blocks: z.array(z.object({ type: z.string(), settings: Settings.optional() })).optional() }),
  z.object({ op: z.literal("add_block"), template: z.string(), section: z.string(), type: z.string(), settings: Settings.optional(), position: Position }),
  z.object({ op: z.literal("remove_block"), template: z.string(), section: z.string(), block: z.string() }),
  z.object({ op: z.literal("move_block"), template: z.string(), section: z.string(), block: z.string(), position: z.object({ after: z.string().optional(), before: z.string().optional(), index: z.number().int().optional() }) }),
  z.object({ op: z.literal("use_media"), template: z.string(), section: z.string(), block: z.string().optional(), key: z.string(), assetId: z.string() }),
  z.object({ op: z.literal("custom_section"), type: z.string().regex(/^es-custom-[a-z0-9-]{2,40}$/), name: z.string().max(25), liquid: z.string().max(60000) }),
  z.object({ op: z.literal("lock"), template: z.string(), section: z.string(), locked: z.boolean() }),
]);
export type ThemeOp = z.infer<typeof OpSchema>;

export type ApplyContext = {
  /** Sections explicitement visées par le client (sélection dans l'aperçu ou mention). */
  targeted?: Set<string>;
  /** Résout un média de la bibliothèque pour l'ajouter aux assets du thème. */
  mediaFile?: (assetId: string) => { filename: string } | null;
  /** Le client a demandé une refonte globale : les verrous sont levés. */
  overrideLocks?: boolean;
};

export type ApplyResult = { spec: ThemeSpec; applied: string[]; rejected: { op: ThemeOp; reason: string }[] };

const lockKey = (template: string, section: string) => `${template}:${section}`;

function newId(container: { sections: Record<string, unknown> }, type: string) {
  const base = type.replace(/[^a-z0-9]/gi, "_");
  let i = 1;
  while (container.sections[`${base}_${i}`]) i++;
  return `${base}_${i}`;
}

function newBlockId(section: SectionInstance, type: string) {
  const base = type.replace(/[^a-z0-9]/gi, "_");
  let i = 1;
  while (section.blocks?.[`${base}_${i}`]) i++;
  return `${base}_${i}`;
}

function insertAt(order: string[], id: string, pos?: { after?: string; before?: string; index?: number }) {
  const without = order.filter((x) => x !== id);
  let idx = without.length;
  if (pos?.after && without.includes(pos.after)) idx = without.indexOf(pos.after) + 1;
  else if (pos?.before && without.includes(pos.before)) idx = without.indexOf(pos.before);
  else if (pos?.index !== undefined) idx = Math.max(0, Math.min(without.length, pos.index));
  without.splice(idx, 0, id);
  return without;
}

function validateSettings(spec: ThemeSpec, type: string, blockType: string | null, values: Record<string, unknown> | undefined): { settings: Record<string, unknown>; errors: string[] } {
  const schema = sectionSchema(spec, type);
  const defs = blockType ? schema?.blocks.find((b) => b.type === blockType)?.settings ?? [] : schema?.settings ?? [];
  const out: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const [k, v] of Object.entries(values ?? {})) {
    const def = defs.find((d) => d.id === k);
    if (!def) {
      errors.push(`réglage inconnu « ${k} » pour ${blockType ? `le bloc ${blockType}` : `la section ${type}`}`);
      continue;
    }
    const c = coerceSetting(def, v);
    if (c.ok) out[k] = c.value;
    else errors.push(c.reason);
  }
  return { settings: out, errors };
}

const liquidCheck = new Liquid({ strictFilters: false });

export function validateCustomSection(liquid: string): string | null {
  const schema = (() => {
    try {
      return parseSchemaBlock(liquid);
    } catch (e) {
      return `schéma JSON invalide : ${(e as Error).message}`;
    }
  })();
  if (!schema) return "la section doit contenir un bloc {% schema %}";
  if (typeof schema === "string") return schema;
  if (!schema.name || schema.name.length > 25) return "le nom du schéma doit faire 25 caractères au plus";
  if (/<script[^>]+src\s*=\s*["']?https?:/i.test(liquid)) return "les scripts externes ne sont pas autorisés dans les sections générées";
  if (/\beval\s*\(|new\s+Function\s*\(|document\.cookie/i.test(liquid)) return "code JavaScript non autorisé (eval, Function, cookies)";
  try {
    const stripped = liquid
      .replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/, "")
      .replace(/\{%-?\s*(stylesheet|javascript)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g, "")
      .replace(/\{%-?\s*style\s*-?%\}/g, "<style>")
      .replace(/\{%-?\s*endstyle\s*-?%\}/g, "</style>")
      .replace(/\{%-?\s*form\b[^%]*%\}/g, "")
      .replace(/\{%-?\s*endform\s*-?%\}/g, "")
      .replace(/\{%-?\s*render\s+block\s*-?%\}/g, "");
    liquidCheck.parse(stripped);
  } catch (e) {
    return `Liquid invalide : ${(e as Error).message.split("\n")[0]}`;
  }
  return null;
}

export function applyOps(input: ThemeSpec, ops: ThemeOp[], ctx: ApplyContext = {}): ApplyResult {
  const spec = cloneSpec(input);
  const applied: string[] = [];
  const rejected: { op: ThemeOp; reason: string }[] = [];
  const locked = new Set(spec.locks);
  const isLocked = (template: string, section: string) => !ctx.overrideLocks && locked.has(lockKey(template, section)) && !ctx.targeted?.has(lockKey(template, section));

  for (const op of ops) {
    const reject = (reason: string) => rejected.push({ op, reason });
    try {
      switch (op.op) {
        case "set_global": {
          if (!ctx.overrideLocks && locked.has("settings") && !ctx.targeted?.has("settings")) {
            reject("les réglages généraux sont verrouillés");
            break;
          }
          const def = settingsSchema(spec).flatMap((g) => g.settings ?? []).find((s) => s.id === op.key);
          if (!def || def.type === "color_scheme_group") {
            reject(`réglage général inconnu « ${op.key} »`);
            break;
          }
          const c = coerceSetting(def, op.value);
          if (!c.ok) {
            reject(c.reason);
            break;
          }
          spec.settings[op.key] = c.value;
          applied.push(`Réglage général « ${def.label ?? op.key} » mis à jour`);
          break;
        }
        case "set_scheme_color": {
          if (!/^#[0-9a-fA-F]{6}$/.test(op.value)) {
            reject("couleur attendue au format #RRGGBB");
            break;
          }
          const schemes = (spec.settings.color_schemes ?? {}) as Record<string, { settings: Record<string, string> }>;
          if (!schemes[op.scheme]) {
            reject(`schéma ${op.scheme} absent`);
            break;
          }
          schemes[op.scheme].settings[op.key] = op.value.toUpperCase();
          applied.push(`Couleur ${op.key} du ${op.scheme} → ${op.value.toUpperCase()}`);
          break;
        }
        case "set_setting":
        case "use_media": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!c || !s) {
            reject(`section ${op.section} introuvable dans ${op.template}`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          let key = op.key;
          let value: unknown = op.op === "set_setting" ? op.value : null;
          if (op.op === "use_media" && spec.imported) {
            reject("thème importé : ses images sont hébergées par Shopify. Importez l'image dans Shopify (Contenu › Fichiers) puis choisissez-la dans l'éditeur de thème Shopify");
            break;
          }
          if (op.op === "use_media") {
            const file = ctx.mediaFile?.(op.assetId);
            if (!file) {
              reject("média introuvable dans la bibliothèque du projet");
              break;
            }
            spec.files[file.filename] = op.assetId;
            if (!key.endsWith("_asset")) key = `${key}_asset`;
            value = file.filename;
          }
          const target = op.block ? s.blocks?.[op.block] : s;
          if (!target) {
            reject(`bloc ${op.block} introuvable`);
            break;
          }
          const v = validateSettings(spec, s.type, op.block ? target.type : null, { [key]: value });
          if (v.errors.length) {
            reject(v.errors.join(" ; "));
            break;
          }
          target.settings = { ...target.settings, ...v.settings };
          applied.push(`${op.block ? `Bloc ${op.block}` : `Section ${op.section}`} : « ${key} » mis à jour`);
          break;
        }
        case "add_section": {
          const c = containerOf(spec, op.template);
          if (!c) {
            reject(`gabarit ${op.template} inconnu`);
            break;
          }
          const schema = sectionSchema(spec, op.type);
          if (!schema) {
            reject(`type de section inconnu « ${op.type} »`);
            break;
          }
          const group = op.template.startsWith("group:") ? op.template.slice(6) : null;
          if (group && !schema.enabled_on?.groups?.includes(group) && !op.type.startsWith("es-custom-")) {
            reject(`la section ${op.type} n'est pas prévue pour le groupe ${group}`);
            break;
          }
          if (!group && schema.enabled_on?.groups?.length) {
            reject(`la section ${op.type} est réservée à l'en-tête ou au pied de page`);
            break;
          }
          const v = validateSettings(spec, op.type, null, op.settings);
          const sid = newId(c, op.type);
          // Thème importé : valeurs par défaut écrites (traduites), comme le fait l'éditeur Shopify à l'ajout.
          const inst: SectionInstance = { type: op.type, settings: spec.imported ? withDefaults(schema.settings, v.settings) : v.settings };
          const errors = [...v.errors];
          // Sans blocs précisés : ceux du préréglage de la section (comme l'éditeur Shopify).
          const presetBlocks = ((schema.presets?.[0] as { blocks?: { type: string; settings?: Record<string, unknown> }[] } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
          const wanted = op.blocks ?? presetBlocks;
          if (wanted.length) {
            inst.blocks = {};
            inst.block_order = [];
            for (const b of wanted) {
              if (!schema.blocks.some((x) => x.type === b.type)) {
                errors.push(`bloc « ${b.type} » inconnu`);
                continue;
              }
              const bv = validateSettings(spec, op.type, b.type, b.settings);
              errors.push(...bv.errors);
              const bid = newBlockId(inst, b.type);
              inst.blocks[bid] = { type: b.type, settings: spec.imported ? withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, bv.settings) : bv.settings };
              inst.block_order.push(bid);
            }
          }
          c.sections[sid] = inst;
          c.order = insertAt(c.order, sid, op.position);
          applied.push(`Section « ${schema.name} » ajoutée (${sid})${errors.length ? ` — ignoré : ${errors.join(" ; ")}` : ""}`);
          break;
        }
        case "remove_section": {
          const c = containerOf(spec, op.template);
          if (!c?.sections[op.section]) {
            reject(`section ${op.section} introuvable`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          if (/^main-/.test(c.sections[op.section].type)) {
            reject("la section principale d'une page ne peut pas être supprimée");
            break;
          }
          delete c.sections[op.section];
          c.order = c.order.filter((x) => x !== op.section);
          applied.push(`Section ${op.section} supprimée`);
          break;
        }
        case "move_section": {
          const c = containerOf(spec, op.template);
          if (!c?.sections[op.section]) {
            reject(`section ${op.section} introuvable`);
            break;
          }
          c.order = insertAt(c.order, op.section, op.position);
          applied.push(`Section ${op.section} déplacée`);
          break;
        }
        case "toggle_section": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!s) {
            reject(`section ${op.section} introuvable`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          s.disabled = op.disabled || undefined;
          applied.push(`Section ${op.section} ${op.disabled ? "masquée" : "affichée"}`);
          break;
        }
        case "replace_section": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!c || !s) {
            reject(`section ${op.section} introuvable`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          const schema = sectionSchema(spec, op.type);
          if (!schema) {
            reject(`type de section inconnu « ${op.type} »`);
            break;
          }
          // Conserve les réglages compatibles (titres, textes, images) pour ne rien perdre.
          const carry: Record<string, unknown> = {};
          for (const def of schema.settings) if (def.id && def.id in s.settings) carry[def.id] = s.settings[def.id];
          const v = validateSettings(spec, op.type, null, { ...carry, ...(op.settings ?? {}) });
          const inst: SectionInstance = { type: op.type, settings: v.settings };
          // Sans blocs précisés : ceux du préréglage de la section (comme l'éditeur Shopify).
          const presetBlocks = ((schema.presets?.[0] as { blocks?: { type: string; settings?: Record<string, unknown> }[] } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
          const wanted = op.blocks ?? presetBlocks;
          if (wanted.length) {
            inst.blocks = {};
            inst.block_order = [];
            for (const b of wanted) {
              if (!schema.blocks.some((x) => x.type === b.type)) continue;
              const bv = validateSettings(spec, op.type, b.type, b.settings);
              const bid = newBlockId(inst, b.type);
              inst.blocks[bid] = { type: b.type, settings: bv.settings };
              inst.block_order.push(bid);
            }
          } else if (s.blocks && schema.blocks.length) {
            inst.blocks = {};
            inst.block_order = [];
            for (const bid of s.block_order ?? Object.keys(s.blocks)) {
              const b = s.blocks[bid];
              if (b && schema.blocks.some((x) => x.type === b.type)) {
                inst.blocks[bid] = b;
                inst.block_order.push(bid);
              }
            }
          }
          c.sections[op.section] = inst;
          applied.push(`Section ${op.section} refaite en « ${schema.name} »`);
          break;
        }
        case "add_block": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!s) {
            reject(`section ${op.section} introuvable`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          const schema = sectionSchema(spec, s.type);
          const bs = schema?.blocks.find((b) => b.type === op.type);
          if (!bs) {
            reject(`bloc « ${op.type} » non disponible dans ${s.type}`);
            break;
          }
          const count = Object.keys(s.blocks ?? {}).length;
          if (schema?.max_blocks && count >= schema.max_blocks) {
            reject(`la section accepte au plus ${schema.max_blocks} blocs`);
            break;
          }
          const v = validateSettings(spec, s.type, op.type, op.settings);
          s.blocks ??= {};
          s.block_order ??= Object.keys(s.blocks);
          const bid = newBlockId(s, op.type);
          s.blocks[bid] = { type: op.type, settings: v.settings };
          s.block_order = insertAt(s.block_order, bid, op.position);
          applied.push(`Bloc « ${bs.name ?? op.type} » ajouté à ${op.section}`);
          break;
        }
        case "remove_block": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!s?.blocks?.[op.block]) {
            reject(`bloc ${op.block} introuvable`);
            break;
          }
          if (isLocked(op.template, op.section)) {
            reject(`la section ${op.section} est validée et verrouillée`);
            break;
          }
          delete s.blocks[op.block];
          s.block_order = (s.block_order ?? []).filter((x) => x !== op.block);
          applied.push(`Bloc ${op.block} supprimé`);
          break;
        }
        case "move_block": {
          const c = containerOf(spec, op.template);
          const s = c?.sections[op.section];
          if (!s?.blocks?.[op.block]) {
            reject(`bloc ${op.block} introuvable`);
            break;
          }
          s.block_order = insertAt(s.block_order ?? Object.keys(s.blocks), op.block, op.position);
          applied.push(`Bloc ${op.block} déplacé`);
          break;
        }
        case "custom_section": {
          const err = validateCustomSection(op.liquid);
          if (err) {
            reject(err);
            break;
          }
          spec.customSections[op.type] = { name: op.name, liquid: op.liquid };
          applied.push(`Section sur mesure « ${op.name} » enregistrée`);
          break;
        }
        case "lock": {
          const key = lockKey(op.template, op.section);
          spec.locks = op.locked ? [...new Set([...spec.locks, key])] : spec.locks.filter((k) => k !== key);
          applied.push(`${op.section} ${op.locked ? "verrouillée" : "déverrouillée"}`);
          break;
        }
      }
    } catch (e) {
      reject((e as Error).message);
    }
  }
  return { spec, applied, rejected };
}

/** Contrôles structurels avant enregistrement d'une version. */
export function validateSpec(spec: ThemeSpec): string[] {
  const problems: string[] = [];
  // Thème importé : ses pages peuvent être des gabarits Liquid (conservés tels quels), seuls les JSON sont dans le spec.
  for (const key of spec.imported ? [] : ["index", "product", "collection", "cart", "search", "404", "page", "list-collections"]) {
    if (!spec.templates[key]) problems.push(`gabarit obligatoire manquant : ${key}`);
  }
  for (const [where, c] of [...Object.entries(spec.templates), ...Object.entries(spec.groups).map(([g, j]) => [`group:${g}`, j] as const)]) {
    for (const id of c.order) {
      const s = c.sections[id];
      if (!s) {
        problems.push(`${where} : l'ordre référence une section absente (${id})`);
        continue;
      }
      if (!sectionSchema(spec, s.type)) problems.push(`${where} : type de section inconnu ${s.type}`);
    }
  }
  // Thème importé : ses propres règles s'appliquent (sections et polices propres au thème du client).
  if (spec.imported) return problems;
  if (!spec.templates.product?.order.some((id) => spec.templates.product.sections[id]?.type === "main-product")) problems.push("la fiche produit doit contenir la section Produit");
  const defaults = globalSettingDefaults();
  for (const k of ["type_heading_font", "type_body_font"]) if (!spec.settings[k] && !defaults[k]) problems.push(`police manquante : ${k}`);
  return problems;
}

/** Résumé lisible de la structure (fourni à l'IA et affiché dans le studio). */
export function outline(spec: ThemeSpec, templates: string[] = ["group:header", "index", "product", "group:footer"]): string {
  const lines: string[] = [];
  for (const t of templates) {
    const c = containerOf(spec, t);
    if (!c) continue;
    lines.push(`## ${t}`);
    for (const id of c.order) {
      const s = c.sections[id];
      if (!s) continue;
      const schema = sectionSchema(spec, s.type);
      const lock = spec.locks.includes(lockKey(t, id)) ? " [VERROUILLÉE]" : "";
      const hidden = s.disabled ? " [MASQUÉE]" : "";
      const textual = Object.entries(s.settings)
        .filter(([, v]) => typeof v === "string" && v && String(v).length < 140)
        .slice(0, 6)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ");
      lines.push(`- ${id} (${s.type} · ${schema?.name ?? "?"})${lock}${hidden} ${textual}`);
      for (const bid of s.block_order ?? []) {
        const b = s.blocks?.[bid];
        if (!b) continue;
        const bt = Object.entries(b.settings).filter(([, v]) => typeof v === "string" && v).slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(String(v).slice(0, 80))}`).join(", ");
        lines.push(`    · ${bid} (${b.type}) ${bt}`);
      }
    }
  }
  return lines.join("\n");
}
