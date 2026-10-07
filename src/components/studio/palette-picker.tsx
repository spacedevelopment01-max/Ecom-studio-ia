"use client";
/** Changer les cinq couleurs de la marque d'un coup : palettes prêtes, une seule couleur de départ, ou cinq codes collés. */
import { useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import { Button, cx, Input } from "../ui";
import { useLang, useT } from "../i18n";
import type { Brand } from "@/lib/project-types";
import { PALETTE_SETS, paletteFromColor, parsePalette } from "@/lib/palette-sets";

type Palette = Brand["palette"];
const ROLES = ["primary", "secondary", "accent", "light", "dark"] as const;
const same = (a: Palette, b: Palette) => ROLES.every((r) => a[r].toLowerCase() === b[r].toLowerCase());

function Strip({ pal, className }: { pal: Palette; className?: string }) {
  return <span className={cx("flex h-8 overflow-hidden rounded-lg border border-line", className)}>{ROLES.map((r) => <span key={r} className="flex-1" style={{ background: pal[r] }} />)}</span>;
}

export function PalettePicker({ current, onPick }: { current: Palette; onPick: (p: Palette) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState(current.primary);
  const [codes, setCodes] = useState("");
  const pasted = codes.trim() ? parsePalette(codes) : null;
  if (!open)
    return (
      <Button variant="secondary" size="sm" className="mt-3" icon={<PaletteIcon className="size-4" />} onClick={() => setOpen(true)}>
        {t("Changer toute la palette", "Change the whole palette")}
      </Button>
    );
  return (
    <div className="mt-3 grid gap-4 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("Changer les cinq couleurs d'un coup", "Change all five colors at once")}</p>
        <button className="text-xs text-muted hover:text-ink" onClick={() => setOpen(false)}>{t("Fermer", "Close")}</button>
      </div>
      <p className="text-xs text-muted">{t("Choisissez une palette : les cinq cases changent, puis « Enregistrer » met à jour toute la marque (logo, site, visuels, charte).", "Pick a palette: all five boxes change, then “Save” updates the whole brand (logo, site, visuals, guide).")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PALETTE_SETS.map((s) => (
          <button key={s.name.fr} onClick={() => onPick(s.palette)} className={cx("grid gap-1 rounded-xl border p-2 text-left text-xs hover:border-ink", same(s.palette, current) ? "border-signal ring-2 ring-signal/30" : "border-line")}>
            <Strip pal={s.palette} />
            <span>{lang === "en" ? s.name.en : s.name.fr}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-medium">{t("À partir d'une seule couleur", "From a single color")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-line" style={{ background: base }}>
            <input type="color" value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t("Couleur principale", "Main color")} />
          </label>
          <Strip pal={paletteFromColor(base)} className="min-w-32 flex-1" />
          <Button size="sm" variant="secondary" onClick={() => onPick(paletteFromColor(base))}>{t("Utiliser", "Use")}</Button>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-medium">{t("Coller vos cinq codes", "Paste your five codes")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="#8A4B1C #EADFCB #E09A2D #F8F4EC #221C17" className="min-w-0 flex-1 font-mono text-xs" aria-label={t("Cinq codes couleur", "Five color codes")} />
          <Button size="sm" variant="secondary" disabled={!pasted} onClick={() => pasted && onPick(pasted)}>{t("Utiliser", "Use")}</Button>
        </div>
        <p className="text-[11px] text-muted">{codes.trim() && !pasted ? t("Il faut cinq codes (principale, secondaire, accent, clair, sombre).", "Five codes are needed (main, secondary, accent, light, dark).") : t("Dans l'ordre : principale, secondaire, accent, clair, sombre.", "In order: main, secondary, accent, light, dark.")}</p>
      </div>
    </div>
  );
}
