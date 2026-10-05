import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { PLANS, type Billing, type PlanId } from "@/lib/plans";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Créer un compte", "Create an account") };
}

/** Forfait choisi sur la page d'accueil (?plan=vendre&billing=year) : rappelé en haut du formulaire, puis paiement dans Mon compte. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const plan = typeof q.plan === "string" && q.plan in PLANS ? (q.plan as PlanId) : null;
  const billing: Billing = q.billing === "year" ? "year" : "month";
  const next = plan ? `/studio/compte?plan=${plan}&billing=${billing}` : null;
  if (await currentUser()) redirect(next ?? "/studio");
  return <AuthForm mode="register" plan={plan ? { id: plan, billing } : null} />;
}
