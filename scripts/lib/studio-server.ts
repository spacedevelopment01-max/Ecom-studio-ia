/**
 * Serveur d'aperçu local pour les bancs : mêmes fonctions que la route /preview du studio (thème compilé, LiquidJS,
 * médias de la bibliothèque, polices). Ne fait aucun appel d'IA.
 */
import fs from "node:fs";
import http from "node:http";
import { themeAssetBinary, type ThemeFiles } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { fontFilePath, renderPage } from "@/lib/theme/render";
import { runWithLang } from "@/lib/i18n-server";
import type { ThemeSpec } from "@/lib/theme/spec";

export function serveStudio(spec: ThemeSpec, files: ThemeFiles, lang: "fr" | "en" = "fr") {
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url!, "http://x");
      const p = u.pathname.replace(/^\/p/, "") || "/";
      if (p.startsWith("/assets/")) {
        const name = decodeURIComponent(p.slice(8));
        if (spec.files[name]) {
          const bin = await themeAssetBinary(spec, name, libraryLoader);
          if (bin) {
            res.writeHead(200, { "Content-Type": bin.mime });
            return res.end(bin.data);
          }
        }
        const t = files.get("assets/" + name);
        res.writeHead(t ? 200 : 404, { "Content-Type": name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "application/javascript" : "image/svg+xml" });
        return res.end(t ?? "");
      }
      if (p.startsWith("/__fonts/")) {
        const f = fontFilePath(p.slice(9));
        if (!f) return res.writeHead(404).end();
        res.writeHead(200, { "Content-Type": "font/ttf" });
        return res.end(fs.readFileSync(f));
      }
      const r = await runWithLang({ ui: lang, content: lang }, () => renderPage({ spec, base: "/p", files, cart: [] }, p, u.searchParams));
      res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(r.html);
    } catch (e) {
      res.writeHead(500).end(String((e as Error).message));
    }
  });
  return new Promise<{ base: string; close: () => void }>((resolve) => server.listen(0, () => resolve({ base: `http://localhost:${(server.address() as any).port}/p`, close: () => server.close() })));
}
