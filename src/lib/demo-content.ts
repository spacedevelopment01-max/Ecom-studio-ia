/**
 * Démonstrations publiques (public/demo) : marques créées par le studio à partir de produits de fournisseurs.
 * Partagées par la page d'accueil et le studio Découverte (aucun appel IA : fichiers déjà présents).
 */
import fs from "node:fs";
import path from "node:path";
import type { Lang } from "./i18n";
import type { Demo } from "@/components/landing-client";

/** Démonstrations : manifest.json (français) ou manifest.en.json (projets créés en anglais, fichiers « .en » à côté des français). */
export function demos(file: "manifest.json" | "manifest.en.json" = "manifest.json"): Demo[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", file), "utf8")).demos;
  } catch {
    return [];
  }
}

/** Repli si public/demo/manifest.en.json n'est pas généré : textes des démonstrations françaises traduits pour l'interface anglaise. */
const DEMO_EN: Record<string, { product?: string; note?: string }> = {
  casque: { product: "Headphones", note: "Real in-context photos of unbranded headphones (Pixabay, Engin_Akyurt series): the brand, the visuals and the store are created by the studio." },
  tillandsia: { product: "Potted air plant", note: "Real photos of a potted plant (Pixabay, HeungSoon series): the brand, the visuals and the store are created by the studio." },
  savon: { product: "Perilla soap", note: "Real photos of a handmade perilla soap (Pixabay, phuonghoangthuy series): the brand, the visuals and the store are created by the studio." },
  cafe: { product: "Coffee beans", note: "Real photos of coffee beans (Pixabay, Bru-nO series): the brand, the visuals and the store are created by the studio." },
  fleuriste: { product: "Floral studio", note: "Real photos of a florist's shop and workshop (Pixabay): the business is fictional, its website and brand are created by the studio." },
  tribunes: { product: "Lavender supporter T-shirt", note: "Two supporter T-shirts from a supplier (supplier visuals) and two accessories whose photo was created by AI: the brand and the store are created by the studio. No official crest." },
  gourde: { product: "Insulated bottle 750 ml", note: "Product and original photo created by AI (OpenAI) for the demo: the brand, the visuals and the store are created by the studio. No technical specification is claimed unless provided." },
  paysagiste: { product: "Garden design and maintenance", note: "Fictional business: the garden photos were created by AI (OpenAI) for the demo; the website and brand are created by the studio." },
  montre: { product: "Steel and leather watch", note: "Photo of an unbranded watch (Pixabay), strap completed by AI (the lower part was in shadow): the ARVEN brand, its visuals and its store are created by the studio. Price and technical specifications not stated: to be completed by the merchant." },
  barbier: { product: "Barber shop", note: "Real photos of a barber shop (Pixabay): the business is fictional, its website and brand are created by the studio." },
};
const SECTOR_EN: Record<string, string> = { "Épicerie fine": "Fine food", Accessoires: "Accessories", Plantes: "Plants", Fleuriste: "Florist", Barbier: "Barber", Boissons: "Beverages", Maison: "Home", "High-tech": "Tech", Animaux: "Pets", Mode: "Fashion", "Sport et plein air": "Sports & outdoors", Paysagiste: "Landscaper", Beauté: "Beauty", Sport: "Sports", Alimentation: "Food", Bijoux: "Jewelry", Enfants: "Kids", Horlogerie: "Watches" };
const IMAGE_LABEL_EN: Record<string, string> = { Bannière: "Banner", Détail: "Detail", Détourage: "Cutout", Packshot: "Packshot", Publicité: "Ad", Scène: "Scene", "Visuel social": "Social visual", "En situation": "Lifestyle" };

export function localizeDemo(d: Demo, lang: Lang): Demo {
  if (lang !== "en") return d;
  const en = DEMO_EN[d.id] ?? {};
  return {
    ...d,
    product: en.product ?? d.product,
    sector: SECTOR_EN[d.sector] ?? d.sector,
    images: d.images.map((im) => ({ ...im, label: IMAGE_LABEL_EN[im.label] ?? im.label })),
    source: d.source ? { ...d.source, note: en.note ?? d.source.note } : d.source,
  };
}


/** Médias à texte incrusté : version anglaise « .en » quand elle existe. */
export function localMedia(src: string, lang: Lang): string {
  if (lang !== "en") return src;
  const en = src.replace(/(\.\w+)$/, ".en$1");
  return fs.existsSync(path.join(process.cwd(), "public", en)) ? en : src;
}

/** Copie WebP allégée quand elle existe, sinon l'original. */
export function webpOf(src: string): string {
  if (!/\.jpe?g$/i.test(src)) return src;
  const w = src.replace(/\.jpe?g$/i, ".webp");
  return fs.existsSync(path.join(process.cwd(), "public", w)) ? w : src;
}

/** Les démonstrations dans la langue de l'interface (manifest anglais quand il existe), images allégées. */
export function demoList(lang: Lang): Demo[] {
  const rawEn = lang === "en" ? demos("manifest.en.json") : [];
  const raw = demos().map((d) => rawEn.find((x) => x.id === d.id) ?? d);
  return raw
    .map((d) => (rawEn.includes(d) ? d : localizeDemo(d, lang)))
    .map((d) => ({ ...d, photo: webpOf(d.photo), shopDesktop: webpOf(d.shopDesktop), shopMobile: webpOf(d.shopMobile), videoPoster: webpOf(d.videoPoster), images: d.images.map((im) => ({ ...im, src: webpOf(im.src) })) }));
}
