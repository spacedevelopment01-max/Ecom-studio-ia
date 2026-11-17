/**
 * Tour des sections : le recensement de toutes les pièces à tenue du thème du Studio.
 * Pour chaque pièce : son identifiant, son titre, son module d'origine, sa feuille, son rôle, ses constructions (et, pour
 * chacune, la ou les feuilles qui la dessinent : un module peut ajouter une façon à la pièce d'un autre module).
 * Gratuit, sans IA, sans navigateur. Voir LISEZMOI.md.
 */
import fs from "node:fs";
import path from "node:path";
import { TENUE_FILES, TENUE_SECTIONS, type TenueSection } from "../../src/lib/syna-agent/custom-theme/tenue";
import { PRODUIT_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-produit";
import { SERVICES_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-services";
import { RECIT_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-recit";
import { COQUE_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-coque";
import { ACHAT_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-achat";
import { METIERS_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-metiers";
import { PAGES_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-pages";
import { VENTE_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-vente";
import { PARTITIONS_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue-partitions";

/** Les modules, dans l'ordre de `TENUE_SECTIONS` ; « socle » : les pièces écrites dans tenue.ts. */
export const MODULES = ["socle", "produit", "services", "recit", "coque", "achat", "metiers", "pages", "vente", "partitions"] as const;
export type Module = (typeof MODULES)[number];
const DANS: [Module, TenueSection[]][] = [["produit", PRODUIT_SECTIONS], ["services", SERVICES_SECTIONS], ["recit", RECIT_SECTIONS], ["coque", COQUE_SECTIONS], ["achat", ACHAT_SECTIONS], ["metiers", METIERS_SECTIONS], ["pages", PAGES_SECTIONS], ["vente", VENTE_SECTIONS], ["partitions", PARTITIONS_SECTIONS]];
export const moduleDe = (id: string): Module => DANS.find(([, list]) => list.some((s) => s.id === id))?.[0] ?? "socle";
export const feuilleDe = (m: Module) => (m === "socle" ? "tenue.css" : `tenue-${m}.css`);

export type PieceRecensee = {
  id: string; titre: string; module: Module; feuille: string; script: string | null; role: string; genre: string; groupe: string | null;
  /** Réservée à un type de site (« services », « produits ») ou à un métier ; photos que SINA ne peut pas inventer. */
  pour: string | null; seulement: string | null; authentique: string | null;
  /** Classe de la racine (« tn-achat ») : celle que les feuilles ciblent. */
  racine: string;
  /** Une pièce sans construction déclarée a une seule façon, dite « (seule) ». */
  constructions: { cle: string; libelle: string; feuilles: string[] }[];
  /** Attributs de vraies données lus par le Studio dans cette pièce. */
  donnees: string[];
  photos: number; aCompleter: number;
};

const DIR = path.join(process.cwd(), "public", "sections");
const lire = (f: string) => { try { return fs.readFileSync(path.join(DIR, f), "utf8"); } catch { return ""; } };

/** Le recensement complet, dans l'ordre du Studio. */
export function recenser(): PieceRecensee[] {
  const feuilles = TENUE_FILES.css.map((f) => ({ f, css: lire(f).replace(/\/\*[\s\S]*?\*\//g, "") }));
  return TENUE_SECTIONS.map((s) => {
    const module = moduleDe(s.id), racine = /class="tn (tn-[a-z0-9-]+)/.exec(s.html)?.[1] ?? s.id;
    const constructions = (s.constructions.length ? s.constructions : [{ key: "", label: "(seule façon de bâtir)" }]).map((c, i) => ({
      cle: c.key, libelle: c.label,
      // La première façon est le rendu d'origine (aucune règle ne la nomme) : elle est dessinée par la feuille du module.
      feuilles: i === 0 || !c.key ? [feuilleDe(module)] : (() => {
        const precis = feuilles.filter((x) => new RegExp(`\\.${racine}(?![a-z0-9-])[^{}]*\\[data-tn-c="${c.key}"\\]`).test(x.css)).map((x) => x.f);
        // Une pièce dont la feuille cible une autre classe que sa racine (les en-têtes : « tn-ent ») : la feuille qui nomme la façon.
        const larges = precis.length ? precis : feuilles.filter((x) => x.css.includes(`[data-tn-c="${c.key}"]`)).map((x) => x.f);
        return larges.includes(feuilleDe(module)) && !precis.length ? [feuilleDe(module)] : larges.length ? larges : [feuilleDe(module)];
      })(),
    }));
    return {
      id: s.id, titre: s.title, module, feuille: feuilleDe(module), script: fs.existsSync(path.join(DIR, feuilleDe(module).replace(".css", ".js"))) ? feuilleDe(module).replace(".css", ".js") : null,
      role: s.role, genre: s.kind, groupe: s.group ?? null, pour: s.pour ?? null, seulement: s.only ?? null, authentique: s.authentic ?? null, racine, constructions,
      donnees: [...new Set([...s.html.matchAll(/\s(data-tn-[a-z-]+)/g)].map((m) => m[1]))].filter((a) => a !== "data-tn-c"),
      photos: (s.html.match(/photos\/[\w.-]+/g) ?? []).length, aCompleter: (s.html.match(/\[À compléter/g) ?? []).length,
    };
  });
}

/** Les totaux : pièces, constructions, et le découpage par module. */
export function totaux(pieces: PieceRecensee[]) {
  const parModule = Object.fromEntries(MODULES.map((m) => { const l = pieces.filter((p) => p.module === m); return [m, { pieces: l.length, constructions: l.reduce((a, p) => a + p.constructions.length, 0) }]; }));
  return { pieces: pieces.length, constructions: pieces.reduce((a, p) => a + p.constructions.length, 0), parModule };
}
