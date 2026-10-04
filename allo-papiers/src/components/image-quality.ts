"use client";

/**
 * Contrôle de qualité d'une photo, fait dans le navigateur avant l'envoi :
 * taille, luminosité, contraste et netteté (variance du laplacien sur une version réduite).
 * Puis compression en JPEG (max 2200 px) pour rester sous la limite d'envoi.
 */
export type QualityReport = { ok: boolean; warnings: string[]; width: number; height: number };

async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* repli ci-dessous */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = URL.createObjectURL(file);
  });
}

export async function checkAndCompress(file: File): Promise<{ blob: Blob; report: QualityReport }> {
  const img = await loadImage(file);
  const w = "naturalWidth" in img ? img.naturalWidth : img.width;
  const h = "naturalHeight" in img ? img.naturalHeight : img.height;
  const warnings: string[] = [];
  if (Math.min(w, h) < 900) warnings.push("Image petite : le texte risque d'être difficile à lire. Rapprochez-vous ou utilisez une meilleure résolution.");

  // Analyse sur une version réduite (rapide, même sur un téléphone modeste)
  const sw = 400;
  const sh = Math.max(1, Math.round((h / w) * sw));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img as CanvasImageSource, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const gray = new Float32Array(sw * sh);
  let sum = 0;
  for (let i = 0; i < sw * sh; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  const mean = sum / (sw * sh);
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) varSum += (gray[i] - mean) ** 2;
  const contrast = Math.sqrt(varSum / gray.length);
  let lap = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - sw] - gray[i + sw];
      lap += v;
      lapSq += v * v;
      n++;
    }
  }
  const sharpness = lapSq / n - (lap / n) ** 2;
  if (mean < 70) warnings.push("Photo sombre : allumez la lumière ou approchez-vous d'une fenêtre.");
  if (mean > 235) warnings.push("Photo très claire : évitez le flash et les reflets.");
  if (contrast < 25) warnings.push("Contraste faible : le texte se distingue mal du fond.");
  if (sharpness < 60) warnings.push("Photo floue : tenez le téléphone immobile et touchez l'écran pour faire la mise au point.");

  // Compression
  const max = 2200;
  const scale = Math.min(1, max / Math.max(w, h));
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(img as CanvasImageSource, 0, 0, out.width, out.height);
  if ("close" in img) img.close();
  let quality = 0.85;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i++) {
    blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size < 3.5 * 1024 * 1024) break;
    quality -= 0.15;
  }
  if (!blob) throw new Error("Compression impossible");
  return { blob, report: { ok: warnings.length === 0, warnings, width: w, height: h } };
}
