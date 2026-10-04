import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Connexion", "Sign in") };
}

export default async function Page() {
  if (await currentUser()) redirect("/studio");
  return <AuthForm mode="login" />;
}
