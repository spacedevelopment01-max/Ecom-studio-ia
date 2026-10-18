/** Aperçu comparable de l'ensemble proposé ; présentation locale, logo original non redessiné. */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { canvasFamily, ensureFonts, font } from "../media/fonts";
import { assetData, getAsset, saveAsset } from "../library";
import { contrast } from "../color";
import { L } from "../i18n-server";
import type { CompleteDirection } from "./direction-series";
export async function saveDirectionPreview(projectId: string, userId: string, name: string, d: CompleteDirection) {
  ensureFonts();
  const identity = d.identity, width = 1400, margin = 76;
  const ink = contrast(identity.palette.dark, identity.palette.light) >= 4.5 ? identity.palette.dark : "#171717";
  const paper = contrast(ink, identity.palette.light) >= 4.5 ? identity.palette.light : "#ffffff";
  const heading = canvasFamily(identity.fonts.heading), body = canvasFamily(identity.fonts.body);
  const measure = createCanvas(width, 10).getContext("2d");
  measure.font = font(body, 400, 27);
  const wrap = (text: string) => {
    const lines: string[] = []; let line = "";
    for (const word of text.split(/\s+/)) {
      if (line && measure.measureText(`${line} ${word}`).width > width - 2 * margin) { lines.push(line); line = word; }
      else line = [line, word].filter(Boolean).join(" ");
    }
    if (line) lines.push(line); return lines;
  };
  const rows = [identity.signature, `${L("Titres", "Headings")} : ${heading} · ${L("Texte", "Body")} : ${body}`, identity.tone.voice, identity.sampleText, identity.mood, identity.graphicLanguage, ...identity.rules].map(wrap);
  const height = 1040 + rows.reduce((n, lines) => n + lines.length * 39 + 28, 0);
  const canvas = createCanvas(width, height), ctx = canvas.getContext("2d");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink; ctx.font = font(heading, 600, 44); ctx.fillText(name, margin, 88);
  ctx.font = font(body, 400, 28); ctx.fillText(d.label, margin, 135);
  const logo = await loadImage(assetData(getAsset(d.logoId)!));
  const scale = Math.min(1000 / logo.width, 540 / logo.height);
  ctx.drawImage(logo, (width - logo.width * scale) / 2, 190 + (540 - logo.height * scale) / 2, logo.width * scale, logo.height * scale);
  Object.entries(identity.palette).forEach(([role, color], i) => {
    const x = margin + i * 248;
    ctx.fillStyle = color; ctx.fillRect(x, 790, 220, 100);
    ctx.fillStyle = ink; ctx.font = font(body, 400, 20); ctx.fillText(`${role} ${color}`, x, 925);
  });
  let y = 1020;
  rows.forEach((lines, i) => { ctx.font = font(i === 0 ? heading : body, i === 0 ? 600 : 400, 27); for (const line of lines) { ctx.fillText(line, margin, y); y += 39; } y += 28; });
  const a = await saveAsset({ projectId, userId, data: Buffer.from(await canvas.encode("png")), name: `direction-${d.id}-apercu.png`, mime: "image/png", origin: "generated", role: "direction-preview", folderKey: "brand.logos", sourceAssetId: d.logoId, status: "review", meta: { presentationOnly: true, directionId: d.id, version: d.version } });
  return a.id;
}
