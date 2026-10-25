/**
 * Connecteurs de boutiques (mission #190, point 5) : même contrat pour Shopify, WooCommerce et PrestaShop. Le moteur de
 * synchronisation (`../sync.ts`) décide quoi envoyer ; un connecteur ne fait que traduire vers l'API de la plateforme.
 */
import net from "node:net";
import dns from "node:dns/promises";
import { isPrivate } from "../../engine/import-link";
import { L } from "../../i18n-server";

export type Platform = "shopify" | "woocommerce" | "prestashop";

/** Produit lu dans la boutique (forme commune). Stock null : non suivi par la boutique. */
export type RemoteVariant = { id: string; sku: string; options: string[]; price: number | null; stock: number | null };
export type RemoteProduct = {
  id: string; handle: string; title: string; description_html: string; status: string; price: number | null; compareAt: number | null;
  categories: string[]; tags: string[]; images: string[]; options: { name: string; values: string[] }[]; variants: RemoteVariant[];
  /** Produit sans option : sa variante unique (stock et référence portés par le produit chez WooCommerce et PrestaShop). */
  simple: boolean;
};

/** Photo à envoyer : contenu (envoi direct) et/ou adresse publique (plateformes qui téléchargent elles-mêmes). */
export type PushImage = { assetId: string; name: string; mime: string; alt: string; data: () => Buffer; url: string | null };
export type PushVariant = { localId: string; sku: string; options: string[]; price: number | null; compareAt: number | null; stock: number | null; stockPolicy: "deny" | "continue"; weightGrams: number | null; barcode: string; image: string | null };
/** Produit à envoyer. `stock` d'une variante : undefined = ne pas toucher au stock de la boutique (règle de synchronisation). */
export type PushProduct = {
  localId: string; handle: string; title: string; description_html: string; vendor: string; productType: string; status: "active" | "draft";
  price: number | null; compareAt: number | null; currency: string; categories: string[]; tags: string[]; options: { name: string; values: string[] }[];
  variants: (Omit<PushVariant, "stock"> & { stock: number | null | undefined; remoteId?: string })[];
  images: PushImage[] | null; seo: { title: string; description: string }; templateSuffix: string; weightGrams: number | null; barcode: string;
};
export type PushResult = { id: string; variants: { localId: string; id: string }[]; warnings: string[] };

export interface StoreConnector {
  platform: Platform;
  /** Identifiant stable de la boutique (domaine) : clé des correspondances. */
  store: string;
  list(): Promise<RemoteProduct[]>;
  get(id: string): Promise<RemoteProduct | null>;
  create(p: PushProduct): Promise<PushResult>;
  update(id: string, p: PushProduct): Promise<PushResult>;
  /** Lecture d'une photo de la boutique qui exige ses accès (PrestaShop) ; sinon lecture publique. */
  readImage?(url: string): Promise<{ data: Buffer; mime: string } | null>;
}

export class StoreApiError extends Error {
  constructor(public platform: Platform, public status: number, message: string) { super(message); }
}

const allowLocal = () => process.env.STORE_CONNECT_ALLOW_LOCAL === "1" && process.env.NODE_ENV !== "production";

/**
 * Adresse d'une boutique saisie par le client : HTTPS et hôte public exigés (anti-SSRF). Boutiques de test locales
 * acceptées seulement avec le drapeau explicite STORE_CONNECT_ALLOW_LOCAL=1, hors production.
 */
export async function assertStoreUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new Error(L("Adresse de boutique invalide.", "Invalid store address.")); }
  if (u.username || u.password) throw new Error(L("L'adresse ne doit pas contenir d'identifiants.", "The address must not contain credentials."));
  if (allowLocal() && /^https?:$/.test(u.protocol)) return u;
  if (u.protocol !== "https:") throw new Error(L("L'adresse de la boutique doit commencer par https://.", "The store address must start with https://."));
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivate)) throw new Error(L("Cette adresse ne pointe pas vers une boutique publique.", "This address does not point to a public store."));
  return u;
}

export const euros = (c: number | null | undefined) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));
export const toCents = (v: unknown): number | null => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : Math.round(n * 100);
};
export const stripTags = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
