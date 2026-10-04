import { FolderDetail } from "./folder-detail";

export const metadata = { title: "Dossier" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <FolderDetail id={(await params).id} />;
}
