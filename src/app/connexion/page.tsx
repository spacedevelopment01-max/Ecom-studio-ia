import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/safe-path";
import { currentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Connexion", "Sign in") };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const next = safeNextPath(typeof q.suite === "string" ? q.suite : null);
  if (await currentUser()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
