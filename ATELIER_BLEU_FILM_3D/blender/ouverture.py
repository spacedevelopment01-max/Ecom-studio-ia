"""
Ouverture du film, version Blender (Cycles) : un rouleau géant gorgé de peinture bleue déroule une surface dans le
vide ; au loin, cette même surface se relève et devient la façade du bâtiment ATELIER BLEU, suspendu dans le bleu.

  python ouverture.py -- --sortie rendu/ouverture_####.png [--images 1-90] [--res 540x960] [--echantillons 32]
  (avec Blender installé : blender -b -P ouverture.py -- …)

Tout est construit par ce script (aucun fichier .blend, aucune ressource extérieure hormis la police Montserrat, OFL).
"""
import bpy, bmesh, math, sys, os, argparse
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--sortie", default=os.path.join(ICI, "rendu", "ouverture_####.png"))
ap.add_argument("--images", default="1-90")
ap.add_argument("--res", default="540x960")
ap.add_argument("--echantillons", type=int, default=32)
ap.add_argument("--fibres", type=int, default=90000)
ap.add_argument("--blend", default="")
a = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = a.echantillons
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.glossy_bounces = 3; sc.cycles.transmission_bounces = 2; sc.cycles.diffuse_bounces = 2
sc.cycles.use_adaptive_sampling = True
w, h = map(int, a.res.split("x")); sc.render.resolution_x, sc.render.resolution_y = w, h
sc.render.fps = 30
f0, f1 = map(int, a.images.split("-")) if "-" in a.images else (int(a.images), int(a.images))
sc.frame_start, sc.frame_end = f0, f1
sc.render.filepath = a.sortie
sc.render.image_settings.file_format = "PNG"
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"

# ------------------------------------------------------------------ matériaux
def principled(nom, base, rough=0.5, metal=0.0, coat=0.0, coat_rough=0.05, emis=None, force=0.0, sheen=0.0):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    if sheen: b.inputs["Sheen Weight"].default_value = sheen; b.inputs["Sheen Tint"].default_value = (0.55, 0.72, 1.0, 1); b.inputs["Sheen Roughness"].default_value = 0.35
    if emis: b.inputs["Emission Color"].default_value = (*emis, 1); b.inputs["Emission Strength"].default_value = force
    return m, b

def relief(m, b, echelle, force, etirer=(1, 1, 1)):
    """Relief procédural (bruit sur la position du monde : aucune déformation quand l'objet grandit)."""
    nt = m.node_tree; geo = nt.nodes.new("ShaderNodeNewGeometry"); vm = nt.nodes.new("ShaderNodeVectorMath"); vm.operation = "MULTIPLY"
    vm.inputs[1].default_value = etirer
    bruit = nt.nodes.new("ShaderNodeTexNoise"); bruit.inputs["Scale"].default_value = echelle; bruit.inputs["Detail"].default_value = 6
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = force; bump.inputs["Distance"].default_value = 0.02
    nt.links.new(geo.outputs["Position"], vm.inputs[0]); nt.links.new(vm.outputs[0], bruit.inputs["Vector"])
    nt.links.new(bruit.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Coat Normal"])

BLEU = (0.012, 0.075, 1.0)
peinture, pb = principled("peinture fraîche", BLEU, 0.3, coat=1.0, coat_rough=0.03); relief(peinture, pb, 14, 0.12, (1, 0.25, 1))
manchonM, mb = principled("manchon imbibé", (0.008, 0.055, 0.75), 0.55, coat=0.6, coat_rough=0.18, sheen=0.9); relief(manchonM, mb, 260, 0.6, (0.15, 1, 1))
fibreM, _ = principled("fibres", (0.01, 0.07, 0.85), 0.45, coat=0.3, sheen=0.6)
chrome, _ = principled("chrome", (0.92, 0.93, 0.96), 0.06, 1.0)
argent, _ = principled("argent", (0.75, 0.78, 0.84), 0.28, 1.0)
blancLaque, _ = principled("blanc laqué", (0.9, 0.92, 0.95), 0.25, coat=0.8)
nuit, _ = principled("bleu nuit", (0.004, 0.009, 0.035), 0.25, metal=0.2, coat=0.8)
lueur, _ = principled("lueur", (0, 0, 0), 1, emis=(0.35, 0.55, 1.0), force=12)
lueurBlanche, _ = principled("lueur blanche", (0, 0, 0), 1, emis=(1, 1, 1), force=6)
lettres, _ = principled("lettres", (1, 1, 1), 0.3, emis=(1, 0.98, 0.96), force=3.2)

def mur_modules():
    """Façades blanches : panneaux de 3,1 m, ailettes fines, bandeau vitré bleu nuit légèrement lumineux par étage."""
    m, b = principled("mur à modules", (0.86, 0.88, 0.92), 0.35, coat=0.5)
    nt = m.node_tree; N = nt.nodes.new; L = nt.links.new
    geo = N("ShaderNodeNewGeometry"); sep = N("ShaderNodeSeparateXYZ"); L(geo.outputs["Position"], sep.inputs[0])
    def op(o, x, y=None):
        n = N("ShaderNodeMath"); n.operation = o
        L(x, n.inputs[0]) if not isinstance(x, (int, float)) else n.inputs.__getitem__(0).__setattr__("default_value", x)
        if y is not None:
            L(y, n.inputs[1]) if not isinstance(y, (int, float)) else n.inputs.__getitem__(1).__setattr__("default_value", y)
        return n.outputs[0]
    z = op("FRACT", op("DIVIDE", sep.outputs["Z"], 3.1))
    bande = op("MULTIPLY", op("GREATER_THAN", z, 0.58), op("LESS_THAN", z, 0.74))
    xy = op("ADD", sep.outputs["X"], sep.outputs["Y"])
    ailette = op("LESS_THAN", op("FRACT", op("DIVIDE", xy, 0.775)), 0.035)
    # nœud Mélanger en mode couleur : entrées 6 (A) et 7 (B), sortie 2
    mel = N("ShaderNodeMix"); mel.data_type = "RGBA"; L(bande, mel.inputs[0])
    mel.inputs[6].default_value = (0.86, 0.88, 0.92, 1); mel.inputs[7].default_value = (0.01, 0.025, 0.09, 1)
    mel2 = N("ShaderNodeMix"); mel2.data_type = "RGBA"; L(ailette, mel2.inputs[0]); L(mel.outputs[2], mel2.inputs[6]); mel2.inputs[7].default_value = (0.55, 0.6, 0.7, 1)
    L(mel2.outputs[2], b.inputs["Base Color"])
    em = op("MULTIPLY", bande, 1.4); L(em, b.inputs["Emission Strength"]); b.inputs["Emission Color"].default_value = (0.25, 0.42, 1.0, 1)
    rg = op("ADD", op("MULTIPLY", bande, -0.25), 0.35); L(rg, b.inputs["Roughness"])
    return m
murs = mur_modules()

# ------------------------------------------------------------------ outils de géométrie
def boite(nom, centre, taille, mat, biseau=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre); o = bpy.context.object; o.name = nom; o.scale = taille
    bpy.ops.object.transform_apply(scale=True)
    if biseau:
        md = o.modifiers.new("biseau", "BEVEL"); md.width = biseau; md.segments = 3
    o.data.materials.append(mat); return o

def rect_arrondi(nom, x, y, w, h, r, prof, mat, n=10):
    """Rectangle arrondi extrudé (plan XZ, face vers −Y)."""
    cu = bpy.data.curves.new(nom, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "BOTH"; cu.extrude = prof / 2
    cu.bevel_depth = min(0.02, prof * 0.2); sp = cu.splines.new("POLY"); pts = []
    for cx, cy, a0 in [(x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180), (x + w - r, y + r, 270)]:
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n); pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    sp.points.add(len(pts) - 1)
    for p, (px, py) in zip(sp.points, pts): p.co = (px, py, 0, 1)
    sp.use_cyclic_u = True
    o = bpy.data.objects.new(nom, cu); bpy.context.collection.objects.link(o); o.data.materials.append(mat)
    o.rotation_euler = (math.radians(90), 0, 0); return o

def tube(nom, pts, rayon, mat):
    cu = bpy.data.curves.new(nom, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = rayon; cu.bevel_resolution = 6
    sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    sp.order_u = 3; sp.use_endpoint_u = True
    o = bpy.data.objects.new(nom, cu); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o

# ------------------------------------------------------------------ la surface : ruban posé → courbe → façade
FW, YB, RB, FH = 12.4, 46.0, 2.6, 21.7   # largeur, pied de façade, rayon du pli, hauteur de façade
rangees = 7; PAS = FH / rangees
# ruban posé (longueur animée : il naît sous le rouleau)
me = bpy.data.meshes.new("ruban"); bm = bmesh.new()
nx, ny = 24, 80
for j in range(ny + 1):
    for i in range(nx + 1):
        bm.verts.new((-FW / 2 + FW * i / nx, -j / ny, 0))
bm.verts.ensure_lookup_table()
for j in range(ny):
    for i in range(nx):
        k = j * (nx + 1) + i; bm.faces.new([bm.verts[k], bm.verts[k + 1], bm.verts[k + nx + 2], bm.verts[k + nx + 1]])
bm.to_mesh(me); bm.free()
ruban = bpy.data.objects.new("ruban", me); bpy.context.collection.objects.link(ruban); me.materials.append(peinture)
ruban.location = (0, YB - RB, 0)
sol = ruban.modifiers.new("épaisseur", "SOLIDIFY"); sol.thickness = 0.12
# pli (quart de cylindre) et façade
me2 = bpy.data.meshes.new("pli"); bm = bmesh.new(); seg = 24
for j in range(seg + 1):
    t = math.pi / 2 * j / seg
    for i in range(nx + 1):
        bm.verts.new((-FW / 2 + FW * i / nx, YB - RB + RB * math.sin(t), RB - RB * math.cos(t)))
bm.verts.ensure_lookup_table()
for j in range(seg):
    for i in range(nx):
        k = j * (nx + 1) + i; bm.faces.new([bm.verts[k], bm.verts[k + 1], bm.verts[k + nx + 2], bm.verts[k + nx + 1]])
bm.to_mesh(me2); bm.free()
pli = bpy.data.objects.new("pli", me2); bpy.context.collection.objects.link(pli); me2.materials.append(peinture)
pli.modifiers.new("épaisseur", "SOLIDIFY").thickness = 0.12
for r in range(rangees):
    for c in range(4):
        boite(f"panneau {r}-{c}", (-FW / 2 + PAS * 0.5 * (FW / (4 * PAS / 2)) * 0 + (c + 0.5) * FW / 4, YB - 0.04, RB + (r + 0.5) * PAS), (FW / 4 - 0.07, 0.14, PAS - 0.07), peinture, 0.02)
for c in range(1, 4):
    boite(f"meneau {c}", (-FW / 2 + c * FW / 4, YB - 0.1, RB + FH / 2), (0.08, 0.1, FH), argent)
for r in range(1, rangees):
    boite(f"traverse {r}", (0, YB - 0.1, RB + r * PAS), (FW, 0.1, 0.08), argent)

# ------------------------------------------------------------------ le bâtiment
BW, PROF, ZB, ZH = FW + 4.4, 30, -7, RB + FH + 9
for sx in (-1, 1):
    boite(f"montant {sx}", (sx * (FW / 2 + 1.1), YB + 0.5, (ZB + ZH) / 2), (2.2, 1.0, ZH - ZB), murs)
    boite(f"mur latéral {sx}", (sx * (BW / 2 - 0.5), YB + PROF / 2, (ZB + ZH) / 2), (1.0, PROF, ZH - ZB), murs)
    boite(f"arête {sx}", (sx * BW / 2, YB - 0.05, (ZB + ZH) / 2), (0.45, 0.6, ZH - ZB), argent)
    for f in range(1, 12):
        boite(f"ligne {sx}-{f}", (sx * (BW / 2 + 0.01), YB + PROF / 2, ZB + f * 3.1), (0.06, PROF - 1, 0.1), lueur)
boite("bandeau", (0, YB + 0.5, (RB + FH + ZH) / 2), (BW, 1.0, ZH - RB - FH), murs)
boite("toit", (0, YB + PROF / 2, ZH + 0.25), (BW + 0.8, PROF + 1.0, 0.5), argent)
boite("socle", (0, YB + PROF / 2, (ZB + RB) / 2), (BW, PROF, RB - ZB), murs)
boite("fond", (0, YB + PROF, (ZB + ZH) / 2), (BW, 1.0, ZH - ZB), murs)
boite("cadre façade", (0, YB - 0.12, RB + FH + 0.15), (FW + 0.5, 0.35, 0.3), argent)
for k, (w_, d_) in enumerate([(BW - 3, PROF - 5), (BW - 7, PROF - 12), (BW - 10.5, PROF - 19)]):
    boite(f"dessous {k}", (0, YB + PROF / 2, ZB - 1.5 - 3 * k), (w_, d_, 3), nuit)
boite("dessous lumière", (0, YB + PROF / 2, ZB - 9.05), (BW - 11, PROF - 20, 0.12), lueurBlanche)
# volumes suspendus (ils formeront plus tard le « E »)
for nom, c, t in [("identité", (-16.5, YB + 9, 25), (11, 11, 8)), ("site", (15, YB + 16, 6), (7, 7, 34)), ("communication", (4, YB + 21, 35), (26, 7, 5.5))]:
    v = boite(f"volume {nom}", c, t, murs)
    for e in [(0, -t[1] / 2, t[2] / 2), (0, -t[1] / 2, -t[2] / 2)]:
        boite(f"liseré {nom}", (c[0] + e[0], c[1] + e[1] - 0.02, c[2] + e[2]), (t[0], 0.08, 0.08), lueur)
# enseigne
police = bpy.data.fonts.load(os.path.join(ICI, "..", "polices", "Montserrat-800.ttf"))
cu = bpy.data.curves.new("enseigne", "FONT"); cu.body = "ATELIER BLEU"; cu.font = police; cu.size = 1.55; cu.space_character = 1.06
cu.extrude = 0.18; cu.bevel_depth = 0.025; cu.align_x = "CENTER"
txt = bpy.data.objects.new("enseigne", cu); bpy.context.collection.objects.link(txt); cu.materials.append(lettres)
txt.location = (0, YB - 0.45, RB + FH + 1.62); txt.rotation_euler = (math.radians(90), 0, 0)
boite("panneau d'enseigne", (0, YB - 0.08, RB + FH + 2.15), (15.2, 0.2, 2.6), nuit, 0.05)
boite("rail enseigne", (0, YB - 0.18, RB + FH + 1.35), (14.0, 0.25, 0.12), argent)
# logo ATELIER BLEU (tracé exact de ui/img/logo-atelier-bleu.svg : coordonnées 0..64, y vers le bas)
T = 4.6; k = T / 64; LX, LZ = 0, RB + FH + 6.2
conv = lambda x, y: (LX + (x - 32) * k, LZ + (32 - y) * k)
def rect_svg(nom, x, y, w_, h_, r, prof, mat, dy):
    X, Z = conv(x, y + h_); o = rect_arrondi(nom, X, Z, w_ * k, h_ * k, r * k, prof, mat); o.location.y = YB - 0.3 - dy; return o
rect_svg("logo pastille", 0, 0, 64, 64, 14, 0.5, principled("laque bleue", BLEU, 0.18, coat=1.0)[0], 0)
blancLogo = principled("blanc logo", (0.92, 0.94, 0.97), 0.3, coat=0.8)[0]
rect_svg("logo manchon", 12, 14, 31, 13, 6.5, 0.2, blancLogo, 0.33)
rect_svg("logo manche", 29.4, 37.5, 5.2, 14, 2.6, 0.2, blancLogo, 0.33)
mont = [conv(x, y) for x, y in [(43, 20.5), (48.5, 20.5), (51, 23), (51, 30.5), (48.5, 33), (34, 33), (32, 35), (32, 38)]]
tube("logo monture", [(x, YB - 0.62, z) for x, z in mont], 1.6 * k, chrome)

# ------------------------------------------------------------------ le rouleau géant
R = 1.35
rouleau = bpy.data.objects.new("rouleau", None); bpy.context.collection.objects.link(rouleau)
tourne = bpy.data.objects.new("rotation du manchon", None); bpy.context.collection.objects.link(tourne); tourne.parent = rouleau
bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=FW + 0.15, vertices=128, rotation=(0, math.radians(90), 0)); man = bpy.context.object
bpy.ops.object.shade_smooth(); man.data.materials.append(manchonM); man.parent = tourne
if a.fibres:
    ps = man.modifiers.new("fibres", "PARTICLE_SYSTEM").particle_system.settings
    ps.type = "HAIR"; ps.count = a.fibres; ps.hair_length = 0.07; ps.use_advanced_hair = True; ps.normal_factor = 1.0
    ps.factor_random = 0.6; ps.root_radius = 0.6; ps.tip_radius = 0.0; ps.radius_scale = 0.012; ps.material_slot = "manchon imbibé"
    man.data.materials.append(fibreM); ps.material = 2
for sx in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(radius=R * 1.01, depth=0.1, vertices=96, location=(sx * (FW / 2 + 0.12), 0, 0), rotation=(0, math.radians(90), 0))
    o = bpy.context.object; bpy.ops.object.shade_smooth(); o.data.materials.append(chrome); o.parent = tourne
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.3, vertices=48, location=(sx * (FW / 2 + 0.28), 0, 0), rotation=(0, math.radians(90), 0))
    o = bpy.context.object; bpy.ops.object.shade_smooth(); o.data.materials.append(argent); o.parent = rouleau
mo = tube("monture", [(FW / 2 + 0.45, 0, 0), (FW / 2 + 1.0, 0, 0), (FW / 2 + 1.05, 1.1, 1.2), (FW / 2 - 0.3, 3.0, 3.1), (FW / 2 - 1.8, 4.3, 4.4)], 0.13, chrome); mo.parent = rouleau
bpy.ops.mesh.primitive_cylinder_add(radius=0.44, depth=3.8, vertices=48); man2 = bpy.context.object; bpy.ops.object.shade_smooth()
man2.data.materials.append(principled("manche", (0.72, 0.76, 0.84), 0.4, coat=0.8)[0]); man2.parent = rouleau
d = Vector((-2.0, 2.4, 2.4)).normalized(); man2.location = Vector((FW / 2 - 1.8, 4.3, 4.4)) + d * 2.0
man2.rotation_euler = d.to_track_quat("Z", "Y").to_euler()

# ------------------------------------------------------------------ poussière lumineuse (profondeur)
import random; random.seed(4)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.035, subdivisions=1); grain = bpy.context.object; grain.data.materials.append(lueur); grain.location = (0, 0, -500)
for i in range(160):
    o = grain.copy(); bpy.context.collection.objects.link(o)
    o.location = (random.uniform(-40, 40), random.uniform(-30, 110), random.uniform(-25, 45)); s = random.uniform(0.5, 2.2); o.scale = (s, s, s)

# ------------------------------------------------------------------ lumières et univers
def lampe(nom, loc, cible, energie, taille, couleur=(1, 1, 1)):
    bpy.ops.object.light_add(type="AREA", location=loc); l = bpy.context.object; l.name = nom
    l.data.energy = energie; l.data.size = taille; l.data.color = couleur
    l.rotation_euler = (Vector(cible) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return l
lampe("principale", (-14, -14, 16), (0, 4, 0), 9000, 14, (1, 0.97, 0.93))
lampe("contre-jour", (0, YB + 60, 30), (0, YB, 12), 90000, 30, (0.3, 0.5, 1.0))
lampe("façade", (-16, YB - 18, RB + FH + 22), (0, YB, RB + FH / 2), 30000, 14, (0.95, 0.97, 1.0))
lampe("flanc droit", (42, YB + 4, 22), (0, YB + 12, 10), 70000, 24, (0.8, 0.88, 1.0))
lampe("reflet manchon", (16, -6, 2.5), (0, -3, 1.2), 2600, 6, (0.75, 0.85, 1.0))
monde = bpy.data.worlds.new("univers bleu"); sc.world = monde; monde.use_nodes = True; nt = monde.node_tree
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Generated"], sep.inputs[0])
mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = -1.0; mr.inputs["From Max"].default_value = 1.0
nt.links.new(sep.outputs["Z"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
cr = ramp.color_ramp; cr.elements[0].position = 0.30; cr.elements[0].color = (0.001, 0.003, 0.016, 1)
e = cr.elements.new(0.49); e.color = (0.008, 0.04, 0.33, 1); e2 = cr.elements.new(0.53); e2.color = (0.006, 0.03, 0.22, 1)
cr.elements[-1].position = 0.80; cr.elements[-1].color = (0.0015, 0.004, 0.03, 1)
nt.links.new(ramp.outputs["Color"], nt.nodes["Background"].inputs["Color"]); nt.nodes["Background"].inputs["Strength"].default_value = 1.0

# ------------------------------------------------------------------ animation (3 s) : le rouleau avance, la caméra recule
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.sensor_width = 36
cible = bpy.data.objects.new("visée", None); bpy.context.collection.objects.link(cible)
tc_ = cam.constraints.new("TRACK_TO"); tc_.target = cible; tc_.track_axis = "TRACK_NEGATIVE_Z"; tc_.up_axis = "UP_Y"
cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 5.6
def cle(f, yr, campos, vise, focale, focus):
    sc.frame_set(f)
    rouleau.location = (0, yr, R + 0.12); rouleau.keyframe_insert("location")
    tourne.rotation_euler = (-yr / R, 0, 0); tourne.keyframe_insert("rotation_euler")
    ruban.scale = (1, (YB - RB) - yr, 1); ruban.keyframe_insert("scale")
    cam.location = campos; cam.keyframe_insert("location"); cible.location = vise; cible.keyframe_insert("location")
    cam.data.lens = focale; cam.data.keyframe_insert("lens"); cam.data.dof.focus_distance = focus; cam.data.dof.keyframe_insert("focus_distance")
cle(1, 0.0, (9.4, -7.2, 0.9), (4.2, 0.0, 1.5), 30, 8.5)
cle(45, -3.8, (11.0, -14.5, 2.8), (2.0, 8.0, 4.0), 28, 14)
cle(90, -7.0, (13.0, -22.5, 5.0), (0.0, 26, 13.5), 24, 22)
for o in [rouleau, tourne, ruban, cam, cible]:
    if o.animation_data and o.animation_data.action:
        for fc in getattr(o.animation_data.action, "fcurves", []):
            for kp in fc.keyframe_points: kp.interpolation = "BEZIER"; kp.easing = "AUTO"

if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=a.blend)
os.makedirs(os.path.dirname(a.sortie), exist_ok=True)
import time; t0 = time.time()
bpy.ops.render.render(animation=True)
print(f"RENDU_OK {f1 - f0 + 1} image(s) en {time.time() - t0:.1f} s")
