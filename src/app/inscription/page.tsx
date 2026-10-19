import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/safe-path";
import { currentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { PLANS, type Billing, type PlanId } from "@/lib/plans";
import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
/** Photo de la démonstration ONDE (kit privé, hors dépôt) : seulement si le fichier est installé. */
const authBackground = () => (fs.existsSync(path.join(process.cwd(), "public", "demo", "onde", "07-scene-salon.webp")) ? "/demo/onde/07-scene-salon.webp" : null);

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Créer un compte", "Create an account") };
}

/** Forfait choisi sur la page d'accueil (?plan=vendre&billing=year) : rappelé en haut du formulaire, puis paiement dans Mon compte. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const plan = typeof q.plan === "string" && q.plan in PLANS ? (q.plan as PlanId) : null;
  const billing: Billing = q.billing === "year" ? "year" : "month";
  const next = plan ? `/studio/compte?plan=${plan}&billing=${billing}` : null;
  const suite = safeNextPath(typeof q.suite === "string" ? q.suite : null);
  if (await currentUser()) redirect(next ?? suite);
  return <AuthForm background={authBackground()} mode="register" plan={plan ? { id: plan, billing } : null} next={suite} />;
}
