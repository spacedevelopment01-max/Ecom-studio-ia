import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { verifyPasskeyRegistration } from "@/lib/stepup";

const Body = z.object({ response: z.any(), nickname: z.string().trim().max(60).default("Mon appareil") });

export const POST = route(async (req) => {
  const { user, session } = await requireElevated();
  const { response, nickname } = await readJson(req, Body);
  await verifyPasskeyRegistration(user, session, response, nickname);
  return json({ ok: true });
});
