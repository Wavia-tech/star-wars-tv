"""Turns the battle seen through the throne room viewport into a fleet that sails on:
  throne-base.jpg   : the picture with every cruiser, explosion, debris and laser removed from the viewport
  throne-ships.png  : an atlas of the cruisers cut out of the picture, with alpha
  throne-ships.json : where each cruiser sits in the picture, its place in the atlas and its speed
  throne-vis.png    : where open space is visible (R), so the bars, the moon, the emperor and the guards pass in front
Run: python tools/throne_fleet.py
"""
import cv2, json, numpy as np
from pathlib import Path

root = Path(__file__).resolve().parent
gen = root.parent / 'proto' / 'assets' / 'gen'
pv = root / 'out'
img = cv2.imread(str(gen / 'throne-hd.png'))
H, W = img.shape[:2]
m = cv2.resize(cv2.imread(str(gen / 'throne-mask.png')), (W, H), interpolation=cv2.INTER_LINEAR)
# the moon's rim, read off the picture at three points; the circle through them is its disc
(ax, ay), (bx, by), (cx_, cy_) = (1030, 200), (1200, 320), (1330, 480)
d = 2 * (ax * (by - cy_) + bx * (cy_ - ay) + cx_ * (ay - by))
ux = ((ax**2 + ay**2) * (by - cy_) + (bx**2 + by**2) * (cy_ - ay) + (cx_**2 + cy_**2) * (ay - by)) / d
uy = ((ax**2 + ay**2) * (cx_ - bx) + (bx**2 + by**2) * (ax - cx_) + (cx_**2 + cy_**2) * (bx - ax)) / d
rad = ((ax - ux)**2 + (ay - uy)**2) ** 0.5
moon = np.zeros((H, W), np.uint8); cv2.circle(moon, (int(ux), int(uy)), int(rad), 255, -1, cv2.LINE_AA)
print('moon centre', int(ux), int(uy), 'radius', int(rad))
b, g, r = [img[..., i].astype(np.int16) for i in range(3)]

# ── 1. the glass of the upper viewport, the bars across it, and what stands in front of it (traced on a grid) ──
glass = np.zeros((H, W), np.uint8)
cv2.fillPoly(glass, [np.array([(300, 94), (2430, 94), (2565, 320), (2565, 728), (120, 728), (140, 420)], np.int32)], 255)
bars = np.zeros((H, W), np.uint8)
for (x0, y0, x1, y1, w) in [(700, 90, 385, 735, 50), (1150, 90, 880, 745, 52), (1615, 90, 1800, 735, 50),
                            (2020, 90, 2330, 650, 54)]:
    cv2.line(bars, (x0, y0), (x1, y1), 255, w)
front = np.zeros((H, W), np.uint8)
guards = ((r - b > 25) & (r - g > 20)).astype(np.uint8) * 255
zone = np.zeros((H, W), np.uint8)
cv2.rectangle(zone, (140, 560), (500, 1300), 255, -1); cv2.rectangle(zone, (2190, 560), (2590, 1300), 255, -1)
guards &= zone
front |= cv2.dilate(guards, np.ones((17, 17), np.uint8))
for x in (282, 2427):                                                     # the guards' spears
    cv2.line(front, (x, 360), (x, 940), 255, 16)
emp = np.array([(640,236),(692,234),(716,258),(736,298),(774,300),(798,288),(810,266),(838,258),(852,276),(834,308),
                (832,398),(866,410),(990,505),(372,505),(538,402),(546,330),(598,300),(614,262)], np.int32) * 2
cv2.fillPoly(front, [emp], 255)
front = cv2.dilate(front, np.ones((7, 7), np.uint8))
vis = glass.copy(); vis[bars > 0] = 0; vis[front > 0] = 0; vis[cv2.dilate(moon, np.ones((5, 5), np.uint8)) > 0] = 0
cv2.imwrite(str(gen / 'throne-vis.png'), cv2.resize(cv2.GaussianBlur(vis, (5, 5), 0), (W // 2, H // 2), interpolation=cv2.INTER_AREA))

# a working copy with the bars painted out, so the cruisers can be cut whole
work = cv2.inpaint(img, cv2.bitwise_and(cv2.dilate(bars, np.ones((7, 7), np.uint8)), cv2.bitwise_not(front)), 9, cv2.INPAINT_TELEA)

# ── 2. the cruisers, outlined by hand, with their speed (picture widths a second; nearer is faster) ──
SHIPS = {
    'destroyer_near':  ((2050, 160, 2500, 345), 0.0016),
    'destroyer_mid':   ((1425, 175, 1690, 272), 0.0010),
    'destroyer_low':   ((1972, 562, 2182, 640), 0.0011),
    'destroyer_far':   ((1305, 244, 1400, 288), 0.0006),
    'destroyer_tiny':  ((1742, 180, 1816, 210), 0.0005),
    'fighters_a':      ((1772, 478, 1872, 556), 0.0030),
    'fighters_b':      ((1857, 283, 1956, 336), 0.0026),
}
BURN = [(1930, 300, 2200, 480), (2030, 670, 2100, 730), (1690, 350, 1760, 380), (1615, 370, 1665, 410), (1720, 352, 1830, 420),
        (1490, 340, 1590, 430), (1455, 365, 1510, 410), (2090, 405, 2175, 450), (1690, 445, 1790, 475)]

lum = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY).astype(np.float32)
parts, meta, remove = [], [], np.zeros((H, W), np.uint8)
for name, ((x0, y0, x1, y1), speed) in SHIPS.items():
    roi = lum[y0:y1, x0:x1]
    bgl = cv2.medianBlur(roi.astype(np.uint8), 31).astype(np.float32)
    ref = np.median(np.concatenate([roi[0], roi[-1], roi[:, 0], roi[:, -1]]))
    hit = ((np.abs(roi - ref) > 10) & (np.abs(roi - bgl) > 4) | (np.abs(roi - ref) > 22)).astype(np.uint8) * 255
    hit = cv2.morphologyEx(hit, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    hit = cv2.morphologyEx(hit, cv2.MORPH_CLOSE, np.ones((7, 11), np.uint8))
    a = np.zeros_like(hit)
    if name.startswith('destroyer'):
        nn, lb, st, _ = cv2.connectedComponentsWithStats(hit)
        if nn > 1:
            hit = np.where(lb == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])), 255, 0).astype(np.uint8)
        for c in range(hit.shape[1]):                                  # wedge-shaped hulls: fill each column top to bottom
            ys = np.where(hit[:, c] > 0)[0]
            if ys.size: a[ys.min():ys.max() + 1, c] = 255
    else:
        a = hit
    a = cv2.GaussianBlur(a, (5, 5), 0)
    rgb = work[y0:y1, x0:x1].copy()
    if name == 'destroyer_near':
        under = bars[y0:y1, x0:x1] > 0
        shift = 75
        src_rgb = np.roll(rgb, -shift, axis=1); src_a = np.roll(a, -shift, axis=1)
        rgb[under] = src_rgb[under]; a[under] = src_a[under]
        a = cv2.GaussianBlur(a, (3, 3), 0)
    parts.append(np.dstack([rgb, a]))
    meta.append({'name': name, 'x': x0 / W, 'y': y0 / H, 'w': (x1 - x0) / W, 'h': (y1 - y0) / H, 'speed': speed})
    remove[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6] = 255        # the whole box goes, so no faint ghost is left
for (x0, y0, x1, y1) in BURN:
    remove[y0:y1, x0:x1] = 255

# ── 3. the atlas ──
aw = max(p.shape[1] for p in parts); ah = sum(p.shape[0] + 4 for p in parts)
atlas = np.zeros((ah, aw, 4), np.uint8); y = 0
for p, mt in zip(parts, meta):
    atlas[y:y + p.shape[0], :p.shape[1]] = p
    mt.update(ax=0, ay=y / ah, aw=p.shape[1] / aw, ah=p.shape[0] / ah)
    y += p.shape[0] + 4
cv2.imwrite(str(gen / 'throne-ships.png'), atlas)
json.dump({'ships': meta}, open(gen / 'throne-ships.json', 'w'), indent=1)

# ── 4. empty space where they were, with a fresh sprinkle of faint stars ──
# fill with the smooth colour of the surrounding space only (worked out at 1/8 size, so no streaks carry in)
k = 8
small = cv2.resize(work, (W // k, H // k), interpolation=cv2.INTER_AREA)
smask = cv2.dilate(cv2.resize(remove, (W // k, H // k), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
fill = cv2.inpaint(small, smask, 6, cv2.INPAINT_TELEA)
fill = cv2.GaussianBlur(cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 6).astype(np.float32)
# a fine grain like the picture's own, so the patch is not too smooth
grain = np.random.default_rng(3).normal(0, 3.2, (H, W, 1)).astype(np.float32)
soft = cv2.GaussianBlur(remove, (0, 0), 7).astype(np.float32)[..., None] / 255.0
plate = work.astype(np.float32) * (1 - soft) + (fill + grain) * soft
rng = np.random.default_rng(7)
ys, xs = np.where(remove > 0)
for i in rng.choice(len(ys), size=len(ys) // 2200, replace=False):
    v = rng.uniform(45, 140)
    cv2.circle(plate, (int(xs[i]), int(ys[i])), 1, (v + 25, v + 12, v), -1, cv2.LINE_AA)
plate = np.clip(plate, 0, 255)

# ── 5. the base picture: everything as it was, except open space, which is now empty ──
sp = cv2.GaussianBlur(cv2.bitwise_and(glass, cv2.bitwise_not(cv2.bitwise_or(cv2.bitwise_or(front, moon), bars))), (5, 5), 0).astype(np.float32)[..., None] / 255.0
spb = sp * (cv2.GaussianBlur(cv2.dilate(remove, np.ones((9, 9), np.uint8)), (0, 0), 4).astype(np.float32)[..., None] / 255.0)
base = (img * (1 - spb) + plate * spb).astype(np.uint8)
cv2.imwrite(str(gen / 'throne-base.jpg'), base, [cv2.IMWRITE_JPEG_QUALITY, 94])

# checks
cv2.imwrite(str(pv / 'fleet-base-check.jpg'), cv2.resize(base, (1344, 760)))
chk = np.zeros((ah, aw, 3), np.uint8); chk[:] = (60, 20, 60)
al = atlas[..., 3:] / 255.0
cv2.imwrite(str(pv / 'fleet-atlas-check.png'), (atlas[..., :3] * al + chk * (1 - al)).astype(np.uint8))
vchk = img.copy(); vchk[vis > 128] = (0.45 * vchk[vis > 128] + [0, 0, 140]).astype(np.uint8)
cv2.imwrite(str(pv / 'fleet-vis-check.jpg'), cv2.resize(vchk, (1344, 760)))
print('ok', len(meta), 'ships')
