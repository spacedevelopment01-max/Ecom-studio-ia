/**
 * Atelier du thème (demandes du propriétaire du 10 et du 11 novembre 2026 : « je veux toutes les sections pour faire le
 * thème Éclat de thé, et trouve une autre manière que les boutons dégueulasses pour changer les sections ») : toutes
 * les sections de la banque de la famille du thème sont posées dans une seule page, aux couleurs, au nom et au logo de
 * la marque ; un panneau sur le côté montre la page choisie (toutes les pages du thème, en-tête et pied de page communs),
 * et chaque section s'y remplace, se déplace (glisser ou flèches), se retire, s'ajoute et change de disposition.
 * Point de départ : la composition actuelle du thème (textes déjà écrits pour la marque gardés). Gratuit, sans IA,
 * rien n'est enregistré dans le thème.
 */
import { FAKE_OFFER_SECTIONS, onlyFor, RETIRED_SECTIONS, SCRIPT_DEMO_SECTIONS, sectionLibrary } from "./library";
import { BLANK_CSS, BLANK_JS } from "./blank";
import { SECTION_GROUPS, sectionGroup, type SectionGroupId } from "./section-groups";
import type { CustomTheme, CtSection } from "./theme";

/** Familles de sections que l'on peut poser sur un accueil, dans l'ordre d'une page. */
export const HOME_GROUPS: SectionGroupId[] = ["en-tete", "bandeau", "ouverture", "produits", "rayons", "produit-vedette", "produit-en-scene", "histoire", "preuves", "contenus", "offres", "questions", "inscription", "pied-de-page"];

export type BuilderSlot = { uid: string; id: string; group: SectionGroupId; title: string; does?: string; note?: string | null };
/** Composition de départ de l'atelier : celle du thème (en-tête et pied de page communs à toutes les pages). */
export type BuilderStart = { header: string | null; footer: string | null; pages: { key: string; label: string; uids: string[] }[] };

/** Ce qui empêche une section d'être posée telle quelle (affiché dans l'atelier, jamais caché). */
function noteOf(id: string, demoFrame: boolean, tags: string[]): string | null {
  return demoFrame ? "démonstration seulement" : FAKE_OFFER_SECTIONS[id] ? "fausse offre : jamais posée telle quelle" : SCRIPT_DEMO_SECTIONS.has(id) ? "contenu de démonstration" : onlyFor(tags) ? `seulement pour ${onlyFor(tags)}` : null;
}

/** Thème d'essai : une seule page qui contient TOUTES les sections de la banque de la famille (celles déjà écrites pour la marque gardent leurs textes et photos). */
/**
 * En-tête d'essai à la marque (retour du propriétaire du 11 novembre 2026 : « au lieu d'être juste un header c'est toute
 * une section ») : les autres en-têtes de la banque portent le nom de la marque et le vrai menu du thème, au lieu du nom
 * d'exemple et de repères « Bouton ». Seuls le nom et les liens du premier menu changent.
 */
export function brandHeader(html: string, brand: string, menu: string[]): string {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Le panneau d'un méga-menu reste un exemple (produits et photos d'exemple) : marqué pour s'afficher vierge.
  let h = (brand ? html.replace(/Brindi/g, esc(brand)) : html).replace(/class="mega"/g, 'class="mega" data-ct-ex');
  // Chaque entrée du premier menu (lien, ou bouton d'un menu déroulant qui garde sa flèche) prend un lien du vrai menu,
  // dans l'ordre ; les entrées en trop disparaissent, les liens qui manquent s'ajoutent à la fin.
  if (menu.length) h = h.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/, (nav) => {
    let i = 0, last = "";
    const out = nav.replace(/<(a|button)\b([^>]*)>([^<]+)<\/\1>/g, (_m, tag: string, attrs: string, txt: string) => {
      if (tag === "a") last = attrs;
      if (i >= menu.length) return "";
      const arrow = / ?▾\s*$/.test(txt) ? " ▾" : "";
      return `<${tag}${attrs}>${esc(menu[i++])}${arrow}</${tag}>`;
    });
    const more = menu.slice(i).map((m) => `<a${last || ' href="#"'}>${esc(m)}</a>`).join("");
    return more ? out.replace(/<\/nav>$/, `${more}</nav>`) : out;
  });
  return h;
}
/** En-têtes qui flottent sur la photo d'ouverture au lieu d'occuper leur propre bande. */
export const FLOATING_HEADERS = new Set(["en-tete-transparent-sur-photo", "en-tete-flottant-en-pilule"]);
/** Le vrai menu et le nom de la marque, lus dans l'en-tête écrit du thème. */
function headerMenu(h: CtSection | null): { brand: string; menu: string[] } {
  const html = h?.html ?? "";
  const text = (v: string) => v.replace(/<span hidden>[\s\S]*?<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  const logo = html.match(/<a\b[^>]*class="[^"]*(?:^|[\s-])lg\b[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1];
  return { brand: logo ? text(logo) : "", menu: [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((m) => text(m[1])).filter(Boolean) };
}

export function builderTheme(t: CustomTheme, _o: { fashion?: boolean } = {}): { theme: CustomTheme; slots: BuilderSlot[]; start: BuilderStart } {
  const written = new Map<string, CtSection>();
  for (const s of [t.header, t.footer, ...t.pages.flatMap((pg) => pg.sections)]) if (s && !written.has(s.id)) written.set(s.id, s);
  const hm = headerMenu(t.header);
  const slots: BuilderSlot[] = [];
  const sections: CtSection[] = [];
  const uidOf = new Map<string, string>();
  for (const g of SECTION_GROUPS.filter((x) => x.id !== "metiers")) for (const l of sectionLibrary().sections.filter((x) => x.family === t.family && sectionGroup(x) === g.id && !RETIRED_SECTIONS[x.id])) {
    const uid = `b${slots.length}`;
    const mine = written.get(l.id);
    const head = !mine && g.id === "en-tete" && (hm.brand || hm.menu.length) ? { html: brandHeader(l.html, hm.brand, hm.menu), clientTexts: true } : {};
    sections.push({ ...(mine ?? head), uid, id: l.id });
    slots.push({ uid, id: l.id, group: g.id, title: l.title, does: l.does, note: noteOf(l.id, !!l.demoFrame, l.tags ?? []) });
    uidOf.set(l.id, uid);
  }
  const start: BuilderStart = {
    header: (t.header && uidOf.get(t.header.id)) ?? slots.find((s) => s.group === "en-tete")?.uid ?? null,
    footer: (t.footer && uidOf.get(t.footer.id)) ?? slots.find((s) => s.group === "pied-de-page")?.uid ?? null,
    pages: (t.pages.length ? t.pages : [{ key: "home", label: "Accueil", sections: [] }]).map((pg) => ({
      key: pg.key, label: pg.label,
      uids: [...new Set(pg.sections.map((s) => uidOf.get(s.id)).filter((u): u is string => !!u))],
    })),
  };
  return { theme: { ...t, header: null, footer: null, search: t.search, pages: [{ key: "home", label: "Atelier", sections }] }, slots, start };
}

const GROUP_LABELS = Object.fromEntries(SECTION_GROUPS.map((g) => [g.id, g.label]));

/** Script et style de l'atelier (posés par la route, avec le nonce de la page). */
export function builderAssets(slots: BuilderSlot[], start: BuilderStart = { header: null, footer: null, pages: [{ key: "home", label: "Accueil", uids: [] }] }, key = "atelier"): { css: string; js: string } {
  const data = JSON.stringify({ slots, start, key, groups: SECTION_GROUPS.filter((g) => g.id !== "metiers").map((g) => ({ id: g.id, label: g.label })), labels: GROUP_LABELS }).replace(/</g, "\\u003c");
  // En-têtes présentés dans une fausse fenêtre (démonstration) : seule leur barre se montre dans l'atelier, sans la fausse
  // page d'exemple (grande photo, bouton, blocs) ; l'en-tête transparent garde une bande de photo pour se lire.
  const frames = slots.filter((s) => s.group === "en-tete" && s.note === "démonstration seulement").map((s) => `[data-ct="${s.uid}"]`);
  const sel = (tail: string) => frames.map((f) => `${f} ${tail}`).join(",");
  const frameCss = frames.length ? `
${frames.join(",")}{padding:0 !important;position:relative;z-index:45}
${sel(".vp")}{height:auto;overflow:visible;border-radius:0;isolation:auto}
${sel(".vp .sc")}{position:relative;inset:auto;overflow:visible}
${sel(".vp .page")}{padding:0;gap:0}
${sel(".vp .page>*")}{display:none}
${sel(".h5w")}{margin-bottom:0}` : "";
  // En-têtes qui flottent sur l'ouverture (transparent, pilule : retours du propriétaire du 11 novembre 2026) : ils se posent
  // sur la section qui les suit, comme sur un vrai site, sans bande à eux.
  const over = slots.filter((s) => FLOATING_HEADERS.has(s.id)).map((s) => `[data-ct="${s.uid}"]`);
  const overCss = over.length ? `
${over.join(",")}{height:0;overflow:visible;position:relative;z-index:45}
${over.map((o) => `${o} .h1,${o} .h5w`).join(",")}{position:absolute;top:0;left:0;right:0;margin:0}
${over.map((o) => `html:has(${o}:not([hidden])) .sl .nav`).join(",")}{top:112px}` : "";
  const css = `${frameCss}${overCss}
html.at-on .tb-bar [data-pgb]{display:none}
html.at-on .tb-wrap,html.at-on .tb-bar{margin-left:380px}
.at-side{position:fixed;left:0;top:0;bottom:0;z-index:9000;width:380px;display:flex;flex-direction:column;background:#fbfaf7;color:#1d2b24;font:500 14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:1px 0 0 #e7e2d8,8px 0 30px rgba(0,0,0,.06)}
.at-hd{padding:18px 18px 12px;display:grid;gap:12px;border-bottom:1px solid #ece7dd}
.at-hd h2{margin:0;font:700 17px/1.2 system-ui,sans-serif;display:flex;justify-content:space-between;align-items:center;gap:8px}
.at-hd h2 small{font-weight:500;font-size:12px;opacity:.6}
.at-pages{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.at-pages button{flex:none;border:1px solid #e2dccf;background:#fff;border-radius:999px;padding:7px 12px;font:600 12.5px system-ui,sans-serif;color:#1d2b24;cursor:pointer}
.at-pages button[aria-pressed="true"]{background:#1d2b24;border-color:#1d2b24;color:#fff}
.at-tools{display:flex;gap:6px;flex-wrap:wrap}
.at-tools button{border:0;background:transparent;color:#1d2b24;font:600 12.5px system-ui,sans-serif;padding:6px 8px;border-radius:8px;cursor:pointer;opacity:.75}
.at-tools button:hover{opacity:1;background:#f0ece3}.at-tools button:disabled{opacity:.3;cursor:default;background:none}
.at-list{flex:1;overflow:auto;padding:12px 14px 18px;display:grid;gap:8px;align-content:start}
.at-sep{font:700 10.5px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.5;margin:8px 4px 0}
.at-it{background:#fff;border:1px solid #ece7dd;border-radius:14px;transition:border-color .2s,box-shadow .2s}
.at-it.sel{border-color:#c9a04e;box-shadow:0 6px 20px rgba(201,160,78,.18)}
.at-it.drag{opacity:.4}.at-it.over{box-shadow:0 -3px 0 #c9a04e}
.at-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 10px 10px 8px;cursor:pointer}
.at-grip{cursor:grab;color:#b9b1a2;font-size:15px;letter-spacing:-2px;padding:2px 4px;user-select:none}
.at-row b{display:block;font:600 13.5px/1.25 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.at-row small{display:block;font-size:11.5px;opacity:.6}
.at-act{display:flex;gap:2px}
.at-act button{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#1d2b24;cursor:pointer;font-size:14px;opacity:.55}
.at-act button:hover{opacity:1;background:#f0ece3}
.at-body{padding:2px 12px 12px;display:grid;gap:12px}
.at-body h4{margin:6px 0 0;font:700 11px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.55}
.at-sel{width:100%;border:1px solid #e2dccf;background:#fff;border-radius:10px;padding:9px 10px;font:600 13px system-ui,sans-serif;color:#1d2b24}
.at-chips button{border:1px solid #e2dccf;background:#fff;border-radius:999px;padding:6px 10px;font:600 12px system-ui,sans-serif;color:#1d2b24;cursor:pointer}
.at-chips button[aria-pressed="true"]{background:#1d2b24;color:#fff;border-color:#1d2b24}
.at-alts{display:grid;gap:6px;max-height:300px;overflow:auto;padding-right:2px}
.at-alt{text-align:left;border:1px solid #ece7dd;background:#fbfaf7;border-radius:12px;padding:9px 11px;cursor:pointer;font:inherit;color:inherit;display:grid;gap:2px}
.at-alt:hover{border-color:#c9a04e;background:#fff}.at-alt[aria-current="true"]{border-color:#1d2b24;background:#fff}
.at-alt b{font:600 13px system-ui,sans-serif}.at-alt span{font-size:11.5px;opacity:.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.at-alt em{justify-self:start;font-style:normal;font-size:10.5px;font-weight:700;color:#9a3412;background:#ffedd5;border-radius:999px;padding:2px 8px;margin-top:2px}
.at-lay{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;font-size:12.5px}
.at-seg{display:flex;flex-wrap:wrap;gap:4px}
.at-seg button{border:1px solid #e2dccf;background:#fff;border-radius:8px;padding:5px 8px;font:600 11.5px system-ui,sans-serif;color:#1d2b24;cursor:pointer}
.at-seg button[aria-pressed="true"]{background:#c9a04e;border-color:#c9a04e}
.at-add{margin-top:4px;border:1.5px dashed #d6cfbf;background:transparent;border-radius:14px;padding:12px;font:600 13px system-ui,sans-serif;color:#1d2b24;cursor:pointer}
.at-add:hover{border-color:#c9a04e;background:#fff}
.at-ft{padding:12px 16px;border-top:1px solid #ece7dd;font-size:11.5px;opacity:.65}
.at-slot{position:relative}
.at-slot::after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 0 #c9a04e;transition:box-shadow .2s;z-index:50}
.at-slot:hover::after{box-shadow:inset 0 0 0 2px rgba(201,160,78,.85)}
.at-slot.at-cur::after{box-shadow:inset 0 0 0 3px #c9a04e}
.at-slot>.at-tag{position:absolute;top:10px;left:10px;z-index:51;pointer-events:none;opacity:0;transition:opacity .2s;background:#1d2b24;color:#fff;border-radius:999px;padding:5px 11px;font:600 11.5px system-ui,sans-serif}
.at-slot:hover>.at-tag,.at-slot.at-cur>.at-tag{opacity:1}
.at-mob{display:none}
html.at-on .ct-blank-sw{left:396px;right:auto}
@media (max-width:900px){html.at-on .tb-wrap,html.at-on .tb-bar{margin-left:0}
 .at-side{top:auto;width:auto;right:0;height:62vh;border-radius:20px 20px 0 0;transform:translateY(calc(100% - 54px));transition:transform .35s cubic-bezier(.2,.8,.2,1);box-shadow:0 -10px 40px rgba(0,0,0,.18)}
 html.at-open .at-side{transform:none}
 .at-mob{display:flex;justify-content:center;align-items:center;gap:8px;height:54px;flex:none;border:0;background:transparent;font:700 14px system-ui,sans-serif;color:#1d2b24;cursor:pointer}
 .at-mob::before{content:"";width:36px;height:4px;border-radius:2px;background:#d6cfbf;position:absolute;top:8px;left:50%;margin-left:-18px}
 html.at-on .ct-blank-sw{left:auto;right:12px;bottom:66px}html.at-open .ct-blank-sw{display:none}}
`;
  const js = `(function(){var D=${data};
var main=document.querySelector('.tb-pg[data-pg="home"]');if(!main)return;var H=document.documentElement;H.classList.add("at-on");
var el={},meta={};D.slots.forEach(function(s){meta[s.uid]=s;var e=main.querySelector('[data-ct="'+s.uid+'"]');if(e){el[s.uid]=e;e.classList.add("at-slot");var t=document.createElement("span");t.className="at-tag";t.textContent=s.title;e.appendChild(t)}});
var KEY="ct-atelier-"+D.key,state,hist=[],sel=null,addMode=false;
function clone(x){return JSON.parse(JSON.stringify(x))}
function fresh(){var p={};D.start.pages.forEach(function(pg){p[pg.key]=pg.uids.filter(function(u){return el[u]}).map(function(u){return {uid:u,lay:{}}})});
 return {cur:D.start.pages[0].key,header:{uid:D.start.header,lay:{}},footer:{uid:D.start.footer,lay:{}},pages:p}}
try{state=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){state=null}
if(!state||!state.pages||!state.pages[state.cur])state=fresh();
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function push(){hist.push(clone(state));if(hist.length>40)hist.shift()}
function list(){return state.pages[state.cur]}
function all(){var a=[];if(state.header.uid)a.push({k:"header",it:state.header});list().forEach(function(it,i){a.push({k:i,it:it})});if(state.footer.uid)a.push({k:"footer",it:state.footer});return a}
function itemAt(k){return k==="header"?state.header:k==="footer"?state.footer:list()[k]}
var LAY=[["flip","Texte et image",[["","Comme prévu"],["1","Inversés"]]],["align","Alignement",[["","Comme prévu"],["left","À gauche"],["center","Centré"]]],["frame","Largeur",[["","Comme prévu"],["frame","Cadre"],["full","Pleine"]]],["bg","Fond",[["","Comme prévu"],["light","Clair"],["soft","Doux"],["dark","Foncé"]]]];
function applyLay(e,lay){LAY.forEach(function(L){var v=lay&&lay[L[0]];if(v)e.setAttribute("data-lay-"+L[0],v);else e.removeAttribute("data-lay-"+L[0])});if(window.ctLayout)window.ctLayout(e)}
function paint(){Object.keys(el).forEach(function(u){el[u].hidden=true;el[u].classList.remove("at-cur")});
 all().forEach(function(x){var e=el[x.it.uid];if(!e)return;main.appendChild(e);e.hidden=false;applyLay(e,x.it.lay)});
 if(sel!==null){var it=itemAt(sel);if(it&&el[it.uid])el[it.uid].classList.add("at-cur")}
 setTimeout(function(){dispatchEvent(new Event("resize"));dispatchEvent(new Event("scroll"))},50)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var side=document.createElement("aside");side.className="at-side";side.setAttribute("aria-label","Atelier du thème");document.body.appendChild(side);
function alts(group,cur){return D.slots.filter(function(s){return s.group===group&&el[s.uid]}).map(function(s){return '<button type="button" class="at-alt" data-pick="'+s.uid+'"'+(s.uid===cur?' aria-current="true"':"")+'><b>'+esc(s.title)+'</b><span>'+esc(s.does||"")+'</span>'+(s.note?'<em>'+esc(s.note)+'</em>':"")+'</button>'}).join("")}
function groupChips(g,attr){return '<select class="at-sel" '+attr+' aria-label="Famille de sections">'+D.groups.filter(function(x){return x.id!=="en-tete"&&x.id!=="pied-de-page"}).map(function(x){var n=D.slots.filter(function(s){return s.group===x.id&&el[s.uid]}).length;return n?'<option value="'+x.id+'"'+(x.id===g?" selected":"")+'>'+esc(x.label)+' ('+n+')</option>':""}).join("")+'</select>'}
function layHtml(lay){return '<div class="at-lay">'+LAY.map(function(L){return '<span>'+L[1]+'</span><div class="at-seg">'+L[2].map(function(o){return '<button type="button" data-lk="'+L[0]+'" data-lv="'+o[0]+'" aria-pressed="'+(((lay||{})[L[0]]||"")===o[0])+'">'+o[1]+'</button>'}).join("")+'</div>'}).join("")+'</div>'}
var addGroup="ouverture",showGroup=null;
function draw(){var pgs=D.start.pages.map(function(pg){return '<button type="button" data-page="'+pg.key+'" aria-pressed="'+(pg.key===state.cur)+'">'+esc(pg.label)+'</button>'}).join("");
 var rows=all().map(function(x,n){var m=meta[x.it.uid];if(!m)return "";var open=sel===x.k,shell=x.k==="header"||x.k==="footer";
  var g=open&&showGroup&&!shell?showGroup:m.group;
  var body=open?'<div class="at-body"><h4>Remplacer par</h4>'+(shell?"":groupChips(g,"data-sg"))+'<div class="at-alts">'+alts(g,x.it.uid)+'</div><h4>Disposition</h4>'+layHtml(x.it.lay)+'</div>':"";
  return (x.k==="header"?'<div class="at-sep">Commun à toutes les pages</div>':"")+(x.k==="footer"?'<div class="at-sep">Commun à toutes les pages</div>':"")+
  '<div class="at-it'+(open?" sel":"")+'" data-k="'+x.k+'"'+(shell?"":' draggable="true"')+'><div class="at-row"><span class="at-grip" aria-hidden="true">'+(shell?"":"⋮⋮")+'</span><span><b>'+esc(m.title)+'</b><small>'+esc(D.labels[m.group]||"")+'</small></span>'+
  (shell?"":'<span class="at-act"><button type="button" data-mv="-1" aria-label="Monter">↑</button><button type="button" data-mv="1" aria-label="Descendre">↓</button><button type="button" data-rm aria-label="Retirer">✕</button></span>')+'</div>'+body+'</div>'}).join("");
 var add=addMode?'<div class="at-it sel"><div class="at-body"><h4>Ajouter une section</h4>'+groupChips(addGroup,"data-ag")+'<div class="at-alts">'+alts(addGroup,null).replace(/data-pick=/g,"data-add=")+'</div></div></div>':'<button type="button" class="at-add">+ Ajouter une section</button>';
 side.innerHTML='<button type="button" class="at-mob">Mes sections · '+esc((D.start.pages.filter(function(p){return p.key===state.cur})[0]||{}).label||"")+'</button><div class="at-hd"><h2>Atelier du thème <small>'+list().length+' sections</small></h2><div class="at-pages">'+pgs+'</div><div class="at-tools"><button type="button" data-undo'+(hist.length?"":" disabled")+'>↶ Annuler</button><button type="button" data-copy>Ma composition</button><button type="button" data-reset>Repartir du thème</button></div></div>'+
  '<div class="at-list">'+rows+add+'</div><div class="at-ft">Gratuit · rien n\\'est enregistré dans ton thème tant que tu ne le demandes pas à SINA.</div>'}
function focus(k){var it=itemAt(k);if(it&&el[it.uid])el[it.uid].scrollIntoView({behavior:"smooth",block:"start"})}
side.addEventListener("change",function(e){var t=e.target;if(t.hasAttribute("data-ag")){addGroup=t.value;draw()}else if(t.hasAttribute("data-sg")){showGroup=t.value;draw()}});
side.addEventListener("click",function(e){if(e.target.closest("select"))return;var b=e.target.closest("button,.at-row");if(!b)return;
 if(b.classList.contains("at-mob")){H.classList.toggle("at-open");return}
 if(b.dataset.page){state.cur=b.dataset.page;sel=null;addMode=false;save();paint();draw();scrollTo(0,0);return}
 if(b.hasAttribute("data-undo")){if(hist.length){state=hist.pop();save();paint();draw()}return}
 if(b.hasAttribute("data-reset")){push();state=fresh();sel=null;save();paint();draw();return}
 if(b.hasAttribute("data-copy")){var t=D.start.pages.map(function(pg){var l=state.pages[pg.key]||[];return pg.label+" : "+l.map(function(it){return meta[it.uid].title}).join(" · ")}).join("\\n");t="En-tête : "+(meta[state.header.uid]||{}).title+"\\n"+t+"\\nPied de page : "+(meta[state.footer.uid]||{}).title;
  try{navigator.clipboard.writeText(t).then(function(){b.textContent="Copié !";setTimeout(function(){b.textContent="Ma composition"},1500)}).catch(function(){prompt0(t)})}catch(err){prompt0(t)}return}
 if(b.classList.contains("at-add")){addMode=true;sel=null;draw();return}
 if(b.dataset.add){push();var at=sel!==null&&typeof sel==="number"?sel+1:list().length;list().forEach(function(it,i){});
  if(list().some(function(it){return it.uid===b.dataset.add})){return}
  list().splice(at,0,{uid:b.dataset.add,lay:{}});addMode=false;sel=at;save();paint();draw();focus(at);return}
 var row=e.target.closest(".at-it");if(!row)return;var k=row.dataset.k;k=k==="header"||k==="footer"?k:+k;
 if(b.dataset.mv){var i=k,j=i+(+b.dataset.mv);if(j<0||j>=list().length)return;push();var x=list().splice(i,1)[0];list().splice(j,0,x);sel=j;save();paint();draw();focus(j);return}
 if(b.hasAttribute("data-rm")){push();list().splice(k,1);sel=null;save();paint();draw();return}
 if(b.dataset.pick){var it=itemAt(k);if(it.uid===b.dataset.pick)return;if(typeof k==="number"&&list().some(function(o,i){return i!==k&&o.uid===b.dataset.pick}))return;push();it.uid=b.dataset.pick;save();paint();draw();focus(k);return}
 if(b.dataset.lk){push();var it2=itemAt(k);it2.lay=it2.lay||{};if(b.dataset.lv)it2.lay[b.dataset.lk]=b.dataset.lv;else delete it2.lay[b.dataset.lk];save();paint();draw();return}
 if(b.classList.contains("at-row")){sel=sel===k?null:k;showGroup=null;addMode=false;paint();draw();if(sel!==null)focus(k)}});
function prompt0(t){var d=document.createElement("textarea");d.value=t;d.style.cssText="position:fixed;left:400px;top:80px;width:420px;height:240px;z-index:9999";document.body.appendChild(d);d.select();setTimeout(function(){d.remove()},8000)}
// Glisser-déposer pour changer l'ordre.
var dragK=null;side.addEventListener("dragstart",function(e){var r=e.target.closest(".at-it[draggable]");if(!r)return;dragK=+r.dataset.k;r.classList.add("drag");try{e.dataTransfer.setData("text/plain","x")}catch(err){}});
side.addEventListener("dragover",function(e){var r=e.target.closest(".at-it[draggable]");if(!r||dragK===null)return;e.preventDefault();[].forEach.call(side.querySelectorAll(".over"),function(x){x.classList.remove("over")});r.classList.add("over")});
side.addEventListener("drop",function(e){var r=e.target.closest(".at-it[draggable]");if(!r||dragK===null)return;e.preventDefault();var to=+r.dataset.k;if(to!==dragK){push();var x=list().splice(dragK,1)[0];list().splice(to,0,x);sel=to;save();paint()}dragK=null;draw()});
side.addEventListener("dragend",function(){dragK=null;draw()});
// Un clic sur une section de la page la choisit dans le panneau.
main.addEventListener("click",function(e){var s=e.target.closest(".at-slot");if(!s||e.target.closest("a,button,input,select,textarea,label,summary"))return;var u=s.getAttribute("data-ct");var f=all().filter(function(x){return x.it.uid===u})[0];if(!f)return;sel=f.k;showGroup=null;addMode=false;paint();draw();var r=side.querySelector('.at-it[data-k="'+f.k+'"]');if(r)r.scrollIntoView({block:"nearest"})});
paint();draw();
})();`;
  return { css: css + BLANK_CSS, js: js + "\n" + BLANK_JS };
}


/**
 * Banque complète des sections (demande du propriétaire du 10 novembre 2026 : « donne-moi la banque complète des
 * sections ») : toutes les sections d'une famille de style, rangées par famille de sections, chacune avec son nom, ce
 * qu'elle fait et ce qui l'empêche d'être posée (démonstration seulement, fausse offre, réservée à un genre de produit).
 */
export function catalogTheme(t: CustomTheme, family: CustomTheme["family"]): { theme: CustomTheme; items: (BuilderSlot & { does: string; note: string | null })[] } {
  const items: (BuilderSlot & { does: string; note: string | null })[] = [];
  const sections: CtSection[] = [];
  // Banque du propriétaire : sans les sections retirées ni la famille « Métiers et services » (thèmes du Studio, revue du
  // 10 novembre 2026).
  for (const g of SECTION_GROUPS.filter((x) => x.id !== "metiers")) for (const l of sectionLibrary().sections.filter((x) => x.family === family && sectionGroup(x) === g.id && !RETIRED_SECTIONS[x.id])) {
    const uid = `c${items.length}`;
    const note = l.demoFrame ? "démonstration seulement : jamais posée telle quelle dans un thème" : FAKE_OFFER_SECTIONS[l.id] ? "jamais posée : fausse offre ou faux compte à rebours" : SCRIPT_DEMO_SECTIONS.has(l.id) ? "jamais posée : contenu fabriqué par un script de démonstration" : onlyFor(l.tags) ? `seulement pour ${onlyFor(l.tags)}` : null;
    sections.push({ uid, id: l.id });
    items.push({ uid, id: l.id, group: g.id, title: l.title, does: l.does, note });
  }
  return { theme: { ...t, family, header: null, footer: null, pages: [{ key: "home", label: "Banque", sections }] }, items };
}

export function catalogAssets(items: ReturnType<typeof catalogTheme>["items"], family: string, other: { label: string; href: string } | null): { css: string; js: string } {
  const data = JSON.stringify({ items, groups: SECTION_GROUPS.map((g) => ({ id: g.id, label: g.label, does: g.does })), family, other }).replace(/</g, "\\u003c");
  const css = `
.cg-panel{position:sticky;top:0;z-index:300;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:10px 12px;background:#1d2b24;color:#fff;font:600 13px/1.2 system-ui,sans-serif}
.cg-panel select,.cg-panel a{font:600 13px system-ui,sans-serif;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:#fff;color:#1d2b24;padding:7px 12px;text-decoration:none}
.cg-head{padding:56px 24px 18px;background:#1d2b24;color:#fff;font:400 15px/1.45 system-ui,sans-serif;text-align:center}
.cg-head h2{margin:0 0 6px;font:700 30px/1.15 system-ui,sans-serif}
.cg-head p{margin:0 auto;max-width:640px;opacity:.8}
.cg-lab{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;padding:14px 24px;background:#f1efe9;color:#1d2b24;font:500 13px/1.4 system-ui,sans-serif;border-top:1px solid #d9d4c8}
.cg-lab b{font:700 15px system-ui,sans-serif}
.cg-lab span{flex:1 1 320px;min-width:0;opacity:.8}
.cg-lab em{font-style:normal;font-weight:700;color:#9a3412;background:#ffedd5;border-radius:999px;padding:3px 10px}
`;
  const js = `(function(){var D=${data};var main=document.querySelector('.tb-pg[data-pg="home"]');if(!main)return;
var seen={};D.items.forEach(function(it,i){var e=main.querySelector('[data-ct="'+it.uid+'"]');if(!e)return;
 if(!seen[it.group]){seen[it.group]=1;var g=D.groups.filter(function(x){return x.id===it.group})[0];var n=D.items.filter(function(x){return x.group===it.group}).length;var h=document.createElement("div");h.className="cg-head";h.id="g-"+it.group;h.innerHTML='<h2>'+g.label+' <small style="font-size:16px;opacity:.7">('+n+')</small></h2><p>'+g.does+'</p>';main.insertBefore(h,e)}
 // 4. Banque : un en-tête reste à sa place (jamais collé en haut pendant la lecture des autres sections).
 if(it.group==="en-tete"){[e].concat([].slice.call(e.querySelectorAll("*"))).forEach(function(x){var ps=getComputedStyle(x).position;if(ps==="sticky"||ps==="fixed"){x.style.position="relative";x.style.top="auto"}})}
 var l=document.createElement("div");l.className="cg-lab";l.innerHTML='<b>'+it.title+'</b><span>'+it.does+'</span>'+(it.note?'<em>'+it.note+'</em>':'');main.insertBefore(l,e)});
var p=document.createElement("div");p.className="cg-panel";p.innerHTML='<span>Banque des sections · '+(D.family==="moderne"?"Moderne":"Classique")+' · '+D.items.length+' sections</span><select aria-label="Aller à une famille"><option value="">Aller à une famille…</option>'+D.groups.filter(function(g){return seen[g.id]}).map(function(g){return '<option value="'+g.id+'">'+g.label+' ('+D.items.filter(function(x){return x.group===g.id}).length+')</option>'}).join("")+'</select>'+(D.other?'<a href="'+D.other.href+'">Voir '+D.other.label+'</a>':'');
var w=document.querySelector(".tb-wrap");w.parentNode.insertBefore(p,w);p.querySelector("select").onchange=function(){var x=document.getElementById("g-"+this.value);if(x)x.scrollIntoView({block:"start"})};
})();`;
  return { css: css + BLANK_CSS, js: js + "\n" + BLANK_JS };
}
