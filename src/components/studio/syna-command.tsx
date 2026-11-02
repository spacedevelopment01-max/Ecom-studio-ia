"use client";
/**
 * Barre de commande SYNA (mission #282, lot 1 bis).
 *
 * Les commandes d'affichage (« Passe en Plein cadre », « Reviens à Encre », « Agrandis l'aperçu »…) sont reconnues ici,
 * sur place, avant tout envoi : aucune IA, aucun coût, aucune fausse réponse de SYNA, et on peut annuler. Une demande
 * ambiguë reçoit une question. Toute autre demande est confiée à la conversation SYNA existante (ouverte, texte placé
 * dans sa zone de saisie quand elle en a une) — jamais traitée ici. Si SYNA n'est pas ouverte sur l'installation, on le
 * dit, sans rien envoyer.
 */
import { useId, useRef, type FormEvent } from "react";
import { ArrowRight, Undo2 } from "lucide-react";
import { useLang } from "../i18n";
import { parseSynaUiCommand, nextConvoWidth, type SynaUiCommand } from "@/lib/syna-ui/ui-commands";
import type { SynaUiPrefs } from "@/lib/syna-ui/preferences";
import { useSynaPrefs } from "./syna-prefs";

export type SynaCommandFeedback = { text: string; undo?: () => void; options?: { label: string; command: string }[] } | null;
type Feedback = SynaCommandFeedback;

/** Place un texte dans la zone de saisie de la conversation (champ contrôlé par React) sans l'envoyer. */
function fillConversation(text: string): boolean {
  const box = document.querySelector<HTMLTextAreaElement>("#syna-panel textarea:not(:disabled)");
  if (!box) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(box, text);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.focus();
  return true;
}

export function SynaCommandBar({ variant, agentUi, onOpenSyna, working, workingText, value, onValue, expanded, feedback, onFeedback }: {
  variant: "bar" | "inline";
  agentUi: boolean;
  onOpenSyna: () => void;
  working?: boolean;
  workingText?: string;
  /** Texte partagé entre les deux places de la barre (Encre et Plein cadre) : rien n'est perdu en changeant de mode. */
  value: string;
  onValue: (v: string) => void;
  /** État de la conversation SYNA (ouverte / repliée), annoncé par le bouton. */
  expanded?: boolean;
  /** Confirmation partagée aussi : une commande qui change de mode reste confirmée (et annulable) à la nouvelle place. */
  feedback: Feedback;
  onFeedback: (f: Feedback) => void;
}) {
  const { lang } = useLang();
  const T = (fr: string, en: string) => (lang === "en" ? en : fr);
  const prefs = useSynaPrefs();
  const setValue = onValue;
  const setFeedback = onFeedback;
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  const run = (cmd: SynaUiCommand) => {
    const say = (s: [string, string]) => T(s[0], s[1]);
    const local = T(" · sur place, sans IA ni coût", " · done locally, no AI, no cost");
    if (cmd.kind === "ask") {
      setFeedback({ text: say(cmd.question), options: cmd.options.map((o) => ({ label: say(o.label), command: o.command })) });
      return;
    }
    const r = prefs.resolved;
    if (cmd.kind === "reset") {
      const before = { ...prefs.stored.account };
      prefs.resetAccount();
      setFeedback({ text: say(cmd.say) + local, undo: () => prefs.update(before, "account") });
      return;
    }
    const patch: Partial<SynaUiPrefs> = cmd.kind === "width" ? { convoWidth: nextConvoWidth(r.convoWidth, cmd.delta) } : cmd.patch;
    const keys = Object.keys(patch) as (keyof SynaUiPrefs)[];
    const before = Object.fromEntries(keys.map((k) => [k, r[k]])) as Partial<SynaUiPrefs>;
    prefs.update(patch);
    const atLimit = cmd.kind === "width" && patch.convoWidth === r.convoWidth;
    setFeedback({ text: (atLimit ? T("Déjà au maximum", "Already at the limit") : say(cmd.say)) + local, undo: atLimit ? undefined : () => prefs.update(before) });
  };

  const submit = (e?: FormEvent, forced?: string) => {
    e?.preventDefault();
    const text = (forced ?? value).trim();
    if (!text) { if (agentUi) onOpenSyna(); return; }
    const cmd = parseSynaUiCommand(text);
    if (cmd) { run(cmd); if (cmd.kind !== "ask") setValue(""); return; }
    if (!agentUi) {
      setFeedback({ text: T("Ce n'est pas une commande d'affichage, et SYNA n'est pas ouverte sur cette installation : rien n'a été envoyé.", "This is not a display command, and SYNA is not enabled on this installation: nothing was sent.") });
      return;
    }
    onOpenSyna();
    // La conversation se monte à l'ouverture : on y dépose le texte au rendu suivant, sans l'envoyer.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const placed = fillConversation(text);
      setFeedback({ text: placed ? T("Demande placée dans la conversation SYNA : relisez-la puis envoyez.", "Request placed in the SYNA conversation: review it, then send.") : T("Ce n'est pas une commande d'affichage : écrivez-la à SYNA dans la conversation.", "Not a display command: write it to SYNA in the conversation.") });
      if (placed) setValue("");
    }));
  };

  const placeholder = !agentUi
    ? T("Commande d'affichage… ex. « Passe en Encre »", "Display command… e.g. “Back to Ink”")
    : variant === "bar" ? T("Demandez à Syna…", "Ask Syna…")
    : T("Commande rapide : « Passe en Plein cadre », « Agrandis l'aperçu »…", "Quick command: “Switch to full frame”, “Enlarge the preview”…");
  return (
    <div className="ss-cmd" data-variant={variant} data-working={working ? "" : undefined}>
      <form className="ss-cmd-form" onSubmit={submit} role="search" aria-label={T("Commande SYNA", "SYNA command")}>
        <span className="ss-cmd-dot" aria-hidden="true" />
        <label htmlFor={`${id}-c`} className="sy-sr">{T("Commande SYNA ou commande d'affichage", "SYNA command or display command")}</label>
        <input
          ref={input}
          id={`${id}-c`}
          className="ss-cmd-input"
          value={value}
          onChange={(e) => { setValue(e.target.value); if (feedback && !feedback.options) setFeedback(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") { if (value || feedback) { e.stopPropagation(); setValue(""); setFeedback(null); } } }}
          placeholder={working && workingText ? workingText : placeholder}
          autoComplete="off"
          enterKeyHint="send"
          title={T("Commandes d'affichage reconnues sur place, sans IA : « Reviens à Encre », « Passe en Plein cadre », « Agrandis l'aperçu », « Mode sombre »…", "Display commands handled locally, no AI: “Back to Ink”, “Switch to full frame”, “Enlarge the preview”, “Dark mode”…")}
          data-syna-command
        />
        <button type="submit" className="ss-cmd-go" aria-expanded={!value.trim() ? expanded : undefined} aria-controls={!value.trim() && expanded !== undefined ? "syna-panel" : undefined} aria-label={value.trim() ? T("Valider", "Submit") : agentUi ? T("Ouvrir Syna", "Open Syna") : T("Valider", "Submit")}><ArrowRight className="size-4" aria-hidden /></button>
      </form>
      <div className="ss-cmd-feedback" role="status" aria-live="polite">
        {feedback && (
          <>
            <span>{feedback.text}</span>
            {feedback.undo && <button type="button" className="ss-cmd-undo" onClick={() => { feedback.undo!(); setFeedback({ text: T("Annulé", "Undone") }); }}><Undo2 className="size-3.5" aria-hidden /> {T("Annuler", "Undo")}</button>}
            {feedback.options?.map((o) => <button key={o.command} type="button" className="ss-cmd-undo" onClick={() => submit(undefined, o.command)}>{o.label}</button>)}
          </>
        )}
      </div>
    </div>
  );
}
