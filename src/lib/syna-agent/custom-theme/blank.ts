/**
 * Sections « vierges » de la banque et de l'outil de construction (décision du propriétaire du 10 novembre 2026,
 * docs/revue-banque-sections.md : « Oui, vierge + exemple ») : les photos d'exemple deviennent des cadres gris avec une
 * icône, au bon format ; les textes deviennent des repères en français (« Titre qui donne envie »…), aux couleurs et
 * polices du client ; un bouton « Voir un exemple rempli » remet l'exemple. SINA remplit tout juste après le montage.
 *
 * Rien n'est réécrit dans la section : seuls les textes affichés changent, et reviennent à l'identique (les scripts des
 * sections continuent de marcher). Gratuit, sans IA ; jamais sur un vrai site (seulement la banque et l'outil).
 */

const ICON = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8C877E" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8.5"/></svg>`,
);

export const BLANK_CSS = `
html.ct-blank [data-ct]:not([data-ct-own]) img:not(.ctw-logo){object-position:-99999px -99999px;background:#E6E3DD url("data:image/svg+xml,${ICON}") center/clamp(28px,22%,56px) no-repeat !important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
html.ct-blank [data-ct]:not([data-ct-own]) video{opacity:0}
html.ct-blank [data-ct]:not([data-ct-own]) [style*="background-image"]{background-image:none !important;background-color:#E6E3DD !important}
html.ct-blank [data-ct-own] [data-ct-ex] img{object-position:-99999px -99999px;background:#E6E3DD url("data:image/svg+xml,${ICON}") center/clamp(28px,22%,56px) no-repeat !important}
.ct-blank-sw{position:fixed;right:16px;bottom:16px;z-index:9500;display:flex;gap:8px;align-items:center;padding:8px 8px 8px 14px;border-radius:999px;background:#1d2b24;color:#fff;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.ct-blank-sw button{border:0;border-radius:999px;background:#c9a04e;color:#1d2b24;font:700 13px system-ui,sans-serif;padding:8px 14px;cursor:pointer}
`;

/** Script : bascule vierge / exemple rempli (vierge par défaut). */
export const BLANK_JS = `(function(){
var ROOT=document.documentElement,ON=true,saved=new Map(),BLOCK="H1,H2,H3,H4,H5,H6,P,LI,BLOCKQUOTE,FIGCAPTION,LABEL,BUTTON,A,SUMMARY,TD,TH,DT,DD,CITE,SMALL,B,STRONG,EM,I,SPAN,DIV,SECTION,ARTICLE,ASIDE,FOOTER,NAV,HEADER,FORM";
function inl(e){var d=getComputedStyle(e).display;return d==="inline"||d==="contents"}
function block(n){var e=n.parentElement;
  // Les morceaux en ligne (« Livrée en <span>48 à 72 h</span> ») font partie du même texte que leur bloc.
  while(e&&(BLOCK.indexOf(e.tagName)<0||(inl(e)&&e.parentElement&&!e.matches("[data-ct]"))))e=e.parentElement;
  // Un titre garde son morceau en italique : le bloc est le titre entier.
  var h=e&&e.closest&&e.closest("h1,h2,h3,h4,h5,h6");return h||e}
function label(b,txt){var t=b.tagName,cs=getComputedStyle(b),len=txt.length;
  if(len<=16&&/\\d[\\d\\s,.]*\\s?€/.test(txt))return "00,00 €";
  if(/^[\\d\\s:.,%+−-]+$/.test(txt))return null;
  if(t==="H1"||t==="H2")return "Titre principal qui donne envie";
  if(t==="H3")return "Titre de la section";
  if(/^H[4-6]$/.test(t)||t==="DT"||t==="SUMMARY")return "Titre court";
  if(t==="BUTTON"||t==="A"||/btn|cta/i.test(b.className))return len<=12?"Bouton":len>34?"Lien vers une page":"Bouton qui donne envie";
  if(t==="LABEL")return "Nom du champ";
  if(t==="CITE")return "Prénom du client";
  if(t==="LI")return b.querySelector("a")&&b.textContent.trim()===b.querySelector("a").textContent.trim()?"Lien vers une page":"Un point fort en quelques mots";
  if(cs.textTransform==="uppercase"&&len<60)return "Sur-titre";
  if(t==="SMALL")return "Petite précision";
  if(t==="B"||t==="STRONG")return len>40?"Une phrase courte et claire":"Titre court";
  if(len>90)return "Un texte qui fait ressentir le moment : ce que le client vit et ressent, en deux ou trois phrases, sans rien inventer.";
  if(len>36)return "Une phrase courte qui dit ce que le client y gagne.";
  return len>14?"Texte court":null}
// Une section écrite pour la marque reste telle quelle, sauf ses parties encore d'exemple (data-ct-ex : panneau d'un méga-menu).
function blankSection(sec){var own=sec.hasAttribute("data-ct-own");if(sec.__ctb||(own&&!sec.querySelector("[data-ct-ex]")))return;sec.__ctb=1;var w=document.createTreeWalker(sec,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentElement;if(!p||!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;if(own&&!p.closest("[data-ct-ex]"))return NodeFilter.FILTER_REJECT;if(p.closest("script,style,svg,option,textarea,.cg-lab,.cg-panel,.bd-panel,.ct-blank-sw,.at-tag"))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}});
  var groups=new Map(),n;while(n=w.nextNode()){var b=block(n);if(!b)continue;if(!groups.has(b))groups.set(b,[]);groups.get(b).push(n)}
  groups.forEach(function(nodes,b){if(b.closest("[data-ct]")!==sec)return;var all=nodes.map(function(x){return x.nodeValue}).join(" ").replace(/\\s+/g," ").trim();
    if(b.matches(".lg,.lg *,[class$='-lg'],[class$='-lg'] *"))return;
    var lab=label(b,all);if(!lab)return;
    nodes.forEach(function(x){if(!saved.has(x))saved.set(x,x.nodeValue)});
    var em=b.querySelector("em,i");if(em&&/^H[1-6]$/.test(b.tagName)){var parts=lab.split(" "),cut=Math.max(1,parts.length-2);
      nodes.forEach(function(x){x.nodeValue=""});
      var outN=nodes.filter(function(x){return !em.contains(x)}),inN=nodes.filter(function(x){return em.contains(x)});
      if(outN[0])outN[0].nodeValue=parts.slice(0,cut).join(" ")+" ";if(inN[0])inN[0].nodeValue=parts.slice(cut).join(" ");return}
    nodes.forEach(function(x,i){x.nodeValue=i?"":lab})})}
function apply(){qa().forEach(blankSection)}
function qa(){return [].slice.call(document.querySelectorAll("[data-ct]"))}
function restore(){saved.forEach(function(v,n){n.nodeValue=v});saved.clear();qa().forEach(function(s){s.__ctb=0})}
function set(on){ON=on;ROOT.classList.toggle("ct-blank",on);if(on)apply();else restore();btn.textContent=on?"Voir un exemple rempli":"Revenir aux sections vierges";txt.textContent=on?"Sections vierges":"Exemple rempli";try{localStorage.setItem("ct-blank",on?"1":"0")}catch(e){}}
var sw=document.createElement("div");sw.className="ct-blank-sw";var txt=document.createElement("span"),btn=document.createElement("button");btn.type="button";sw.appendChild(txt);sw.appendChild(btn);document.body.appendChild(sw);
btn.onclick=function(){set(!ON)};
var start=true;try{start=localStorage.getItem("ct-blank")!=="0"}catch(e){}
// Sections posées après coup (atelier du thème : section remplacée ou ajoutée) : vierges elles aussi.
if(window.MutationObserver)new MutationObserver(function(){if(ON)apply()}).observe(document.body,{childList:true,subtree:true});
setTimeout(function(){set(start)},60);
})();`;
