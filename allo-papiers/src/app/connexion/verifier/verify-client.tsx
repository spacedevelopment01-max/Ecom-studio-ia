"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/components/api";
import { Alert } from "@/components/ui";

/** Le jeton est lu dans le fragment (#) puis envoyé en POST après un clic : un antivirus qui « visite » le lien ne le consomme pas. */
export function VerifyClient() {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = location.hash.slice(1);
    setToken(t || "");
    if (t) history.replaceState(null, "", location.pathname);
  }, []);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ nouveauCompte: boolean }>("/api/auth/verify", { method: "POST", json: { token } });
      let suite = "/espace";
      try {
        suite = sessionStorage.getItem("ap_suite") || "/espace";
        sessionStorage.removeItem("ap_suite");
      } catch {}
      location.href = r.nouveauCompte ? "/espace?bienvenue=1" : suite;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Connexion impossible.");
      setBusy(false);
    }
  }

  if (token === null) return <p className="text-muted">Chargement…</p>;
  if (!token)
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">Lien incomplet</h1>
        <p className="mt-2 text-muted">Ce lien de connexion est incomplet. Copiez le lien entier depuis l'email, ou demandez-en un nouveau.</p>
        <Link href="/connexion" className="btn btn-primary mt-6 w-full">Demander un nouveau lien</Link>
      </>
    );
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Bonjour&nbsp;!</h1>
      <p className="mt-2 text-muted">Appuyez sur le bouton pour vous connecter à Allô Papiers sur cet appareil.</p>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      <button className="btn btn-primary mt-6 w-full" onClick={confirm} disabled={busy}>{busy ? "Connexion…" : "Me connecter"}</button>
      {error && <Link href="/connexion" className="btn btn-outline mt-3 w-full">Demander un nouveau lien</Link>}
    </>
  );
}
