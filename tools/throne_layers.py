"""Layers for the throne room (throne-hd.png):
  throne-mask.png: R = what is seen through the window (space, planet, ships), G = the planet only,
                   B = the stair light strips
Run: python tools/throne_layers.py
"""
import cv2, numpy as np
from pathlib import Path

gen = Path(__file__).resolve().parent.parent / 'proto' / 'assets' / 'gen'
img = cv2.imread(str(gen / 'throne-hd.png'))
H, W = img.shape[:2]
b, g, r = [img[..., i].astype(np.int16) for i in range(3)]
lum = (r + g + b) / 3

# the window: an octagon around the glass, in full-resolution pixels
win = np.zeros((H, W), np.uint8)
poly = np.array([[150, 90], [2530, 90], [2590, 300], [2590, 880], [2400, 930], [300, 930], [120, 880], [110, 300]], np.int32)
cv2.fillPoly(win, [poly], 255)

# inside it, keep what is not the neutral grey of the frame: blue space, green/white planet, bright ships and fire
coloured = ((b - r > 6) | (g - r > 10) | (lum > 115)).astype(np.uint8) * 255
coloured = cv2.morphologyEx(coloured, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
view = cv2.bitwise_and(win, coloured)
# never the guards' red robes, nor the emperor's raised hand (pale skin)
red = ((r - b > 25) & (r - g > 20)).astype(np.uint8) * 255
skin = np.zeros((H, W), np.uint8)
skin_zone = np.zeros((H, W), np.uint8); cv2.rectangle(skin_zone, (1560, 500), (1720, 640), 255, -1)
skin[(r - b > 8) & (skin_zone > 0)] = 255
view[cv2.dilate(red, np.ones((15, 15), np.uint8)) > 0] = 0
view[cv2.dilate(skin, np.ones((9, 9), np.uint8)) > 0] = 0
# the emperor, his throne and its platform, drawn by hand (preview coordinates x2)
emp = np.array([(640,236),(692,234),(716,258),(736,298),(774,300),(798,288),(810,266),(838,258),(852,276),(834,308),
                (832,398),(866,410),(990,505),(372,505),(538,402),(546,330),(598,300),(614,262)], np.int32) * 2
front = np.zeros((H, W), np.uint8); cv2.fillPoly(front, [emp], 255)
view[cv2.dilate(front, np.ones((7, 7), np.uint8)) > 0] = 0
view = cv2.medianBlur(view, 5)

planet = np.zeros((H, W), np.uint8)
cv2.ellipse(planet, (650, 1350), (1250, 1250), 0, 0, 360, 255, -1)
planet = cv2.bitwise_and(planet, view)
planet[(b - g > 25) & (lum < 70)] = 0   # dark space just past the planet's edge
planet = cv2.medianBlur(planet, 9)

# stair light strips: small bright cyan bars on the stairs
strips = ((lum > 150) & (b - r > 20)).astype(np.uint8) * 255
stairs = np.zeros((H, W), np.uint8)
cv2.rectangle(stairs, (600, 1000), (2100, 1260), 255, -1)
strips = cv2.bitwise_and(strips, stairs)
strips = cv2.dilate(strips, np.ones((9, 9), np.uint8))

out = np.dstack([cv2.GaussianBlur(strips, (9, 9), 0), cv2.GaussianBlur(planet, (5, 5), 0), cv2.GaussianBlur(view, (3, 3), 0)])
cv2.imwrite(str(gen / 'throne-mask.png'), cv2.resize(out, (W // 2, H // 2), interpolation=cv2.INTER_AREA))

pv = Path(__file__).resolve().parent / 'out'
chk = img.copy()
chk[view > 128] = (0.4 * chk[view > 128] + [0, 0, 150]).astype(np.uint8)
chk[planet > 128] = (0.5 * chk[planet > 128] + [0, 120, 0]).astype(np.uint8)
chk[strips > 128] = [255, 0, 255]
cv2.imwrite(str(pv / 'throne-mask-check.jpg'), cv2.resize(chk, (1344, 760)))

# a cruiser to build the fleet from (the complete one at the lower right of the battle)
x0, y0, x1, y1 = 1970, 560, 2180, 640
crop = img[y0:y1, x0:x1].copy()
# its outline, traced by hand on the picture (full-resolution pixels)
hull = np.array([(1982,616),(2035,605),(2067,596),(2087,582),(2091,571),(2127,570),(2131,584),(2135,600),(2150,604),
                 (2166,612),(2167,619),(2157,624),(2080,629),(2035,625),(1990,619)], np.int32) - [x0, y0]
sm = np.zeros(crop.shape[:2], np.uint8); cv2.fillPoly(sm, [hull], 255)
sm = cv2.GaussianBlur(sm, (3, 3), 0)
cv2.imwrite(str(gen / 'throne-cruiser.png'), np.dstack([crop, sm]))
big = np.dstack([crop, sm]); big[sm < 10] = [255, 0, 255, 255]
cv2.imwrite(str(pv / 'cruiser-check.png'), cv2.resize(big[..., :3], None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST))
