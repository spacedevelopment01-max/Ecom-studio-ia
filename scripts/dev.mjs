/**
 * Démarrage du studio en développement (« npm run dev ») : site + worker de tâches de fond.
 *
 * Un second lancement alors que le studio tourne déjà (ex. Codespaces relance « npm run dev » à chaque connexion)
 * trouvait le port occupé : le site s'arrêtait (« next dev -p 3000 exited with code 0 ») mais son worker restait
 * actif — deux workers se partageaient alors les tâches. Ici : port déjà pris → message clair, RIEN n'est lancé,
 * code de sortie 1 (l'échec reste visible). Le site et le worker s'arrêtent ensemble (--kill-others) : jamais un
 * worker orphelin ni un site sans worker.
 */
import net from "node:net";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.STUDIO_DEV_PORT || 3000);

/** Le port répond-il déjà (studio déjà lancé, ou autre programme) ? */
export function portInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    s.setTimeout(1500);
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("timeout", () => (s.destroy(), resolve(false)));
    s.once("error", () => resolve(false));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (await portInUse(PORT)) {
    console.error(`
Le port ${PORT} est déjà utilisé : le studio tourne sans doute déjà (onglet « Ports » de Codespaces, ou un autre
terminal). Rien n'a été relancé, pour ne pas démarrer un second worker.
  - Pour l'utiliser : ouvrez http://localhost:${PORT} (ou le port ${PORT} dans l'onglet « Ports »).
  - Pour le redémarrer : dans le terminal où il tourne, Ctrl+C, puis « npm run dev ».

Port ${PORT} is already in use: the studio is probably already running. Nothing was started.
`);
    process.exit(1);
  }
  const bin = path.join(path.dirname(createRequire(import.meta.url).resolve("concurrently/package.json")), "dist/bin/index.js");
  const child = spawn(process.execPath, [bin, "--kill-others", "--restart-tries", "5", "--restart-after", "3000", "-n", "web,worker", "-c", "cyan,magenta", `next dev -p ${PORT}`, "tsx watch worker/index.ts"], {
    stdio: "inherit",
    // « next » et « tsx » du projet, même lancé sans npm (npm ajoute node_modules/.bin au PATH, node seul non).
    env: { ...process.env, PATH: `${path.resolve("node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}` },
  });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => child.kill(sig));
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
