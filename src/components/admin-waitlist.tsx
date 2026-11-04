"use client";
/**
 * Administration › Liste d'attente (#420) : inscriptions reçues par le formulaire public (et anciennes lignes importées),
 * état de la notification interne avec reprise, raccordement signé du site, import sans e-mail.
 */
import { useState } from "react";
import { api, Badge, Button, Card, Field, Input, useApi, useToast } from "./ui";
import { useLang, useT } from "./i18n";
import type { adminWaitlist } from "@/lib/waitlist";

type Data = ReturnType<typeof adminWaitlist> & { newSecret?: string; import?: { created: number; duplicates: number; rejected: { index: number; reason: string }[] } };

export function WaitlistAdmin() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, setData } = useApi<Data>("/api/admin/waitlist");
  const [busy, setBusy] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const post = async (key: string, body: unknown, done?: string) => {
    setBusy(key);
    try {
      const r = await api<Data>("/api/admin/waitlist", { body });
      setData(r);
      if (done) toast("ok", done);
      return r;
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const when = (ms: number) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(ms));
  if (!data) return <div className="skeleton h-72 rounded-3xl" />;
  const s = data.settings;
  const failed = data.counts.failed ?? 0;
  const consent = (c: string) => c === "given" ? <Badge tone="ok">{t("Consentement donné", "Consent given")}</Badge> : c === "refused" ? <Badge tone="bad">{t("Consentement refusé", "Consent refused")}</Badge> : <Badge tone="warn">{t("Consentement non enregistré", "Consent not recorded")}</Badge>;
  const notify = (n: Data["signups"][number]["notify"], source: string) => {
    if (n.status === "sent") return <Badge tone="ok" dot>{t("Notifiée", "Notified")}{n.notifiedAt ? ` · ${when(n.notifiedAt)}` : ""}</Badge>;
    if (n.status === "skipped") return <Badge>{source === "import" ? t("Importée — sans e-mail", "Imported — no email") : t("Sans e-mail", "No email")}</Badge>;
    if (n.status === "failed") return <Badge tone="bad" dot>{t("Échec de la notification", "Notification failed")}{n.error ? ` (${n.error})` : ""}</Badge>;
    if (n.status === "sending") return <Badge tone="warn" dot>{t("Envoi en cours", "Sending")}</Badge>;
    return <Badge tone="warn" dot>{!s.smtpConfigured ? t("En attente : SMTP non configuré", "Waiting: SMTP not configured") : n.attempts ? t(`Nouvel essai prévu (${n.attempts} essai${n.attempts > 1 ? "s" : ""})`, `Retry scheduled (${n.attempts} attempt${n.attempts > 1 ? "s" : ""})`) : t("Notification en attente", "Notification pending")}</Badge>;
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5" data-admin-waitlist>
      <Card className="grid gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{t("Liste d'attente", "Waitlist")}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>{t(`${data.total} inscription${data.total > 1 ? "s" : ""}`, `${data.total} signup${data.total > 1 ? "s" : ""}`)}</Badge>
            {failed > 0 && <Badge tone="bad">{t(`${failed} notification${failed > 1 ? "s" : ""} en échec`, `${failed} failed notification${failed > 1 ? "s" : ""}`)}</Badge>}
          </div>
        </div>
        <p className="text-sm text-ink-2">{t("Inscriptions reçues par le formulaire public de la liste d'attente. Chaque nouvelle inscription est enregistrée ici d'abord, puis signalée par e-mail à l'adresse interne ci-dessous. Une adresse déjà inscrite n'est ni réenregistrée ni renotifiée. Aucun e-mail n'est envoyé aux inscrits.", "Signups received by the public waitlist form. Each new signup is saved here first, then reported by email to the internal address below. An address already signed up is neither saved nor reported again. No email is sent to the people who sign up.")}</p>
        {failed > 0 && <div><Button size="sm" loading={busy === "retry-failed"} onClick={() => void post("retry-failed", { action: "retry-failed" }, t("Nouvel essai lancé.", "Retry started."))}>{t("Retenter les notifications en échec", "Retry failed notifications")}</Button></div>}
      </Card>

      <Card className="overflow-hidden p-0">
        {data.signups.length === 0 ? <p className="p-5 text-sm text-muted">{t("Aucune inscription reçue pour l'instant.", "No signup received yet.")}</p> : (
          <ul className="divide-y divide-line" aria-label={t("Inscriptions", "Signups")}>
            {data.signups.map((r) => (
              <li key={r.id} className="grid gap-2 p-4 text-sm" data-waitlist-row={r.id}>
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 break-words"><strong>{r.firstName ?? t("Prénom non renseigné", "No first name")}</strong> · <span className="break-all">{r.email}</span></p>
                  <span className="text-xs text-muted">{when(r.signedUpAt)}</span>
                </div>
                <p className="break-words"><span className="text-muted">{t("Type de projet : ", "Project type: ")}</span>{r.category}</p>
                {r.description && <p className="whitespace-pre-wrap break-words text-ink-2">{r.description}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {consent(r.consent)}
                  {notify(r.notify, r.source)}
                  {r.resubmissions > 0 && <Badge>{t(`Réinscrite ${r.resubmissions} fois (sans nouvel e-mail)`, `Signed up again ${r.resubmissions}× (no new email)`)}</Badge>}
                  {(r.notify.status === "failed" || (r.notify.status === "pending" && r.notify.attempts > 0)) && <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => void post(r.id, { action: "retry", id: r.id }, t("Nouvel essai lancé.", "Retry started."))}>{t("Retenter la notification", "Retry notification")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {data.truncated && <p className="border-t border-line p-4 text-xs text-muted">{t("Affichage limité aux 500 inscriptions les plus récentes.", "Showing the 500 most recent signups.")}</p>}
      </Card>

      <Card className="grid gap-4 p-5">
        <h3 className="font-display text-lg font-semibold">{t("Notification et raccordement", "Notification and connection")}</h3>
        <div className="flex flex-wrap gap-2">
          {s.smtpConfigured ? <Badge tone="ok" dot>{t("SMTP du Studio configuré", "Studio SMTP configured")}</Badge> : <Badge tone="warn" dot>{t("SMTP à configurer (onglet E-mails)", "SMTP to configure (Emails tab)")}</Badge>}
          {s.secretConfigured ? <Badge tone="ok" dot>{t("Secret de raccordement enregistré", "Connection secret saved")}</Badge> : <Badge tone="warn" dot>{t("Secret de raccordement à créer", "Connection secret to create")}</Badge>}
        </div>
        <Field label={t("Adresse interne prévenue à chaque inscription", "Internal address notified for each signup")} htmlFor="wl-to">
          <div className="flex flex-wrap gap-2">
            <Input id="wl-to" className="min-w-0 flex-1" type="email" value={to ?? s.notifyTo} onChange={(e) => setTo(e.target.value)} />
            <Button variant="secondary" disabled={to === null || to === s.notifyTo} loading={busy === "to"} onClick={() => void post("to", { action: "notify-to", email: to }, t("Adresse enregistrée.", "Address saved.")).then(() => setTo(null))}>{t("Enregistrer", "Save")}</Button>
          </div>
        </Field>
        <div className="grid gap-2 text-sm">
          <p className="text-ink-2">{t("Le serveur du site de la liste d'attente envoie chaque inscription à cette adresse, signée avec le secret ci-dessous (jamais depuis le navigateur) :", "The waitlist site's server sends each signup to this address, signed with the secret below (never from the browser):")}</p>
          <code className="block overflow-x-auto rounded-lg bg-paper-2 p-2 text-xs">{s.endpoint}</code>
          {secret ? (
            <div className="grid gap-2 rounded-xl border border-line p-3" role="status">
              <p className="font-medium">{t("Nouveau secret — copiez-le maintenant dans les secrets du serveur du site (WAITLIST_STUDIO_SECRET). Il ne sera plus jamais affiché.", "New secret — copy it now into the site server's secrets (WAITLIST_STUDIO_SECRET). It will never be shown again.")}</p>
              <code className="block overflow-x-auto break-all rounded-lg bg-paper-2 p-2 text-xs">{secret}</code>
              <div><Button size="sm" variant="ghost" onClick={() => { try { void navigator.clipboard.writeText(secret); toast("ok", t("Copié.", "Copied.")); } catch { /* copie manuelle */ } }}>{t("Copier", "Copy")}</Button> <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>{t("Masquer", "Hide")}</Button></div>
            </div>
          ) : confirmRotate ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>{s.secretConfigured ? t("Le site cessera d'être accepté tant que le nouveau secret n'y est pas copié. Continuer ?", "The site will be refused until the new secret is copied there. Continue?") : t("Créer le secret maintenant ?", "Create the secret now?")}</span>
              <Button size="sm" loading={busy === "secret"} onClick={() => void post("secret", { action: "rotate-secret" }).then((r) => { if (r?.newSecret) setSecret(r.newSecret); setConfirmRotate(false); })}>{t("Oui", "Yes")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRotate(false)}>{t("Annuler", "Cancel")}</Button>
            </div>
          ) : <div><Button size="sm" variant="secondary" onClick={() => setConfirmRotate(true)}>{s.secretConfigured ? t("Remplacer le secret", "Replace the secret") : t("Créer le secret de raccordement", "Create the connection secret")}</Button></div>}
        </div>
      </Card>

      <Card className="grid gap-3 p-5">
        <h3 className="font-display text-lg font-semibold">{t("Importer les inscriptions déjà reçues", "Import signups already received")}</h3>
        <p className="text-sm text-ink-2">{t("Collez l'export de la base du site (CSV ou JSON). Les inscriptions importées ne déclenchent aucun e-mail ; une adresse déjà présente est ignorée. Sans information de consentement, la ligne est marquée « Consentement non enregistré ».", "Paste the site database export (CSV or JSON). Imported signups never trigger an email; an address already present is skipped. Without consent information, the row is marked “Consent not recorded”.")}</p>
        <div className="flex gap-2" role="group" aria-label={t("Format", "Format")}>
          {(["csv", "json"] as const).map((f) => <button key={f} type="button" aria-pressed={importFormat === f} onClick={() => setImportFormat(f)} className={importFormat === f ? "h-9 rounded-full bg-ink px-4 text-sm text-paper" : "h-9 rounded-full border border-line px-4 text-sm"}>{f.toUpperCase()}</button>)}
        </div>
        <textarea aria-label={t("Contenu de l'export", "Export content")} className="min-h-32 w-full rounded-xl border border-line bg-card p-3 font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={importFormat === "csv" ? "created_at,first_name,email,category,description,consent" : '[{"email":"…","category":"…"}]'} />
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!importText.trim()} loading={busy === "import"} onClick={() => void post("import", { action: "import", format: importFormat, text: importText }).then((r) => { if (r?.import) { toast("ok", t(`${r.import.created} importée(s), ${r.import.duplicates} déjà présente(s), ${r.import.rejected.length} refusée(s).`, `${r.import.created} imported, ${r.import.duplicates} already present, ${r.import.rejected.length} rejected.`)); setImportText(""); } })}>{t("Importer sans e-mail", "Import without email")}</Button>
          {data.import && data.import.rejected.length > 0 && <span className="text-xs text-muted">{t("Lignes refusées : ", "Rejected rows: ")}{data.import.rejected.slice(0, 10).map((x) => `n°${x.index + 2} (${x.reason})`).join(", ")}</span>}
        </div>
      </Card>
    </div>
  );
}
