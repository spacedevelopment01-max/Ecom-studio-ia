"""Voix off de la Pub 03 (texte du brief, mot pour mot), une seule prise, voix cedar, ton énergique."""
import json, urllib.request, os, sys
P = os.path.dirname(os.path.abspath(__file__))
TXT = ("Tu as trouvé un produit à vendre. Parfait. Mais regarde : des centaines de boutiques proposent déjà exactement le même ! "
       "Même produit, mêmes photos, mêmes publicités. Et tu espères qu'un client te choisira, toi ? Il faut sortir du lot ! "
       "Avec E-COM STUDIO IA, arrête de jongler entre dix outils. Ouvre Syna, explique ton projet… et regarde ! "
       "Un logo, une identité, un univers visuel, puis une vraie boutique : accueil, fiches produits, arguments, panier, version mobile… Tout prend forme dans le même Studio ! "
       "Et ce n'est pas fini ! Visuels produits, publications, publicités, contenus SEO… Tout suit la même identité. Plus besoin de tout recommencer sur une autre plateforme ! "
       "Tu veux changer quelque chose ? Tu le demandes à Syna ! Ton site et tes contenus évoluent, et tu gardes la main sur ta marque ! "
       "Un produit ne suffit pas. Construis une marque qu'on reconnaît. E-COM STUDIO IA : tout ton e-commerce, au même endroit !")
INSTR = ("Voix off française de France pour une publicité TikTok très dynamique destinée aux jeunes entrepreneurs. Énergie commerciale forte, "
         "enthousiaste, entraînante et expressive, un sourire dans la voix. Débit rapide, environ 185 mots par minute, mais chaque mot reste parfaitement "
         "intelligible. Enchaîne les phrases sans longue pause : pauses très courtes aux virgules et aux points, aucune pause dramatique, aucune hésitation. "
         "Prononce « Syna » comme « si-na », « E-COM STUDIO IA » comme « i-com studio i-a », « e-commerce » comme « i-commerce », « SEO » lettre par lettre « S-E-O ».")
out = f"{P}/vo/voix.wav"
if os.path.exists(out): print("déjà"); sys.exit(0)
body = json.dumps({"model": "gpt-4o-mini-tts", "voice": "cedar", "input": TXT, "instructions": INSTR, "response_format": "wav"}).encode()
req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body, headers={"Authorization": "Bearer sk-proxy-injected", "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=300) as r: open(out, "wb").write(r.read())
    print("ok")
except Exception as e:
    print("ÉCHEC", e); sys.exit(1)
open(f"{P}/vo/texte.txt", "w").write(TXT)
