"""Builds the layers that animate Tatooine from sunset-hd.png:
  - tatooine-mask.png : R = foreground objects (Luke, masts, skiff, dome) sharp, G = the same grown and softened
  - tatooine-plate.jpg: the picture with the distant vehicle painted out
  - tatooine-ship.png : the distant vehicle cut out, with alpha
Run: python tools/tatooine_layers.py
"""
import cv2, numpy as np
from pathlib import Path

gen = Path(__file__).resolve().parent.parent / 'proto' / 'assets' / 'gen'
img = cv2.imread(str(gen / 'sunset-hd.png'))
H, W = img.shape[:2]

# rectangles around each foreground object (x0, y0, x1, y1), full-resolution pixels
FG = {
    'luke': (440, 300, 700, 1120),
    'mast_left': (70, 95, 285, 1020),
    'mast_left2': (275, 610, 350, 925),
    'mast_right': (1870, 465, 1985, 915),
    'mast_right2': (1750, 715, 1810, 905),
    'skiff': (1445, 885, 2380, 1140),
    'dome': (1985, 415, 2688, 1140),
}

THIN = {'mast_left', 'mast_left2', 'mast_right', 'mast_right2'}

def thin_mask(x0, y0, x1, y1):
    # thin masts: compare each row with the sky/sand at the rectangle's left and right edges
    roi = img[y0:y1, x0:x1].astype(np.int16)
    edge = np.concatenate([roi[:, :6], roi[:, -6:]], axis=1)
    ref = np.median(edge, axis=1, keepdims=True)
    diff = np.abs(roi - ref).max(axis=2)
    m = (diff > 22).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 5), np.uint8))
    full = np.zeros((H, W), np.uint8); full[y0:y1, x0:x1] = m
    return full

mask = np.zeros((H, W), np.uint8)
for name, (x0, y0, x1, y1) in FG.items():
    if name in THIN:
        m = thin_mask(x0, y0, x1, y1); mask = np.maximum(mask, m); print(name, int(m.sum() / 255)); continue
    gc = np.zeros((H, W), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # keep the largest connected blob inside the rectangle (drops stray sand)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lab == big, 255, 0).astype(np.uint8)
    mask = np.maximum(mask, m)
    print(name, int(m.sum() / 255))

mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
sharp = cv2.GaussianBlur(mask, (5, 5), 0)
grown = cv2.GaussianBlur(cv2.dilate(mask, np.ones((25, 25), np.uint8)), (41, 41), 0)
out = np.dstack([np.zeros_like(mask), grown, sharp])  # BGR -> R=sharp, G=grown
cv2.imwrite(str(gen / 'tatooine-mask.png'), cv2.resize(out, (W // 2, H // 2), interpolation=cv2.INTER_AREA))

# the distant vehicle on the horizon
sx0, sy0, sx1, sy1 = 915, 775, 1060, 850
crop = img[sy0:sy1, sx0:sx1]
gc = np.zeros(crop.shape[:2], np.uint8)
bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(crop, gc, (10, 8, crop.shape[1] - 20, crop.shape[0] - 14), bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
sm = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
sm = cv2.GaussianBlur(sm, (3, 3), 0)
ship = np.dstack([crop, sm])
cv2.imwrite(str(gen / 'tatooine-ship.png'), ship)
print('ship', crop.shape, int((sm > 128).sum()))

# paint it out of the plate
hole = np.zeros((H, W), np.uint8)
hole[sy0:sy1, sx0:sx1] = cv2.dilate(sm, np.ones((25, 25), np.uint8))
# the horizon is level, so each row of the hole is filled by blending the pixels just left and right of it,
# then the fine texture of a neighbouring patch of sky and sand is laid back on top
plate = img.copy().astype(np.float32)
ys, xs = np.where(hole > 0)
for y in range(ys.min(), ys.max() + 1):
    row = np.where(hole[y] > 0)[0]
    if row.size == 0: continue
    xl, xr = row.min() - 4, row.max() + 4
    l = img[y, xl - 6:xl].astype(np.float32).mean(axis=0); r = img[y, xr:xr + 6].astype(np.float32).mean(axis=0)
    t = (np.arange(xl, xr) - xl) / max(1, xr - xl)
    plate[y, xl:xr] = l[None, :] * (1 - t[:, None]) + r[None, :] * t[:, None]
y0, y1, x0, x1 = ys.min() - 4, ys.max() + 5, xs.min() - 4, xs.max() + 5
donor = img[y0:y1, x0 - 260:x1 - 260].astype(np.float32)
detail = donor - cv2.GaussianBlur(donor, (0, 0), 3)
plate[y0:y1, x0:x1] += detail
soft = cv2.GaussianBlur(cv2.dilate(hole, np.ones((9, 9), np.uint8)), (21, 21), 0).astype(np.float32)[..., None] / 255.0
plate = np.clip(img * (1 - soft) + plate * soft, 0, 255).astype(np.uint8)
cv2.imwrite(str(gen / 'tatooine-plate.jpg'), plate, [cv2.IMWRITE_JPEG_QUALITY, 93])

# previews for checking
pv = Path(__file__).resolve().parent / 'out'
pv.mkdir(exist_ok=True)
over = img.copy(); over[mask > 128] = (0.5 * over[mask > 128] + [0, 0, 127]).astype(np.uint8)
cv2.imwrite(str(pv / 'mask-check.jpg'), cv2.resize(over, (1344, 760)))
cv2.imwrite(str(pv / 'plate-check.jpg'), plate[700:900, 800:1200])
cv2.imwrite(str(pv / 'ship-check.png'), cv2.resize(ship, (crop.shape[1] * 3, crop.shape[0] * 3), interpolation=cv2.INTER_NEAREST))
