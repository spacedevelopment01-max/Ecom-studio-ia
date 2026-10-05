import { notFound } from "next/navigation";
import { TabView } from "@/components/studio/tabs";

const VALID = ["pilote", "produit", "marque", "boutique", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!VALID.includes(tab)) notFound();
  return <TabView tab={tab} />;
}
