/**
 * Mode construction de l'accueil (essai du propriétaire du 10 novembre 2026 : « est-ce que tu pourrais me faire faire
 * la page d'accueil à moi… que j'essaie un truc ») : toutes les sections permises de la famille du thème sont posées
 * dans une seule page, aux couleurs, au nom et au logo de la marque ; le script de la page n'en montre que la
 * composition choisie (en-tête, N sections, inscription, pied de page) et donne, sur chaque section, « Changer cette
 * section », « Précédente » et « Garder », et en haut le nombre de sections et « Changer toute la page ».
 * Gratuit, sans IA, rien n'est enregistré dans le thème.
 */
import { FAKE_OFFER_SECTIONS, familySections, onlyFor, SCRIPT_DEMO_SECTIONS, sectionLibrary, type LibSection } from "./library";
import { SECTION_GROUPS, sectionGroup, type SectionGroupId } from "./section-groups";
import type { CustomTheme, CtSection } from "./theme";

/** Familles de sections que l'on peut poser sur un accueil, dans l'ordre d'une page. */
export const HOME_GROUPS: SectionGroupId[] = ["en-tete", "bandeau", "ouverture", "produits", "rayons", "produit-vedette", "produit-en-scene", "histoire", "preuves", "contenus", "offres", "questions", "inscription", "pied-de-page"];

export type BuilderSlot = { uid: string; id: string; group: SectionGroupId; title: string };

/** Thème d'essai : une seule page qui contient toutes les sections candidates (celles déjà écrites pour la marque gardent leurs textes et photos). */
export function builderTheme(t: CustomTheme, o: { fashion?: boolean } = {}): { theme: CustomTheme; slots: BuilderSlot[] } {
  const written = new Map<string, CtSection>();
  for (const s of [t.header, t.footer, ...t.pages.flatMap((pg) => pg.sections)]) if (s && !written.has(s.id)) written.set(s.id, s);
  const ok = (l: LibSection) => !FAKE_OFFER_SECTIONS[l.id] && (o.fashion || !/mode/.test(onlyFor(l.tags) ?? ""));
  const slots: BuilderSlot[] = [];
  const sections: CtSection[] = [];
  for (const g of HOME_GROUPS) for (const l of familySections(t.family).filter((x) => sectionGroup(x) === g && ok(x))) {
    const uid = `b${slots.length}`;
    const mine = written.get(l.id);
    sections.push({ ...(mine ?? {}), uid, id: l.id });
    slots.push({ uid, id: l.id, group: g, title: l.title });
  }
  return { theme: { ...t, header: null, footer: null, search: t.search, pages: [{ key: "home", label: "Accueil", sections }] }, slots };
}

const GROUP_LABELS = Object.fromEntries(SECTION_GROUPS.map((g) => [g.id, g.label]));

/** Script et style du mode construction (posés par la route, avec le nonce de la page). */
export function builderAssets(slots: BuilderSlot[]): { css: string; js: string } {
  const data = JSON.stringify({ slots, labels: GROUP_LABELS }).replace(/</g, "\\u003c");
  const css = `
.bd-panel{position:sticky;top:0;z-index:300;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:10px 12px;background:#1d2b24;color:#fff;font:600 13px/1.2 system-ui,sans-serif}
.bd-panel select,.bd-panel button{font:600 13px system-ui,sans-serif;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:#fff;color:#1d2b24;padding:7px 12px;cursor:pointer}
.bd-panel button.bd-main{background:#c9a04e;border-color:#c9a04e;color:#1d2b24}
.bd-panel small{opacity:.75;font-weight:500}
.bd-slot{position:relative}
.bd-bar{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:250;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;max-width:calc(100% - 20px);padding:6px 8px;border-radius:14px;background:rgba(20,30,25,.86);color:#fff;font:600 12px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.bd-bar b{font-weight:700;margin:0 4px}
.bd-bar small{opacity:.7;font-weight:500}
.bd-bar button,.bd-bar select{font:600 12px system-ui,sans-serif;border:0;border-radius:999px;padding:6px 10px;cursor:pointer;background:#fff;color:#1d2b24}
.bd-bar button.bd-spin{background:#c9a04e}
.bd-bar button[aria-pressed="true"]{background:#7fd1a0}
.bd-bar button:disabled{opacity:.4;cursor:default}
.bd-note{position:fixed;left:12px;bottom:12px;z-index:300;max-width:340px;padding:10px 12px;border-radius:12px;background:#fff8e6;color:#3a2f12;font:500 12px/1.35 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.bd-list{position:fixed;inset:10% 10% auto;z-index:400;max-height:80vh;overflow:auto;padding:18px;border-radius:16px;background:#fff;color:#1d2b24;font:500 14px/1.5 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.bd-list ol{margin:8px 0 12px 20px}
`;
  const js = `(function(){var D=${data};
var main=document.querySelector('.tb-pg[data-pg="home"]');if(!main)return;
var el={};D.slots.forEach(function(s){el[s.uid]=main.querySelector('[data-ct="'+s.uid+'"]')});
var byG={};D.slots.forEach(function(s){if(el[s.uid])(byG[s.group]=byG[s.group]||[]).push(s)});
var MIDDLE=["produits","rayons","produit-vedette","produit-en-scene","histoire","preuves","contenus","offres","questions"];
var CARD={produits:1,rayons:1};
function rnd(a){return a[Math.floor(Math.random()*a.length)]}
var state;try{state=JSON.parse(localStorage.getItem("bd-state")||"null")}catch(e){state=null}
function save(){try{localStorage.setItem("bd-state",JSON.stringify(state))}catch(e){}}
function used(except){var u={};state.slots.forEach(function(x,i){if(i!==except)u[x.uid]=1});return u}
function pick(group,except,avoid){var u=used(except),c=(byG[group]||[]).filter(function(s){return !u[s.uid]&&s.uid!==avoid});if(!c.length)c=(byG[group]||[]).filter(function(s){return s.uid!==avoid});return c.length?rnd(c).uid:null}
function groupsFor(n){var out=[],last=null,cards=0,feat=0,count={};var pool=MIDDLE.filter(function(g){return byG[g]&&byG[g].length});
 var must=["produits","rayons"].filter(function(g){return byG[g]&&byG[g].length});var first=must.length?rnd(must):null;
 for(var i=0;i<n;i++){var c=pool.filter(function(g){return g!==last&&(count[g]||0)<(g==="histoire"||g==="preuves"?2:1)&&!(CARD[g]&&cards)&&!(g==="produit-vedette"&&feat)});
  var g=(i===1&&first&&c.indexOf(first)>=0)?first:(c.length?rnd(c):null);if(!g)break;out.push(g);last=g;count[g]=(count[g]||0)+1;if(CARD[g])cards++;if(g==="produit-vedette")feat++}
 return out}
function compose(n,keepLocked){var old=state&&state.slots||[];var gs=["en-tete"].concat(byG.bandeau?[]:[]).concat(["ouverture"]).concat(groupsFor(n-1)).concat(["inscription","pied-de-page"]);
 state={n:n,slots:[]};gs.forEach(function(g,i){var prev=old.filter(function(o){return o.locked&&o.group===g})[0];state.slots.push(prev&&keepLocked?{group:g,uid:prev.uid,locked:true,hist:[]}:{group:g,uid:null,locked:false,hist:[]})});
 state.slots.forEach(function(s,i){if(!s.uid)s.uid=pick(s.group,i)});state.slots=state.slots.filter(function(s){return s.uid});save();draw()}
function draw(){D.slots.forEach(function(s){var e=el[s.uid];if(e){e.hidden=true;e.classList.remove("bd-slot");var b=e.querySelector(":scope>.bd-bar");if(b)b.remove()}});
 state.slots.forEach(function(s,i){var e=el[s.uid];if(!e)return;main.appendChild(e);e.hidden=false;e.classList.add("bd-slot");
  var meta=D.slots.filter(function(x){return x.uid===s.uid})[0];var n=(byG[s.group]||[]).length;
  var bar=document.createElement("div");bar.className="bd-bar";
  var opts=Object.keys(byG).filter(function(g){return g!=="en-tete"&&g!=="pied-de-page"}).map(function(g){return '<option value="'+g+'"'+(g===s.group?" selected":"")+'>'+D.labels[g]+'</option>'}).join("");
  bar.innerHTML='<b>'+(i+1)+'. '+D.labels[s.group]+'</b><small>'+meta.title+' · '+n+' au choix</small>'+
   '<button type="button" class="bd-spin">Changer cette section</button><button type="button" class="bd-back"'+(s.hist.length?"":" disabled")+'>Précédente</button>'+
   '<button type="button" class="bd-lock" aria-pressed="'+s.locked+'">'+(s.locked?"Gardée":"Garder")+'</button>'+
   (s.group!=="en-tete"&&s.group!=="pied-de-page"?'<select class="bd-grp" aria-label="Famille de section">'+opts+'</select>':"");
  bar.querySelector(".bd-spin").onclick=function(){var u=pick(s.group,i,s.uid);if(u&&u!==s.uid){s.hist.push(s.uid);s.uid=u;s.locked=false;save();draw();el[u].scrollIntoView({block:"start"})}};
  bar.querySelector(".bd-back").onclick=function(){if(!s.hist.length)return;s.uid=s.hist.pop();save();draw();el[s.uid].scrollIntoView({block:"start"})};
  bar.querySelector(".bd-lock").onclick=function(){s.locked=!s.locked;save();draw()};
  var sel=bar.querySelector(".bd-grp");if(sel)sel.onchange=function(){var u=pick(sel.value,i);if(u){s.hist.push(s.uid);s.group=sel.value;s.uid=u;save();draw();el[u].scrollIntoView({block:"start"})}};
  e.insertBefore(bar,e.firstChild)});
 var c=document.querySelector(".bd-count");if(c)c.value=String(state.n)}
var panel=document.createElement("div");panel.className="bd-panel";
var sizes="";for(var k=5;k<=10;k++)sizes+='<option value="'+k+'">'+k+' sections</option>';
panel.innerHTML='<span>Construis ton accueil</span><select class="bd-count" aria-label="Nombre de sections">'+sizes+'</select><button type="button" class="bd-main bd-all">Changer toute la page</button><button type="button" class="bd-show">Ma composition</button><small>gratuit · rien n\\'est enregistré dans ton thème</small>';
var wrap=document.querySelector(".tb-wrap");wrap.parentNode.insertBefore(panel,wrap);
panel.querySelector(".bd-count").onchange=function(){compose(+this.value,true)};
panel.querySelector(".bd-all").onclick=function(){compose(state.n,true);window.scrollTo(0,0)};
panel.querySelector(".bd-show").onclick=function(){var d=document.createElement("div");d.className="bd-list";d.innerHTML='<b>Ta composition</b><ol>'+state.slots.map(function(s){var m=D.slots.filter(function(x){return x.uid===s.uid})[0];return '<li>'+D.labels[s.group]+' : '+m.title+'</li>'}).join("")+'</ol><button type="button">Fermer</button>';d.querySelector("button").onclick=function(){d.remove()};document.body.appendChild(d)};
var note=document.createElement("div");note.className="bd-note";note.textContent="Les sections que SINA n'a pas encore écrites pour toi montrent des textes et photos d'exemple : elle les remplace par les tiens à la fin.";document.body.appendChild(note);setTimeout(function(){note.remove()},9000);
if(state&&state.slots&&state.slots.every(function(s){return el[s.uid]}))draw();else compose(7,false);
})();`;
  return { css, js };
}

/**
 * Banque complète des sections (demande du propriétaire du 10 novembre 2026 : « donne-moi la banque complète des
 * sections ») : toutes les sections d'une famille de style, rangées par famille de sections, chacune avec son nom, ce
 * qu'elle fait et ce qui l'empêche d'être posée (démonstration seulement, fausse offre, réservée à un genre de produit).
 */
export function catalogTheme(t: CustomTheme, family: CustomTheme["family"]): { theme: CustomTheme; items: (BuilderSlot & { does: string; note: string | null })[] } {
  const items: (BuilderSlot & { does: string; note: string | null })[] = [];
  const sections: CtSection[] = [];
  for (const g of SECTION_GROUPS) for (const l of sectionLibrary().sections.filter((x) => x.family === family && sectionGroup(x) === g.id)) {
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
 var l=document.createElement("div");l.className="cg-lab";l.innerHTML='<b>'+it.title+'</b><span>'+it.does+'</span>'+(it.note?'<em>'+it.note+'</em>':'');main.insertBefore(l,e)});
var p=document.createElement("div");p.className="cg-panel";p.innerHTML='<span>Banque des sections · '+(D.family==="moderne"?"Moderne":"Classique")+' · '+D.items.length+' sections</span><select aria-label="Aller à une famille"><option value="">Aller à une famille…</option>'+D.groups.filter(function(g){return seen[g.id]}).map(function(g){return '<option value="'+g.id+'">'+g.label+' ('+D.items.filter(function(x){return x.group===g.id}).length+')</option>'}).join("")+'</select>'+(D.other?'<a href="'+D.other.href+'">Voir '+D.other.label+'</a>':'');
var w=document.querySelector(".tb-wrap");w.parentNode.insertBefore(p,w);p.querySelector("select").onchange=function(){var x=document.getElementById("g-"+this.value);if(x)x.scrollIntoView({block:"start"})};
})();`;
  return { css, js };
}
