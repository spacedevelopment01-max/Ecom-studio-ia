import { SendReview } from "./send-review";

export const metadata = { title: "Envoi recommandé" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retour?: string }> }) {
  const { id } = await params;
  const { retour } = await searchParams;
  return <SendReview id={id} retour={retour ?? null} />;
}
