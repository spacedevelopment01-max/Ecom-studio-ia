"""Bruitages ElevenLabs (/v1/sound-generation). Clé injectée par le proxy. Usage : sfx.py <nom> <durée_s> "<description>" """
import sys, json, urllib.request, urllib.error
nom, dur, txt = sys.argv[1], float(sys.argv[2]), sys.argv[3]
body = json.dumps({"text": txt, "duration_seconds": dur, "prompt_influence": 0.6}).encode()
req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", data=body,
      headers={"Content-Type": "application/json", "xi-api-key": "injecte-par-le-proxy"})
try:
    with urllib.request.urlopen(req, timeout=180) as r:
        open(nom + ".mp3", "wb").write(r.read()); h = {k.lower(): v for k, v in r.headers.items()}
        print("ok", nom, "| crédits :", h.get("character-cost", "?"))
except urllib.error.HTTPError as e:
    print("ERREUR", nom, e.code, e.read()[:300].decode(errors="replace"))
