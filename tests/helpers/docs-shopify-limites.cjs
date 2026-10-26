/**
 * Préchargement de test (node --require) : raw.githubusercontent.com limite le débit, comme en CI (suivi #194).
 * latest.json annonce une nouvelle révision (le module retélécharge alors tous les documents) ; les données et les
 * manifestes arrivent (copie installée), mais chaque schéma de thème reçoit « 429: Too Many Requests », que le module
 * enregistre et utilise tel quel (« Parse error at offset 0 »).
 * Chaque tentative est signalée sur la sortie d'erreur.
 */
const https = require("node:https");
const { EventEmitter } = require("node:events");
const { Readable } = require("node:stream");
const fs = require("node:fs");
const path = require("node:path");
const installed = path.join(path.dirname(require.resolve("@shopify/theme-check-docs-updater/package.json", { paths: [process.cwd()] })), "data");

const original = https.request;
https.request = function (options, callback) {
  const url = typeof options === "string" ? options : options instanceof URL ? options.href : `${options.hostname || options.host || ""}${options.path || ""}`;
  const host = typeof options === "string" ? new URL(options).hostname : options instanceof URL ? options.hostname : options.hostname || options.host || "";
  if (!String(host).includes("raw.githubusercontent.com")) return original.apply(this, arguments);
  process.stderr.write("TELECHARGEMENT-DOCS-SHOPIFY\n");
  const req = new EventEmitter();
  req.setTimeout = () => req;
  req.abort = req.destroy = () => {};
  req.write = () => true;
  req.end = () => process.nextTick(() => {
    const limited = /\/schemas\/theme\//.test(url);
    const name = url.split("/").pop();
    const body = /latest\.json/.test(url) ? '{ "revision": "revision-simulee" }' : limited ? "429: Too Many Requests" : fs.readFileSync(path.join(installed, name), "utf8");
    const res = Readable.from([body]);
    Object.assign(res, { statusCode: limited ? 429 : 200, statusMessage: limited ? "Too Many Requests" : "OK", headers: {}, rawHeaders: [] });
    if (callback) callback(res);
    req.emit("response", res);
  });
  return req;
};
