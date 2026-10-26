"""
Le texte de la voix off, phrase par phrase, et les mots dont le montage a besoin de connaître l'instant
(un champ du formulaire se remplit quand la voix dit « prestations », un gros plan arrive sur « réalisations »…).

L'instant d'un mot est estimé ainsi : les pauses que la voix marque aux virgules sont détectées dans le son,
puis la position du mot est interpolée entre ces pauses selon le nombre de lettres. Précision : ± 0,15 s environ,
largement suffisante pour un changement d'écran (vérifiée à l'oreille sur la transcription, voir LISEZMOI).
"""
import re
import numpy as np

PHRASES = [
    {"id": "p01", "texte": "Votre métier, vous le connaissez.", "mots": ["métier"]},
    {"id": "p02", "texte": "Mais votre site, vos visuels et votre communication vous prennent du temps.", "mots": ["site", "visuels", "communication", "temps"]},
    {"id": "p03", "texte": "E-COM STUDIO IA rassemble leur création dans un seul espace.", "mots": ["rassemble", "seul"]},
    {"id": "p04", "texte": "Vous décrivez votre activité, vos prestations, votre zone d'intervention et le style que vous aimez.", "mots": ["activité", "prestations", "zone", "style"]},
    {"id": "p05", "texte": "Le studio vous aide à créer votre logo, vos couleurs et votre identité.", "mots": ["logo", "couleurs", "identité"]},
    {"id": "p06", "texte": "Vous construisez ensuite un site qui explique vos services, présente vos réalisations et indique comment vous contacter.", "mots": ["site", "services", "réalisations", "contacter"]},
    {"id": "p07", "texte": "À partir de cette même identité, préparez vos visuels, vos publications et vos publicités.", "mots": ["identité", "visuels", "publications", "publicités"]},
    {"id": "p08", "texte": "Vous gardez la main sur les contenus et les ajustez à votre entreprise.", "mots": ["main", "ajustez"]},
    {"id": "p09", "texte": "Moins d'outils à gérer.", "mots": []},
    {"id": "p10", "texte": "Une image plus cohérente.", "mots": []},
    {"id": "p11", "texte": "Plus de temps pour votre métier.", "mots": []},
    {"id": "p12", "texte": "E-COM STUDIO IA.", "mots": []},
    {"id": "p13", "texte": "Votre activité, mise en lumière.", "mots": ["lumière"]},
]

# Ce que la voix lit réellement (la graphie écrite reste celle du texte) : le nom du studio se dit « i-com studio i-a ».
# Graphies choisies par transcription (Whisper) : « I.A. » était entendu « y a », « iya » est entendu « IA ».
# La virgule après le nom évite que « iya rassemble » soit lu « Yara semble ».
DIT = [
    (re.compile(r"E-COM STUDIO IA (?=\w)"), "Icom studio iya, "),
    (re.compile(r"E-COM STUDIO IA"), "Icom studio iya"),
]

# Phrases lues d'un seul souffle puis découpées aux pauses : lue seule, « Moins d'outils à gérer. » perd sa dernière
# syllabe (« à g… » à la transcription) ; enchaînée avec les deux suivantes, elle est lue en entier.
GROUPES = [["p09", "p10", "p11"]]


def prononcer(texte):
    for rx, dit in DIT:
        texte = rx.sub(dit, texte)
    return texte


def _silences(x, sr, min_ms=70, seuil_rel=0.06):
    """Plages de silence à l'intérieur de la phrase : (début, fin) en secondes."""
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    seuil = seuil_rel * np.percentile(env, 95)
    calme = env < seuil
    plages, debut = [], None
    for i, c in enumerate(calme):
        if c and debut is None:
            debut = i
        if (not c or i == len(calme) - 1) and debut is not None:
            if (i - debut) * 10 >= min_ms and debut > 10 and i < len(calme) - 10:
                plages.append((debut * 0.01, i * 0.01))
            debut = None
    return plages


def pauses_internes(x, sr, ph):
    """Instants (s) des mots-clés de la phrase, à partir des pauses détectées aux virgules."""
    texte = ph["texte"]
    virgules = [m.start() for m in re.finditer(",", texte)]
    plages = _silences(x, sr)
    plages = sorted(sorted(plages, key=lambda p: p[1] - p[0], reverse=True)[:len(virgules)])
    dur = len(x) / sr
    # points d'ancrage (position dans le texte → temps)
    ancres = [(0, 0.05), (len(texte), dur - 0.12)]
    if len(plages) == len(virgules):
        for v, (s0, s1) in zip(virgules, plages):
            ancres += [(v + 0.5, s0), (v + 1.5, s1)]
    ancres.sort()
    xs, ts = [a for a, _ in ancres], [t for _, t in ancres]
    out = {}
    for mot in ph["mots"]:
        i = texte.find(mot)
        if i >= 0:
            out[mot] = round(float(np.interp(i, xs, ts)), 3)
    out["_pauses_detectees"] = len(plages)
    out["_virgules"] = len(virgules)
    return out


def couper_aux_pauses(x, sr, n):
    """Coupe un enregistrement en n morceaux aux n-1 plus longues pauses ; renvoie les morceaux (silences retirés)."""
    plages = _silences(x, sr, min_ms=120)
    plages = sorted(sorted(plages, key=lambda p: p[1] - p[0], reverse=True)[:n - 1])
    if len(plages) != n - 1:
        raise ValueError(f"{len(plages) + 1} morceaux trouvés au lieu de {n}")
    bornes = [0] + [int(sr * (s0 + s1) / 2) for s0, s1 in plages] + [len(x)]
    return [x[bornes[i]:bornes[i + 1]] for i in range(n)]
