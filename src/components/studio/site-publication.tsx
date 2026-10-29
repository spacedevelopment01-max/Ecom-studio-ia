"use client";
/**
 * « Publier votre site » (#232, prototype) : adresse du site, vérification et publication de la version actuelle,
 * pages légales, historique et restauration, demandes reçues, domaine personnalisé. Les refus du serveur sont montrés
 * tels quels (points bloquants listés), jamais masqués.
 */
import { useState } from "react";
import { Badge, Button, Modal, formatDate, useApi, useToast } from "../ui";
import { useT } from "../i18n";

type Overview = {
  configured: boolean;
  sitesDomain: string | null;
  customDomainsServed: boolean;
  live: { id: string; number: number; origin: string; createdAt: number; pages: number } | null;
  publications: { id: string; number: number; createdAt: number; pages: number; bytes: number; live: boolean }[];
  history: { id: string; publication_id: string | null; action: string; at: number }[];
  addresses: { hostname: string; kind: "studio" | "custom"; status: string; checkedAt: number | null; checkError: string | null; dns: { txt: { name: string; value: string | null }; cname: { name: string; value: string } | null } | null }[];
  requests: { id: string; hostname: string; page: string; fields: Record<string, string>; email: string | null; created_at: number; read_at: number | null; notified: string }[];
  policies: { handle: string; title: string; text: string }[];
  reasons?: string[];
};

export function SitePublication({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const t = useT();
  const toast = useToast();
  const url = `/api/projects/${projectId}/site-publication`;
  const { data, reload } = useApi<Overview>(open ? url : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [policy, setPolicy] = useState<{ handle: string; title: string; text: string } | null>(null);

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
      if (action === "publish") setReasons(null);
      if (done) toast("ok", done);
      await reload();
      return true;
    } finally { setBusy(null); }
  }

  const studio = data?.addresses.find((a) => a.kind === "studio");
  const customs = data?.addresses.filter((a) => a.kind === "custom") ?? [];
  const unread = data?.requests.filter((r) => !r.read_at).length ?? 0;
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
                    {!p.live && <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("restore", { publicationId: p.id }, t(`Publication ${p.number} remise en ligne.`, `Publication ${p.number} back online.`))}>{t("Remettre en ligne", "Put back online")}</Button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Demandes reçues", "Requests received")} {unread > 0 && <Badge tone="info">{unread}</Badge>}</h3>
            {!data.requests.length ? <p className="text-sm text-muted">{t("Aucune demande reçue pour l'instant.", "No requests received yet.")}</p> : (
              <ul className="grid gap-2" data-site-requests>
                {data.requests.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-3 text-sm" data-site-request={r.id}>
                    <p className="text-xs text-muted">{formatDate(r.created_at)} · {r.hostname}{r.page} · {r.notified === "sent" ? t("e-mail envoyé au professionnel", "email sent to the business") : t("aucun e-mail (envoi non configuré) : consultable ici", "no email (sending not configured): viewable here")}</p>
                    <dl className="mt-1 grid gap-0.5">{Object.entries(r.fields).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>)}</dl>
                    <div className="mt-2 flex gap-2">
                      {!r.read_at && <Button size="sm" variant="ghost" onClick={() => act("request-read", { id: r.id })}>{t("Marquer comme lue", "Mark as read")}</Button>}
                      <Button size="sm" variant="ghost" onClick={() => act("request-delete", { id: r.id }, t("Demande effacée.", "Request deleted."))}>{t("Effacer", "Delete")}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">{t("Les demandes sont conservées 12 mois, puis effacées automatiquement.", "Requests are kept 12 months, then deleted automatically.")}</p>
          </section>

          <section className="grid gap-2">
            <h3 className="font-semibold">{t("Votre propre nom de domaine", "Your own domain name")}</h3>
            <p className="text-xs text-muted">{data.customDomainsServed ? t("Reliez un domaine que vous possédez déjà.", "Connect a domain you already own.") : t("Préparation possible ; les domaines personnalisés ne sont pas encore servis par ce studio (HTTPS à activer).", "You can prepare it; custom domains aren't served by this studio yet (HTTPS to be enabled).")}</p>
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (domain.trim()) act("domain-add", { hostname: domain }, t("Domaine ajouté : suivez les instructions DNS.", "Domain added: follow the DNS instructions.")).then((x) => x && setDomain("")); }}>
              <input className="h-9 min-w-0 flex-1 rounded-full border border-line bg-card px-3 text-sm" placeholder="www.mon-entreprise.fr" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label={t("Nom de domaine", "Domain name")} />
              <Button size="sm" variant="secondary" type="submit" disabled={!!busy || !domain.trim() || !data.configured}>{t("Ajouter", "Add")}</Button>
            </form>
            {customs.map((a) => (
              <div key={a.hostname} className="grid gap-1 rounded-xl border border-line p-3 text-sm" data-custom-domain={a.hostname}>
                <p className="font-medium">{a.hostname} <Badge tone={a.status === "verified" ? "ok" : "warn"}>{a.status === "verified" ? t("Vérifié", "Verified") : t("En attente du DNS", "Waiting for DNS")}</Badge></p>
                {a.dns && <p className="text-xs">{t("Chez votre fournisseur de domaine, ajoutez :", "At your domain provider, add:")} <code>TXT {a.dns.txt.name} = {a.dns.txt.value}</code>{a.dns.cname && <> {t("puis", "then")} <code>CNAME {a.dns.cname.name} → {a.dns.cname.value}</code></>}</p>}
                {a.checkError && <p className="text-xs text-warn">{a.checkError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("domain-verify", { hostname: a.hostname })}>{t("Vérifier", "Verify")}</Button>
                  <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("domain-remove", { hostname: a.hostname }, t("Domaine retiré.", "Domain removed."))}>{t("Retirer", "Remove")}</Button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </Modal>
  );
}
