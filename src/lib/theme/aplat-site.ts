/**
 * Site d'artisan APLAT (planches du 25 octobre, PR #187) : ce que le moteur pose quand un projet de services choisit ce
 * thème. La structure des planches est reprise avec les données du client : prestations, méthode, questions,
 * coordonnées, façon de contacter et photos du projet. Aucune photo, coordonnée, réalisation, durée ni prix de la
 * démonstration n'est repris ; ce qui manque reste « À renseigner » (pages légales) ou n'est pas affiché (réalisations,
 * conseils et comparaison avant/après n'apparaissent pas tant que le client n'a pas de vraies photos de chantier).
 * Pages : accueil, prestations, notre approche (page « À propos » du projet), questions, contact, devis (si le client
 * accepte les demandes de devis), confirmation, mentions légales, confidentialité, cookies et page introuvable.
 */
// Types seulement : ce fichier est chargé par l'onglet Marque du studio (navigateur), via directions.ts.
import type { ServiceProfile } from "../project-types";
import type { ShopCopy } from "./copy";
import type { SectionInstance, TemplateJson, ThemeSpec } from "./spec";

type Lang = "fr" | "en";
type Block = { type: string; settings: Record<string, unknown> };

export type AplatSiteInput = {
  lang: Lang;
  shopName: string;
  profile: ServiceProfile;
  copy: ShopCopy;
  /** Plan du site de services (services-site.ts) : adresses, appel à l'action, méthode et questions déjà rédigées. */
  plan: {
    urls: { services: string; about: string; contact: string; faq: string; legal: string };
    cta: { label: string; url: string };
    steps: { title: string; text: string }[];
    faqItems: { q: string; a: string }[];
    mode: string;
  };
  /** Photos du projet (aucune photo de démonstration) : ouverture, photos générales, photo de chaque prestation. */
  images: { hero?: string; photos: string[]; byService?: Record<string, string>; logo?: string; logoLight?: string };
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => `<p>${esc(s)}</p>`;
const norm = (n: string) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const two = (i: number) => String(i + 1).padStart(2, "0");

export function addAplatSite(spec: ThemeSpec, input: AplatSiteInput) {
  const { lang, profile, copy, plan, images: im } = input;
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const R = t("À renseigner", "To be completed");
  // Réglages donnés seulement : les valeurs par défaut viennent du schéma de la section au rendu (comme Shopify).
  const section = (type: string, settings: Record<string, unknown>, blocks: Block[] = []): SectionInstance =>
    ({ type, settings, blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: b.settings }])), block_order: blocks.map((_, i) => `b${i}`) });
  const template = (rows: [string, SectionInstance | null][]): TemplateJson => {
    const ok = rows.filter((r): r is [string, SectionInstance] => !!r[1]);
    return { order: ok.map(([k]) => k), sections: Object.fromEntries(ok) };
  };
  const card = (settings: Record<string, unknown>): Block => ({ type: "card", settings });
  const q = (question: string, answer: string): Block => ({ type: "question", settings: { question, answer: /^\s*</.test(answer) ? answer : p(answer) } });
  const fld = (settings: Record<string, unknown>): Block => ({ type: "field", settings: { error: t("Veuillez renseigner ce champ.", "Please fill in this field."), ...settings } });

  const services = profile.services.filter((s) => s.name.trim()).slice(0, 6);
  const quote = plan.mode === "quote" || (profile.contactModes ?? []).includes("quote");
  const URL = {
    services: plan.urls.services, about: plan.urls.about, contact: plan.urls.contact, faq: plan.urls.faq, legal: plan.urls.legal,
    quote: `/pages/${t("devis", "quote")}`, confirmation: "/pages/confirmation", privacy: `/pages/${t("confidentialite", "privacy")}`, cookies: "/pages/cookies",
  };
  const handle = (u: string) => u.split("/").pop()!.split("#")[0];
  const askUrl = quote ? URL.quote : plan.cta.url;
  const askLabel = plan.cta.label;

  // Photos : celle de l'ouverture, puis les photos générales ; chaque prestation prend sa photo, sinon une générale.
  const hero = im.hero || im.photos[0] || "";
  const general = im.photos.filter((f) => f !== hero);
  const pool = general.length ? general : hero ? [hero] : [];
  const serviceImage = (name: string, i: number) => im.byService?.[norm(name)] ?? pool[i % Math.max(1, pool.length)] ?? "";
  const photo = (i: number) => pool[i % Math.max(1, pool.length)] ?? hero;

  const heading = copy.hero.heading.trim() || input.shopName;
  const text = copy.hero.text.trim();
  const faq = plan.faqItems.slice(0, 8);
  const steps = plan.steps.slice(0, 4);

  // Réservation du client (calendrier de créneaux, demande avec date) composée par le site de services : gardée telle quelle.
  const keepBooking = (key: string) => Object.entries(spec.templates[key]?.sections ?? {}).filter(([, sec]) => sec.type === "booking" || sec.type === "booking-calendar") as [string, SectionInstance][];
  const homeBooking = keepBooking("index");

  // ── Accueil ────────────────────────────────────────────────────────────────────────────────────────────────────
  spec.templates.index = template([
    ["hero", section("ap-hero", { layout: "home", mobile_layout: "stack", height: 448, mobile_height: 505, image_asset: hero, heading, text, button_label: askLabel, button_link: askUrl, button2_label: services.length ? t("Nos prestations", "Our services") : "", button2_link: URL.services, heading_tag: "h1" })],
    ...homeBooking,
    ["trades", services.length >= 2 ? section("ap-strip", { style: "trades", show_on: "desktop", heading: t("Nos métiers", "Our trades") }, services.slice(0, 4).map((s, i) => ({ type: "item", settings: { number: two(i), title: s.name, text: s.description.split(/[.\n]/)[0].trim(), link: URL.services } }))) : null],
    ["list", services.length ? section("ap-cards", { layout: "list", show_on: "mobile", eyebrow: t("Nos prestations", "Our services") }, services.map((s, i) => card({ title: s.name, text: s.description, image_asset: serviceImage(s.name, i), link: URL.services }))) : null],
    ["services", services.length ? section("ap-cards", { layout: "services", show_on: "desktop", heading: "" }, services.slice(0, 3).map((s, i) => card({ title: s.name, text: s.description, image_asset: serviceImage(s.name, i), link_label: t("Voir la prestation", "See the service"), link: URL.services }))) : null],
    ["steps", steps.length >= 2 ? section("ap-cards", { layout: "steps", mobile_layout: "timeline", heading: t("Un projet clair,\nétape par étape.", "A clear project,\nstep by step."), mobile_hide_heading: true, mobile_eyebrow: t("Notre méthode", "Our method") }, steps.map((s, i) => card({ number: two(i), title: s.title, text: s.text }))) : null],
    ["faq", faq.length ? section("ap-faq", { layout: "row", heading: t("Questions fréquentes", "Frequently asked questions"), mobile_heading: t("Questions fréquentes", "Frequently asked questions"), show_rule: true }, faq.slice(0, 3).map((f) => q(f.q, f.a))) : null],
    ["cta", section("ap-cta", { layout: "band", heading: copy.cta.heading || t("Parlons de votre projet", "Let's talk about your project"), text: copy.cta.text, button_label: askLabel, button_link: askUrl, image_asset: photo(1) })],
  ]);

  // ── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const pageHero = (h: string, txt: string, image: string, extra: Record<string, unknown> = {}) => section("ap-hero", { layout: "fade", mobile_layout: "overlay", height: 363, mobile_height: 300, image_asset: image, heading: h, show_rule: true, text: txt, ...extra });
  const legalHero = (h: string, txt: string, image: string) => section("ap-hero", { layout: "fade", mobile_layout: "box", style: "legal", height: 400, mobile_height: 250, mobile_hide_text: true, image_asset: image, heading: h, text: txt });
  const contactBits = [profile.phone && `${t("Téléphone", "Phone")} : ${profile.phone}`, profile.email && `${t("E-mail", "Email")} : ${profile.email}`, profile.area && `${t("Zone d'intervention", "Service area")} : ${profile.area}`, profile.address && `${t("Adresse", "Address")} : ${profile.address}`, profile.hours && `${t("Horaires", "Hours")} : ${profile.hours.split("\n")[0]}`].filter(Boolean) as string[];
  const consent = fld({ kind: "consent", name: "consentement", label: t("J'accepte que mes données soient utilisées dans le cadre de ma demande.", "I agree that my data may be used to handle my request."), link_label: t("Voir notre politique de confidentialité.", "See our privacy policy."), link: URL.privacy, required: true, error: t("Merci d'accepter l'utilisation de vos données pour traiter la demande.", "Please agree to the use of your data to handle the request."), group: "4" });
  const who = [
    fld({ kind: "text", name: "name", label: t("Nom", "Name"), required: true, width: "half", group: "4", summary: "nom" }),
    fld({ kind: "email", name: "email", label: t("E-mail", "Email"), required: true, width: "half", group: "4", summary: "email", error: t("Veuillez renseigner votre adresse e-mail.", "Please enter your email address."), error_format: t("Vérifiez le format de l'adresse e-mail.", "Check the email address format.") }),
    fld({ kind: "tel", name: "phone", label: t("Téléphone", "Phone"), hint: t("(facultatif)", "(optional)"), group: "4", summary: "telephone" }),
  ];
  const booking = keepBooking("page.contact");
  const pages: { handle: string; title: string; rows: [string, SectionInstance | null][] }[] = [
    { handle: handle(URL.services), title: t("Prestations", "Services"), rows: [
      ["hero", pageHero(t("Nos prestations", "Our services"), text, hero, { mobile_layout: "text", height: 446, mobile_height: 480 })],
      ["services", services.length ? section("ap-cards", { layout: "servicerows", cta_style: "button" }, services.map((s, i) => card({ number: two(i), title: s.name, text: s.description, items: [s.price, s.duration].filter(Boolean).join("\n"), image_asset: serviceImage(s.name, i), link_label: askLabel, link: askUrl }))) : null],
      ["faq", faq.length ? section("ap-faq", { layout: "row", heading: t("Questions fréquentes", "Frequently asked questions"), mobile_heading: t("Questions fréquentes", "Frequently asked questions"), show_rule: true }, faq.slice(0, 4).map((f) => q(f.q, f.a))) : null],
      ["cta", section("ap-cta", { layout: "band", heading: t("Un projet ?\nParlons-en.", "A project?\nLet's talk."), text: copy.cta.text, button_label: askLabel, button_link: askUrl, image_asset: photo(2) })],
    ] },
    { handle: handle(URL.about), title: t("Notre approche", "Our approach"), rows: [
      ["hero", pageHero(copy.about.heading || t("Notre approche", "Our approach"), copy.about.intro || copy.statement.text || "", photo(0))],
      ["method", steps.length >= 2 ? section("ap-cards", { layout: "steps", mobile_layout: "timeline", heading: t("Notre méthode", "Our method"), mobile_hide_heading: true, mobile_eyebrow: t("Notre méthode", "Our method") }, steps.map((s, i) => card({ number: two(i), title: s.title, text: s.text }))) : null],
      ["cta", section("ap-cta", { layout: "light", heading: t("Une démarche simple et rigoureuse\npour votre projet.", "A simple, careful approach\nfor your project."), button_label: askLabel, button_link: askUrl })],
    ] },
    { handle: handle(URL.faq), title: t("Questions fréquentes", "FAQ"), rows: [
      ["hero", pageHero(t("Les réponses\n*avant les travaux.*", "Answers\n*before the work.*"), t("Des informations claires pour préparer votre projet.", "Clear information to prepare your project."), photo(1))],
      ["faq", faq.length ? section("ap-faq", { layout: "page", heading: t("Questions fréquentes", "Frequently asked questions"), show_rule: false, single: true, search_placeholder: t("Rechercher une question…", "Search a question…"), search_label: t("Rechercher une question", "Search a question"), empty_text: t("Aucune question ne correspond à votre recherche.", "No question matches your search.") }, faq.map((f) => q(f.q, f.a))) : null],
    ] },
    { handle: handle(URL.contact), title: "Contact", rows: [
      // Prise de rendez-vous du client (calendrier intégré ou lien), reprise du site de services quand elle existe.
      ...booking,
      ["form", section("ap-form", { kind: "contact", form_label: "Contact", eyebrow: "Contact", heading: t("Parlons\n*de votre projet.*", "Let's talk\n*about your project.*"), show_rule: true, text: copy.contact.text || t("Une question ou un projet ? Écrivez-nous.", "A question or a project? Write to us."), group4_title: t("Envoyez-nous un message", "Send us a message"), submit_label: t("Envoyer ma demande", "Send my request"), side_image_asset: photo(0), info_title: t("Coordonnées", "Contact details"), info_text: contactBits.filter((x) => !profile.phone || !x.includes(profile.phone)).join("\n") || (profile.phone ? "" : t("Coordonnées à renseigner.", "Contact details to be completed.")), info_phone: profile.phone }, [
        ...(quote ? [{ type: "link", settings: { icon: "doc", title: t("Demander un devis", "Request a quote"), text: t("Décrivez votre projet en détail.", "Describe your project in detail."), link: URL.quote } }] : []),
        ...(faq.length ? [{ type: "link", settings: { icon: "chats", title: t("Consulter la FAQ", "Read the FAQ"), text: t("Les réponses aux questions fréquentes.", "Answers to common questions."), link: URL.faq } }] : []),
        ...who,
        fld({ kind: "textarea", name: "body", label: t("Message", "Message"), required: true, placeholder: t("Votre message…", "Your message…"), rows: 4, group: "4" }),
        consent,
      ])],
    ] },
    ...(quote ? [{ handle: handle(URL.quote), title: t("Demande de devis", "Quote request"), rows: [
      ["form", section("ap-form", { kind: "quote", form_label: t("Demande de devis", "Quote request"), heading: t("Votre projet\n*commence ici.*", "Your project\n*starts here.*"), mobile_heading: t("Décrivez les travaux.", "Describe the work."), text: t("Décrivez les travaux et joignez quelques photos pour préparer l'échange.", "Describe the work and attach a few photos to prepare the conversation."), image_asset: photo(2), group1_title: t("Votre projet", "Your project"), group2_title: t("Votre chantier", "Your site"), group3_title: t("Vos photos", "Your photos"), group4_title: t("Vos coordonnées", "Your details"), step1_label: t("Votre projet", "Your project"), step2_label: t("Vos coordonnées", "Your details"), step1_heading: t("Décrivez les travaux.", "Describe the work."), step2_heading: t("Ajoutez les détails utiles.", "Add useful details."), submit_label: t("Envoyer ma demande de devis", "Send my quote request"), submit_note: t("Aucun prix automatique : le projet est étudié avant devis.", "No automatic price: the project is studied before any quote."), confirm_link: URL.confirmation, photo_max_mb: 10 }, [
        ...(services.length ? [fld({ kind: "choice", name: "travaux", label: t("Type de travaux", "Type of work"), required: true, options: services.slice(0, 4).map((s) => s.name).join("\n"), group: "1", summary: "projet", error: t("Veuillez choisir le type de travaux.", "Please choose the type of work.") })] : []),
        fld({ kind: "text", name: "commune", label: t("Commune", "Town"), required: true, width: "wide", group: "2", summary: "commune" }),
        fld({ kind: "text", name: "code_postal", label: t("Code postal", "Postcode"), required: true, width: "narrow", group: "2", summary: "cp" }),
        fld({ kind: "textarea", name: "body", label: t("Description des travaux", "Description of the work"), required: true, placeholder: t("Décrivez votre projet, vos besoins, vos contraintes…", "Describe your project, needs and constraints…"), rows: 3, group: "2", summary: "description" }),
        fld({ kind: "photos", name: "photos", label: t("Ajouter des photos", "Add photos"), placeholder: t("JPG, PNG — Jusqu'à 10 Mo par fichier", "JPG, PNG — Up to 10 MB per file"), button_label: t("Sélectionner des fichiers", "Select files"), group: "3", error: "" }),
        ...who,
        consent,
      ])]] as [string, SectionInstance | null][] },
      { handle: handle(URL.confirmation), title: t("Confirmation de votre demande", "Request confirmation"), rows: [
        ["confirm", section("ap-confirm", { heading: t("Merci pour votre demande.", "Thank you for your request."), text: t("Nous avons bien reçu les informations transmises.\nElles vont nous permettre d'étudier votre projet et de revenir vers vous.", "We have received your information.\nIt will help us study your project and get back to you."), recap_title: t("Récapitulatif de votre demande", "Summary of your request"), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: services.length ? t("Voir nos prestations", "See our services") : "", button2_link: URL.services }, [
          ...(services.length ? [{ type: "row", settings: { icon: "user", label: t("Type de travaux", "Type of work"), key: "projet" } }] : []),
          { type: "row", settings: { icon: "pin", label: t("Commune", "Town"), key: "commune" } },
        ])]] as [string, SectionInstance | null][] }] : []),
    { handle: handle(URL.legal), title: t("Mentions légales", "Legal notice"), rows: [
      ["hero", legalHero(t("Mentions légales", "Legal notice"), t("Structure à compléter avant publication.", "Structure to complete before publishing."), photo(1))],
      ["legal", section("ap-legal", { kind: "mentions", label: t("Mentions légales", "Legal notice"), notice_title: t("Structure à compléter avant publication", "Structure to complete before publishing"), notice_text: t("Les informations ci-dessous sont à renseigner avec les données réelles de votre activité.", "The information below must be completed with your business's real details.") }, [
        { type: "part", settings: { title: t("Éditeur du site", "Site publisher"), anchor: "editeur", items: [`${t("Nom ou raison sociale", "Name or company name")} : ${R}`, `${t("Identifiant d'entreprise", "Company identifier")} : ${R}`, `${t("Adresse professionnelle", "Business address")} : ${profile.address || R}`, `${t("Responsable de publication", "Publication manager")} : ${R}`].join("\n") } },
        { type: "part", settings: { title: "Contact", anchor: "contact-site", items: [`${t("E-mail", "Email")} : ${profile.email || R}`, `${t("Téléphone", "Phone")} : ${profile.phone || R}`].join("\n") } },
        { type: "part", settings: { title: t("Hébergement", "Hosting"), anchor: "hebergement", items: `${t("Hébergeur", "Host")} : ${R}` } },
        { type: "part", settings: { title: t("Crédits", "Credits"), anchor: "credits", items: `${t("Conception et réalisation", "Design and build")} : ${R}` } },
      ])],
    ] },
    { handle: handle(URL.privacy), title: t("Confidentialité", "Privacy"), rows: [
      ["hero", legalHero(t("Confidentialité", "Privacy"), t("Vos informations dans le cadre de votre demande.", "Your information in the context of your request."), photo(2))],
      ["legal", section("ap-legal", { kind: "privacy", label: t("Confidentialité", "Privacy"), intro: p(t("Cette page présente la façon dont vos données peuvent être collectées et utilisées sur ce site.", "This page explains how your data may be collected and used on this site.")) + p(t("À préciser selon le fonctionnement réel du site.", "To be specified according to how the site actually works.")) }, [
        { type: "part", settings: { icon: "doc", title: t("Données du formulaire", "Form data"), anchor: "donnees", text: p(t("Les informations que vous renseignez dans les formulaires sont utilisées uniquement pour traiter votre demande.", "The information you enter in the forms is only used to handle your request.")), note: t("À définir selon le fonctionnement réel du site.", "To be defined according to how the site actually works.") } },
        { type: "part", settings: { icon: "clock", title: t("Durée de conservation", "Retention period"), anchor: "conservation", text: p(R), note: t("À définir selon le fonctionnement réel du site.", "To be defined according to how the site actually works.") } },
        { type: "part", settings: { icon: "mail", title: t("Exercer une demande", "Make a request"), anchor: "demande", text: p(t("Vous pouvez demander l'accès, la modification ou la suppression de vos informations.", "You can ask to access, change or delete your information.")), note: t("À définir selon le fonctionnement réel du site.", "To be defined according to how the site actually works.") } },
      ])],
    ] },
    { handle: handle(URL.cookies), title: t("Cookies et préférences", "Cookies and preferences"), rows: [
      ["hero", legalHero(t("Cookies et préférences", "Cookies and preferences"), t("Vous gardez le contrôle.", "You stay in control."), photo(0))],
      ["legal", section("ap-legal", { kind: "cookies", label: t("Cookies et préférences", "Cookies and preferences"), intro: p(t("Ce site utilise des cookies pour assurer son bon fonctionnement et, avec votre accord, pour mesurer l'audience et intégrer des contenus externes.", "This site uses cookies to work properly and, with your consent, to measure audience and embed external content.")) + p(t("Vous pouvez à tout moment modifier vos choix.", "You can change your choices at any time.")) })],
    ] },
  ];
  const known = new Set(spec.store.pages.map((x) => x.handle));
  for (const pg of pages) {
    const old = spec.store.pages.find((x) => x.handle === pg.handle);
    if (old) { old.title = pg.title; old.template_suffix = pg.handle; } else spec.store.pages.push({ handle: pg.handle, title: pg.title, template_suffix: pg.handle, body_html: "" });
    known.add(pg.handle);
    spec.templates[`page.${pg.handle}`] = template([["title", section("main-page", { show_title: false, width: "wide", padding_top: 0, padding_bottom: 0 })], ...pg.rows]);
  }
  // Modèles de pages communs devenus sans page (prestations, à propos, mentions des sites de services).
  for (const key of ["page.services", "page.about", "page.faq", "page.contact", "page.legal"]) if (!pages.some((pg) => `page.${pg.handle}` === key)) delete spec.templates[key];

  spec.templates["404"] = template([
    ["hero", section("ap-hero", { layout: "notfound", mobile_layout: "card", height: 855, mobile_height: 760, image_asset: photo(0), notfound_text: "404", heading: t("Cette page est *introuvable.*", "This page *cannot be found.*"), text: t("La page que vous recherchez n'existe plus ou a peut-être été déplacée.", "The page you are looking for no longer exists or may have moved."), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: services.length ? t("Voir les prestations", "See our services") : "", button2_link: URL.services })],
  ]);

  // ── Menus, en-tête et pied ─────────────────────────────────────────────────────────────────────────────────────
  const nav = [
    { title: t("Prestations", "Services"), url: URL.services },
    { title: t("Notre approche", "Our approach"), url: URL.about },
    { title: "FAQ", url: URL.faq },
    { title: "Contact", url: URL.contact },
  ];
  const legal = [{ title: t("Mentions légales", "Legal notice"), url: URL.legal }, { title: t("Confidentialité", "Privacy"), url: URL.privacy }, { title: "Cookies", url: URL.cookies }];
  spec.store.menus = {
    ...spec.store.menus,
    "main-menu": { title: t("Menu principal", "Main menu"), links: nav },
    "mobile-menu": { title: t("Menu du téléphone", "Phone menu"), links: nav },
    footer: { title: t("Informations", "Information"), links: legal },
    "footer-prestations": { title: t("Nos prestations", "Our services"), links: services.slice(0, 5).map((s) => ({ title: s.name, url: URL.services })) },
    "legal-long": { title: t("Informations légales", "Legal information"), links: [legal[0], { title: t("Politique de confidentialité", "Privacy policy"), url: URL.privacy }, { title: t("Gestion des cookies", "Cookie settings"), url: `${URL.cookies}#cookies` }] },
    "legal-bar": { title: t("Informations légales", "Legal information"), links: legal },
  };
  for (const g of Object.values(spec.groups)) for (const s of Object.values(g.sections)) {
    if (s.type === "announcement-bar") s.disabled = true;
    if (s.type === "ap-header") Object.assign(s.settings, { menu: "main-menu", mobile_menu: "mobile-menu", legal_menu: "footer", cta_label: askLabel, cta_link: askUrl, nav_parents: quote ? `${handle(URL.contact)}=${handle(URL.quote)},${handle(URL.confirmation)}` : "", bar_project_label: quote ? t("Mon projet", "My project") : "", bar_project_link: quote ? URL.quote : "", bar_contact_label: "Contact", bar_contact_link: URL.contact, bar_on_home: true, bar_pages: handle(URL.services) });
    if (s.type === "ap-footer") {
      Object.assign(s.settings, { menu: "main-menu", legal_menu: "footer", legal_long_menu: "legal-long", bar_legal_menu: "legal-bar", legal_note: "", cta_label: askLabel, cta_link: askUrl, style_home: "dark", style_default: "bar", style_404: "bar", dark_pages: handle(URL.services), minimal_pages: "", columns_pages: [URL.about, URL.faq, URL.contact, ...(quote ? [URL.quote] : [])].map(handle).join(","), plaster_pages: quote ? handle(URL.confirmation) : "", bar_pages: [URL.legal, URL.privacy, URL.cookies].map(handle).join(","), cookie_privacy_link: URL.privacy, cookie_policy_link: URL.cookies });
      const col = (title: string, menu: string, styles: string): Block => ({ type: "column", settings: { title, menu, styles, show_on: "all", note: "" } });
      const cols = [col("Navigation", "main-menu", "dark,columns,plaster"), ...(services.length ? [col(t("Nos prestations", "Our services"), "footer-prestations", "dark,columns,plaster")] : []), col(t("Informations", "Information"), "footer", "dark,columns,plaster")];
      s.blocks = Object.fromEntries(cols.map((b, i) => [`b${i}`, b]));
      s.block_order = cols.map((_, i) => `b${i}`);
    }
  }
  // La barre « Mon projet / Contact » du téléphone remplace le bouton flottant commun.
  Object.assign(spec.settings, { fab_contact_link: "", fab_back_to_top: false });
  return spec;
}
