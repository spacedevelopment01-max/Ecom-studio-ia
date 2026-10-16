"use client";
/**
 * Publication ou publicité faite par l'IA : « Autre format » gratuit (l'image entière sur un fond tiré d'elle-même)
 * ou « Nouvelle version par l'IA » (format recomposé et/ou modification demandée), prix affiché avant le clic.
 */
import { useEffect, useState } from "react";
import { Copy, Wand2 } from "lucide-react";
import { api, Button, cx, Input, useToast } from "../ui";
import { useT } from "../i18n";
import { useBudgetPct } from "../billing-client";

const ASPECTS = ["4:5", "1:1", "9:16", "16:9"] as const;
type Aspect = (typeof ASPECTS)[number];

export function AiImageActions({ projectId, assetId, aspect, onChanged, compact }: { projectId: string; assetId: string; aspect: string | null; onChanged?: () => void; compact?: boolean }) {
  const t = useT();
  const budget = useBudgetPct();
  const toast = useToast();
  const base = `/api/projects/${projectId}/creative/image/${assetId}`;
  const [to, setTo] = useState<Aspect>((ASPECTS.find((a) => a !== aspect) ?? "1:1") as Aspect);
  const [instruction, setInstruction] = useState("");
  const [quote, setQuote] = useState<{ ai: boolean; estimateMicro: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);
  useEffect(() => {
    if (!open) return;
    api<{ ai: boolean; estimateMicro: number }>(base, { body: { action: "quote", aspect: to } }).then(setQuote, () => setQuote(null));
  }, [base, to, open]);
  const run = async (action: "reformat" | "redo") => {
    setBusy(action);
    try {
      await api(base, { body: { action, aspect: to, instruction: instruction.trim() || undefined, approvedEstimateMicro: quote?.estimateMicro } });
      toast("ok", action === "reformat" ? t(`Copie au format ${to} créée (gratuit).`, `${to} copy created (free).`) : t("Nouvelle version en préparation : elle apparaîtra à côté de l'originale.", "New version being prepared: it will appear next to the original."));
      onChanged?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2" data-ai-image-open>
        <Wand2 className="size-3.5" /> {t("Modifier / autre format", "Edit / other format")}
      </button>
    );
  return (
    <div className="grid gap-2 text-xs" data-ai-image-actions>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t("Format", "Format")}>
        {ASPECTS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={to === a} onClick={() => setTo(a)} className={cx("h-7 rounded-full border px-2.5", to === a ? "border-ink bg-ink text-paper" : "border-line")}>
            {a}
          </button>
        ))}
      </div>
      <Button size="sm" variant="secondary" icon={<Copy className="size-3.5" />} loading={busy === "reformat"} disabled={to === aspect} onClick={() => run("reformat")} data-ai-image-reformat>
        {t(`Dupliquer en ${to} (gratuit)`, `Duplicate as ${to} (free)`)}
      </Button>
      <Input value={instruction} maxLength={400} onChange={(e) => setInstruction(e.target.value)} placeholder={t("Modification souhaitée (ex. « fond plus clair », « titre : Nouvelle collection »)", "Change wanted (e.g. \"lighter background\", \"headline: New collection\")")} aria-label={t("Modification souhaitée", "Change wanted")} />
      <Button size="sm" icon={<Wand2 className="size-3.5" />} loading={busy === "redo"} disabled={!quote?.ai || (to === aspect && !instruction.trim())} onClick={() => run("redo")} data-ai-image-redo>
        {t("Nouvelle version par l'IA", "New version by AI")}
        {quote?.ai ? ` · ${budget.label(quote.estimateMicro)}` : ""}
      </Button>
      <p className="text-[11px] text-muted">
        {quote && !quote.ai
          ? t("L'IA n'est pas active pour ce projet : seule la copie gratuite est possible.", "AI isn't active for this project: only the free copy is possible.")
          : t("Copie gratuite : l'image entière, rien n'est coupé. Nouvelle version : même produit ou service, coût probable indiqué sur le bouton (une reprise éventuelle est annoncée), l'originale est gardée.", "Free copy: the whole image, nothing cut. New version: same product or service, likely cost shown on the button (any redo is announced), the original is kept.")}
      </p>
    </div>
  );
}
