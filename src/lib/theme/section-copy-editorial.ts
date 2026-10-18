/** Rédaction des compositions éditoriales à partir du contexte ciblé ; aucun nom de démonstration. */
import type { CopyFn } from "./section-content";
import { tr } from "./section-content";
const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const copy = (type: string): CopyFn => (ctx, base) => {
  const settings = { ...base.settings };
  const set = (key: string, value: unknown) => { if (!settings[key]) settings[key] = value; };
  set("heading", type === "ed-contact" ? tr(ctx,"Parlons de votre projet.","Let’s discuss your project.") : ctx.brand?.tagline || ctx.product.name || ctx.shopName);
  set("text", ctx.product.summary ? `<p>${esc(ctx.product.summary)}</p>` : "");
  set("label",ctx.brand?.name || ctx.shopName);set("image_alt",ctx.product.name);
  if(type==="ed-finishes" && ctx.business!=="services") {set("product_target",ctx.product.target);set("product",ctx.product.handle);}
  if(type==="ed-opening") { set("heading_tag","h2");set("layout",ctx.business==="services"?"journal":"immersive"); }
  let blocks=base.blocks;
  if(type==="ed-statement"&&(!blocks?.length||blocks.every(b=>!b.settings?.title))) {
    const facts=ctx.business==="services"?ctx.brand?.values??[]:ctx.product.facts.map(f=>({title:f.label,text:f.value}));
    blocks=facts.map(f=>({type:"point",settings:{title:f.title,text:`<p>${esc(f.text)}</p>`}}));
  }
  if(type==="ed-diptych") blocks=blocks?.length ? blocks.map(b=>({...b,settings:{...b.settings,title:b.settings?.title||ctx.product.name}})) : (ctx.mediaFiles??[]).slice(0,2).map(file=>({type:"frame",settings:{title:ctx.product.name,image_asset:file,image_alt:ctx.product.name,ratio:"landscape"}}));
  return {settings,blocks,samples:false};
};
export const EDITORIAL_COPY: Record<string,CopyFn> = Object.fromEntries(["ed-finishes","ed-opening","ed-statement","ed-diptych","ed-scene","ed-study","ed-contact"].map(t=>[t,copy(t)]));
