import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { visiteDuProjet } from "@/lib/ciel/ciel-commun";
import { CielProjet } from "@/components/studio/ciel/ciel-projet";

export const metadata = { title: "En visite" };

/** La visite d'un projet que son propriétaire a ouvert aux visites : sa constellation, sa marque, son site. Rien ne s'y modifie. */
export default async function Page({ params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  const user = await currentUser();
  const v = user && /^[0-9a-f]{20}$/.test(cle) ? visiteDuProjet(cle, user.id) : null;
  if (!v) notFound();
  return <main><CielProjet ciel={{ data: v.data, forme: v.forme, voisins: [] }} projectId={v.cle} visite={{ site: v.site }} /></main>;
}
