import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Génération de PDF propres (A4) côté serveur, sans dépendance externe.
 * Police Helvetica standard (jeu WinAnsi : couvre le français, €, œ, guillemets).
 */
const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 62;
const NAVY = rgb(15 / 255, 30 / 255, 54 / 255);
const ORANGE = rgb(194 / 255, 65 / 255, 12 / 255);
const GREY = rgb(0.36, 0.4, 0.47);

/** Remplace les caractères non représentables par la police standard. */
export function toWinAnsi(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•●]/g, "-")
    .replace(/\t/g, "    ")
    .replace(/[^\n\x20-\x7E -ÿŒœŠšŸŽž€†‡‰ƒ]/gu, "?");
}

class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
    private footer: string,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.y = A4.h - MARGIN;
  }
  ensure(h: number) {
    if (this.y - h < MARGIN + 24) this.newPage();
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of toWinAnsi(text).split("\n")) {
      if (para.trim() === "") {
        out.push("");
        continue;
      }
      let line = "";
      for (const word of para.split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else {
          if (line) out.push(line);
          // mot plus long que la ligne : découpe forcée
          let w = word;
          while (font.widthOfTextAtSize(w, size) > width) {
            let cut = w.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
            out.push(w.slice(0, cut));
            w = w.slice(cut);
          }
          line = w;
        }
      }
      out.push(line);
    }
    return out;
  }
  text(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? A4.w - MARGIN - x;
    const lh = size * 1.45;
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(lh);
      if (line) this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? NAVY });
      this.y -= lh;
    }
    this.y -= opts.gap ?? 0;
  }
  finish() {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      const label = toWinAnsi(`${this.footer}${total > 1 ? `   -   page ${i + 1}/${total}` : ""}`);
      p.drawText(label, { x: MARGIN, y: 30, size: 8, font: this.font, color: GREY });
    });
  }
}

export type LetterPdfInput = {
  sender: { name: string; lines: string[] };
  recipient: { name: string; lines: string[] };
  place: string;
  date: string; // déjà formatée en français
  subject: string;
  references?: string[];
  body: string;
  closing: string;
  signature: string;
  sendingMention?: string; // ex. « Lettre recommandée avec avis de réception »
  attachments?: string[];
};

export async function letterPdf(input: LetterPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(input.subject));
  doc.setCreator("Allô Papiers");
  doc.setProducer("Allô Papiers");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, "Document préparé avec Allô Papiers - service privé indépendant, non affilié à l'administration");

  // Expéditeur (gauche)
  w.text(input.sender.name, { bold: true, size: 11 });
  for (const l of input.sender.lines) w.text(l, { size: 11 });
  w.y -= 18;
  // Destinataire (droite)
  const rx = A4.w / 2 + 10;
  w.text(input.recipient.name, { bold: true, x: rx });
  for (const l of input.recipient.lines) w.text(l, { x: rx });
  w.y -= 22;
  w.text(`${input.place ? `${input.place}, le ` : "Le "}${input.date}`, { x: rx, gap: 18 });

  if (input.sendingMention) w.text(input.sendingMention, { bold: true, size: 10, color: ORANGE, gap: 4 });
  w.text(`Objet : ${input.subject}`, { bold: true, gap: 2 });
  for (const r of input.references ?? []) w.text(r, { size: 10, color: GREY });
  w.y -= 14;
  w.text(input.body, { size: 11 });
  w.y -= 8;
  w.text(input.closing, { gap: 22 });
  w.text(input.signature, { x: rx, bold: true });
  if (input.attachments?.length) {
    w.y -= 20;
    w.text("Pièces jointes :", { bold: true, size: 10 });
    for (const a of input.attachments) w.text(`- ${a}`, { size: 10 });
  }
  w.finish();
  return Buffer.from(await doc.save());
}

export type SheetSection = { title: string; items?: string[]; text?: string };

export async function sheetPdf(title: string, subtitle: string, sections: SheetSection[], notice: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(title));
  doc.setCreator("Allô Papiers");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, "Allô Papiers - service privé indépendant, non affilié à l'administration");
  w.page.drawRectangle({ x: MARGIN, y: w.y - 4, width: 34, height: 4, color: ORANGE });
  w.y -= 14;
  w.text(title, { size: 18, bold: true, gap: 2 });
  w.text(subtitle, { size: 10, color: GREY, gap: 14 });
  for (const s of sections) {
    w.ensure(40);
    w.text(s.title, { size: 13, bold: true, gap: 4 });
    if (s.text) w.text(s.text, { gap: 6 });
    for (const it of s.items ?? []) w.text(`- ${it}`, { x: MARGIN + 8, gap: 2 });
    w.y -= 10;
  }
  w.y -= 6;
  w.text(notice, { size: 9, color: GREY });
  w.finish();
  return Buffer.from(await doc.save());
}

/** Fusionne plusieurs PDF (courrier + pièces jointes) en un seul fichier. */
export async function mergePdfs(parts: Buffer[]): Promise<Buffer> {
  const out = await PDFDocument.create();
  for (const p of parts) {
    const src = await PDFDocument.load(p);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  return Buffer.from(await out.save());
}

/** Convertit une image (JPEG/PNG) en page PDF A4, pour joindre une pièce. */
export async function imageToPdf(img: Buffer, mime: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const embedded = mime === "image/png" ? await doc.embedPng(img) : await doc.embedJpg(img);
  const page = doc.addPage([A4.w, A4.h]);
  const scale = Math.min((A4.w - 60) / embedded.width, (A4.h - 60) / embedded.height, 1);
  const w = embedded.width * scale;
  const h = embedded.height * scale;
  page.drawImage(embedded, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
  return Buffer.from(await doc.save());
}
