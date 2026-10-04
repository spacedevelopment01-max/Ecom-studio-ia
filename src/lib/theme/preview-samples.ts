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
  const titles = en
    ? ["Sample article: your first blog post will appear here", "Sample article: tips around your product", "Sample article: behind the scenes of your brand"]
    : ["Exemple d'article : votre premier article apparaîtra ici", "Exemple d'article : conseils autour de votre produit", "Exemple d'article : les coulisses de votre marque"];
  const excerpt = en
    ? "Sample shown in the studio preview only. On your store, this section lists the real articles of the selected blog."
    : "Exemple affiché uniquement dans l'aperçu du studio. Sur votre boutique, la section affiche les vrais articles du blog choisi.";
  const articles = titles.map((title, i) => ({
    id: i + 1,
    title,
    handle: `exemple-${i + 1}`,
    url: `${base}/blogs/journal/exemple-${i + 1}`,
    image: photos.length ? `${base}/assets/${photos[i % photos.length]}` : null,
    published_at: new Date(Date.UTC(2026, 0, 12 - i * 4)).toISOString(),
    author: en ? "Sample" : "Exemple",
    excerpt,
    excerpt_or_content: excerpt,
    // Longueur variable : le temps de lecture estimé diffère d'un exemple à l'autre.
    content: `<p>${excerpt} ${words(400 + i * 350)}</p>`,
  }));
  const news = { id: 1, title: en ? "Journal (sample)" : "Journal (exemple)", handle: "news", url: `${base}/blogs/journal`, articles, articles_count: articles.length };
  return { news };
}
