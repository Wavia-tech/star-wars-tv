"""Turns the raw pictures of tools/gen-sections.ps1 (app/assets/gen/raw) into what the page uses (app/img):
  hilts   the six hilts cut out of their black background, stood upright (emitter up), at twice their size on screen
  holos   the four Mandalorian pictures as blue holograms (transparent, with scan lines)
  views   the four places seen through the bridge windows, 1920x1080
  camp    the night camp, 1920x1080, with the four bounty pucks set on the stone (PUCKS)
  bridge  the bridge, 1920x1080, its windows made transparent (WINDOWS: the area where pure black becomes glass)
Usage: python tools/sections.py [hilts|holos|views|camp|bridge ...]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "app", "assets", "gen", "raw")
IMG = os.path.join(HERE, "..", "app", "img")

def raw(name):
    return Image.open(os.path.join(RAW, name + ".png")).convert("RGB")

def stage(im):
    """cover 1920x1080"""
    s = max(1920 / im.width, 1080 / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - 1920) // 2, (im.height - 1080) // 2
    return im.crop((l, t, l + 1920, t + 1080))

# ---------------------------------------------------------------- hilts
HILT_H = {"maul": 940, "yoda": 410, "windu": 600, "kenobi": 600, "vader": 600, "luke6": 600}   # picture height (2x the screen)

def largest(mask):
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    if n == 0: return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return lab == (1 + int(np.argmax(sizes)))

def hilts():
    from scipy import ndimage
    sizes = {}
    for k, h in HILT_H.items():
        im = raw("hilt_" + k)
        import cv2
        a = np.asarray(im).astype(np.float32)
        # the hilt lies across the middle: GrabCut from the box round its bright parts (the dark grips and the shadow on
        # the backdrop are told apart by colour and edges, not by a threshold)
        bright = largest(ndimage.binary_closing(a.max(axis=2) > 70, iterations=8))
        ys, xs = np.nonzero(bright)
        rect = (max(0, xs.min() - 12), max(0, ys.min() - 14), min(im.width, xs.max() + 12) - max(0, xs.min() - 12), min(im.height, ys.max() + 14) - max(0, ys.min() - 14))
        gm = np.zeros(a.shape[:2], np.uint8)
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(np.ascontiguousarray(np.asarray(im)[:, :, ::-1]), gm, rect, bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
        m = (gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD)
        # the black grips GrabCut can drop: whatever stands off the backdrop within the hilt's own rows
        bgc = np.median(a[:30].reshape(-1, 3), axis=0)
        band = np.zeros_like(m); band[ys.min() - 2:ys.max() + 3, rect[0]:rect[0] + rect[2]] = True
        m |= band & (np.abs(a - bgc).max(axis=2) > 16)
        m = largest(ndimage.binary_opening(m, iterations=2))
        m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3))
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        rgba = im.copy(); rgba.putalpha(alpha)
        rgba = rgba.crop(alpha.getbbox()).rotate(90, expand=True)     # the emitter (on the right) goes up
        w = round(rgba.width * h / rgba.height)
        rgba.resize((w, h), Image.LANCZOS).save(os.path.join(IMG, "hilts", k + ".png"), optimize=True)
        sizes[k] = {"w": round(w / 2, 1), "h": h / 2}
    json.dump(sizes, open(os.path.join(IMG, "hilts", "hilts.json"), "w"))
    print("hilts", sizes)

# ---------------------------------------------------------------- holograms
def holos():
    W, H = 390, 585
    for k in ("s1", "s2", "s3", "film"):
        im = raw("holo_" + k)
        ch = round(im.width * 1.5)
        im = im.crop((0, 0, im.width, ch)).resize((W, H), Image.LANCZOS)
        lum = np.asarray(im.convert("L")).astype(np.float32) / 255
        lum = np.clip((lum - 0.06) / 0.8, 0, 1) ** 0.85
        rgb = np.stack([60 + 170 * lum, 150 + 100 * lum, 255 * np.ones_like(lum)], axis=2)
        a = np.clip(lum * 1.25, 0, 1)
        a[::3] *= 0.55                                                   # scan lines
        y, x = np.mgrid[0:H, 0:W]
        edge = np.clip(np.minimum.reduce([x, W - 1 - x, y, H - 1 - y]) / 26, 0, 1)
        a *= edge * 0.92
        out = np.dstack([rgb, a * 255]).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(os.path.join(IMG, "mando", f"holo-{k}.png"), optimize=True)
    print("holos")

# ---------------------------------------------------------------- views
def views():
    for i in range(4):
        stage(raw(f"view{i}")).save(os.path.join(IMG, "dark", f"view-{i}.jpg"), quality=85, optimize=True)
    print("views")

# ---------------------------------------------------------------- camp
PUCKS = [[245, 816], [350, 818], [455, 820], [560, 821]]           # where each puck's top sits (set from the picture)

def camp():
    im = stage(raw("camp")).convert("RGBA")
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    for x, y in PUCKS:
        rx, ry, hgt = 22, 7, 9
        d.ellipse((x - rx - 3, y + hgt - ry + 3, x + rx + 6, y + hgt + ry + 5), fill=(0, 0, 0, 140))     # shadow
        d.rectangle((x - rx, y, x + rx, y + hgt), fill=(30, 32, 38, 255))                                # side
        d.ellipse((x - rx, y + hgt - ry, x + rx, y + hgt + ry), fill=(24, 26, 31, 255))
        d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(58, 62, 72, 255))                              # top
        d.ellipse((x - rx + 4, y - ry + 2, x + rx - 4, y + ry - 2), outline=(40, 43, 51, 255), width=2)  # machined ring
        d.ellipse((x - 7, y - 2, x + 7, y + 2), fill=(70, 120, 170, 255))                                # the lens
        d.arc((x - rx, y - ry, x + rx, y + ry), 10, 120, fill=(230, 140, 80, 170), width=2)               # firelight on the rim
    im = Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(0.6)))
    im.convert("RGB").save(os.path.join(IMG, "mando", "camp.jpg"), quality=88, optimize=True)
    print("camp")

# ---------------------------------------------------------------- bridge
WINDOWS = (150, 40, 1880, 750)
# the band of panes (no further up: the dark ceiling would go too), top edge left to right, then the bottom edge back
PANES = [(175, 468), (250, 452), (330, 432), (420, 408), (500, 383), (600, 352), (730, 307), (880, 258), (1100, 188),
         (1420, 108), (1430, 40), (1860, 40), (1860, 745), (1400, 728), (1000, 712), (600, 696), (175, 676)]     # left, top, right, bottom: where the windows are (set from the picture)
DARK = 26                           # how dark a pixel must be to count as outside
NOT_GLASS = [(1735, 40, 1860, 330), (1005, 195, 1070, 385), (655, 315, 705, 425)]   # dark frame edges, not panes
# the dark lord stands against the glass, as dark as space itself: his outline, kept solid
FIGURE = [(1578, 482), (1536, 512), (1530, 528), (1536, 566), (1511, 598), (1505, 636), (1490, 790), (1680, 790),
          (1675, 740), (1665, 660), (1650, 604), (1642, 566), (1620, 534), (1610, 492)]

def bridge():
    from scipy import ndimage
    im = stage(raw("bridge"))
    a = np.asarray(im).astype(np.int32)
    dark = a.max(axis=2) < DARK
    pz = Image.new("L", (1920, 1080), 0); ImageDraw.Draw(pz).polygon(PANES, fill=255)
    zone = np.asarray(pz) > 0
    fig = Image.new("L", (1920, 1080), 0); ImageDraw.Draw(fig).polygon(FIGURE, fill=255)
    zone &= ~(np.asarray(fig.filter(ImageFilter.MaxFilter(5))) > 0)
    for l, t, r, b in NOT_GLASS: zone[t:b, l:r] = False
    m = ndimage.binary_opening(dark & zone, iterations=5)
    left = np.zeros_like(zone); left[:, :450] = True
    m |= ndimage.binary_opening(dark & zone & left, iterations=2)       # the far panes are thin
    lab, n = ndimage.label(m)
    keep = np.zeros_like(m)
    for i in range(1, n + 1):
        part = lab == i
        if part.sum() > 1500: keep |= part                        # the panes, not the shadows between consoles
    keep = ndimage.binary_fill_holes(keep)
    alpha = Image.fromarray(((~keep) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(alpha)
    rgba.save(os.path.join(IMG, "dark", "bridge.png"), optimize=True)
    ys, xs = np.nonzero(keep)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
    print("bridge glass box", box)

if __name__ == "__main__":
    for d in ("hilts", "mando", "dark"): os.makedirs(os.path.join(IMG, d), exist_ok=True)
    for step in sys.argv[1:] or ["hilts", "holos", "views", "camp", "bridge"]:
        globals()[step]()
