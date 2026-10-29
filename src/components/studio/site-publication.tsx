"use client";
/**
 * « Publier votre site » (#232, prototype) : adresse du site, vérification et publication de la version actuelle,
 * pages légales, historique et restauration, demandes reçues, domaine personnalisé. Les refus du serveur sont montrés
 * tels quels (points bloquants listés), jamais masqués.
 */
import { useState } from "react";
import { Badge, Button, Modal, formatDate, useApi, useToast } from "../ui";
import { useT } from "../i18n";
import { fieldLabel } from "@/lib/sites/field-label";

type Overview = {
  configured: boolean;
  sitesDomain: string | null;
  customDomainsServed: boolean;
  live: { id: string; number: number; origin: string; createdAt: number; pages: number } | null;
  freshness: { live: boolean; upToDate: boolean; themeChanged: boolean; changedBiens: number };
  publications: { id: string; number: number; createdAt: number; pages: number; bytes: number; live: boolean; purged: boolean }[];
  storage: { used: number; limit: number; keep: number };
  domains: { hostname: string; state: "pending_dns" | "pointing" | "active" | "not_served" | "disabled" | "reverify" | "lost"; checkedAt: number | null; checkError: string | null; lastOkAt: number | null; dns: { txt: { name: string; value: string | null }; apex: boolean; pointing: { type: "CNAME" | "A/AAAA"; name: string; values: string[]; note: string | null } } }[];
  diagnostics?: { ok: boolean; checkedAt: number; checks: { key: string; ok: boolean; detail: string }[] };
  history: { id: string; publication_id: string | null; action: string; at: number }[];
  addresses: { hostname: string; kind: "studio" | "custom"; status: string; checkedAt: number | null; checkError: string | null; dns: { txt: { name: string; value: string | null }; cname: { name: string; value: string } | null } | null }[];
  requests: { id: string; hostname: string; page: string; fields: Record<string, string>; email: string | null; created_at: number; read_at: number | null; handled_at: number | null; kind: "contact" | "devis"; notification: NotificationState; notification_error: string | null }[];
  notifications: { smtp: boolean; recipients: { id: string; email: string; source: "account" | "manual"; status: "verified" | "pending" }[] };
  policies: { handle: string; title: string; text: string }[];
  reasons?: string[];
};

type NotificationState = "sent" | "pending" | "retrying" | "smtp_not_configured" | "failed" | "partial" | "no_recipient" | "before_email";
const NAME_KEYS = ["name", "nom", "full_name"];
const requestName = (f: Record<string, string>) => NAME_KEYS.map((k) => f[k]).find(Boolean) || [f.first_name || f.firstName, f.last_name || f.lastName].filter(Boolean).join(" ") || f.email || "";

export function SitePublication({ open, onClose, projectId, focusRequest }: { open: boolean; onClose: () => void; projectId: string; focusRequest?: string | null }) {
  const t = useT();
  const toast = useToast();
  const url = `/api/projects/${projectId}/site-publication`;
  const { data, reload } = useApi<Overview>(open ? url : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [policy, setPolicy] = useState<{ handle: string; title: string; text: string } | null>(null);
  const [recipient, setRecipient] = useState("");
  const [diag, setDiag] = useState<Overview["diagnostics"] | null>(null);
  const [showHandled, setShowHandled] = useState(false);
  const [openRequest, setOpenRequest] = useState<string | null>(focusRequest ?? null);

  async function act(action: string, extra: Record<string, unknown> = {}, done?: string) {
    setBusy(action);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (body.reasons) setReasons(body.reasons);
        else toast("bad", body.error ?? t("Action impossible.", "Action failed."));
        return false;
      }
      if (action === "check") setReasons(body.reasons ?? []);
      if (action === "diagnose") setDiag(body.diagnostics ?? null);
      if (action === "publish") setReasons(null);
      if (done) toast("ok", done);
      await reload();
      return true;
    } finally { setBusy(null); }
  }

  const studio = data?.addresses.find((a) => a.kind === "studio");
  const fresh = data?.requests.filter((r) => !r.handled_at) ?? [];
  const shown = (showHandled ? data?.requests : fresh) ?? [];
  const notifLabel = (n: NotificationState) => ({
    sent: t("E-mail envoyé", "Email sent"),
    pending: t("E-mail en cours d'envoi", "Email being sent"),
    retrying: t("E-mail retardé : nouvel essai automatique", "Email delayed: automatic retry"),
    before_email: t("Reçue avant l'envoi par e-mail", "Received before email sending"),
    smtp_not_configured: t("E-mail en attente : envoi non configuré", "Email waiting: sending not configured"),
    failed: t("E-mail non envoyé", "Email not sent"),
    partial: t("E-mail envoyé à une partie des adresses", "Email sent to some addresses"),
    no_recipient: t("Aucune adresse pour l'e-mail", "No address for the email"),
  })[n];
  const notifTone = (n: NotificationState) => (n === "sent" ? "ok" : n === "before_email" ? "neutral" : n === "failed" || n === "partial" || n === "no_recipient" ? "bad" : "warn") as "ok" | "bad" | "warn" | "neutral";
  return (
    <Modal open={open} onClose={onClose} title={t("Publier votre site", "Publish your site")} wide>
      {!data ? <p className="text-sm text-muted">{t("Chargement…", "Loading…")}</p> : (
        <div className="grid max-h-[72dvh] gap-6 overflow-y-auto pr-1" data-site-publication>
          <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn" data-prototype-notice>
            {t("Prototype : publication sur une adresse de test. L'hébergement public (domaine du studio, HTTPS) n'est pas encore activé.", "Prototype: publishing to a test address. Public hosting (studio domain, HTTPS) isn't enabled yet.")}
          </p>
          {!data.configured && <p className="text-sm text-warn">{t("L'hébergement des sites n'est pas configuré sur ce studio.", "Site hosting isn't configured on this studio.")}</p>}

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Votre site en ligne", "Your live site")}</h3>
            {data.live ? (
              <p className="text-sm" data-site-live>
                <Badge tone="ok">{t(`En ligne · publication ${data.live.number}`, `Live · publication ${data.live.number}`)}</Badge>{" "}
                <a className="underline" href={studio ? data.live.origin.replace(/\/\/[^:/]+/, `//${studio.hostname}`) : data.live.origin} target="_blank" rel="noreferrer">{studio?.hostname ?? data.live.origin}</a>
                <span className="text-muted"> · {formatDate(data.live.createdAt)} · {data.live.pages} {t("pages", "pages")}</span>
              </p>
            ) : <p className="text-sm text-muted">{t("Votre site n'est pas encore en ligne.", "Your site isn't live yet.")}</p>}
            {data.live && !data.freshness.upToDate && (
              <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn" data-site-pending>
                {t("Modifications non publiées : le site en ligne n'affiche pas encore vos derniers changements", "Unpublished changes: the live site doesn't show your latest changes yet")}
                {data.freshness.changedBiens > 0 && <> ({t(`${data.freshness.changedBiens} bien(s) modifié(s)`, `${data.freshness.changedBiens} propert(ies) changed`)}{data.freshness.themeChanged ? t(", site modifié", ", site changed") : ""})</>}
                {data.freshness.changedBiens === 0 && data.freshness.themeChanged && <> ({t("site modifié", "site changed")})</>}
                . {t("Ils sont visibles dans l'aperçu ; « Publier la version actuelle » les met en ligne.", "They're visible in the preview; “Publish the current version” puts them online.")}
              </p>
            )}
            {studio && <p className="text-xs text-muted">{t("Adresse :", "Address:")} <span className="font-medium text-ink" data-site-address>{studio.hostname}</span></p>}
            {data.configured && (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (slug.trim()) act("address", { slug }, t("Adresse enregistrée.", "Address saved.")); }}>
                <input className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm" placeholder={t("mon-entreprise", "my-business")} value={slug} onChange={(e) => setSlug(e.target.value)} aria-label={t("Adresse du site", "Site address")} />
                <span className="text-xs text-muted">.{data.sitesDomain}</span>
                <Button size="sm" variant="secondary" disabled={!!busy || !slug.trim()} type="submit">{t("Changer l'adresse", "Change address")}</Button>
              </form>
            )}
            {data.live && <p className="text-xs text-muted">{t("Après un changement d'adresse, republiez pour mettre à jour les liens de référencement du site.", "After changing the address, publish again to update the site's search links.")}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={!!busy || !data.configured} loading={busy === "check"} onClick={() => act("check")}>{t("Vérifier avant de publier", "Check before publishing")}</Button>
              <Button size="sm" disabled={!!busy || !data.configured} loading={busy === "publish"} onClick={() => act("publish", {}, t("Site publié.", "Site published."))} data-site-publish>{t("Publier la version actuelle", "Publish the current version")}</Button>
              {data.live && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("unpublish", {}, t("Site retiré de la ligne.", "Site taken offline."))}>{t("Retirer le site", "Take offline")}</Button>}
            </div>
            {reasons && (reasons.length ? (
              <div className="rounded-xl border border-warn/40 p-3 text-sm" data-publish-reasons>
                <p className="font-medium text-warn">{t("À corriger avant de publier :", "To fix before publishing:")}</p>
                <ul className="mt-1 list-disc pl-5">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                <p className="mt-2 text-xs text-muted">{t("Les textes se corrigent dans l'éditeur du site ; les pages légales ci-dessous.", "Texts are fixed in the site editor; legal pages below.")}</p>
              </div>
            ) : <p className="text-sm text-ok" data-publish-ready>{t("Rien ne bloque la publication.", "Nothing blocks publishing.")}</p>)}
          </section>

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Pages légales", "Legal pages")}</h3>
            <ul className="grid gap-2">
              {data.policies.map((p) => (
                <li key={p.handle} className="rounded-xl border border-line p-3 text-sm" data-policy={p.handle}>
                  {policy?.handle === p.handle ? (
                    <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (await act("policy", policy, t("Page légale enregistrée.", "Legal page saved."))) setPolicy(null); }}>
                      <input className="h-9 rounded-lg border border-line bg-card px-3" value={policy.title} onChange={(e) => setPolicy({ ...policy, title: e.target.value })} aria-label={t("Titre", "Title")} />
                      <textarea className="min-h-48 rounded-lg border border-line bg-card p-3" value={policy.text} onChange={(e) => setPolicy({ ...policy, text: e.target.value })} aria-label={p.title} />
                      <div className="flex gap-2"><Button size="sm" type="submit" disabled={!!busy}>{t("Enregistrer", "Save")}</Button><Button size="sm" variant="ghost" type="button" onClick={() => setPolicy(null)}>{t("Annuler", "Cancel")}</Button></div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{p.title}{/\[(À|A) compléter|À compléter dans Shopify/.test(p.text) && <Badge tone="warn" className="ml-2">{t("À compléter", "To complete")}</Badge>}</span>
                      <Button size="sm" variant="ghost" onClick={() => setPolicy(p)}>{t("Rédiger", "Write")}</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Publications", "Publications")}</h3>
            {!data.publications.length ? <p className="text-sm text-muted">{t("Aucune publication.", "No publication yet.")}</p> : (
              <ul className="grid gap-2" data-publications>
                {data.publications.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm" data-publication={p.number}>
                    <span>{t(`Publication ${p.number}`, `Publication ${p.number}`)} · {formatDate(p.createdAt)} · {p.pages} {t("pages", "pages")} · {Math.max(1, Math.round(p.bytes / 1024))} Ko {p.live && <Badge tone="ok">{t("En ligne", "Live")}</Badge>}</span>
                    {p.purged ? <Badge>{t("Ancienne version : fichiers purgés", "Old version: files purged")}</Badge> : !p.live && <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("restore", { publicationId: p.id }, t(`Publication ${p.number} remise en ligne.`, `Publication ${p.number} back online.`))}>{t("Remettre en ligne", "Put back online")}</Button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="-mt-4 text-xs text-muted" data-site-storage>{t(`Espace utilisé : ${Math.round(data.storage.used / 1048576)} Mo sur ${Math.round(data.storage.limit / 1048576)} Mo inclus. Les ${data.storage.keep} versions les plus récentes restent restaurables ; les plus anciennes sont purgées automatiquement (jamais la version en ligne).`, `Space used: ${Math.round(data.storage.used / 1048576)} MB of ${Math.round(data.storage.limit / 1048576)} MB included. The ${data.storage.keep} most recent versions stay restorable; older ones are purged automatically (never the live one).`)}</p>

          <section className="grid gap-2" data-site-diagnostics>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("Diagnostic du site", "Site diagnostics")}</h3>
              <Button size="sm" variant="secondary" disabled={!!busy} loading={busy === "diagnose"} onClick={() => act("diagnose")}>{t("Vérifier le site en ligne", "Check the live site")}</Button>
            </div>
            {diag && (
              <ul className="grid gap-1 rounded-xl border border-line p-3 text-sm" data-diagnostics-result={diag.ok ? "ok" : "problems"}>
                {diag.checks.map((c) => <li key={c.key} className="flex gap-2"><Badge tone={c.ok ? "ok" : "warn"}>{c.ok ? t("OK", "OK") : t("À voir", "Check")}</Badge><span>{c.detail}</span></li>)}
              </ul>
            )}
          </section>

          <section className="grid gap-2" data-site-notifications>
            <h3 className="font-semibold">{t("Recevoir les demandes par e-mail", "Receive requests by email")}</h3>
            <p className="text-xs text-muted">{t("Chaque demande de devis ou de contact vous est envoyée par e-mail ; vous répondez au visiteur directement depuis votre boîte. Une copie reste ici.", "Each quote or contact request is emailed to you; you reply to the visitor straight from your inbox. A copy stays here.")}</p>
            {!data.notifications.smtp && <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn" data-smtp-missing>{t("L'envoi d'e-mails n'est pas encore configuré sur le studio : les demandes sont bien enregistrées ici, et leurs e-mails partiront dès que l'envoi sera configuré (dans les 7 jours).", "Email sending isn't configured on the studio yet: requests are saved here, and their emails will go out as soon as sending is configured (within 7 days).")}</p>}
            <ul className="grid gap-2">
              {data.notifications.recipients.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm" data-recipient={r.email}>
                  <span className="min-w-0 break-all">{r.email} {r.status === "verified" ? <Badge tone="ok">{r.source === "account" ? t("Adresse du compte", "Account address") : t("Confirmée", "Confirmed")}</Badge> : <Badge tone="warn">{t("En attente de confirmation", "Awaiting confirmation")}</Badge>}</span>
                  <span className="flex gap-2">
                    {r.status === "pending" && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("recipient-resend", { email: r.email }, t("Nouveau lien envoyé.", "New link sent."))}>{t("Renvoyer le lien", "Resend link")}</Button>}
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("recipient-remove", { id: r.id }, t("Adresse retirée.", "Address removed."))}>{t("Retirer", "Remove")}</Button>
                  </span>
                </li>
              ))}
            </ul>
            {!data.notifications.recipients.some((r) => r.status === "verified") && <p className="text-sm text-bad" data-no-recipient>{t("Aucune adresse confirmée : les demandes restent seulement ici.", "No confirmed address: requests stay only here.")}</p>}
            {data.notifications.recipients.length < 3 && (
              <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (recipient.trim()) act("recipient-add", { email: recipient }, t("Adresse ajoutée. Si ce n'est pas celle de votre compte, un lien de confirmation lui a été envoyé.", "Address added. If it isn't your account address, a confirmation link was sent to it.")).then((x) => x && setRecipient("")); }}>
                <input type="email" className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm" placeholder="contact@mon-entreprise.fr" value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label={t("Adresse qui recevra les demandes", "Address that will receive requests")} />
                <Button size="sm" variant="secondary" type="submit" disabled={!!busy || !recipient.trim()}>{t("Ajouter l'adresse", "Add address")}</Button>
              </form>
            )}
            <p className="text-xs text-muted">{t("3 adresses au plus. Une nouvelle adresse ne reçoit rien avant d'avoir confirmé le lien qui lui est envoyé.", "3 addresses at most. A new address receives nothing until it confirms the link sent to it.")}</p>
          </section>

          <section className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("Demandes reçues", "Requests received")} {fresh.length > 0 && <Badge tone="info">{fresh.length} {t("nouvelle(s)", "new")}</Badge>}</h3>
              {data.requests.length > fresh.length && <Button size="sm" variant="ghost" onClick={() => setShowHandled(!showHandled)}>{showHandled ? t("Masquer les traitées", "Hide handled") : t("Afficher aussi les traitées", "Show handled too")}</Button>}
            </div>
            {!shown.length ? <p className="text-sm text-muted">{data.requests.length ? t("Aucune nouvelle demande.", "No new request.") : t("Aucune demande reçue pour l'instant.", "No requests received yet.")}</p> : (
              <ul className="grid gap-2" data-site-requests>
                {shown.map((r) => (
                  <li key={r.id} className={`rounded-xl border p-3 text-sm ${r.id === focusRequest ? "border-signal" : "border-line"}`} data-site-request={r.id} data-request-kind={r.kind} data-notification={r.notification}>
                    <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => { setOpenRequest(openRequest === r.id ? null : r.id); if (!r.read_at) act("request-read", { id: r.id }); }} aria-expanded={openRequest === r.id}>
                      <span className="min-w-0"><span className="font-medium">{requestName(r.fields) || t("Visiteur", "Visitor")}</span> <span className="text-muted">· {r.kind === "devis" ? t("Devis", "Quote") : t("Contact", "Contact")} · {formatDate(r.created_at)}</span>{!r.read_at && <Badge tone="info" className="ml-2">{t("Non lue", "Unread")}</Badge>}{r.handled_at && <Badge className="ml-2">{t("Traitée", "Handled")}</Badge>}</span>
                      <Badge tone={notifTone(r.notification)}>{notifLabel(r.notification)}</Badge>
                    </button>
                    {openRequest === r.id && (
                      <div className="mt-2 grid gap-2" data-request-detail>
                        <p className="text-xs text-muted">{r.hostname}{r.page}{r.notification_error && <> · {t("motif", "reason")} : <code>{r.notification_error}</code></>}</p>
                        <dl className="grid gap-0.5">{Object.entries(r.fields).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="shrink-0 text-muted">{fieldLabel(k)}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{v}</dd></div>)}</dl>
                        <div className="flex flex-wrap gap-2">
                          {r.email && <a className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[13px]" href={`mailto:${encodeURIComponent(r.email)}`}>{t("Répondre par e-mail", "Reply by email")}</a>}
                          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("request-handled", { id: r.id, handled: !r.handled_at })}>{r.handled_at ? t("Remettre en nouvelle", "Mark as new") : t("Marquer comme traitée", "Mark as handled")}</Button>
                          {(r.notification === "failed" || r.notification === "partial") && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("request-retry", { id: r.id }, t("Nouvel envoi lancé.", "New sending started."))}>{t("Renvoyer l'e-mail", "Send the email again")}</Button>}
                          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("request-delete", { id: r.id }, t("Demande effacée.", "Request deleted."))}>{t("Effacer", "Delete")}</Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">{t("Les demandes sont conservées 12 mois, puis effacées automatiquement. « Effacer » les supprime tout de suite (droit à l'effacement du visiteur).", "Requests are kept 12 months, then deleted automatically. “Delete” removes them right away (the visitor's right to erasure).")}</p>
          </section>

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Votre propre nom de domaine", "Your own domain name")}</h3>
            <p className="text-xs text-muted">{data.customDomainsServed ? t("Reliez un domaine que vous possédez déjà.", "Connect a domain you already own.") : t("Préparation possible ; les domaines personnalisés ne sont pas encore servis par ce studio (HTTPS à activer).", "You can prepare it; custom domains aren't served by this studio yet (HTTPS to be enabled).")}</p>
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (domain.trim()) act("domain-add", { hostname: domain }, t("Domaine ajouté : suivez les instructions DNS.", "Domain added: follow the DNS instructions.")).then((x) => x && setDomain("")); }}>
              <input className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm" placeholder="www.mon-entreprise.fr" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label={t("Nom de domaine", "Domain name")} />
              <Button size="sm" variant="secondary" type="submit" disabled={!!busy || !domain.trim() || !data.configured}>{t("Ajouter", "Add")}</Button>
            </form>
            {data.domains.map((d) => {
              const proofOk = !["pending_dns", "lost"].includes(d.state);
              const pointOk = ["active", "not_served"].includes(d.state);
              const label = {
                pending_dns: t("Étape 1 : preuve de propriété à ajouter", "Step 1: proof of ownership to add"),
                pointing: t("Propriété prouvée · étape 2 : pointage à faire", "Ownership proven · step 2: pointing to do"),
                active: t("Actif", "Active"),
                not_served: t("Prêt · pas encore servi par ce studio (HTTPS à activer)", "Ready · not served by this studio yet (HTTPS to enable)"),
                disabled: t("Désactivé", "Disabled"),
                reverify: t("À revérifier (le site a changé de propriétaire)", "To verify again (the site changed owner)"),
                lost: t("Perdu : preuve DNS disparue", "Lost: DNS proof gone"),
              }[d.state];
              const tone = d.state === "active" ? "ok" : d.state === "lost" || d.state === "reverify" ? "bad" : d.state === "disabled" ? "neutral" : "warn";
              return (
                <div key={d.hostname} className="grid gap-2 rounded-xl border border-line p-3 text-sm" data-custom-domain={d.hostname} data-domain-state={d.state}>
                  <p className="font-medium">{d.hostname} <Badge tone={tone as "ok" | "bad" | "warn" | "neutral"}>{label}</Badge></p>
                  <ol className="grid gap-1.5 text-xs">
                    <li className="flex gap-2"><Badge tone={proofOk ? "ok" : "warn"}>1</Badge><span>{t("Preuve de propriété — chez votre fournisseur de domaine, ajoutez un enregistrement", "Proof of ownership — at your domain provider, add a record")} <code className="break-all">TXT {d.dns.txt.name} = {d.dns.txt.value}</code>. {t("Laissez-le en place : il est revérifié chaque jour.", "Leave it in place: it's checked again every day.")}</span></li>
                    <li className="flex gap-2"><Badge tone={pointOk ? "ok" : "warn"}>2</Badge><span>{t("Pointage —", "Pointing —")} {d.dns.pointing.values.length ? <code className="break-all">{d.dns.pointing.type === "CNAME" ? `CNAME ${d.dns.pointing.name} → ${d.dns.pointing.values[0]}` : `A/AAAA ${d.dns.pointing.name} → ${d.dns.pointing.values.join(", ")}`}</code> : null} {d.dns.pointing.note}{d.dns.apex && <> {t("Conseil : reliez aussi « www ».", "Tip: also connect “www”.")}</>}</span></li>
                    <li className="flex gap-2"><Badge tone={d.state === "active" ? "ok" : "neutral"}>3</Badge><span>{d.state === "active" ? t("HTTPS : certificat émis automatiquement à la première visite.", "HTTPS: certificate issued automatically on the first visit.") : t("HTTPS : automatique une fois les étapes 1 et 2 validées et l'hébergement des domaines activé sur le serveur.", "HTTPS: automatic once steps 1 and 2 pass and domain hosting is enabled on the server.")}</span></li>
                  </ol>
                  {d.checkError && <p className="text-xs text-warn" data-domain-error>{d.checkError}</p>}
                  {d.checkedAt && <p className="text-xs text-muted">{t("Dernière vérification :", "Last check:")} {formatDate(d.checkedAt)}</p>}
                  <div className="flex flex-wrap gap-2">
                    {d.state !== "disabled" && <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("domain-verify", { hostname: d.hostname })}>{t("Vérifier", "Verify")}</Button>}
                    {d.state === "disabled"
                      ? <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("domain-enable", { hostname: d.hostname, enabled: true }, t("Domaine revérifié.", "Domain verified again."))}>{t("Réactiver", "Re-enable")}</Button>
                      : proofOk && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("domain-enable", { hostname: d.hostname, enabled: false }, t("Domaine désactivé : il n'est plus servi.", "Domain disabled: it's no longer served."))}>{t("Désactiver", "Disable")}</Button>}
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("domain-remove", { hostname: d.hostname }, t("Domaine retiré.", "Domain removed."))}>{t("Retirer", "Remove")}</Button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </Modal>
  );
}
