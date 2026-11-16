"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Button, Field, Input, Logo, ThemeToggle } from "./ui";
import { LangSwitch, useLang, useT } from "./i18n";
import { formatEur } from "./billing-client";
import { monthlyEquivalent, PLANS, type Billing, type PlanId } from "@/lib/plans";
import { safeNextPath } from "@/lib/safe-path";
import { CielFond } from "./studio/ciel/ciel-fond";

/** `plan` : forfait choisi sur la page d'accueil (inscription) ; après l'inscription, direction Mon compte pour le paiement. */
/** `next` : page demandée avant la connexion (chemin interne vérifié), où l'on revient ensuite. */
/** `background` : ancienne photo de démonstration, plus affichée depuis que la page montre le ciel du Studio (les pages la passent encore). */
export function AuthForm({ mode, plan, next: nextPath, background }: { mode: "login" | "register"; plan?: { id: PlanId; billing: Billing } | null; next?: string | null; background?: string | null }) {
  const t = useT();
  const { lang } = useLang();
  const afterPlan = plan ? `/studio/compte?plan=${plan.id}&billing=${plan.billing}` : null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await api(`/api/auth/${mode === "login" ? "login" : "register"}`, { body: { ...Object.fromEntries(f), next: afterPlan ?? safeNextPath(nextPath ?? new URLSearchParams(window.location.search).get("suite")) } });
      if (mode === "register") { setConfirmation(true); setLoading(false); return; }
      window.location.assign(afterPlan ?? safeNextPath(nextPath ?? new URLSearchParams(window.location.search).get("suite")));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <CielFond className="-mx-5 -mt-6 mb-6 h-36 sm:-mx-10 lg:hidden" />
        <div className="flex items-center justify-between">
          <Link href="/" aria-label={t("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")}><Logo /></Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-4xl font-semibold">{mode === "login" ? t("Bon retour.", "Welcome back.") : t("Créer votre studio.", "Create your studio.")}</h1>
          <p className="mt-2 text-muted">{mode === "login" ? t("Retrouvez vos boutiques, créations et calendriers.", "Get back to your stores, creations and calendars.") : t("Une photo suffira ensuite pour démarrer votre premier projet.", "Then a single photo is all it takes to start your first project.")}</p>
          {plan && (
            <p className="mt-6 rounded-2xl border border-signal/30 bg-signal-soft px-4 py-3 text-sm text-ink">
              {t("Forfait choisi : ", "Chosen plan: ")}
              <strong>{PLANS[plan.id].name[lang]}</strong>
              {" — "}
              {plan.billing === "year"
                ? t(`${formatEur(PLANS[plan.id].price.year, lang)} / an (soit ${formatEur(monthlyEquivalent(plan.id), lang)} / mois)`, `${formatEur(PLANS[plan.id].price.year, lang)} / year (${formatEur(monthlyEquivalent(plan.id), lang)} / month)`)
                : t(`${formatEur(PLANS[plan.id].price.month, lang)} / mois`, `${formatEur(PLANS[plan.id].price.month, lang)} / month`)}
              <span className="mt-1 block text-xs text-ink-2">{t("Vous réglerez juste après la création du compte.", "You'll pay right after creating your account.")}</span>
            </p>
          )}
          <form onSubmit={submit} className="mt-8 grid gap-4">
            {confirmation && <p role="status" className="rounded-2xl border border-line p-4 text-sm">{t("Si cette adresse peut être inscrite, l’envoi d’un lien valable une heure a été demandé. Vérifiez votre boîte et les indésirables. Si vous avez déjà un compte, connectez-vous.", "If this address can be registered, sending a link valid for one hour has been requested. Check your inbox and spam. If you already have an account, sign in.")}</p>}
            {mode === "register" && (
              <Field label={t("Prénom ou nom", "First name or full name")} htmlFor="name">
                <Input id="name" name="name" autoComplete="name" />
              </Field>
            )}
            <Field label={t("Adresse e-mail", "Email address")} htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label={t("Mot de passe", "Password")} htmlFor="password" hint={mode === "register" ? t("8 caractères au minimum.", "At least 8 characters.") : undefined}>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
            {mode === "login" && (
              <p className="-mt-2 text-right text-sm">
                <Link href="/mot-de-passe-oublie" className="text-ink-2 underline underline-offset-4 hover:text-ink">{t("Mot de passe oublié ?", "Forgot your password?")}</Link>
              </p>
            )}
            {mode === "register" && <p className="text-xs text-muted">{t("Ton projet aura sa constellation dans le ciel commun du Studio. Les autres n'y voient ni son nom, ni ses couleurs, ni son avancement, sauf si tu choisis toi-même de l'ouvrir aux visites.", "Your project will have its constellation in the Studio's shared sky. Others see neither its name, nor its colours, nor its progress, unless you choose to open it to visits yourself.")}</p>}
            {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <Button type="submit" size="lg" loading={loading}>
              {mode === "login" ? t("Se connecter", "Sign in") : t("Créer mon compte", "Create my account")}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {mode === "login" ? (
              <>{t("Pas encore de compte ?", "No account yet?")} <Link href={nextPath && nextPath !== "/studio" ? `/inscription?suite=${encodeURIComponent(nextPath)}` : "/inscription"} className="font-medium text-ink underline underline-offset-4">{t("Créer un compte", "Create an account")}</Link></>
            ) : (
              <>{t("Déjà inscrit ?", "Already have an account?")} <Link href={afterPlan ? `/connexion?suite=${encodeURIComponent(afterPlan)}` : nextPath && nextPath !== "/studio" ? `/connexion?suite=${encodeURIComponent(nextPath)}` : "/connexion"} className="font-medium text-ink underline underline-offset-4">{t("Se connecter", "Sign in")}</Link></>
            )}
          </p>
        </div>
      </div>
      {/* On se connecte pour entrer dans la voie lactée : le ciel du Studio, vivant, à côté du formulaire. */}
      <CielFond className="hidden lg:block">
        <p className="ciel-fond-mot">{t("Entre dans ton ciel.", "Step into your sky.")}<small>{t("Chaque projet y devient une constellation.", "Every project becomes a constellation there.")}</small></p>
      </CielFond>
    </div>
  );
}
