import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ProjectProvider } from "@/components/studio/project-context";
import { StudioShell } from "@/components/studio/shell";
import { SynaStudioShell, SynaShellSwitch } from "@/components/studio/syna-shell";
import { AgentUiProvider } from "@/components/studio/agent-ui-context";
import { conversationUiEnabled } from "@/lib/orchestrator/conversation/ui-enabled";
import { SYNA_SHELL_COOKIE, studioShellVariant } from "@/lib/syna-ui/studio-shell";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await currentUser();
  if (!user || !one("SELECT 1 FROM projects WHERE id = ? AND user_id = ? AND archived = 0", projectId, user.id)) notFound();
  // Mission #282, lot 1 : nouvelle coquille SYNA seulement si l'installation l'active (STUDIO_SYNA_SHELL=1), avec retour
  // possible à l'interface actuelle sur cet appareil. Sans la variable : Studio inchangé.
  const shell = studioShellVariant(process.env, (await cookies()).get(SYNA_SHELL_COOKIE)?.value);
  return (
    <AgentUiProvider enabled={conversationUiEnabled()}><ProjectProvider id={projectId}>
      {shell.variant === "syna"
        ? <SynaStudioShell projectId={projectId}>{children}</SynaStudioShell>
        : <StudioShell projectId={projectId} synaShell={shell.available ? <SynaShellSwitch to="syna" /> : undefined}>{children}</StudioShell>}
    </ProjectProvider></AgentUiProvider>
  );
}
