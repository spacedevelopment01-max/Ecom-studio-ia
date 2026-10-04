import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { HttpError } from "@/lib/http";
import { Chat } from "./chat";

export const metadata = { title: "Discussion avec le document" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePageSession();
  let doc;
  try {
    doc = await getDocument(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return <Chat docId={id} title={doc.title} plan={user.plan} analyzed={doc.status === "analyzed"} />;
}
