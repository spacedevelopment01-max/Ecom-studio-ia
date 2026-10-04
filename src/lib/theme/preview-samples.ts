/**
 * Données d'exemple de l'APERÇU du studio uniquement (jamais compilées dans le thème exporté) :
 * le studio n'a pas accès aux blogs de la boutique Shopify, on montre donc des articles clairement
 * étiquetés « Exemple » pour que le marchand voie ce que propose la section « Blog en vedette premium ».
 * Sur la boutique réelle, seuls ses vrais articles s'affichent (état vide sinon).
 */
import type { Lang } from "../i18n";
import { mediaPools } from "./section-defaults";
import type { ThemeSpec } from "./spec";

export function sampleBlogs(spec: ThemeSpec, base: string, lang: Lang) {
  const en = lang === "en";
  const p = mediaPools(spec);
  const photos = [...p.life, ...p.photos, ...p.cutout].filter((f, i, a) => a.indexOf(f) === i);
  const words = (n: number) => Array.from({ length: n }, () => (en ? "sample" : "exemple")).join(" ");
  // Titres et extraits réalistes, propres au produit de la boutique ; chaque article porte l'étiquette « Exemple ».
  const name = spec.store.product?.title || spec.store.shopName;
  const shop = spec.store.shopName;
  const posts = en
    ? [
        { title: `How to choose ${name}: our tips`, excerpt: `Size, everyday use, small details: everything worth knowing about ${name} before you order.` },
        { title: `Behind the scenes at ${shop}`, excerpt: `From selecting products to packing your order, a look at how we work day to day.` },
        { title: "Care tips to make it last", excerpt: "A few simple habits to keep your purchase looking its best, season after season." },
      ]
    : [
        { title: `Bien choisir ${name} : nos conseils`, excerpt: `Usage, détails, petites questions pratiques : tout ce qu'il faut savoir avant de commander.` },
        { title: `Dans les coulisses de ${shop}`, excerpt: "De la sélection des produits à la préparation de votre colis, découvrez notre façon de travailler." },
        { title: "Nos conseils pour le garder longtemps", excerpt: "Quelques gestes simples pour en prendre soin et en profiter le plus longtemps possible." },
      ];
  const tag = en ? "Example" : "Exemple";
  const articles = posts.map(({ title, excerpt }, i) => ({
    id: i + 1,
    title,
    handle: `exemple-${i + 1}`,
    url: `${base}/blogs/journal/exemple-${i + 1}`,
    image: photos.length ? `${base}/assets/${photos[i % photos.length]}` : null,
    published_at: new Date(Date.UTC(2026, 0, 12 - i * 4)).toISOString(),
    author: tag,
    tags: [tag],
    excerpt,
    excerpt_or_content: excerpt,
    // Longueur variable : le temps de lecture estimé diffère d'un exemple à l'autre.
    content: `<p>${excerpt} ${words(400 + i * 350)}</p>`,
  }));
  const news = { id: 1, title: en ? "Journal (sample)" : "Journal (exemple)", handle: "news", url: `${base}/blogs/journal`, articles, articles_count: articles.length };
  return { news };
}
