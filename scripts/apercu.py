"""Images d'aperçu des liens à partager : img/apercu-<langue>.png (1200 × 630), une par langue de js/i18n.js.

Elles s'affichent dans Teams et les messageries (balise og:image des pages links/<langue>/<page>/).
À relancer après l'ajout d'une langue ou un changement des textes utilisés :

    npm run apercu

Outils nécessaires, sans dépendance ajoutée au projet : Python avec Pillow, et Node.js pour lire les
textes (js/i18n). Polices : Segoe UI si elle est installée (Windows), sinon DejaVu Sans.
"""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = Path(__file__).resolve().parent.parent
FOND = (0, 0, 143)  # --primary
ACCENT = (25, 181, 214)  # --accent
BLANC = (255, 255, 255)
# Couleur du libellé « Règle d'or » du dos de la règle 1 (--back-label de .back--r1 dans css/style.css).
LIBELLE_REGLE_1 = (198, 233, 243)

# Textes de chaque langue, lus par Node dans les modules de l'application.
LECTURE = """
import { RULES } from "./js/cards.js";
import { LANGUAGES, loadLanguage, ruleText, t } from "./js/i18n.js";
const out = {};
for (const lang of Object.keys(LANGUAGES)) {
  await loadLanguage(lang);
  out[lang] = { tagline: t("app.tagline"), text: t("link.imageText"), label: t("back.label"), foot: t("back.foot"), theme: ruleText(RULES[0], "theme") };
}
console.log(JSON.stringify(out));
"""


def police(gras, taille):
    noms = ["segoeuib.ttf", "DejaVuSans-Bold.ttf"] if gras else ["segoeui.ttf", "DejaVuSans.ttf"]
    for nom in noms:
        for dossier in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu"):
            chemin = Path(dossier) / nom
            if chemin.exists():
                return ImageFont.truetype(str(chemin), taille)
    raise SystemExit("Police introuvable : installez Segoe UI ou DejaVu Sans.")


def lignes(draw, texte, fonte, largeur):
    """Découpe le texte en lignes d'au plus « largeur » pixels."""
    resultat, ligne = [], ""
    for mot in texte.split():
        essai = f"{ligne} {mot}".strip()
        if ligne and draw.textlength(essai, font=fonte) > largeur:
            resultat.append(ligne)
            ligne = mot
        else:
            ligne = essai
    return resultat + [ligne]


def dos(regle, textes=None):
    """Dos de carte (640 × 893), avec son texte s'il est fourni, comme le dessine l'application."""
    carte = Image.open(RACINE / f"img/dos/regle-{regle}.webp").convert("RGBA")
    if textes:
        draw = ImageDraw.Draw(carte)
        w, h = carte.size
        libelle, theme, pied = police(True, 27), police(True, 47), police(False, 22)
        blocs = [(textes["label"].upper(), libelle, LIBELLE_REGLE_1)]
        blocs += [(l, theme, BLANC) for l in lignes(draw, textes["theme"], theme, 0.8 * w)]
        blocs += [(textes["foot"].upper(), pied, (232, 246, 250))]
        hauteurs = [f.size * 1.15 for _, f, _ in blocs]
        y = (0.67 + 0.935) / 2 * h - sum(hauteurs) / 2  # centré dans la bande de 67 % à 93,5 % de la hauteur
        for (texte, fonte, couleur), haut in zip(blocs, hauteurs):
            draw.text((w / 2, y + haut / 2), texte, font=fonte, fill=couleur, anchor="mm")
            y += haut
    return carte


def poser(image, carte, centre, angle, echelle=0.42):
    """Pose une carte réduite et inclinée, avec une ombre portée."""
    carte = carte.resize((round(carte.width * echelle), round(carte.height * echelle)), Image.LANCZOS)
    carte = carte.rotate(angle, resample=Image.BICUBIC, expand=True)
    ombre = Image.new("RGBA", carte.size, (0, 0, 0, 0))
    ombre.putalpha(carte.getchannel("A").point(lambda a: a * 0.45))
    ombre = ombre.filter(ImageFilter.GaussianBlur(10))
    x, y = round(centre[0] - carte.width / 2), round(centre[1] - carte.height / 2)
    image.alpha_composite(ombre, (x + 6, y + 10))
    image.alpha_composite(carte, (x, y))


def apercu(textes):
    image = Image.new("RGBA", (1200, 630), FOND + (255,))
    image.alpha_composite(Image.open(Path(__file__).parent / "apercu-logo.png").convert("RGBA"), (50, 60))
    draw = ImageDraw.Draw(image)
    titre = police(True, 86)
    draw.text((62, 361), "Undercover", font=titre, fill=BLANC, anchor="ls")
    draw.text((62, 456), textes["tagline"], font=titre, fill=ACCENT, anchor="ls")
    sous_titre = police(False, 36)
    # Lignes équilibrées : la plus petite largeur qui garde le même nombre de lignes qu'à 560 px.
    n = len(lignes(draw, textes["text"], sous_titre, 560))
    largeur = draw.textlength(textes["text"], font=sous_titre) / n
    while len(lignes(draw, textes["text"], sous_titre, largeur)) > n:
        largeur += 10
    for i, ligne in enumerate(lignes(draw, textes["text"], sous_titre, largeur)):
        draw.text((62, 535 + i * 48), ligne, font=sous_titre, fill=BLANC, anchor="ls")
    # Éventail de dos de cartes : règles 7, 3, puis 1 au premier plan, avec son texte.
    poser(image, dos(7), (1035, 290), -4)
    poser(image, dos(3), (970, 315), -8)
    poser(image, dos(1, textes), (900, 360), -13)
    return image.convert("RGB")


def main():
    sortie = subprocess.run(["node", "--input-type=module", "-e", LECTURE], cwd=RACINE, capture_output=True, text=True, encoding="utf-8", check=True)
    for lang, textes in json.loads(sortie.stdout).items():
        chemin = RACINE / f"img/apercu-{lang}.png"
        apercu(textes).save(chemin, optimize=True)
        print(chemin.relative_to(RACINE))


if __name__ == "__main__":
    main()
