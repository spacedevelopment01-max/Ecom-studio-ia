/** Démarrage de la création d'un projet : enregistrement des entrées (photos, lien, description) puis lancement du pilote. */
import { z } from "zod";
import { HttpError } from "./auth";
import { json, now, one, run } from "./db";
import { enqueue } from "./jobs";
import { saveAsset } from "./library";
import { setStatus } from "./projects";
import { emptyServiceProfile, type ServiceItem, type ServiceProfile } from "./project-types";
import { L } from "./i18n-server";

export const MAX_FILE = 25 * 1024 * 1024;

export const StartInput = z.object({
  link: z.string().url({ error: () => L("Lien invalide.", "Invalid link.") }).optional().or(z.literal("")),
  description: z.string().max(8000).optional(),
  productName: z.string().max(120).optional(),
  brandName: z.string().max(80).optional(),
  price: z.string().max(40).optional(),
  platform: z.enum(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]).default("shopify"),
  mode: z.enum(["autopilot", "guided"]).default("autopilot"),
  storeType: z.enum(["mono", "multi", "niche"]).default("mono"),
  /** Langue des contenus du projet (par défaut : celle de l'interface). */
  language: z.enum(["fr", "en"]).optional(),
  /** Boutique de produits ou site d'entreprise de services. */
  businessType: z.enum(["products", "services"]).default("products"),
  /** Services : prestations (JSON d'une liste {name, description, price?, duration?}) et coordonnées. */
  services: z.string().max(30000).optional(),
  area: z.string().max(300).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  hours: z.string().max(400).optional(),
  bookingUrl: z.string().max(500).optional(),
  contactMode: z.enum(["booking", "quote", "call", "form"]).optional(),
});
export type StartInput = z.infer<typeof StartInput>;

export function readStartForm(form: FormData) {
  const input = StartInput.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const logo = form.get("logo");
  return { input, files, logo: logo && typeof logo !== "string" && logo.size > 0 ? logo : null };
}

export const hasProductInput = (input: StartInput, files: File[]) =>
  // Services : la description de l'activité (ou le site existant) est indispensable ; les photos seules ne suffisent pas.
  (input.businessType !== "services" && files.length > 0) || !!input.link || !!(input.description && input.description.trim().length > 10);

const ServiceItemInput = z.object({ name: z.string().max(160), description: z.string().max(1000).default(""), price: z.string().max(60).optional(), duration: z.string().max(60).optional() });

/** Offre de services saisie au départ (seulement ce que le client a écrit ; rien n'est complété ici). */
export function serviceProfileFromInput(input: StartInput): ServiceProfile {
  let services: ServiceItem[] = [];
  if (input.services) {
    try {
      services = z.array(ServiceItemInput).max(40).parse(JSON.parse(input.services))
        .map((x) => ({ name: x.name.trim(), description: x.description.trim(), ...(x.price?.trim() ? { price: x.price.trim() } : {}), ...(x.duration?.trim() ? { duration: x.duration.trim() } : {}) }))
        .filter((x) => x.name);
    } catch {
      throw new HttpError(400, L("Liste des prestations illisible.", "Unreadable list of services."));
    }
  }
  const email = (input.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, L("Adresse e-mail invalide.", "Invalid email address."));
  const bookingUrl = (input.bookingUrl ?? "").trim();
  if (bookingUrl && !/^https?:\/\/\S+$/i.test(bookingUrl)) throw new HttpError(400, L("Lien de prise de rendez-vous invalide (il doit commencer par https://).", "Invalid booking link (it must start with https://)."));
  return {
    ...emptyServiceProfile(),
    services,
    area: (input.area ?? "").trim(),
    address: (input.address ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    email,
    hours: (input.hours ?? "").trim(),
    bookingUrl,
    contactMode: input.contactMode ?? (bookingUrl ? "booking" : "form"),
  };
}

/** Enregistre les photos et le logo fournis. */
export async function saveStartFiles(projectId: string, userId: string, files: File[], logo: File | null, business: "products" | "services" = "products") {
  for (const [i, f] of files.slice(0, 8).entries()) {
    if (f.size > MAX_FILE) throw new HttpError(413, L(`La photo « ${f.name} » dépasse 25 Mo.`, `The photo "${f.name}" exceeds 25 MB.`));
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(f.type)) throw new HttpError(415, L(`Format non pris en charge pour « ${f.name} » (JPEG, PNG, WebP, AVIF).`, `Unsupported format for "${f.name}" (JPEG, PNG, WebP, AVIF).`));
    // Services : photos de l'activité (réalisations, équipe, lieu), utilisées telles quelles — jamais détourées.
    if (business === "services") await saveAsset({ projectId, userId, data: Buffer.from(await f.arrayBuffer()), name: f.name || `photo-${i + 1}.jpg`, mime: f.type, role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: { uploadedAt: now(), activityPhoto: true } });
    else await saveAsset({ projectId, userId, data: Buffer.from(await f.arrayBuffer()), name: f.name || `photo-${i + 1}.jpg`, mime: f.type, role: "original", folderKey: "product.originals", origin: "upload", meta: { uploadedAt: now() } });
  }
  if (logo) {
    await saveAsset({ projectId, userId, data: Buffer.from(await logo.arrayBuffer()), name: logo.name || "logo.png", mime: logo.type, kind: "image", role: "logo", folderKey: "brand.logos", origin: "upload", meta: { provided: true } });
  }
}

/** Lance le pilote complet sur un projet (photos déjà enregistrées comme originaux). */
export function launchPipeline(projectId: string, userId: string, input: StartInput, photoCount: number) {
  const prev = json<{ type: string; ref: string }[]>(one<{ sources_json: string }>("SELECT sources_json FROM projects WHERE id = ?", projectId)?.sources_json, []);
  const sources = [...prev, ...(photoCount ? [{ type: "photo", ref: `${photoCount} photo(s)` }] : []), ...(input.link ? [{ type: "link", ref: input.link }] : []), ...(input.description ? [{ type: "description", ref: L("description du client", "customer description") }] : [])];
  run("UPDATE projects SET sources_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(sources), now(), projectId);
  if (input.productName || input.brandName) run("UPDATE projects SET name = ? WHERE id = ?", input.productName || input.brandName, projectId);
  setStatus(projectId, "queued");
  return enqueue({ userId, projectId, type: "pipeline.run", label: L("Création du projet", "Creating the project"), payload: { projectId, mode: input.mode, input: { link: input.link || undefined, description: input.description, productName: input.productName, brandName: input.brandName, price: input.price, businessType: input.businessType } }, maxAttempts: 2 });
}
