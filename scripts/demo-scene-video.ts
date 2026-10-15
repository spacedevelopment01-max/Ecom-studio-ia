/**
 * Démonstrations de l'accueil : vidéo de 15 s en 3 scènes, montée par le MOTEUR VIDÉO DU STUDIO (three-scenes :
 * titres, carte de fin avec le vrai logo, musique composée par le studio), sur un projet de démonstration local.
 *
 *  1. prepare (gratuit) : crée ou retrouve le projet de la démo, écrit le plan des scènes et les spécifications des
 *     envois payants (images de départ Qwen, puis mouvement Wan 2.6) pour scripts/alibaba-qwen-essai.ts et
 *     scripts/alibaba-wan-essai.ts (un envoi par image ou plan, plafond) ;
 *       npx tsx scripts/demo-scene-video.ts prepare <id> <dossier>
 *  2. assemble (gratuit) : montage par runThreeScenes avec les images et plans déjà payés (aucun nouvel envoi) ;
 *     service : plans libres de droits du métier (Pixabay) ;
 *       npx tsx scripts/demo-scene-video.ts assemble <id> <dossier> <sortie.mp4>
 */
import fs from "node:fs";
import path from "node:path";
import { all, id, now, one, run } from "@/lib/db";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { saveAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { directionById } from "@/lib/theme/directions";
import { keyframePrompt, motionPrompt, runThreeScenes, realThreeScenesDeps, type ScenePlan } from "@/lib/video-v2/three-scenes";

type Def = { brand: string; product: string; /** Métier ou catégorie (recherche des plans libres de droits). */ category?: string; summary: string; business: "products" | "services"; direction: string; palette: string[]; services?: { name: string; description: string }[]; plan: ScenePlan };
const DEMOS: Record<string, Def> = {
  gourde: {
    brand: "Cime", product: "Gourde isotherme 750 ml", business: "products", direction: "elan", palette: ["#1E2326", "#9AA5AA", "#FF4D00", "#F4F6F6", "#0E1214"],
    summary: "Gourde isotherme double paroi en inox, 750 ml, finition mate vert sauge, bouchon en bambou à anse inox.",
    plan: {
      scenes: [
        // Images faites par l'IA (Qwen) ; mouvement de caméra et lumière ajoutés au montage (aucune animation IA qui déforme le décor).
        { still: "extreme close-up of the top of the plain sage-green bottle: bamboo lid, brushed steel collar and handle, tiny condensation droplets, blurred mountain ridge in early morning light", motion: "very slow push-in, a soft band of light glides across the steel and the bamboo lid", title: "Gourde isotherme 750 ml", place: "lower", titleSize: "large", titleStyle: "shadow" },
        { still: "low-angle shot of the plain sage-green bottle on a dark granite boulder, pale sky and a sharp summit behind, the sun hidden behind the bottle", motion: "the camera rises very slowly while the sun's glow grows around the top of the bottle", title: "Partez léger.", place: "lower", titleSize: "large", titleStyle: "shadow" },
        { still: "mountain bivouac at dusk: the plain sage-green bottle on a flat rock next to a plain olive backpack and a folded wool blanket, a glowing tent behind, warm golden low sunlight", motion: "very slow push-in while the warm golden light intensifies and a soft glint passes over the steel", title: "Voyez grand.", titleSize: "large", titleStyle: "shadow" },
      ],
      line: "Partez léger. Voyez grand.",
      cta: "Découvrir",
      endCard: "large",
    },
  },
  tribunes: {
    brand: "Les Tribunes", product: "T-shirt supporter Lavande", business: "products", direction: "flux", palette: ["#0D0D0D", "#C4C4C4", "#E10600", "#FAFAFA", "#050505"],
    summary: "T-shirt de supporter bleu marine, inscription FRANCE et numéro 10, brins de lavande brodés en ton sur ton, liserés bleu-blanc-rouge, drapeau sur la poitrine.",
    plan: {
      scenes: [
        { still: "the T-shirt laid flat on a blue seat of an empty stadium stand at night, powerful floodlights, light haze over the glowing pitch", motion: "the camera slowly moves in, the floodlights flicker softly through the haze", title: "T-shirt supporter Lavande" },
        { still: "the T-shirt hanging on a wooden hanger in a vintage locker room with painted wooden benches, a single dramatic spotlight from above", motion: "slow glide across the fabric, the spotlight gently sweeps, dust motes float in the light", title: "Vibrez ensemble." },
        { still: "the T-shirt neatly folded on a rustic oak table in Provence with fresh lavender sprigs, lavender fields blurred through the window at golden hour", motion: "majestic slow push-in, lavender sprigs sway slightly in a light breeze, warm sunlight grows", title: "Les couleurs du cœur." },
      ],
      line: "Les couleurs du cœur, en tribune.",
      cta: "Commander",
    },
  },
  fleuriste: {
    brand: "Atelier Pivoine", product: "Atelier floral", category: "Fleuriste", business: "services", direction: "magazine", palette: ["#A3122B", "#F0E7DB", "#E0A100", "#FBF8F3", "#1B1717"],
    summary: "Fleuriste artisan : bouquets du jour, compositions sur mesure pour mariages et événements, abonnements floraux pour les entreprises, livraison en ville.",
    services: [
      { name: "Bouquets du jour", description: "Fleurs de saison composées à la boutique, à emporter ou livrées." },
      { name: "Mariages et événements", description: "Bouquet de mariée, décoration de table et de salle, sur rendez-vous." },
      { name: "Abonnement entreprise", description: "Une composition renouvelée chaque semaine pour votre accueil." },
    ],
    plan: {
      scenes: [
        { still: "florist shop bouquet flowers", motion: "", title: "Bouquets du jour" },
        { still: "florist arranging flowers workshop", motion: "", title: "Mariages et événements" },
        { still: "flower shop roses peonies", motion: "", title: "Atelier floral" },
      ],
      line: "Des fleurs qui racontent.",
      cta: "Demander un devis",
    },
  },
};

const [cmd, demoId, dir, outFile] = process.argv.slice(2);
const d = DEMOS[demoId];
if (!d) throw new Error(`démo inconnue : ${demoId}`);
const LOGO = path.join(process.cwd(), "public", "demo", demoId, "logo.png");

/** Projet de démonstration local (retrouvé s'il existe déjà) : marque, palette, polices de la direction, vrai logo. */
async function demoProject(): Promise<string> {
  const name = `DEMO ${d.brand}`;
  const found = one<{ id: string }>("SELECT id FROM projects WHERE name = ? ORDER BY created_at DESC LIMIT 1", name);
  if (found) {
    run("UPDATE projects SET product_json = json_set(product_json, '$.category', ?) WHERE id = ?", d.category ?? d.product, found.id);
    return found.id;
  }
  let user = one<{ id: string }>("SELECT id FROM users WHERE email = ?", "demo-videos@studio.local");
  if (!user) {
    const { createUser } = await import("@/lib/auth");
    user = await createUser("demo-videos@studio.local", `demo-${id()}`, "Démonstrations");
  }
  const product = { ...emptyProduct(), name: d.product, nameStatus: "provided", category: d.category ?? d.product, summary: d.summary };
  const services = d.services ? { services: d.services } : null;
  const { brand, strategy } = localBrand(product as never, d.brand, { business: d.business, services } as never);
  const [primary, secondary, accent, light, dark] = d.palette;
  const fonts = directionById(d.direction as never).previewFonts;
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, user.id, name, "ready", d.business === "services" ? "woocommerce" : "shopify", JSON.stringify(product), JSON.stringify({ ...brand, name: d.brand, palette: { primary, secondary, accent, light, dark }, fonts, tagline: d.plan.line }), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", d.business, JSON.stringify(services ?? {}), now(), now(),
  );
  const logo = await saveAsset({ projectId: pid, userId: user.id, data: fs.readFileSync(LOGO), name: "logo.png", mime: "image/png", role: "logo", folderKey: "brand.logos", origin: "import", status: "approved", meta: {} });
  run("UPDATE projects SET brand_json = json_set(brand_json, '$.logo', json(?)) WHERE id = ?", JSON.stringify({ assetId: logo.id }), pid);
  const ref = path.join(dir, "..", "ref", `${demoId}-produit.png`);
  if (d.business === "products" && fs.existsSync(ref)) await saveAsset({ projectId: pid, userId: user.id, data: fs.readFileSync(ref), name: "produit.png", mime: "image/png", role: "cutout", folderKey: "product.cutouts", origin: "import", status: "approved", meta: { best: true } });
  return pid;
}

const pid = await demoProject();
const p = loadProject(pid);
fs.mkdirSync(dir, { recursive: true });
if (cmd === "prepare") {
  if (d.business === "services") {
    console.log(`${demoId} : service, plans libres de droits — rien à payer, passez à « assemble ».`);
  } else {
    const ref = path.join(dir, "..", "ref", `${demoId}-produit.png`);
    const frames = { model: "qwen-image-3.0-pro", items: d.plan.scenes.map((s, k) => ({ id: `scene-${k + 1}`, aspect: "9:16", prompt: keyframePrompt(p, null, s, "9:16", true), reference: ref })) };
    fs.writeFileSync(path.join(dir, "images.json"), JSON.stringify(frames, null, 2));
    const clips = { model: "wan2.6-i2v-flash", resolution: "1080P", usdPerSecond: 0.0375, parameters: { audio: false, shot_type: "single" }, items: d.plan.scenes.map((s, k) => ({ id: `scene-${k + 1}`, image: path.join(dir, "images", `scene-${k + 1}.png`), seconds: 5, prompt: motionPrompt(s) })) };
    fs.writeFileSync(path.join(dir, "clips.json"), JSON.stringify(clips, null, 2));
    console.log(`${demoId} : projet ${pid}, spécifications écrites (3 images, 3 plans de 5 s).`);
  }
} else if (cmd === "assemble") {
  const real = realThreeScenesDeps(null, { userId: p.userId, projectId: pid }, { aiText: false });
  const ai = d.business === "products";
  let rendered: string | null = null;
  const r = await runThreeScenes(null, pid, { as: "post", aspect: "9:16", scenes: 3, totalS: 15, mode: ai ? "ai" : "stock", key: `demo:${demoId}:${Date.now()}` }, {
    ...real,
    writePlan: async () => d.plan,
    // Images et plans déjà payés (scripts d'essai plafonnés) : relus, jamais redemandés.
    keyframe: async (_prompt, _aspect, _ref, key) => fs.readFileSync(path.join(dir, "images", `scene-${Number(key.split(":").pop()) + 1}.png`)),
    clip: async (_img, _prompt, _aspect, _s, key) => fs.readFileSync(path.join(dir, "clips", `scene-${Number(key.split(":").pop()) + 1}.mp4`)),
    render: async (pp, docKey, doc, meta) => (rendered = await real.render(pp, docKey, doc, meta)),
    // Service : plans libres de droits CHOISIS et regardés (dossier stock/, sources.json : page, auteur, licence) ;
    // sinon la recherche automatique du studio.
    ...(fs.existsSync(path.join(dir, "stock"))
      ? {
          stock: async (pp: { id: string; userId: string }, k: number) => {
            const src = (JSON.parse(fs.readFileSync(path.join(dir, "stock", "sources.json"), "utf8")) as { scene: number; id: number; page: string; user: string; d: number }[])[k];
            const a = await saveAsset({ projectId: pp.id, userId: pp.userId, data: fs.readFileSync(path.join(dir, "stock", `scene-${k + 1}.mp4`)), name: `plan-libre-${k + 1}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: { stock: { source: "pixabay", id: String(src.id), page: src.page, author: src.user, license: "pixabay" } } });
            return { assetId: a.id, durationS: src.d };
          },
        }
      : {}),
  });
  const a = one<{ storage_key: string }>("SELECT storage_key FROM assets WHERE id = ?", r.videoAssetId ?? rendered ?? "");
  const { storagePath } = await import("@/lib/storage");
  fs.copyFileSync(storagePath(a!.storage_key), outFile);
  console.log(`${demoId} : vidéo montée par le studio → ${outFile} (${r.mode}, ${r.notes.join(" ; ") || "aucune remarque"})`);
  void all;
}
