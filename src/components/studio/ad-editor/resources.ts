"use client";
/**
 * Ressources de l'éditeur visuel : catalogue de polices du studio (mêmes fichiers et alias que le serveur) et images
 * de la bibliothèque du projet. Chargées une fois, partagées entre les rendus.
 */
import { useEffect, useState } from "react";
import { api } from "../../ui";
import { docFonts, fontString, type FontCatalog } from "@/lib/ad-doc/fonts-client";
import type { RenderEnv } from "@/lib/ad-doc/render";
import type { AdDocument } from "@/lib/ad-doc/types";

let catalogPromise: Promise<FontCatalog> | null = null;
const loadedFonts = new Set<string>();
const images = new Map<string, Promise<HTMLImageElement | null>>();

export function useFontCatalog(): FontCatalog | null {
  const [cat, setCat] = useState<FontCatalog | null>(null);
  useEffect(() => {
    catalogPromise ??= api<{ fonts: FontCatalog }>("/api/fonts").then((r) => r.fonts);
    let live = true;
    catalogPromise.then((c) => live && setCat(c)).catch(() => live && setCat({}));
    return () => {
      live = false;
    };
  }, []);
  return cat;
}

/** Charge les polices d'un document (FontFace sous l'alias du serveur) ; résout quand elles sont prêtes. */
export async function ensureDocFonts(cat: FontCatalog, doc: AdDocument): Promise<void> {
  const need = docFonts(cat, doc.layers as never);
  await Promise.all(
    [...need].map(async ([alias, file]) => {
      if (loadedFonts.has(alias)) return;
      const face = new FontFace(alias, `url(/api/fonts/${encodeURIComponent(file)})`);
      await face.load();
      document.fonts.add(face);
      loadedFonts.add(alias);
    }),
  );
}

export function loadImage(assetId: string): Promise<HTMLImageElement | null> {
  let p = images.get(assetId);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `/api/files/${assetId}`;
    });
    images.set(assetId, p);
  }
  return p;
}

/** Images d'un document chargées (asset → image). */
export async function docImages(doc: AdDocument): Promise<RenderEnv["images"]> {
  const out: RenderEnv["images"] = new Map();
  const ids = [...new Set(doc.layers.flatMap((l) => (l.kind === "image" && l.assetId ? [l.assetId] : [])))];
  for (const id of ids) {
    const img = await loadImage(id);
    if (img) out.set(id, img as never);
  }
  return out;
}

export const browserEnv = (cat: FontCatalog, imgs: RenderEnv["images"]): RenderEnv => ({ font: (f, w, s, i) => fontString(cat, f, w, s, i), images: imgs });
