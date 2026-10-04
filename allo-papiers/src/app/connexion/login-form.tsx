"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert } from "@/components/ui";

export function LoginForm({ suite }: { suite: string }) {
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      try {
        sessionStorage.setItem("ap_suite", suite);
      } catch {}
      const r = await api<{ message: string }>("/api/auth/request", { method: "POST", json: { email, terms } });
      setSent(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="mt-6">
        <div className="flex items-center gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
          <MailCheck className="h-7 w-7 shrink-0" aria-hidden />
          <p className="font-semibold">Regardez votre boîte email.</p>
        </div>
        <p className="mt-4 text-muted">{sent}</p>
        <p className="mt-2 text-muted">Ouvrez le lien sur <strong>cet appareil</strong>. Il est valable 15 minutes.</p>
        <button className="btn btn-outline mt-6 w-full" onClick={() => setSent(null)}>Utiliser une autre adresse</button>
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5">
      {error && <Alert tone="danger">{error}</Alert>}
      <div>
        <label htmlFor="email" className="field-label">Votre adresse email</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" />
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="check" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span className="text-[0.97rem]">
          J'accepte les <Link href="/conditions" className="font-semibold text-orange underline">conditions d'utilisation</Link> et j'ai lu la{" "}
          <Link href="/confidentialite" className="font-semibold text-orange underline">politique de confidentialité</Link>. <span className="text-muted">(Nécessaire pour créer un compte.)</span>
        </span>
      </label>
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
    </form>
  );
}
