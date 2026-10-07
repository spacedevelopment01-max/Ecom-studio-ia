"use client";
/**
 * Panneau « Disposition » de l'en-tête et du pied de page : chaque réglage à choix (disposition, méga menu,
 * menu téléphone, style du pied de page…) en boutons ; un clic applique le choix sans IA (opération
 * set_setting, nouvelle version restaurable) et l'aperçu se met à jour.
 */
import { Check, PanelBottom, PanelTop } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";

export type LayoutChoice = { key: string; label: string; value: string | boolean; options?: { value: string; label: string }[] };
export type LayoutSection = { template: string; id: string; type: string; name: string; locked: boolean; layout?: LayoutChoice[] };

export function LayoutPanel({ sections, onApply, busy }: { sections: LayoutSection[]; onApply: (s: LayoutSection, key: string, value: string | boolean, label: string) => void; busy?: boolean }) {
  const t = useT();
  const usable = sections.filter((s) => s.layout?.length);
  if (!usable.length) return <p className="text-sm text-muted">{t("Ce thème ne propose pas de choix de disposition ici : réglez l'en-tête et le pied de page dans l'éditeur de thème Shopify.", "This theme offers no layout choices here: set the header and footer in the Shopify theme editor.")}</p>;
  return (
    <div className="grid gap-5">
      {usable.map((s) => {
        const Icon = s.type === "footer" ? PanelBottom : PanelTop;
        return (
          <section key={`${s.template}:${s.id}`} aria-label={s.name} data-layout-section={s.type}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-signal" aria-hidden /> {s.name}</h3>
            {s.locked && <p className="mb-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">{t("Section validée (verrouillée) : déverrouillez-la dans Structure pour la modifier.", "Approved (locked) section: unlock it in Structure to change it.")}</p>}
            <div className="grid gap-3">
              {s.layout!.map((c) => (
                <div key={c.key}>
                  <p className="mb-1.5 text-xs font-medium text-ink-2">{c.label}</p>
                  {c.options ? (
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.label}>
                      {c.options.map((o) => {
                        const on = c.value === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={busy || s.locked || on}
                            onClick={() => onApply(s, c.key, o.value, `${s.name} · ${c.label} : ${o.label}`)}
                            className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-left text-xs transition-colors", on ? "border-signal bg-signal text-signal-ink" : "border-line bg-card hover:border-ink disabled:opacity-50")}
                          >
                            {on && <Check className="size-3" aria-hidden />} {o.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.value === true}
                      disabled={busy || s.locked}
                      onClick={() => onApply(s, c.key, c.value !== true, `${s.name} · ${c.label} : ${c.value === true ? t("non", "no") : t("oui", "yes")}`)}
                      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", c.value === true ? "border-signal bg-signal-soft text-signal" : "border-line bg-card")}
                    >
                      <span className={cx("relative h-4 w-7 rounded-full transition-colors", c.value === true ? "bg-signal" : "bg-line")}><span className={cx("absolute top-0.5 size-3 rounded-full bg-white transition-all", c.value === true ? "left-3.5" : "left-0.5")} /></span>
                      {c.value === true ? t("Oui", "Yes") : t("Non", "No")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p className="text-[11px] leading-relaxed text-muted">{t("Chaque choix crée une version que vous pouvez restaurer. Icônes et encarts promo des menus : dans l'éditeur de thème Shopify, ou demandez-le dans la discussion.", "Each choice creates a version you can restore. Menu icons and promo cards: in the Shopify theme editor, or ask in the chat.")}</p>
    </div>
  );
}
