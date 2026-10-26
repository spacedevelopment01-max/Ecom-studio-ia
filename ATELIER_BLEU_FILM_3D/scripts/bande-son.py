"""
Bande-son du film ATELIER BLEU, entièrement synthétisée ici (aucun son de banque, aucun achat) :
  - musique électronique cinématographique : nappes, basse pulsée, arpèges, percussions, montées, résolution finale ;
  - bruitages calés sur l'image : rouleau mouillé, pliage des panneaux, impacts d'échelle, charnières, passages,
    clics d'interface, frappe au clavier, déploiements architecturaux, balayage lumineux ;
  - voix off posée aux instants du planning ; la musique se retire sous la voix (respirations).
Lit montage/timeline.json (voix) et montage/reperes.json (image). Écrit audio/musique.wav, audio/bruitages.wav,
audio/voix.wav et audio/mixage.wav (48 kHz stéréo, avant normalisation du volume).
  python3 scripts/bande-son.py
"""
import json, os
import numpy as np
import soundfile as sf
from scipy import signal

ICI = os.path.dirname(os.path.abspath(__file__)); PROJET = os.path.dirname(ICI)
SR = 48000
TL = json.load(open(os.path.join(PROJET, "montage/timeline.json")))
R = json.load(open(os.path.join(PROJET, "montage/reperes.json")))
DUREE = TL["duree"]
N = int(SR * (DUREE + 0.5))
P = lambda i: TL["phrases"][i]
MOT = lambda i, m: TL["phrases"][i]["mots"][m]
rng = np.random.default_rng(7)


def piste():
    return np.zeros((N, 2), np.float32)


def adoucir(x, a=0.004, r=0.012):
    """Micro-fondus d'entrée et de sortie : un son coupé net claque."""
    x = np.array(x, dtype=np.float32, copy=True); n = len(x)
    na, nr = min(n // 2, int(a * SR)), min(n // 2, int(r * SR))
    fe = np.ones(n, np.float32); fe[:na] = np.linspace(0, 1, na); fe[n - nr:] = np.linspace(1, 0, nr)
    return x * (fe[:, None] if x.ndim > 1 else fe)


def poser(dst, x, t, gain=1.0, pan=0.0):
    """Ajoute le son x (mono ou stéréo) à l'instant t (s)."""
    x = adoucir(x)
    if x.ndim == 1:
        g = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
        x = x[:, None] * g[None, :]
    i = int(t * SR)
    if i < 0:
        x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0:
        dst[i:i + n] += x[:n] * gain


def env(n, a, r, courbe=4.0):
    """Enveloppe attaque / décroissance exponentielle (en échantillons)."""
    e = np.ones(n, np.float32)
    na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r > 0:
        k = np.arange(n - na) / (r * SR)
        e[na:] = np.exp(-courbe * k)
    return e


def bruit(n):
    return rng.standard_normal(n).astype(np.float32)


def filtre(x, f, type_="low", ordre=2):
    f = np.clip(np.atleast_1d(f), 20, SR / 2 - 100)
    sos = signal.butter(ordre, f if len(f) > 1 else f[0], btype=type_, fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


def balayage_filtre(x, f0, f1, q=1.5, type_="band"):
    """Filtre passe-bande dont la fréquence glisse de f0 à f1 (par blocs, état conservé)."""
    out = np.zeros_like(x); bloc = 512; zi = None
    nb = int(np.ceil(len(x) / bloc))
    for b in range(nb):
        f = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        lo, hi = f / (1 + 1 / q), f * (1 + 1 / q)
        sos = signal.butter(2, [max(30, lo), min(SR / 2 - 200, hi)], btype="band", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg = x[b * bloc:(b + 1) * bloc]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[b * bloc:(b + 1) * bloc] = y
    return out


def reverb_ir(duree=2.4, clair=0.5):
    n = int(SR * duree)
    t = np.arange(n) / SR
    ir = np.stack([bruit(n), bruit(n)], 1) * np.exp(-t / (duree / 6.5))[:, None]
    for c in range(2):
        ir[:, c] = filtre(ir[:, c], 2500 + 6000 * clair, "low")
    ir[:int(0.012 * SR)] = 0
    return ir / np.abs(ir).sum(0) * 40


IR = reverb_ir()


def reverb(x, mix=0.3):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    w = np.stack([signal.fftconvolve(x[:, c], IR[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - mix) + w * mix


# ---------------------------------------------------------------- primitives de bruitage
def whoosh(d, f0=300, f1=3000, gain=1.0, pan0=-0.6, pan1=0.6):
    n = int(d * SR); x = balayage_filtre(bruit(n), f0, f1, q=1.2)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    x = x * e / (np.abs(x).max() + 1e-6) * gain
    pan = np.linspace(pan0, pan1, n)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * np.sqrt(2)


def impact(gain=1.0, grave=48, d=2.2):
    n = int(d * SR); t = np.arange(n) / SR
    f = grave + 90 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    cl = filtre(bruit(n), 2500, "low") * np.exp(-t * 28) * 0.6
    x = (sub + cl) * gain
    return reverb(x / np.abs(x).max() * gain, 0.35)


def clac(gain=0.6, f=1800, grave=90):
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = filtre(bruit(n), [f * 0.6, f * 1.6], "band") * np.exp(-t * 70) * 2 + np.sin(2 * np.pi * grave * t) * np.exp(-t * 30)
    return x / np.abs(x).max() * gain


def clic(gain=0.35, f=3200):
    n = int(0.06 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 160) + filtre(bruit(n), 5000, "high") * np.exp(-t * 300) * 0.4
    return x * gain


def touche(gain=0.3):
    n = int(0.08 * SR); t = np.arange(n) / SR
    x = filtre(bruit(n), [1200, 5000], "band") * np.exp(-t * 120) + np.sin(2 * np.pi * 220 * t) * np.exp(-t * 90) * 0.3
    return x / np.abs(x).max() * gain


def carillon(f=880, gain=0.3, d=2.0):
    n = int(d * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * f * t + m) * np.exp(-t * 2.2)
    return reverb(x * gain, 0.45)


def scintille(d=1.5, gain=0.25, f0=2000):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(18):
        fr = f0 * (1 + rng.random() * 2.5); ph = rng.random() * 6
        x += np.sin(2 * np.pi * fr * t + ph) * (0.5 + 0.5 * np.sin(2 * np.pi * (3 + rng.random() * 6) * t + ph))
    x *= np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return reverb(x / np.abs(x).max() * gain, 0.5)


def mecanique(d=1.0, gain=0.4, f0=140, f1=260):
    """Servo / vérin : ronronnement qui monte + grain métallique."""
    n = int(d * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.5 + filtre(bruit(n), [800, 4000], "band") * 0.25
    x = filtre(x, 1800, "low") * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
    return x / np.abs(x).max() * gain


def roulement(d, gain=0.5):
    """Rouleau mouillé sur une surface : grondement + grésillement collant + succion."""
    n = int(d * SR); t = np.arange(n) / SR
    gr = filtre(np.cumsum(bruit(n)) / 300, 180, "low") * (0.7 + 0.3 * np.sin(2 * np.pi * 3.2 * t))
    cr = np.zeros(n)
    for i in rng.integers(0, n - 2000, int(d * 180)):
        cr[i:i + 600] += filtre(bruit(600), [700, 3000], "band") * np.exp(-np.arange(600) / 90) * rng.random()
    suc = filtre(bruit(n), [250, 900], "band") * (0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * t)) * 0.6
    x = gr / (np.abs(gr).max() + 1e-6) + cr * 0.5 + suc
    x *= env(n, 0.05, 0) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
    return x / np.abs(x).max() * gain


def montee(d, gain=0.5):
    """Montée avant une transition (bruit filtré qui s'ouvre + ton qui monte)."""
    n = int(d * SR); t = np.arange(n) / SR
    x = balayage_filtre(bruit(n), 200, 7000, q=2) * (t / d) ** 2
    ton = np.sin(2 * np.pi * np.cumsum(np.linspace(110, 440, n)) / SR) * (t / d) ** 3 * 0.3
    x = x / (np.abs(x).max() + 1e-6) + ton
    return reverb(x * gain, 0.3)


# ---------------------------------------------------------------- bruitages
fx = piste()
# 1. ouverture
poser(fx, impact(0.9, 40, 2.5), 0.0)
poser(fx, roulement(2.6, 0.55), 0.0, pan=0.2)
for k in range(6):
    poser(fx, clac(0.5, 1400 + k * 80, 70), 2.15 + k * 0.17 + 0.74, pan=-0.3 + k * 0.12)
poser(fx, whoosh(1.6, 150, 1200, 0.8), 2.2)
poser(fx, whoosh(1.4, 80, 600, 0.6, 0.4, -0.4), 2.6)          # le rouleau tombe dans le vide
poser(fx, impact(1.0, 34, 3.0), 3.25)                         # le bâtiment surgit
for i, pan in enumerate([-0.8, 0.8, 0.0]):
    poser(fx, whoosh(1.2, 400, 120, 0.5, pan, -pan * 0.3), 3.35 + i * 0.18)
poser(fx, impact(0.6, 60, 1.6), R["enseigne"])
poser(fx, scintille(1.4, 0.3), R["enseigne"] + 0.25)
# morceaux dispersés, rassemblement, ouverture de la façade
for m, pan in [("site", -0.6), ("visuels", 0.6), ("communication", -0.4)]:
    poser(fx, clic(0.4, 2400), MOT("p02", m) - 0.1, pan=pan); poser(fx, whoosh(0.5, 900, 2500, 0.25, pan, pan), MOT("p02", m) - 0.15)
poser(fx, whoosh(1.4, 600, 200, 0.35), R["dispersion"])
poser(fx, whoosh(0.85, 200, 4000, 0.8, -0.8, 0.0), R["rassemble"])
poser(fx, impact(0.7, 55, 1.8), R["rassemble"] + 0.75)
poser(fx, scintille(1.0, 0.25, 1500), R["rassemble"] + 0.75)
for k in range(6):
    poser(fx, mecanique(0.8, 0.22, 120 + k * 10, 240 + k * 15), R["ouverture"] + k * 0.08, pan=(-1) ** k * 0.5)
    poser(fx, clac(0.35, 900, 60), R["ouverture"] + 0.95 + k * 0.06, pan=(-1) ** k * 0.6)
poser(fx, whoosh(1.4, 300, 1500, 0.5, 0, 0), R["entree"] - 0.2)
# formulaire : saisie de chaque champ
for m in ["activité", "prestations", "zone", "style"]:
    t0 = MOT("p04", m) - 0.1
    for i in range(7):
        poser(fx, touche(0.16), t0 + i * 0.08, pan=0.1)
    poser(fx, clic(0.25, 2600), t0 + 0.6)
# traversée du B, atelier d'identité
poser(fx, montee(1.6, 0.4), R["sortieFormulaire"] - 0.1)
poser(fx, whoosh(1.0, 200, 5000, 0.9, -0.5, 0.5), R["traverseeB"] - 0.6)
poser(fx, impact(0.9, 42, 2.4), R["traverseeB"])
for i in range(4):
    poser(fx, clac(0.45, 2200 - i * 200, 110), MOT("p05", "logo") + 0.25 + i * 0.05, pan=(-1) ** i * 0.4)
poser(fx, carillon(660, 0.32, 2.5), MOT("p05", "logo") + 0.3)
for j in range(5):
    poser(fx, whoosh(0.6, 250, 900, 0.3, -0.7 + j * 0.35, -0.7 + j * 0.35), MOT("p05", "couleurs") - 0.1 + j * 0.06)
poser(fx, mecanique(1.0, 0.3, 60, 110), R["typo"])
poser(fx, clac(0.5, 700, 55), R["typo"] + 0.7); poser(fx, clac(0.45, 800, 60), R["typo"] + 0.9)
poser(fx, whoosh(1.0, 500, 200, 0.35), R["resultat"])
# site : dépliage vertical, cadrages successifs, bouton
poser(fx, montee(1.3, 0.35), R["depli"] - 1.3)
poser(fx, impact(1.0, 36, 3.0), R["depli"])
poser(fx, mecanique(1.6, 0.5, 50, 95), R["depli"] + 0.1)
poser(fx, whoosh(1.5, 120, 600, 0.5, 0.6, -0.6), R["depli"] + 0.1)
for m in ["site", "services", "réalisations", "contacter"]:
    poser(fx, whoosh(0.6, 400, 1400, 0.22, 0.2, -0.2), MOT("p06", m) - 0.5)
poser(fx, clic(0.45, 2000), MOT("p06", "contacter") + 0.4)
# plongée dans la photo, pièce qui devient décor, murs qui pivotent
poser(fx, whoosh(1.2, 300, 6000, 0.8), R["plongee"] + 0.4)
poser(fx, scintille(0.9, 0.3, 2500), R["plongee"] + 1.0)
poser(fx, impact(0.5, 70, 1.4), R["plongee"] + 1.2)
poser(fx, whoosh(1.3, 200, 700, 0.5, -0.8, 0.8), MOT("p07", "identité") - 0.3)
for m, d in [("visuels", -0.3), ("publications", -0.1), ("publicités", -0.15)]:
    t0 = MOT("p07", m) + d
    poser(fx, mecanique(0.7, 0.28, 100, 180), t0); poser(fx, clac(0.5, 1000, 70), t0 + 0.55)
poser(fx, whoosh(0.9, 300, 1800, 0.4), R["ensemble"])
# contrôle : éditeur, frappe, validation, mise à jour
poser(fx, whoosh(0.8, 500, 1500, 0.35), R["editeur"])
for i in range(7):
    poser(fx, touche(0.26), R["frappe"] + i / 7)
poser(fx, clic(0.5, 1800), R["valider"]); poser(fx, carillon(1320, 0.18, 1.2), R["valider"] + 0.1)
poser(fx, scintille(0.8, 0.3, 3000), R["maj"])
# révélation : sortie, alignement du « E », carré, point, lumière
poser(fx, impact(0.9, 40, 2.6), R["sortie"]); poser(fx, whoosh(1.5, 4000, 150, 0.8, 0.5, -0.5), R["sortie"])
for i, nom in enumerate(["identite", "site", "communication"]):
    t0 = P("p09")["fin"] - 0.4 + i * 0.35
    poser(fx, mecanique(2.6, 0.32, 45 + i * 5, 90 + i * 8), t0, pan=-0.4 + i * 0.4)
    poser(fx, clac(0.6, 600, 50), P("p11")["fin"] - 0.35 + i * 0.05)
poser(fx, impact(1.1, 32, 3.5), R["alignement"] - 0.2)
poser(fx, clac(0.6, 900, 80), R["alignement"] + 1.05)
poser(fx, scintille(2.2, 0.32, 1800), MOT("p13", "lumière") - 0.4)
poser(fx, whoosh(1.4, 1500, 6000, 0.35), MOT("p13", "lumière") - 0.4)

# ---------------------------------------------------------------- musique
BPM = 96; NOIRE = 60 / BPM; MESURE = 4 * NOIRE
def note(nom):
    i = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[nom[0]]
    if len(nom) > 2 and nom[1] in "b#": i += -1 if nom[1] == "b" else 1
    return 440 * 2 ** ((i + 12 * (int(nom[-1]) + 1) - 69) / 12)
ACC = {"Dm": ["D3", "F3", "A3", "D4", "E4"], "Bb": ["Bb2", "F3", "Bb3", "D4", "C4"], "F": ["F2", "C3", "F3", "A3", "G4"],
       "C": ["C3", "G3", "C4", "E4", "D4"], "Gm": ["G2", "D3", "G3", "Bb3", "A3"], "D": ["D3", "A3", "D4", "F#4", "E4"]}
grille = ["Dm", "Bb", "F", "C"]
accords = []  # (début, fin, nom)
t = 0.0
fin_grille = R["alignement"] - 0.2
while t < fin_grille - 0.01:
    nom = grille[int(round(t / MESURE)) % 4]
    accords.append((t, min(t + MESURE, fin_grille), nom)); t += MESURE
accords.append((fin_grille, DUREE + 0.5, "D"))  # résolution : ré majeur

def supersaw(f, n, voix=5, desacc=0.12):
    t = np.arange(n) / SR; x = np.zeros(n)
    for v in range(voix):
        d = (v - (voix - 1) / 2) / ((voix - 1) / 2) * desacc
        x += signal.sawtooth(2 * np.pi * f * 2 ** (d / 12) * t + rng.random() * 6)
    return x / voix

nappe = np.zeros(N); basse = np.zeros(N); arpege = np.zeros(N)
for (a, b, nom) in accords:
    n = int((b - a + 1.2) * SR); i0 = int(a * SR)
    x = sum(supersaw(note(nn), n) for nn in ACC[nom]) / len(ACC[nom])
    final = nom == "D"
    x = filtre(x, 2400 if final else 1500, "low")
    e = env(n, 0.35, 0) * np.minimum(1, np.maximum(0, (b - a + 1.2 - np.arange(n) / SR) / 1.2))
    m = min(n, N - i0); nappe[i0:i0 + m] += adoucir(x * e, 0.01, 0.05)[:m] * (1.4 if final else 1.0)
    # basse pulsée en croches
    racine = note(ACC[nom][0]) / 2
    k = a
    while k < b - 0.01 and not final:
        nn = int(NOIRE / 2 * SR); tt = np.arange(nn) / SR
        y = filtre(signal.sawtooth(2 * np.pi * racine * tt) + 0.6 * np.sin(2 * np.pi * racine / 2 * tt), 420, "low") * np.exp(-tt * 9)
        y = adoucir(y); j = int(k * SR); mm = min(nn, N - j); basse[j:j + mm] += y[:mm]; k += NOIRE / 2
    # arpège en doubles croches
    k = a; idx = 0
    while k < b - 0.01 and not final:
        f = note(ACC[nom][[1, 2, 3, 4, 3, 2][idx % 6]]) * 2
        nn = int(0.22 * SR); tt = np.arange(nn) / SR
        y = (signal.sawtooth(2 * np.pi * f * tt, 0.5)) * np.exp(-tt * 14)
        y = adoucir(y); j = int(k * SR); mm = min(nn, N - j); arpege[j:j + mm] += y[:mm]; k += NOIRE / 4; idx += 1

# énergie de la musique au fil du film (0 = respiration, 1 = plein)
def courbe(points):
    ts, vs = zip(*points); tt = np.arange(N) / SR
    return np.interp(tt, ts, vs).astype(np.float32)
e_basse = courbe([(0, 0), (3.2, 0), (3.5, 0.8), (9.2, 0.8), (12.5, 0.5), (14, 0.25), (20.6, 0.25), (22.2, 1), (37, 1), (38.4, 0.6), (45.5, 0.8), (46.5, 0.4), (51.4, 0.5), (51.6, 1), (R["alignement"] - 0.3, 1), (R["alignement"] - 0.2, 0), (DUREE + 1, 0)])
e_arp = courbe([(0, 0), (12, 0), (13.5, 0.45), (20.6, 0.45), (22.2, 1), (37.5, 1), (38.6, 0.5), (44.5, 0.8), (46.5, 0.5), (51.4, 0.6), (R["alignement"] - 0.3, 0.9), (R["alignement"] - 0.2, 0), (DUREE + 1, 0)])
e_nappe = courbe([(0, 0.5), (3.4, 0.9), (13, 0.8), (22, 1), (37, 0.9), (51.4, 0.8), (R["alignement"] - 0.3, 1), (R["alignement"], 1.25), (DUREE - 2.5, 1.0), (DUREE + 0.3, 0)])
e_batt = courbe([(0, 0), (3.5, 0), (3.6, 0.5), (9.2, 0.5), (9.6, 0), (22.1, 0), (22.2, 1), (37, 1), (37.5, 0), (38.6, 0), (38.7, 0.8), (45.2, 0.8), (45.6, 0), (51.5, 0), (51.6, 1), (R["alignement"] - 0.3, 1), (R["alignement"] - 0.2, 0), (DUREE + 1, 0)])

# percussions
batt = np.zeros(N)
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t * 30)) / SR) * np.exp(-t * 7)
def hat():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return filtre(bruit(n), 7000, "high") * np.exp(-t * 60) * 0.25
def clap():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return filtre(bruit(n), [900, 3500], "band") * (np.exp(-t * 25) + 0.5 * np.exp(-((t - 0.012) % 0.011) * 400) * (t < 0.035)) * 0.6
K, Hh, Cl = adoucir(kick()), adoucir(hat()), adoucir(clap())
pompe = np.ones(N, np.float32)  # « pompage » de la basse et de la nappe sur la grosse caisse
b_ = 0.0
while b_ < DUREE:
    j = int(b_ * SR); g = e_batt[min(j, N - 1)]
    if g > 0.01:
        m = min(len(K), N - j); batt[j:j + m] += K[:m] * g
        dip = 1 - 0.55 * g * np.exp(-np.arange(int(NOIRE * SR)) / (0.09 * SR)); mm = min(len(dip), N - j); pompe[j:j + mm] = np.minimum(pompe[j:j + mm], dip[:mm])
        jh = int((b_ + NOIRE / 2) * SR); mh = min(len(Hh), N - jh)
        if mh > 0: batt[jh:jh + mh] += Hh[:mh] * g
        if int(round(b_ / NOIRE)) % 2 == 1 and g > 0.7:
            mc = min(len(Cl), N - j); batt[j:j + mc] += Cl[:mc] * g * 0.7
    b_ += NOIRE
# roulement de caisse claire qui accélère avant la résolution
t0, t1 = R["alignement"] - 2.6, R["alignement"] - 0.25
k = t0
while k < t1:
    j = int(k * SR); m = min(len(Cl), N - j); batt[j:j + m] += Cl[:m] * (0.3 + 0.7 * (k - t0) / (t1 - t0))
    k += 0.25 * (1 - 0.75 * (k - t0) / (t1 - t0))

# mélodie de résolution (cloches) sur le nom du studio
mel = np.zeros((N, 2))
for i, (nn, dt) in enumerate([("A4", 0), ("D5", 0.35), ("F#5", 0.7), ("A5", 1.05), ("D6", 1.6)]):
    poser(mel, carillon(note(nn), 0.22, 3.0), P("p12")["debut"] + dt - 0.1)

musique = np.stack([nappe, nappe], 1) * (e_nappe * pompe)[:, None] * 0.55
musique[:, 0] += basse * e_basse * pompe * 0.5; musique[:, 1] += basse * e_basse * pompe * 0.5
musique[:, 0] += filtre(arpege, 3500, "low") * e_arp * 0.16; musique[:, 1] += np.roll(filtre(arpege, 3500, "low"), int(0.18 * SR)) * e_arp * 0.13
musique += np.stack([batt, batt], 1) * 0.55
musique = reverb(musique.astype(np.float32), 0.18) + mel
# drone grave d'ouverture
tt = np.arange(N) / SR
drone = np.sin(2 * np.pi * 36.7 * tt) * courbe([(0, 0.6), (3.2, 0.6), (4.5, 0.2), (13, 0.2), (14, 0.4), (21, 0.4), (22.2, 0), (DUREE, 0)])
musique += np.stack([drone, drone], 1) * 0.35
# montées supplémentaires de la musique avant les grandes transitions
for tm, d in [(R["sortie"] - 1.6, 1.6), (R["alignement"] - 2.4, 2.2)]:
    poser(musique, montee(d, 0.35), tm)

# ---------------------------------------------------------------- voix
voix = piste()
for pid, ph in TL["phrases"].items():
    x, sr = sf.read(os.path.join(PROJET, ph["fichier"]), dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    x = signal.resample_poly(x, SR, sr).astype(np.float32)
    x = filtre(x, 80, "high")
    poser(voix, x, ph["debut"])
voix = reverb(voix[:, 0], 0.06) * 1.0
# légère compression de la voix
pk = np.abs(voix).max(); voix = np.tanh(voix / pk * 1.6) / np.tanh(1.6) * 0.9

# ---------------------------------------------------------------- respirations sous la voix
present = np.zeros(N)
for ph in TL["phrases"].values():
    present[int((ph["debut"] - 0.12) * SR):int((ph["fin"] + 0.15) * SR)] = 1
lisse = signal.lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], present)
retrait = (1 - 0.62 * lisse).astype(np.float32)          # musique : environ -8,5 dB sous la voix
retrait_fx = (1 - 0.35 * lisse).astype(np.float32)       # bruitages : environ -3,7 dB sous la voix

def norm(x, cible):
    return x / (np.abs(x).max() + 1e-9) * cible
musique = norm(musique, 0.5) * retrait[:, None]
fx = norm(fx, 0.55) * retrait_fx[:, None]
mixage = voix + musique + fx
# fin propre
fade = np.ones(N); nf = int(1.2 * SR); fade[-nf:] = np.linspace(1, 0, nf)
mixage *= fade[:, None]
mixage = np.tanh(mixage * 1.1) / np.tanh(1.1)
os.makedirs(os.path.join(PROJET, "audio"), exist_ok=True)
for nom, x in [("musique", musique), ("bruitages", fx), ("voix", voix), ("mixage", mixage)]:
    sf.write(os.path.join(PROJET, "audio", f"{nom}.wav"), (x[:int(DUREE * SR)]).astype(np.float32), SR)
print("bande-son :", round(DUREE, 2), "s")
