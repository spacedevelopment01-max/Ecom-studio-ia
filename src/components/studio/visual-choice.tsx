"use client";
/**
 * Choix du visuel d'une publication (lot, publication seule, communication automatique) : image gratuite avec mise
 * en page du studio, image par l'IA avec mise en page du studio, ou publication entièrement par l'IA. Prix affiché
 * avant toute dépense.
 */
import { cx } from "../ui";
import { useT } from "../i18n";
import type { VisualMode } from "@/lib/social-v2/visual-mode";

export function VisualChoice({ value, onChange, ai, name, help, prices, legend }: { value: VisualMode; onChange: (m: VisualMode) => void; ai: boolean; name: string; help?: Partial<Record<VisualMode, string>>; prices?: Partial<Record<VisualMode, string>>; legend?: string }) {
  const t = useT();
  const options: [VisualMode, string, string, string][] = [
    ["free", t("Image gratuite, mise en page du studio", "Free image, studio layout"), t("Une photo libre de droits choisie pour votre activité ou votre produit ; le studio pose le titre, le texte et le bouton à vos couleurs.", "A royalty-free photo chosen for your business or product; the studio adds the headline, text and button in your colors."), t("Gratuit", "Free")],
    ["ai_image", t("Image par l'IA, le studio fait le reste", "AI image, the studio does the rest"), t("L'IA crée la photo avec votre vrai produit ; le studio pose le titre, le texte et le bouton (modifiables ensuite).", "AI creates the photo with your real product; the studio adds the headline, text and button (editable afterwards)."), t("Payant · prix affiché avant", "Paid · price shown first")],
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
      <div className="grid gap-2 lg:grid-cols-3">
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
      {!ai && <p className="text-xs text-muted">{t("Les choix avec l'IA ne sont pas disponibles pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI choices aren't available for this project (Discovery plan, AI budget used up or provider disabled).")}</p>}
    </fieldset>
  );
}

