"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, Button, Field, Input, Logo, ThemeToggle } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
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
      router.push(next && next.startsWith("/") ? next : "/studio");
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
          <Link href="/"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-4xl font-semibold">{mode === "login" ? "Bon retour." : "Créer votre studio."}</h1>
          <p className="mt-2 text-muted">{mode === "login" ? "Retrouvez vos boutiques, créations et calendriers." : "Une photo suffira ensuite pour démarrer votre premier projet."}</p>
          <form onSubmit={submit} className="mt-8 grid gap-4">
            {mode === "register" && (
              <Field label="Prénom ou nom" htmlFor="name">
                <Input id="name" name="name" autoComplete="name" />
              </Field>
            )}
            <Field label="Adresse e-mail" htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Mot de passe" htmlFor="password" hint={mode === "register" ? "8 caractères au minimum." : undefined}>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
            {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <Button type="submit" size="lg" loading={loading}>
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {mode === "login" ? (
              <>Pas encore de compte ? <Link href="/inscription" className="font-medium text-ink underline underline-offset-4">Créer un compte</Link></>
            ) : (
              <>Déjà inscrit ? <Link href="/connexion" className="font-medium text-ink underline underline-offset-4">Se connecter</Link></>
            )}
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src="/demo/hero-side.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-90" />
        <div className="absolute inset-x-10 bottom-10 text-paper">
          <p className="font-display text-4xl leading-tight">« Une photo. Une marque. <span className="serif-i">Une boutique.</span> »</p>
          <p className="mt-3 text-sm text-paper/70">Visuel de démonstration généré par le studio · produit fictif</p>
        </div>
      </div>
    </div>
  );
}
