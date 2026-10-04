import { NewDocument } from "./new-document";

export const metadata = { title: "Nouveau document" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; type?: string; retour?: string }> }) {
  const sp = await searchParams;
  return <NewDocument key={sp.mode === "piece" ? "piece" : "courrier"} mode={sp.mode === "piece" ? "piece" : "courrier"} presetType={sp.type ?? ""} retour={sp.retour ?? ""} />;
}
