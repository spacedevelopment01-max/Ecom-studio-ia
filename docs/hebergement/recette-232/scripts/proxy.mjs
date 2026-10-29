// Proxy HTTPS LOCAL de recette (#232) : certificat auto-signé, transmet au studio isolé en conservant le nom d'hôte.
// Simule le proxy frontal d'un hébergement réel (Caddy/Traefik) ; rien n'est exposé hors de cette machine.
import https from "node:https";
import http from "node:http";
import fs from "node:fs";
const [port, target] = [Number(process.argv[2] ?? 3943), Number(process.argv[3] ?? 3912)];
const dir = new URL("./tls/", import.meta.url).pathname;
https.createServer({ key: fs.readFileSync(dir + "key.pem"), cert: fs.readFileSync(dir + "cert.pem") }, (req, res) => {
  const headers = { ...req.headers, "x-forwarded-for": req.socket.remoteAddress, "x-forwarded-proto": "https" };
  const up = http.request({ host: "127.0.0.1", port: target, method: req.method, path: req.url, headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
}).listen(port, "127.0.0.1", () => console.log(`proxy https 127.0.0.1:${port} -> ${target}`));
