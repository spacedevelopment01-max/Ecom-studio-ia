"""Montage de la version longue (voix de 68 s) : correspondance entre le temps des scènes 3D (« ancien ») et le temps
du film (« nouveau »). Chaque repère cale un moment visuel sur la phrase qui le décrit."""
import json, os
P = os.path.dirname(os.path.abspath(__file__))
VOFF = 0.4  # la voix commence à 0,4 s
D = 71.0
ANCHORS = [  # (ancien, nouveau)
    (0.0, 0.0), (3.3, 4.4), (4.55, 6.6), (7.8, 9.25),          # descente, panneau, rideau (« s'éteignent… »)
    (9.6, 11.0), (10.35, 15.9), (11.4, 17.3),                   # la rue et les téléphones, « Et vous ? » : plongée
    (17.9, 23.75), (19.7, 26.9),                                 # la tour d'outils, le gel, la vague, le logo
    (22.55, 30.2), (23.1, 31.4), (23.3, 31.6),                  # SYNA, message envoyé, réponse, traversée de l'écran
    (26.2, 35.6), (29.4, 39.2), (31.2, 43.4), (35.25, 45.9),    # identité, fiches produits, pages, orbite
    (40.0, 51.3), (46.0, 56.9), (48.0, 59.2), (53.2, 64.4),     # communication, SYNA, nuit, téléphone
    (54.9, 64.9), (58.3, 68.6), (60.0, 71.0)]                   # final
def to_new(t):
    for (a0, b0), (a1, b1) in zip(ANCHORS, ANCHORS[1:]):
        if t <= a1: return b0 + (t - a0) * (b1 - b0) / (a1 - a0)
    return ANCHORS[-1][1]
if __name__ == "__main__":
    json.dump({"anchors": ANCHORS, "D": D, "voff": VOFF}, open(P + "/assets/timemap.json", "w"))
    print("ok", D)
