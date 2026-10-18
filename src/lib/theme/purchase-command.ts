/** Intentions commerciales bornées : les informations absentes produisent une question, aucun tarif inventé. */
import type { ThemeSpec } from "./spec";
import { storeProducts } from "./store-products";
import type { ThemeOp } from "./ops";
import { L } from "../i18n-server";

export function purchaseCommand(spec: ThemeSpec, message: string, selection: { template: string; section: string } | null) {
  if (!/(?:cr[eé]e|ajoute|configure|create|add).*(?:offres|lots|offers|bundles)/i.test(message)) return null;
  // « Ajoute des lots » reste la commande historique d'insertion du bloc simple.
  // Le traitement commercial intervient lorsque la demande donne des quantités/offres explicites.
  if (!/un article|une unit[eé]|single|one item|duo|trio|deux articles|trois articles|quatre articles|four items|two items|three items|(?:\d+|deux|trois|quatre)\s+(?:offres|articles|offers|items)/i.test(message)) return null;
  const answer = (reply: string, ops: ThemeOp[] = []) => ({ ops, reply, revert: false });
  const chosen = selection && spec.templates[selection.template]?.sections[selection.section];
  if (!chosen || !["main-product", "purchase-offers"].includes(chosen.type) || !selection) return answer(L("Sélectionnez le bloc d’achat de la fiche à modifier.", "Select the product page's purchase block."));
  const products = storeProducts(spec).filter((p) => `product.${p.template_suffix}` === selection.template);
  if (products.length !== 1 || !products[0].contentTarget || spec.store.business === "services") return answer(L("Sélectionnez une fiche produit identifiée. Pour des prestations, utilisez les forfaits avec devis ou réservation.", "Select an identified product page. For services, use packages with quote or booking actions."));
  const p = products[0], normalized = message.toLowerCase();
  const quantities = [...new Set([/un article|une unit[eé]|single|one item/.test(normalized) ? 1 : 0, /duo|deux articles|two items/.test(normalized) ? 2 : 0, /trio|trois articles|three items/.test(normalized) ? 3 : 0, /quatre articles|four items/.test(normalized) ? 4 : 0].filter(Boolean))];
  if (!quantities.length || /(?:\d|cinq|six|sept|huit|neuf|dix)\s+(?:articles|items)/.test(normalized)) return answer(L("Indiquez les quantités souhaitées dans l’éditeur d’offres, ou précisez « un article, un duo, un trio ».", "Set the quantities in the offer editor, or specify a single, duo and trio."));
  // Sans règle de prix explicitement donnée, ne transforme pas un exemple en remise réelle.
  if (!/sans remise|prix unitaires? (?:actuels?|du catalogue)|no discount|current unit prices/.test(normalized)) return answer(L("Quelle règle de prix appliquer : prix unitaires actuels sans remise, ou remise précise pour chaque lot ?", "Which pricing rule: current unit prices with no discount, or an explicit discount for each bundle?"));
  if (/remise|discount/.test(normalized.replace(/sans remise|no discount/g, ""))) return answer(L("Saisissez la remise de chaque offre dans l’éditeur : cette commande locale ne devine pas sa répartition.", "Set each offer's discount in the editor; this local command does not infer how to distribute it."));
  const wantsGift = /offert|cadeau|free gift/.test(normalized);
  let gift: typeof p | undefined;
  if (wantsGift) {
    const matches = storeProducts(spec).filter((x) => x !== p && x.contentTarget && normalized.includes(x.title.toLowerCase()));
    if (matches.length !== 1) return answer(L("Quel article du catalogue offrir ? Indiquez son libellé exact pour éviter toute confusion.", "Which catalog item should be the gift? Give its exact label to avoid ambiguity."));
    gift = matches[0];
    if (!/trio.*(?:offert|cadeau)|(?:offert|cadeau).*trio|gift.*trio|trio.*gift/.test(normalized)) return answer(L("À partir de combien d’articles le cadeau est-il offert ?", "From how many items is the gift included?"));
  }
  const ops: ThemeOp[] = [];
  for (const [id, b] of Object.entries(chosen.blocks ?? {})) if (["quantity_offer", "threshold_gift"].includes(b.type)) ops.push({ op: "remove_block", ...selection, block: id });
  ops.push({ op: "set_setting", ...selection, key: "purchase_enabled", value: true }, { op: "set_setting", ...selection, key: "product_target", value: p.contentTarget! });
  const recommended = /duo.*(?:avant|recommand)|(?:avant|recommand).*duo|recommend.*duo/.test(normalized) ? 2 : 0;
  for (const quantity of quantities) ops.push({ op: "add_block", ...selection, type: "quantity_offer", settings: { title: quantity === 1 ? L("Un article", "Single") : quantity === 2 ? "Duo" : quantity === 3 ? "Trio" : L("Quatre articles", "Four items"), quantity, discount: 0, recommended: quantity === recommended } });
  if (gift) ops.push({ op: "add_block", ...selection, type: "threshold_gift", settings: { gift_target: gift.contentTarget!, quantity: 1, threshold: 3 } });
  return answer(L("Offres enregistrées sur cette fiche, aux prix unitaires actuels. Les remises et cadeaux à l’export nécessitent un support commercial serveur vérifié.", "Offers saved on this page at current unit prices. Exported discounts and gifts require verified server commerce support."), ops);
}
