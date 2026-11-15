import { StudioHome } from "@/components/studio/home";
import { synaAgentEnabled } from "@/lib/syna-agent/enabled";

export default function Page() {
  return <StudioHome agentEnabled={synaAgentEnabled()} />;
}
