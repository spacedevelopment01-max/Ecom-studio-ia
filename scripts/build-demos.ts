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
  /** Entreprise de services : prestations, zone, horaires, façons d'être contacté, plateforme. */
  business?: "products" | "services";
  platform?: "shopify" | "woocommerce";
  services?: { name: string; description: string }[];
  area?: string;
  hours?: string;
  contactModes?: string;
  /** Autres photos fournies à la création (services : atelier, salon…). */
  photos?: string[];
};

const REAL = path.join(process.cwd(), "scripts", "demo-products", "inputs");
const PX = path.join(REAL, "pixabay");
const IA = path.join(REAL, "ia");
/**
 * Démonstrations à partir de vraies photos de produits et de vrais métiers (Pixabay, licence de contenu Pixabay :
 * usage commercial autorisé, sans attribution obligatoire ; sources dans scripts/demo-products/inputs/pixabay/sources.json).
 * Les marques sont fictives et créées par le studio ; aucune n'imite une marque existante.
 */
const REAL_DEMOS: DemoDef[] = [
  {
    // Série d'un même photographe : le même casque sur trois vraies photos (plage, lumière du soir).
    id: "casque", sector: "High-tech", direction: "signal", category: "Audio",
    productName: "Casque audio", brandName: "Sonore", price: "79 €",
    description: "Casque audio supra-auriculaire noir, coques argentées, arceau rembourré. Se porte autour du cou entre deux écoutes.\nFormat : supra-auriculaire\nMatières : coques argentées, arceau rembourré",
    photo: path.join(PX, "casque-1.jpg"),
    photos: [path.join(PX, "casque-2.jpg"), path.join(PX, "casque-3.jpg")],
    source: { supplier: "Pixabay", url: "https://pixabay.com/photos/woman-pose-model-girl-youth-4628615/", note: "Vraies photos d'un casque sans marque visible, en situation (Pixabay, série d'Engin_Akyurt) : la marque, les visuels et la boutique sont créés par le studio." },
  },
  {
    // Plusieurs produits : deux t-shirts de fournisseur (sans écusson officiel) et deux accessoires créés par l'IA.
    id: "tribunes", sector: "Mode", direction: "flux", storeType: "multi", category: "Supporters",
    productName: "T-shirt supporter Lavande", brandName: "Les Tribunes", price: "29,90 €",
    description: "T-shirt de supporter bleu marine, inscription FRANCE et numéro 10, brins de lavande brodés en ton sur ton, liserés bleu-blanc-rouge, drapeau sur la poitrine.",
    photo: path.join(REAL, "vetements", "tshirt-lavande.jpg"),
    catalog: [
      { name: "T-shirt supporter Aquarelle", category: "T-shirts", price: "29,90", description: "T-shirt de supporter écru, motif aquarelle bleu et rouge, écusson tricolore et paysage en relief (tour Eiffel, champs de lavande).", photo: path.join(REAL, "vetements", "tshirt-aquarelle.jpg") },
      { name: "Écharpe tricolore", category: "Accessoires", price: "19,90", description: "Écharpe de supporter en maille, rayures bleu marine, blanc et rouge, franges courtes.", photo: path.join(IA, "tribunes-echarpe.jpg") },
      { name: "Casquette Lavande", category: "Accessoires", price: "24,90", description: "Casquette en coton bleu marine, brin de lavande brodé sur le devant, bande tricolore sur la patte de serrage.", photo: path.join(IA, "tribunes-casquette.jpg") },
    ],
    source: { supplier: "Fournisseur + IA", url: "", note: "Deux t-shirts de supporter d'un fournisseur (visuels du fournisseur) et deux accessoires dont la photo a été créée par l'IA : la marque et la boutique sont créées par le studio. Aucun écusson officiel." },
  },
  {
    id: "gourde", sector: "Sport et plein air", direction: "elan", category: "Gourdes",
    productName: "Gourde isotherme 750 ml", brandName: "Cime", price: "34,90 €",
    description: "Gourde isotherme double paroi en inox, 750 ml, finition mate vert sauge, bouchon en bambou à anse inox.\nContenance : 750 ml\nMatières : inox double paroi, bouchon bambou",
    photo: path.join(IA, "gourde.jpg"),
    source: { supplier: "Photo créée par l'IA", url: "", note: "Produit et photo d'origine créés par l'IA (OpenAI) pour la démonstration : la marque, les visuels et la boutique sont créés par le studio. Aucune caractéristique technique n'est annoncée sans être fournie." },
  },
  {
    id: "fleuriste", sector: "Fleuriste", direction: "magazine", business: "services", platform: "woocommerce",
    productName: "Atelier floral", brandName: "Atelier Pivoine", price: "",
    description: "Fleuriste artisan : bouquets du jour, compositions sur mesure pour mariages et événements, abonnements floraux pour les entreprises, livraison en ville.",
    photo: path.join(PX, "fleuriste-boutique.jpg"),
    photos: [path.join(PX, "fleuriste-atelier.jpg"), path.join(PX, "fleuriste-etal.jpg")],
    services: [
      { name: "Bouquets du jour", description: "Fleurs de saison composées à la boutique, à emporter ou livrées." },
      { name: "Mariages et événements", description: "Bouquet de mariée, décoration de table et de salle, sur rendez-vous." },
      { name: "Abonnement entreprise", description: "Une composition renouvelée chaque semaine pour votre accueil." },
    ],
    area: "Lyon et alentours", hours: "Du mardi au samedi, 9 h – 19 h", contactModes: "quote,form",
    source: { supplier: "Pixabay", url: "https://pixabay.com/photos/flower-bouquet-petal-bloom-garden-2588972/", note: "Vraies photos de boutique et d'atelier de fleuriste (Pixabay) : l'entreprise est fictive, son site et sa marque sont créés par le studio." },
  },
  {
    id: "paysagiste", sector: "Paysagiste", direction: "jardin", business: "services", platform: "woocommerce",
    productName: "Création et entretien de jardins", brandName: "Racines & Pierres", price: "",
    description: "Paysagiste : conception et création de jardins, terrasses en bois et murets en pierre sèche, plantations, entretien à l'année.",
    photo: path.join(IA, "paysagiste-jardin.jpg"),
    photos: [path.join(IA, "paysagiste-terrasse.jpg"), path.join(IA, "paysagiste-outils.jpg")],
    services: [
      { name: "Création de jardin", description: "Plan, choix des végétaux, allées et murets, du projet à la plantation." },
      { name: "Terrasses et aménagements", description: "Terrasses en bois, jardinières, éclairage extérieur." },
      { name: "Entretien à l'année", description: "Taille, tonte, désherbage et suivi des plantations." },
    ],
    area: "Aix-en-Provence et alentours", hours: "Du lundi au vendredi, 8 h – 18 h", contactModes: "quote,call",
    source: { supplier: "Photos créées par l'IA", url: "", note: "Entreprise fictive : les photos de jardins ont été créées par l'IA (OpenAI) pour la démonstration ; le site et la marque sont créés par le studio." },
  },
];

/** Version anglaise des démonstrations (projets créés avec language=en). */
const EN_DEMOS: Record<string, Partial<DemoDef>> = {
  tillandsia: { sector: "Plants", category: "Houseplants", productName: "Potted air plant", price: "€24", description: "Tillandsia (air plant) in a small painted terracotta pot, pink or green.", variants: { name: "Pot color", values: ["Pink", "Green"], photos: { Green: path.join(PX, "tillandsia-3.jpg") } }, source: { supplier: "Pixabay", url: "https://pixabay.com/photos/pastel-potted-plant-flowers-season-4279379/", note: "Real photos of a potted plant (Pixabay, HeungSoon series): the brand, the visuals and the store are created by the studio." } },
  casque: { sector: "Tech", category: "Audio", productName: "Headphones", price: "€79", description: "Black on-ear headphones with silver ear cups and a padded headband. Worn around the neck between listens.\nSize: on-ear\nMaterials: silver ear cups, padded headband", source: { supplier: "Pixabay", url: "https://pixabay.com/photos/woman-pose-model-girl-youth-4628615/", note: "Real in-context photos of unbranded headphones (Pixabay, Engin_Akyurt series): the brand, the visuals and the store are created by the studio." } },
  cafe: { sector: "Fine food", category: "Coffee", productName: "Coffee beans", price: "€12.90", description: "Roasted coffee beans, sold in 250 g bags; beans shown in their jute sack.", source: { supplier: "Pixabay", url: "https://pixabay.com/photos/coffee-coffee-beans-bag-3142562/", note: "Real photos of coffee beans (Pixabay, Bru-nO series): the brand, the visuals and the store are created by the studio." } },
  savon: { sector: "Beauty", category: "Soaps", productName: "Perilla soap", price: "€7.50", description: "Handmade perilla solid soap, green bar, cold-processed.", source: { supplier: "Pixabay", url: "https://pixabay.com/photos/handmade-soap-perilla-perilla-soap-4926843/", note: "Real photos of a handmade perilla soap (Pixabay, phuonghoangthuy series): the brand, the visuals and the store are created by the studio." } },
  fleuriste: { sector: "Florist", productName: "Floral studio", description: "Artisan florist: daily bouquets, custom arrangements for weddings and events, flower subscriptions for businesses, local delivery.", services: [{ name: "Daily bouquets", description: "Seasonal flowers arranged in the shop, to take away or delivered." }, { name: "Weddings and events", description: "Bridal bouquet, table and venue decoration, by appointment." }, { name: "Business subscription", description: "A fresh arrangement every week for your reception." }], area: "Lyon and surroundings", hours: "Tuesday to Saturday, 9am – 7pm", source: { supplier: "Pixabay", url: "https://pixabay.com/photos/flower-bouquet-petal-bloom-garden-2588972/", note: "Real photos of a florist's shop and workshop (Pixabay): the business is fictional, its website and brand are created by the studio." } },
  barbier: { sector: "Barber", productName: "Barber shop", description: "Barber: men's haircuts with scissors and clippers, beard trimming and care, traditional straight-razor shave, kids' cuts.", services: [{ name: "Men's haircut", description: "Scissors and clippers, shampoo and styling." }, { name: "Beard trim", description: "Outline, fade and oil treatment." }, { name: "Traditional shave", description: "Straight razor, hot towel." }, { name: "Kids' cut", description: "Up to age 12." }], area: "Central Bordeaux", hours: "Tuesday to Saturday, 9:30am – 7pm", source: { supplier: "Pixabay", url: "https://pixabay.com/photos/barber-chair-salon-hairdresser-1453064/", note: "Real photos of a barber shop (Pixabay): the business is fictional, its website and brand are created by the studio." } },
};
const ONLY_IDS = process.env.ONLY?.split(",");
const PRODUCTS: DemoDef[] = (ONLY_IDS ? REAL_DEMOS.filter((d) => ONLY_IDS.includes(d.id)) : REAL_DEMOS).map((d) => (EN ? { ...d, ...EN_DEMOS[d.id] } : d));

async function api(ctx: BrowserContext, url: string, init?: { method?: string; body?: unknown }): Promise<any> {
  const method = init?.method ?? (init?.body ? "POST" : "GET");
  // Une lecture coupée (serveur de développement occupé) est relancée ; une écriture ne l'est jamais.
  const send = async (k = 0): Promise<Awaited<ReturnType<typeof ctx.request.fetch>>> => {
    try {
      return await ctx.request.fetch(`${BASE}${url}`, { method, data: init?.body as any, timeout: 600_000 });
    } catch (e) {
      if (method !== "GET" || k >= 4) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (k + 1)));
      return send(k + 1);
    }
  };
  const r = await send();
  const j = await r.json();
  if (!r.ok()) throw new Error(`${url} → ${r.status()} ${JSON.stringify(j)}`);
  return j;
}

async function waitIdle(ctx: BrowserContext, pid: string) {
  const t0 = Date.now();
  for (;;) {
    const r = await api(ctx, `/api/projects/${pid}`);
    if (!r.active?.length) return r;
    if (Date.now() - t0 > Number(process.env.WAIT_S ?? 600) * 1000) throw new Error("délai dépassé");
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
await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} }); // intro d'ouverture déjà vue : rien ne couvre la page filmée
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
const email = process.env.EMAIL ?? `demo-${Date.now()}@ecom-studio.local`;
if (process.env.EMAIL) await api(ctx, "/api/auth/login", { body: { email, password: PASSWORD } });
else await api(ctx, "/api/auth/register", { body: { email, password: PASSWORD, name: EN ? "Demos" : "Démonstrations" } });
// Le compte de démonstration a besoin de plusieurs boutiques : activation manuelle locale.
const { db } = await import("../src/lib/db");
const { syncAllowance, getSubscription } = await import("../src/lib/billing");
const { createSubscription } = await import("../src/lib/project-subscriptions");
const me = await api(ctx, "/api/me");
getSubscription(me.user.id);
db().prepare("UPDATE subscriptions SET status = 'manual', stores = 20, plan = 'dominer' WHERE user_id = ?").run(me.user.id);
syncAllowance(me.user.id);

// ONLY=<id,…> : régénère ces démonstrations seulement et les fusionne dans le manifeste existant.
if (!process.env.ONLY && !EN) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "directions"), { recursive: true });
const previous = process.env.ONLY && fs.existsSync(path.join(OUT, MANIFEST)) ? JSON.parse(fs.readFileSync(path.join(OUT, MANIFEST), "utf8")).demos : [];
const demos: any[] = [];
let firstProject: { pid: string } | null = null;
// SOCIAL_ONLY=1 (avec PID) : refait seulement la semaine de publications d'un projet existant (sans IA), puis la collecte.
const REDO = !process.env.SOCIAL_ONLY;

for (const p of PRODUCTS) {
  console.log(`▶ ${p.id}`);
  const dir = path.join(OUT, p.id);
  fs.mkdirSync(dir, { recursive: true });
  // Fichiers de la langue en cours retirés : un visuel que la nouvelle création ne produit plus ne reste pas en ligne.
  for (const f of fs.readdirSync(dir)) if (/\.en\.[a-z0-9]+$/.test(f) === EN) fs.rmSync(path.join(dir, f), { force: true });
  const photoFile = p.photo ?? [".png", ".jpg"].map((x) => path.join(RENDERS, `${p.id}-photo${x}`)).find((f) => fs.existsSync(f))!;
  // Photo transparente (produit détouré) : posée sur un fond clair, comme une photo de fournisseur.
  const photo = photoFile.endsWith(".png") ? await sharp(photoFile).resize({ height: 1600, withoutEnlargement: true }).extend({ top: 120, bottom: 120, left: 400, right: 400, background: "#F3F1ED" }).flatten({ background: "#F3F1ED" }).jpeg({ quality: 92 }).toBuffer() : fs.readFileSync(photoFile);
  // Un abonnement = un projet : chaque démonstration reçoit son propre abonnement offert (forfait le plus complet).
  if (!process.env.PID) createSubscription(me.user.id, { plan: "dominer", status: "manual", source: "admin" });
  // Formulaire de création, comme dans le studio (plusieurs photos possibles ; services : prestations et coordonnées).
  const form = new FormData();
  form.append("photos", new Blob([photo], { type: "image/jpeg" }), path.basename(photoFile).replace(/\.png$/, ".jpg"));
  for (const f of p.photos ?? []) form.append("photos", new Blob([fs.readFileSync(f)], { type: "image/jpeg" }), path.basename(f));
  const fields: Record<string, string> = { productName: p.productName, brandName: p.brandName, price: p.price, description: p.description, mode: "autopilot", platform: p.platform ?? "shopify", storeType: p.storeType ?? "mono", businessType: p.business ?? "products", ...(EN ? { language: "en" } : {}) };
  if (p.business === "services") Object.assign(fields, { services: JSON.stringify(p.services ?? []), area: p.area ?? "", hours: p.hours ?? "", contactModes: p.contactModes ?? "form", contactMode: (p.contactModes ?? "form").split(",")[0] });
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  // PID=<id> : reprend un projet déjà créé (création longue avec l'IA) au lieu d'en refaire un (et de le repayer).
  let pid = process.env.PID ?? "";
  if (!pid) {
    const res = await ctx.request.post(`${BASE}/api/projects`, { multipart: form });
    const created = await res.json();
    if (!res.ok()) throw new Error(JSON.stringify(created));
    pid = created.id ?? created.project?.id;
  }
  const t0 = Date.now();
  let ov = await waitIdle(ctx, pid);
  console.log(`  pipeline ${Math.round((Date.now() - t0) / 1000)} s`, ov.pipeline?.job?.status);
  // Catalogue (niche, multi) : les autres produits, avec leur photo réelle.
  if (REDO && p.catalog?.length) {
    for (const c of p.catalog) {
      const buf = c.photo.endsWith(".png") ? await sharp(c.photo).resize({ height: 1600, withoutEnlargement: true }).extend({ top: 120, bottom: 120, left: 400, right: 400, background: "#F3F1ED" }).flatten({ background: "#F3F1ED" }).jpeg({ quality: 92 }).toBuffer() : fs.readFileSync(c.photo);
      const r = await ctx.request.post(`${BASE}/api/projects/${pid}/catalog`, { multipart: { name: c.name, category: c.category, price: c.price, description: c.description, features: (c.features ?? []).join("\n"), photo: { name: `${c.name}.jpg`, mimeType: "image/jpeg", buffer: buf } } });
      if (!r.ok()) throw new Error(await r.text());
    }
  }
  // Photos en situation (héros de la boutique).
  for (const file of REDO ? p.lifestyle ?? [] : []) {
    const r = await ctx.request.post(`${BASE}/api/projects/${pid}/files`, { multipart: { role: "lifestyle", files: { name: path.basename(file), mimeType: "image/jpeg", buffer: fs.readFileSync(file) } } });
    if (!r.ok()) throw new Error(await r.text());
  }
  // Vidéos refaites avec les photos en situation (elles ouvrent le montage).
  if (REDO && p.lifestyle?.length) {
    await api(ctx, `/api/projects/${pid}/videos`, { body: { format: "9:16", target: "ads", goal: EN ? "short ad for social media" : "publicité courte pour les réseaux sociaux" } });
    await api(ctx, `/api/projects/${pid}/videos`, { body: { format: "16:9", target: "shop", goal: EN ? "mood video for the store" : "vidéo d'ambiance pour la boutique", music: "none" } });
    await waitIdle(ctx, pid);
  }
  // Variante (coloris…) : valeurs du produit, puis photo de chaque valeur.
  if (REDO && p.variants) {
    await api(ctx, `/api/projects/${pid}/product`, { method: "PATCH", body: { variants: [{ name: p.variants.name, values: p.variants.values }] } });
    for (const [value, file] of Object.entries(p.variants.photos ?? {})) {
      const r = await ctx.request.post(`${BASE}/api/projects/${pid}/product/variant-photo`, { multipart: { value, photo: { name: path.basename(file), mimeType: "image/jpeg", buffer: fs.readFileSync(file) } } });
      if (!r.ok()) throw new Error(await r.text());
    }
  }
  // Chaque démonstration montre une direction différente.
  if (REDO) {
    await api(ctx, `/api/projects/${pid}/theme/build`, { body: { direction: p.direction } });
    ov = await waitIdle(ctx, pid);
  }
  // Comme un client dans l'onglet Images : deux photos du vrai produit en situation créées par l'IA (CLIENT_STEPS=1).
  if (REDO && process.env.CLIENT_STEPS && p.business !== "services") {
    for (const [k, topic] of (EN ? ["in everyday use", "close-up of the details, in its setting"] : ["en situation, au quotidien", "gros plan sur les détails, en situation"]).entries()) {
      await api(ctx, `/api/projects/${pid}/images`, { body: { mode: "single", kind: "scene", useAi: true, subline: topic, format: k ? "portrait" : "landscape" } }).catch((e) => console.log("  image :", String(e).slice(0, 160)));
      await waitIdle(ctx, pid);
    }
  }
  // Puis, comme un client dans l'onglet Publications : une semaine de publications, produite après les images.
  if (process.env.CLIENT_STEPS || !REDO) {
    const start = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const plan = await api(ctx, `/api/projects/${pid}/social/v2`, { body: { action: "plan", request: { startDate: start, days: 8, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] } } });
    await api(ctx, `/api/projects/${pid}/social/v2`, { body: { action: "produce", planId: plan.planId } });
  }
  firstProject ??= { pid };
  // Fiche produit réglée comme le ferait le marchand (nouvelle version du thème).
  if (REDO && p.pdp?.length) {
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
  // Visuel social : celui du jeu d'images, pas une publication du calendrier (déjà montrée dans le fil).
  const byRole = (r: string) => assets.filter((a) => a.role === r && !(r === "social" && a.meta?.socialV2)).sort((x, y) => (r === "scene" ? (x.createdAt ?? 0) - (y.createdAt ?? 0) : 0));
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
  // Publications du calendrier (moteur de publications : modèles à la marque), dans l'ordre du fil.
  // Les plus récentes (le dernier calendrier produit), remises dans l'ordre du fil.
  // Images du DERNIER calendrier seulement (dans l'ordre du fil) : jamais une image d'un calendrier précédent.
  const socialImgs = assets.filter((a) => a.role === "social" && a.meta?.socialV2);
  const lastPlan = db().prepare("SELECT media FROM posts WHERE project_id = ? AND plan_id = (SELECT plan_id FROM posts WHERE project_id = ? AND plan_id IS NOT NULL ORDER BY created_at DESC LIMIT 1) ORDER BY scheduled_at").all(pid, pid) as { media: string }[];
  const planIds = lastPlan.flatMap((r) => JSON.parse(r.media || "[]") as string[]);
  const fromPlan = planIds.map((id) => socialImgs.find((a) => a.id === id)).filter(Boolean) as typeof socialImgs;
  const postAssets = fromPlan.length ? fromPlan.slice(0, 8) : socialImgs.sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0)).slice(0, 8).reverse();
  const posts: string[] = [];
  for (const [i, a] of postAssets.entries()) {
    const file = X(`post-${i + 1}.jpg`);
    await saveImg(ctx, a.url, path.join(dir, file), 1080);
    posts.push(`/demo/${p.id}/${file}`);
  }
  // Planche d'identité de marque (logo, déclinaisons, palette, typographies, motif, papeterie, mises en situation).
  const boardAsset = byRole("brand-board").sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0))[0];
  if (boardAsset) await saveImg(ctx, boardAsset.url, path.join(dir, X("planche.jpg")), 2000);
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
  if (p.business !== "services") await shot(ctx, `/preview/${pid}/v/${vid}/products/${theme.current.product.handle}`, path.join(dir, X("fiche-produit.jpg")), { width: 1440, height: 900 });

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
    productPage: p.business === "services" ? "" : `/demo/${p.id}/${X("fiche-produit.jpg")}`,
    business: p.business ?? "products",
    images,
    video: vertical ? `/demo/${p.id}/${X("video.mp4")}` : "",
    videoPoster: poster ? `/demo/${p.id}/${X("video-poster.jpg")}` : "",
    shopVideo: wide ? `/demo/${p.id}/${X("video-boutique.mp4")}` : undefined,
    storeType: p.storeType ?? "mono",
    products: 1 + (p.catalog?.length ?? 0),
    source: p.source ?? null,
    posts,
    board: boardAsset ? `/demo/${p.id}/${X("planche.jpg")}` : "",
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
