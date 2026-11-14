"""Cuts the generated hilts (proto/assets/gen/hilts/<name>.png, on black) into clean sprites with alpha:
hilts/<name>-cut.png, trimmed to the hilt, and hilts/hilts.json with each sprite's size.
Run: python tools/hilts_cut.py
"""
import cv2, json, numpy as np
from pathlib import Path

d = Path(__file__).resolve().parent.parent / 'proto' / 'assets' / 'gen' / 'hilts'
meta = {}
for f in sorted(d.glob('*.png')):
    if f.stem.endswith('-cut'):
        continue
    img = cv2.imread(str(f))
    lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    m = (lum > 16).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2:
        print('nothing found in', f.name); continue
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    m = np.where(lab == big, 255, 0).astype(np.uint8)
    ff = m.copy(); fm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, fm, (0, 0), 255); m = m | cv2.bitwise_not(ff)            # fill holes inside the hilt
    # soft alpha: full inside, fading over the dark edge pixels so no black halo stays
    a = np.clip((lum - 8) / 30.0, 0, 1) * 255
    a = np.minimum(a, cv2.GaussianBlur(m, (3, 3), 0)).astype(np.uint8)
    a = np.maximum(a, cv2.erode(m, np.ones((5, 5), np.uint8)))
    ys, xs = np.where(m > 0)
    x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
    cut = np.dstack([img, a])[y0:y1, x0:x1]
    cv2.imwrite(str(d / f'{f.stem}-cut.png'), cut)
    meta[f.stem] = {'w': int(cut.shape[1]), 'h': int(cut.shape[0])}
    print(f.stem, cut.shape[1], 'x', cut.shape[0])
json.dump(meta, open(d / 'hilts.json', 'w'), indent=1)
