import { StudioHome } from "@/components/studio/home";
import { conversationUiEnabled } from "@/lib/orchestrator/conversation/ui-enabled";
import { synaAgentEnabled } from "@/lib/syna-agent/enabled";

export default function Page() {
  return <StudioHome agentEnabled={conversationUiEnabled() || synaAgentEnabled()} synaAgent={synaAgentEnabled()} />;
}
