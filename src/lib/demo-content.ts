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
    return (JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", file), "utf8")).demos as Demo[]).filter((d) => (DEMO_IDS as readonly string[]).includes(d.id)).map(onlyPresentFiles);
  } catch {
    return [];
  }
}

/** Les seules démonstrations du studio (priorité du 19 octobre 2026) ; toute autre entrée du manifeste est ignorée. */
export const DEMO_IDS = ["fraise", "onde", "orbe", "rive", "sillon"] as const;

const present = (src: string | undefined) => !!src && fs.existsSync(path.join(process.cwd(), "public", src.replace(/^\//, "")));
/**
 * Visuels des démonstrations : ils viennent du kit privé (jamais dans le dépôt, voir .gitignore) ; un fichier absent
 * est omis (chaîne vide ou retiré de la liste) pour qu'aucune page n'affiche d'image cassée ni de gabarit à la place.
 */
export function onlyPresentFiles(d: Demo): Demo {
  const ok = (src: string | undefined) => (present(src) ? (src as string) : "");
  const x = d as Demo & { productPage?: string };
  return {
    ...d,
    photo: ok(d.photo), logo: ok(d.logo), shopDesktop: ok(d.shopDesktop), shopMobile: ok(d.shopMobile), video: ok(d.video), videoPoster: ok(d.videoPoster),
    shopVideo: d.shopVideo ? ok(d.shopVideo) || undefined : undefined,
    ...(x.productPage !== undefined ? { productPage: ok(x.productPage) } : {}),
    images: d.images.filter((im) => present(im.src)),
    posts: d.posts?.filter(present),
    board: d.board ? ok(d.board) || undefined : undefined,
  };
}

/** Repli si public/demo/manifest.en.json n'est pas généré : textes des démonstrations françaises traduits pour l'interface anglaise. */
const DEMO_EN: Record<string, { product?: string; note?: string }> = {
  fraise: { product: "Strawberry gummies", note: "Fictional demo brand (specialty store, Lumora reference theme): AI visuals without people, proposed logo not validated, fictional prices, offers and reviews labelled as such." },
  onde: { product: "ONDE headphones", note: "Fictional demo brand (specialty store, Pawish reference theme): AI visuals without people, proposed logo not validated, fictional prices and reviews labelled as such; technical specifications left to complete, never claimed." },
  orbe: { product: "ORBE portable lamp", note: "Fictional demo brand (e-commerce, editorial composition): a portable lamp in three finishes with accessories; AI visuals without people, no validated logo, fictional prices and offers labelled as such." },
  sillon: { product: "SILLON portable espresso machine", note: "Fictional demo brand (specialty store, issue #148): already generated AI visuals supplied by the studio owner, without people; price, technical specifications, warranty and delivery left to complete, never claimed." },
  rive: { product: "Interior design and decoration", note: "Fictional demo business (services, “journal” composition): design intentions as AI images, never real projects; no real address or client; test contact requests only." },
};
const SECTOR_EN: Record<string, string> = { Confiserie: "Confectionery", Audio: "Audio", Luminaires: "Lighting", "Architecture d'intérieur": "Interior design", "Épicerie fine": "Fine food", Accessoires: "Accessories", Plantes: "Plants", Fleuriste: "Florist", Barbier: "Barber", Boissons: "Beverages", Maison: "Home", "High-tech": "Tech", Animaux: "Pets", Mode: "Fashion", "Sport et plein air": "Sports & outdoors", Paysagiste: "Landscaper", Beauté: "Beauty", Sport: "Sports", Alimentation: "Food", Bijoux: "Jewelry", Enfants: "Kids", Horlogerie: "Watches" };
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
