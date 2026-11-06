"use client";
/** Mode chantier (#492) : bandeau affiché pendant que SINA construit le projet. */
import { useT } from "../i18n";

export function ConstructionBanner() {
  const t = useT();
  return (
    <div role="status" className="mb-4 rounded-2xl border border-signal bg-signal-soft px-4 py-3 text-sm" data-construction-banner>
      <p className="font-semibold">{t("Ton projet est en construction avec SINA", "Your project is being built with SINA")}</p>
      <p className="mt-0.5 text-muted">{t("Tu peux tout suivre en direct ici. Pour changer quelque chose, demande-le à SINA dans la conversation : elle le fait au bon moment. Le Studio s'ouvre entièrement à la fin de la construction.", "Follow everything live here. To change something, ask SINA in the conversation. The Studio fully opens when construction ends.")}</p>
    </div>
  );
}
