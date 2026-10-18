/** Aperçu comparable de l'ensemble proposé ; présentation locale, logo original non redessiné. */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { canvasFamily, ensureFonts, font } from "../media/fonts";
import { assetData, getAsset, saveAsset } from "../library";
import { directionPaletteIssues, palettePresentation } from "./direction-palette";
import { L } from "../i18n-server";
import type { CompleteDirection } from "./direction-series";
export async function renderDirectionPreview(name: string, d: CompleteDirection, logoData: Buffer) {
  ensureFonts();
  const identity = d.identity, width = 1400, margin = 76;
  const issues = directionPaletteIssues(identity.palette);
  if (issues.length) throw new Error(`Planche non validable : ${issues.join(" ")}`);
  const view = palettePresentation(identity.palette), ink = view.text, paper = view.background;
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
  const surfaceLines = wrap(identity.signature), textLines = wrap(identity.sampleText);
  const surfaceHeight = surfaceLines.length * 39 + 52;
  const sampleBottom = 1030 + surfaceHeight + 45 + textLines.length * 39 + 130;
  const rows = [`${L("Titres", "Headings")} : ${heading} · ${L("Texte", "Body")} : ${body}`, identity.tone.voice, identity.mood, identity.graphicLanguage, ...Object.entries(identity.colorRoles).map(([role, usage]) => `${role} : ${usage}`), ...identity.rules].map(wrap);
  const height = sampleBottom + rows.reduce((n, lines) => n + lines.length * 39 + 28, 0) + 60;
  const canvas = createCanvas(width, height), ctx = canvas.getContext("2d");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = view.heading; ctx.font = font(heading, 600, 44); ctx.fillText(name, margin, 88);
  ctx.fillStyle = ink;
  ctx.font = font(body, 400, 28); ctx.fillText(d.label, margin, 135);
  const logo = await loadImage(logoData);
  const scale = Math.min(1000 / logo.width, 540 / logo.height);
  ctx.drawImage(logo, (width - logo.width * scale) / 2, 190 + (540 - logo.height * scale) / 2, logo.width * scale, logo.height * scale);
  Object.entries(identity.palette).forEach(([role, color], i) => {
    const x = margin + i * 248;
    ctx.fillStyle = color; ctx.fillRect(x, 790, 220, 100);
    ctx.fillStyle = ink; ctx.font = font(body, 400, 20); ctx.fillText(`${role} ${color}`, x, 925);
  });
  ctx.fillStyle = view.heading; ctx.font = font(heading, 600, 36); ctx.fillText(name, margin, 998);
  ctx.fillStyle = view.surface; ctx.fillRect(margin, 1030, width - margin * 2, surfaceHeight);
  ctx.fillStyle = view.surfaceText; ctx.font = font(body, 400, 27);
  surfaceLines.forEach((line, i) => ctx.fillText(line, margin + 20, 1072 + i * 39, width - margin * 2 - 40));
  let y = 1030 + surfaceHeight + 45;
  ctx.fillStyle = ink;
  for (const line of textLines) { ctx.fillText(line, margin, y); y += 39; }
  ctx.fillStyle = view.button; ctx.fillRect(margin, y + 5, 370, 66);
  ctx.fillStyle = view.buttonText; ctx.font = font(body, 600, 27); ctx.fillText(L("Découvrir l’offre", "Explore the offer"), margin + 22, y + 47);
  y = sampleBottom; ctx.fillStyle = ink;
  rows.forEach(lines => { ctx.font = font(body, 400, 27); for (const line of lines) { ctx.fillText(line, margin, y); y += 39; } y += 28; });
  return Buffer.from(await canvas.encode("png"));
}
export async function saveDirectionPreview(projectId: string, userId: string, name: string, d: CompleteDirection) {
  const a = await saveAsset({ projectId, userId, data: await renderDirectionPreview(name, d, assetData(getAsset(d.logoId)!)), name: `direction-${d.id}-apercu.png`, mime: "image/png", origin: "generated", role: "direction-preview", folderKey: "brand.logos", sourceAssetId: d.logoId, status: "review", meta: { presentationOnly: true, directionId: d.id, version: d.version, palette: d.identity.palette, colorRoles: d.identity.colorRoles, presentation: palettePresentation(d.identity.palette) } });
  return a.id;
}
