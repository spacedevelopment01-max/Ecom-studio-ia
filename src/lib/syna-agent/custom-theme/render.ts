/**
 * Rendu d'un THÈME SUR MESURE en une page vivante (toutes les pages, ordinateur et téléphone) : sections de la
 * bibliothèque avec leurs retouches, nom, couleurs, polices et logo de la marque du client, bloc d'achat réglé sur les
 * vraies données de son produit. Dans le Studio, un outil permet au client de DÉSIGNER un élément (titre, texte, bouton,
 * image, section) : SINA reçoit sa désignation et ne modifie que lui. Gratuit, sans IA.
 */
import fs from "node:fs";
import path from "node:path";
import type { Project } from "../../projects";
import { listProducts } from "../../products/catalog";
import { FONT_FILES } from "../../theme/render";
import { assetUrl } from "../../library";
import { fontOf, fontsCss } from "../mockup-code/code-mockup";
import { decideBuyFeatures, deliveryFrom, freeShippingFrom, loadShopOffers, type BuyFeatures } from "../product-features";
import { companyOf } from "../activity";
import { DEMO_BRANDS, LIBRARY_DIR, sectionLibrary, withBrandName } from "./library";
import { allSections, sectionHtml, type CtSection, type CustomTheme } from "./theme";

const read = (f: string) => { try { return fs.readFileSync(path.join(LIBRARY_DIR(), f), "utf8"); } catch { return ""; } };
let templates: string | null = null;

/** Couleurs et polices de la marque reportées sur les variables des sections des deux familles. */
export function brandCss(p: Pick<Project, "brand">): string {
  const pal = p.brand?.palette;
  const h = fontOf(p.brand?.fonts?.heading, FONT_FILES), b = fontOf(p.brand?.fonts?.body, FONT_FILES);
  const fc = fontsCss([h?.key, b?.key].filter((x): x is string => !!x), FONT_FILES).css.replace(/url\("fonts\//g, 'url("/api/syna/fonts/');
  const H = h ? `"${h.family}",${h.fallback}` : null, B = b ? `"${b.family}",${b.fallback}` : null;
  const v: string[] = [];
  const set = (sel: string, vars: Record<string, string | null | undefined>) => {
    const body = Object.entries(vars).filter(([, x]) => x).map(([k, x]) => `${k}:${x}`).join(";");
    if (body) v.push(`${sel}{${body}}`);
  };
  if (pal) {
    const mix = (a: string, c: string, pct: number) => `color-mix(in srgb,${a} ${pct}%,${c})`;
    set(":root", { "--b-dark": pal.dark, "--b-ink": pal.dark, "--b-primary": pal.primary, "--b-gold": pal.accent, "--b-soft": pal.light, "--c1": pal.primary, "--c2": pal.accent, "--c3": pal.secondary, "--c4": pal.dark, "--c5": pal.light });
    set(".ctw .el", { "--e-nv": pal.dark, "--e-nv2": mix(pal.dark, pal.light, 88), "--e-or": pal.primary, "--e-tl": pal.accent, "--e-cr": pal.light, "--e-gr": pal.secondary, "--e-ink": pal.dark });
    set(".ctw .dq", { "--q-bk": pal.dark, "--q-gr": mix(pal.dark, pal.light, 90), "--q-lm": pal.primary, "--q-rd": pal.accent, "--q-tx": pal.light, "--q-mu": mix(pal.light, pal.dark, 62), "--q-ln": mix(pal.light, pal.dark, 14) });
    set(".ctw", { "--tb-ac": pal.primary });
    // Fond du site : sombre pour le style Streetwear néon, clair sinon ; deux sombres qui alternent (jamais deux bandes
    // de la même couleur collées).
    set(".ctw>.frame", { background: pal.light });
    set(".ctw-streetwear-neon>.frame", { background: pal.dark });
    set(".ctw-streetwear-neon .tb-pg>.dq:nth-of-type(even):not(.dq2):not(.dq5):not(.dq7)", { "--q-bk": mix(pal.dark, pal.light, 93) });
    set(".ctw .dq5", { color: pal.dark });
    // Bloc d'achat : bouton et prix à la couleur de la marque, texte du bouton lisible dessus.
    const on = readableOn(pal.primary, pal.dark, pal.light);
    set(".ctw .po.mo-dk", { "--po-ac": pal.primary, "--po-on": on, "--po-bg": mix(pal.light, pal.dark, 6), "--po-ln": mix(pal.light, pal.dark, 14), "--po-mu": mix(pal.light, pal.dark, 62) });
    set(".ctw .po.mo-lt", { "--po-ac": pal.dark, "--po-on": pal.light, "--po-ln": mix(pal.dark, pal.light, 16) });
  }
  if (H || B) {
    set(":root", { "--f-title": H, "--f-ui": B });
    set(".ctw .el", { "--e-t": H, "--e-s": H, "--e-u": B });
    set(".ctw .dq", { "--q-t": H, "--q-u": B });
  }
  return [fc, ...v].join("\n");
}

/** Couleur de texte lisible sur un fond (la plus contrastée des deux). */
export function readableOn(bg: string, dark: string, light: string): string {
  const lum = (h: string) => {
    const m = h.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (!m) return 0.5;
    const [r, g, b] = m.slice(1).map((x) => { const c = parseInt(x, 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return ratio(bg, dark) >= ratio(bg, light) ? dark : light;
}

/** Bloc d'achat (« Produit vedette ») : seules les fonctions que le produit a vraiment (consigne du 8 novembre). */
export function buyFlags(f: BuyFeatures | null): Record<string, string> {
  if (!f) return { poInit: "1" };
  return {
    poInit: "1", poCouleur: f.colors ? "1" : "0", poTaille: f.formats.length ? "1" : "0", poPromo: f.promo ? "1" : "0",
    poAbo: f.subscription ? "1" : "0", poOffre: f.quantity ? f.quantity.kind : "none", poPaliers: f.gifts.length ? "1" : "0",
    poRituel: f.bundle ? "1" : "0", poGamme: f.range.length ? "1" : "0", poLivraison: f.delivery ? "1" : "0", poFidelite: f.loyalty ? "1" : "0",
  };
}
function featuresOf(projectId: string): BuyFeatures | null {
  try {
    const products = listProducts(projectId);
    if (!products.length) return null;
    const ship = companyOf(projectId).shipping;
    return decideBuyFeatures(products[0], loadShopOffers(projectId), { catalog: products.map((x) => x.data.title), freeShippingFrom: freeShippingFrom(ship), shippingDelay: deliveryFrom(ship) });
  } catch { return null; }
}

/** Liens du site : le texte d'un lien mène à la page qui lui correspond (si elle existe dans le thème). */
const LINK_WORDS: Record<string, string[]> = {
  shop: ["Boutique", "Nouveautés", "Collections", "Collection", "Tout voir", "Tout le catalogue", "Découvrir", "Voir la collection", "Explorer la collection", "Femme", "Homme", "Le drop", "Soldes", "Nos produits", "Nos mélanges", "Coffrets", "Accessoires", "Chaussures"],
  cart: ["Panier", "Voir le panier"],
  contact: ["Contact", "Écris-nous", "Nous écrire", "Suivi de commande"],
  about: ["À propos", "Notre histoire", "La marque", "Tous les looks"],
  journal: ["Journal", "Le journal", "Tous les articles", "Blog"],
  home: ["Accueil", "Retour à l'accueil"],
};
function linkMap(t: CustomTheme): Record<string, string> {
  const keys = new Set(t.pages.map((p) => p.key));
  const out: Record<string, string> = {};
  for (const [k, words] of Object.entries(LINK_WORDS)) {
    const target = keys.has(k) ? k : k === "about" && keys.has("journal") ? "journal" : k === "journal" && keys.has("about") ? "about" : null;
    if (target) for (const w of words) out[w] = target;
  }
  const product = t.pages.find((p) => /^product/.test(p.key))?.key;
  if (product) for (const w of ["Livraison", "Retours", "Guide des tailles", "Questions"]) out[w] ??= product;
  for (const p of t.pages) out[p.label] = p.key;
  return out;
}

/** HTML d'une section du thème, marqué de son identifiant (désignation, règles propres). */
export function sectionMarkup(s: CtSection, brandName: string, role: string): string {
  const html = withBrandName(sectionHtml(s), brandName);
  return html.replace(/^\s*<(section|footer)\b/, `<$1 data-ct="${s.uid}" data-ct-role="${role}"`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const BASE_CSS = `
body{margin:0;background:#E7E3DC}
.tb-bar{position:sticky;top:0;z-index:100;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:9px 12px;background:#111;color:#fff;font:600 .8rem var(--f-ui)}
.tb-bar span{opacity:.7;margin:0 4px 0 8px}
.tb-bar button{border:1px solid rgba(255,255,255,.28);background:none;color:#fff;border-radius:999px;padding:6px 12px;font:700 .76rem var(--f-ui);cursor:pointer}
.tb-bar button[aria-pressed="true"]{background:var(--tb-ac,#E8622C);color:#111;border-color:var(--tb-ac,#E8622C)}
.tb-wrap{padding:0 0 40px}
.tb-wrap>.frame{position:relative;margin:0 auto;transition:width .4s}
.tb-wrap.phone>.frame{width:390px;max-width:100%;border:10px solid #111;border-radius:34px;overflow:clip;margin-top:18px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.tb-pg[hidden]{display:none}
.tb-pg>section,.tb-pg>footer{border-radius:0}
.tb-wrap .zm18{position:fixed;inset:0;z-index:9000;min-height:0;padding:0;background:none;pointer-events:none;visibility:hidden;transition:visibility 0s .55s}
.tb-wrap .zm18.op{pointer-events:auto;visibility:visible;transition:none}
.tb-wrap .zm18-bg,.tb-wrap .zm18-op{display:none}
.tb-wrap .zm18-ov{overflow-y:auto;background:var(--q-bk,#0B0C0B)}
.ctw .mz1,.ctw .mz2{position:sticky;top:43px;z-index:60}
.ctw .mz2{box-shadow:0 6px 20px rgba(30,42,50,.06)}
/* en-tête du site posé à part : celui intégré à une ouverture est masqué (jamais deux en-têtes) */
.ctw .el1-hd,.ctw .dq1-hd{display:none}
.ctw .el1{padding-top:14px}
.ctw .zm9-tx img:nth-of-type(3){display:none}
.ctw-logo{display:block;max-height:44px;width:auto;max-width:180px;object-fit:contain}
.ctw-note{position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(560px,calc(100% - 24px));font:500 12px/1.35 system-ui,sans-serif;background:rgba(20,18,16,.88);color:#fff;padding:8px 12px;border-radius:12px;pointer-events:none}
`;

/** Navigation entre les pages, vue téléphone, recherche par la loupe, carte produit qui ouvre SA fiche. */
const NAV_JS = `(function(){
  var wrap=document.querySelector(".tb-wrap"),pages=[].slice.call(document.querySelectorAll(".tb-pg"));
  function go(p){if(!document.querySelector('.tb-pg[data-pg="'+p+'"]'))return;pages.forEach(function(x){x.hidden=x.dataset.pg!==p});
    document.querySelectorAll("[data-pgb]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.pgb===p))});window.scrollTo(0,0);try{parent.postMessage({source:"ct-preview",type:"page",page:p},"*")}catch(e){}setTimeout(function(){window.dispatchEvent(new Event("resize"));window.dispatchEvent(new Event("scroll"))},60)}
  window.ctGo=go;
  var prod=pages.map(function(x){return x.dataset.pg}).filter(function(k){return /^product/.test(k)})[0];
  document.addEventListener("click",function(e){
    if(window.ctPicking)return;
    var b=e.target.closest("[data-pgb]");if(b){go(b.dataset.pgb);return}
    var v=e.target.closest("[data-vw]");if(v){wrap.classList.toggle("phone",v.dataset.vw==="phone");document.querySelectorAll("[data-vw]").forEach(function(x){x.setAttribute("aria-pressed",String(x===v))});setTimeout(function(){window.dispatchEvent(new Event("resize"))},450);return}
    var a=e.target.closest("[data-go]");if(a){e.preventDefault();go(a.dataset.go);var mo=document.querySelector(".mz2.op,.mz1.is-mob");if(mo){mo.classList.remove("op","is-mob")}return}
    var sb=e.target.closest('button[aria-label="Rechercher"]');var zs=document.querySelector(".tb-wrap .zm18");if(sb&&zs&&!sb.closest(".zm18")){e.preventDefault();var mo2=document.querySelector(".mz2.op,.mz1.is-mob");if(mo2)mo2.classList.remove("op","is-mob");var o=zs.querySelector("[data-zm18o]");if(o)o.click();return}
    var an=e.target.closest("a[href]");if(an)e.preventDefault();
    if(e.target.closest("button,input,select,label,form,textarea"))return;
    var c=e.target.closest(".el3-im,.dq3-im,.zm5-c,.zm6-c,.zm18-rs a,.mz5-l a");if(c&&prod){e.preventDefault();if(zs)zs.classList.remove("op");if(c.closest(".mz5-l")&&document.querySelector('.tb-pg[data-pg="shop"]')){go("shop");return}go(prod);openProduct(c)}
  },true);
  function openProduct(c){var im=c.querySelector("img")||c.closest("article,li,div").querySelector("img");var f=im&&(im.getAttribute("src")||"").split("/").pop();
    var pg=document.querySelector('.tb-pg[data-pg="'+prod+'"]');if(!pg)return;var s=[].slice.call(pg.querySelectorAll("section")).find(function(x){return x._po&&x._po.gam});if(!s)return;
    var k=s._po.gam.findIndex(function(g){return String(g[0]).split("/").pop()===f});s._po.pick(k>-1?k:s._po.g0)}
  var MAP=window.TB_MAP||{};document.querySelectorAll(".tb-wrap a:not([data-go])").forEach(function(x){var t=x.textContent.replace(/[→↗]/g,"").trim();if(MAP[t])x.dataset.go=MAP[t]});
  var lg=window.CT_LOGO;if(lg)document.querySelectorAll('[data-ct-role="header"] [class$="-lg"],[data-ct-role="header"] .lg,[data-ct-role="footer"] [class$="-lg"]').forEach(function(x){x.innerHTML='<img class="ctw-logo" src="'+lg+'" alt="'+(window.CT_NAME||"")+'">'});
  // Textes écrits par les scripts des sections : jamais le nom d'une marque de démonstration (remplacé par celle du client).
  var NM=window.CT_NAME||"",RX=new RegExp("\\b("+(window.CT_DEMO||[]).join("|")+")\\b","gi");
  function brand(root){if(!NM||!RX.source||RX.source==="\\b()\\b")return;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){if(RX.test(n.nodeValue)){RX.lastIndex=0;n.nodeValue=n.nodeValue.replace(RX,function(m){return m===m.toUpperCase()?NM.toUpperCase():m===m.toLowerCase()?NM.toLowerCase():NM})}RX.lastIndex=0}}
  if(wrap){brand(wrap);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(x){if(x.nodeType===1||x.nodeType===3)brand(x.nodeType===1?x:x.parentNode||wrap)})})}).observe(wrap,{childList:true,subtree:true})}
  var first=(location.hash||"").replace("#","");go(first&&document.querySelector('.tb-pg[data-pg="'+first+'"]')?first:pages[0]&&pages[0].dataset.pg);
})();`;

/**
 * Désignation d'un élément (Studio seulement, jamais sur le site du client) : le client pointe un titre, un texte, un
 * bouton, une image ou une section ; le Studio reçoit sa section (uid), son adresse dans la section, son texte et sa
 * photo, et les transmet à SINA.
 */
const PICK_JS = `(function(){
  var SEL='img,video,a,button,h1,h2,h3,h4,h5,h6,p,li,blockquote,label,summary,small,b,strong,em,span,[data-ct]';
  var hov=null,lab=null;window.ctPicking=false;
  var st=document.createElement("style");st.textContent='.ctw-hov{outline:2px dashed #2F5BEA!important;outline-offset:-2px!important;cursor:crosshair!important}.ctw-picked{outline:3px solid #2F5BEA!important;outline-offset:-3px!important}.ctw-lab{position:fixed;z-index:2147483001;background:#2F5BEA;color:#fff;font:600 11px system-ui,sans-serif;padding:3px 8px;border-radius:6px;pointer-events:none}';document.head.appendChild(st);
  function kind(el){var t=el.tagName.toLowerCase();if(el.hasAttribute("data-ct"))return"Section";if(/^(img|video)$/.test(t))return"Image";if(/^(a|button|summary)$/.test(t))return"Bouton";if(/^h[1-6]$/.test(t))return"Titre";return"Texte"}
  function pathOf(el,sec){var segs=[],n=el;while(n&&n!==sec){var p=n.parentElement;if(!p)return"";segs.unshift(n.tagName.toLowerCase()+":nth-child("+([].indexOf.call(p.children,n)+1)+")");n=p}return n===sec?segs.join(" > "):""}
  /* Un mot isolé (titre découpé pour son animation, mot en couleur) désigne le titre, le texte ou le bouton entier. */
  function target(e){var t=e.target.closest&&e.target.closest(SEL);if(!t)return null;if(!t.closest("[data-ct]"))return null;
    if(/^(span|b|strong|em|small|i)$/i.test(t.tagName)){var up=t.parentElement&&t.parentElement.closest("h1,h2,h3,h4,h5,h6,p,a,button,li,blockquote,label,summary");if(up&&t.closest("[data-ct]").contains(up))t=up}
    return t}
  function clear(){if(hov){hov.classList.remove("ctw-hov");hov=null}if(lab){lab.remove();lab=null}}
  document.addEventListener("mouseover",function(e){if(!window.ctPicking)return;var t=target(e);clear();if(!t)return;hov=t;t.classList.add("ctw-hov");lab=document.createElement("div");lab.className="ctw-lab";lab.textContent=kind(t);var r=t.getBoundingClientRect();lab.style.left=Math.max(4,r.left)+"px";lab.style.top=Math.max(4,r.top-22)+"px";document.body.appendChild(lab)},true);
  document.addEventListener("click",function(e){if(!window.ctPicking)return;var t=target(e);if(!t)return;e.preventDefault();e.stopPropagation();
    document.querySelectorAll(".ctw-picked").forEach(function(x){x.classList.remove("ctw-picked")});t.classList.add("ctw-picked");clear();
    var sec=t.closest("[data-ct]"),pg=t.closest(".tb-pg"),whole=t===sec,tag=t.tagName.toLowerCase();
    var src=/^(img|video)$/.test(tag)?(t.getAttribute("src")||""):"";
    parent.postMessage({source:"ct-preview",type:"picked",uid:sec.getAttribute("data-ct"),role:sec.getAttribute("data-ct-role"),page:pg?pg.dataset.pg:null,kind:kind(t),tag:whole?null:tag,path:whole?null:pathOf(t,sec),text:whole?null:(t.textContent||t.alt||"").replace(/\s+/g," ").trim().slice(0,300),src:src.slice(0,300)},"*")},true);
  addEventListener("message",function(e){var d=e.data||{};if(d.source!=="ct-studio")return;if(d.type==="pick"){window.ctPicking=!!d.on;if(!d.on)clear()}if(d.type==="unpick")document.querySelectorAll(".ctw-picked").forEach(function(x){x.classList.remove("ctw-picked")});if(d.type==="go"&&window.ctGo)window.ctGo(d.page);if(d.type==="view"){var b=document.querySelector('[data-vw="'+d.view+'"]');if(b)b.click()}});
  try{parent.postMessage({source:"ct-preview",type:"ready"},"*")}catch(e){}
})();`;

/** nonce : jeton des scripts du rendu (feuille de sécurité de la réponse : aucun autre script ne s'exécute). */
export type RenderOptions = { studio?: boolean; title?: string; nonce?: string; /** Aperçu posé dans le Studio (onglet Boutique, fil de SINA) : la barre de pages du thème est celle du Studio. */ embed?: boolean };

export function renderCustomTheme(p: Pick<Project, "id" | "name" | "brand">, t: CustomTheme, o: RenderOptions = {}): string {
  const lib = sectionLibrary();
  templates ??= read("templates.html");
  const name = p.brand?.name || p.name || "";
  const roleOf = (place: string) => (place === "en-tête" ? "header" : place === "pied de page" ? "footer" : place === "recherche" ? "search" : "page");
  const own = allSections(t).filter((x) => x.s.css).map((x) => x.s.css!).join("\n");
  const sampleTexts = allSections(t).some((x) => !x.s.clientTexts);
  const flags = buyFlags(featuresOf(p.id));
  const pre = `window.TB_MAP=${JSON.stringify(linkMap(t))};window.CT_NAME=${JSON.stringify(name)};window.CT_DEMO=${JSON.stringify(DEMO_BRANDS.map((d) => d.replace(/\s+/g, "\\s+")))};window.CT_LOGO=${JSON.stringify(p.brand?.logo?.assetId ? assetUrl({ id: p.brand.logo.assetId }) : null)};(function(D){var F=${JSON.stringify(flags)};for(var k in F)D[k]=F[k]})(document.documentElement.dataset);`;
  const bar = t.pages.map((pg, i) => `<button type="button" data-pgb="${esc(pg.key)}" aria-pressed="${i === 0}">${esc(pg.label)}</button>`).join("");
  const body = t.pages.map((pg, i) => `<main class="tb-pg" data-pg="${esc(pg.key)}"${i ? " hidden" : ""}>${pg.sections.map((s) => sectionMarkup(s, name, "page")).join("\n")}</main>`).join("\n");
  const shell = (s: CtSection | null, place: string) => (s ? sectionMarkup(s, name, roleOf(place)) : "");
  const title = o.title ?? `${name} — thème sur mesure`;
  const n = o.nonce ? ` nonce="${esc(o.nonce)}"` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><base href="/sections/"><title>${esc(title)}</title>
${lib.fonts.map((f) => `<link rel="stylesheet" href="${esc(f)}">`).join("")}
<link rel="stylesheet" href="/sections/library.css">
<style>${BASE_CSS}
${brandCss(p)}
${own}</style></head><body>
<script${n}>${pre}</script>
<div class="tb-bar"><span>${esc(name)} ·</span>${bar}<span>Voir en</span><button type="button" data-vw="desk" aria-pressed="true">Ordinateur</button><button type="button" data-vw="phone" aria-pressed="false">Téléphone</button></div>
<div class="tb-wrap ctw ctw-${t.family} ctw-${t.style}"><div class="frame">${shell(t.header, "en-tête")}${shell(t.search, "recherche")}
${body}
${shell(t.footer, "pied de page")}</div></div>
${withBrandName(templates, name)}
<script${n} src="/sections/library.js"></script>
<script${n}>${NAV_JS}</script>
${o.embed ? `<style>.tb-bar{display:none}.tb-wrap .zm18,.bh,.mz1,.mz2{top:0!important}.ctw-note{top:10px;bottom:auto;left:auto;right:10px;max-width:300px;font-size:11px}</style>` : ""}
${o.studio ? `${sampleTexts ? `<div class="ctw-note" aria-hidden="true">Thème sur mesure · textes et photos d'exemple encore présents : SINA les remplace par les tiens</div>` : ""}<script${n}>${PICK_JS}</script>` : ""}
</body></html>`;
}
