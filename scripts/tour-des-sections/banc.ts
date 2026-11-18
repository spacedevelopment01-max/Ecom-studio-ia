/**
 * Tour des sections : le navigateur du banc. Charge une page rendue (aucun réseau : seuls les fichiers du dépôt et de
 * la base d'essai sont servis), lance les détecteurs de `detecteurs-page.js`, juge le contraste sur les pixels, et
 * capture la page.
 *
 * Ce fichier ne dépend pas du Studio : l'essai des détecteurs s'en sert sur des pages fabriquées.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Browser, BrowserContext, Page } from "playwright";

// ══════════════════════════════════════════════════════════ les seuils jugés côté Node (les autres : detecteurs-page.js)
/** Contraste minimal d'un texte avec son fond (règle du propriétaire : jamais sous 3). */
export const CONTRASTE_MIN = 3;
/** Sous ce contraste, le texte est illisible : le défaut est bloquant. */
export const CONTRASTE_ILLISIBLE = 1.8;
/** Part des points mesurés sous le contraste minimal à partir de laquelle le texte est dit peu lisible ; en dessous (mais au-dessus de la part « partielle »), seulement par endroits. */
export const PART_ILLISIBLE = 0.4;
export const PART_PARTIELLE = 0.15;
/** Un texte lisible « par endroits » dont une partie tombe presque à rien (sous ce contraste) est un vrai défaut : un mot
 *  du titre disparaît dans la photo (« Respire. » sur la théière, 18 novembre 2026). */
export const CONTRASTE_DISPARAIT = 1.5;
/** Un texte en partie recouvert (tiroir, fenêtre, menu ouvert) : son contraste ne se juge que si au moins cette part de ses points est au premier plan. */
export const PART_VISIBLE_MIN = 0.25;
/** Hauteur maximale d'une capture, en pixels : au-delà, la page est coupée (et c'est dit). */
export const CAPTURE_MAX_PX = 12000;
/** Attente, en millisecondes, après le chargement (scripts des pièces) et après une ouverture (volets, tiroir). */
export const ATTENTE_MS = 80;
export const ATTENTE_OUVERTURE_MS = 380;

export type Defaut = { type: string; gravite: "bloquant" | "important" | "mineur"; uid: string | null; selecteur: string; texte: string; detail: string; cadre: [number, number, number, number]; autres?: number };
export type Mesure = { largeur: number; hauteur: number; hauteurPage: number; coupee: boolean; sections: { uid: string; classe: string; construction: string; visible: boolean; cadre: [number, number, number, number] }[]; defauts: Defaut[]; capture: Buffer | null; ouverts: string[] };
type TexteMesure = { i?: number; uid: string | null; selecteur: string; texte: string; couleur: number[]; taille: number; gras: boolean; fixe: boolean; rects: number[][] };

const ICI = path.dirname(new URL(import.meta.url).pathname);
export const DETECTEURS_PAGE = fs.readFileSync(path.join(ICI, "detecteurs-page.js"), "utf8");

/**
 * Le navigateur du banc. Aucun réseau : tout nom de machine autre que celle du banc est introuvable (une police ou un
 * script demandé au dehors échoue tout de suite, comme dans un essai sans Internet).
 */
export async function ouvrirNavigateur(): Promise<Browser> {
  const { chromium } = await import("playwright");
  const exe = [process.env.CHROMIUM, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((c) => c && fs.existsSync(c));
  const args = ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", "--no-proxy-server"];
  return chromium.launch(exe ? { executablePath: exe, args: [...args, "--no-sandbox", "--disable-dev-shm-usage"] } : { args });
}

export type Service = { origine: string; poser: (html: string) => string; fermer: () => Promise<void> };
/**
 * Le petit serveur du banc (sur cette machine seulement) : il sert la page à regarder et les fichiers que `fichier`
 * connaît (feuilles, scripts, photos, polices), que le navigateur garde en mémoire d'une page à l'autre.
 */
export async function servir(fichier: (pathname: string) => { body: Buffer; contentType: string } | null): Promise<Service> {
  const http = await import("node:http");
  const pages = new Map<string, string>();
  let n = 0;
  const serveur = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.pathname.startsWith("/page/")) { const h = pages.get(u.pathname.slice(6)); pages.delete(u.pathname.slice(6)); if (h === undefined) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(h); return; }
    const f = fichier(u.pathname);
    if (!f) { res.writeHead(404, { "cache-control": "max-age=3600" }).end(); return; }
    res.writeHead(200, { "content-type": f.contentType, "cache-control": "max-age=3600" }).end(f.body);
  });
  await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
  const port = (serveur.address() as { port: number }).port;
  return { origine: `http://127.0.0.1:${port}`, poser: (html) => { const k = String(n++); pages.set(k, html); return `http://127.0.0.1:${port}/page/${k}`; }, fermer: () => new Promise((ok) => serveur.close(() => ok())) };
}

/** Un onglet du banc : `montrer` charge une page à une largeur d'écran, la parcourt une fois, et pose les détecteurs. */
export async function onglet(browser: Browser, service: Service): Promise<{ context: BrowserContext; page: Page; montrer: (html: string, largeur: number, hauteur: number) => Promise<void> }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await context.newPage();
  const montrer = async (html: string, largeur: number, hauteur: number) => {
    const v = page.viewportSize();
    if (!v || v.width !== largeur || v.height !== hauteur) await page.setViewportSize({ width: largeur, height: hauteur });
    await page.goto(service.poser(html), { waitUntil: "load", timeout: 45_000 });
    // Ce qui n'apparaît qu'en défilant : la page est parcourue une fois, puis remise en haut.
    await page.evaluate(async (attente) => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
      const h = document.documentElement.scrollHeight;
      if (h > innerHeight + 40) { for (let y = 0; y < h; y += Math.max(200, innerHeight - 100)) { scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => r(null))); } scrollTo(0, 0); }
      await new Promise((r) => setTimeout(r, attente));
    }, ATTENTE_MS);
    await page.evaluate(DETECTEURS_PAGE);
  };
  return { context, page, montrer };
}

const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export const contraste = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const SANS_TEXTE = ".tb-wrap > .frame *, .tb-wrap > .frame *::before, .tb-wrap > .frame *::after, .tb-wrap > .frame *::placeholder, .tb-wrap > .frame *::marker{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke-color:transparent!important;caret-color:transparent!important;text-decoration-color:transparent!important;transition:none!important}";
/** Les couleurs reviennent d'un coup : sans cela, un texte dont la couleur change en douceur (un lien) resterait à moitié effacé sur la capture ou la mesure suivante. */
const SANS_TRANSITION = ".tb-wrap > .frame *, .tb-wrap > .frame *::before, .tb-wrap > .frame *::after{transition:none!important}";

/** Le contraste de chaque texte avec ce qu'il y a vraiment dessous : la page est capturée sans ses textes, et les pixels sont lus. */
async function contrastes(page: Page, textes: TexteMesure[], hauteur: number, largeur: number): Promise<Defaut[]> {
  if (!textes.length) return [];
  const style = await page.addStyleTag({ content: SANS_TEXTE });
  const img = await page.screenshot({ type: "png", fullPage: true, clip: { x: 0, y: 0, width: largeur, height: hauteur }, animations: "disabled" });
  await style.evaluate((n, css) => { n.textContent = css; void getComputedStyle(document.body).color; document.querySelectorAll(".tb-wrap > .frame a, .tb-wrap > .frame button").forEach((e) => void getComputedStyle(e).color); (n as HTMLElement).remove(); }, SANS_TRANSITION);
  const raw = await sharp(img, { limitInputPixels: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = raw.info.width, H = raw.info.height, data = raw.data;
  const pixel = (x: number, y: number) => { const i = (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const out: Defaut[] = [], vus = new Set<string>();
  // Premier passage : les textes dont le contraste est trop bas quelque part, avec leurs points de mesure.
  const candidats: { t: TexteMesure; points: number[][]; ratios: number[] }[] = [];
  for (const t of textes) {
    const ratios: number[] = [], points: number[][] = [];
    for (const [x, y, w, h] of t.rects) {
      if (y + h > H || x + w > W + 1 || x < -1) continue;
      // Jamais le bord de la ligne (un soulignement, un filet s'y trouvent).
      for (let i = 1; i <= 7; i++) for (const j of [0.25, 0.5, 0.72]) { const px = x + (w * i) / 8, py = y + h * j, b = pixel(px, py), a = t.couleur[3]; points.push([px, py]); ratios.push(contraste([0, 1, 2].map((k) => t.couleur[k] * a + b[k] * (1 - a)), b)); }
    }
    if (!ratios.length || ratios.filter((r) => r < CONTRASTE_MIN).length / ratios.length < PART_PARTIELLE) continue;
    candidats.push({ t, points, ratios });
  }
  if (!candidats.length) return [];
  // Second passage : seuls comptent les points où le texte est au premier plan (pas sous un tiroir, une fenêtre, un
  // menu ouvert ou leur voile : ce texte-là ne se lit pas à ce moment, son contraste ne se juge pas).
  const devant = (await page.evaluate((q) => (window as unknown as { __tour: { premierPlan: (q: unknown) => boolean[][] } }).__tour.premierPlan(q), candidats.map((c) => ({ i: c.t.i ?? -1, points: c.points })))) as boolean[][];
  for (let n = 0; n < candidats.length; n++) {
    const t = candidats[n].t, ratios = candidats[n].ratios.filter((_r, k) => devant[n]?.[k] !== false);
    if (ratios.length < candidats[n].ratios.length * PART_VISIBLE_MIN) continue;
    ratios.sort((a, b) => a - b);
    const sous = ratios.filter((r) => r < CONTRASTE_MIN).length / ratios.length, median = ratios[Math.floor(ratios.length / 2)];
    if (sous < PART_PARTIELLE) continue;
    const cle = `${t.uid}|${t.selecteur}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    const l = Math.min(...t.rects.map((r) => r[0])), tp = Math.min(...t.rects.map((r) => r[1])), r = Math.max(...t.rects.map((x) => x[0] + x[2])), b = Math.max(...t.rects.map((x) => x[1] + x[3]));
    // Lisible sur la plus grande part de sa surface (un texte posé sur une photo) : seulement par endroits.
    const partiel = sous < PART_ILLISIBLE || median >= CONTRASTE_MIN;
    // Une marque « À compléter » porte son propre fond jaune et son encre foncée, fixes : lisible par construction. Penchée
    // (dans un sceau, un macaron), le rectangle droit mesuré déborde du jaune par les coins ; ce n'est pas un mot qui disparaît.
    const marque = /\.tn-manque$/.test(t.selecteur);
    out.push({ type: partiel ? "contraste-partiel" : "contraste", gravite: partiel ? (ratios[0] < CONTRASTE_DISPARAIT && !marque ? "important" : "mineur") : median < CONTRASTE_ILLISIBLE ? "bloquant" : "important", uid: t.uid, selecteur: t.selecteur, texte: t.texte, detail: partiel ? `le texte passe sous un contraste de ${CONTRASTE_MIN} sur ${Math.round(sous * 100)} % de sa surface (au plus bas ${ratios[0].toFixed(2)})` : `contraste de ${median.toFixed(2)} avec le fond (il en faut ${CONTRASTE_MIN}) ; texte de ${Math.round(t.taille)} px`, cadre: [Math.round(l), Math.round(tp), Math.round(r - l), Math.round(b - tp)] });
  }
  return out;
}

export type Contexte = { monte?: boolean; titreLourd?: boolean; exemples?: string[] };

/** Mesure la page affichée dans l'onglet : défauts des détecteurs, contraste, capture (si demandée). */
export async function mesurer(page: Page, ctx: Contexte, o: { capture?: boolean } = {}): Promise<Mesure> {
  const m = (await page.evaluate((c) => (window as unknown as { __tour: { mesurer: (c: unknown) => unknown } }).__tour.mesurer(c), ctx)) as { largeur: number; hauteur: number; hauteurPage: number; sections: Mesure["sections"]; defauts: Defaut[]; textes: TexteMesure[] };
  const coupee = m.hauteur > CAPTURE_MAX_PX, hauteur = Math.min(m.hauteur, CAPTURE_MAX_PX);
  const capture = o.capture ? await page.screenshot({ type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width: m.largeur, height: hauteur }, animations: "disabled" }) : null;
  const c = await contrastes(page, m.textes, hauteur, m.largeur);
  return { largeur: m.largeur, hauteur, hauteurPage: m.hauteurPage, coupee, sections: m.sections, defauts: [...m.defauts, ...c], capture, ouverts: [] };
}

/** Ouvre ce qui est replié ou caché ; rend ce qui a été ouvert (vide : rien à ouvrir). */
export async function ouvrir(page: Page): Promise<string[]> {
  const faits = (await page.evaluate(() => (window as unknown as { __tour: { ouvrir: () => string[] } }).__tour.ouvrir())) as string[];
  if (faits.length) await page.waitForTimeout(ATTENTE_OUVERTURE_MS);
  return faits;
}

/** Une page fabriquée pour l'essai d'un détecteur : le même cadre que le Studio (« .tb-wrap.ctw > .frame > main.tb-pg »). */
export const pageFabriquee = (corps: string, css = "") => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}body{background:#fff;font:16px/1.4 Arial,sans-serif;color:#111}:root{--f-title:"Georgia",serif}.tn{display:flow-root;padding:24px 20px;box-sizing:border-box}.tn *{box-sizing:border-box}${css}</style></head><body><div class="tb-wrap ctw"><div class="frame"><main class="tb-pg" data-pg="essai">${corps}</main></div></div></body></html>`;
