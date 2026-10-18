/** Remplissage des composants réutilisables : faits du projet, champs manuels prioritaires. */
import type { CopyFn } from "./section-content";
import { tr } from "./section-content";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const referenceCopy = (type: string): CopyFn => (ctx, base, schema) => {
  const settings = { ...base.settings }, services = ctx.business === "services";
  const set = (key: string, value: unknown) => {
    const def = schema.settings.find((x) => x.id === key);
    if (def && value !== undefined && (settings[key] == null || settings[key] === "" || settings[key] === def.default)) settings[key] = value;
  };
  const name = ctx.brand?.name || ctx.shopName;
  set("heading", type === "ref-offers" ? tr(ctx, services ? "Nos prestations" : "La collection", services ? "Our services" : "The collection") : type === "ref-notes" ? tr(ctx, "Les informations à connaître", "What to know") : ctx.brand?.tagline || ctx.product.name || name);
  set("text", ctx.product.summary ? `<p>${esc(ctx.product.summary)}</p>` : "");
  set("label", name); set("image_alt", services ? name : ctx.product.name);
  if (type === "ref-hero") { set("layout", services ? "landscape" : "object"); set("heading_tag", "h2"); }
  if (type === "ref-offers") { set("layout", services ? "studio" : "shop"); set("collection", "all"); }
  let blocks = base.blocks;
  const untouched = !blocks?.length || blocks.every((b) => !b.settings?.title || ["Votre prestation", "Votre information", "Your service", "Your information"].includes(String(b.settings.title)));
  if (untouched && type === "ref-offers" && services) blocks = ctx.services.services.map((s) => ({ type: "offer", settings: { title: s.name, text: `<p>${esc(s.description)}</p>`, price: s.price ?? "", duration: s.duration ?? "", image_alt: s.name, link: "/pages/contact" } }));
  if (untouched && type === "ref-notes") blocks = (services ? ctx.brand?.values ?? [] : ctx.product.facts.map((f) => ({ title: f.label, text: f.value }))).map((f) => ({ type: "note", settings: { title: f.title, text: `<p>${esc(f.text)}</p>` } }));
  return { settings, blocks, samples: false };
};
export const REFERENCE_COPY: Record<string, CopyFn> = Object.fromEntries(["ref-hero", "ref-editorial", "ref-offers", "ref-notes"].map((type) => [type, referenceCopy(type)]));
