import { requirePageSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppointmentsHome } from "./appointments-home";

export const metadata = { title: "Préparer un rendez-vous" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dossier?: string }> }) {
  const { dossier } = await searchParams;
  const { user } = await requirePageSession();
  const folders = await sql()<{ id: string; name: string }[]>`select id, name from folders where user_id = ${user.id} order by updated_at desc`;
  const sheets = await sql()<{ id: string; title: string; target: string; updated_at: Date }[]>`select id, title, target, updated_at from appointment_sheets where user_id = ${user.id} order by updated_at desc`;
  return <AppointmentsHome folders={folders} sheets={JSON.parse(JSON.stringify(sheets))} plan={user.plan} initialFolder={dossier ?? ""} />;
}
