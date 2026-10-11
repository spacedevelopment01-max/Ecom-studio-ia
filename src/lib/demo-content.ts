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
  verger: { product: "Peach iced tea", note: "A supplier's 33 cl can of iced tea, relabeled: the brand and the three flavors are created by the studio." },
  oreiller: { product: "Papillon ergonomic pillow", note: "A white-label ergonomic pillow from a supplier, in two colors: the brand, the visuals and the store are created by the studio." },
  drone: { product: "Foldable drone with stabilized camera", note: "A white-label foldable drone from a supplier; the manufacturer's markings were removed from the photo, and the brand and store are created by the studio." },
  chat: { product: "De-shedding glove", note: "White-label cat products from suppliers: the brand, the visuals and the store are created by the studio." },
  tribunes: { product: "Lavender supporter T-shirt", note: "Supporter T-shirts from a supplier (supplier visuals): the brand and the store are created by the studio. Designs featuring the federation's official crest were excluded." },
};
const SECTOR_EN: Record<string, string> = { Boissons: "Beverages", Maison: "Home", "High-tech": "Tech", Animaux: "Pets", Mode: "Fashion", Beauté: "Beauty", Sport: "Sports", Alimentation: "Food", Bijoux: "Jewelry", Enfants: "Kids" };
const IMAGE_LABEL_EN: Record<string, string> = { Bannière: "Banner", Détail: "Detail", Détourage: "Cutout", Packshot: "Packshot", Publicité: "Ad", Scène: "Scene", "Visuel social": "Social visual" };

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
