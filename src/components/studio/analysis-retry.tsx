"use client";
import { useId } from "react";
import { useT } from "../i18n";
import { Button, Textarea } from "../ui";
import { attemptProblem } from "@/lib/preparation/attempt-rules";

/** Correction et précontrôle placés auprès de l'action, avant toute confirmation de dépense. */
export function AnalysisRetry({ business, attempts, correction, onCorrection, disabled, onAnalyze }: {
  business: "products" | "services"; attempts: number; correction: string;
  onCorrection: (value: string) => void; disabled: boolean; onAnalyze: () => void;
}) {
  const t = useT(), fieldId = useId(), messageId = useId();
  const problem = attemptProblem(attempts, correction);
  return <div className="grid min-w-0 gap-3" data-analysis-retry>
    <label htmlFor={fieldId} className="text-sm font-medium">{t("Défaut précis à corriger pour un nouvel essai", "Specific issue to fix for another attempt")}</label>
    <Textarea id={fieldId} maxLength={1200} value={correction} onChange={e => onCorrection(e.target.value)} aria-describedby={messageId}/>
    <p id={messageId} className="text-sm text-muted" role="status" data-analysis-preflight>{attempts >= 2
      ? t("Deux essais déjà demandés pour ces données. Modifiez réellement votre fiche avant une nouvelle analyse ; changer ce message ne remet pas le compteur à zéro.", "Two attempts already requested for these inputs. Update the actual brief before another analysis; changing this message does not reset the counter.")
      : attempts > 0 && problem ? t("Décrivez le défaut à corriger (au moins 8 caractères) avant de voir le devis.", "Describe the issue (at least 8 characters) before viewing the quote.")
      : t(`Essais demandés pour ces données : ${attempts}/2. Le devis précède tout nouvel appel.`, `Attempts requested for these inputs: ${attempts}/2. A quote precedes any new call.`)}</p>
    <Button variant="secondary" disabled={disabled || !!problem} onClick={onAnalyze} aria-describedby={messageId} style={{ whiteSpace: "normal", height: "auto", minHeight: 44 }} data-brief-analyze>{business === "services"
      ? t("Comprendre mon activité", "Understand my business")
      : t("Analyser mes informations et mes photos par l’IA", "Analyze my information and photos with AI")}</Button>
  </div>;
}
