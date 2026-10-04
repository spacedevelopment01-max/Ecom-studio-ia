import { SheetEditor } from "./sheet-editor";

export const metadata = { title: "Fiche de rendez-vous" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SheetEditor id={(await params).id} />;
}
