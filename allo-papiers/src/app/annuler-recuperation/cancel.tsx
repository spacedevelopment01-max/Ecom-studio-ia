"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/components/api";
import { Alert } from "@/components/ui";

export function CancelRecovery() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const w = window as unknown as { __apCancel?: string };
    w.__apCancel ??= location.hash.slice(1);
    setToken(w.__apCancel || null);
    if (location.hash) history.replaceState(null, "", location.pathname);
  }, []);
  async function cancel() {
    try {
      await api("/api/stepup/recovery/cancel", { method: "POST", json: { token } });
      setState("ok");
    } catch (e) {
      setState("error");
      setMsg(e instanceof ApiError ? e.message : "Annulation impossible.");
    }
  }
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Annuler la récupération du coffre-fort</h1>
      <p className="mt-2 text-muted">Si vous n'êtes pas à l'origine de la demande de récupération, annulez-la : vos clés d'accès actuelles resteront les seules à ouvrir votre coffre.</p>
      {state === "ok" && <Alert tone="ok" className="mt-4">Demande annulée. Par précaution, déconnectez les sessions inconnues depuis Compte › Sécurité.</Alert>}
      {state === "error" && <Alert tone="danger" className="mt-4">{msg}</Alert>}
      {state !== "ok" && <button className="btn btn-primary mt-6 w-full" onClick={cancel} disabled={!token}>Annuler la demande</button>}
    </>
  );
}
