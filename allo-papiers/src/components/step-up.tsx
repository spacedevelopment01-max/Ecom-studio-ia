"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, Mail, ShieldCheck, X } from "lucide-react";
import { api, ApiError, settleStepUp } from "./api";
import { Alert } from "./ui";

type Mode = "choix" | "email" | "recuperation";

/**
 * Vérification renforcée. La passkey (empreinte, visage ou code de l'appareil) est vérifiée
 * par le serveur ; l'empreinte ne quitte jamais l'appareil. Solution de secours : code par email.
 */
export function StepUpPanel({ onDone, onCancel, title = "Confirmez que c'est bien vous" }: { onDone: () => void; onCancel?: () => void; title?: string }) {
  const [mode, setMode] = useState<Mode>("choix");
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");

  useEffect(() => {
    api<{ hasPasskey: boolean }>("/api/auth/session").then((s) => setHasPasskey(Boolean(s.hasPasskey))).catch(() => setHasPasskey(false));
    import("@simplewebauthn/browser").then((m) => setSupported(m.browserSupportsWebAuthn()));
  }, []);

  const usePasskey = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/stepup/passkey/options", { method: "POST" });
      const response = await startAuthentication({ optionsJSON });
      await api("/api/stepup/passkey/verify", { method: "POST", json: { response } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La vérification n'a pas abouti. Réessayez, ou utilisez un code par email.");
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ message: string }>("/api/stepup/email/send", { method: "POST" });
      setInfo(r.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/stepup/email/verify", { method: "POST", json: { code, recoveryCode: recovery || undefined } });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Code refusé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-soft text-orange">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {onCancel && (
          <button type="button" className="btn-ghost btn -mr-2 -mt-1 !min-h-11 !px-2" onClick={onCancel} aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>
      <p className="mt-3 text-muted">Votre coffre-fort contient des documents personnels. Une vérification rapide est demandée pour l'ouvrir.</p>

      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      {info && <Alert tone="ok" className="mt-4">{info}</Alert>}

      {mode === "choix" && (
        <div className="mt-6 grid gap-3">
          {hasPasskey && supported && (
            <button type="button" className="btn btn-primary w-full" onClick={usePasskey} disabled={busy}>
              <Fingerprint className="h-6 w-6" aria-hidden /> Utiliser l'empreinte, le visage ou le code de l'appareil
            </button>
          )}
          {hasPasskey && !supported && (
            <Alert tone="warn">Ce navigateur ne prend pas en charge les clés d'accès. Utilisez un code de secours, ou ouvrez le site sur l'appareil où votre clé est enregistrée.</Alert>
          )}
          <button
            type="button"
            className={`btn w-full ${hasPasskey ? "btn-outline" : "btn-primary"}`}
            onClick={() => {
              setMode(hasPasskey ? "recuperation" : "email");
              void sendCode();
            }}
            disabled={busy || hasPasskey === null}
          >
            <Mail className="h-5 w-5" aria-hidden /> {hasPasskey ? "Je n'ai pas mon appareil : code de secours" : "Recevoir un code par email"}
          </button>
        </div>
      )}

      {(mode === "email" || mode === "recuperation") && (
        <form onSubmit={verifyCode} className="mt-6 grid gap-4">
          <div>
            <label className="field-label" htmlFor="code-email">Code reçu par email (6 chiffres)</label>
            <input id="code-email" className="input text-center text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
          </div>
          {mode === "recuperation" && (
            <div>
              <label className="field-label" htmlFor="code-secours">
                <KeyRound className="mr-1 inline h-4 w-4" aria-hidden /> Un de vos codes de secours
              </label>
              <input id="code-secours" className="input uppercase tracking-widest" autoComplete="off" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="XXXXX-XXXXX" required />
              <span className="field-help">
                Vous avez reçu ces codes en créant votre clé d'accès. Plus de codes ? <a className="font-semibold text-orange underline" href="/compte/securite#recuperation">Procédure de récupération</a>.
              </span>
            </div>
          )}
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>Valider</button>
          <div className="flex flex-wrap justify-between gap-2 text-[0.95rem]">
            <button type="button" className="font-semibold text-orange underline" onClick={sendCode} disabled={busy}>Renvoyer un code</button>
            <button type="button" className="text-muted underline" onClick={() => setMode("choix")}>Autre méthode</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Fenêtre de vérification, ouverte automatiquement quand une action sensible l'exige. */
export function StepUpHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("ap:stepup", h);
    return () => window.removeEventListener("ap:stepup", h);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Vérification renforcée">
      <div className="card max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-b-[var(--radius-card)]">
        <StepUpPanel
          onDone={() => {
            setOpen(false);
            settleStepUp(true);
          }}
          onCancel={() => {
            setOpen(false);
            settleStepUp(false);
          }}
        />
      </div>
    </div>
  );
}
