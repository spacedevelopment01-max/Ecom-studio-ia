import { z } from "zod";
import { createUser, startSession } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string(), name: z.string().optional() }));
  const u = await createUser(b.email, b.password, b.name ?? "");
  await startSession(u.id);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
