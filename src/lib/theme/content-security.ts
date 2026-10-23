/** Contrôle des contenus non fiables. Les fichiers natifs et leurs animations ne sont pas réécrits. */
import { parseDocument } from "htmlparser2";
import type { ThemeSpec } from "./spec";
import { HttpError } from "../auth";

const nativeScripts=new Set(["theme.js","editorial.js","purchase-offers.js"]);
const badUrl=(v:string)=>/^(?:javascript|vbscript|data|file|blob):/i.test(v.replace(/[\u0000-\u0020\u007f]/g,""));
export function unsafeContentReason(html:string,liquid=false):string|null{
  let unsafe=false;
  function walk(nodes:any[]){for(const n of nodes){
    const name=String(n.name??"").toLowerCase(),attrs=n.attribs??{};
    if(["iframe","object","embed","base","foreignobject","meta"].includes(name))unsafe=true;
    if(name==="script"){
      const json=/^application\/(?:ld\+)?json$/i.test(attrs.type??"")&&!attrs.src;
      const local=liquid&&Object.keys(attrs).every(k=>["src","defer","async","type"].includes(k))&&/^\{\{-?\s*['"]([\w.-]+)['"]\s*\|\s*asset_url\s*-?\}\}$/.test(attrs.src??"")&&nativeScripts.has((attrs.src??"").match(/['"]([\w.-]+)['"]/)?.[1]??"");
      if(!json&&!local)unsafe=true;
    }
    for(const [k,v]of Object.entries(attrs)){
      if(/^on/i.test(k)||k==="srcdoc"||["href","src","action","formaction","xlink:href"].includes(k)&&badUrl(String(v)))unsafe=true;
      if(k==="style"&&/expression\s*\(|@import|url\s*\(\s*['"]?(?:https?:|\/\/|file:|data:|javascript:)/i.test(String(v)))unsafe=true;
    }
    if(n.children)walk(n.children);
  }}
  walk(parseDocument(html).children);
  if(liquid&&(/\{%[-\s]*javascript\b/i.test(html)||/\|\s*script_tag\b/i.test(html)))unsafe=true;
  return unsafe?"Contenu actif non autorisé : utilisez les composants natifs et des animations CSS. / Active content refused: use native components and CSS animations.":null;
}

export function assertSafeThemeContent(spec:ThemeSpec){
  function visit(value:unknown,depth=0){
    if(depth>35)throw new HttpError(422,"Contenu trop imbriqué / Content too deeply nested","unsafe_theme_content");
    if(typeof value==="string"){
      if(badUrl(value)||(value.includes("<")&&unsafeContentReason(value)))throw new HttpError(422,"Un contenu actif doit être corrigé avant l’aperçu ou l’export. La version existante est conservée. / Correct active content before preview or export. The existing version is kept.","unsafe_theme_content");
    }else if(value&&typeof value==="object")for(const v of Object.values(value))visit(v,depth+1);
  }
  visit(spec.settings);visit(spec.templates);visit(spec.groups);visit(spec.store);
  for(const section of Object.values(spec.customSections??{}))if(unsafeContentReason(section.liquid,true))throw new HttpError(422,"Section active non autorisée / Active section refused","unsafe_theme_content");
}
