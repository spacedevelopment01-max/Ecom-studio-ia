import { StudioHome } from "@/components/studio/home";
import { conversationUiEnabled } from "@/lib/orchestrator/conversation/ui-enabled";

export default function Page() {
  return <StudioHome agentEnabled={conversationUiEnabled()} />;
}
