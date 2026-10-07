"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { api, Badge, cx, useToast } from "../ui";
import { useT } from "../i18n";
import type { BusinessType } from "@/lib/project-types";
import { deliveryLabel, deliveryMode, deliveryTone } from "@/lib/delivery";

/** Plateformes livrées par le studio (mêmes identifiants que le serveur : src/lib/theme/platforms.ts). */
export const PLATFORM_IDS = ["shopify", "woocommerce", "prestashop", "wix", "squarespace"] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];
export const isPlatform = (v: unknown): v is PlatformId => (PLATFORM_IDS as readonly string[]).includes(v as string);

/** Plateforme conseillée : Shopify pour vendre des produits, WordPress (thème de blocs, sans boutique) pour un site de services. */
export const recommendedPlatform = (business: BusinessType): PlatformId => (business === "services" ? "woocommerce" : "shopify");

type T = ReturnType<typeof useT>;

export { deliveryLabel, deliveryTone };

/**
 * Nom, mode de livraison et explication honnête de ce que le studio fournit pour chaque plateforme.
 * `connected` : le client a une vraie connexion active à cette plateforme (sinon jamais « Connecté »).
 */
export function platformInfo(id: PlatformId, business: BusinessType, t: T, connected = false) {
  return { ...platformText(id, business, t), delivery: deliveryMode(id, connected) };
}

function platformText(id: PlatformId, business: BusinessType, t: T) {
  const svc = business === "services";
  switch (id) {
    case "shopify":
      return {
        name: "Shopify",
        short: "Shopify",
        kind: "theme" as const,
        text: svc
          ? t("Thème complet installable (ZIP). Convient aussi à une activité de services : pages, prestations, contact — avec un abonnement Shopify.", "Complete installable theme (ZIP). Also works for a services business: pages, services, contact — with a Shopify plan.")
          : t("Thème Online Store 2.0 complet, installable en ZIP ou envoyé directement si votre boutique est connectée.", "Complete Online Store 2.0 theme, installable as a ZIP or sent directly if your store is connected."),
      };
    case "woocommerce":
      return {
        name: t("WordPress / WooCommerce", "WordPress / WooCommerce"),
        short: "WordPress",
        kind: "theme" as const,
        text: svc
          ? t("Thème de blocs WordPress installable (Apparence › Thèmes › Téléverser) : le site de votre activité, sans boutique — WooCommerce n'est pas nécessaire.", "Installable WordPress block theme (Appearance › Themes › Upload): your business website, no store — WooCommerce isn't needed.")
          : t("Thème de blocs WordPress installable (Apparence › Thèmes › Téléverser), prêt pour WooCommerce, plus un CSV de vos produits.", "Installable WordPress block theme (Appearance › Themes › Upload), WooCommerce-ready, plus a CSV of your products."),
      };
    case "prestashop":
      return {
        name: "PrestaShop",
        short: "PrestaShop",
        kind: "theme" as const,
        text: svc
          ? t("Thème enfant du thème Classic, installable. PrestaShop est pensé pour la vente en ligne : peu adapté à un site de services.", "Installable child theme of the Classic theme. PrestaShop is built for selling online: not a great fit for a services website.")
          : t("Thème enfant du thème Classic (PrestaShop 1.7 / 8), installable depuis Apparence › Thème et logo.", "Child theme of the Classic theme (PrestaShop 1.7 / 8), installable from Design › Theme & Logo."),
      };
    case "wix":
      return {
        name: "Wix",
        short: "Wix",
        kind: "kit" as const,
        text: t("Wix n'accepte pas l'import d'un thème : vous recevez un kit de reprise (médias, charte, polices, textes de chaque page, guide) pour reconstruire le site dans Wix.", "Wix doesn't accept imported themes: you get a rebuild kit (media, brand guide, fonts, the text of every page, a guide) to rebuild the site in Wix."),
      };
    case "squarespace":
      return {
        name: "Squarespace",
        short: "Squarespace",
        kind: "kit" as const,
        text: t("Squarespace n'accepte pas l'import d'un thème : vous recevez un kit de reprise (médias, charte, polices, textes de chaque page, guide) pour reconstruire le site.", "Squarespace doesn't accept imported themes: you get a rebuild kit (media, brand guide, fonts, the text of every page, a guide) to rebuild the site."),
      };
  }
}

/** Choix de la plateforme en cartes lisibles (formulaire « Nouveau projet », réglages du Pilote). */
export function PlatformCards({ value, onChange, business, name, compact }: { value: PlatformId; onChange: (p: PlatformId) => void; business: BusinessType; name?: string; compact?: boolean }) {
  const t = useT();
  const rec = recommendedPlatform(business);
  return (
    <div>
      {name && <input type="hidden" name={name} value={value} />}
      <div role="radiogroup" aria-label={t("Plateforme", "Platform")} className={cx("grid gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {PLATFORM_IDS.map((id) => {
          const info = platformInfo(id, business, t);
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(id)}
              className={cx("relative grid content-start gap-1 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal", on ? "border-signal bg-signal-soft" : "border-line bg-card hover:border-ink")}
            >
              <span className="flex flex-wrap items-center gap-1.5 pr-6">
                <span className="text-sm font-semibold">{info.name}</span>
                {id === rec && <Badge tone="signal" className="!px-2 !py-0 text-[10px]">{t("Conseillé", "Recommended")}</Badge>}
              </span>
              <span className={cx("text-[11px] font-medium uppercase tracking-[.08em]", info.delivery === "kit" ? "text-warn" : "text-ok")}>{deliveryLabel(info.delivery, t)}</span>
              <span className="text-xs leading-snug text-muted">{info.text}</span>
              {on && <Check className="absolute right-3 top-3 size-4 text-signal" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pastille « Shopify ▾ » : change la plateforme du projet (PATCH) depuis l'éditeur de site. */
export function PlatformPill({ projectId, platform, business, onChanged }: { projectId: string; platform: string; business: BusinessType; onChanged?: () => void }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => (document.removeEventListener("mousedown", close), document.removeEventListener("keydown", esc));
  }, [open]);
  const cur = isPlatform(platform) ? platform : "shopify";
  const rec = recommendedPlatform(business);
  async function choose(p: PlatformId) {
    setOpen(false);
    if (p === cur) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}`, { method: "PATCH", body: { platform: p } });
      toast("ok", t(`Plateforme : ${platformInfo(p, business, t).name}. L'export s'adapte.`, `Platform: ${platformInfo(p, business, t).name}. The export adapts.`));
      onChanged?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} disabled={busy} aria-expanded={open} aria-haspopup="listbox" title={t("Plateforme du site", "Site platform")} className={cx("inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium", open ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")}>
        <span className="sr-only">{t("Plateforme :", "Platform:")} </span>
        {platformInfo(cur, business, t).short} <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label={t("Plateforme du site", "Site platform")} className="absolute right-0 top-11 z-40 grid w-[min(20rem,calc(100vw-2rem))] gap-1 rounded-2xl border border-line bg-card p-2 shadow-soft">
          {PLATFORM_IDS.map((id) => {
            const info = platformInfo(id, business, t);
            return (
              <li key={id}>
                <button role="option" aria-selected={id === cur} onClick={() => choose(id)} className={cx("grid w-full gap-0.5 rounded-xl p-2.5 text-left hover:bg-paper-2", id === cur && "bg-paper-2")}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {info.name}
                    {id === rec && <Badge tone="signal" className="!px-2 !py-0 text-[10px]">{t("Conseillé", "Recommended")}</Badge>}
                    {id === cur && <Check className="ml-auto size-4 text-signal" aria-hidden />}
                  </span>
                  <span className="text-[11px] leading-snug text-muted">{info.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
