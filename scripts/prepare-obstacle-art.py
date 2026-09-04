"""User-approved local extraction of the two generated obstacle sprites.

Usage: python scripts/prepare-obstacle-art.py POND.png ROCKS.png
Requires Pillow, numpy, scipy. Only writes versioned game assets and a QA sheet.
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
destination = root / "public" / "obstacles"
destination.mkdir(parents=True, exist_ok=True)
sheet = Image.new("RGB", (640, 320), "white")
for row, (kind, source) in enumerate(zip(("pond", "rocks"), sys.argv[1:], strict=True)):
    original = Image.open(source).convert("RGB")
    rgb = np.asarray(original).astype(np.int16)
    # The generated checker is near-neutral and very light. Keep connected
    # painted pigment, including colored pale banks and the immediate shadow.
    pigment = (rgb.max(2) - rgb.min(2) > 12) | (rgb.min(2) < 219)
    labels, count = ndimage.label(pigment)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    silhouette = ndimage.binary_fill_holes(labels == sizes.argmax())
    alpha = Image.fromarray((silhouette * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.7)
    )
    rgba = original.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = rgba.resize((512, 512), Image.Resampling.LANCZOS)
    target = destination / f"{kind}-v1.webp"
    rgba.save(target, "WEBP", quality=90, method=6, exact=True)
    reopened = Image.open(target)
    assert reopened.mode == "RGBA"
    a = np.asarray(reopened.getchannel("A"))
    assert a[0, 0] == 0 and a.max() == 255 and (a == 0).mean() > 0.15
    print(f"{kind}: {target.stat().st_size} bytes; transparent={(a == 0).mean():.1%}")
    for col, color in enumerate(("#efdeb7", "#dce8d3", "#dcd8ed", "#334b41")):
        tile = Image.new("RGBA", (160, 160), color)
        tile.alpha_composite(reopened.resize((112, 112), Image.Resampling.LANCZOS), (24, 0))
        tile.alpha_composite(reopened.resize((40, 40), Image.Resampling.LANCZOS), (60, 116))
        sheet.paste(tile.convert("RGB"), (col * 160, row * 160))
(root / "work").mkdir(exist_ok=True)
sheet.save(root / "work" / "obstacle-art-review.png")
