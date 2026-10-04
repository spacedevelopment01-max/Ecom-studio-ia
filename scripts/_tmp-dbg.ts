import fs from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
const c = createCanvas(400,400); const ctx = c.getContext("2d");
ctx.fillStyle="#222"; ctx.fillRect(0,0,400,400);
ctx.strokeStyle="#E0A458"; ctx.lineWidth=4; ctx.globalAlpha=0.5;
ctx.beginPath(); ctx.arc(200,200,100,-Math.PI/2,-Math.PI/2+Math.PI*2*1); ctx.stroke();
ctx.beginPath(); ctx.arc(200,200,150,-Math.PI/2,-Math.PI/2+Math.PI*2*0.6); ctx.stroke();
fs.writeFileSync(process.argv[2], await c.encode("png"));
