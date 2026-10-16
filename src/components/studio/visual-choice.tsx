"use client";
/**
 * Choix du visuel d'une publication (lot, publication seule, communication automatique) — images finales 100 % IA :
 * reprendre une image déjà créée par l'IA pour le projet (gratuit), ou publication entièrement créée par l'IA (prix
 * affiché avant toute dépense). Plus de mise en page du studio sur une photo.
 */
import { cx } from "../ui";
import { useT } from "../i18n";
import type { VisualMode } from "@/lib/social-v2/visual-mode";

export function VisualChoice({ value: raw, onChange, ai, name, help, prices, legend }: { value: VisualMode; onChange: (m: VisualMode) => void; ai: boolean; name: string; help?: Partial<Record<VisualMode, string>>; prices?: Partial<Record<VisualMode, string>>; legend?: string }) {
  const t = useT();
  // Ancien réglage « image IA + mise en page du studio » : affiché comme publication entièrement par l'IA.
  const value: VisualMode = raw === "ai_image" ? "ai_post" : raw;
  const options: [VisualMode, string, string, string][] = [
    ["free", t("Reprendre une image déjà créée par l'IA", "Reuse an image already created by AI"), t("Une image du projet déjà créée par l'IA et validée. S'il n'y en a pas, la publication attend son visuel : aucun gabarit à la place.", "A project image already created by AI and approved. If there is none, the post waits for its visual: no template instead."), t("Gratuit", "Free")],
    ["ai_post", t("Publication entièrement par l'IA", "Post entirely by AI"), t("Scène, mise en page, titre et bouton créés ensemble par l'IA, avec votre vrai produit ; textes relus lettre par lettre.", "Scene, layout, headline and button created together by AI, with your real product; texts checked letter by letter."), t("Payant · prix affiché avant", "Paid · price shown first")],
  ];

  // Textes d'aide propres à l'écran (ex. entreprise de services : pas de « vrai produit ») et prix connus d'avance.
  for (const o of options) {
    if (help?.[o[0]]) o[2] = help[o[0]]!;
    if (prices?.[o[0]]) o[3] = prices[o[0]]!;
  }
  return (
    <fieldset className="grid gap-2" data-visual-mode>
      <legend className="mb-1.5 text-sm font-medium">{legend ?? t("Comment faire le visuel ?", "How should the visual be made?")}</legend>
      <div className="grid gap-2 lg:grid-cols-2">
        {options.map(([v, label, help, price]) => {
          const off = v !== "free" && !ai;
          return (
            <label key={v} className={cx("flex gap-3 rounded-2xl border p-3 text-sm", off ? "cursor-not-allowed opacity-55" : "cursor-pointer", value === v ? "border-ink bg-paper-2" : "border-line")}>
              <input type="radio" name={name} value={v} checked={value === v} disabled={off} onChange={() => onChange(v)} className="mt-1" data-visual-option={v} />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted">{help}</span>
                <span className={cx("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", v === "free" ? "bg-ok-soft text-ok" : "bg-signal-soft text-signal")}>{price}</span>
              </span>
            </label>
          );
        })}
      </div>
      {!ai && <p className="text-xs text-muted">{t("Les choix avec l'IA ne sont pas disponibles pour ce projet (compte Découverte sans abonnement, budget IA épuisé ou fournisseur désactivé).", "AI choices aren't available for this project (Discovery account without a subscription, AI budget used up or provider disabled).")}</p>}
    </fieldset>
  );
}

