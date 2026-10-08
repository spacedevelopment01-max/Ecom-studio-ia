/**
 * Vérification RÉELLE du SEO des fiches Shopify (phase 8B) — à lancer dans VOTRE Codespace, sur une boutique de
 * test reliée au studio (Connexions). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/verify-shopify-seo.ts --project <id> --product gid://shopify/Product/123 --title "…" --description "…"
 *
 * Le script ENVOIE le titre et la description (mécanisme actuel : métachamps global.title_tag / description_tag),
 * puis RELIT la fiche : métachamps enregistrés ? champ `seo` du produit mis à jour ? Tant que ce script n'a pas
 * été lancé avec succès sur une vraie boutique, le mécanisme reste « NON VÉRIFIÉ » dans le studio et le rapport.
 * Aucun appel d'IA ; seules les API de VOTRE boutique sont appelées.
 */
import "../worker/env";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const fail = (m: string): never => {
  console.error(`\n✗ ${m}\n`);
  process.exit(1);
};
const projectId = opt("--project") ?? fail("--project <id> obligatoire");
const productId = opt("--product") ?? fail("--product <gid://shopify/Product/…> obligatoire");
const title = opt("--title") ?? fail("--title obligatoire");
const description = opt("--description") ?? fail("--description obligatoire");

const { one } = await import("../src/lib/db");
const { shopifyConnection, pushProductSeo, readProductSeo, compareSeo } = await import("../src/lib/integrations/shopify");
const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId) ?? fail("Projet introuvable.");
const c = shopifyConnection(p.user_id, projectId) ?? fail("Aucune boutique Shopify reliée à ce projet (onglet Connexions).");

const sent = await pushProductSeo(c, productId, { title, description });
console.log(`Envoi : ${sent.status}${sent.detail ? ` (${sent.detail})` : ""}`);
const read = await readProductSeo(c, productId);
const cmp = compareSeo({ title, description }, read);
console.log(`Relecture : métachamps ${cmp.stored ? "✓" : "✗"} · champ SEO du produit ${cmp.displayed ? "✓" : "✗"} — ${cmp.detail}`);
console.log(cmp.displayed ? "\n✓ Mécanisme vérifié sur cette boutique : à reporter dans reports/remaining-work.md (phase 8B).\n" : "\n✗ Mécanisme NON vérifié : ne pas le présenter comme fiable.\n");
process.exit(cmp.displayed ? 0 : 2);
