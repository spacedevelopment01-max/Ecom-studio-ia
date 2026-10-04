/**
 * Génère les démonstrations de la page d'accueil avec le vrai studio
 * (serveur + worker lancés) à partir de produits réels de fournisseurs (scripts/demo-products/inputs).
 *   BASE=http://localhost:3000 ONLY=verger,oreiller,drone,chat,tribunes tsx scripts/build-demos.ts
 * Sortie : public/demo/<id>/…, public/demo/directions/<direction>.jpg, public/demo/manifest.json
 * Version anglaise (projets créés avec language=en, interface en anglais) :
 *   LANG=en ONLY=verger tsx scripts/build-demos.ts   (puis ONLY=oreiller, ONLY=drone…, une par une)
 *   Vignettes des directions (sur le projet anglais du drone, comme en français) :
 *   LANG=en ONLY_DIRECTIONS=<id du projet> EMAIL=<compte de démonstration> tsx scripts/build-demos.ts
 * Sortie à côté des fichiers français, suffixe « .en » : public/demo/<id>/<nom>.en.<ext>,
 * public/demo/directions/<direction>.en.jpg, public/demo/manifest.en.json (les fichiers français ne sont pas touchés).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type BrowserContext } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const RENDERS = process.env.RENDERS ?? path.join(process.cwd(), "scripts", "demo-renders", "inputs");
const EN = process.env.LANG === "en";
const OUT = path.join(process.cwd(), "public", "demo");
/** Nom de fichier de sortie : « boutique-bureau.jpg » → « boutique-bureau.en.jpg » en anglais. */
const X = (name: string) => (EN ? name.replace(/(\.\w+)$/, ".en$1") : name);
const MANIFEST = X("manifest.json");
const PASSWORD = "demo-studio-2026";

type CatalogDemo = { name: string; category: string; price: string; description: string; features?: string[]; photo: string };
type DemoDef = {
  id: string; sector: string; direction: string; productName: string; brandName: string; price: string; description: string;
  /** Photo d'entrée (sinon <RENDERS>/<id>-photo.png|jpg). */
  photo?: string;
  storeType?: "mono" | "multi" | "niche";
  category?: string;
  catalog?: CatalogDemo[];
  /** Produit réel : provenance affichée sur la page d'accueil. */
  source?: { supplier: string; url: string; note: string };
  /** Photos du produit en situation (vie de tous les jours) : héros de la boutique. */
  lifestyle?: string[];
  /** Blocs de fiche produit réglés comme le ferait le marchand (lots, livraison, autres saveurs…), insérés après le bloc « after ». */
  pdp?: { type: string; after: string; settings: Record<string, unknown> }[];
  /** Variante (ex. coloris) : valeurs et photo de chaque valeur autre que celle de la photo principale. */
  variants?: { name: string; values: string[]; photos?: Record<string, string> };
};

const REAL = path.join(process.cwd(), "scripts", "demo-products", "inputs");
/** Démonstrations à partir de produits réels de fournisseurs (marque blanche ou ré-étiquetés). */
const REAL_DEMOS: DemoDef[] = [
  {
    id: "verger", sector: "Boissons", direction: "gourmand", storeType: "niche", category: "Thés glacés",
    productName: "Thé glacé Pêche", brandName: "Verger", price: "2,40 €",
    description: "Thé glacé à la pêche en canette de 33 cl.",
    photo: path.join(REAL, "boissons", "canette-peche.png"),
    catalog: [
      { name: "Thé glacé Citron", category: "Thés glacés", price: "2,40", description: "Thé glacé au citron en canette de 33 cl.", photo: path.join(REAL, "boissons", "canette-citron.png") },
      { name: "Thé glacé Fruits rouges", category: "Thés glacés", price: "2,40", description: "Thé glacé aux fruits rouges en canette de 33 cl.", photo: path.join(REAL, "boissons", "canette-fruits-rouges.png") },
    ],
    source: { supplier: "AliExpress", url: "https://fr.aliexpress.com/", note: "Canette de thé glacé 33 cl d'un fournisseur, ré-étiquetée : la marque et les trois goûts sont créés par le studio." },
    pdp: [
      { type: "badges", after: "title", settings: { badge1: "🥫 Canette 33 cl", badge2: "♻️ Aluminium recyclable" } },
      { type: "siblings", after: "badges", settings: { collection: "thes-glaces", heading: "Choisissez votre saveur" } },
      { type: "bundles", after: "price", settings: { layout: "cards", heading: "Compose ton pack", units_per_pack: 1, unit_label: "canette", default_tier: "2", qty1: 6, label1: "Pack de 6", discount1: 0, qty2: 12, label2: "Pack de 12", discount2: 5, tag2: "-5 %", qty3: 24, label3: "Pack de 24", discount3: 10, tag3: "-10 %" } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 2, max_days: 4, business_days: true, label: "Livraison estimée" } },
    ],
  },
  {
    id: "oreiller", sector: "Maison", direction: "clinique", category: "Sommeil",
    productName: "Oreiller ergonomique Papillon", brandName: "Somnéa", price: "39,90 €",
    description: "Oreiller ergonomique en forme de papillon. Deux côtés de hauteurs différentes (un côté bas, un côté haut), un creux central pour la tête et des ailes latérales pour dormir sur le côté. Housse respirante. Coloris : bleu ardoise ou vert sauge.",
    photo: path.join(REAL, "maison", "oreiller-bleu.jpg"),
    lifestyle: [path.join(REAL, "situations", "oreiller-sommeil.jpg")],
    variants: { name: "Coloris", values: ["Bleu ardoise", "Vert sauge"], photos: { "Vert sauge": path.join(REAL, "maison", "oreiller-vert.jpg") } },
    pdp: [
      { type: "benefits", after: "price", settings: { emoji1: "🦋", title1: "Forme papillon", text1: "Un creux central pour la tête et des ailes latérales pour dormir sur le côté.", emoji2: "↕️", title2: "Deux hauteurs", text2: "Un côté bas, un côté haut : on tourne l'oreiller selon sa préférence.", emoji3: "🌬️", title3: "Housse respirante", text3: "", emoji4: "", title4: "" } },
      { type: "bundles", after: "buy_buttons", settings: { layout: "rows", heading: "Pour toute la maison", qty1: 1, label1: "1 oreiller", discount1: 0, qty2: 2, label2: "2 oreillers", chip2: "Le duo", discount2: 10, tag2: "-10 %", qty3: 0, default_tier: "1" } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 3, max_days: 6, business_days: true, label: "Livraison estimée" } },
    ],
    source: { supplier: "AliExpress", url: "https://fr.aliexpress.com/", note: "Oreiller ergonomique en marque blanche d'un fournisseur, en deux coloris : la marque, les visuels et la boutique sont créés par le studio." },
  },
  {
    id: "drone", sector: "High-tech", direction: "nocturne", category: "Drones",
    productName: "Drone pliable à caméra stabilisée", brandName: "Ostral", price: "189 €",
    description: "Drone pliable avec caméra stabilisée orientable. Selon la fiche du fournisseur : capteur 1 pouce, ouverture f/1.8, autonomie annoncée de 30 minutes, retour au point de départ par GPS, détection d'obstacles dans quatre directions, prise de vue verticale, radiocommande à écran pliable de 6,9 pouces.",
    photo: path.join(REAL, "hightech", "drone-pliable.jpg"),
    lifestyle: [path.join(REAL, "situations", "drone-montagne.jpg")],
    pdp: [
      { type: "benefits", after: "price", settings: { emoji1: "📍", title1: "Retour au point de départ", text1: "Par GPS, selon la fiche du fournisseur.", emoji2: "🛰️", title2: "Détection d'obstacles", text2: "Dans quatre directions, selon la fiche du fournisseur.", emoji3: "🔋", title3: "30 minutes annoncées", text3: "Autonomie indiquée par le fournisseur, par batterie.", emoji4: "🎒", title4: "Pliable", text4: "Les bras se replient pour le transport." } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 3, max_days: 7, business_days: true, label: "Livraison estimée" } },
    ],
    source: { supplier: "AliExpress", url: "https://fr.aliexpress.com/", note: "Drone pliable en marque blanche d'un fournisseur ; les inscriptions du fabricant ont été retirées de la photo, la marque et la boutique sont créées par le studio." },
  },
  {
    id: "chat", sector: "Animaux", direction: "pop", storeType: "niche", category: "Toilettage",
    productName: "Gant anti-poils", brandName: "Ronron", price: "12,90 €",
    description: "Gant double face pour retirer les poils de chat des canapés, vêtements et coussins. Dos en maille avec dragonne, face en tissu qui accroche les poils. Dimensions : 20 × 15 cm.",
    photo: path.join(REAL, "animaux", "gant-anti-poils.jpg"),
    lifestyle: [path.join(REAL, "situations", "gant-canape.jpg"), path.join(REAL, "situations", "protege-canape-chat.jpg")],
    catalog: [
      { name: "Protège-canapé anti-griffures", category: "Maison", price: "19,90", description: "Revêtement en rouleau à découper puis coller sur les zones griffées (canapé, mur, porte) : le chat y fait ses griffes sans abîmer le meuble.", features: ["Se découpe aux ciseaux", "Dos adhésif"], photo: path.join(REAL, "animaux", "protege-canape.jpg") },
    ],
    source: { supplier: "AliExpress", url: "https://fr.aliexpress.com/", note: "Produits pour chat en marque blanche de fournisseurs : la marque, les visuels et la boutique sont créés par le studio." },
  },
  {
    id: "tribunes", sector: "Mode", direction: "flux", storeType: "niche", category: "T-shirts supporters",
    productName: "T-shirt supporter Lavande", brandName: "Les Tribunes", price: "29,90 €",
    description: "T-shirt de supporter bleu marine, inscription FRANCE et numéro 10, brins de lavande brodés en ton sur ton, liserés bleu-blanc-rouge, drapeau sur la poitrine.",
    photo: path.join(REAL, "vetements", "tshirt-lavande.jpg"),
    catalog: [
      { name: "T-shirt supporter Aquarelle", category: "T-shirts supporters", price: "29,90", description: "T-shirt de supporter écru, motif aquarelle bleu et rouge, écusson tricolore et paysage en relief (tour Eiffel, champs de lavande).", photo: path.join(REAL, "vetements", "tshirt-aquarelle.jpg") },
    ],
    source: { supplier: "AliExpress", url: "https://fr.aliexpress.com/", note: "T-shirts de supporter d'un fournisseur (visuels du fournisseur) : la marque et la boutique sont créées par le studio. Les modèles reprenant l'écusson officiel de la fédération ont été écartés." },
  },
];

/**
 * Entrées anglaises des démonstrations réelles (LANG=en) : traduction fidèle des entrées françaises,
 * sans rien ajouter. Les noms de marque (noms propres) sont inchangés.
 */
const EN_DEMOS: Record<string, Partial<DemoDef>> = {
  verger: {
    sector: "Beverages", category: "Iced teas",
    productName: "Peach Iced Tea", price: "€2.40",
    description: "Peach iced tea in a 33 cl can.",
    catalog: [
      { name: "Lemon Iced Tea", category: "Iced teas", price: "2.40", description: "Lemon iced tea in a 33 cl can.", photo: path.join(REAL, "boissons", "canette-citron.png") },
      { name: "Red Berry Iced Tea", category: "Iced teas", price: "2.40", description: "Red berry iced tea in a 33 cl can.", photo: path.join(REAL, "boissons", "canette-fruits-rouges.png") },
    ],
    source: { supplier: "AliExpress", url: "https://www.aliexpress.com/", note: "A supplier's 33 cl can of iced tea, relabeled: the brand and the three flavors are created by the studio." },
    pdp: [
      { type: "badges", after: "title", settings: { badge1: "🥫 33 cl can", badge2: "♻️ Recyclable aluminum" } },
      { type: "siblings", after: "badges", settings: { collection: "iced-teas", heading: "Choose your flavor" } },
      { type: "bundles", after: "price", settings: { layout: "cards", heading: "Build your pack", units_per_pack: 1, unit_label: "can", default_tier: "2", qty1: 6, label1: "Pack of 6", discount1: 0, qty2: 12, label2: "Pack of 12", discount2: 5, tag2: "-5%", qty3: 24, label3: "Pack of 24", discount3: 10, tag3: "-10%" } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 2, max_days: 4, business_days: true, label: "Estimated delivery" } },
    ],
  },
  oreiller: {
    sector: "Home", category: "Sleep",
    productName: "Papillon Ergonomic Pillow", price: "€39.90",
    description: "Butterfly-shaped ergonomic pillow. Two sides of different heights (one low side, one high side), a central hollow for the head and side wings for sleeping on your side. Breathable cover. Colors: slate blue or sage green.",
    variants: { name: "Color", values: ["Slate blue", "Sage green"], photos: { "Sage green": path.join(REAL, "maison", "oreiller-vert.jpg") } },
    pdp: [
      { type: "benefits", after: "price", settings: { emoji1: "🦋", title1: "Butterfly shape", text1: "A central hollow for the head and side wings for sleeping on your side.", emoji2: "↕️", title2: "Two heights", text2: "One low side, one high side: turn the pillow to suit your preference.", emoji3: "🌬️", title3: "Breathable cover", text3: "", emoji4: "", title4: "" } },
      { type: "bundles", after: "buy_buttons", settings: { layout: "rows", heading: "For the whole home", qty1: 1, label1: "1 pillow", discount1: 0, qty2: 2, label2: "2 pillows", chip2: "The duo", discount2: 10, tag2: "-10%", qty3: 0, default_tier: "1" } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 3, max_days: 6, business_days: true, label: "Estimated delivery" } },
    ],
    source: { supplier: "AliExpress", url: "https://www.aliexpress.com/", note: "A white-label ergonomic pillow from a supplier, in two colors: the brand, the visuals and the store are created by the studio." },
  },
  drone: {
    sector: "Tech", category: "Drones",
    productName: "Foldable Drone with Stabilized Camera", price: "€189",
    description: "Foldable drone with an adjustable stabilized camera. According to the supplier's listing: 1-inch sensor, f/1.8 aperture, stated flight time of 30 minutes, GPS return to home, obstacle sensing in four directions, vertical shooting, remote controller with a 6.9-inch foldable screen.",
    pdp: [
      { type: "benefits", after: "price", settings: { emoji1: "📍", title1: "Return to home", text1: "Via GPS, according to the supplier's listing.", emoji2: "🛰️", title2: "Obstacle sensing", text2: "In four directions, according to the supplier's listing.", emoji3: "🔋", title3: "30 minutes stated", text3: "Flight time per battery, as stated by the supplier.", emoji4: "🎒", title4: "Foldable", text4: "The arms fold away for transport." } },
      { type: "delivery", after: "buy_buttons", settings: { min_days: 3, max_days: 7, business_days: true, label: "Estimated delivery" } },
    ],
    source: { supplier: "AliExpress", url: "https://www.aliexpress.com/", note: "A white-label foldable drone from a supplier; the manufacturer's markings were removed from the photo, and the brand and store are created by the studio." },
  },
  chat: {
    sector: "Pets", category: "Grooming",
    productName: "Pet Hair Remover Glove", price: "€12.90",
    description: "Double-sided glove for removing cat hair from sofas, clothes and cushions. Mesh back with wrist strap, fabric side that catches the hair. Dimensions: 20 × 15 cm.",
    catalog: [
      { name: "Anti-Scratch Sofa Protector", category: "Home", price: "19.90", description: "Roll covering to cut and stick onto scratched areas (sofa, wall, door): the cat scratches it without damaging the furniture.", features: ["Cuts with scissors", "Adhesive back"], photo: path.join(REAL, "animaux", "protege-canape.jpg") },
    ],
    source: { supplier: "AliExpress", url: "https://www.aliexpress.com/", note: "White-label cat products from suppliers: the brand, the visuals and the store are created by the studio." },
  },
  tribunes: {
    sector: "Fashion", category: "Supporter T-shirts",
    productName: "Lavender Supporter T-shirt", price: "€29.90",
    description: "Navy blue supporter T-shirt with FRANCE lettering and the number 10, tone-on-tone embroidered lavender sprigs, blue-white-red trims, flag on the chest.",
    catalog: [
      { name: "Watercolor Supporter T-shirt", category: "Supporter T-shirts", price: "29.90", description: "Ecru supporter T-shirt with a blue and red watercolor pattern, tricolor crest and raised landscape (Eiffel Tower, lavender fields).", photo: path.join(REAL, "vetements", "tshirt-aquarelle.jpg") },
    ],
    source: { supplier: "AliExpress", url: "https://www.aliexpress.com/", note: "Supporter T-shirts from a supplier (supplier visuals): the brand and the store are created by the studio. Designs featuring the federation's official crest were excluded." },
  },
};
const ONLY_IDS = process.env.ONLY?.split(",");
const PRODUCTS: DemoDef[] = EN ? REAL_DEMOS.filter((d) => !ONLY_IDS || ONLY_IDS.includes(d.id)).map((d) => ({ ...d, ...EN_DEMOS[d.id] })) : process.env.ONLY ? REAL_DEMOS.filter((d) => process.env.ONLY!.split(",").includes(d.id)) : [
  { id: "serum", sector: "Beauté", direction: "atelier", productName: "Sérum Éclat", brandName: "Maison Ondine", price: "34,90 €", description: "Sérum visage en flacon compte-gouttes en verre de 30 ml. Formule à la niacinamide et à l'acide hyaluronique. Texture légère, à appliquer matin et soir sur peau propre." },
  { id: "drone", sector: "High-tech", direction: "nocturne", productName: "Drone Aeris X1", brandName: "Aeris", price: "499 €", description: "Drone de loisir quadrirotor avec caméra stabilisée sur nacelle. Châssis graphite, poids : 249 g. Autonomie : 31 minutes par batterie. Vidéo 4K à 30 images par seconde." },
  { id: "soda", sector: "Boissons", direction: "gourmand", productName: "Pétale Framboise & Hibiscus", brandName: "Pétale", price: "2,90 €", description: "Soda pétillant à la framboise et à l'hibiscus en canette de 33 cl. 4 g de sucre pour 100 ml. Sans édulcorant." },
  { id: "montre", sector: "High-tech", direction: "clinique", productName: "Montre connectée Pulso", brandName: "Pulso", price: "229 €", description: "Montre connectée à écran AMOLED de 1,8 pouce, boîtier en aluminium de 44 mm, bracelet en silicone. Étanche 5 ATM. Autonomie : 7 jours." },
  { id: "the", sector: "Thé", direction: "joaillerie", productName: "Thé vert Sencha", brandName: "Kumo", price: "18 €", description: "Thé vert sencha en feuilles entières, boîte métal de 100 g. Infusion : 2 minutes à 75 °C." },
  { id: "gourde", sector: "Sport", direction: "flux", productName: "Gourde isotherme 750 ml", brandName: "Nordvik", price: "32 €", description: "Gourde en acier inoxydable à double paroi, 750 ml, bouchon vissé étanche. Garde les boissons froides ou chaudes. Sans BPA." },
  { id: "bougie", sector: "Maison", direction: "terroir", productName: "Bougie Figuier & Bois fumé", brandName: "Atelier Braise", price: "29 €", description: "Bougie parfumée de 220 g dans un pot en verre teinté avec couvercle en bois. Notes de figue et de bois fumé. Cire végétale et mèche en coton." },
  { id: "tasse", sector: "Maison", direction: "galerie", productName: "Tasse en grès émaillé", brandName: "Terre & Feu", price: "24 €", description: "Tasse en grès émaillé de 300 ml, tournée à la main dans notre atelier. Passe au lave-vaisselle. Chaque pièce présente de légères variations d'émail." },
];

async function api(ctx: BrowserContext, url: string, init?: { method?: string; body?: unknown }) {
  const r = await ctx.request.fetch(`${BASE}${url}`, { method: init?.method ?? (init?.body ? "POST" : "GET"), data: init?.body as any });
  const j = await r.json();
  if (!r.ok()) throw new Error(`${url} → ${r.status()} ${JSON.stringify(j)}`);
  return j;
}

async function waitIdle(ctx: BrowserContext, pid: string) {
  const t0 = Date.now();
  for (;;) {
    const r = await api(ctx, `/api/projects/${pid}`);
    if (!r.active?.length) return r;
    if (Date.now() - t0 > 600_000) throw new Error("délai dépassé");
    await new Promise((res) => setTimeout(res, 2500));
  }
}

async function saveImg(ctx: BrowserContext, url: string, dest: string, width = 1200) {
  const r = await ctx.request.get(`${BASE}${url}`);
  const buf = Buffer.from(await r.body());
  await sharp(buf).resize({ width, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);
}
async function saveRaw(ctx: BrowserContext, url: string, dest: string) {
  const r = await ctx.request.get(`${BASE}${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.body()));
}

async function shot(ctx: BrowserContext, url: string, dest: string, viewport: { width: number; height: number }, clipH?: number) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: ".es-pv-bar{display:none!important}" });
  await page.evaluate(async () => { for (let y = 0; y < 2400; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(1200);
  // Capture plus haute que l'écran : page entière recadrée (le héros garde sa hauteur d'écran réelle).
  const full = await page.screenshot({ fullPage: !!clipH && clipH > viewport.height });
  const png = await sharp(full).extract({ left: 0, top: 0, width: viewport.width, height: Math.min(clipH ?? viewport.height, (await sharp(full).metadata()).height!) }).toBuffer();
  await sharp(png).resize({ width: Math.min(viewport.width, 1200) }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
  await page.close();
}

const ONLY_DIRECTIONS = process.env.ONLY_DIRECTIONS; // identifiant d'un projet existant : ne refait que les vignettes
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ reducedMotion: "reduce" });
// Langue de l'interface du studio (cookie « ecs-lang ») : anglais pour LANG=en.
if (EN) await ctx.addCookies([{ name: "ecs-lang", value: "en", url: BASE }]);
async function shootDirections(pid: string) {
  const { DIRECTIONS } = await import("../src/lib/theme/directions");
  fs.mkdirSync(path.join(OUT, "directions"), { recursive: true });
  for (const d of DIRECTIONS) {
    await api(ctx, `/api/projects/${pid}/theme/build`, { body: { direction: d.id } });
    await waitIdle(ctx, pid);
    const theme = await api(ctx, `/api/projects/${pid}/theme`);
    await shot(ctx, `/preview/${pid}/v/${theme.current.versionId}/`, path.join(OUT, "directions", X(`${d.id}.jpg`)), { width: 1280, height: 860 }, 1600);
    console.log(`  direction ${d.id} ✓`);
  }
}
if (ONLY_DIRECTIONS) {
  await api(ctx, "/api/auth/login", { body: { email: process.env.EMAIL, password: PASSWORD } });
  await shootDirections(ONLY_DIRECTIONS);
  await browser.close();
  process.exit(0);
}
const email = `demo-${Date.now()}@ecom-studio.local`;
await api(ctx, "/api/auth/register", { body: { email, password: PASSWORD, name: EN ? "Demos" : "Démonstrations" } });
// Le compte de démonstration a besoin de plusieurs boutiques : activation manuelle locale.
const { db } = await import("../src/lib/db");
const { syncAllowance, getSubscription } = await import("../src/lib/billing");
const me = await api(ctx, "/api/me");
getSubscription(me.user.id);
db().prepare("UPDATE subscriptions SET status = 'manual', stores = 20 WHERE user_id = ?").run(me.user.id);
syncAllowance(me.user.id);

// ONLY=<id,…> : régénère ces démonstrations seulement et les fusionne dans le manifeste existant.
if (!process.env.ONLY && !EN) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "directions"), { recursive: true });
const previous = process.env.ONLY && fs.existsSync(path.join(OUT, MANIFEST)) ? JSON.parse(fs.readFileSync(path.join(OUT, MANIFEST), "utf8")).demos : [];
const demos: any[] = [];
let firstProject: { pid: string } | null = null;

for (const p of PRODUCTS) {
  console.log(`▶ ${p.id}`);
  const dir = path.join(OUT, p.id);
  fs.mkdirSync(dir, { recursive: true });
  const photoFile = p.photo ?? [".png", ".jpg"].map((x) => path.join(RENDERS, `${p.id}-photo${x}`)).find((f) => fs.existsSync(f))!;
  // Photo transparente (produit détouré) : posée sur un fond clair, comme une photo de fournisseur.
  const photo = photoFile.endsWith(".png") ? await sharp(photoFile).resize({ height: 1600, withoutEnlargement: true }).extend({ top: 120, bottom: 120, left: 400, right: 400, background: "#F3F1ED" }).flatten({ background: "#F3F1ED" }).jpeg({ quality: 92 }).toBuffer() : fs.readFileSync(photoFile);
  const res = await ctx.request.post(`${BASE}/api/projects`, {
    multipart: { photos: { name: path.basename(photoFile).replace(/\.png$/, ".jpg"), mimeType: "image/jpeg", buffer: photo }, productName: p.productName, brandName: p.brandName, price: p.price, description: p.description, mode: "autopilot", platform: "shopify", storeType: p.storeType ?? "mono", ...(EN ? { language: "en" } : {}) },
  });
  const created = await res.json();
  if (!res.ok()) throw new Error(JSON.stringify(created));
  const pid = created.id ?? created.project?.id;
  const t0 = Date.now();
  let ov = await waitIdle(ctx, pid);
  console.log(`  pipeline ${Math.round((Date.now() - t0) / 1000)} s`, ov.pipeline?.job?.status);
  // Catalogue (niche, multi) : les autres produits, avec leur photo réelle.
  if (p.catalog?.length) {
    for (const c of p.catalog) {
      const buf = c.photo.endsWith(".png") ? await sharp(c.photo).resize({ height: 1600, withoutEnlargement: true }).extend({ top: 120, bottom: 120, left: 400, right: 400, background: "#F3F1ED" }).flatten({ background: "#F3F1ED" }).jpeg({ quality: 92 }).toBuffer() : fs.readFileSync(c.photo);
      const r = await ctx.request.post(`${BASE}/api/projects/${pid}/catalog`, { multipart: { name: c.name, category: c.category, price: c.price, description: c.description, features: (c.features ?? []).join("\n"), photo: { name: `${c.name}.jpg`, mimeType: "image/jpeg", buffer: buf } } });
      if (!r.ok()) throw new Error(await r.text());
    }
  }
  // Photos en situation (héros de la boutique).
  for (const file of p.lifestyle ?? []) {
    const r = await ctx.request.post(`${BASE}/api/projects/${pid}/files`, { multipart: { role: "lifestyle", files: { name: path.basename(file), mimeType: "image/jpeg", buffer: fs.readFileSync(file) } } });
    if (!r.ok()) throw new Error(await r.text());
  }
  // Vidéos refaites avec les photos en situation (elles ouvrent le montage).
  if (p.lifestyle?.length) {
    await api(ctx, `/api/projects/${pid}/videos`, { body: { format: "9:16", target: "ads", goal: EN ? "short ad for social media" : "publicité courte pour les réseaux sociaux" } });
    await api(ctx, `/api/projects/${pid}/videos`, { body: { format: "16:9", target: "shop", goal: EN ? "mood video for the store" : "vidéo d'ambiance pour la boutique", music: "none" } });
    await waitIdle(ctx, pid);
  }
  // Variante (coloris…) : valeurs du produit, puis photo de chaque valeur.
  if (p.variants) {
    await api(ctx, `/api/projects/${pid}/product`, { method: "PATCH", body: { variants: [{ name: p.variants.name, values: p.variants.values }] } });
    for (const [value, file] of Object.entries(p.variants.photos ?? {})) {
      const r = await ctx.request.post(`${BASE}/api/projects/${pid}/product/variant-photo`, { multipart: { value, photo: { name: path.basename(file), mimeType: "image/jpeg", buffer: fs.readFileSync(file) } } });
      if (!r.ok()) throw new Error(await r.text());
    }
  }
  // Chaque démonstration montre une direction différente.
  await api(ctx, `/api/projects/${pid}/theme/build`, { body: { direction: p.direction } });
  ov = await waitIdle(ctx, pid);
  firstProject ??= { pid };
  // Fiche produit réglée comme le ferait le marchand (nouvelle version du thème).
  if (p.pdp?.length) {
    const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
    const cur = currentTheme(pid)!;
    const spec = structuredClone(cur.spec);
    const mainId = spec.templates.product.order.find((id) => spec.templates.product.sections[id]?.type === "main-product")!;
    const mp = spec.templates.product.sections[mainId];
    for (const [n, b] of p.pdp.entries()) {
      const id = `demo_${b.type}_${n}`;
      mp.blocks![id] = { type: b.type, settings: b.settings } as any;
      const order = mp.block_order!;
      const after = order.find((x) => x.startsWith(`demo_${b.after}`)) ?? order.find((x) => mp.blocks![x].type === b.after);
      order.splice(after ? order.indexOf(after) + 1 : order.length, 0, id);
    }
    saveThemeVersion(pid, spec, EN ? "Product page: bundles, delivery and other merchant settings" : "Fiche produit : lots, livraison et autres réglages du marchand", "user");
  }

  const files = (await api(ctx, `/api/projects/${pid}/files?q=`)).assets as any[];
  const all = (await api(ctx, `/api/projects/${pid}/files`)).assets as any[];
  const assets = files.length ? files : all;
  // Scènes dans l'ordre de création : la première (« vie quotidienne ») sert d'exemple principal.
  const byRole = (r: string) => assets.filter((a) => a.role === r).sort((x, y) => (r === "scene" ? (x.createdAt ?? 0) - (y.createdAt ?? 0) : 0));
  await sharp(photo).resize({ width: 900 }).jpeg({ quality: 84 }).toFile(path.join(dir, X("photo.jpg")));
  const images: { src: string; label: string }[] = [];
  const pick: [string, string, number][] = EN
    ? [["cutout", "Cutout", 1], ["packshot", "Packshot", 1], ["detail", "Detail", 1], ["scene", "Scene", 2], ["social", "Social visual", 1], ["ad", "Ad", 1], ["banner", "Banner", 1]]
    : [["cutout", "Détourage", 1], ["packshot", "Packshot", 1], ["detail", "Détail", 1], ["scene", "Scène", 2], ["social", "Visuel social", 1], ["ad", "Publicité", 1], ["banner", "Bannière", 1]];
  for (const [role, label, n] of pick) {
    for (const [i, a] of byRole(role).slice(0, n).entries()) {
      const file = X(`${role}-${i + 1}.jpg`);
      if (role === "cutout") {
        const r = await ctx.request.get(`${BASE}${a.url}`);
        await sharp(Buffer.from(await r.body())).resize({ width: 900 }).webp({ quality: 86 }).toFile(path.join(dir, X(`${role}-${i + 1}.webp`)));
        images.push({ src: `/demo/${p.id}/${X(`${role}-${i + 1}.webp`)}`, label });
      } else {
        await saveImg(ctx, a.url, path.join(dir, file));
        images.push({ src: `/demo/${p.id}/${file}`, label });
      }
    }
  }
  const logo = byRole("logo-svg")[0] ?? byRole("logo")[0];
  const logoFile = X(logo?.mime === "image/svg+xml" ? "logo.svg" : "logo.png");
  if (logo) await saveRaw(ctx, logo.url, path.join(dir, logoFile));
  const videos = byRole("video").sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0));
  const vertical = videos.find((v) => v.meta?.format === "9:16") ?? videos[0];
  const wide = videos.find((v) => v.meta?.format === "16:9");
  if (vertical) await saveRaw(ctx, vertical.url, path.join(dir, X("video.mp4")));
  if (wide) await saveRaw(ctx, wide.url, path.join(dir, X("video-boutique.mp4")));
  const poster = byRole("video-poster").find((x) => x.sourceAssetId === vertical?.id);
  if (poster) await saveImg(ctx, poster.url, path.join(dir, X("video-poster.jpg")), 720);

  const theme = await api(ctx, `/api/projects/${pid}/theme`);
  const vid = theme.current.versionId;
  await shot(ctx, `/preview/${pid}/v/${vid}/`, path.join(dir, X("boutique-bureau.jpg")), { width: 1440, height: 900 });
  await shot(ctx, `/preview/${pid}/v/${vid}/`, path.join(dir, X("boutique-mobile.jpg")), { width: 390, height: 844 });
  await shot(ctx, `/preview/${pid}/v/${vid}/products/${theme.current.product.handle}`, path.join(dir, X("fiche-produit.jpg")), { width: 1440, height: 900 });

  demos.push({
    id: p.id,
    brand: ov.brand?.name ?? p.brandName,
    product: p.productName,
    sector: p.sector,
    direction: theme.current.direction,
    palette: Object.values(ov.brand?.palette ?? {}).slice(0, 5),
    photo: `/demo/${p.id}/${X("photo.jpg")}`,
    logo: logo ? `/demo/${p.id}/${logoFile}` : "",
    shopDesktop: `/demo/${p.id}/${X("boutique-bureau.jpg")}`,
    shopMobile: `/demo/${p.id}/${X("boutique-mobile.jpg")}`,
    productPage: `/demo/${p.id}/${X("fiche-produit.jpg")}`,
    images,
    video: vertical ? `/demo/${p.id}/${X("video.mp4")}` : "",
    videoPoster: poster ? `/demo/${p.id}/${X("video-poster.jpg")}` : "",
    shopVideo: wide ? `/demo/${p.id}/${X("video-boutique.mp4")}` : undefined,
    storeType: p.storeType ?? "mono",
    products: 1 + (p.catalog?.length ?? 0),
    source: p.source ?? null,
  });
}

// Toutes les directions de boutique, appliquées au premier produit (sauf régénération partielle).
// DIRECTIONS=1 : les refait aussi lors d'une régénération partielle (ex. LANG=en ONLY=verger DIRECTIONS=1).
if (!process.env.ONLY || process.env.DIRECTIONS) await shootDirections(firstProject!.pid);

// DROP=<id,…> : démonstrations retirées (produits 3D remplacés par des produits réels).
const drop = (process.env.DROP ?? "").split(",").filter(Boolean);
const order = (d: any) => { const k = REAL_DEMOS.findIndex((x) => x.id === d.id); return k < 0 ? 99 : k; };
const merged = (process.env.ONLY ? [...demos, ...previous.filter((d: any) => !demos.some((x) => x.id === d.id))] : demos).filter((d: any) => !drop.includes(d.id));
// Ordre stable (celui de REAL_DEMOS) quand les démonstrations sont régénérées une par une.
if (EN) merged.sort((a: any, b: any) => order(a) - order(b));
fs.writeFileSync(path.join(OUT, MANIFEST), JSON.stringify({ generatedAt: new Date().toISOString(), note: EN ? "Brands created by E-COM STUDIO IA (built-in engine) from photos of real supplier products, retouched (original markings removed)." : "Marques créées par E-COM STUDIO IA (moteur intégré) à partir de photos de produits réels de fournisseurs, retouchées (inscriptions d'origine retirées).", demos: merged }, null, 2));
console.log(`✓ ${demos.length} démonstrations → public/demo/${MANIFEST}`);
await browser.close();
