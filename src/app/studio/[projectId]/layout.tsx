import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ProjectProvider } from "@/components/studio/project-context";
import { SynaStudioShell } from "@/components/studio/syna-shell";
import { AgentUiProvider } from "@/components/studio/agent-ui-context";
import { readSynaPrefs } from "@/lib/syna-ui/prefs-store";
import { synaAgentEnabled } from "@/lib/syna-agent/enabled";
import { underConstruction } from "@/lib/syna-agent/construction";
import { ConstructionBanner } from "@/components/studio/construction-banner";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await currentUser();
  if (!user || !one("SELECT 1 FROM projects WHERE id = ? AND user_id = ? AND archived = 0", projectId, user.id)) notFound();
  // Une seule interface : SINA et le projet côte à côte. Pendant la construction, le client suit tout en direct et
  // demande ses changements à SINA ; le bandeau le rappelle dans les espaces (pas sur le tableau de bord, qui le dit déjà).
  const building = synaAgentEnabled() && underConstruction(projectId);
  return (
    <AgentUiProvider enabled={synaAgentEnabled()}><ProjectProvider id={projectId}>
      <SynaStudioShell projectId={projectId} building={building} initialPrefs={readSynaPrefs(user.id, projectId)}>
        {building && <ConstructionBanner />}
        {children}
      </SynaStudioShell>
    </ProjectProvider></AgentUiProvider>
  );
}
