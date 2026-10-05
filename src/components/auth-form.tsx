"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, Button, Field, Input, Logo, ThemeToggle } from "./ui";
import { LangSwitch, useLang, useT } from "./i18n";
import { formatEur } from "./billing-client";
import { monthlyEquivalent, PLANS, type Billing, type PlanId } from "@/lib/plans";

/** `plan` : forfait choisi sur la page d'accueil (inscription) ; après l'inscription, direction Mon compte pour le paiement. */
export function AuthForm({ mode, plan }: { mode: "login" | "register"; plan?: { id: PlanId; billing: Billing } | null }) {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const afterPlan = plan ? `/studio/compte?plan=${plan.id}&billing=${plan.billing}` : null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await api(`/api/auth/${mode === "login" ? "login" : "register"}`, { body: Object.fromEntries(f) });
      const next = new URLSearchParams(window.location.search).get("suite");
      router.push(afterPlan ?? (next && next.startsWith("/") && !next.startsWith("//") ? next : "/studio"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
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
            {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <Button type="submit" size="lg" loading={loading}>
              {mode === "login" ? t("Se connecter", "Sign in") : t("Créer mon compte", "Create my account")}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {mode === "login" ? (
              <>{t("Pas encore de compte ?", "No account yet?")} <Link href="/inscription" className="font-medium text-ink underline underline-offset-4">{t("Créer un compte", "Create an account")}</Link></>
            ) : (
              <>{t("Déjà inscrit ?", "Already have an account?")} <Link href={afterPlan ? `/connexion?suite=${encodeURIComponent(afterPlan)}` : "/connexion"} className="font-medium text-ink underline underline-offset-4">{t("Se connecter", "Sign in")}</Link></>
            )}
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src="/demo/hero-side.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-90" />
        <div className="absolute inset-x-10 bottom-10 text-paper">
          <p className="font-display text-4xl leading-tight">{t("« Une photo. Une marque. ", "“One photo. One brand. ")}<span className="serif-i">{t("Une boutique.", "One store.")}</span>{t(" »", "”")}</p>
          <p className="mt-3 text-sm text-paper/70">{t("Visuel de démonstration généré par le studio · produit fictif", "Demo visual generated by the studio · fictional product")}</p>
        </div>
      </div>
    </div>
  );
}
