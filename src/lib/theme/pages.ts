/**
 * Gestion des PAGES du site dans « Modifier le thème » : opérations pures sur le spec (aucune écriture en base ici).
 *
 *  - Une page = une entrée `store.pages` + son propre gabarit `templates["page.<suffixe>"]` : la modifier ne touche à
 *    aucune autre page (une page qui partageait un gabarit reçoit sa copie avant toute modification de structure).
 *  - Mise en page d'un produit = gabarit `templates["product.<suffixe>"]` + `template_suffix` du produit. Sans
 *    affectation, le produit garde la fiche produit commune (comportement des sites existants inchangé).
 *  - Prix, variantes et disponibilité restent dans le catalogue (section Produit) : jamais recopiés en texte.
 */
import { cloneSpec, storeProducts, themeLang, type MenuLink, type StorePage, type TemplateJson, type ThemeSpec } from "./spec";
import { L } from "../i18n-server";

export class PageError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Adresse lisible : minuscules, sans accents ni espaces. */
export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "page"
  );
}

/** Adresse libre : ajoute « -2 », « -3 »… en cas de collision. */
export function uniqueHandle(spec: ThemeSpec, wanted: string, except?: string): string {
  const base = slugify(wanted);
  const taken = new Set(spec.store.pages.filter((p) => p.handle !== except).map((p) => p.handle));
  let h = base;
  for (let i = 2; taken.has(h); i++) h = `${base}-${i}`;
  return h;
}

/** Suffixe de gabarit libre (« page.<suffixe> » ou « product.<suffixe> »). */
function uniqueSuffix(spec: ThemeSpec, kind: "page" | "product", wanted: string): string {
  const base = slugify(wanted).replace(/-/g, "_").slice(0, 40) || kind;
  let s = base;
  for (let i = 2; spec.templates[`${kind}.${s}`]; i++) s = `${base}_${i}`;
  return s;
}

const templateKey = (p: StorePage) => (p.template_suffix ? `page.${p.template_suffix}` : "page");

/** Pages indispensables : contact et mentions légales (modifiables, jamais supprimables). */
export function isProtectedPage(spec: ThemeSpec, p: StorePage): boolean {
  if (/(^|[-_.])(contact|legal|mentions|cgv|conditions)/.test(`${p.handle} ${p.template_suffix}`)) return true;
  return spec.store.policies.some((x) => x.handle === p.handle);
}

const findPage = (spec: ThemeSpec, handle: string) => {
  const p = spec.store.pages.find((x) => x.handle === handle);
  if (!p) throw new PageError(L("Page introuvable.", "Page not found."), 404);
  return p;
};

/** Donne à la page son propre gabarit s'il est partagé avec une autre page (avant toute modification locale). */
export function ownTemplate(spec: ThemeSpec, handle: string): string {
  const p = findPage(spec, handle);
  const key = templateKey(p);
  const shared = spec.store.pages.filter((x) => templateKey(x) === key).length > 1;
  if (!shared && key !== "page") return key;
  const suffix = uniqueSuffix(spec, "page", p.handle);
  spec.templates[`page.${suffix}`] = JSON.parse(JSON.stringify(spec.templates[key] ?? { sections: {}, order: [] }));
  p.template_suffix = suffix;
  return `page.${suffix}`;
}

// ---------------------------------------------------------------- menu principal

const MAIN = "main-menu";
const menu = (spec: ThemeSpec) => (spec.store.menus[MAIN] ??= { title: "Menu", links: [] });
const pageUrl = (h: string) => `/pages/${h}`;
const walk = (links: MenuLink[], fn: (l: MenuLink) => void) => links.forEach((l) => (fn(l), walk(l.links ?? [], fn)));

export function inNavigation(spec: ThemeSpec, handle: string): boolean {
  let found = false;
  walk(menu(spec).links, (l) => (found ||= l.url === pageUrl(handle)));
  return found;
}

function removeLinks(links: MenuLink[], url: string): MenuLink[] {
  return links.filter((l) => l.url !== url).map((l) => (l.links ? { ...l, links: removeLinks(l.links, url) } : l));
}

export function setNavigation(spec: ThemeSpec, handle: string, show: boolean) {
  const p = findPage(spec, handle);
  const m = menu(spec);
  m.links = removeLinks(m.links, pageUrl(handle));
  if (show) m.links.push({ title: p.title, url: pageUrl(handle) });
}

/** Réorganise les liens du menu principal (premier niveau) selon l'ordre donné (adresses). */
export function reorderNavigation(spec: ThemeSpec, urls: string[]) {
  const m = menu(spec);
  const rank = new Map(urls.map((u, i) => [u, i]));
  m.links = [...m.links].sort((a, b) => (rank.get(a.url) ?? 999) - (rank.get(b.url) ?? 999));
}

// ---------------------------------------------------------------- liens internes

/** Boutons et liens des sections qui pointent vers une adresse (pour prévenir avant suppression, corriger au renommage). */
export function linksTo(spec: ThemeSpec, url: string): { where: string; section: string }[] {
  const out: { where: string; section: string }[] = [];
  const hit = (v: unknown) => typeof v === "string" && (v === url || v.startsWith(`${url}#`) || v.startsWith(`${url}?`));
  for (const [where, tpl] of [...Object.entries(spec.templates), ...Object.entries(spec.groups).map(([g, j]) => [`group:${g}`, j] as const)]) {
    for (const id of tpl.order) {
      const s = tpl.sections[id];
      if (!s) continue;
      const vals = [...Object.values(s.settings ?? {}), ...Object.values(s.blocks ?? {}).flatMap((b) => Object.values(b.settings ?? {}))];
      if (vals.some(hit)) out.push({ where, section: id });
    }
  }
  return out;
}

function rewriteLinks(spec: ThemeSpec, from: string, to: string) {
  const fix = (o: Record<string, unknown> | undefined) => {
    if (!o) return;
    for (const [k, v] of Object.entries(o)) if (typeof v === "string" && (v === from || v.startsWith(`${from}#`) || v.startsWith(`${from}?`))) o[k] = to + v.slice(from.length);
  };
  for (const tpl of [...Object.values(spec.templates), ...Object.values(spec.groups)]) {
    for (const s of Object.values(tpl.sections)) {
      fix(s.settings);
      for (const b of Object.values(s.blocks ?? {})) fix(b.settings);
    }
  }
  for (const m of Object.values(spec.store.menus)) walk(m.links, (l) => l.url === from && (l.url = to));
  for (const p of spec.store.pages) if (p.links?.booking === from) p.links.booking = to;
}

// ---------------------------------------------------------------- opérations

/** Nouvelle page depuis une structure de modèle (instance indépendante : copie profonde). */
export function addPage(input: ThemeSpec, o: { title: string; handle?: string; template: TemplateJson; model: string; service?: string; inNav?: boolean; status?: "draft" | "published" }) {
  const spec = cloneSpec(input);
  const title = o.title.trim().slice(0, 120) || "Page";
  const handle = uniqueHandle(spec, o.handle?.trim() || title);
  const suffix = uniqueSuffix(spec, "page", handle);
  spec.templates[`page.${suffix}`] = JSON.parse(JSON.stringify(o.template));
  spec.store.pages.push({ handle, title, template_suffix: suffix, body_html: "", model: o.model, status: o.status ?? "published", ...(o.service ? { links: { service: o.service } } : {}) });
  if (o.inNav !== false && o.status !== "draft") menu(spec).links.push({ title, url: pageUrl(handle) });
  addToV2Plan(spec, handle, title, suffix, o.inNav !== false);
  return { spec, handle };
}

/** Copie indépendante d'une page (contenus et structure), sous une nouvelle adresse, en brouillon. */
export function duplicatePage(input: ThemeSpec, handle: string) {
  const spec = cloneSpec(input);
  const src = findPage(spec, handle);
  const title = `${src.title} (copie)`;
  const h = uniqueHandle(spec, `${src.handle}-copie`);
  const suffix = uniqueSuffix(spec, "page", h);
  spec.templates[`page.${suffix}`] = JSON.parse(JSON.stringify(spec.templates[templateKey(src)] ?? { sections: {}, order: [] }));
  spec.store.pages.push({ ...JSON.parse(JSON.stringify(src)), handle: h, title, template_suffix: suffix, status: "draft" });
  addToV2Plan(spec, h, title, suffix, false);
  return { spec, handle: h };
}

/** Nom, adresse, SEO, état : l'adresse change partout (menus, boutons, liens de réservation). */
export function updatePage(input: ThemeSpec, handle: string, o: { title?: string; handle?: string; seo?: { title: string; description: string }; status?: "draft" | "published" }) {
  const spec = cloneSpec(input);
  const p = findPage(spec, handle);
  if (o.title !== undefined) {
    const title = o.title.trim().slice(0, 120);
    if (!title) throw new PageError(L("Le nom de la page est vide.", "The page name is empty."));
    walk(menu(spec).links, (l) => l.url === pageUrl(p.handle) && l.title === p.title && (l.title = title));
    p.title = title;
  }
  let finalHandle = p.handle;
  if (o.handle !== undefined && slugify(o.handle) !== p.handle) {
    const next = slugify(o.handle);
    // Contact et pages légales : adresse fixe (sinon une page renommée perdrait sa protection et pourrait être supprimée).
    if (isProtectedPage(spec, p)) throw new PageError(L("L'adresse d'une page indispensable (contact ou informations légales) ne peut pas changer.", "The address of an essential page (contact or legal information) cannot change."), 409);
    if (spec.store.pages.some((x) => x.handle === next)) throw new PageError(L(`L'adresse /pages/${next} est déjà utilisée par une autre page.`, `The address /pages/${next} is already used by another page.`), 409);
    rewriteLinks(spec, pageUrl(p.handle), pageUrl(next));
    const plan = spec.meta?.v2?.plan as { handle?: string; url?: string }[] | undefined;
    for (const e of plan ?? []) if (e.handle === p.handle) Object.assign(e, { handle: next, url: pageUrl(next) });
    p.handle = next;
    finalHandle = next;
  }
  if (o.seo) p.seo = { title: o.seo.title.trim().slice(0, 70), description: o.seo.description.trim().slice(0, 320) };
  if (o.status) {
    p.status = o.status;
    // Un brouillon n'apparaît dans aucun menu (pas de lien vers une page non publiée).
    if (o.status === "draft") for (const m of Object.values(spec.store.menus)) m.links = removeLinks(m.links, pageUrl(finalHandle));
  }
  return { spec, handle: finalHandle };
}

/**
 * Suppression : refusée pour une page indispensable. `confirm` absent : renvoie seulement les dépendances (liens du
 * menu, boutons des autres pages, liens de réservation) pour prévenir le client.
 */
export function removePage(input: ThemeSpec, handle: string, confirm: boolean) {
  const spec = cloneSpec(input);
  const p = findPage(spec, handle);
  if (isProtectedPage(spec, p)) throw new PageError(L("Cette page est indispensable au site (contact ou informations légales) : vous pouvez la modifier, pas la supprimer.", "This page is essential to the site (contact or legal information): you can edit it, not delete it."), 409);
  const url = pageUrl(handle);
  const deps = {
    menu: Object.values(spec.store.menus).some((m) => {
      let f = false;
      walk(m.links, (l) => (f ||= l.url === url));
      return f;
    }),
    buttons: linksTo(spec, url).filter((x) => x.where !== templateKey(p)).length,
    booking: spec.store.pages.filter((x) => x.links?.booking === url).length,
  };
  if (!confirm) return { spec: input, deps, removed: false };
  for (const m of Object.values(spec.store.menus)) m.links = removeLinks(m.links, url);
  spec.store.pages = spec.store.pages.filter((x) => x.handle !== handle);
  const key = templateKey(p);
  if (key !== "page" && !spec.store.pages.some((x) => templateKey(x) === key)) delete spec.templates[key];
  if (spec.meta?.v2?.plan) spec.meta.v2.plan = (spec.meta.v2.plan as { handle?: string }[]).filter((e) => e.handle !== handle) as any;
  return { spec, deps, removed: true };
}

/**
 * Changement de modèle d'une page existante : nouvelle structure, en reprenant les réglages des sections de même
 * type (titres, textes, images) ; l'ancienne version reste restaurable dans l'historique. Médias jamais supprimés.
 */
export function changePageModel(input: ThemeSpec, handle: string, next: TemplateJson, model: string) {
  const spec = cloneSpec(input);
  const key = ownTemplate(spec, handle);
  const old = spec.templates[key];
  const pool = new Map<string, { settings: Record<string, unknown>; blocks?: unknown; block_order?: string[] }[]>();
  for (const id of old?.order ?? []) {
    const s = old!.sections[id];
    if (s) pool.set(s.type, [...(pool.get(s.type) ?? []), s]);
  }
  const fresh: TemplateJson = JSON.parse(JSON.stringify(next));
  let kept = 0;
  for (const id of fresh.order) {
    const s = fresh.sections[id];
    const prev = pool.get(s.type)?.shift();
    if (!prev) continue;
    // Contenus du client conservés ; le modèle ne complète que ce qui manquait.
    s.settings = { ...s.settings, ...prev.settings };
    if (prev.blocks && Object.keys(prev.blocks as object).length) {
      s.blocks = JSON.parse(JSON.stringify(prev.blocks));
      s.block_order = [...(prev.block_order ?? Object.keys(prev.blocks as object))];
    }
    kept++;
  }
  spec.templates[key] = fresh;
  findPage(spec, handle).model = model;
  return { spec, kept };
}

/** Destination du bouton de réservation d'une page de prestation (lien HTTPS ou page interne du site). */
export function setBookingLink(input: ThemeSpec, handle: string, url: string | null, fallback: string | null = null) {
  const lang = themeLang(input);
  const spec = cloneSpec(input);
  const p = findPage(spec, handle);
  if (url && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(url) && !(/^\/pages\/[a-z0-9-]+$/.test(url) && spec.store.pages.some((x) => pageUrl(x.handle) === url))) {
    throw new PageError(L("Indiquez un lien sécurisé (https://…) vers votre calendrier, ou une page de réservation du site.", "Enter a secure link (https://…) to your calendar, or a booking page on the site."));
  }
  const old = p.links?.booking;
  p.links = { ...(p.links ?? {}), booking: url ?? undefined };
  const tpl = spec.templates[ownTemplate(spec, handle)];
  const isBookingButton = (label: unknown, link: unknown) => /rendez-vous|appointment|réserver|book/i.test(String(label ?? "")) || (!!old && link === old) || (!!fallback && link === fallback);
  // Boutons de réservation de la page : vers la nouvelle destination ; sans calendrier, vers le contact (jamais de bouton mort).
  for (const id of tpl.order) {
    const st = tpl.sections[id].settings;
    for (const [label, link] of [["button_label", "button_link"], ["button2_label", "button2_link"]] as const) {
      if (!st[label] || !isBookingButton(st[label], st[link])) continue;
      if (url) {
        st[link] = url;
        st[label] = lang === "en" ? "Book an appointment" : "Prendre rendez-vous";
      } else if (fallback) {
        st[link] = fallback;
        st[label] = lang === "en" ? "Contact us" : "Nous contacter";
      } else st[label] = "";
    }
  }
  return { spec };
}

// ---------------------------------------------------------------- mises en page produit

export function productLayouts(spec: ThemeSpec) {
  return Object.keys(spec.templates)
    .filter((k) => k.startsWith("product."))
    .map((k) => ({ suffix: k.slice(8), products: storeProducts(spec).filter((p) => p.template_suffix === k.slice(8)).map((p) => p.handle) }));
}

/** Crée la mise en page propre à un produit (copie indépendante) et la lui affecte. */
export function addProductLayout(input: ThemeSpec, productHandle: string, template: TemplateJson, name: string) {
  const spec = cloneSpec(input);
  const prod = storeProducts(spec).find((p) => p.handle === productHandle);
  if (!prod) throw new PageError(L("Produit introuvable.", "Product not found."), 404);
  const suffix = uniqueSuffix(spec, "product", name || productHandle);
  spec.templates[`product.${suffix}`] = JSON.parse(JSON.stringify(template));
  setProductSuffix(spec, productHandle, suffix);
  return { spec, suffix };
}

/** Affecte une mise en page existante (ou la fiche commune avec null) ; la mise en page n'est jamais supprimée ici. */
export function assignProductLayout(input: ThemeSpec, productHandle: string, suffix: string | null) {
  const spec = cloneSpec(input);
  if (suffix && !spec.templates[`product.${suffix}`]) throw new PageError(L("Mise en page introuvable.", "Layout not found."), 404);
  if (!storeProducts(spec).some((p) => p.handle === productHandle)) throw new PageError(L("Produit introuvable.", "Product not found."), 404);
  setProductSuffix(spec, productHandle, suffix);
  return { spec };
}

/** Copie indépendante de la mise en page d'un produit pour un autre produit. */
export function duplicateProductLayout(input: ThemeSpec, fromSuffix: string, toProduct: string) {
  const src = input.templates[`product.${fromSuffix}`];
  if (!src) throw new PageError(L("Mise en page introuvable.", "Layout not found."), 404);
  return addProductLayout(input, toProduct, src, `${fromSuffix}-${toProduct}`);
}

function setProductSuffix(spec: ThemeSpec, handle: string, suffix: string | null) {
  const apply = (p: { handle: string; template_suffix?: string }) => {
    if (p.handle !== handle) return;
    if (suffix) p.template_suffix = suffix;
    else delete p.template_suffix;
  };
  apply(spec.store.product);
  for (const p of spec.store.products ?? []) apply(p);
}

/** Page ajoutée aussi au plan des sites Theme V2 (liste des pages de l'éditeur). */
function addToV2Plan(spec: ThemeSpec, handle: string, title: string, suffix: string, inNav: boolean) {
  const plan = spec.meta?.v2?.plan as unknown[] | undefined;
  if (!Array.isArray(plan)) return;
  plan.push({ key: `page-${handle}`, title, handle, url: pageUrl(handle), template: `page.${suffix}`, inNav, required: false, missing: [], complete: true });
}
