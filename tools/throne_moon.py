"""The moon seen through the throne room viewport, made ready to turn:
  throne-moon.jpg    : the moon with the window bars, the emperor and the guards painted out (its own surface only)
  throne-moonvis.png : where the moon is actually visible on screen (the bars, the emperor and the guards stay in front)
Run after throne_fleet.py (it reuses its outlines). Run: python tools/throne_moon.py
"""
import cv2, numpy as np
from pathlib import Path

root = Path(__file__).resolve().parent
gen = root.parent / 'proto' / 'assets' / 'gen'
img = cv2.imread(str(gen / 'throne-hd.png'))
H, W = img.shape[:2]
CX, CY, R = 681, 874, 758                     # the moon's disc, fitted on its rim

disc = np.zeros((H, W), np.uint8); cv2.circle(disc, (CX, CY), R, 255, -1, cv2.LINE_AA)
glass = np.zeros((H, W), np.uint8)
cv2.fillPoly(glass, [np.array([(300, 94), (2430, 94), (2565, 320), (2565, 728), (120, 728), (140, 420)], np.int32)], 255)
bars = np.zeros((H, W), np.uint8)
for (x0, y0, x1, y1, w) in [(700, 90, 385, 735, 50), (1150, 90, 880, 745, 52)]:
    cv2.line(bars, (x0, y0), (x1, y1), 255, w)
cv2.line(bars, (300, 92), (2430, 92), 255, 24)                 # top frame
b, g, r = [img[..., i].astype(np.int16) for i in range(3)]
front = ((r - b > 25) & (r - g > 20)).astype(np.uint8) * 255
zone = np.zeros((H, W), np.uint8); cv2.rectangle(zone, (140, 560), (500, 1300), 255, -1); front &= zone
cv2.line(front, (282, 360), (282, 940), 255, 16)
emp = np.array([(640,236),(692,234),(716,258),(736,298),(774,300),(798,288),(810,266),(838,258),(852,276),(834,308),
                (832,398),(866,410),(990,505),(372,505),(538,402),(546,330),(598,300),(614,262)], np.int32) * 2
cv2.fillPoly(front, [emp], 255)
front = cv2.dilate(front, np.ones((9, 9), np.uint8))

# where the moon shows on screen
vis = cv2.bitwise_and(cv2.bitwise_and(disc, glass), cv2.bitwise_not(cv2.bitwise_or(bars, front)))
vis = cv2.erode(vis, np.ones((3, 3), np.uint8))
cv2.imwrite(str(gen / 'throne-moonvis.png'), cv2.resize(cv2.GaussianBlur(vis, (5, 5), 0), (W // 2, H // 2), interpolation=cv2.INTER_AREA))

# the moon's surface everywhere in its disc: what is hidden is painted from what is around it
hole = cv2.bitwise_and(disc, cv2.bitwise_not(vis))
moon = cv2.inpaint(img, cv2.dilate(hole, np.ones((5, 5), np.uint8)), 15, cv2.INPAINT_TELEA)
x0, y0, x1, y1 = max(0, CX - R), max(0, CY - R), min(W, CX + R), min(H, CY + R)
cv2.imwrite(str(gen / 'throne-moon.jpg'), moon, [cv2.IMWRITE_JPEG_QUALITY, 93])
cv2.imwrite(str(root / 'out' / 'moon-check.jpg'), cv2.resize(moon[y0:y1, x0:x1], None, fx=0.5, fy=0.5))
print('ok')
