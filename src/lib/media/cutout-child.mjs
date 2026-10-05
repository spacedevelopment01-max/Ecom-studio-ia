/**
 * Détourage dans un processus séparé : le modèle ONNX peut demander beaucoup de mémoire.
 * S'il plante (mémoire insuffisante, machine trop petite), seul ce processus s'arrête :
 * le studio et le worker continuent, et le détourage de secours prend le relais.
 * Entrée : image PNG sur stdin. Sortie : PNG détouré sur stdout.
 */
import { removeBackground } from "@imgly/background-removal-node";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const input = Buffer.concat(chunks);
const model = process.env.CUTOUT_MODEL === "small" ? "small" : "medium";
const out = await removeBackground(new Blob([new Uint8Array(input)], { type: "image/png" }), { model, output: { format: "image/png", quality: 1 } });
process.stdout.write(Buffer.from(await out.arrayBuffer()));
