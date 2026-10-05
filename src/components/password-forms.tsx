"use client";
/**
 * Mot de passe oublié (demande d'un lien par e-mail, ou renvoi vers le support si l'envoi d'e-mails n'est pas réglé),
 * nouveau mot de passe à partir d'un lien, et changement depuis Mon compte.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckCircle2, LifeBuoy, LogOut } from "lucide-react";
import { api, Button, Card, Field, Input, Logo, ThemeToggle, useToast } from "./ui";
import { LangSwitch, useT } from "./i18n";

function Shell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label={t("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")}><Logo /></Link>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </div>
      <main className="mx-auto my-auto w-full max-w-sm py-12">
        <h1 className="font-display text-4xl font-semibold">{title}</h1>
        <div className="mt-2 text-muted">{intro}</div>
        {children}
      </main>
    </div>
  );
}

const linkCls = "font-medium text-ink underline underline-offset-4";

export function ForgotPassword({ mailEnabled }: { mailEnabled: boolean }) {
  const t = useT();
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!mailEnabled)
    return (
      <Shell title={t("Mot de passe oublié", "Forgot your password")} intro={t("La réinitialisation par e-mail n'est pas encore disponible sur ce studio.", "Password reset by email isn't available on this studio yet.")}>
        <div className="mt-8 grid gap-4">
          <p className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-sm text-ink-2">
            <LifeBuoy className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
            <span>{t("Écrivez-nous depuis la page contact en indiquant l'adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe (valable 1 heure).", "Write to us from the contact page with your account's email address: we'll send you a link to choose a new password (valid for 1 hour).")}</span>
          </p>
          <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper">{t("Contacter le support", "Contact support")}</Link>
          <p className="text-sm text-muted"><Link href="/connexion" className={linkCls}>{t("Retour à la connexion", "Back to sign in")}</Link></p>
        </div>
      </Shell>
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ message: string }>("/api/auth/forgot", { body: { email } });
      setSent(r.message);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }
  return (
    <Shell title={t("Mot de passe oublié", "Forgot your password")} intro={t("Indiquez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.", "Enter your account's email address: you'll receive a link to choose a new password.")}>
      {sent ? (
        <div className="mt-8 grid gap-4">
          <p role="status" className="flex gap-3 rounded-2xl bg-ok-soft p-4 text-sm text-ok"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />{sent}</p>
          <p className="text-sm text-muted">{t("Pensez à regarder dans les indésirables. Rien reçu ? ", "Check your spam folder. Nothing received? ")}<Link href="/contact" className={linkCls}>{t("Contactez le support", "Contact support")}</Link></p>
          <p className="text-sm text-muted"><Link href="/connexion" className={linkCls}>{t("Retour à la connexion", "Back to sign in")}</Link></p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <Field label={t("Adresse e-mail", "Email address")} htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          <Button type="submit" size="lg" loading={loading}>{t("Recevoir le lien", "Send me the link")}</Button>
          <p className="text-sm text-muted"><Link href="/connexion" className={linkCls}>{t("Retour à la connexion", "Back to sign in")}</Link></p>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword({ token, valid }: { token: string; valid: boolean }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!valid)
    return (
      <Shell title={t("Lien expiré", "Link expired")} intro={t("Ce lien n'est plus valable : il a déjà servi ou date de plus d'une heure.", "This link is no longer valid: it has already been used or is more than an hour old.")}>
        <div className="mt-8 grid gap-3 text-sm">
          <Link href="/mot-de-passe-oublie" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-medium text-paper">{t("Demander un nouveau lien", "Request a new link")}</Link>
          <p className="text-muted"><Link href="/connexion" className={linkCls}>{t("Retour à la connexion", "Back to sign in")}</Link></p>
        </div>
      </Shell>
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("confirm") ?? "")) return setError(t("Les deux mots de passe ne sont pas identiques.", "The two passwords don't match."));
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }
  return (
    <Shell title={t("Nouveau mot de passe", "New password")} intro={t("Choisissez un nouveau mot de passe. Par sécurité, toutes les sessions ouvertes sur votre compte seront fermées.", "Choose a new password. For security, all sessions open on your account will be closed.")}>
      {done ? (
        <div className="mt-8 grid gap-4">
          <p role="status" className="flex gap-3 rounded-2xl bg-ok-soft p-4 text-sm text-ok"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />{t("Mot de passe changé. Connectez-vous avec le nouveau.", "Password changed. Sign in with the new one.")}</p>
          <Link href="/connexion" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper">{t("Se connecter", "Sign in")}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <Field label={t("Nouveau mot de passe", "New password")} htmlFor="password" hint={t("8 caractères au minimum.", "At least 8 characters.")}>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label={t("Confirmer le mot de passe", "Confirm the password")} htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          <Button type="submit" size="lg" loading={loading}>{t("Enregistrer le mot de passe", "Save the password")}</Button>
        </form>
      )}
    </Shell>
  );
}

/** Carte « Sécurité » de Mon compte : changer son mot de passe et se déconnecter. */
export function SecurityCard() {
  const t = useT();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get("next") ?? "");
    if (next !== String(f.get("confirm") ?? "")) return setError(t("Les deux nouveaux mots de passe ne sont pas identiques.", "The two new passwords don't match."));
    setLoading(true);
    setError(null);
    try {
      await api("/api/me/password", { body: { current: String(f.get("current") ?? ""), next } });
      form.reset();
      toast("ok", t("Mot de passe changé. Vos autres appareils ont été déconnectés.", "Password changed. Your other devices have been signed out."));
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }
  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-display text-2xl font-semibold">{t("Sécurité", "Security")}</h2>
      <form onSubmit={submit} className="mt-4 grid max-w-xl gap-4">
        <p className="text-sm font-medium">{t("Changer mon mot de passe", "Change my password")}</p>
        <Field label={t("Mot de passe actuel", "Current password")} htmlFor="pw-current">
          <Input id="pw-current" name="current" type="password" required autoComplete="current-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Nouveau mot de passe", "New password")} htmlFor="pw-next" hint={t("8 caractères au minimum.", "At least 8 characters.")}>
            <Input id="pw-next" name="next" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label={t("Confirmer", "Confirm")} htmlFor="pw-confirm">
            <Input id="pw-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
        </div>
        {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
        <div><Button type="submit" variant="secondary" loading={loading}>{t("Changer le mot de passe", "Change password")}</Button></div>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-ink-2">{t("Ordinateur partagé ? Pensez à vous déconnecter.", "Shared computer? Remember to sign out.")}</p>
        <LogoutButton />
      </div>
    </Card>
  );
}

export function LogoutButton({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/";
      }}
      title={iconOnly ? t("Se déconnecter", "Sign out") : undefined}
      className={className ?? "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink disabled:opacity-50"}
    >
      <LogOut className="size-4" aria-hidden /> {iconOnly ? <span className="sr-only">{t("Se déconnecter", "Sign out")}</span> : t("Se déconnecter", "Sign out")}
    </button>
  );
}
