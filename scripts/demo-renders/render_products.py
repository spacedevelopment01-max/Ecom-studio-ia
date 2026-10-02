"""
Rendus Blender (Cycles CPU) de produits FICTIFS servant de photos d'entrée
pour les démonstrations d'E-COM STUDIO IA. Les marques sont inventées et
identifiées comme telles sur la page d'accueil.

Usage : python render_products.py <out_dir> [samples]
Produit, pour chaque produit :
  - <id>-photo.jpg   : « photo client » (produit posé sur une table, lumière naturelle)
  - <id>-cutout.png  : détourage alpha (sert de vérité terrain pour les tests)
"""
import math
import os
import sys

import bpy
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[-2] if len(sys.argv) > 2 else "out"
SAMPLES = int(sys.argv[-1]) if len(sys.argv) > 2 else 96
FONTS = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "fonts")
os.makedirs(OUT, exist_ok=True)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


# ---------------------------------------------------------------- étiquettes
def label_serum(path):
    w, h = 2048, 760
    im = Image.new("RGBA", (w, h), (244, 236, 224, 255))
    d = ImageDraw.Draw(im)
    cx = w // 2
    d.text((cx, 170), "MAISON ONDINE", font=font("Cormorant-600.ttf", 58), fill=(60, 40, 30), anchor="mm")
    d.line((cx - 120, 235, cx + 120, 235), fill=(150, 110, 70), width=3)
    d.text((cx, 360), "Sérum Éclat", font=font("Cormorant-500italic.ttf", 84), fill=(60, 40, 30), anchor="mm")
    d.text((cx, 500), "NIACINAMIDE · ACIDE HYALURONIQUE", font=font("Jost-500.ttf", 24), fill=(110, 85, 65), anchor="mm")
    d.text((cx, 620), "30 ml  ·  1.0 fl oz", font=font("Jost-400.ttf", 26), fill=(110, 85, 65), anchor="mm")
    im.save(path)


def label_candle(path):
    w, h = 2048, 620
    im = Image.new("RGBA", (w, h), (24, 24, 22, 255))
    d = ImageDraw.Draw(im)
    for cx in (w // 2,):
        d.text((cx, 150), "ATELIER BRAISE", font=font("Archivo-800.ttf", 50), fill=(226, 205, 168), anchor="mm")
        d.text((cx, 300), "Figuier & Bois fumé", font=font("InstrumentSerif-400italic.ttf", 70), fill=(240, 232, 218), anchor="mm")
        d.text((cx, 450), "BOUGIE PARFUMÉE · 220 G", font=font("Archivo-600.ttf", 26), fill=(180, 160, 130), anchor="mm")
    im.save(path)


def label_bottle(path):
    w, h = 2048, 900
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    d.text((cx, 380), "NORDVIK", font=font("SpaceGrotesk-700.ttf", 104), fill=(245, 245, 240, 255), anchor="mm")
    d.text((cx, 530), "750 ML  ·  ISOTHERME", font=font("SpaceGrotesk-500.ttf", 34), fill=(245, 245, 240, 230), anchor="mm")
    im.save(path)


def label_mug(path):
    w, h = 2048, 1024
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    d.text((cx, 520), "terre & feu", font=font("InstrumentSerif-400italic.ttf", 120), fill=(70, 46, 34, 255), anchor="mm")
    im.save(path)


# ---------------------------------------------------------------- utilitaires
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 1200
    sc.render.resolution_y = 1500
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Punchy"
    return sc


def mat(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, trans=0.0, ior=1.45, coat=0.0, image=None, alpha_img=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    b.inputs["Coat Weight"].default_value = coat
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(image)
        tex.extension = "CLIP"
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        if alpha_img:
            mix = nt.nodes.new("ShaderNodeMixRGB")
            mix.inputs[1].default_value = (*color, 1)
            nt.links.new(tex.outputs["Alpha"], mix.inputs[0])
            nt.links.new(tex.outputs["Color"], mix.inputs[2])
            nt.links.new(mix.outputs[0], b.inputs["Base Color"])
    return m


def noise_mat(name, c1, c2, scale=12.0, rough=0.6, stretch=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = 8
    if stretch:
        mp = nt.nodes.new("ShaderNodeMapping")
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp.inputs["Scale"].default_value = stretch
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m


def cyl(r, depth, z, m, verts=96, name="cyl", bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=(0, 0, z + depth / 2), vertices=verts)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 6
        mod.limit_method = "ANGLE"
    return o


def label_wrap(r, h, z, m, name="label"):
    """Cylindre ouvert à UV cylindriques, juste au-dessus de la surface."""
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(0, 0, z + h / 2), vertices=128, end_fill_type="NOTHING")
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    # UV cylindrique : u selon l'angle, v selon la hauteur
    me = o.data
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            a = (math.atan2(v.y, v.x) + math.pi) / (2 * math.pi)
            uv.data[li].uv = (1 - ((a + 0.25) % 1.0), (v.z + h / 2) / h)
    # Corrige la couture
    for poly in me.polygons:
        us = [uv.data[li].uv[0] for li in poly.loop_indices]
        if max(us) - min(us) > 0.5:
            for li in poly.loop_indices:
                if uv.data[li].uv[0] < 0.5:
                    uv.data[li].uv[0] += 1.0
    return o


def studio(scene, kind="table"):
    world = bpy.data.worlds.new("w")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.92, 0.9, 0.87, 1)
    bg.inputs[1].default_value = 0.35
    if kind == "table":
        bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
        table = bpy.context.object
        table.data.materials.append(noise_mat("bois", (0.36, 0.24, 0.15), (0.55, 0.40, 0.27), scale=3.0, rough=0.55, stretch=(1, 14, 1)))
        bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 2.2, 2), rotation=(math.radians(90), 0, 0))
        wall = bpy.context.object
        wall.data.materials.append(mat("mur", (0.86, 0.83, 0.78), rough=0.9))
    # Fenêtre (grande lumière douce) + contre-jour + débouchage
    bpy.ops.object.light_add(type="AREA", location=(-1.6, -0.8, 1.6))
    key = bpy.context.object
    key.data.energy = 420
    key.data.size = 1.6
    key.data.color = (1.0, 0.96, 0.9)
    key.rotation_euler = (math.radians(55), 0, math.radians(-60))
    bpy.ops.object.light_add(type="AREA", location=(1.4, 1.0, 1.3))
    rim = bpy.context.object
    rim.data.energy = 160
    rim.data.size = 0.6
    rim.rotation_euler = (math.radians(-60), 0, math.radians(130))
    bpy.ops.object.light_add(type="AREA", location=(0.6, -1.8, 0.6))
    fill = bpy.context.object
    fill.data.energy = 60
    fill.data.size = 2
    fill.rotation_euler = (math.radians(80), 0, math.radians(15))


def camera(scene, target_z, dist=1.25, height=0.32, lens=70):
    bpy.ops.object.camera_add(location=(0.18, -dist, height))
    cam = bpy.context.object
    cam.data.lens = lens
    bpy.ops.object.empty_add(location=(0, 0, target_z))
    tgt = bpy.context.object
    c = cam.constraints.new("TRACK_TO")
    c.target = tgt
    scene.camera = cam


def render(scene, path, transparent=False, hide=()):
    scene.render.film_transparent = transparent
    for o in hide:
        o.hide_render = True
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    bpy.ops.render.render(write_still=True)
    for o in hide:
        o.hide_render = False


# ---------------------------------------------------------------- produits
def serum(tmp):
    lab = os.path.join(tmp, "serum-label.png")
    label_serum(lab)
    glass = mat("verre ambré", (0.55, 0.22, 0.05), rough=0.04, trans=1.0, ior=1.5)
    parts = []
    parts.append(cyl(0.085, 0.24, 0.0, glass, name="corps", bevel=0.02))
    parts.append(cyl(0.035, 0.035, 0.24, glass, name="col"))
    parts.append(label_wrap(0.0865, 0.13, 0.04, mat("etiquette", (0.95, 0.92, 0.88), rough=0.6, image=lab), "etiquette"))
    black = mat("bague", (0.02, 0.02, 0.02), rough=0.35, coat=0.4)
    parts.append(cyl(0.05, 0.05, 0.262, black, name="bague", bevel=0.006))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=(0, 0, 0.345), segments=64, ring_count=32)
    bulb = bpy.context.object
    bulb.scale = (1, 1, 1.55)
    bulb.data.materials.append(mat("poire", (0.03, 0.03, 0.03), rough=0.5))
    bpy.ops.object.shade_smooth()
    parts.append(bulb)
    return parts, 0.18


def candle(tmp):
    lab = os.path.join(tmp, "candle-label.png")
    label_candle(lab)
    jar = mat("céramique", (0.025, 0.025, 0.024), rough=0.62)
    parts = [cyl(0.115, 0.16, 0.0, jar, name="pot", bevel=0.01)]
    parts.append(label_wrap(0.1162, 0.07, 0.045, mat("etiquette", (0.1, 0.1, 0.1), rough=0.55, image=lab), "etiquette"))
    cork = noise_mat("liège", (0.30, 0.18, 0.09), (0.52, 0.36, 0.20), scale=90, rough=0.9)
    parts.append(cyl(0.112, 0.045, 0.16, cork, name="couvercle", bevel=0.008))
    return parts, 0.11


def bottle(tmp):
    lab = os.path.join(tmp, "bottle-label.png")
    label_bottle(lab)
    steel = mat("acier poudré", (0.13, 0.27, 0.24), rough=0.45, metal=0.3)
    parts = [cyl(0.075, 0.3, 0.0, steel, name="gourde", bevel=0.02)]
    parts.append(label_wrap(0.0758, 0.15, 0.06, mat("logo", (0.13, 0.27, 0.24), rough=0.45, metal=0.3, image=lab, alpha_img=True), "logo"))
    parts.append(cyl(0.05, 0.03, 0.3, mat("col", (0.7, 0.7, 0.7), rough=0.2, metal=1.0), name="col"))
    bamboo = noise_mat("bambou", (0.62, 0.46, 0.28), (0.78, 0.62, 0.42), scale=2.5, rough=0.5, stretch=(1, 1, 30))
    parts.append(cyl(0.058, 0.06, 0.33, bamboo, name="bouchon", bevel=0.008))
    return parts, 0.2


def mug(tmp):
    lab = os.path.join(tmp, "mug-label.png")
    label_mug(lab)
    speck = noise_mat("grès", (0.82, 0.76, 0.68), (0.93, 0.89, 0.83), scale=180, rough=0.65)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.085, depth=0.17, location=(0, 0, 0.085), vertices=96, end_fill_type="NOTHING")
    body = bpy.context.object
    body.name = "tasse"
    body.data.materials.append(speck)
    bpy.ops.object.shade_smooth()
    sol = body.modifiers.new("epaisseur", "SOLIDIFY")
    sol.thickness = 0.007
    sol.offset = -1
    parts = [body, cyl(0.084, 0.008, 0.0, speck, name="fond")]
    parts.append(label_wrap(0.0858, 0.1, 0.04, mat("logo", (0.86, 0.8, 0.72), rough=0.6, image=lab, alpha_img=True), "logo"))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.012, location=(0.085, 0, 0.09), rotation=(math.radians(90), 0, 0))
    handle = bpy.context.object
    handle.data.materials.append(speck)
    bpy.ops.object.shade_smooth()
    parts.append(handle)
    # Café à l'intérieur
    parts.append(cyl(0.077, 0.004, 0.135, mat("café", (0.09, 0.045, 0.02), rough=0.08), name="cafe"))
    return parts, 0.1


PRODUCTS = {"serum": serum, "bougie": candle, "gourde": bottle, "tasse": mug}

if __name__ == "__main__":
    only = os.environ.get("ONLY")
    for pid, fn in PRODUCTS.items():
        if only and pid != only:
            continue
        sc = reset()
        studio(sc)
        parts, tz = fn(OUT)
        camera(sc, tz, dist=1.35 if pid == "gourde" else 1.15)
        render(sc, os.path.join(OUT, f"{pid}-photo.png"))
        decor = [o for o in sc.objects if o.type == "MESH" and o not in parts]
        render(sc, os.path.join(OUT, f"{pid}-cutout.png"), transparent=True, hide=decor)
        print("OK", pid, flush=True)
