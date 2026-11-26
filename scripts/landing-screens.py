"""Recadre et convertit les captures de l app pour la landing.

Usage : python scripts/landing-screens.py D:/Adeyemi/osho_screens/raw public/landing/screens
Coupe la barre d etat (110 px) et la barre de navigation Android (detectee),
puis ecrit chaque capture en AVIF et WebP a 360, 540 et 720 px de large.
Necessite Pillow (avec prise en charge AVIF).
"""
import glob, os, sys
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]
TOP = 110
WIDTHS = (360, 540, 720)
for f in sorted(glob.glob(os.path.join(SRC, '*.png'))):
    im = Image.open(f).convert('RGB'); w, h = im.size
    # première ligne noire de la barre de navigation Android, colonne de gauche
    bottom = h
    for y in range(h - 300, h):
        if sum(im.getpixel((20, y))) < 15 and sum(im.getpixel((w - 20, y))) < 15:
            bottom = y; break
    crop = im.crop((0, TOP, w, bottom))
    name = os.path.splitext(os.path.basename(f))[0]
    for tw in WIDTHS:
        th = round(crop.height * tw / w)
        r = crop.resize((tw, th), Image.LANCZOS)
        r.save(os.path.join(OUT, f'{name}-{tw}.webp'), 'WEBP', quality=78, method=6)
        r.save(os.path.join(OUT, f'{name}-{tw}.avif'), 'AVIF', quality=55)
    print(name, crop.size, 'bottom cut at', bottom)
