/** Browser-proof process only. Simulated upstream; deny every other external fetch.
 * Use only with an isolated DATA_DIR and HIGGSFIELD_PROOF=1. Never imported by application code. */
import path from "node:path";
import dns from "node:dns/promises";
import { syncBuiltinESMExports } from "node:module";
if (
  process.env.HIGGSFIELD_PROOF !== "1" ||
  !path
    .resolve(process.env.DATA_DIR || "")
    .startsWith("/tmp/ecs-higgsfield-proof-")
)
  throw Error("Isolated Higgsfield proof process required");
const nativeLookup = dns.lookup;
dns.lookup = async function (host, options) {
  if (host === "images.higgs.ai")
    return options?.all
      ? [{ address: "8.8.8.8", family: 4 }]
      : { address: "8.8.8.8", family: 4 };
  return nativeLookup(host, options);
};
syncBuiltinESMExports();
const native = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const u = new URL(String(input instanceof Request ? input.url : input));
  if (["localhost", "127.0.0.1"].includes(u.hostname))
    return native(input, init);
  if (
    u.href === "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
  )
    return new Response(
      `<Cube time='${new Date().toISOString().slice(0, 10)}'><Cube currency='USD' rate='1.1000'/></Cube>`,
    );
  if (u.href === "https://open.higgsfield.ai/explore")
    return new Response(
      '<a href="/models/bytedance/seedance-2.0/image-to-video/playground">Seedance</a><a href="/models/higgsfield/genjutsu/motion-transfer/v1.0/playground">Motion reference (not connected)</a>',
    );
  if (u.href === "https://api.higgsfield.ai/files/generate-upload-url")
    return Response.json({
      public_url: "https://images.higgs.ai/neutral-reference.jpg",
      upload_url: "https://images.higgs.ai/upload",
      upload_headers: { "Content-Type": "image/jpeg" },
    });
  if (u.href === "https://images.higgs.ai/upload")
    return new Response(null, { status: 200 });
  if (
    u.origin === "https://api.higgsfield.ai" &&
    u.pathname.startsWith("/estimate/")
  ) {
    const body = JSON.parse(String(init?.body));
    const rate =
      u.pathname.includes("/4k/") || body.resolution === "4k"
        ? 0.8
        : body.resolution === "1080p"
          ? 0.22
          : 0.15;
    return Response.json({
      usd: String(
        Math.round(
          rate *
            body.duration *
            (body.generate_audio || body.sound === "on" ? 1.4 : 1) *
            100000,
        ) / 100000,
      ),
    });
  }
  throw Error(`PROOF_NETWORK_DENIED: ${u.origin}`);
};
