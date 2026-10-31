// Recette #232 lot A : active (on) ou retire (off) le SMTP LOCAL de test dans les réglages du studio isolé.
const W = process.cwd();
const { setSetting } = await import(W + "/src/lib/settings.ts");
const on = process.argv[2] === "on";
setSetting("smtp.host", on ? "127.0.0.1" : null);
setSetting("smtp.port", on ? "2525" : null);
setSetting("smtp.from", on ? "E-COM STUDIO IA <notifications@studio.recette.test>" : null);
console.log(`SMTP local ${on ? "activé" : "retiré"}`);
