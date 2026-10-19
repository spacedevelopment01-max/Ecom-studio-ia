/** Jeu inédit du lot 1 : données synthétiques, indépendant des démonstrations publiques. */
import { id, now, run } from "@/lib/db";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { localBrand } from "@/lib/engine/local";
export const HOLDOUTS = [
  { key: "laboratoire", business: "products", name: "Cartouche de filtration", category: "Consommables de laboratoire", sector: "autre", summary: "Cartouche en cellulose pour filtration en laboratoire.", conversion: "sale", offer: "Cartouche de filtration", detail: "Membrane en cellulose, diamètre confirmé de 47 mm." },
  { key: "jardinage", business: "products", name: "Semences de pois", category: "Semences potagères", sector: "autre", summary: "Sachet de semences pour jardin potager.", conversion: "sale", offer: "Sachet de semences", detail: "Variété et conseils de semis indiqués sur le sachet." },
  { key: "piano", business: "services", name: "Atelier musical", category: "Accord de piano", sector: "artisanat", summary: "Accord et diagnostic de pianos sur devis.", conversion: "quote", offer: "Diagnostic du piano", detail: "État de l'instrument et intervention proposés après échange." },
  { key: "voix", business: "services", name: "Cours de voix", category: "Formation à distance", sector: "autre", summary: "Séances de travail de la voix à distance sur rendez-vous.", conversion: "booking", offer: "Séance de voix", detail: "Objectifs de séance convenus avec la personne avant le rendez-vous." },
] as const;
export function seedHoldout(userId: string, index: number, namePrefix = "Validation indépendante") {
  const c = HOLDOUTS[index];
  const product = { ...emptyProduct(), name: c.name, category: c.category, sector: c.sector, summary: c.summary } as ReturnType<typeof emptyProduct>;
  if (index === 0) product.facts = [{ key: "material", label: "Matière", value: "cellulose", status: "confirmed", source: "user" }, { key: "diameter", label: "Diamètre", value: "47 mm", status: "confirmed", source: "user" }];
  const services = { ...emptyServiceProfile(), area: "Lyon", email: "contact@example.invalid", contactMode: c.conversion === "booking" ? "booking" as const : "quote" as const, bookingUrl: c.conversion === "booking" ? "https://example.invalid/reservation" : "", services: [{ key: "offer-one", name: c.offer, description: c.detail }] };
  const { brand, strategy } = localBrand(product, `${namePrefix} ${index}`, { business: c.business, services });
  const pid = id();
  run("INSERT INTO projects (id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", pid, userId, `${namePrefix} ${index}`, "draft", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", c.business, JSON.stringify(services), now(), now());
  return pid;
}
