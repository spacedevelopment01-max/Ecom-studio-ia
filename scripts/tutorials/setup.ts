/**
 * Compte et projets utilisés pour filmer les tutoriels du studio (serveur + worker lancés).
 *   npx tsx scripts/tutorials/setup.ts
 * Crée (ou réutilise) le compte « tutoriels@ecom-studio.local » et quatre projets terminés :
 * une boutique (drone Ostral) et un site de services (Studio Maëlle), en français et en anglais.
 * Les identifiants sont écrits dans data/tutorials-projects.json (lu par build-tutorials.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { request } from "playwright";

export const BASE = process.env.BASE ?? "http://localhost:3000";
export const EMAIL = process.env.TUTO_EMAIL ?? "tutoriels@ecom-studio.local";
export const PASSWORD = "tutoriels-studio-2026";
export const PROJECTS_FILE = path.join(process.cwd(), "data", "tutorials-projects.json");
const REAL = path.join(process.cwd(), "scripts", "demo-products", "inputs");

type Key = "products-fr" | "products-en" | "services-fr" | "services-en";

const SERVICES = {
  fr: {
    brandName: "Studio Maëlle",
    description: "Coach sportive diplômée à Nantes : coaching individuel à domicile ou en salle, cours collectifs en plein air au parc de Procé, programmes de remise en forme après une grossesse. Séance découverte offerte.",
    services: [{ name: "Coaching individuel", description: "Séance d'une heure adaptée à vos objectifs, à domicile ou en salle.", price: "55 €", duration: "1 h" }, { name: "Cours collectif en plein air", description: "Renforcement et cardio en petit groupe, au parc de Procé.", price: "15 €", duration: "1 h" }, { name: "Remise en forme post-grossesse", description: "Programme progressif de 8 semaines.", price: "", duration: "8 semaines" }],
    area: "Nantes et alentours", hours: "Lun–Sam 7 h–20 h",
  },
  en: {
    brandName: "Studio Maëlle",
    description: "Certified personal trainer in Nantes: one-to-one coaching at home or at the gym, outdoor group classes in Procé park, postnatal fitness programs. Free discovery session.",
    services: [{ name: "One-to-one coaching", description: "A one-hour session tailored to your goals, at home or at the gym.", price: "€55", duration: "1 hr" }, { name: "Outdoor group class", description: "Strength and cardio in a small group, in Procé park.", price: "€15", duration: "1 hr" }, { name: "Postnatal fitness", description: "A progressive 8-week program.", price: "", duration: "8 weeks" }],
    area: "Nantes and surrounding area", hours: "Mon–Sat 7am–8pm",
  },
};
const DRONE = {
  fr: { productName: "Drone pliable à caméra stabilisée", price: "189 €", description: "Drone pliable avec caméra stabilisée orientable. Selon la fiche du fournisseur : capteur 1 pouce, ouverture f/1.8, autonomie annoncée de 30 minutes, retour au point de départ par GPS, détection d'obstacles dans quatre directions, prise de vue verticale, radiocommande à écran pliable de 6,9 pouces." },
  en: { productName: "Foldable Drone with Stabilized Camera", price: "€189", description: "Foldable drone with an adjustable stabilized camera. According to the supplier's listing: 1-inch sensor, f/1.8 aperture, stated flight time of 30 minutes, GPS return to home, obstacle sensing in four directions, vertical shooting, remote controller with a 6.9-inch foldable screen." },
};

export async function login(lang: "fr" | "en") {
  const host = new URL(BASE).hostname;
  const ctx = await request.newContext({ baseURL: BASE, storageState: { cookies: [{ name: "ecs-lang", value: lang, domain: host, path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] } });
  let r = await ctx.post("/api/auth/login", { data: { email: EMAIL, password: PASSWORD } });
  if (!r.ok()) {
    r = await ctx.post("/api/auth/register", { data: { email: EMAIL, password: PASSWORD, name: lang === "en" ? "Tutorials" : "Tutoriels" } });
    if (!r.ok()) throw new Error(`inscription : ${await r.text()}`);
  }
  {
    // Plusieurs projets sur ce compte local : activation manuelle, comme pour les démonstrations.
    const { db } = await import("../../src/lib/db");
    const { syncAllowance, getSubscription } = await import("../../src/lib/billing");
    const me = await (await ctx.get("/api/me")).json();
    const uid = me.user?.id ?? me.id;
    if (!uid) throw new Error(`session absente : ${JSON.stringify(me).slice(0, 200)}`);
    getSubscription(uid);
    db().prepare("UPDATE subscriptions SET status = 'manual', stores = 20 WHERE user_id = ?").run(uid);
    syncAllowance(uid);
  }
  return ctx;
}

async function waitIdle(ctx: Awaited<ReturnType<typeof login>>, pid: string) {
  const t0 = Date.now();
  for (;;) {
    const r = await (await ctx.get(`/api/projects/${pid}`)).json();
    if (!r.active?.length) return r;
    if (Date.now() - t0 > 900_000) throw new Error("délai dépassé");
    await new Promise((res) => setTimeout(res, 2500));
  }
}

async function create(key: Key) {
  const [business, lang] = key.split("-") as ["products" | "services", "fr" | "en"];
  const ctx = await login(lang);
  let res;
  if (business === "products") {
    const d = DRONE[lang];
    const photo = path.join(REAL, "hightech", "drone-pliable.jpg");
    res = await ctx.post("/api/projects", { multipart: { photos: { name: "drone.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(photo) }, productName: d.productName, brandName: "Ostral", price: d.price, description: d.description, mode: "autopilot", platform: "shopify", storeType: "mono", language: lang } });
  } else {
    const s = SERVICES[lang];
    res = await ctx.post("/api/projects", { multipart: { businessType: "services", brandName: s.brandName, description: s.description, services: JSON.stringify(s.services), area: s.area, hours: s.hours, phone: "06 12 34 56 78", email: "bonjour@studio-maelle.fr", contactMode: "booking", bookingUrl: "https://calendly.com/studio-maelle", platform: "woocommerce", language: lang } });
  }
  const created = await res.json();
  if (!res.ok()) throw new Error(JSON.stringify(created));
  const pid = created.id ?? created.project?.id;
  if (business === "products") {
    const r = await ctx.post(`/api/projects/${pid}/files`, { multipart: { role: "lifestyle", files: { name: "drone-montagne.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(path.join(REAL, "situations", "drone-montagne.jpg")) } } });
    if (!r.ok()) throw new Error(await r.text());
  }
  const t0 = Date.now();
  await waitIdle(ctx, pid);
  console.log(`${key} : ${pid} (${Math.round((Date.now() - t0) / 1000)} s)`);
  await ctx.dispose();
  return pid as string;
}

export function readProjects(): Record<Key, string> {
  return fs.existsSync(PROJECTS_FILE) ? JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8")) : ({} as Record<Key, string>);
}

if (process.argv[1]?.endsWith("setup.ts")) {
  const out = readProjects();
  const keys = (process.env.ONLY?.split(",") as Key[]) ?? (["products-fr", "products-en", "services-fr", "services-en"] as Key[]);
  for (const k of keys) {
    if (out[k] && !process.env.ONLY) { console.log(`${k} : ${out[k]} (existant)`); continue; }
    out[k] = await create(k);
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(out, null, 2));
  }
}
