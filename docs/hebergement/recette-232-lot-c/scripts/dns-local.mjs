// Serveur DNS LOCAL de recette (#232, lot C) : répond sur 127.0.0.1:5354 (UDP) pour des domaines FICTIFS en .example,
// d'après la zone `dns-zone.json` relue à chaque question (la recette y ajoute ou retire des enregistrements, comme le
// ferait le client chez son fournisseur). Types : A, AAAA, CNAME, TXT. Rien n'est relayé vers l'extérieur.
import dgram from "node:dgram";
import fs from "node:fs";
const ZONE = new URL("./dns-zone.json", import.meta.url).pathname;
if (!fs.existsSync(ZONE)) fs.writeFileSync(ZONE, "{}");
const TYPES = { 1: "A", 28: "AAAA", 5: "CNAME", 16: "TXT" };
const log = [];
function readName(buf, off) { const labels = []; for (;;) { const len = buf[off]; if (len === 0) return [labels.join("."), off + 1]; labels.push(buf.subarray(off + 1, off + 1 + len).toString("ascii")); off += 1 + len; } }
const encName = (n) => Buffer.concat([...n.replace(/\.$/, "").split(".").map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l, "ascii")])), Buffer.from([0])]);
function rdata(type, v) {
  if (type === "A") return Buffer.from(v.split(".").map(Number));
  if (type === "AAAA") { const b = Buffer.alloc(16); v.split(":").forEach((h, i) => b.writeUInt16BE(parseInt(h || "0", 16), i * 2)); return b; }
  if (type === "CNAME") return encName(v);
  if (type === "TXT") { const s = Buffer.from(v, "utf8"); return Buffer.concat([Buffer.from([s.length]), s]); }
}
const sock = dgram.createSocket("udp4");
sock.on("message", (msg, rinfo) => {
  const id = msg.readUInt16BE(0);
  const [name, end] = readName(msg, 12);
  const qtype = msg.readUInt16BE(end);
  const question = msg.subarray(12, end + 4);
  const zone = JSON.parse(fs.readFileSync(ZONE, "utf8"));
  const rec = zone[name.toLowerCase()];
  const type = TYPES[qtype];
  const values = (rec && type && rec[type]) || [];
  const answers = values.map((v) => { const rd = rdata(type, v); const h = Buffer.alloc(12); h.writeUInt16BE(0xc00c, 0); h.writeUInt16BE(qtype, 2); h.writeUInt16BE(1, 4); h.writeUInt32BE(30, 6); h.writeUInt16BE(rd.length, 10); return Buffer.concat([h, rd]); });
  const head = Buffer.alloc(12);
  head.writeUInt16BE(id, 0); head.writeUInt16BE(0x8180 | (rec ? 0 : 3), 2); head.writeUInt16BE(1, 4); head.writeUInt16BE(answers.length, 6);
  sock.send(Buffer.concat([head, question, ...answers]), rinfo.port, rinfo.address);
  log.push(`${new Date().toISOString()} ${type ?? qtype} ${name} → ${values.length ? values.join(", ") : rec ? "aucun" : "NXDOMAIN"}`);
  fs.writeFileSync(new URL("./dns-journal.txt", import.meta.url).pathname, log.slice(-500).join("\n") + "\n");
});
sock.bind(5354, "127.0.0.1", () => console.log("DNS local 127.0.0.1:5354"));
