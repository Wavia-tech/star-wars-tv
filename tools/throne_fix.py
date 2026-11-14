"""Fixes the throne room picture: the cruiser crossing the left middle bar had a stray piece of hull (with two
engines) sticking out on the other side of the bar. It is painted out, so the cruiser simply passes behind the bar.
Writes throne-fixed.png / throne-fixed.jpg. Run: python tools/throne_fix.py
"""
import cv2, numpy as np
from pathlib import Path

gen = Path(__file__).resolve().parent.parent / 'proto' / 'assets' / 'gen'
img = cv2.imread(str(gen / 'throne-hd.png'))
H, W = img.shape[:2]
hole = np.zeros((H, W), np.uint8)
# the stray hull, right of the bar (the bar's right edge runs from about x 1646 at y 212 to x 1652 at y 258)
cv2.fillPoly(hole, [np.array([(1650, 210), (1696, 214), (1698, 258), (1655, 260)], np.int32)], 255)
# filled with a copy of the empty space just to its right (real texture, not the grey of the bar)
src = np.roll(img, -58, axis=1).astype(np.float32)
soft = cv2.GaussianBlur(hole, (0, 0), 1.2).astype(np.float32)[..., None] / 255.0
fixed = img.astype(np.float32) * (1 - soft) + src * soft
fixed = np.clip(fixed, 0, 255).astype(np.uint8)
cv2.imwrite(str(gen / 'throne-fixed.png'), fixed)
cv2.imwrite(str(gen / 'throne-fixed.jpg'), fixed, [cv2.IMWRITE_JPEG_QUALITY, 94])
c = np.hstack([img[150:300, 1400:1800], fixed[150:300, 1400:1800]])
cv2.imwrite(str(Path(__file__).resolve().parent / 'out' / 'fix-check.png'), cv2.resize(c, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
print('ok')
