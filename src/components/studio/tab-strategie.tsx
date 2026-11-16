"use client";
/**
 * Écran « Angles » (lot 3) : les trois angles du client tels que SINA les a créés, et celui qu'il a choisi. Un écran
 * pour les relire ; rien n'y est créé ni payé (tout passe par SINA, qui annonce le prix avant).
 */
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { api, Button, Empty, useApi } from "../ui";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { useAgentPanel } from "./agent-ui-context";
import { AngleCards, type Angles } from "./angle-cards";

export default function StrategyTab() {
  const { id } = useProject();
  const t = useT();
  const { setOpen: openSina } = useAgentPanel();
  const { data, reload } = useApi<{ angles: Angles | null }>(`/api/projects/${id}/angles`);
  const [sending, setSending] = useState(false), [error, setError] = useState("");
  if (!data) return null;
  const talk = <Button icon={<MessageCircle className="size-4" />} onClick={() => openSina(true)}>{t("Parler à SINA", "Talk to SINA")}</Button>;
  if (!data.angles) return <Empty title={t("Tes angles se créent avec SINA", "Your angles are created with SINA")} action={talk}>{t("Un angle, c'est la raison pour laquelle une personne précise achète chez toi. Une fois ta marque validée, SINA t'en propose trois, très différents : un sûr, un d'émotion, un audacieux. Tu choisis celui qui te ressemble.", "An angle is the reason why a specific person buys from you. Once your brand is validated, SINA offers three very different ones. You pick the one that feels like you.")}</Empty>;

  /** Le choix se dit à SINA, dans la conversation : c'est elle qui l'enregistre. */
  async function choose(title: string) {
    setSending(true); setError("");
    try {
      const view = await api<{ conversationId: string }>("/api/syna/open", { body: { projectId: id } });
      await api(`/api/syna/${view.conversationId}`, { body: { requestId: crypto.randomUUID(), text: t(`Je choisis l'angle « ${title} ».`, `I choose the angle "${title}".`), attachmentIds: [] } });
      openSina(true);
      window.dispatchEvent(new CustomEvent("syna:refresh"));
      setTimeout(() => reload(), 8000);
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4" data-angles-screen>
      <AngleCards angles={data.angles} busy={sending} onChoose={choose} />
      {!!error && <p className="text-sm text-bad">{error}</p>}
      <p className="text-xs text-muted">{t("Pour changer d'angle ou en demander de nouveaux, dis-le à SINA.", "To change your angle or ask for new ones, tell SINA.")} {talk}</p>
    </div>
  );
}
