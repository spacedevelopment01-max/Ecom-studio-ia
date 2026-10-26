"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "./i18n";
import { api, Button, Field, Input, Logo } from "./ui";
import { safeNextPath } from "@/lib/safe-path";

export function RegistrationConfirmation({ token, valid }: { token: string; valid: boolean }) {
  const t=useT(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const [password,setPassword]=useState("");
  async function confirm() {
    setBusy(true);setError("");
    try { const r=await api<{next:string}>("/api/auth/confirm-registration",{body:{token,password}});window.location.assign(safeNextPath(r.next)); }
    catch(e) {setError((e as Error).message);setBusy(false);}
  }
  return <main className="grid min-h-dvh place-items-center px-5 py-12"><div className="w-full max-w-md"><Link href="/"><Logo /></Link><h1 className="mt-10 font-display text-3xl">{t("Confirmer votre inscription", "Confirm your registration")}</h1><p className="mt-4 text-muted">{valid?t("Votre compte sera créé après votre confirmation. L’ouverture du lien seule ne l’active pas.", "Your account will be created after confirmation. Opening the link alone does not activate it."):t("Ce lien est expiré ou a déjà été utilisé. Vous pouvez recommencer l’inscription ou vous connecter.", "This link has expired or was already used. You can register again or sign in.")}</p>{error&&<p role="alert" className="mt-4 text-bad">{error}</p>}{valid&&<div className="mt-6"><Field label={t("Mot de passe choisi à l’inscription", "Password chosen at registration")} htmlFor="confirm-password"><Input id="confirm-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></Field></div>}{valid&&<Button className="mt-6" loading={busy} onClick={confirm}>{t("Confirmer et ouvrir mon studio", "Confirm and open my studio")}</Button>}<p className="mt-6"><Link className="underline" href="/connexion">{t("Se connecter", "Sign in")}</Link> · <Link className="underline" href="/inscription">{t("S’inscrire", "Register")}</Link></p></div></main>;
}
