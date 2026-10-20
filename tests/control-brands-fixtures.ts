/** Marques de contrôle (fictives, sans aucun mot des démonstrations) et leurs projets neufs, composés dans le thème de
 * leur famille (issue #145) : tests d'identité automatique et galerie de contrôle des projets neufs. */
import sharp from "sharp";
import { id as newId, now, run } from "../src/lib/db";
import { emptyProduct, emptyServiceProfile } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveServices, saveSettings, saveStrategy, saveThemeVersion } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import {grantProjectPlan} from "../src/lib/project-subscriptions";
import type { FamilyId } from "../src/lib/theme/section-families";
import type { DirectionId } from "../src/lib/theme/directions";

export type Brand = { name: string; product: string; summary: string; tagline: string; palette: [string, string, string, string, string]; phone: string; email: string; area: string; services?: { key: string; name: string; description: string }[] };
/** Marques de contrôle : fictives, sans aucun mot des démonstrations. */
export const CONTROL_BRANDS: Record<FamilyId, { theme: DirectionId; business: "products" | "services"; brands: [Brand, Brand] }> = {
  specialty: { theme: "fraise", business: "products", brands: [
    { name: "Miellerie Sorel", product: "Miel de lavande", summary: "Miel de lavande récolté en Drôme provençale.", tagline: "Le miel des plateaux.", palette: ["#7A4E12", "#F4E6C8", "#C9831F", "#FBF6EC", "#2B1D08"], phone: "04 75 00 00 01", email: "contact@sorel.example", area: "Drôme" },
    { name: "Thé Kōri", product: "Infusion menthe-verveine", summary: "Infusion de menthe et de verveine en vrac.", tagline: "Infusions du soir.", palette: ["#1F4D3A", "#E3EFE6", "#4E9C6E", "#F6FAF7", "#0E241B"], phone: "01 40 00 00 02", email: "bonjour@kori.example", area: "Paris" },
  ] },
  catalog: { theme: "orbe", business: "products", brands: [
    { name: "Maison Ardoise", product: "Vase en grès", summary: "Vase en grès émaillé façonné à la main.", tagline: "Objets en grès.", palette: ["#3B4048", "#E9E6E1", "#A2643B", "#F7F5F2", "#1A1C20"], phone: "02 99 00 00 03", email: "atelier@ardoise.example", area: "Rennes" },
    { name: "Velours & Fil", product: "Coussin en velours côtelé", summary: "Coussin en velours côtelé de coton.", tagline: "Textiles de maison.", palette: ["#5C2A3E", "#F2E4E8", "#B5577A", "#FBF5F7", "#26111A"], phone: "03 20 00 00 04", email: "service@velours.example", area: "Lille" },
  ] },
  services: { theme: "rive", business: "services", brands: [
    { name: "Plomberie Navarre", product: "Dépannage de plomberie", summary: "Dépannage et rénovation de salles d'eau.", tagline: "Plombier à Pau.", palette: ["#1D3D5C", "#E4ECF3", "#2F7DBF", "#F5F8FB", "#0D1B29"], phone: "05 59 00 00 05", email: "contact@navarre.example", area: "Pau et alentours", services: [{ key: "depannage", name: "Dépannage de fuite", description: "Recherche et réparation de fuite." }, { key: "renovation", name: "Rénovation de salle d'eau", description: "Dépose, pose et raccordements." }] },
    { name: "Paysages Aubier", product: "Création de jardins", summary: "Conception et entretien de jardins.", tagline: "Jardins vivants.", palette: ["#3E5A1E", "#EEF2E4", "#7FA33A", "#F8FAF3", "#1A2610"], phone: "02 41 00 00 06", email: "jardins@aubier.example", area: "Angers", services: [{ key: "conception", name: "Conception de jardin", description: "Plan, choix des plantes, chiffrage." }, { key: "entretien", name: "Entretien annuel", description: "Taille, tonte, désherbage." }] },
  ] },
};
export const DEMO_WORDS = [/\bFRAISE\b/, /\bFraise\b/, /\bONDE\b/, /\bOnde\b/, /\bORBE\b/, /\bOrbe\b/, /Atelier Rive/, /[Gg]ummies/, /Lumora|Pawish/, /\bExemple\b/, /casque/i, /lampe nomade/i];

/** Projet neuf d'une marque de contrôle, composé dans le thème de sa famille, avec trois photos à lui (unies). */
export async function controlProject(userId: string, family: FamilyId, b: Brand) {
  const f = CONTROL_BRANDS[family], services = f.business === "services";
  const product = { ...emptyProduct(), name: b.product, nameStatus: "provided" as const, category: b.product, summary: b.summary };
  const sp = services ? { ...emptyServiceProfile(), area: b.area, phone: b.phone, email: b.email, contactMode: "quote" as const, services: b.services ?? [] } : undefined;
  const local = localBrand(product, b.name, { business: f.business, services: sp as never });
  const pid = newId();
  run("INSERT INTO projects (id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", pid, userId, b.name, "draft", "shopify", "{}", "{}", "{}", "{}", "[]", f.business, "{}", now(), now());
  saveProduct(pid, product);
  const [primary, secondary, accent, light, dark] = b.palette;
  saveBrand(pid, { ...local.brand, name: b.name, generatedBy: "local" as const, tagline: b.tagline, story: b.summary, palette: { primary, secondary, accent, light, dark }, direction: f.theme });
  saveStrategy(pid, local.strategy);
  if (sp) saveServices(pid, sp as never);
  run("UPDATE projects SET store_type = ?, business_type = ? WHERE id = ?", "mono", f.business, pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: family });
  for (const [i, role] of (services ? ["lifestyle", "lifestyle", "lifestyle"] : ["packshot", "lifestyle", "scene"]).entries()) {
    const data = await sharp({ create: { width: 1200, height: 900, channels: 3, background: b.palette[i] } }).jpeg().toBuffer();
    await saveAsset({ projectId: pid, userId, data, mime: "image/jpeg", name: `${b.name.toLowerCase().replace(/[^a-z]+/g, "-")}-${i + 1}.jpg`, origin: "upload", role, status: "approved", meta: { width: 1200, height: 900 } });
  }
  const built = await composeShop(pid, f.theme, null, false);
  saveThemeVersion(pid, built.spec, "Composition", "user");
  grantProjectPlan(pid,"dominer"); // Full-library identity fixture; no permission bypass in the routes.
  return pid;
}

