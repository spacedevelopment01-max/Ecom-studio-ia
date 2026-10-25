/** Official temporary uploads / output downloads: never forward API credentials to storage. */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { api, type Transport } from "./http";
export async function mediaUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    isIP(u.hostname) ||
    !/(?:^|\.)(?:higgsfield\.ai|higgs\.ai|amazonaws\.com|cloudfront\.net)$/.test(
      u.hostname,
    )
  )
    throw Error("HIGGSFIELD_MEDIA_HOST_REFUSED");
  const ips = await lookup(u.hostname, { all: true });
  if (!ips.length || ips.some((i) => !isPublicIp(i.address)))
    throw Error("HIGGSFIELD_PRIVATE_MEDIA_REFUSED");
  return u.toString();
}
export function isPublicIp(ip: string) {
  if (ip.includes(":")) return !/^(::|fc|fd|fe80|::ffff:)/i.test(ip);
  const n = ip.split(".").map(Number);
  return (
    n.length === 4 &&
    !(
      [0, 10, 127].includes(n[0]) ||
      n[0] >= 224 ||
      (n[0] === 169 && n[1] === 254) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (n[0] === 192 && n[1] === 168) ||
      (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
      (n[0] === 198 && [18, 19].includes(n[1]))
    )
  );
}
export async function uploadImage(image: Buffer, transport: Transport = fetch) {
  const p = await api(
    "/files/generate-upload-url",
    { content_type: "image/jpeg" },
    transport,
  );
  if (
    typeof p.upload_url !== "string" ||
    typeof p.public_url !== "string" ||
    !p.upload_headers ||
    typeof p.upload_headers !== "object"
  )
    throw Error("HIGGSFIELD_UPLOAD_RECEIPT_INVALID");
  const url = await mediaUrl(p.upload_url);
  await mediaUrl(p.public_url);
  const headers = p.upload_headers as Record<string, string>;
  if (
    Object.entries(headers).some(
      ([k, v]) => /authorization|cookie|host/i.test(k) || typeof v !== "string",
    )
  )
    throw Error("HIGGSFIELD_UPLOAD_HEADERS_REFUSED");
  const r = await transport(url, {
    method: "PUT",
    body: new Uint8Array(image),
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw Error("HIGGSFIELD_UPLOAD_FAILED");
  return p.public_url;
}
export async function downloadVideo(raw: string, transport: Transport = fetch) {
  const r = await transport(await mediaUrl(raw), {
    redirect: "error",
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok || !r.body || !/^video\//.test(r.headers.get("content-type") ?? ""))
    throw Error("HIGGSFIELD_VIDEO_DOWNLOAD_FAILED");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > 256 * 1024 * 1024) {
      await r.body.cancel().catch(() => {});
      throw Error("HIGGSFIELD_VIDEO_TOO_LARGE");
    }
    chunks.push(chunk);
  }
  const b = Buffer.concat(chunks);
  if (b.length < 12 || b.subarray(4, 8).toString() !== "ftyp")
    throw Error("HIGGSFIELD_VIDEO_INVALID");
  return b;
}
