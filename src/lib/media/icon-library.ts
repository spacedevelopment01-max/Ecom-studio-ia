/**
 * Bibliothèque d'icônes libres (Tabler Icons, licence MIT, plus de 5 000 icônes classées par mots-clés) : un vrai
 * symbole du métier pour les logos (pinceau, rouleau, truelle, clé, ciseaux…), gratuit, au lieu de la petite
 * bibliothèque du studio. Les icônes sont converties en un seul tracé et passent les mêmes contrôles que tout
 * symbole (nettoyage, lisibilité à 16 px). Ce sont des icônes génériques : le logo n'est pas exclusif à la marque.
 */
import fs from "node:fs";
import path from "node:path";

type IconMeta = { name: string; category?: string; tags?: (string | number)[]; styles?: { filled?: unknown; outline?: unknown } };
type Node = [string, Record<string, string>];
let cache: { meta: Record<string, IconMeta>; outline: Record<string, Node[]>; filled: Record<string, Node[]> } | null = null;

function load() {
  if (cache) return cache;
  // Le paquet n'expose que ses SVG : ses fichiers de données sont lus directement dans node_modules.
  const dir = path.join(process.cwd(), "node_modules", "@tabler", "icons");
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  cache = { meta: read("icons.json"), outline: read("tabler-nodes-outline.json"), filled: read("tabler-nodes-filled.json") };
  return cache;
}

/** Mots du métier en français → mots-clés anglais des icônes (complété par l'IA légère quand elle est active). */
const FR_EN: [RegExp, string[]][] = [
  [/peint|peinture/i, ["paint", "brush", "roller"]],
  [/pl[âa]tr|plaquist|enduit|cloison/i, ["wall", "trowel", "bricks", "ruler"]],
  [/carrel|carreau|fa[ïi]ence/i, ["grid", "tiles", "layout-grid"]],
  [/plomb|chauffag|chaudi|sanitaire/i, ["droplet", "tool", "flame", "pipe"]],
  [/[ée]lectric/i, ["bolt", "plug", "bulb"]],
  [/menuis|[ée]b[ée]nist|charpent|bois/i, ["hammer", "saw", "axe", "ruler"]],
  [/ma[çc]on|b[âa]timent|construct|r[ée]nov/i, ["building", "bricks", "crane", "home"]],
  [/toit|couvreur|toiture/i, ["home", "building-cottage", "roof"]],
  [/jardin|paysag|espaces? verts/i, ["plant", "leaf", "tree", "shovel"]],
  [/coiff|barbier/i, ["scissors", "comb", "brush"]],
  [/esth[ée]ti|beaut|ongl|maquill/i, ["sparkles", "flower", "brush"]],
  [/m[ée]can|garage|auto|carross/i, ["car", "tool", "engine", "steering-wheel"]],
  [/nettoy|m[ée]nage|propret/i, ["spray", "bucket", "sparkles"]],
  [/boulang|p[âa]tiss/i, ["bread", "cake", "baguette"]],
  [/restaur|cuisin|traiteur|chef/i, ["chef-hat", "tools-kitchen", "cooking-pot"]],
  [/caf[ée]|bar\b/i, ["coffee", "cup", "glass"]],
  [/photo/i, ["camera", "aperture"]],
  [/coach|sport|fitness/i, ["barbell", "run", "heartbeat"]],
  [/m[ée]dec|sant[ée]|kin[ée]|ost[ée]o|infirm/i, ["stethoscope", "heart", "hand-stop"]],
  [/v[ée]t[ée]rin|animal|chien|chat/i, ["paw", "dog", "cat"]],
  [/avocat|juridi|notair/i, ["scale", "gavel", "file-text"]],
  [/comptab|financ|banque|assur/i, ["calculator", "chart-bar", "shield"]],
  [/informati|web|d[ée]velopp|num[ée]rique/i, ["code", "device-laptop", "cpu"]],
  [/immobil|agence/i, ["home", "key", "building"]],
  [/transport|d[ée]m[ée]nag|livraison|taxi/i, ["truck", "box", "map-pin"]],
  [/fleur|fleuriste/i, ["flower", "plant"]],
  [/serrur/i, ["key", "lock"]],
  [/couture|retouche|textile/i, ["needle-thread", "scissors", "shirt"]],
];

export function tradeKeywords(text: string): string[] {
  const out: string[] = [];
  for (const [re, words] of FR_EN) if (re.test(text)) for (const w of words) if (!out.includes(w)) out.push(w);
  return out;
}

/** Icônes les plus proches des mots-clés (nom exact, puis nom contenant le mot, puis mots-clés), pleines d'abord. */
export function searchIcons(keywords: string[], n = 6): string[] {
  const { meta, filled } = load();
  const kw = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const scored: { name: string; score: number }[] = [];
  for (const m of Object.values(meta)) {
    if (/-off$|^brand-|^letter-|^number-|^arrow|^chevron/.test(m.name)) continue; // pas de logos de marques ni de signes génériques
    if (/^(Development|Database|Charts|Text|Arrows|Letters|Numbers|Brand)$/i.test(m.category ?? "")) continue; // hors sujet pour un métier
    let score = 0;
    kw.forEach((k, i) => {
      const w = 1 + (kw.length - i) / kw.length; // mots cités en premier : plus de poids
      if (m.name === k) score += 6 * w;
      else if (m.name.startsWith(`${k}-`)) score += 3 * w;
      else if ((m.tags ?? []).some((t) => String(t).toLowerCase() === k)) score += 2 * w;
    });
    if (score > 0) scored.push({ name: m.name, score: score + (filled[m.name] ? 1.5 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, n).map((x) => x.name);
}

const num = (v: string | undefined) => Number(v ?? 0);
/** Un élément d'icône en commandes de tracé (cercles, rectangles, lignes… convertis). */
function toPath([tag, a]: Node): string | null {
  if (a.stroke === "none" && a.fill === "none") return null; // cadre invisible de la grille Tabler
  if (tag === "path") return a.d ?? null;
  if (tag === "circle") {
    const cx = num(a.cx), cy = num(a.cy), r = num(a.r);
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
  if (tag === "ellipse") {
    const cx = num(a.cx), cy = num(a.cy), rx = num(a.rx), ry = num(a.ry);
    return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
  }
  if (tag === "line") return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
  if (tag === "rect") {
    const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height), r = Math.min(num(a.rx), w / 2, h / 2);
    return r ? `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z` : `M${x} ${y}h${w}v${h}h${-w}z`;
  }
  if (tag === "polyline" || tag === "polygon") {
    const pts = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
    if (pts.length < 4) return null;
    let d = `M${pts[0]} ${pts[1]}`;
    for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
    return tag === "polygon" ? `${d}z` : d;
  }
  return null;
}

/** SVG d'une icône en un seul tracé : version pleine (aplat) si elle existe, sinon le trait épaissi. */
export function iconSvg(name: string): string | null {
  const { outline, filled } = load();
  const nodes = filled[name] ?? outline[name];
  if (!nodes) return null;
  const d = nodes.map(toPath).filter(Boolean).join(" ");
  if (!d) return null;
  return filled[name]
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="${d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
}

/** Première icône du métier utilisable comme symbole de logo (nettoyée, lisible à 16 px), ou null. */
export async function tradeIcon(text: string, extra: string[] = []): Promise<{ name: string; svg: string } | null> {
  const { sanitizeSymbolSvg, symbolLegibility, fitSymbol } = await import("./logo-symbol");
  for (const name of searchIcons([...extra, ...tradeKeywords(text)], 10)) {
    const svg = iconSvg(name);
    if (!svg) continue;
    const c = sanitizeSymbolSvg(svg, { maxShapes: 3 });
    if (c.ok && symbolLegibility(fitSymbol(c.symbol, 0.04)).ok) return { name, svg };
  }
  return null;
}
