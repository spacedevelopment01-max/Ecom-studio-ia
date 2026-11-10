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
import { buyBlockData, withRealBuyBlock } from "./buy-block";
import { authenticSection, DEMO_BRANDS, inversionClass, LIBRARY_DIR, sectionLibrary, withBrandName } from "./library";
import { allSections, sectionHtml, type CtSection, type CustomTheme } from "./theme";
import { all } from "../../db";

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
  // Couleurs de la marque posées avec la même force que celles de la bibliothèque (:where ne compte pas) : elles les
  // remplacent, et les règles du fond inversé (.ct-inv …) gardent la main sur elles.
  if (pal) {
    const mix = (a: string, c: string, pct: number) => `color-mix(in srgb,${a} ${pct}%,${c})`;
    set(":root", { "--b-dark": pal.dark, "--b-ink": pal.dark, "--b-primary": pal.primary, "--b-gold": pal.accent, "--b-soft": pal.light });
    // Sections Classique à palette d'exemple (classes tA, tB, tN posées sur la section, qui écrasaient la marque) : même
    // rôle pour chaque couleur que dans l'exemple : 1 encre sombre, 2 couleur de la marque, 3 teinte claire de la marque,
    // 4 fond clair, 5 accent.
    set(":root,.tA,.tB,.tN", { "--c1": pal.dark, "--c2": pal.primary, "--c3": mix(pal.light, pal.primary, 86), "--c4": mix(pal.light, pal.dark, 95), "--c5": pal.accent });
    set(":where(.ctw) .el", { "--e-nv": pal.dark, "--e-nv2": mix(pal.dark, pal.light, 88), "--e-or": pal.primary, "--e-tl": pal.accent, "--e-cr": pal.light, "--e-gr": pal.secondary, "--e-ink": pal.dark });
    set(":where(.ctw) .dq", { "--q-bk": pal.dark, "--q-gr": mix(pal.dark, pal.light, 90), "--q-lm": pal.primary, "--q-rd": pal.accent, "--q-tx": pal.light, "--q-mu": mix(pal.light, pal.dark, 62), "--q-ln": mix(pal.light, pal.dark, 14) });
    set(".ctw", { "--tb-ac": pal.primary, "--tb-tbg": pal.dark, "--tb-tfg": pal.light });
    // Fond du site : sombre pour le style Streetwear néon, clair sinon ; deux sombres qui alternent (jamais deux bandes
    // de la même couleur collées).
    set(".ctw>.frame", { background: pal.light });
    set(".ctw-streetwear-neon>.frame", { background: pal.dark });
    set(".dq:where(.ctw-streetwear-neon .tb-pg>:nth-of-type(even):not(.dq2,.dq5,.dq7))", { "--q-bk": mix(pal.dark, pal.light, 93) });
    set(":where(.ctw) .dq5", { color: pal.dark });
    // Bloc d'achat : bouton et prix à la couleur de la marque, texte du bouton lisible dessus.
    const on = readableOn(pal.primary, pal.dark, pal.light);
    set(":where(.ctw) .po.mo-dk", { "--po-ac": pal.primary, "--po-on": on, "--po-bg": mix(pal.light, pal.dark, 6), "--po-ln": mix(pal.light, pal.dark, 14), "--po-mu": mix(pal.light, pal.dark, 62) });
    set(":where(.ctw) .po.mo-lt", { "--po-ac": pal.dark, "--po-on": pal.light, "--po-ln": mix(pal.dark, pal.light, 16) });
  }
  if (H || B) {
    set(":root", { "--f-title": H, "--f-ui": B });
    set(":where(.ctw) .el", { "--e-t": H, "--e-s": H, "--e-u": B });
    set(":where(.ctw) .dq", { "--q-t": H, "--q-u": B });
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
    // Vrai délai du client (« min-max-heure limite ») : la date estimée n'est plus « 2 à 3 jours d'exemple ».
    poShip: f.delivery ? `${f.delivery.minDays}-${f.delivery.maxDays}-${f.delivery.cutoffHour ?? ""}` : "",
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
  shop: ["Boutique", "Boutique en ligne", "Nouveautés", "Collections", "Collection", "Tout voir", "Tout le catalogue", "Découvrir", "Voir la collection", "Explorer la collection", "Femme", "Homme", "Le drop", "Soldes", "Nos produits", "Nos mélanges", "Coffrets", "Accessoires", "Chaussures", "Continuer mes achats"],
  cart: ["Panier", "Voir le panier"],
  commande: ["Passer commande", "Valider mon panier", "Commander"],
  compte: ["Mon compte", "Favoris", "Se connecter"],
  aide: ["Aide", "Livraison", "Retours", "Retours et échanges", "Questions", "Suivi de commande", "Suivre ma commande"],
  contact: ["Contact", "Écris-nous", "Nous écrire"],
  about: ["À propos", "Notre histoire", "La marque", "Tous les looks"],
  journal: ["Journal", "Le journal", "Tous les articles", "Blog"],
  home: ["Accueil", "Retour à l'accueil"],
};
/** Pages légales : un seul onglet ouvert selon le lien (« legal:cgv »). */
const LEGAL_WORDS: Record<string, string> = { "Mentions légales": "mentions", "Conditions générales": "cgv", "Conditions générales de vente": "cgv", "Confidentialité": "confidentialite", "Remboursements": "retours", "Cookies": "cookies" };
function linkMap(t: CustomTheme): Record<string, string> {
  const keys = new Set(t.pages.map((p) => p.key));
  const out: Record<string, string> = {};
  for (const [k, words] of Object.entries(LINK_WORDS)) {
    const target = keys.has(k) ? k : k === "about" && keys.has("journal") ? "journal" : k === "journal" && keys.has("about") ? "about" : k === "aide" && keys.has("contact") ? "contact" : null;
    if (target) for (const w of words) out[w] = target;
  }
  const product = t.pages.find((p) => /^product/.test(p.key))?.key;
  if (product) for (const w of ["Livraison", "Retours", "Guide des tailles", "Questions"]) out[w] ??= product;
  if (keys.has("legal")) for (const [w, tab] of Object.entries(LEGAL_WORDS)) out[w] = `legal:${tab}`;
  for (const p of t.pages) out[p.label] = p.key;
  // Liens écrits pour la marque (rédacteur) : chaque bouton mène à la page prévue, quel que soit son texte.
  for (const x of allSections(t)) for (const [text, to] of Object.entries(x.s.links ?? {})) if (keys.has(to.split(":")[0])) out[text.replace(/[→↗]/g, "").replace(/\s+/g, " ").trim()] = to;
  return out;
}

/**
 * Cadre « Photo à fournir » (exigence 6.8) : à la place d'une photo d'exemple que SINA ne peut pas inventer
 * (réalisations, photos de clients, biens), jamais la photo d'une autre marque présentée comme celle du client.
 */
export function provideFrame(kind: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#EEEAE3"/><rect x="40" y="40" width="1120" height="1120" fill="none" stroke="#9A9184" stroke-width="6" stroke-dasharray="26 18"/><text x="600" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="84" font-weight="700" fill="#2B2722">Photo à fournir</text><text x="600" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" fill="#4A443C">SINA ne peut pas inventer ${esc(kind)}.</text><text x="600" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#6B6359">Envoie ta vraie photo avec le trombone.</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** HTML d'une section du thème, marqué de son identifiant (désignation, règles propres). */
export function sectionMarkup(s: CtSection, brandName: string, role: string, business: "products" | "services" = "products"): string {
  // Textes du client : jamais touchés (« Au solstice d'été, rupture de stock » restait abîmé, audit du 10 novembre 2026).
  let html = s.clientTexts ? sectionHtml(s) : withBrandName(sectionHtml(s), brandName);
  const authentic = authenticSection(s.id, business);
  if (authentic) { const frame = provideFrame(authentic); html = html.replace(/(?:\.\/)?photos\/[\w-]+\.(?:webp|png|jpe?g)/g, frame); }
  const marked = html.replace(/^\s*<(section|footer)\b/, `<$1 data-ct="${s.uid}" data-ct-role="${role}"${s.clientTexts ? " data-ct-own" : ""}`);
  // Fond voulu différent du fond d'origine (section inversable) : enveloppe sans effet sur la mise en page.
  const inv = inversionClass(s.id, s.ground);
  return inv ? `<div class="ct-inv ${inv}">${marked}</div>` : marked;
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
.tb-bump{animation:tbBump .5s}
@keyframes tbBump{40%{transform:scale(1.6)}}
.tb-toast{position:fixed;left:12px;right:12px;bottom:16px;margin:0 auto;max-width:440px;box-sizing:border-box;z-index:9500;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 10px 10px 10px;background:var(--tb-tbg,#111);color:var(--tb-tfg,#fff);border:1px solid color-mix(in srgb,var(--tb-ac,#E8622C) 60%,transparent);border-radius:var(--tb-r,16px);box-shadow:0 18px 44px rgba(0,0,0,.38);font-family:var(--tb-font,system-ui,sans-serif);transform:translateY(calc(100% + 30px));opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
.tb-toast.on{transform:none;opacity:1}
.tb-toast>img{width:46px;height:46px;object-fit:cover;border-radius:calc(var(--tb-r,16px) * .6);background:rgba(255,255,255,.08)}
.tb-toast>i{width:40px;height:40px;display:grid;place-items:center;border-radius:calc(var(--tb-r,16px) * .6);background:var(--tb-ac,#E8622C);color:var(--tb-tbg,#111)}
.tb-toast>i svg{width:22px;height:22px}
.tb-toast>span{display:grid;gap:2px;min-width:0}
.tb-toast b{font-weight:700;font-size:.92rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb-toast small{font-size:.78rem;opacity:.68;white-space:nowrap}
.tb-toast button{border:0;background:none;color:var(--tb-ac,#E8622C);font:700 .74rem/1 var(--tb-font,system-ui,sans-serif);letter-spacing:.1em;text-transform:uppercase;padding:12px 8px;white-space:nowrap;cursor:pointer}
.tb-toast button:hover{text-decoration:underline;text-underline-offset:4px}
.tb-pg>section,.tb-pg>footer{border-radius:0}
.tb-wrap .zm18{position:fixed;inset:0;z-index:9000;min-height:0;padding:0;background:none;pointer-events:none;visibility:hidden;transition:visibility 0s .55s}
.tb-wrap .zm18.op{pointer-events:auto;visibility:visible;transition:none}
.tb-wrap .zm18-bg,.tb-wrap .zm18-op{display:none}
.tb-wrap .zm18-ov{overflow-y:auto;background:var(--q-bk,#0B0C0B)}
.ctw .mz1,.ctw .mz2{position:sticky;top:var(--tb-h,43px);z-index:60}
@media (max-width:700px){
  .tb-bar{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding:8px 10px}
  .tb-bar::-webkit-scrollbar{display:none}
  .tb-bar button{flex:none}.tb-bar>span{white-space:nowrap}.tb-bar .tb-vw{display:none}
  .tb-wrap{padding:0}.tb-wrap.phone>.frame{width:100%;border:0;border-radius:0;margin-top:0;box-shadow:none}
}
.ctw .mz2{box-shadow:0 6px 20px rgba(30,42,50,.06)}
/* en-tête du site posé à part : celui intégré à une ouverture est masqué (jamais deux en-têtes) */
.ctw .el1-hd,.ctw .dq1-hd{display:none}
.ctw .el1{padding-top:14px}
.ctw .zm9-tx img:nth-of-type(3){display:none}
.ctw .map--real{display:grid;place-items:center;align-content:center;gap:10px;min-height:220px;padding:24px;text-align:center;text-decoration:none;color:inherit;background:repeating-linear-gradient(45deg,rgba(0,0,0,.035) 0 12px,transparent 12px 24px),color-mix(in srgb,var(--b-soft,#F3EFE7) 70%,#fff)}
.ctw .map--real .map-real{display:flex;align-items:center;gap:10px;font-weight:600}
.ctw .map--real .map-real b{color:var(--b-primary,#8B5E34)}
.ctw-logo{display:block;max-height:44px;width:auto;max-width:180px;object-fit:contain}
.ctw-note{position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(560px,calc(100% - 24px));font:500 12px/1.35 system-ui,sans-serif;background:rgba(20,18,16,.88);color:#fff;padding:8px 12px;border-radius:12px;pointer-events:none}
`;

/** Panier du site : chaque « Ajouter » d'une section met à jour le compteur de l'en-tête (aperçu). */
const CART_JS = `(function(){
  // Panier du site : chaque « Ajouter » de n'importe quelle section met à jour le compteur de l'en-tête (démonstration)
  var wrap=document.querySelector(".tb-wrap");if(!wrap)return;
  function badges(){return [].slice.call(wrap.querySelectorAll('button[aria-label="Panier"]')).map(function(b){return [].slice.call(b.querySelectorAll("*")).filter(function(x){return !x.children.length&&/^\\d+$/.test(x.textContent.trim())})[0]}).filter(Boolean)}
  var n=null,tm,CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  // le compteur part du contenu réel de la page Panier du thème (jamais 0 avec un panier rempli)
  if(window.TB_CART_N!=null){n=+window.TB_CART_N;badges().forEach(function(b){b.textContent=n})}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function add(k,img){if(!(k>0))return;var bs=badges();if(n===null)n=bs.length?+bs[0].textContent.trim():0;n+=k;
    bs.forEach(function(b){b.textContent=n;b.classList.remove("tb-bump");void b.offsetWidth;b.classList.add("tb-bump")});
    var t=wrap.querySelector(".tb-toast");if(!t){t=document.createElement("div");t.className="tb-toast";t.setAttribute("role","status");wrap.appendChild(t)}
    var src=img&&img.getAttribute("src");
    t.innerHTML=(src?'<img src="'+esc(src)+'" alt="">':'<i>'+CHECK+'</i>')+'<span><b>'+(k>1?k+" articles ajoutés":"Ajouté au panier")+'</b><small>Panier : '+n+(n>1?" articles":" article")+'</small></span><button type="button" data-tbcart>Voir le panier</button>';
    t.classList.remove("on");void t.offsetWidth;t.classList.add("on");clearTimeout(tm);tm=setTimeout(function(){t.classList.remove("on")},3800)}
  // Réseaux sociaux : le lien du compte de la marque se renseigne dans les réglages (jamais un faux compte)
  function note(msg){var t=wrap.querySelector(".tb-toast");if(!t){t=document.createElement("div");t.className="tb-toast";t.setAttribute("role","status");wrap.appendChild(t)}
    t.innerHTML='<i>'+CHECK.replace('<path d="M5 12.5l4.5 4.5L19 7"/>','<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')+'</i><span><b>'+esc(msg)+'</b><small>Lien à ajouter par la marque</small></span>';
    t.classList.remove("on");void t.offsetWidth;t.classList.add("on");clearTimeout(tm);tm=setTimeout(function(){t.classList.remove("on")},3200)}
  function pic(el){var s=el&&el.closest("article,figure,li,label,section");var i=s&&s.querySelector("img");return i}
  document.addEventListener("click",function(e){var t=e.target;
    if(t.closest&&t.closest("[data-tbcart]")){t.closest(".tb-toast").classList.remove("on");if(window.TB_GO)window.TB_GO("cart");return}
    if(!t.closest||!wrap.contains(t)||window.ctPicking)return;
    var so=t.closest("a");if(so){var nm=(so.getAttribute("aria-label")||so.textContent).trim();if(/^(Instagram|TikTok|Pinterest|Facebook|YouTube|LinkedIn|X)$/i.test(nm)){e.preventDefault();note("Compte "+nm+" de la marque");return}}
    var po=t.closest("[data-pogo]");if(po){var s=po.closest("section")||wrap,q=1;[].forEach.call(s.querySelectorAll('[aria-pressed="true"],[aria-checked="true"],input[type=radio]:checked'),function(x){var m=/^\\s*(\\d+)\\s*(paires?|pièces?|flacons?|lots?|boîtes?|sachets?|x\\b)/i.exec((x.closest("label")||x).textContent);if(m)q=+m[1]});
      q+=s.querySelectorAll('input[type=checkbox]:checked').length;add(q,s.querySelector("[data-pomain] img, .po img, img"));return}
    var d=t.closest(".dq3-ad");if(d){var tile=d.closest("article");if(tile&&tile.querySelector('.dq3-sz [aria-pressed="true"]'))add(1,pic(d));return}
    var one=t.closest(".el3-ad,.el3-qa,.zm6-c button");if(one){add(1,pic(one));return}
    var b=t.closest("button");if(!b)return;var tx=b.textContent.replace(/\\s+/g," ").trim();
    if(/^Ajouter la tenue/.test(tx)){var sc=b.closest("section");add(Math.max(1,sc?sc.querySelectorAll('[aria-pressed="true"]').length:1));return}
    if(/^Ajouter le look/.test(tx)){var sl=b.closest("section");add(Math.max(1,sl?sl.querySelectorAll(".zm3-pt").length:1));return}
  });
})();`;

/** Navigation entre les pages, vue téléphone, recherche par la loupe, carte produit qui ouvre SA fiche. */
const NAV_JS = `(function(){
  var wrap=document.querySelector(".tb-wrap"),pages=[].slice.call(document.querySelectorAll(".tb-pg"));
  var bar=document.querySelector(".tb-bar");function barH(){if(bar)document.documentElement.style.setProperty("--tb-h",bar.offsetHeight+"px")}barH();addEventListener("resize",barH);
  // « shop:Femme » filtre la grille, « legal:cgv » ouvre l'onglet, « article:lin » montre cet article
  function go(p){var a=String(p).split(":"),k=a[0],arg=a.slice(1).join(":");var pg=document.querySelector('.tb-pg[data-pg="'+k+'"]');if(!pg)return;pages.forEach(function(x){x.hidden=x.dataset.pg!==k});
    document.querySelectorAll("[data-pgb]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.pgb===k))});
    var arts=pg.querySelectorAll("[data-tbart]");if(arts.length){var want=arg||arts[0].dataset.tbart;[].forEach.call(arts,function(x){x.hidden=x.dataset.tbart!==want})}
    window.scrollTo(0,0);try{parent.postMessage({source:"ct-preview",type:"page",page:k},"*")}catch(e){}
    if(arg){var tab=pg.querySelector('[data-cm5t="'+arg+'"]');if(tab)tab.click();var chip=pg.querySelector('.zm5-ch [data-c="'+arg+'"]');if(chip)chip.click()}
    setTimeout(function(){window.dispatchEvent(new Event("resize"));window.dispatchEvent(new Event("scroll"))},60)}
  window.TB_GO=go;
  window.ctGo=go;
  var prod=pages.map(function(x){return x.dataset.pg}).filter(function(k){return /^product/.test(k)})[0];
  document.addEventListener("click",function(e){
    if(window.ctPicking)return;
    var b=e.target.closest("[data-pgb]");if(b){go(b.dataset.pgb);return}
    var v=e.target.closest("[data-vw]");if(v){wrap.classList.toggle("phone",v.dataset.vw==="phone");document.querySelectorAll("[data-vw]").forEach(function(x){x.setAttribute("aria-pressed",String(x===v))});setTimeout(function(){window.dispatchEvent(new Event("resize"))},450);return}
    var pay=e.target.closest("a,button");if(pay&&window.CT_PAY&&!pay.dataset.go&&/^(Passer commande|Valider mon panier|Commander|Paiement sécurisé|Payer)/i.test((pay.textContent||"").trim())){e.preventDefault();note(window.CT_PAY);return}
    var a=e.target.closest("[data-go]");if(a){e.preventDefault();go(a.dataset.go);var mo=document.querySelector(".mz2.op,.mz1.is-mob");if(mo){mo.classList.remove("op","is-mob")}return}
    var sb=e.target.closest('button[aria-label="Rechercher"]');var zs=document.querySelector(".tb-wrap .zm18");if(sb&&zs&&!sb.closest(".zm18")){e.preventDefault();var mo2=document.querySelector(".mz2.op,.mz1.is-mob");if(mo2)mo2.classList.remove("op","is-mob");var o=zs.querySelector("[data-zm18o]");if(o)o.click();return}
    var an=e.target.closest("a[href]");if(an&&!(an.target==="_blank"&&/^https:\\/\\//.test(an.getAttribute("href")||"")))e.preventDefault();
    if(e.target.closest("button,input,select,label,form,textarea"))return;
    var c=e.target.closest(".el3-im,.dq3-im,.zm5-c,.zm6-c,.zm18-rs a,.mz5-l a");if(c&&prod){e.preventDefault();if(zs)zs.classList.remove("op");if(c.closest(".mz5-l")&&document.querySelector('.tb-pg[data-pg="shop"]')){go("shop");return}go(prod);openProduct(c)}
  },true);
  function openProduct(c){var im=c.querySelector("img")||c.closest("article,li,div").querySelector("img");var f=im&&(im.getAttribute("src")||"").split("/").pop();
    var pg=document.querySelector('.tb-pg[data-pg="'+prod+'"]');if(!pg)return;var s=[].slice.call(pg.querySelectorAll("section")).find(function(x){return x._po&&x._po.gam});if(!s)return;
    var k=s._po.gam.findIndex(function(g){return String(g[0]).split("/").pop()===f});s._po.pick(k>-1?k:s._po.g0)}
  var MAP=window.TB_MAP||{};document.querySelectorAll(".tb-wrap a:not([data-go]), .tb-wrap button[aria-label]:not([data-go])").forEach(function(x){var t=(x.tagName==="BUTTON"?x.getAttribute("aria-label"):x.textContent).replace(/[→↗]/g,"").replace(/\\s+/g," ").trim(),u=t.replace(/\\s*\\d+\\s*pièces?$/,"").trim();var to=MAP[t]||MAP[u];if(to)x.dataset.go=to});
  var lg=window.CT_LOGO;if(lg)document.querySelectorAll('[data-ct-role="header"] [class$="-lg"],[data-ct-role="header"] .lg,[data-ct-role="footer"] [class$="-lg"]').forEach(function(x){x.innerHTML='<img class="ctw-logo" src="'+lg+'" alt="'+String(window.CT_NAME||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")+'">'});
  // Textes écrits par les scripts des sections : jamais le nom d'une marque de démonstration (remplacé par celle du client).
  var NM=window.CT_NAME||"",RX=new RegExp("\\\\b("+(window.CT_DEMO||[]).join("|")+")\\\\b","g");
  function brand(root,all){if(!NM||!RX.source||RX.source==="\\\\b()\\\\b")return;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){if(!all&&n.parentNode&&n.parentNode.closest&&n.parentNode.closest("[data-ct-own]"))continue;if(RX.test(n.nodeValue)){RX.lastIndex=0;n.nodeValue=n.nodeValue.replace(RX,function(m){return m===m.toUpperCase()?NM.toUpperCase():m===m.toLowerCase()?NM.toLowerCase():NM})}RX.lastIndex=0}}
  if(wrap){brand(wrap);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(x){if(x.nodeType===1||x.nodeType===3)brand(x.nodeType===1?x:x.parentNode||wrap,true)})})}).observe(wrap,{childList:true,subtree:true})}
  var first=(location.hash||"").replace("#","");go(first&&document.querySelector('.tb-pg[data-pg="'+first.split(":")[0]+'"]')?first:pages[0]&&pages[0].dataset.pg);
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
    parent.postMessage({source:"ct-preview",type:"picked",uid:sec.getAttribute("data-ct"),role:sec.getAttribute("data-ct-role"),page:pg?pg.dataset.pg:null,kind:kind(t),tag:whole?null:tag,path:whole?null:pathOf(t,sec),text:whole?null:(t.textContent||t.alt||"").replace(/\\s+/g," ").trim().slice(0,300),src:src.slice(0,300)},"*")},true);
  addEventListener("message",function(e){var d=e.data||{};if(d.source!=="ct-studio")return;if(d.type==="pick"){window.ctPicking=!!d.on;if(!d.on)clear()}if(d.type==="unpick")document.querySelectorAll(".ctw-picked").forEach(function(x){x.classList.remove("ctw-picked")});if(d.type==="go"&&window.ctGo)window.ctGo(d.page);if(d.type==="view"){var b=document.querySelector('[data-vw="'+d.view+'"]');if(b)b.click()}});
  try{parent.postMessage({source:"ct-preview",type:"ready"},"*")}catch(e){}
})();`;

/** nonce : jeton des scripts du rendu (feuille de sécurité de la réponse : aucun autre script ne s'exécute). */
export type RenderOptions = { studio?: boolean; title?: string; nonce?: string; /** Aperçu posé dans le Studio (onglet Boutique, fil de SINA) : la barre de pages du thème est celle du Studio. */ embed?: boolean };

/**
 * Carte de l'adresse : jamais une image (essai réel du 9 novembre 2026 : un plan de quartier DESSINÉ par l'IA, avec un
 * repère, montré comme la vraie carte). Le cadre ouvre la vraie carte OpenStreetMap à l'adresse du client ; sans adresse,
 * « [À compléter : adresse] ».
 */
export function realMap(html: string, address: string | null): string {
  if (!/<a class="map"/.test(html)) return html;
  const q = encodeURIComponent(address ?? "");
  const label = address ? esc(address) : "[À compléter : adresse]";
  let out = html.replace(/<a class="map"[^>]*>[\s\S]*?<\/a>/, address
    ? `<a class="map map--real" href="https://www.openstreetmap.org/search?query=${q}" target="_blank" rel="noopener" aria-label="Ouvrir la carte de l'adresse"><span class="map-real"><b aria-hidden="true">◉</b>${label}</span><span class="go">Voir l'adresse sur la carte</span><span class="osm">© contributeurs OpenStreetMap</span></a>`
    : `<div class="map map--real"><span class="map-real">${label}</span></div>`);
  if (address) out = out.replace(/href="https:\/\/www\.openstreetmap\.org\/directions[^"]*"/g, `href="https://www.openstreetmap.org/directions?to=${q}"`).replace(/href="https:\/\/www\.google\.[a-z.]+\/maps[^"]*"/g, `href="https://www.google.com/maps/search/?api=1&amp;query=${q}"`);
  return out;
}
function projectAddress(projectId: string): string | null {
  try { const row = all<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id=?", projectId)[0]; const a = row ? (JSON.parse(row.settings_json || "{}").company?.address ?? "") : ""; return typeof a === "string" && a.trim() ? a.trim() : null; } catch { return null; }
}

export function renderCustomTheme(p: Pick<Project, "id" | "name" | "brand"> & { business?: Project["business"]; platform?: Project["platform"] }, t: CustomTheme, o: RenderOptions = {}): string {
  const lib = sectionLibrary();
  templates ??= read("templates.html");
  const name = p.brand?.name || p.name || "";
  const roleOf = (place: string) => (place === "en-tête" ? "header" : place === "pied de page" ? "footer" : place === "recherche" ? "search" : "page");
  const own = allSections(t).filter((x) => x.s.css).map((x) => x.s.css!).join("\n");
  const sampleTexts = allSections(t).some((x) => !x.s.clientTexts);
  const flags = buyFlags(featuresOf(p.id));
  // Bloc d'achat : les vraies données du produit du client (jamais les prix et remises d'exemple de la bibliothèque).
  const buy = (() => { try { return buyBlockData(p.id); } catch { return null; } })();
  const pay = (p.platform ?? "shopify") === "shopify" && !t.pages.some((pg) => pg.key === "commande") ? "Sur ta boutique Shopify, ce bouton ouvre le paiement sécurisé de Shopify." : null;
  const pre = `window.CT_PAY=${JSON.stringify(pay).replace(/</g, "\\u003c")};window.TB_MAP=${JSON.stringify(linkMap(t))};window.CT_NAME=${JSON.stringify(name)};window.CT_DEMO=${JSON.stringify(DEMO_BRANDS.flatMap((d) => [d, d.toUpperCase()]).map((d) => d.replace(/\s+/g, "\\s+")))};window.CT_LOGO=${JSON.stringify(p.brand?.logo?.assetId ? assetUrl({ id: p.brand.logo.assetId }) : null)};(function(D){var F=${JSON.stringify(flags)};for(var k in F)D[k]=F[k]})(document.documentElement.dataset);`;
  const bar = t.pages.map((pg, i) => `<button type="button" data-pgb="${esc(pg.key)}" aria-pressed="${i === 0}">${esc(pg.label)}</button>`).join("");
  const address = projectAddress(p.id);
  const body = t.pages.map((pg, i) => `<main class="tb-pg" data-pg="${esc(pg.key)}"${i ? " hidden" : ""}>${pg.sections.map((s) => realMap(withRealBuyBlock(sectionMarkup(s, name, "page", p.business === "services" ? "services" : "products"), buy), address)).join("\n")}</main>`).join("\n");
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
<div class="tb-bar"><span>${esc(name)} ·</span>${bar}<span class="tb-vw">Voir en</span><button class="tb-vw" type="button" data-vw="desk" aria-pressed="true">Ordinateur</button><button class="tb-vw" type="button" data-vw="phone" aria-pressed="false">Téléphone</button></div>
<div class="tb-wrap ctw ctw-${t.family} ctw-${t.style}"><div class="frame">${shell(t.header, "en-tête")}${shell(t.search, "recherche")}
${body}
${shell(t.footer, "pied de page")}</div></div>
${withBrandName(templates, name)}
<script${n} src="/sections/library.js"></script>
<script${n}>${NAV_JS}</script><script${n}>${CART_JS}</script>
${o.embed ? `<style>.tb-bar{display:none}.tb-wrap .zm18,.bh,.mz1,.mz2{top:0!important}.ctw-note{top:10px;bottom:auto;left:auto;right:10px;max-width:300px;font-size:11px}</style>` : ""}
${o.studio ? `${sampleTexts ? `<div class="ctw-note" aria-hidden="true">Thème sur mesure · textes et photos d'exemple encore présents : SINA les remplace par les tiens</div>` : ""}<script${n}>${PICK_JS}</script>` : ""}
</body></html>`;
}
