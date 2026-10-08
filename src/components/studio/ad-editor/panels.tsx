"use client";
/**
 * Panneaux de l'éditeur visuel : calques (ordre, masquer, verrouiller, sélectionner) et propriétés de l'élément
 * sélectionné (texte, police, taille, couleurs, dégradé, transparence, forme, bordure, arrondi, image, recadrage,
 * position, taille, rotation, alignement). Chaque réglage est une opération gratuite de l'historique.
 */
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImageIcon, Lock, LockOpen, Square, Trash2, Type, MousePointerClick, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from "lucide-react";
import { cx } from "../../ui";
import { useT } from "../../i18n";
import type { FontCatalog } from "@/lib/ad-doc/fonts-client";
import { alignBox } from "@/lib/ad-doc/geometry";
import type { DocOp } from "@/lib/ad-doc/ops";
import type { AdDocument, Fill, Layer } from "@/lib/ad-doc/types";

export type Apply = (op: DocOp, merge?: string) => void;

const ROLE_FR: Record<Layer["role"], [string, string]> = {
  background: ["Fond", "Background"],
  image: ["Image", "Image"],
  product: ["Produit", "Product"],
  title: ["Titre", "Title"],
  subtitle: ["Sous-titre", "Subtitle"],
  body: ["Texte", "Text"],
  cta: ["Bouton", "Button"],
  logo: ["Logo", "Logo"],
  shape: ["Forme", "Shape"],
  decor: ["Décor", "Decor"],
  scrim: ["Voile", "Overlay"],
};

const kindIcon = (l: Layer) => (l.kind === "text" ? <Type className="size-3.5" /> : l.kind === "image" ? <ImageIcon className="size-3.5" /> : l.kind === "button" ? <MousePointerClick className="size-3.5" /> : <Square className="size-3.5" />);

export function LayersPanel({ doc, selectedId, onSelect, apply }: { doc: AdDocument; selectedId: string | null; onSelect: (id: string) => void; apply: Apply }) {
  const t = useT();
  const list = [...doc.layers].map((l, i) => ({ l, i })).reverse();
  return (
    <div className="grid gap-1" data-testid="layers-panel">
      {list.map(({ l, i }) => (
        <div key={l.id} className={cx("flex items-center gap-1 rounded-xl border px-2 py-1.5 text-sm", l.id === selectedId ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40" : "border-transparent hover:bg-paper-2")}>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(l.id)} aria-label={t(`Sélectionner ${l.name}`, `Select ${l.name}`)}>
            <span className="text-muted">{kindIcon(l)}</span>
            <span className={cx("truncate", !l.visible && "text-muted line-through")}>{l.kind === "text" || l.kind === "button" ? l.text || l.name : `${t(...ROLE_FR[l.role])}${l.name !== ROLE_FR[l.role][0] ? ` · ${l.name}` : ""}`}</span>
          </button>
          <IconBtn label={l.visible ? t("Masquer", "Hide") : t("Afficher", "Show")} onClick={() => apply({ op: "visible", id: l.id, visible: !l.visible })}>{l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</IconBtn>
          <IconBtn label={l.locked ? t("Déverrouiller", "Unlock") : t("Verrouiller", "Lock")} onClick={() => apply({ op: "lock", id: l.id, locked: !l.locked })}>{l.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}</IconBtn>
          <IconBtn label={t("Monter", "Bring forward")} disabled={i === doc.layers.length - 1} onClick={() => apply({ op: "reorder", id: l.id, index: i + 1 })}><ArrowUp className="size-3.5" /></IconBtn>
          <IconBtn label={t("Descendre", "Send backward")} disabled={i === 0} onClick={() => apply({ op: "reorder", id: l.id, index: i - 1 })}><ArrowDown className="size-3.5" /></IconBtn>
        </div>
      ))}
    </div>
  );
}

export function IconBtn({ label, onClick, children, disabled, active, testId }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; active?: boolean; testId?: string }) {
  return (
    <button type="button" title={label} aria-label={label} data-testid={testId} disabled={disabled} onClick={onClick} className={cx("grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-paper-2 disabled:opacity-30", active && "bg-paper-2 text-violet-600")}>
      {children}
    </button>
  );
}

const lbl = "text-[11px] font-medium uppercase tracking-wide text-muted";
const inp = "h-9 w-full min-w-0 rounded-xl border border-line bg-card px-2.5 text-sm outline-none focus:border-ink";

function Num({ label, value, onChange, step = 1, min, max, testId }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; testId?: string }) {
  return (
    <label className="grid gap-1">
      <span className={lbl}>{label}</span>
      <input type="number" className={inp} value={step >= 1 ? Math.round(value) : Math.round(value * 100) / 100} step={step} min={min} max={max} data-testid={testId} onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} />
    </label>
  );
}

/** Couleur : nuancier de la marque + sélecteur libre + transparence. */
function ColorField({ label, value, palette, onChange, testId }: { label: string; value: string; palette: string[]; onChange: (v: string) => void; testId?: string }) {
  const hex = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : "#000000";
  return (
    <div className="grid gap-1">
      <span className={lbl}>{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-10 cursor-pointer rounded-lg border border-line bg-card p-0.5" aria-label={label} data-testid={testId} />
        {palette.map((c) => (
          <button key={c} type="button" title={c} aria-label={c} onClick={() => onChange(c)} className={cx("size-7 rounded-full border-2", hex.toLowerCase() === c.toLowerCase() ? "border-violet-600" : "border-line")} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

const solid = (f: Fill | null): string => (typeof f === "string" ? f : f?.stops[0]?.color ?? "#000000");

export function PropertiesPanel({ doc, layer, apply, catalog, onPickImage, onUploadImage, onDuplicate, onDelete }: { doc: AdDocument; layer: Layer | null; apply: Apply; catalog: FontCatalog; onPickImage: () => void; onUploadImage: (f: File) => void; onDuplicate: () => void; onDelete: () => void }) {
  const t = useT();
  if (!layer) return <p className="p-2 text-sm text-muted" data-testid="properties-panel">{t("Sélectionnez un élément sur la publicité (ou dans les calques) pour le modifier.", "Select an element on the ad (or in the layers) to edit it.")}</p>;
  const l = layer;
  const palette = [...new Set(Object.values(doc.brand.palette).filter((c) => /^#/.test(c)))];
  const brandFonts = [doc.brand.fonts.heading, doc.brand.fonts.body];
  const families = [...new Set([...brandFonts.filter((f) => catalog[f]), ...Object.keys(catalog)])];
  const set = (patch: Partial<Layer>, key: string) => apply({ op: "update", id: l.id, patch }, `${l.id}:${key}`);
  const locked = l.locked;
  return (
    <div className="grid gap-4" data-testid="properties-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{t(...ROLE_FR[l.role])}{locked ? ` · ${t("verrouillé", "locked")}` : ""}</p>
        <div className="flex gap-1">
          <IconBtn label={t("Dupliquer", "Duplicate")} onClick={onDuplicate} disabled={locked} testId="duplicate"><Copy className="size-4" /></IconBtn>
          <IconBtn label={t("Supprimer", "Delete")} onClick={onDelete} disabled={locked} testId="delete"><Trash2 className="size-4" /></IconBtn>
        </div>
      </div>
      <fieldset disabled={locked} className="grid gap-4 disabled:opacity-50">
        {(l.kind === "text" || l.kind === "button") && (
          <>
            <label className="grid gap-1">
              <span className={lbl}>{t("Texte", "Text")}</span>
              <textarea className={cx(inp, "h-auto min-h-[64px] py-2")} value={l.text} data-testid="prop-text" onChange={(e) => apply({ op: "text", id: l.id, text: e.target.value }, `${l.id}:text`)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 grid gap-1">
                <span className={lbl}>{t("Police", "Font")}</span>
                <select className={inp} value={l.font.family} data-testid="prop-font" onChange={(e) => apply({ op: "font", id: l.id, font: { family: e.target.value } })}>
                  {families.map((f) => (
                    <option key={f} value={f}>{f}{brandFonts.includes(f) ? ` (${t("marque", "brand")})` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className={lbl}>{t("Graisse", "Weight")}</span>
                <select className={inp} value={l.font.weight} onChange={(e) => apply({ op: "font", id: l.id, font: { weight: Number(e.target.value) } })}>
                  {(catalog[l.font.family]?.weights ?? [{ weight: l.font.weight }]).map((w) => (
                    <option key={w.weight} value={w.weight}>{w.weight}</option>
                  ))}
                </select>
              </label>
              <Num label={t("Taille", "Size")} value={l.font.size} min={6} max={600} testId="prop-size" onChange={(v) => apply({ op: "font", id: l.id, font: { size: Math.max(6, v) } }, `${l.id}:size`)} />
            </div>
            <ColorField label={t("Couleur du texte", "Text colour")} value={l.color} palette={palette} testId="prop-color" onChange={(c) => apply({ op: "color", id: l.id, color: c }, `${l.id}:color`)} />
            {l.kind === "text" && (
              <div className="grid grid-cols-3 gap-2">
                <label className="grid gap-1">
                  <span className={lbl}>{t("Alignement", "Align")}</span>
                  <select className={inp} value={l.align} onChange={(e) => set({ align: e.target.value as "left" }, "align")}>
                    <option value="left">{t("Gauche", "Left")}</option>
                    <option value="center">{t("Centre", "Center")}</option>
                    <option value="right">{t("Droite", "Right")}</option>
                  </select>
                </label>
                <Num label={t("Interligne", "Line height")} value={l.lineHeight} step={0.05} min={0.7} max={3} onChange={(v) => set({ lineHeight: v } as Partial<Layer>, "lh")} />
                <Num label={t("Espacement", "Spacing")} value={l.letterSpacing} step={0.5} onChange={(v) => set({ letterSpacing: v } as Partial<Layer>, "ls")} />
                <label className="col-span-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={l.uppercase} onChange={(e) => set({ uppercase: e.target.checked } as Partial<Layer>, "upper")} /> {t("Capitales", "Uppercase")}
                </label>
              </div>
            )}
            {l.kind === "button" && (
              <>
                <ColorField label={t("Fond du bouton", "Button fill")} value={solid(l.fill)} palette={palette} testId="prop-fill" onChange={(c) => apply({ op: "fill", id: l.id, fill: c }, `${l.id}:fill`)} />
                <Num label={t("Arrondi", "Radius")} value={l.radius} min={0} onChange={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
              </>
            )}
          </>
        )}
        {l.kind === "shape" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={lbl}>{t("Forme", "Shape")}</span>
                <select className={inp} value={l.shape} onChange={(e) => set({ shape: e.target.value as "rect" } as Partial<Layer>, "shape")}>
                  <option value="rect">{t("Rectangle", "Rectangle")}</option>
                  <option value="ellipse">{t("Cercle / ellipse", "Circle / ellipse")}</option>
                  <option value="line">{t("Ligne", "Line")}</option>
                </select>
              </label>
              <Num label={t("Arrondi", "Radius")} value={l.radius} min={0} onChange={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
            </div>
            <ColorField label={t("Couleur", "Colour")} value={solid(l.fill)} palette={palette} testId="prop-fill" onChange={(c) => apply({ op: "fill", id: l.id, fill: typeof l.fill === "object" && l.fill ? { ...l.fill, stops: [{ offset: 0, color: c }, ...l.fill.stops.slice(1)] } : c }, `${l.id}:fill`)} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={typeof l.fill === "object" && !!l.fill}
                data-testid="prop-gradient"
                onChange={(e) => apply({ op: "fill", id: l.id, fill: e.target.checked ? { type: "linear", angle: 90, stops: [{ offset: 0, color: solid(l.fill) }, { offset: 1, color: "rgba(0,0,0,0)" }] } : solid(l.fill) })}
              />
              {t("Dégradé vers le transparent", "Gradient to transparent")}
            </label>
            {typeof l.fill === "object" && l.fill && <Num label={t("Angle du dégradé", "Gradient angle")} value={l.fill.angle} onChange={(v) => apply({ op: "fill", id: l.id, fill: { ...(l.fill as Exclude<Fill, string>), angle: v } }, `${l.id}:angle`)} />}
            <div className="grid grid-cols-2 gap-2">
              <ColorField label={t("Bordure", "Border")} value={l.stroke?.color ?? "#000000"} palette={[]} onChange={(c) => set({ stroke: { color: c, width: l.stroke?.width || 2 } } as Partial<Layer>, "stroke")} />
              <Num label={t("Épaisseur", "Width")} value={l.stroke?.width ?? 0} min={0} onChange={(v) => set({ stroke: v > 0 ? { color: l.stroke?.color ?? "#000000", width: v } : null } as Partial<Layer>, "strokew")} />
            </div>
          </>
        )}
        {l.kind === "image" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-9 rounded-full bg-ink px-4 text-sm font-medium text-paper" onClick={onPickImage} data-testid="replace-image">{t("Remplacer (bibliothèque)", "Replace (library)")}</button>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line px-4 text-sm">
                {t("Importer une photo", "Upload a photo")}
                <input type="file" accept="image/*" className="hidden" data-testid="upload-image" onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={lbl}>{t("Ajustement", "Fit")}</span>
                <select className={inp} value={l.fit} onChange={(e) => set({ fit: e.target.value as "cover" } as Partial<Layer>, "fit")}>
                  <option value="cover">{t("Remplir (recadrée)", "Fill (cropped)")}</option>
                  <option value="contain">{t("Entière", "Whole")}</option>
                </select>
              </label>
              <Num label={t("Arrondi", "Radius")} value={l.radius} min={0} onChange={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
            </div>
            <Crop layer={l} apply={apply} />
          </>
        )}
        <label className="grid gap-1">
          <span className={lbl}>{t("Opacité", "Opacity")} · {Math.round(l.opacity * 100)} %</span>
          <input type="range" min={0} max={1} step={0.01} value={l.opacity} onChange={(e) => set({ opacity: Number(e.target.value) }, "opacity")} />
        </label>
        <div className="grid grid-cols-4 gap-2">
          <Num label="X" value={l.x} testId="prop-x" onChange={(v) => apply({ op: "move", id: l.id, x: v, y: l.y }, `${l.id}:x`)} />
          <Num label="Y" value={l.y} testId="prop-y" onChange={(v) => apply({ op: "move", id: l.id, x: l.x, y: v }, `${l.id}:y`)} />
          <Num label={t("Larg.", "W")} value={l.w} min={4} onChange={(v) => apply({ op: "resize", id: l.id, x: l.x, y: l.y, w: v, h: l.h }, `${l.id}:w`)} />
          <Num label={t("Haut.", "H")} value={l.h} min={4} onChange={(v) => apply({ op: "resize", id: l.id, x: l.x, y: l.y, w: l.w, h: v }, `${l.id}:h`)} />
          <Num label={t("Rotation", "Rotation")} value={l.rotation} onChange={(v) => apply({ op: "rotate", id: l.id, rotation: v }, `${l.id}:rot`)} />
        </div>
        <div className="grid gap-1">
          <span className={lbl}>{t("Aligner sur la page", "Align to page")}</span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["left", <AlignStartVertical key="l" className="size-4" />, t("Gauche", "Left")],
                ["center", <AlignCenterVertical key="c" className="size-4" />, t("Centre", "Center")],
                ["right", <AlignEndVertical key="r" className="size-4" />, t("Droite", "Right")],
                ["top", <AlignStartHorizontal key="t" className="size-4" />, t("Haut", "Top")],
                ["middle", <AlignCenterHorizontal key="m" className="size-4" />, t("Milieu", "Middle")],
                ["bottom", <AlignEndHorizontal key="b" className="size-4" />, t("Bas", "Bottom")],
              ] as const
            ).map(([w, icon, label]) => (
              <IconBtn key={w} label={label} onClick={() => apply({ op: "move", id: l.id, ...alignBox(doc, l, w) })}>{icon}</IconBtn>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

/** Recadrage d'une photo : zoom et position dans l'image source (normalisés). */
function Crop({ layer, apply }: { layer: Extract<Layer, { kind: "image" }>; apply: Apply }) {
  const t = useT();
  const c = layer.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const zoom = 1 / Math.max(c.w, 0.05);
  const setCrop = (z: number, px: number, py: number) => {
    const w = 1 / z;
    apply({ op: "crop", id: layer.id, crop: z <= 1.001 ? null : { w, h: w, x: Math.min(1 - w, Math.max(0, px * (1 - w))), y: Math.min(1 - w, Math.max(0, py * (1 - w))) } }, `${layer.id}:crop`);
  };
  const px = c.w < 1 ? c.x / (1 - c.w) : 0.5;
  const py = c.h < 1 ? c.y / (1 - c.h) : 0.5;
  return (
    <div className="grid gap-2" data-testid="crop">
      <span className={lbl}>{t("Recadrer", "Crop")} · ×{zoom.toFixed(2)}</span>
      <input type="range" min={1} max={4} step={0.05} value={zoom} aria-label={t("Zoom de la photo", "Photo zoom")} data-testid="crop-zoom" onChange={(e) => setCrop(Number(e.target.value), px, py)} />
      <input type="range" min={0} max={1} step={0.01} value={px} aria-label={t("Position horizontale", "Horizontal position")} disabled={zoom <= 1.001} onChange={(e) => setCrop(zoom, Number(e.target.value), py)} />
      <input type="range" min={0} max={1} step={0.01} value={py} aria-label={t("Position verticale", "Vertical position")} disabled={zoom <= 1.001} onChange={(e) => setCrop(zoom, px, Number(e.target.value))} />
    </div>
  );
}
