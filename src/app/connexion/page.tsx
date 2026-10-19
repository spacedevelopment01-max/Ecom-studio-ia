import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/safe-path";
import { currentUser } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
/** Photo de la démonstration ONDE (kit privé, hors dépôt) : seulement si le fichier est installé. */
const authBackground = () => (fs.existsSync(path.join(process.cwd(), "public", "demo", "onde", "07-scene-salon.webp")) ? "/demo/onde/07-scene-salon.webp" : null);

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Connexion", "Sign in") };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const next = safeNextPath(typeof q.suite === "string" ? q.suite : null);
  if (await currentUser()) redirect(next);
  return <AuthForm background={authBackground()} mode="login" next={next} />;
}
