/**
 * Écrit les documents Shopify de Theme Check (version installée de la dépendance) dans un dossier, pour
 * SHOPIFY_TLD_ROOT : utilisé par scripts/verify-theme.sh avant ses vérifications parallèles. Détails et cause corrigée :
 * src/lib/theme/shopify-docs.ts.
 *
 *   npx tsx scripts/theme-docs-local.ts <dossier>
 */
import path from "node:path";
import { writeShopifyDocs } from "../src/lib/theme/shopify-docs";

if (!process.argv[2]) throw new Error("Usage : npx tsx scripts/theme-docs-local.ts <dossier>");
const out = path.resolve(process.argv[2]);
const { revision, schemas } = writeShopifyDocs(out);
console.log(`Documents Shopify locaux (révision ${revision.slice(0, 8)}) : ${schemas} schémas dans ${out}`);
