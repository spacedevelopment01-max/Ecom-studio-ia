/**
 * Parité de rendu (CMS Engine V2) : la même section, rendue par l'aperçu du studio (LiquidJS) et par le moteur PHP
 * livré dans les thèmes WordPress (assets/cms/php/es-liquid.php), doit produire le même HTML (structure, classes,
 * attributs, textes). Utilisé par les tests et par le banc des exports. Nécessite PHP en ligne de commande.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseDocument } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";
import { compileTheme, type ThemeFiles } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { themeLang, type SectionInstance, type ThemeSpec } from "@/lib/theme/spec";
import { flatStrings, liquidGlobals, normalizedSection, phpTemplates, sectionSchemaOf } from "@/lib/cms-v2/liquid";

const PHP_DIR = path.join(process.cwd(), "assets/cms/php");
const IGNORED_ATTRS = new Set(["data-es-block", "data-es-section", "data-es-type"]);

/**
 * Adaptations ATTENDUES hors de Shopify (signalées dans les résultats, jamais masquées) :
 *  - destination des formulaires (Shopify : /contact ; ailleurs : traitement du CMS) ;
 *  - icônes des moyens de paiement (Shopify les fournit ; ailleurs, l'extension de paiement du CMS).
 */
export const PLATFORM_ADAPTATIONS = [
  { id: "form-action", label: "destination des formulaires (traitée par le CMS)" },
  { id: "payment-icons", label: "icônes des moyens de paiement (fournies par la plateforme)" },
] as const;

/** Forme canonique d'un fragment HTML : balises, attributs triés, textes aux espaces normalisés. */
export function canonicalHtml(html: string, opts: { adapt?: boolean } = {}): string {
  const doc = parseDocument(html, { decodeEntities: true });
  const out: string[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === "text") {
      const t = (n as unknown as { data: string }).data.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
      return;
    }
    if (n.type === "tag" || n.type === "script" || n.type === "style") {
      const el = n as Element;
      if (opts.adapt && el.attribs.class?.split(/\s+/).includes("es-footer__payment")) {
        out.push(`<${el.name} class="${el.attribs.class}">`, "[payment-icons]", `</${el.name}>`);
        return;
      }
      const attrs = Object.entries(el.attribs)
        .filter(([k]) => !IGNORED_ATTRS.has(k) && !(opts.adapt && el.name === "form" && (k === "action" || k === "accept-charset")))
        .map(([k, v]) => `${k}="${(k === "class" ? v.split(/\s+/).filter(Boolean).join(" ") : v.replace(/\s+/g, " ").trim())}"`)
        .sort();
      out.push(`<${el.name}${attrs.length ? " " + attrs.join(" ") : ""}>`);
      for (const c of el.children) walk(c);
      out.push(`</${el.name}>`);
      return;
    }
    if ("children" in n) for (const c of (n as Element).children) walk(c);
  };
  walk(doc);
  return out.join("");
}

type Found = { type: string; where: string; html: string };

/** Sections telles que rendues par l'aperçu du studio (page complète, adresses sans préfixe). */
export async function studioSections(spec: ThemeSpec, pathname = "/"): Promise<Found[]> {
  const files = compileTheme(spec);
  const r = await renderPage({ spec, base: "", files, cart: [] }, pathname, new URLSearchParams());
  const doc = parseDocument(r.html, { decodeEntities: false });
  const found: Found[] = [];
  const { default: render } = await import("dom-serializer");
  const walk = (n: AnyNode) => {
    if (n.type === "tag") {
      const el = n as Element;
      if (el.attribs["data-es-type"] && el.attribs["data-es-section"]) {
        found.push({ type: el.attribs["data-es-type"], where: el.attribs["data-es-section"], html: render(el.children, { decodeEntities: false }) });
        return;
      }
      for (const c of el.children) walk(c);
    } else if ("children" in n) for (const c of (n as Element).children) walk(c);
  };
  walk(doc);
  return found;
}

/** Sections d'un gabarit ou d'un groupe, dans l'ordre (identifiant, instance). */
export function sectionsOf(spec: ThemeSpec, where: string): { id: string; s: SectionInstance }[] {
  const c = where.startsWith("group:") ? spec.groups[where.slice(6) as "header" | "footer"] : spec.templates[where];
  return c ? c.order.filter((id) => c.sections[id] && !c.sections[id].disabled).map((id) => ({ id, s: c.sections[id] })) : [];
}

/** Rendu des mêmes sections par le moteur PHP des thèmes exportés. */
export function phpSections(spec: ThemeSpec, list: { id: string; s: SectionInstance }[], files: ThemeFiles = compileTheme(spec), pageType = "index"): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-php-"));
  try {
    for (const [p, src] of phpTemplates(files, list.map((x) => x.s.type))) {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
      fs.writeFileSync(path.join(dir, p), src);
    }
    fs.mkdirSync(path.join(dir, "snippets"), { recursive: true });
    const globals = liquidGlobals({ files, settings: spec.settings, shopName: spec.store.shopName, menus: spec.store.menus, url: (p) => p, pageType, policies: spec.store.policies });
    const sections = list.map(({ id, s }) => ({ type: s.type, section: normalizedSection(id, s, sectionSchemaOf(files.get(`sections/${s.type}.liquid`) ?? "")) }));
    const input = JSON.stringify({ dir, assetBase: "/assets/", strings: flatStrings(files, themeLang(spec)), globals, sections });
    const out = execFileSync("php", [path.join(PHP_DIR, "render-cli.php")], { input, maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
    return out.split("\n<!--es-section-->\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export type ParityResult = { type: string; where: string; same: boolean; exact: boolean; studio: string; php: string };

/** Compare section par section (gabarit d'accueil et groupes d'en-tête et de pied de page). */
export async function parity(spec: ThemeSpec, wheres = ["index", "group:header", "group:footer"]): Promise<ParityResult[]> {
  const studio = await studioSections(spec, "/");
  const out: ParityResult[] = [];
  for (const where of wheres) {
    const list = sectionsOf(spec, where);
    const php = phpSections(spec, list);
    list.forEach(({ id, s }, i) => {
      const key = where.startsWith("group:") ? `${where}:${id}` : `${where}:${id}`;
      const st = studio.find((f) => f.where === key);
      // Identique à l'octet près (exact) ou identique hors adaptations attendues de la plateforme (same).
      const exact = canonicalHtml(st?.html ?? "") === canonicalHtml(php[i] ?? "");
      const a = canonicalHtml(st?.html ?? "", { adapt: true });
      const b = canonicalHtml(php[i] ?? "", { adapt: true });
      out.push({ type: s.type, where: key, same: a === b, exact, studio: a, php: b });
    });
  }
  return out;
}

/** Premier écart entre deux formes canoniques (pour un message lisible). */
export function firstDiff(a: string, b: string, span = 120): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `studio: …${a.slice(Math.max(0, i - 40), i + span)}…\n   php: …${b.slice(Math.max(0, i - 40), i + span)}…`;
}
