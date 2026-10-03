/** PDF minimal : une image JPEG pleine page par page (charte de marque, planches). */
export function jpegPagesToPdf(pages: { jpeg: Buffer; width: number; height: number }[], pageW = 842, pageH = 595, title = "Document"): Buffer {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Buffer | string) => {
    const buf = typeof b === "string" ? Buffer.from(b, "latin1") : b;
    chunks.push(buf);
    pos += buf.length;
  };
  const obj = (n: number, body: (Buffer | string)[]) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    for (const b of body) push(b);
    push("\nendobj\n");
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = pages.length;
  // 1 catalogue, 2 arbre des pages, 3 infos, puis par page : page, image, contenu.
  const pageIds = pages.map((_, i) => 4 + i * 3);
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${n} >>`]);
  const esc = (s: string) => s.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "?");
  obj(3, [`<< /Title (${esc(title)}) /Producer (E-COM STUDIO IA) >>`]);
  pages.forEach((p, i) => {
    const pid = pageIds[i], img = pid + 1, content = pid + 2;
    obj(pid, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`]);
    obj(img, [`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, "\nendstream"]);
    const stream = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im${i} Do Q`;
    obj(content, [`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]);
  });
  const xref = pos;
  const total = 4 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let k = 1; k < total; k++) push(`${String(offsets[k] ?? 0).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(chunks);
}
