import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { exportAccountData } from "@/lib/privacy";
import { rateTake } from "@/lib/rate-limit";
import { HttpError } from "@/lib/auth";
export const GET=handle(async()=>{
  const u=await requireUser();
  if(!rateTake([{key:`account-export:${u.id}`,max:5,windowMs:3600000}]))throw new HttpError(429,"Trop de demandes / Too many requests");
  return ok(exportAccountData(u.id),{headers:{"Content-Disposition":"attachment; filename=studio-account-data.json","X-Content-Type-Options":"nosniff"}});
});
