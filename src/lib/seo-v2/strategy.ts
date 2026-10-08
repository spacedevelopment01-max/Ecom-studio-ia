/**
 * Stratégie SEO d'un projet : objectifs, public, thèmes, pages prioritaires, groupes de mots-clés, maillage interne,
 * opportunités locales, contenus à améliorer et calendrier éditorial. Gratuite et déterministe : elle découle de la
 * recherche de mots-clés (hypothèses sémantiques) et des pages existantes ou prévues. Une boutique et une entreprise
 * de services n'ont ni les mêmes objectifs, ni les mêmes pages, ni le même calendrier.
 */
import type { Project } from "../projects";
import { all } from "../db";
import { verifiedFacts } from "./facts";
import { researchKeywords } from "./keywords";
import { contentIntent } from "./intent";
import { fold, langPack } from "./lang";
import { sitePages } from "./pages";
import type { ContentLang, ContentType, KeywordResearch, PageRef, SeoStrategy } from "./types";

const tr = (lang: ContentLang, fr: string, en: string, es: string) => (lang === "fr" ? fr : lang === "es" ? es : en);

/** Contenus existants à améliorer (articles du blog) : constats vérifiables localement. */
function toImprove(projectId: string, lang: ContentLang): SeoStrategy["improve"] {
  const rows = all<{ title: string; meta_title: string | null; meta_description: string | null; body_html: string | null }>("SELECT title, meta_title, meta_description, body_html FROM blog_articles WHERE project_id = ? AND deleted_at IS NULL", projectId);
  const out: SeoStrategy["improve"] = [];
  for (const r of rows) {
    const issues: string[] = [];
    if (!r.meta_title?.trim()) issues.push(tr(lang, "titre SEO absent", "missing SEO title", "falta el título SEO"));
    else if (r.meta_title.length > 65) issues.push(tr(lang, `titre SEO long (${r.meta_title.length} caractères)`, `long SEO title (${r.meta_title.length} chars)`, `título SEO largo (${r.meta_title.length} caracteres)`));
    if (!r.meta_description?.trim()) issues.push(tr(lang, "méta-description absente", "missing meta description", "falta la meta descripción"));
    if (/\[(À|A) compléter/i.test(r.body_html ?? "")) issues.push(tr(lang, "informations à compléter dans le texte", "information to complete in the text", "información por completar"));
    if (issues.length) out.push({ page: r.title, issues });
  }
  return out;
}

export function seoStrategy(p: Project, lang: ContentLang, o: { pages?: PageRef[]; research?: KeywordResearch; langs?: ContentLang[] } = {}): SeoStrategy {
  const L = langPack(lang);
  const pages = o.pages ?? sitePages(p);
  const r = o.research ?? researchKeywords(p, lang, pages);
  const f = verifiedFacts(p);
  const services = p.business === "services";
  const main = r.clusters[0];

  const objectives = services
    ? [
        tr(lang, `Être trouvé sur « ${main?.primary.term ?? f.category} » par les habitants de la zone`, `Be found for "${main?.primary.term ?? f.category}" by people in the area`, `Aparecer en «${main?.primary.term ?? f.category}» para la gente de la zona`),
        tr(lang, "Une page claire par prestation réellement proposée", "One clear page per service actually offered", "Una página clara por cada servicio ofrecido"),
        tr(lang, `Transformer les visites en demandes (${f.contact.bookingUrl ? "réservation" : f.contact.mode === "call" && f.contact.phone ? "appel" : f.contact.mode === "quote" ? "demande de devis" : "contact"})`, "Turn visits into requests (call, booking or quote)", "Convertir visitas en solicitudes (llamada, reserva o presupuesto)"),
        tr(lang, "Répondre aux questions des clients avant le premier contact (articles, FAQ)", "Answer customer questions before first contact (articles, FAQ)", "Responder las preguntas de los clientes antes del primer contacto"),
      ]
    : [
        tr(lang, `Faire trouver la fiche produit sur les recherches d'achat (« ${main?.primary.term ?? f.category} »)`, `Get the product page found on buying searches ("${main?.primary.term ?? f.category}")`, `Que la ficha de producto aparezca en búsquedas de compra («${main?.primary.term ?? f.category}»)`),
        tr(lang, "Capter les recherches d'information (choisir, utiliser, entretenir) avec des articles reliés à la fiche", "Capture informational searches (choose, use, care) with articles linked to the product page", "Captar búsquedas informativas con artículos enlazados a la ficha"),
        tr(lang, "Lever les doutes d'achat avec des faits confirmés (caractéristiques, FAQ)", "Remove buying doubts with confirmed facts (specs, FAQ)", "Resolver dudas de compra con datos confirmados"),
      ];

  // Pages prioritaires : chaque page porte UN groupe (pas de cannibalisation) ; les pages sans groupe gardent leur rôle.
  const typeOf = (k: PageRef["kind"]): ContentType => (k === "product" ? "product_page" : k === "collection" ? "category_page" : k === "service" ? "service_page" : k === "home" ? "home_page" : k === "local" ? "local_page" : k === "article" ? "blog_article" : "brand_page");
  const priorityPages: SeoStrategy["priorityPages"] = [];
  for (const pg of pages.filter((x) => x.kind !== "article")) {
    const c = r.clusters.find((x) => x.page?.key === pg.key);
    const local = pg.kind === "local" ? r.clusters.find((x) => x.primary.intent === "local") : null;
    const why =
      pg.kind === "home"
        ? tr(lang, "porte la recherche principale et oriente vers les autres pages", "carries the main search and leads to the other pages", "lleva la búsqueda principal")
        : pg.kind === "service"
          ? tr(lang, "prestation déclarée : une page dédiée répond à une recherche précise", "declared service: a dedicated page answers a precise search", "servicio declarado: una página dedicada")
          : pg.kind === "product"
            ? tr(lang, "page qui vend : recherches d'achat", "page that sells: buying searches", "página que vende")
            : pg.kind === "collection"
              ? tr(lang, "regroupe les produits d'une même famille", "groups products of one family", "agrupa los productos de una familia")
              : pg.kind === "local"
                ? tr(lang, "une seule page locale utile pour la zone réelle", "one useful local page for the real area", "una única página local útil")
                : tr(lang, "rassure : qui est derrière la marque", "reassures: who is behind the brand", "da confianza: quién está detrás");
    // La page locale ne reprend pas la requête de l'accueil (cannibalisation) : elle vise les questions de la zone.
    const primaryKeyword = pg.kind === "local" ? (local && local.page?.key !== "home:accueil" ? local.primary.term : null) : (c?.primary.term ?? null);
    priorityPages.push({ ...pg, why, primaryKeyword, intent: contentIntent(typeOf(pg.kind), { business: p.business }) });
  }
  const rank: Record<PageRef["kind"], number> = services ? { home: 0, service: 1, local: 2, brand: 3, product: 4, collection: 4, page: 5, article: 6 } : { product: 0, collection: 1, home: 2, brand: 3, service: 4, local: 4, page: 5, article: 6 };
  priorityPages.sort((a, b) => rank[a.kind] - rank[b.kind]);

  // Maillage : accueil → pages commerciales ; articles (groupes d'information) → la page qui vend ou fait contacter.
  const linking: SeoStrategy["linking"] = [];
  const st = (a: PageRef | null | undefined, b: PageRef | null | undefined) => (a?.status === "existing" && b?.status === "existing" ? "existing" : "planned") as "existing" | "planned";
  const home = pages.find((x) => x.kind === "home") ?? null;
  const money = pages.filter((x) => (services ? x.kind === "service" : x.kind === "product" || x.kind === "collection"));
  const label = (pg: PageRef | null | undefined) => (!pg ? tr(lang, "Accueil", "Home", "Inicio") : pg.kind === "home" ? `${tr(lang, "Accueil", "Home", "Inicio")} (${pg.title})` : pg.kind === "brand" ? `${tr(lang, "À propos", "About", "Quiénes somos")} (${pg.title})` : pg.title);
  for (const m of money) linking.push({ from: label(home), to: m.title, anchor: r.clusters.find((c) => c.page?.key === m.key)?.primary.term ?? m.title, status: st(home, m) });
  for (const c of r.clusters.filter((x) => !x.page)) {
    const target = money.find((m) => fold(c.theme).includes(fold(m.title).split(" ")[0])) ?? money[0] ?? home;
    if (target) linking.push({ from: c.primary.term, to: target.title, anchor: r.clusters.find((x) => x.page?.key === target.key)?.primary.term ?? target.title, status: "planned" });
  }
  const brand = pages.find((x) => x.kind === "brand");
  if (brand && home && brand.key !== home.key) linking.push({ from: label(brand), to: label(home), anchor: f.brand, status: st(brand, home) });

  const local = services
    ? {
        area: f.area,
        opportunities: r.opportunities.filter((x) => /locale|local/i.test(x)),
        schema: [
          tr(lang, "LocalBusiness avec nom, zone desservie et coordonnées confirmées uniquement (aucune adresse inventée)", "LocalBusiness with name, area served and confirmed contact details only (no invented address)", "LocalBusiness con nombre, zona y datos confirmados únicamente"),
          ...(f.services.length ? [tr(lang, "Service pour chaque prestation déclarée", "Service for each declared service", "Service por cada servicio declarado")] : []),
          tr(lang, "FAQPage seulement pour des questions réellement affichées sur la page", "FAQPage only for questions actually shown on the page", "FAQPage solo para preguntas mostradas en la página"),
        ],
      }
    : null;

  // Calendrier : groupes d'information non portés par une page, puis questions — jamais la requête d'une page existante.
  const owned = new Set(r.clusters.filter((c) => c.page).map((c) => fold(c.primary.term)));
  // Questions déjà répondues par le client : elles vont dans la FAQ de la page, pas dans un article.
  const answered = new Set(f.answers.map((a) => fold(a.q).replace(/\s*\?\s*$/, "")));
  const ideas: { title: string; keyword: string; intent: SeoStrategy["calendar"][number]["intent"] }[] = [];
  const push = (term: string, intent: SeoStrategy["calendar"][number]["intent"]) => {
    const k = fold(term).replace(/\s*\?\s*$/, "");
    if (owned.has(k) || answered.has(k) || ideas.some((i) => fold(i.keyword) === k)) return;
    ideas.push({ title: cap(term.trim()), keyword: term.trim(), intent });
  };
  for (const c of r.clusters) {
    if (!c.page) push(c.primary.term, c.primary.intent);
    for (const q of c.questions) push(q, "informational");
  }
  const calendar = ideas.slice(0, 8).map((x, k) => ({ week: k * 2 + 1, title: x.title, keyword: x.keyword, intent: x.intent, type: "blog_article" as ContentType }));

  const langs = o.langs ?? [lang];
  const hreflang = {
    recommended: langs.length > 1,
    note:
      langs.length > 1
        ? tr(lang, `Recommandation : déclarer les versions ${langs.join(", ")} avec des balises hreflang réciproques (à mettre en place et vérifier sur le site — non implémenté par le studio).`, `Recommendation: declare the ${langs.join(", ")} versions with reciprocal hreflang tags (to set up and verify on the site — not implemented by the studio).`, `Recomendación: declarar las versiones ${langs.join(", ")} con etiquetas hreflang recíprocas (a configurar en el sitio).`)
        : tr(lang, "Une seule langue : pas de hreflang nécessaire pour l'instant.", "Single language: no hreflang needed for now.", "Un solo idioma: no se necesita hreflang por ahora."),
  };

  return {
    lang,
    business: p.business,
    objectives,
    audience: f.audience ?? L.unknown(tr(lang, "public visé", "target audience", "público objetivo")),
    themes: [...new Set(r.clusters.map((c) => c.theme))],
    priorityPages,
    clusters: r.clusters,
    linking,
    local,
    improve: toImprove(p.id, lang),
    calendar,
    hreflang,
    dataNote: r.dataNote,
    gaps: [...f.unknowns, ...r.opportunities.filter((x) => /confirm/i.test(x))],
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
