/** Démarrage de la création d'un projet : enregistrement des entrées (photos, lien, description) puis lancement du pilote. */
import { z } from "zod";
import { HttpError } from "./auth";
import { json, now, one, run } from "./db";
import { enqueue } from "./jobs";
import { requestReplacesCalendar } from "./workflow";
import { saveAsset } from "./library";
import { setStatus } from "./projects";
import { contactModesOf, emptyServiceProfile, type ContactMode, type ServiceItem, type ServiceProfile } from "./project-types";
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
  /** Toutes les façons de contacter, séparées par des virgules (« quote,call »). */
  contactModes: z.string().max(60).optional(),
  /** Vidéos de la création complète : avec plans filmés par l'IA (gourmand), montées à partir des images, ou aucune. */
  videos: z.enum(["ai", "edited", "none"]).default("ai"),
  /** « J'ai déjà mon site et mon logo » : le studio lit le site du client (plateforme et type d'activité détectés). */
  existingSite: z.enum(["1", "true", "0", "false", ""]).optional().transform((v) => v === "1" || v === "true"),
  siteUrl: z.string().max(500).optional(),
  /** Le client confirme que le site lui appartient ou qu'il est autorisé à l'utiliser. */
  siteOwnership: z.string().max(10).optional(),
  /** Demande globale du client (Studio Workflow V2) : « Crée ma marque, ma boutique… et mes publications ». */
  request: z.string().max(4000).optional(),
});
export type StartInput = z.infer<typeof StartInput>;

export function readStartForm(form: FormData) {
  const input = StartInput.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const logo = form.get("logo");
  return { input, files, logo: logo && typeof logo !== "string" && logo.size > 0 ? logo : null };
}

/**
 * Site existant : adresse normalisée (https:// ajouté si absent), et accord du client obligatoire.
 * La lecture réseau elle-même passe ensuite par safeFetch (anti-SSRF) dans le pilote.
 */
export function existingSiteFromInput(input: StartInput): { url: string } | null {
  if (!input.existingSite) return null;
  const raw = (input.siteUrl ?? "").trim();
  if (!raw) throw new HttpError(400, L("Indiquez l'adresse de votre site.", "Enter your website address."));
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new HttpError(400, L("Adresse du site invalide.", "Invalid website address."));
  }
  if (!/^https?:$/.test(url.protocol) || (!url.hostname.includes(".") && url.hostname !== "localhost")) throw new HttpError(400, L("Adresse du site invalide (elle doit commencer par https://).", "Invalid website address (it must start with https://)."));
  if (!input.siteOwnership || !["1", "true", "on", "yes"].includes(input.siteOwnership)) throw new HttpError(400, L("Confirmez que ce site vous appartient ou que vous êtes autorisé à l'utiliser.", "Confirm that this website belongs to you or that you are authorized to use it."));
  return { url: url.toString() };
}

export const hasProductInput = (input: StartInput, files: File[]) =>
  !!input.existingSite ||
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
    contactModes: contactModesOf({ contactMode: input.contactMode ?? (bookingUrl ? "booking" : "form"), contactModes: (input.contactModes ?? "").split(",").map((m) => m.trim()) as ContactMode[] }),
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
  const site = input.existingSite && input.siteUrl ? existingSiteFromInput(input) : null;
  const sources = [...prev, ...(site ? [{ type: "link", ref: site.url, note: L("votre site actuel", "your current website") }] : []), ...(photoCount ? [{ type: "photo", ref: `${photoCount} photo(s)` }] : []), ...(input.link ? [{ type: "link", ref: input.link }] : []), ...(input.description ? [{ type: "description", ref: L("description du client", "customer description") }] : [])];
  run("UPDATE projects SET sources_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(sources), now(), projectId);
  if (input.productName || input.brandName) run("UPDATE projects SET name = ? WHERE id = ?", input.productName || input.brandName, projectId);
  setStatus(projectId, "queued");
  // Publications demandées dans la demande globale : faites par Social V2 juste après (pas de calendrier en double).
  const skip = input.request && requestReplacesCalendar(input.request) ? ["calendar"] : undefined;
  return enqueue({ userId, projectId, type: "pipeline.run", label: L("Création du projet", "Creating the project"), payload: { projectId, mode: input.mode, initial: true, skip, input: { link: site ? undefined : input.link || undefined, description: input.description, productName: input.productName, brandName: input.brandName, price: input.price, businessType: input.businessType, videos: input.videos, ...(site ? { existingSite: true, siteUrl: site.url } : {}) } }, maxAttempts: 2 });
}
