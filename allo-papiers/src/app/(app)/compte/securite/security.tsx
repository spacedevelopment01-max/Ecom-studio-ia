"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, LifeBuoy, Monitor, ScrollText, Trash2 } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert, PageTitle, Spinner } from "@/components/ui";

type Data = {
  current: string;
  sessions: { id: string; created_at: string; last_seen_at: string; user_agent: string | null }[];
  passkeys: { id: string; nickname: string; created_at: string; last_used_at: string | null; backed_up: boolean }[];
  recoveryCodesLeft: number;
  vaultRecoveryReadyAt: string | null;
};

const ACTIONS: Record<string, string> = {
  connexion: "Connexion", compte_cree: "Création du compte", deconnexion: "Déconnexion", coffre_ouvert: "Coffre ouvert", original_ouvert: "Original consulté",
  original_telecharge: "Original téléchargé", document_analyse: "Document analysé", document_supprime: "Document supprimé", passkey_ajoutee: "Clé d'accès ajoutée",
  passkey_revoquee: "Clé d'accès supprimée", codes_secours_generes: "Codes de secours générés", code_secours_utilise: "Code de secours utilisé",
  session_revoquee: "Session déconnectée", export_donnees: "Export des données", envoi_valide: "Envoi validé", abonnement_resilie: "Abonnement résilié",
  recuperation_coffre_demandee: "Récupération du coffre demandée", recuperation_coffre_annulee: "Récupération annulée", recuperation_coffre_terminee: "Récupération terminée",
  consentement_ia_donne: "Consentement IA donné", consentement_ia_retire: "Consentement IA retiré", abonnement_paiement_ouvert: "Paiement ouvert", abonnement_repris: "Abonnement repris",
};

function device(ua: string | null) {
  if (!ua) return "Appareil inconnu";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Autre";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Navigateur";
  return `${br} · ${os}`;
}

export function Security() {
  const [d, setD] = useState<Data | null>(null);
  const [journal, setJournal] = useState<{ at: string; action: string; user_agent: string | null }[]>([]);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [nickname, setNickname] = useState("Mon téléphone");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setD(await api<Data>("/api/security/sessions"));
    setJournal((await api<{ events: typeof journal }>("/api/security/journal")).events);
  }, []);
  useEffect(() => {
    void load();
    import("@simplewebauthn/browser").then((m) => setSupported(m.browserSupportsWebAuthn()));
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setError(null);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
      await load();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "verification_annulee")) setError(e instanceof ApiError ? e.message : "Action impossible.");
    }
  }

  async function addPasskey() {
    await run(async () => {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsJSON = await withStepUp(() => api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/security/passkeys/options", { method: "POST" }));
      const response = await startRegistration({ optionsJSON });
      await api("/api/security/passkeys/verify", { method: "POST", json: { response, nickname } });
      const r = await api<{ codes: string[] }>("/api/security/recovery-codes", { method: "POST" });
      setCodes(r.codes);
    }, "Clé d'accès ajoutée. Notez vos codes de secours ci-dessous.");
  }

  if (!d) return <div className="container-page py-16">{error ? <Alert tone="danger">{error}</Alert> : <Spinner />}</div>;

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Compte" title="Sécurité">Gérez vos moyens d'accès au coffre-fort, vos sessions ouvertes et consultez le journal des accès.</PageTitle>
      {msg && <Alert tone="ok" className="mb-4">{msg}</Alert>}
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <section className="card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Fingerprint className="h-6 w-6 text-orange" aria-hidden /> Clés d'accès (passkeys)</h2>
        <p className="mt-2 text-[0.97rem] text-muted">Ouvrez votre coffre avec l'empreinte, le visage ou le code de votre appareil. <strong>Votre empreinte ne quitte jamais l'appareil</strong> : le site reçoit uniquement une clé publique et une preuve signée, vérifiée par notre serveur.</p>
        {supported === false && <Alert tone="warn" className="mt-3">Ce navigateur ne prend pas en charge les clés d'accès. Sur Android, utilisez Chrome à jour avec un verrouillage d'écran activé. À défaut, le code par email reste disponible.</Alert>}
        <ul className="mt-4 grid gap-2">
          {d.passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <span><span className="block font-semibold">{p.nickname}</span><span className="text-sm text-muted">Ajoutée le {new Date(p.created_at).toLocaleDateString("fr-FR")}{p.last_used_at ? ` · utilisée le ${new Date(p.last_used_at).toLocaleDateString("fr-FR")}` : ""}</span></span>
              <button className="btn btn-ghost !min-h-10 !px-2 text-danger" aria-label="Supprimer cette clé" onClick={() => { if (confirm("Supprimer cette clé d'accès ?")) void run(() => withStepUp(() => api(`/api/security/passkeys/${encodeURIComponent(p.id)}`, { method: "DELETE" })), "Clé supprimée."); }}><Trash2 className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
        {supported && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} aria-label="Nom de l'appareil" />
            <button className="btn btn-primary" onClick={addPasskey}><Fingerprint className="h-5 w-5" aria-hidden /> Ajouter cet appareil</button>
          </div>
        )}
        <p className="mt-3 text-sm text-muted">Une vérification (code par email) est demandée avant d'ajouter une clé.</p>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><KeyRound className="h-6 w-6 text-orange" aria-hidden /> Codes de secours</h2>
        <p className="mt-2 text-[0.97rem] text-muted">Si vous perdez votre appareil, un code de secours (avec un code reçu par email) permet d'ouvrir le coffre. Il vous en reste <strong>{d.recoveryCodesLeft}</strong>.</p>
        {codes && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-orange p-4">
            <p className="font-semibold">Notez ces codes maintenant : ils ne seront plus affichés.</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-mono text-lg">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
            <button className="btn btn-outline mt-3 !min-h-11" onClick={() => navigator.clipboard.writeText(codes.join("\n")).then(() => setMsg("Codes copiés."))}>Copier</button>
          </div>
        )}
        {d.passkeys.length > 0 && <button className="btn btn-outline mt-4" onClick={() => run(async () => setCodes((await withStepUp(() => api<{ codes: string[] }>("/api/security/recovery-codes", { method: "POST" }))).codes))}>Générer de nouveaux codes</button>}
      </section>

      <section id="recuperation" className="card mt-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><LifeBuoy className="h-6 w-6 text-orange" aria-hidden /> Appareil et codes perdus</h2>
        <p className="mt-2 text-[0.97rem] text-muted">Vous pouvez demander la récupération du coffre. Par sécurité, elle n'est utilisable qu'après <strong>72 heures</strong> ; un email vous permet de l'annuler si ce n'est pas vous. Ensuite, un code reçu par email ouvre le coffre et vos anciennes clés sont supprimées.</p>
        {d.vaultRecoveryReadyAt ? (
          <Alert tone="info" className="mt-3">Récupération demandée : utilisable à partir du {new Date(d.vaultRecoveryReadyAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.</Alert>
        ) : (
          d.passkeys.length > 0 && <button className="btn btn-outline mt-4" onClick={() => { if (confirm("Demander la récupération du coffre (délai de 72 heures) ?")) void run(() => api("/api/stepup/recovery/request", { method: "POST" }), "Demande enregistrée."); }}>Demander la récupération</button>
        )}
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Monitor className="h-6 w-6 text-orange" aria-hidden /> Sessions ouvertes</h2>
        <ul className="mt-3 grid gap-2">
          {d.sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <span><span className="block font-semibold">{device(s.user_agent)}{s.id === d.current ? " (cet appareil)" : ""}</span><span className="text-sm text-muted">Dernière activité : {new Date(s.last_seen_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</span></span>
              {s.id !== d.current && <button className="btn btn-outline !min-h-10" onClick={() => run(() => api(`/api/security/sessions/${s.id}`, { method: "DELETE" }), "Session déconnectée.")}>Déconnecter</button>}
            </li>
          ))}
        </ul>
      </section>

      <section id="journal" className="card mt-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ScrollText className="h-6 w-6 text-orange" aria-hidden /> Journal des accès</h2>
        <p className="mt-2 text-sm text-muted">Le journal ne contient jamais le contenu de vos documents.</p>
        <ul className="mt-3 grid max-h-96 gap-1 overflow-y-auto text-[0.95rem]">
          {journal.map((j, i) => <li key={i} className="flex justify-between gap-3 border-b border-line py-2"><span>{ACTIONS[j.action] ?? j.action}</span><span className="shrink-0 text-muted">{new Date(j.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
