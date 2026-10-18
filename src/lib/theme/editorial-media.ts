/** Rôles d'images déclarés mais non fournis : ne jamais leur emprunter un autre visuel. */
import { eachSection, storeProducts, type ThemeSpec } from "./spec";
export function missingEditorialMedia(spec: ThemeSpec): {page:string;section:string;role:string}[] {
 const result:{page:string;section:string;role:string}[]=[];
 for(const {where,id,section} of eachSection(spec)) {
  if(section.disabled)continue;
  const inspect=(settings:Record<string,unknown>)=>{
   for(const [role,image,asset] of [["media_role","image","image_asset"],["second_role","second_image","second_asset"]]) {
    if(section.type==="main-product"&&role==="media_role"&&storeProducts(spec).some(p=>(p.template_suffix?`product.${p.template_suffix}`:"product")===where&&p.images.length>0))continue;
    if(settings[role]&&!settings[image]&&!settings[asset])result.push({page:where,section:id,role:String(settings[role])});
   }
  };
  inspect(section.settings);for(const b of Object.values(section.blocks??{}))if(!b.disabled)inspect(b.settings);
 }
 return result;
}
