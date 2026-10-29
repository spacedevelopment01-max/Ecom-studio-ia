/**
 * Serveur SMTP LOCAL de test (#232) : accepte les messages sur 127.0.0.1 et les garde en mémoire (ou dans un dossier),
 * sans jamais rien relayer. Panne simulable : refus temporaire (451), refus définitif (550) ou serveur arrêté.
 * Aucun destinataire réel n'est jamais contacté.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export type SinkMessage = { from: string; to: string[]; raw: string; headers: Record<string, string>; at: number };
export type SinkMode = "ok" | "tempfail" | "permfail";

export class SmtpSink {
  messages: SinkMessage[] = [];
  mode: SinkMode = "ok";
  port = 0;
  private server: net.Server | null = null;
  constructor(private dir?: string) {}

  async start(port = 0) {
    this.server = net.createServer((sock) => this.session(sock));
    await new Promise<void>((resolve) => this.server!.listen(port, "127.0.0.1", resolve));
    this.port = (this.server.address() as net.AddressInfo).port;
    return this;
  }
  async stop() {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
    this.server = null;
  }

  private session(sock: net.Socket) {
    let buf = "", data = false, from = "", to: string[] = [];
    const say = (s: string) => sock.write(`${s}\r\n`);
    say("220 smtp-sink.local ESMTP test");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      for (;;) {
        if (data) {
          const end = buf.indexOf("\r\n.\r\n");
          if (end < 0) return;
          const raw = buf.slice(0, end).replace(/\r\n\.\./g, "\r\n.");
          buf = buf.slice(end + 5);
          data = false;
          this.store({ from, to, raw, headers: parseHeaders(raw), at: Date.now() });
          say("250 2.0.0 Ok: queued");
          from = ""; to = [];
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO") { sock.write("250-smtp-sink.local\r\n250-8BITMIME\r\n250 SMTPUTF8\r\n"); }
        else if (cmd === "HELO") say("250 smtp-sink.local");
        else if (cmd === "MAIL") {
          if (this.mode === "tempfail") { say("451 4.3.0 Temporary failure (test)"); continue; }
          if (this.mode === "permfail") { say("550 5.7.1 Rejected (test)"); continue; }
          from = line.match(/<([^>]*)>/)?.[1] ?? ""; say("250 2.1.0 Ok");
        }
        else if (cmd === "RCPT") { to.push(line.match(/<([^>]*)>/)?.[1] ?? ""); say("250 2.1.5 Ok"); }
        else if (cmd === "DATA") { data = true; say("354 End data with <CR><LF>.<CR><LF>"); }
        else if (cmd === "RSET") { from = ""; to = []; say("250 2.0.0 Ok"); }
        else if (cmd === "NOOP") say("250 2.0.0 Ok");
        else if (cmd === "QUIT") { say("221 2.0.0 Bye"); sock.end(); return; }
        else say("502 5.5.2 Command not recognized");
      }
    });
    sock.on("error", () => {});
  }

  private store(m: SinkMessage) {
    this.messages.push(m);
    if (this.dir) {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(path.join(this.dir, `${m.at}-${this.messages.length}.eml`), m.raw);
    }
  }
}

/** En-têtes d'un message (lignes repliées réunies), noms en minuscules. */
export function parseHeaders(raw: string): Record<string, string> {
  const head = raw.split(/\r\n\r\n/)[0].replace(/\r\n[ \t]+/g, " ");
  const out: Record<string, string> = {};
  for (const line of head.split("\r\n")) { const i = line.indexOf(":"); if (i > 0) out[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim(); }
  return out;
}

/** Corps d'une partie MIME (texte ou HTML), décodé (quoted-printable ou base64). */
export function mimePart(raw: string, type: "text/plain" | "text/html"): string {
  const multipart = /^Content-Type: multipart\//im.test(raw.split("\r\n\r\n")[0]);
  const idx = multipart ? raw.search(new RegExp(`Content-Type: ${type.replace("/", "\\/")}`, "i")) : (new RegExp(`^Content-Type: ${type.replace("/", "\\/")}`, "im").test(raw) ? 0 : -1);
  if (idx < 0) return "";
  const part = raw.slice(idx);
  const headerEnd = part.indexOf("\r\n\r\n");
  const headers = part.slice(0, headerEnd);
  let body = part.slice(headerEnd + 4);
  const boundary = body.search(/\r\n--[^\r\n]+/);
  if (boundary >= 0) body = body.slice(0, boundary);
  if (/quoted-printable/i.test(headers)) return Buffer.from(body.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8");
  if (/base64/i.test(headers)) return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  return body;
}

/** Décodage d'un en-tête encodé (=?UTF-8?Q?…?= ou =?UTF-8?B?…?=). */
export function decodeHeader(v: string): string {
  return v.replace(/=\?UTF-8\?([QB])\?([^?]*)\?=\s*/gi, (_m, enc: string, txt: string) =>
    enc.toUpperCase() === "B" ? Buffer.from(txt, "base64").toString("utf8") : Buffer.from(txt.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8"));
}
