import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ProjectProvider } from "@/components/studio/project-context";
import { StudioShell } from "@/components/studio/shell";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await currentUser();
  if (!user || !one("SELECT 1 FROM projects WHERE id = ? AND user_id = ?", projectId, user.id)) notFound();
  return (
    <ProjectProvider id={projectId}>
      <StudioShell projectId={projectId}>{children}</StudioShell>
    </ProjectProvider>
  );
}
