/**
 * Intentions des actions du studio : une ACTION connue (bouton, tâche de fond, route d'API) donne son intention sans
 * aucun appel à l'IA. Les demandes en texte libre ne passent plus ici : c'est SINA qui les comprend.
 */
export const INTENTS = [
  "ANALYZE_PRODUCT",
  "CREATE_BRAND",
  "CREATE_LOGO",
  "IMPROVE_LOGO",
  "FIND_STOCK_IMAGE",
  "GENERATE_IMAGE",
  "WRITE_PRODUCT_COPY",
  "SEO",
  "BLOG",
  "SOCIAL",
  "CREATE_AD",
  "CREATE_VIDEO",
  "CREATE_SHOP",
  "CREATE_THEME",
  "EDIT_THEME",
  "ORGANIZE_FILES",
  "EXPORT_CMS",
  "PUBLISH",
] as const;
export type Intent = (typeof INTENTS)[number];

/** Actions du studio (tâches de fond, boutons, routes) → intentions, sans IA. */
export const ACTION_INTENTS: Record<string, Intent[]> = {
  "cutout.run": ["ANALYZE_PRODUCT"],
  "images.generate": ["GENERATE_IMAGE"],
  "image.single": ["GENERATE_IMAGE"],
  "image.v2": ["GENERATE_IMAGE"],
  "image.ai_post": ["GENERATE_IMAGE"],
  "video.bank.stock": ["CREATE_VIDEO"],
  "video.bank.ai": ["CREATE_VIDEO"],
  "stock.search": ["FIND_STOCK_IMAGE"],
  "video.render": ["CREATE_VIDEO"],
  "ugc.script": ["CREATE_VIDEO"],
  "video.ugc": ["CREATE_VIDEO"],
  "blog.write": ["BLOG"],
  "blog.generate": ["BLOG"],
  "blog.topics": ["BLOG"],
  "brand.fulllogo": ["CREATE_LOGO"],
  "brand.logo.v2": ["CREATE_LOGO"],
  "brand.logo.v2.choose": ["CREATE_LOGO"],
  "brand.logo.v2.redraw": ["CREATE_LOGO"],
  "brand.logo": ["IMPROVE_LOGO"],
  "brand.logo.regenerate": ["CREATE_LOGO"],
  "logo.create": ["CREATE_LOGO"],
  "brand.build": ["CREATE_BRAND"],
  "copy.build": ["WRITE_PRODUCT_COPY"],
  "seo.generate": ["SEO"],
  "content.v2": ["SEO"],
  "social.v2.produce": ["SOCIAL"],
  "shop.build": ["CREATE_SHOP"],
  "shop.direction": ["CREATE_THEME"],
  "theme.custom": ["CREATE_THEME"],
  "shop.chat": ["EDIT_THEME"],
  "calendar.plan": ["SOCIAL"],
  "post.regenerate": ["SOCIAL"],
  "social.voice": ["SOCIAL"],
  "ads.draft": ["CREATE_AD"],
  "ads.v2": ["CREATE_AD"],
  "video.v2": ["CREATE_VIDEO"],
  "video.scenes": ["CREATE_VIDEO"],
  "video.v2.clip": ["CREATE_VIDEO"],
  "files.classify": ["ORGANIZE_FILES"],
  // Export du thème vers une plateforme (CMS Engine V2, phase 11A) : ZIP contrôlé, jamais envoyé sans accord.
  "cms.export": ["EXPORT_CMS"],
  "post.publish": ["PUBLISH"],
  "shopify.push": ["PUBLISH"],
  "canva.send": ["PUBLISH"],
  "canva.import": ["ORGANIZE_FILES"],
};

/** Intention d'une action connue (null : action inconnue, jamais devinée). */
export function intentsFromAction(action: string, payload?: { regenerate?: boolean }): Intent[] | null {
  if (action === "brand.logo" && payload?.regenerate) return ACTION_INTENTS["brand.logo.regenerate"];
  return ACTION_INTENTS[action] ?? null;
}
