"""Test ElevenLabs : synthèse avec minutage (endpoint /v1/text-to-speech/{voix}/with-timestamps).
La clé n'est jamais lue ni écrite ici : le proxy de l'environnement l'injecte dans l'en-tête xi-api-key."""
import base64, json, sys, urllib.request, urllib.error
voice, model, out, text = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
body = json.dumps({"text": text, "model_id": model, "language_code": "fr", "output_format": "mp3_44100_128",
                   "voice_settings": {"stability": 0.35, "similarity_boost": 0.8, "style": 0.6, "use_speaker_boost": True}}).encode()
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128", data=body,
                             headers={"Content-Type": "application/json", "xi-api-key": "injecte-par-le-proxy"})
try:
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.loads(r.read()); hdr = {k.lower(): v for k, v in r.headers.items()}
except urllib.error.HTTPError as e:
    print("ERREUR HTTP", e.code, e.read()[:400].decode(errors="replace")); sys.exit(1)
open(out + ".mp3", "wb").write(base64.b64decode(d["audio_base64"]))
al = d.get("normalized_alignment") or d.get("alignment")
json.dump({"alignment": d.get("alignment"), "normalized_alignment": d.get("normalized_alignment")}, open(out + "-timings.json", "w"), ensure_ascii=False)
print("ok", out, "| caractères facturés :", hdr.get("character-cost") or hdr.get("x-character-count") or "?", "| identifiant :", hdr.get("request-id", "?")[:8] + "…")
if al:
    ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    print("caractères minutés :", len(ch), "| fin :", round(en[-1], 2), "s")
