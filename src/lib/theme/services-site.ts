/**
 * Site d'une entreprise de services (artisan, coach, salon, cabinet, agence, restaurant…) :
 * contenus et sections propres aux services, utilisés par la composition des directions (directions.ts).
 *
 * - Aucun élément de vente en ligne : ni panier, ni fiche produit, ni livraison.
 * - L'appel à l'action suit le mode de contact choisi (rendez-vous, devis, appel, formulaire).
 * - Rien n'est inventé : prestations, prix, durées, horaires, zone et coordonnées viennent du projet ;
 *   ce qui manque reste un espace réservé « [À compléter : …] » court (avis, équipe, réalisations…).
 */
import type { ServiceProfile } from "../project-types";
import type { ShopCopy } from "./copy";
import { pick, type Lang } from "../i18n";
import type { ImageSlots } from "./directions";

type Block = { type: string; settings: Record<string, unknown> };
export type Row = [string, Record<string, unknown>, Block[]?];

/** Vocabulaire de la vente en ligne, à écarter des textes d'un site de services. */
export const COMMERCE_WORDS = /livraison|livr[ée]|exp[ée]di|panier|commande|colis|retours?\b|rembours|stock|shipping|deliver|\bcart\b|checkout|\border|parcel|returns?\b|refund|in stock/i;
const isTodo = (s?: string | null) => !s || /\[(À|A) compléter|\[To complete/i.test(s);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => (/^\s*</.test(s) ? s : `<p>${esc(s)}</p>`);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const telHref = (phone: string) => phone.replace(/[^\d+]/g, "");

export type ServicesPlan = ReturnType<typeof servicesPlan>;

/**
 * Plan du site de services : appel à l'action, adresses des pages, textes nettoyés et constructeurs de sections.
 * `copy` : textes rédigés pour le projet (l'ouverture, le « pourquoi nous », la page À propos…).
 */
export function servicesPlan(input: { lang: Lang; shopName: string; services: ServiceProfile; copy: ShopCopy; images: ImageSlots; termsHtml?: string }) {
  const { lang, shopName, images: im } = input;
  const sv = input.services;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = (fr: string, en: string) => t(`[À compléter : ${fr}]`, `[To complete: ${en}]`);
  const services = sv.services.filter((s) => s.name.trim());
  const phone = sv.phone.trim();
  const email = sv.email.trim();
  const hours = sv.hours.trim();
  const area = sv.area.trim();
  const address = sv.address.trim();
  const bookingUrl = /^https?:\/\//i.test(sv.bookingUrl.trim()) ? sv.bookingUrl.trim() : "";
  const mode = sv.contactMode;

  // Pages du site (adresses dans la langue du site).
  const urls = {
    services: `/pages/${t("prestations", "services")}`,
    about: `/pages/${t("a-propos", "about")}`,
    contact: "/pages/contact",
    faq: "/pages/faq",
    legal: `/pages/${t("mentions-legales", "legal-notice")}`,
  };
  const handle = (u: string) => u.split("/").pop()!;

  // Appel à l'action selon le mode de contact.
  const embeddable = /calendly\.com|cal\.com|tidycal\.com|zcal\.co|calendar\.google\.com|youcanbook\.me/i.test(bookingUrl) && !/planity|doctolib|treatwell/i.test(bookingUrl);
  const cta =
    mode === "booking"
      ? { label: t("Prendre rendez-vous", "Book an appointment"), url: bookingUrl && !embeddable ? bookingUrl : urls.contact, icon: "clock", page: t("Rendez-vous", "Book") }
      : mode === "quote"
        ? { label: t("Demander un devis", "Request a quote"), url: urls.contact, icon: "mail", page: t("Devis", "Quote") }
        : mode === "call"
          ? { label: phone ? t("Appeler", "Call us") : t("Nous appeler", "Call us"), url: urls.contact, icon: "phone", page: "Contact" }
          : { label: t("Nous contacter", "Contact us"), url: urls.contact, icon: "chat", page: "Contact" };
  // En-tête : en mode « appel », le bouton compose directement le numéro (lien construit par le thème).
  const headerCta = { label: cta.label, link: mode === "call" && phone ? "" : cta.url, icon: cta.icon };

  // Textes rédigés : sans vocabulaire de vente en ligne, boutons alignés sur l'appel à l'action.
  const c0 = input.copy;
  const okText = (s: string) => !COMMERCE_WORDS.test(s);
  // « Pourquoi nous » : arguments rédigés, sauf s'ils ne font que répéter la liste des prestations (déjà présentée).
  const svcNames = new Set(sv.services.map((s) => s.name.trim().toLowerCase()).filter(Boolean));
  const features = c0.features.items.filter((f) => okText(`${f.title} ${f.text}`) && !svcNames.has(f.title.trim().toLowerCase())).map((f) => ({ ...f, icon: f.icon === "truck" || f.icon === "return" ? ("check" as const) : f.icon }));
  const copy: ShopCopy = {
    ...c0,
    announcement: [],
    hero: { ...c0.hero, cta: cta.label },
    cta: { ...c0.cta, heading: okText(c0.cta.heading) ? c0.cta.heading : t("Parlons de votre projet", "Let's talk about what you need"), text: okText(c0.cta.text) ? c0.cta.text : "", button: cta.label },
    features: { ...c0.features, items: features.length >= 2 ? features : [] },
    marquee: services.length >= 2 ? services.slice(0, 6).map((s) => s.name) : c0.marquee.filter(okText),
    statement: okText(`${c0.statement.heading} ${c0.statement.text}`) ? c0.statement : { eyebrow: "", heading: c0.statement.heading, text: "" },
    about: { ...c0.about, blocks: c0.about.blocks.filter((b) => okText(`${b.heading} ${b.text}`)), values: c0.about.values.filter((v) => okText(`${v.title} ${v.text}`)) },
    contact: { heading: c0.contact.heading, text: okText(c0.contact.text) ? c0.contact.text : "" },
    footer: { about: okText(c0.footer.about) ? c0.footer.about : c0.hero.text, newsletter: "" },
  };

  // Méthode : étapes neutres selon le mode de contact (aucune promesse de délai).
  const steps: { title: string; text: string }[] =
    mode === "booking"
      ? [
          { title: t("Réservez votre créneau", "Book your slot"), text: bookingUrl ? t("En ligne, au moment qui vous convient.", "Online, whenever suits you.") : t("Indiquez la prestation et le moment qui vous conviennent.", "Tell us the service and the time that suit you.") },
          { title: t("Faisons connaissance", "Let's get to know each other"), text: t("Nous prenons le temps de comprendre votre besoin avant de commencer.", "We take the time to understand what you need before we start.") },
          { title: t("Votre rendez-vous", "Your appointment"), text: t("La prestation choisie, réalisée avec soin.", "The service you chose, carried out with care.") },
        ]
      : mode === "quote"
        ? [
            { title: t("Décrivez votre projet", "Describe your project"), text: t("Quelques lignes suffisent : le besoin, le lieu, vos contraintes.", "A few lines are enough: what you need, where, any constraints.") },
            { title: t("Recevez votre devis", "Get your quote"), text: t("Une proposition détaillée, établie d'après votre demande.", "A detailed proposal based on your request.") },
            { title: t("Nous réalisons", "We get it done"), text: t("Le travail est réalisé selon ce qui a été convenu ensemble.", "The work is carried out as agreed together.") },
          ]
        : [
            { title: mode === "call" ? t("Appelez-nous", "Give us a call") : t("Écrivez-nous", "Write to us"), text: t("Expliquez-nous simplement ce dont vous avez besoin.", "Simply tell us what you need.") },
            { title: t("Nous convenons ensemble", "We agree on the details"), text: t("La prestation, le moment et les conditions, en toute clarté.", "The service, the timing and the terms, clearly set out.") },
            { title: t("Nous nous occupons de tout", "We take care of it"), text: t("Vous profitez du résultat.", "You enjoy the result.") },
          ];

  // FAQ propre aux services, tirée des informations du projet (le reste en espace réservé).
  const priced = services.filter((s) => s.price?.trim());
  const faqItems: { q: string; a: string }[] = [
    mode === "booking"
      ? { q: t("Comment prendre rendez-vous ?", "How do I book an appointment?"), a: bookingUrl ? t("Directement en ligne, depuis la page Rendez-vous : choisissez la prestation puis le créneau qui vous convient.", "Online, from the booking page: choose the service, then the time that suits you.") : phone ? t(`Par téléphone au ${phone}, ou via le formulaire de la page Contact.`, `By phone on ${phone}, or with the form on the contact page.`) : t("Via le formulaire de la page Contact : indiquez la prestation et vos disponibilités.", "With the form on the contact page: tell us the service and when you are available.") }
      : mode === "quote"
        ? { q: t("Comment obtenir un devis ?", "How do I get a quote?"), a: t("Décrivez votre projet dans le formulaire de la page Contact ; nous revenons vers vous avec une proposition détaillée.", "Describe your project in the form on the contact page and we will come back to you with a detailed proposal.") }
        : { q: t("Comment vous joindre ?", "How can I reach you?"), a: phone ? t(`Par téléphone au ${phone}${email ? ` ou par e-mail à ${email}` : ""}.`, `By phone on ${phone}${email ? ` or by email at ${email}` : ""}.`) : email ? t(`Par e-mail à ${email}, ou via le formulaire de la page Contact.`, `By email at ${email}, or with the form on the contact page.`) : t("Via le formulaire de la page Contact.", "With the form on the contact page.") },
    { q: address && !area ? t("Où vous trouver ?", "Where are you located?") : t("Où intervenez-vous ?", "Where do you work?"), a: area || address ? [area, address].filter(Boolean).join(t(" — adresse : ", " — address: ")) : todo("votre zone d'intervention ou votre adresse", "your service area or address") },
    { q: t("Quels sont vos horaires ?", "What are your opening hours?"), a: hours ? hours.replace(/\n+/g, " · ") : todo("vos horaires", "your opening hours") },
    { q: t("Quels sont vos tarifs ?", "What are your prices?"), a: priced.length ? t("Le tarif de chaque prestation est indiqué sur la page Prestations.", "The price of each service is listed on the services page.") : todo("vos tarifs, ou la façon dont ils sont établis", "your prices, or how they are set") },
    { q: t("Comment se déroule une première prestation ?", "What happens the first time?"), a: todo("le déroulement d'une première prestation", "how a first appointment or job goes") },
    { q: t("Quels moyens de paiement acceptez-vous ?", "Which payment methods do you accept?"), a: todo("les moyens de paiement acceptés", "the payment methods you accept") },
  ];
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const f of c0.faq.items) {
    if (faqItems.length >= 8) break;
    if (okText(`${f.q} ${f.a}`) && !faqItems.some((x) => norm(x.q) === norm(f.q))) faqItems.push(f);
  }
  const faqBlocks = (limit = 8): Block[] => faqItems.slice(0, limit).map((f) => ({ type: "question", settings: { question: f.q, answer: p(f.a) } }));

  // Photos du projet (réalisations, prestations, À propos).
  // (Bannières et packshots exclus : ce sont des visuels publicitaires ou de produit.)
  const photos = [im.scene1, im.scene2, im.scene3, im.lifestyle2, im.detail1, im.detail2].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  const ICONS = ["sparkle", "hand", "heart", "shield", "leaf", "star", "check", "bolt"];
  const pad = (top: number, bottom = top) => ({ padding_top: top, padding_bottom: bottom });
  const scheme = (n: number) => `scheme-${n}`;

  const serviceBlocks = (withImages: boolean): Block[] =>
    (services.length
      ? services.slice(0, 12).map((s, i) => ({ type: "service", settings: { title: s.name, text: s.description ? p(s.description) : "", price: s.price?.trim() ?? "", duration: s.duration?.trim() ?? "", icon: ICONS[i % ICONS.length], image_asset: withImages ? photos[i % Math.max(1, photos.length)] ?? "" : "" } }))
      : [0, 1, 2].map((i) => ({ type: "service", settings: { title: todo("nom de la prestation", "service name"), text: p(todo("ce que comprend la prestation", "what the service includes")), icon: ICONS[i], image_asset: withImages ? photos[i] ?? "" : "" } })));

  const R = {
    servicesList: (sch: number, layout: "cards" | "list", opts: { heading?: string; eyebrow?: string; withImages?: boolean; footer?: boolean; columns?: number } = {}): Row => {
      const blocks = serviceBlocks(!!opts.withImages && layout === "cards" && photos.length >= 2);
      return [
        "services-list",
        {
          eyebrow: opts.eyebrow ?? t("Prestations", "Services"),
          heading: opts.heading ?? t("Ce que nous faisons pour vous", "What we do for you"),
          text: "",
          layout,
          columns: opts.columns ?? Math.min(3, Math.max(2, blocks.length)),
          button_label: cta.label,
          button_link: cta.url,
          highlight_label: "",
          note: "",
          footer_label: opts.footer ? t("Toutes nos prestations", "All our services") : "",
          footer_link: opts.footer ? urls.services : "",
          color_scheme: scheme(sch),
          ...pad(104),
        },
        blocks,
      ];
    },
    /** Tarifs : seulement avec au moins deux prix fournis par le marchand. */
    pricing: (sch: number): Row[] =>
      priced.length >= 2
        ? [["pricing", { eyebrow: t("Tarifs", "Pricing"), heading: t("Nos tarifs", "Our prices"), text: "", button_label: cta.label, button_link: cta.url, no_price_label: t("Sur demande", "On request"), note: "", color_scheme: scheme(sch), ...pad(104) }, priced.slice(0, 4).map((s) => ({ type: "plan", settings: { name: s.name, description: s.description ? clip(s.description, 110) : "", price: s.price!.trim(), period: s.duration?.trim() ? `· ${s.duration.trim()}` : "", features: "", featured: false, badge: "" } }))]]
        : [],
    method: (sch: number, kind: "howto-v" | "howto-h" | "timeline"): Row => {
      const heading = t("Comment ça se passe", "How it works");
      if (kind === "timeline")
        return ["timeline", { eyebrow: t("Notre méthode", "Our approach"), heading, heading_accent: "", image_asset: photos[1] ?? photos[0] ?? im.lifestyle ?? "", color_scheme: scheme(sch), ...pad(104) }, steps.map((s) => ({ type: "step", settings: { title: s.title, text: p(s.text) } }))];
      return ["how-to", { eyebrow: t("Notre méthode", "Our approach"), heading, text: "", layout: kind === "howto-h" ? "horizontal" : "vertical", media_ratio: "landscape", button_label: cta.label, button_link: cta.url, color_scheme: scheme(sch), ...pad(104) }, steps.map((s, i) => ({ type: "step", settings: { title: s.title, text: p(s.text), duration: "", tip: "", image_asset: kind === "howto-v" && photos.length >= 6 ? photos[3 + (i % (photos.length - 3))] : "" } }))];
    },
    portfolio: (sch: number, layout: "grid" | "editorial"): Row => {
      const imgs = photos.slice(0, layout === "editorial" ? 4 : photos.length >= 6 ? 6 : 3);
      const list = imgs.length >= 2 ? imgs : ["", "", ""];
      return ["portfolio", { eyebrow: t("Réalisations", "Our work"), heading: t("Quelques réalisations", "A few recent projects"), text: "", layout, label_before: t("Avant", "Before"), label_after: t("Après", "After"), button_label: "", button_link: "", color_scheme: scheme(sch), ...pad(104) }, list.map((f) => ({ type: "project", settings: { image_asset: f, title: todo("nom du projet", "project name"), caption: todo("ce qui a été réalisé", "what was done"), tag: "" } }))];
    },
    team: (sch: number, style: "cards" | "portraits" | "plain", n = 2): Row => [
      "team",
      { eyebrow: t("L'équipe", "The team"), heading: t("Les personnes qui vous accueillent", "The people who will welcome you"), text: "", style, columns: 3, color_scheme: scheme(sch), ...pad(104) },
      Array.from({ length: n }, () => ({ type: "member", settings: { name: todo("prénom et nom", "first and last name"), role: todo("rôle", "role"), bio: p(todo("parcours et spécialités réels", "real background and specialties")) } })),
    ],
    testimonials: (sch: number): Row => [
      "testimonials",
      { eyebrow: t("Avis", "Reviews"), heading: t("Ils nous ont fait confiance", "What our clients say"), color_scheme: scheme(sch), ...pad(96) },
      [0, 1, 2].map(() => ({ type: "review", settings: { quote: todo("avis réel d'un client, avec son accord", "a real client review, with their consent"), author: todo("prénom", "first name"), detail: todo("prestation", "service"), rating: "0" } })),
    ],
    practical: (sch: number, withButton = true): Row => [
      "practical-info",
      {
        eyebrow: t("Infos pratiques", "Practical info"),
        heading: t("Nous trouver, nous joindre", "Find us, reach us"),
        text: "",
        hours: hours || todo("vos horaires, une ligne par jour", "your opening hours, one line per day"),
        hours_note: "",
        address,
        area: area || (address ? "" : todo("zone d'intervention ou adresse", "service area or address")),
        phone: phone || (email ? "" : todo("téléphone", "phone number")),
        email,
        button_label: withButton ? cta.label : "",
        button_link: withButton ? cta.url : "",
        map: address ? "google" : "none",
        map_query: "",
        latitude: "",
        longitude: "",
        map_consent: true,
        color_scheme: scheme(sch),
        ...pad(104),
      },
    ],
    booking: (sch: number): Row => [
      "booking",
      {
        eyebrow: cta.page,
        heading: mode === "booking" ? t("Prendre rendez-vous", "Book an appointment") : mode === "quote" ? t("Demander un devis", "Request a quote") : mode === "call" ? t("Appelez-nous", "Give us a call") : t("Écrivez-nous", "Write to us"),
        text: p(mode === "booking" ? (bookingUrl ? t("Choisissez la prestation et le créneau qui vous conviennent.", "Choose the service and the time that suit you.") : t("Indiquez la prestation et vos disponibilités, nous vous proposons un créneau.", "Tell us the service and when you are free, and we will suggest a time.")) : mode === "quote" ? t("Décrivez votre projet : nous revenons vers vous avec une proposition détaillée.", "Describe your project and we will come back to you with a detailed proposal.") : mode === "call" ? t("Le plus simple est de nous appeler. Vous pouvez aussi laisser un message ci-contre.", "The easiest way is to call us. You can also leave a message here.") : t("Laissez-nous un message, nous vous répondons.", "Leave us a message and we will get back to you.")),
        booking_url: mode === "booking" ? bookingUrl : "",
        display: "auto",
        embed_height: 700,
        button_label: mode === "booking" ? t("Prendre rendez-vous", "Book an appointment") : mode === "quote" ? t("Envoyer ma demande", "Send my request") : t("Envoyer", "Send"),
        panel_title: t("Réservation en ligne", "Online booking"),
        panel_text: p(t("Choisissez votre prestation et votre créneau ; la confirmation vous parvient directement.", "Pick your service and time slot; you receive the confirmation directly.")),
        services: services.map((s) => s.name).join("\n"),
        ask_date: mode === "booking",
        form_note: "",
        phone,
        email,
        color_scheme: scheme(sch),
        ...pad(96),
      },
      steps.map((s) => ({ type: "step", settings: { title: s.title, text: s.text } })),
    ],
    trust: (sch: number): Row[] => {
      const items = [
        ...(area ? [{ icon: "globe", title: t("Zone d'intervention", "Service area"), text: clip(area, 60) }] : address ? [{ icon: "globe", title: t("Adresse", "Address"), text: clip(address.replace(/\n+/g, ", "), 60) }] : []),
        ...(hours ? [{ icon: "clock", title: t("Horaires", "Opening hours"), text: clip(hours.replace(/\n+/g, " · "), 60) }] : []),
        ...(mode === "booking" && bookingUrl ? [{ icon: "check", title: t("Réservation en ligne", "Online booking"), text: t("Votre créneau en quelques clics", "Your slot in a few clicks") }] : phone ? [{ icon: "chat", title: t("Par téléphone", "By phone"), text: phone }] : email ? [{ icon: "chat", title: t("Par e-mail", "By email"), text: email }] : []),
      ];
      return items.length >= 2 ? [["trust-bar", { heading: "", color_scheme: scheme(sch), ...pad(40) }, items.map((x) => ({ type: "item", settings: x }))]] : [];
    },
    faq: (sch: number, limit = 6): Row => ["faq", { heading: t("Questions fréquentes", "Frequently asked questions"), style: "cards", structured_data: true, color_scheme: scheme(sch), ...pad(104) }, faqBlocks(limit)],
    contactForm: (sch: number, heading = t("Une question ?", "A question?")): Row => ["contact-form", { heading, text: p(copy.contact.text || t("Écrivez-nous, nous vous répondons.", "Write to us and we will get back to you.")), email, hours: hours.replace(/\n+/g, " · "), response: "", color_scheme: scheme(sch), ...pad(96) }],
    legal: (): Row => [
      "legal-page",
      {
        source: "blocks",
        eyebrow: t("Informations légales", "Legal information"),
        heading: t("Mentions légales", "Legal notice"),
        updated: todo("date", "date"),
        intro: "",
        show_toc: true,
        show_print: true,
        color_scheme: scheme(1),
        ...pad(64, 96),
      },
      [
        { type: "part", settings: { title: t("Éditeur du site", "Site publisher"), text: p(`${shopName} — ${todo("forme juridique, adresse du siège, numéro d'immatriculation (SIRET, RCS ou RM)", "legal form, registered address, company registration number")}`) } },
        { type: "part", settings: { title: t("Contact", "Contact"), text: p([phone, email].filter(Boolean).join(" · ") || todo("téléphone et e-mail", "phone and email")) } },
        { type: "part", settings: { title: t("Directeur de la publication", "Publication director"), text: p(todo("prénom et nom", "first and last name")) } },
        { type: "part", settings: { title: t("Hébergement", "Hosting"), text: p(todo("nom, adresse et téléphone de l'hébergeur du site", "name, address and phone number of the website host")) } },
        { type: "part", settings: { title: t("Activité réglementée", "Regulated profession"), text: p(todo("ordre ou chambre professionnelle, assurance, numéro d'inscription — le cas échéant", "professional body, insurance and registration number — if applicable")) } },
        { type: "part", settings: { title: t("Propriété intellectuelle", "Intellectual property"), text: p(t(`Les textes, images et logos de ce site appartiennent à ${shopName} ou sont utilisés avec l'accord de leurs auteurs. Toute reproduction sans autorisation est interdite.`, `The texts, images and logos on this site belong to ${shopName} or are used with their authors' permission. Any reproduction without permission is prohibited.`)) } },
        { type: "part", settings: { title: t("Données personnelles", "Personal data"), text: p(t("Les informations transmises via les formulaires servent uniquement à répondre à votre demande. Voir la politique de confidentialité pour le détail de vos droits.", "Information sent through the forms is used only to answer your request. See the privacy policy for details of your rights.")) } },
      ],
    ],
  };

  // Bandeau d'annonce : uniquement des informations réelles et courtes (zone, horaires, téléphone).
  const announcements = [area && clip(area, 48), hours && !hours.includes("\n") && clip(hours, 48), phone && t(`Tél. ${phone}`, `Tel. ${phone}`)].filter((x): x is string => !!x).slice(0, 3);

  const pages = [
    { handle: handle(urls.services), title: t("Prestations", "Services"), template_suffix: "services", body_html: "" },
    { handle: handle(urls.about), title: t("À propos", "About"), template_suffix: "about", body_html: "" },
    { handle: "contact", title: mode === "booking" ? t("Rendez-vous", "Book") : mode === "quote" ? t("Demande de devis", "Request a quote") : "Contact", template_suffix: "contact", body_html: "" },
    { handle: "faq", title: t("Questions fréquentes", "Frequently asked questions"), template_suffix: "faq", body_html: "" },
    { handle: handle(urls.legal), title: t("Mentions légales", "Legal notice"), template_suffix: "legal", body_html: "" },
  ];
  const menus = {
    "main-menu": {
      title: t("Menu principal", "Main menu"),
      links: [
        { title: t("Accueil", "Home"), url: "/" },
        { title: t("Prestations", "Services"), url: urls.services },
        { title: t("À propos", "About"), url: urls.about },
        { title: "FAQ", url: urls.faq },
        { title: pages[2].title, url: urls.contact },
      ],
    },
    footer: {
      title: t("Pied de page", "Footer"),
      links: [
        { title: t("Prestations", "Services"), url: urls.services },
        { title: pages[2].title, url: urls.contact },
        { title: "FAQ", url: urls.faq },
        { title: t("Mentions légales", "Legal notice"), url: urls.legal },
        { title: t("Conditions générales", "Terms"), url: "/policies/terms-of-service" },
        { title: t("Confidentialité", "Privacy"), url: "/policies/privacy-policy" },
      ],
    },
  };
  const policyTodo = t("<p>[À compléter dans Shopify : Paramètres › Politiques]</p>", "<p>[To complete in Shopify: Settings › Policies]</p>");
  const policies = [
    // Conditions de prestation (et non de vente) : rédigées par services-text.ts, espaces réservés compris.
    { handle: "terms-of-service", title: t("Conditions générales de prestation", "Terms of service"), body_html: input.termsHtml || policyTodo },
    { handle: "privacy-policy", title: t("Politique de confidentialité", "Privacy policy"), body_html: policyTodo },
    { handle: "legal-notice", title: t("Mentions légales", "Legal notice"), body_html: policyTodo },
  ];
  const footerContact: Block = {
    type: "contact",
    settings: { heading: t("Nous trouver", "Find us"), address: address || area, phone, email, hours },
  };

  return { cta, headerCta, urls, copy, steps, faqItems, faqBlocks, photos, R, announcements, pages, menus, policies, footerContact, phone, telHref: telHref(phone), services, mode, bookingUrl };
}
