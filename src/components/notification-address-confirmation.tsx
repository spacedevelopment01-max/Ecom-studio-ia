"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "./i18n";
import { api, Button, Logo } from "./ui";

/** Confirmation d'une adresse qui recevra les demandes d'un site (#232) : l'ouverture du lien seule ne suffit pas. */
export function NotificationAddressConfirmation({ token, valid }: { token: string; valid: boolean }) {
  const t=useT(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState("");
  async function confirm() {
    setBusy(true);setError("");
    try { const r=await api<{business:string}>("/api/site-notify/confirm",{body:{token}});setDone(r.business); }
    catch(e) {setError((e as Error).message);}
    setBusy(false);
  }
  return <main className="grid min-h-dvh place-items-center px-5 py-12"><div className="w-full max-w-md"><Link href="/"><Logo /></Link>
    <h1 className="mt-10 font-display text-3xl">{t("Recevoir les demandes du site", "Receive the site's requests")}</h1>
    {done!==""
      ? <p className="mt-4" role="status" data-notify-confirmed>{t(`Adresse confirmée : elle recevra désormais les demandes de devis et de contact${done?` de « ${done} »`:""}.`, `Address confirmed: it will now receive quote and contact requests${done?` for “${done}”`:""}.`)}</p>
      : <p className="mt-4 text-muted">{valid?t("Cette adresse recevra par e-mail les demandes envoyées depuis le site, après votre confirmation. L’ouverture du lien seule ne l’active pas.", "This address will receive the site's requests by email after you confirm. Opening the link alone does not activate it."):t("Ce lien est expiré ou a déjà été utilisé. Le propriétaire du site peut vous en envoyer un nouveau depuis son studio.", "This link has expired or was already used. The site owner can send you a new one from their studio.")}</p>}
    {error&&<p role="alert" className="mt-4 text-bad">{error}</p>}
    {valid&&done===""&&<Button className="mt-6" loading={busy} onClick={confirm}>{t("Confirmer", "Confirm")}</Button>}
  </div></main>;
}
