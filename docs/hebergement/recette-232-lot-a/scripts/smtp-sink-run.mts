// Recette #232 lot A : serveur SMTP LOCAL (127.0.0.1:2525), aucun relais ; messages gardés dans mails/.
// Commande de panne : http://127.0.0.1:2526/mode/{ok|tempfail|permfail} ; état : http://127.0.0.1:2526/
import http from "node:http";
const W = process.cwd();
const { SmtpSink } = await import(W + "/tests/smtp-sink.ts");
const sink = new SmtpSink(new URL("./mails/", import.meta.url).pathname);
await sink.start(2525);
http.createServer((req, res) => {
  const m = req.url?.match(/^\/mode\/(ok|tempfail|permfail)$/);
  if (m) sink.mode = m[1];
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ mode: sink.mode, count: sink.messages.length, messages: sink.messages.map((x: { to: string[]; from: string; headers: Record<string, string>; at: number }) => ({ to: x.to, from: x.from, subject: x.headers.subject, replyTo: x.headers["reply-to"] ?? null, messageId: x.headers["message-id"], at: x.at })) }));
}).listen(2526, "127.0.0.1");
console.log("smtp-sink 127.0.0.1:2525, contrôle 127.0.0.1:2526");
