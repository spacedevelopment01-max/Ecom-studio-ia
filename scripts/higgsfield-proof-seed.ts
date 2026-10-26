/** Create a throwaway admin session; only a fixture token file in isolated /tmp, never stdout. */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, run, now } from "../src/lib/db";
import { createUser } from "../src/lib/auth";
import { randomToken, sha256 } from "../src/lib/secrets";
import { setSetting } from "../src/lib/settings";
if (!DATA_DIR.startsWith("/tmp/ecs-higgsfield-proof-"))
  throw Error("Isolated proof DATA_DIR required");
const user = await createUser(
  `higgsfield-proof-${Date.now()}@example.invalid`,
  "IsolatedFixturePassword192",
  "Vérification Higgsfield",
);
run("UPDATE users SET role='admin' WHERE id=?", user.id);
const token = randomToken();
run(
  "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",
  sha256(token),
  user.id,
  now() + 3600000,
  now(),
);
fs.writeFileSync(
  path.join(DATA_DIR, "session.json"),
  JSON.stringify({ token }),
  { mode: 0o600 },
);
for (const key of [
  "higgsfield.approved",
  "higgsfield.proposal",
  "higgsfield.history",
])
  setSetting(key, null);
setSetting("provider.higgsfield.keyId", "simulated-key-id", true);
setSetting("provider.higgsfield.keySecret", "simulated-key-secret", true);
setSetting("provider.higgsfield.disabled", "1");
console.log("Isolated administrator fixture ready; no provider request.");
