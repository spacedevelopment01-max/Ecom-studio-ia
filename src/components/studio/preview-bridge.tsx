"use client";
import { useEffect } from "react";
import { previewBridgeTarget } from "@/lib/theme/preview-bridge-policy";

export function PreviewBridge() {
  useEffect(() => {
    const active = new Set<string>();
    const listener = async (event: MessageEvent) => {
      const d = event.data;
      if (event.origin !== "null" || !["ecs-preview-request","ecs-preview-navigate"].includes(d?.channel)) return;
      const frame = Array.from(document.querySelectorAll("iframe")).find(f => f.contentWindow === event.source);
      if (!frame?.contentWindow) return;
      if(d.channel==="ecs-preview-navigate"){
        const url=typeof d.url==="string"?previewBridgeTarget(frame.src,d.url,"GET",location.origin):null;
        if(url&&!url.pathname.includes("/assets/")&&!url.pathname.includes("/__fonts/"))frame.src=url.href;
        return;
      }
      if(!Number.isSafeInteger(d.id))return;
      const reply = (data: object) => frame.contentWindow?.postMessage({ channel: "ecs-preview-response", id: d.id, ...data }, "*");
      const url = typeof d.url === "string" && typeof d.method === "string" ? previewBridgeTarget(frame.src, d.url, d.method, location.origin) : null;
      const key = `${frame.src}:${d.id}`;
      if (!url || active.size >= 20 || active.has(key) || (d.body != null && (typeof d.body !== "string" || new TextEncoder().encode(d.body).length > 65536))) { reply({ error: true }); return; }
      active.add(key);
      try {
        const headers = new Headers();
        if (typeof d.contentType === "string" && /^(?:application\/json|application\/x-www-form-urlencoded)(?:;|$)/i.test(d.contentType)) headers.set("content-type", d.contentType);
        if (typeof d.accept === "string" && d.accept.length < 200) headers.set("accept", d.accept);
        const res = await fetch(url, { method: d.method, headers, body: d.method === "POST" ? d.body : undefined, credentials: "same-origin", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
        const reader = res.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
        if (reader) while (true) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 4 * 1048576) { await reader.cancel(); throw new Error("Preview response too large"); } chunks.push(r.value); }
        const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        reply({ status: res.status, contentType: res.headers.get("content-type") ?? "text/plain", body: new TextDecoder().decode(bytes) });
      } catch { reply({ error: true }); } finally { active.delete(key); }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  return null;
}
