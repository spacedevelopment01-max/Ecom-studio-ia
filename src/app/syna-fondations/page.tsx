import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseSynaVitrineParams, synaVitrineEnabled } from "@/lib/syna-ui/vitrine";
import { SynaVitrine } from "./vitrine";

export const metadata: Metadata = { title: "Fondations SYNA (interne)", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Vitrine interne du lot 0 de #282 : primitives SYNA isolées, sans donnée réelle, sans appel. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!synaVitrineEnabled()) notFound();
  return <SynaVitrine initial={parseSynaVitrineParams(await searchParams)} />;
}
