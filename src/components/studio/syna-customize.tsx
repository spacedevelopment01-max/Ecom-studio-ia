"use client";
/**
 * « Personnaliser l'interface » (mission #282, lot 1 bis) : réglages réels de la coquille SYNA, enregistrés sur le
 * compte (ou seulement pour ce projet) et retrouvés sur les autres appareils. Aucun réglage ne peut masquer une
 * confirmation, un coût ou la navigation ; les trois bleus sont tous contrôlés AA ; les largeurs sont bornées.
 */
import { useId, useRef, type ReactNode } from "react";
import { Check, Monitor, Moon, RotateCcw, Sun, X } from "lucide-react";
import { useLang } from "../i18n";
import { SYNA_ACCENT_SETS, type SynaAccent } from "@/lib/syna-ui/tokens";
import { SYNA_CONVO_WIDTH } from "@/lib/syna-ui/preferences";
import { useSynaPrefs } from "./syna-prefs";

function Seg<T extends string>({ label, value, options, onChange, overridden }: { label: string; value: T; options: { id: T; label: ReactNode; aria?: string }[]; onChange: (v: T) => void; overridden?: boolean }) {
  const { lang } = useLang();
  return (
    <div className="ss-field" role="group" aria-label={label}>
      <span className="ss-field-l">{label}{overridden && <em className="ss-own">{lang === "en" ? "this project" : "ce projet"}</em>}</span>
      <div className="ss-seg">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} aria-label={o.aria} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function SynaCustomize({ onClose, docked }: { onClose: () => void; docked: boolean }) {
  const { lang } = useLang();
  const T = (fr: string, en: string) => (lang === "en" ? en : fr);
  const p = useSynaPrefs();
  const r = p.resolved;
  const own = (k: keyof typeof r) => !!p.stored.project && k in p.stored.project;
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const accents: { id: SynaAccent; name: string }[] = [
    { id: "encre", name: T("Bleu d'encre", "Ink blue") },
    { id: "cobalt", name: "Cobalt" },
    { id: "prusse", name: T("Bleu de Prusse", "Prussian blue") },
  ];
  const status = {
    saved: T("Enregistré sur votre compte · retrouvé sur vos autres appareils", "Saved to your account · available on your other devices"),
    saving: T("Enregistrement…", "Saving…"),
    offline: T("Hors ligne : gardé sur cet appareil, envoyé au retour du réseau", "Offline: kept on this device, sent when back online"),
    error: T("L'enregistrement a échoué : le réglage reste appliqué sur cet écran", "Saving failed: the setting stays applied on this screen"),
  }[p.status];

  return (
    <div className="ss-custom" ref={box} role="dialog" aria-modal={docked ? undefined : true} aria-labelledby={`${id}-t`} id="ss-customize" data-docked={docked ? "" : undefined}>
      <div className="ss-custom-h">
        <div>
          <p className="sy-eyebrow">{T("Studio · affichage", "Studio · display")}</p>
          <h2 id={`${id}-t`} className="sy-title ss-custom-t">{T("Personnaliser l'interface", "Customise the interface")}</h2>
        </div>
        <button type="button" className="ss-icon-btn" onClick={onClose} aria-label={T("Fermer", "Close")}><X className="size-4" /></button>
      </div>

      <div className="ss-custom-b">
        <div className="ss-field" role="group" aria-label={T("Mode", "Mode")}>
          <span className="ss-field-l">{T("Mode", "Mode")}{own("mode") && <em className="ss-own">{T("ce projet", "this project")}</em>}</span>
          <div className="ss-modes">
            {([["encre", "Encre", T("La conversation à côté de votre travail", "The conversation next to your work")], ["plein", T("Plein cadre", "Full frame"), T("Le résultat d'abord, SYNA en barre de commande", "The result first, SYNA in a command bar")]] as const).map(([m, name, hint]) => (
              <button key={m} type="button" className="ss-mode" data-mode={m} aria-pressed={r.mode === m} onClick={() => p.update({ mode: m })}>
                <span className="ss-mode-art" aria-hidden="true"><i /><b /></span>
                <span className="ss-mode-n">{name}{r.mode === m && <Check className="size-4" aria-hidden />}</span>
                <span className="ss-mode-h">{hint}</span>
              </button>
            ))}
          </div>
          <p className="sy-small">{isMac ? T("Raccourci : ⌘ Maj M", "Shortcut: ⌘ Shift M") : T("Raccourci : Ctrl Maj M", "Shortcut: Ctrl Shift M")} · {T("ou écrivez « Passe en Plein cadre » dans la barre de commande", "or type “Switch to full frame” in the command bar")}</p>
        </div>

        <Seg label={T("Apparence", "Appearance")} value={p.appearance} overridden={own("appearance")} onChange={(v) => p.update({ appearance: v })} options={[
          { id: "auto", label: <><Monitor className="size-4" aria-hidden /> {T("Appareil", "Device")}</> },
          { id: "light", label: <><Sun className="size-4" aria-hidden /> {T("Clair", "Light")}</> },
          { id: "dark", label: <><Moon className="size-4" aria-hidden /> {T("Sombre", "Dark")}</> },
        ]} />

        <div className="ss-field" role="radiogroup" aria-label={T("Bleu d'accent", "Accent blue")}>
          <span className="ss-field-l">{T("Bleu d'accent", "Accent blue")}{own("accent") && <em className="ss-own">{T("ce projet", "this project")}</em>}</span>
          <div className="ss-swatches">
            {accents.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={r.accent === a.id} className="ss-swatch" onClick={() => p.update({ accent: a.id })}>
                <span className="ss-swatch-dot" style={{ background: `linear-gradient(135deg, ${SYNA_ACCENT_SETS[a.id].light.accent} 50%, ${SYNA_ACCENT_SETS[a.id].dark.accent} 50%)` }} aria-hidden />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
          <p className="sy-small">{T("Chaque bleu est contrôlé en clair et en sombre (contraste AA).", "Each blue is checked in light and dark (AA contrast).")}</p>
        </div>

        <div className="ss-field">
          <label className="ss-field-l" htmlFor={`${id}-w`}>{T("Largeur de la conversation", "Conversation width")}{own("convoWidth") && <em className="ss-own">{T("ce projet", "this project")}</em>}</label>
          <div className="ss-range">
            <input id={`${id}-w`} type="range" min={SYNA_CONVO_WIDTH.min} max={SYNA_CONVO_WIDTH.max} step={SYNA_CONVO_WIDTH.step} value={r.convoWidth}
              aria-valuetext={T(`${r.convoWidth} pixels ; l'aperçu prend le reste`, `${r.convoWidth} pixels; the preview takes the rest`)}
              onChange={(e) => p.update({ convoWidth: Number(e.target.value) })} />
            <span className="sy-num">{r.convoWidth} px</span>
          </div>
          <p className="sy-small">{T("Plus étroite = aperçu plus grand. Aussi en glissant le bord de la conversation.", "Narrower = larger preview. Also by dragging the conversation edge.")}</p>
        </div>

        <Seg label={T("Conversation SYNA", "SYNA conversation")} value={r.panel} overridden={own("panel")} onChange={(v) => p.update({ panel: v })} options={[{ id: "pinned", label: T("Ouverte à l'arrivée", "Open on arrival") }, { id: "collapsed", label: T("Repliée", "Collapsed") }]} />
        <Seg label={T("Densité", "Density")} value={r.density} overridden={own("density")} onChange={(v) => p.update({ density: v })} options={[{ id: "comfortable", label: T("Confortable", "Comfortable") }, { id: "compact", label: T("Compacte", "Compact") }]} />
        <Seg label={T("Taille du texte", "Text size")} value={r.textSize} overridden={own("textSize")} onChange={(v) => p.update({ textSize: v })} options={[{ id: "normal", label: T("Normale", "Normal") }, { id: "large", label: T("Grande", "Large") }]} />

        <div className="ss-field ss-scope" role="group" aria-label={T("Portée des réglages", "Settings scope")}>
          <span className="ss-field-l">{T("Ces réglages valent pour", "These settings apply to")}</span>
          <div className="ss-seg">
            <button type="button" aria-pressed={p.scope === "account"} onClick={() => p.setScope("account")}>{T("Tout mon compte", "My whole account")}</button>
            <button type="button" aria-pressed={p.scope === "project"} onClick={() => p.setScope("project")}>{T("Ce projet seulement", "This project only")}</button>
          </div>
          {p.stored.project ? (
            <p className="sy-small">{T("Ce projet a ses propres réglages (marqués « ce projet »).", "This project has its own settings (marked “this project”).")} <button type="button" className="ss-link-btn" onClick={p.clearProject}>{T("Suivre de nouveau le compte", "Follow the account again")}</button></p>
          ) : <p className="sy-small">{T("Priorité : ce projet, puis le compte, puis les valeurs par défaut (Encre).", "Priority: this project, then the account, then defaults (Ink).")}</p>}
        </div>
      </div>

      <div className="ss-custom-f">
        <p className="sy-small ss-status" role="status" aria-live="polite" data-status={p.status}>{status}</p>
        <button type="button" className="sy-btn" data-size="sm" data-variant="ghost" onClick={p.resetAccount}><RotateCcw className="size-4" aria-hidden /> {T("Réglages par défaut", "Default settings")}</button>
      </div>
    </div>
  );
}
