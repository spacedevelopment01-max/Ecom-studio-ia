import { ResetPassword } from "@/components/password-forms";
import { resetTokenValid } from "@/lib/password";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await serverLang(), "Nouveau mot de passe", "New password"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const token = typeof q.jeton === "string" ? q.jeton : "";
  return <ResetPassword token={token} valid={resetTokenValid(token)} />;
}
