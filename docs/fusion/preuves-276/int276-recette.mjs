// Recette #276 sur le Studio INTÉGRÉ (Claude + Codex), compilé, instance isolée, entreprises FICTIVES, SMTP LOCAL.
// Drapeaux SYNA fermés (état livré) : on vérifie que les modules Claude fonctionnent à l'identique dans le Studio fusionné.
// 1. Sites publiés (artisan APLAT, électricien PHASE, salon, restaurant, agence) : publication, pages clés ordinateur/téléphone.
// 2. Devis depuis une fiche réalisation → e-mail reçu par le SMTP local. 3. Vraie réservation de test (salon, 201).
// 4. Contenu modifié par l'API native (accord explicite) → site en ligne inchangé → V(n+1) → restauration V(n).
// 5. Isolation des hôtes : aucune route du Studio ni de SYNA servie sur un nom de site. 6. Menus par métier, téléphone.
// 7. Compte étranger : 404.
import { browser, context, ids, login, open, save, shot, STUDIO, DIR } from "./lib.mjs";
const out = {};
const api = (page, path, method = "GET", body) => page.evaluate(async ([p, m, b]) => { const r = await fetch(p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, method, body]);
const sinkState = async () => (await fetch("http://127.0.0.1:2526/")).json();
const waitFor = async (cond, ms, label) => { const end = Date.now() + ms; for (;;) { const v = await cond(); if (v) return v; if (Date.now() > end) throw new Error(`délai dépassé : ${label}`); await new Promise((r) => setTimeout(r, 1000)); } };
const refuse = async (p) => { const r = p.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {}); };
const publish = async (page, pid) => { await open(page, `${STUDIO}/studio/${pid}/realisations`); const r = await api(page, `/api/projects/${pid}/site-publication`, "POST", { action: "publish" }); return r.status === 200 ? { ok: true, numero: r.body.live.number, host: r.body.addresses.find((a) => a.kind === "studio").hostname } : { ok: false, statut: r.status, raisons: r.body.reasons ?? r.body.error }; };

const b = await browser();
const owner = await (await context(b)).newPage();
await login(owner, "proprio@recette.invalid");

// 1. Sites publiés et pages clés.
const SITES = { platrier: ["/", "/pages/realisations"], electricien: ["/", "/pages/realisations"], salon: ["/"], restaurant: ["/", "/pages/la-carte"], agence2: ["/", "/pages/acheter"] };
const hosts = {};
for (const [key, paths] of Object.entries(SITES)) {
  const p = await publish(owner, ids[key]);
  out[`publication_${key}`] = p;
  if (!p.ok) continue;
  hosts[key] = p.host;
  for (const kind of ["ordinateur", "telephone"]) {
    const v = await (await context(b, kind)).newPage();
    const res = {};
    for (const path of paths) { const r = await v.goto(`https://${p.host}:3943${path}`, { waitUntil: "networkidle" }); await refuse(v); res[path] = r.status(); await v.screenshot({ path: `${DIR}preuves/i276-01-${key}${path.replace(/\W+/g, "-")}-${kind}.png`, fullPage: false }); }
    out[`pages_${key}_${kind}`] = res;
    await v.context().close();
  }
}

// 2. Devis depuis la fiche d'une réalisation (APLAT) → e-mail.
const A = ids.platrier;
const reals = (await api(owner, `/api/projects/${A}/contenus/realisations`)).body.items;
const live = reals.find((r) => r.status === "published");
const visitor = await (await context(b)).newPage();
await visitor.goto(`https://${hosts.platrier}:3943/pages/${live.data.handle}`, { waitUntil: "networkidle" }); await refuse(visitor);
const href = await visitor.locator(".ap-cta a").first().getAttribute("href");
const before = (await sinkState()).count;
await visitor.goto(`https://${hosts.platrier}:3943${href}`, { waitUntil: "networkidle" }); await refuse(visitor);
const form = visitor.locator('form[action="/contact#contact_form"]').first();
for (const el of await form.locator("input:visible, textarea:visible, select:visible").all()) {
  const type = await el.getAttribute("type"), name = (await el.getAttribute("name")) ?? "";
  if (type === "hidden" || type === "submit" || type === "file" || name === "contact[site_web]") continue;
  if (type === "checkbox" || type === "radio") { await el.check().catch(() => {}); continue; }
  if ((await el.evaluate((e) => e.tagName)) === "SELECT") { const v = await el.locator("option").nth(1).getAttribute("value"); if (v) await el.selectOption(v); continue; }
  await el.fill(type === "email" || /email/.test(name) ? "lou.fictive@example.test" : type === "tel" || /phone|tel/.test(name) ? "0600000011" : /code_postal/.test(name) ? "69003" : /commune/.test(name) ? "Lyon" : /body|message|projet|description/.test(name) ? "Demande fictive de recette #276 depuis la fiche d'une réalisation." : "Lou Fictive");
}
const sent = visitor.waitForResponse((x) => x.url().endsWith("/contact") && x.request().method() === "POST", { timeout: 30000 });
await form.locator('button[type="submit"]').first().click();
out.devis = { bouton: href, envoi: (await sent).status() };
const mail = await waitFor(async () => { const s = await sinkState(); return s.count > before ? s.messages.at(-1) : null; }, 60000, "e-mail");
out.devis.email = { a: mail.to, sujet: mail.subject };

// 3. Vraie réservation de test (salon, API publique du site, autre origine).
const S = ids.salon;
const pres = (await api(owner, `/api/projects/${S}/contenus/prestations/prestations`)).body.item.data;
const svc = pres.services[0].id;
const vS = await (await context(b)).newPage();
await vS.goto(`https://${hosts.salon}:3943/`, { waitUntil: "networkidle" });
const month = await vS.evaluate(async ([pid, s]) => (await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/month?month=2026-11&service=${s}&staff=any`)).json(), [S, svc]);
const day = Object.entries(month.days ?? {}).reverse().find(([, s]) => s === "open")?.[0];
const slots = day ? await vS.evaluate(async ([pid, s, d]) => (await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/availability?date=${d}&service=${s}&staff=any`)).json(), [S, svc, day]) : null;
const time = (slots?.slots ?? []).find((s) => s.available)?.time;
out.reservation = await vS.evaluate(async ([pid, s, d, t]) => { const r = await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: s, staff: "any", date: d, time: t, firstName: "Noa", lastName: "Fictif", email: "noa.fictif@example.test", phone: "0600000012", terms: true, idem: "recette-i276-0001" }) }); const j = await r.json().catch(() => ({})); return { status: r.status, numero: j.booking?.number ?? j.number ?? null }; }, [S, svc, day, time]);
out.reservation.creneau = `${day} ${time}`;

// 4. Contenu modifié par l'API native avec accord → site inchangé → V(n+1) → restauration V(n).
const target = live;
const onSite = async () => { await visitor.goto(`https://${hosts.platrier}:3943/pages/realisations`, { waitUntil: "networkidle" }); return (await visitor.locator("body").innerText()).includes("version intégration #276"); };
const vN = out.publication_platrier.numero;
const upd = await api(owner, `/api/projects/${A}/contenus/realisations/${target.id}`, "PATCH", { data: { summary: `${target.data.summary} — version intégration #276` }, ifVersion: target.version });
out.versions = { modification: upd.status, noteSite: upd.body.site?.note ?? null, siteInchange: !(await onSite()) };
const v2 = await publish(owner, A);
out.versions.publication = v2.numero; out.versions.apresPublication = await onSite();
const pubs = (await api(owner, `/api/projects/${A}/site-publication`)).body.publications;
out.versions.restauration = (await api(owner, `/api/projects/${A}/site-publication`, "POST", { action: "restore", publicationId: pubs.find((p) => p.number === vN).id })).status;
out.versions.apresRestauration = await onSite();
// Remise du résumé d'origine (accord explicite), sans republier.
const cur = (await api(owner, `/api/projects/${A}/contenus/realisations/${target.id}`)).body.item;
out.versions.remiseOrigine = (await api(owner, `/api/projects/${A}/contenus/realisations/${target.id}`, "PATCH", { data: { summary: target.data.summary }, ifVersion: cur.version })).status;

// 5. Isolation des hôtes : routes du Studio et de SYNA sur un nom de site.
const iso = {};
for (const path of ["/studio", "/api/studio-agent/draft", `/api/projects/${A}/contenus`, "/admin", `/preview/${A}/v/x/`]) { const r = await visitor.goto(`https://${hosts.platrier}:3943${path}`).catch(() => null); iso[path] = r ? r.status() : "erreur"; }
out.isolationHotes = iso;

// 6. Menus par métier (ordinateur) et onglet Réalisations au téléphone.
for (const key of ["platrier", "salon", "restaurant", "agence2"]) {
  await open(owner, `${STUDIO}/studio/${ids[key]}/pilote`); await owner.waitForTimeout(2000);
  out[`menu_${key}`] = await owner.locator("aside a[href*='/studio/']").evaluateAll((as) => [...new Set(as.map((a) => (a.getAttribute("href") ?? "").split("/").pop()))].filter(Boolean));
}
await shot(owner, "i276-02-menu-agence");
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await open(phone, `${STUDIO}/studio/${A}/realisations`); await phone.waitForTimeout(2000);
await shot(phone, "i276-03-telephone-realisations");
await open(phone, `${STUDIO}/studio/${A}/boutique`); await phone.waitForTimeout(2500);
await shot(phone, "i276-04-telephone-site");
await open(owner, `${STUDIO}/studio/${A}/boutique`); await owner.waitForTimeout(2500);
await shot(owner, "i276-05-ordinateur-site");

// 7. Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = { contenus: (await api(stranger, `/api/projects/${A}/contenus`)).status, publication: (await api(stranger, `/api/projects/${A}/site-publication`)).status, conversation: (await api(stranger, `/api/projects/${A}/conversation`)).status };
save("i276-recette", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
