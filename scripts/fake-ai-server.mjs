/**
 * Faux fournisseurs d'IA en local (tests navigateur SANS aucun appel payant) : imite l'API OpenAI Images
 * (/v1/images/generations) et l'API Anthropic Messages (/v1/messages en flux, /v1/messages/count_tokens).
 * Le studio et le worker y sont branchés par OPENAI_BASE_URL et ANTHROPIC_BASE_URL (clés factices locales).
 *   FAKE_AI_PORT=3999 FAKE_AI_MODE=ok|refuse node scripts/fake-ai-server.mjs
 * Mode « refuse » : OpenAI répond 400 comme pour un fond transparent non pris en charge (rien n'est facturé).
 * GET /stats : nombre d'appels reçus par point d'accès.
 * FAKE_AI_LOGO=<png> : renvoie ce logo (ex. le vrai logo OpenAI déjà payé) pour la 1re image, au lieu d'un dessin simulé.
 * Mode « 502 » : erreur de passerelle (facturation incertaine) ; mode « cut » : flux coupé après le 1er aperçu.
 */
import fs from "node:fs";
import http from "node:http";
import sharp from "sharp";

const PORT = Number(process.env.FAKE_AI_PORT || 3999);
let MODE = process.env.FAKE_AI_MODE || "ok";
const stats = { images: 0, messages: 0, count: 0, imageBodies: [] };

/** Trois logos simulés, différents (dessinés ici : ce ne sont pas des logos d'une IA) : anneau, maison au trait, et
 * un triangle plein — une forme de remplissage que le studio doit écarter sans lui donner de note. */
const COLORS = ["#2E2E33", "#446274", "#8A5A2B"];
const REAL = process.env.FAKE_AI_LOGO ? fs.readFileSync(process.env.FAKE_AI_LOGO).toString("base64") : null;
async function fakeLogo(i) {
  if (REAL && i % 3 === 0) return REAL;
  const c = COLORS[i % 3];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FFFFFF"/>
    ${i % 3 === 0 ? `<circle cx="512" cy="380" r="200" fill="${c}"/><circle cx="512" cy="380" r="100" fill="#FFFFFF"/>` : i % 3 === 1 ? `<path d="M300 520 L300 330 L512 170 L724 330 L724 520 Z" fill="none" stroke="${c}" stroke-width="44" stroke-linejoin="round"/><rect x="470" y="400" width="84" height="120" fill="${c}"/>` : `<path d="M300 520 L512 220 L724 520 Z" fill="${c}"/>`}
    <text x="512" y="720" font-family="DejaVu Sans, sans-serif" font-size="80" font-weight="700" fill="#222" text-anchor="middle">SÉBASTIEN BLANC</text></svg>`;
  return (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

/** Réponse du « modèle de texte » selon la demande : territoires ou relecture d'un logo complet. */
function answer(body) {
  const sys = JSON.stringify(body.system ?? "");
  const msgs = JSON.stringify(body.messages ?? "");
  if (sys.includes("TERRITOIRES CRÉATIFS")) {
    const t = (name, markType, composition, construction, sobriety, style, symbolIdea) => ({ name, concept: `Direction « ${name} » : une proposition pensée pour cette marque.`, whyItFits: "Traduit la personnalité de la marque pour sa clientèle.", markType, composition, typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, sobriety, construction, symbolIdea, distinctive: "", avoid: [], style, descriptor: null });
    return JSON.stringify({ territories: [t("Signature nette", "wordmark", "wordmark_only", "typographic", 1, "typographic", null), t("Signe épuré", "symbol_wordmark", "stacked", "geometric", 3, "minimal", "un signe tiré du geste"), t("Initiales sobres", "monogram", "horizontal", "organic", 5, "premium", "les initiales construites")] });
  }
  if (sys.includes("logo complet dessiné par une IA d'images")) {
    const name = /Nom attendu \(exact\) : « ([^»]+) »/.exec(msgs)?.[1] ?? "";
    // Le 2e logo est noté sous la barrière : il doit apparaître comme ÉCARTÉ, avec son image.
    const low = msgs.includes("Signe épuré");
    const s = low ? 6.8 : 8.7;
    return JSON.stringify({ criteria: { relevance: s, originality: s, craft: s, typography: s, composition: s, legibility: s, memorability: s, intendedUse: s }, textRead: name.toLocaleUpperCase("fr-FR"), nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: low ? ["symbole peu mémorable"] : [], needsSimplifiedMark: true });
  }
  return "{}";
}

function sse(res, model, text) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  ev("message_start", { message: { id: "msg_fake", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3000, output_tokens: 1 } } });
  ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  ev("content_block_delta", { index: 0, delta: { type: "text_delta", text } });
  ev("content_block_stop", { index: 0 });
  ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 800 } });
  ev("message_stop", {});
  res.end();
}

http
  .createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const url = (req.url || "").split("?")[0];
    const send = (code, j) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(j)));
    if (url === "/stats") return send(200, { mode: MODE, ...stats, imageBodies: stats.imageBodies.slice(-5) });
    if (url === "/mode" && req.method === "POST") return (MODE = body.mode || MODE), send(200, { mode: MODE });
    if (url.endsWith("/images/generations")) {
      stats.images++;
      stats.imageBodies.push({ model: body.model, background: body.background ?? null, quality: body.quality, size: body.size, stream: !!body.stream, partials: body.partial_images ?? 0 });
      if (MODE === "refuse") return send(400, { error: { message: "Transparent background is not supported for this model.", type: "invalid_request_error" } });
      if (MODE === "502") return send(502, { error: { message: "upstream request failed" } });
      const b64 = await fakeLogo(stats.images - 1);
      const usage = { input_tokens: 900, output_tokens: 4160 + 100 * (body.partial_images ?? 0), input_tokens_details: { text_tokens: 900, image_tokens: 0 } };
      if (body.stream) {
        // Flux comme l'API : images partielles puis image finale (événements SSE).
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (let i = 0; i < (body.partial_images ?? 0); i++) {
          res.write(`event: image_generation.partial_image\ndata: ${JSON.stringify({ type: "image_generation.partial_image", partial_image_index: i, b64_json: b64.slice(0, 4000) })}\n\n`);
          await new Promise((r) => setTimeout(r, Number(process.env.FAKE_AI_DELAY_MS || 1500)));
          if (MODE === "cut") return res.socket?.destroy();
        }
        res.write(`event: image_generation.completed\ndata: ${JSON.stringify({ type: "image_generation.completed", b64_json: b64, usage })}\n\n`);
        return res.end();
      }
      return send(200, { created: Date.now(), data: [{ b64_json: b64 }], usage });
    }
    if (url.endsWith("/messages/count_tokens")) {
      stats.count++;
      return send(200, { input_tokens: Math.ceil(raw.length / 3) });
    }
    if (url.endsWith("/messages")) {
      stats.messages++;
      const text = answer(body);
      if (body.stream) return sse(res, body.model, text);
      return send(200, { id: "msg_fake", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 3000, output_tokens: 800 } });
    }
    send(404, { error: { message: `fake: ${url}` } });
  })
  .listen(PORT, () => console.log(`[fake-ai] http://localhost:${PORT} (mode ${MODE})`));
