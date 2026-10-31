/** Lecture simple d'une feuille CSS pour les contrôles du lot 0 de SYNA (#282) : règles, sélecteurs et déclarations. */
import fs from "node:fs";
import path from "node:path";

export type CssRule = { selectors: string[]; body: string; atRules: string[] };
export type CssSheet = { rules: CssRule[]; fontFaces: string[]; keyframes: string[]; imports: string[] };

export const SYNA_CSS = path.resolve(import.meta.dirname, "../src/components/syna/syna.css");
export const VITRINE_CSS = path.resolve(import.meta.dirname, "../src/app/syna-fondations/vitrine.css");

/** Coupe une liste de sélecteurs sur les virgules qui ne sont pas entre parenthèses. */
export function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i;
  }
  throw new Error("Accolade non fermée");
}

function parse(css: string, atRules: string[], sheet: CssSheet) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    const semi = css.indexOf(";", i);
    if (semi !== -1 && (open === -1 || semi < open) && css.slice(i, semi).trim().startsWith("@")) {
      const stmt = css.slice(i, semi).trim();
      if (stmt.startsWith("@import")) sheet.imports.push(stmt);
      i = semi + 1;
      continue;
    }
    if (open === -1) break;
    const head = css.slice(i, open).trim();
    const end = blockEnd(css, open);
    const body = css.slice(open + 1, end);
    if (head.startsWith("@font-face")) sheet.fontFaces.push(body);
    else if (head.startsWith("@keyframes")) sheet.keyframes.push(head);
    else if (head.startsWith("@")) parse(body, [...atRules, head], sheet);
    else sheet.rules.push({ selectors: splitSelectors(head), body, atRules });
    i = end + 1;
  }
}

export function readCss(file: string): CssSheet {
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const sheet: CssSheet = { rules: [], fontFaces: [], keyframes: [], imports: [] };
  parse(css, [], sheet);
  return sheet;
}

/** Déclarations `--nom: valeur` d'un bloc. */
export function customProps(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
