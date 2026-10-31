import json, urllib.request, os, sys
P = os.path.dirname(os.path.abspath(__file__))
TXT = "Vous êtes commerçant et votre présence en ligne n'existe pas ? Chaque soir, votre boutique ferme. Le rideau tombe, les lumières s'éteignent… Mais vos futurs clients, eux, restent connectés. Ils cherchent, comparent et achètent en ligne. Et vous ? Créer un site, mettre ses produits en ligne, préparer les publicités, gérer les réseaux… Il faudrait presque un deuxième métier. Et si une seule conversation suffisait pour commencer ? Vous décrivez votre boutique à Syna, avec vos mots. Votre identité prend forme : un logo, une palette, une vraie ligne de marque. Vos vêtements deviennent des fiches produits, vos pages se construisent : l'accueil, les collections, le panier, la version mobile. Tout prend forme au même endroit. Vos publications et vos publicités suivent la même identité, organisées dans votre calendrier. Et avec Syna, votre site et votre communication évoluent sur simple demande. Votre magasin a des horaires. Votre présence en ligne, non. Vos collections restent visibles, même rideau baissé. E-COM STUDIO IA : tout votre e-commerce, au même endroit."
INSTR = ("Narrateur français de France pour une publicité haut de gamme sur les réseaux sociaux. Voix chaleureuse, confiante, "
         "énergie publicitaire maîtrisée, un léger sourire dans la voix. Rythme soutenu et vivant, sans précipitation, articulation nette, "
         "pauses courtes aux virgules et un peu plus marquées aux points. Prononce « Syna » comme « si-na ». "
         "Prononce « E-COM STUDIO IA » comme « i-com studio i-a » et « e-commerce » comme « i-commerce ».")
out = f"{P}/vo/voix-longue.wav"
if os.path.exists(out): print("déjà"); sys.exit(0)
body = json.dumps({"model": "gpt-4o-mini-tts", "voice": "cedar", "input": TXT, "instructions": INSTR, "response_format": "wav"}).encode()
req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body, headers={"Authorization": "Bearer sk-proxy-injected", "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=300) as r: open(out, "wb").write(r.read())
    print("ok")
except Exception as e:
    print("ÉCHEC", e); sys.exit(1)
open(f"{P}/vo/texte-long.txt", "w").write(TXT)
