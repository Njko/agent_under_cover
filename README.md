# Undercover · IA responsable

Serious game inspiré d'**Undercover**, construit à partir du jeu de cartes « IA responsable » (7 règles, 44 cartes).
L'application est **100 % statique** : elle tourne sur GitHub Pages, sans serveur ni base de données, et chaque participant joue sur son téléphone.

## Principe du jeu

- L'animateur saisit les **prénoms** des joueurs : chacun touche son prénom en rejoignant la partie.
- Il choisit le **nombre de manches** et les **règles d'or** jouées (toutes, quelques-unes ou une seule), au hasard ou dans l'ordre.
- À chaque manche, une règle est tirée parmi celles choisies (toutes passent avant qu'une revienne) et annoncée : les cartes apparaissent face cachée avec le dos de la règle.
- Les **civils** reçoivent chacun une bonne pratique de cette règle (cartes différentes tant que possible).
- L'**undercover** reçoit la carte « UNDERCOVER » de la règle : elle parle du même sujet mais *enfreint* la règle.
- Tour de parole (un mot ou une phrase par joueur), **débat chronométré** (30, 60 ou 90 secondes, avec signal sonore), vote, élimination… puis **débrief** : l'app affiche la règle, la carte undercover, *pourquoi* elle enfreint la règle et des questions de discussion.
- Points : 2 par civil quand les civils gagnent, 10 par undercover encore en jeu quand l'undercover gagne.
- **Fin de partie** : classement, podium et récapitulatif des manches sur l'écran de l'animateur, avec un QR code qui transmet les résultats aux téléphones des joueurs.
- Chaque partie peut être **supprimée** du téléphone (accueil, tableau de bord ou fin de partie).

## Comment ça marche sans serveur ?

GitHub Pages ne sert que des fichiers statiques : les téléphones ne peuvent pas échanger de données entre eux.
L'app utilise donc une **distribution déterministe** :

1. L'animateur crée une partie. L'app génère un **code de 8 caractères** (ex. `BVWA RY5W`) qui contient une graine aléatoire et les paramètres (nombre de joueurs, undercovers, règles jouées, ordre, nombre de manches), plus une somme de contrôle contre les fautes de frappe.
2. Les joueurs scannent le **QR code** et touchent **leur prénom** : les prénoms sont inclus dans le lien du QR code. Avec le code saisi à la main, ils choisissent leur numéro.
3. Chaque téléphone recalcule seul, à partir de *(code, manche, numéro)*, exactement la même distribution que celle de l'animateur. Aucune donnée ne circule.
4. Pour la manche suivante, l'animateur et les joueurs appuient sur « Manche suivante » : pas besoin de rescanner.

Le téléphone de l'animateur sert de tableau de bord : premier joueur à parler, éliminations (avec révélation du rôle), détection de la victoire, scores et débrief.
S'il manque des téléphones, le mode **« Distribuer sur ce téléphone »** permet de faire passer un seul appareil.

Une fois chargée, l'app fonctionne **hors ligne** (service worker) et peut être ajoutée à l'écran d'accueil.

> Le code permet en théorie de retrouver toutes les cartes : comme pour un jeu de cartes physique, on compte sur le fair-play des joueurs.

## Mode low-tech

Le bouton **Low-tech** de l'en-tête bascule vers un affichage inspiré du [site solaire de Low-tech Magazine](https://solar.lowtechmagazine.com/) : police du système, deux encres (papier et noir, noir pur en thème sombre pour les écrans OLED), aucune ombre, couleur ni animation, dos de cartes rendus en texte avec une illustration **tramée en 4 niveaux de gris** (`img/dos/regle-N-trame.png`, 3 Ko), images décoratives supprimées. Le choix est mémorisé ; il est activé d'office quand le téléphone est en mode « économie de données ». Une page « Pourquoi un Web low-tech ? » explique la démarche, et un indicateur affiche les données transférées.

Optimisations valables dans les deux modes : vignettes de 200 px (`-mini.webp`) pour les petits affichages, bibliothèque QR hébergée avec le site, minifiée et chargée seulement sur les écrans qui affichent un QR code, logo intégré au HTML, préchargement hors ligne limité au cœur de l'application.

Données transférées lors d'une première visite (fichiers compressés comme sur GitHub Pages) :

| Parcours | Avant | Normal | Low-tech |
| --- | ---: | ---: | ---: |
| Rejoindre une partie et voir sa carte | 292 Ko | 108 Ko | 32 Ko |
| Créer une partie et afficher le QR code | 292 Ko | 93 Ko | 37 Ko |
| Parcourir les 44 cartes | 262 Ko | 254 Ko | 52 Ko |

À noter : le tramage n'est pas magique. Appliqué à l'image entière, il donnait des fichiers **plus lourds** que le WebP (le bruit du tramage se compresse mal). Le gain vient de la combinaison : illustration seule, fond uni ramené au blanc, 160 px, 4 gris.

## Accessibilité

Audit WCAG 2.1 AA réalisé sur les deux thèmes (normal et low-tech, clair et sombre) : scan axe-core sur 13 écrans × 4 thèmes sans violation, puis tests manuels.

- **Carte secrète** : en plus de l'appui long, un bouton « Afficher ma carte » (clavier, lecteur d'écran) révèle la carte et y place le focus.
- **Modales** : nom accessible, page derrière inerte, fermeture par Échap, focus rendu à l'élément d'origine.
- **Changement d'écran** : titre de l'onglet mis à jour et focus placé sur le titre de l'écran.
- **Contrastes** ≥ 4,5:1 dans les 4 thèmes (couleurs d'état déclinées par thème), focus clavier visible, cibles tactiles de 44 px minimum.
- **Reflow** : aucun défilement horizontal à 320 px, y compris avec un texte agrandi à 200 %.
- **Annonces** (fin du minuteur, lien copié) via une zone `aria-live` ; QR codes nommés, émojis et vignettes décoratifs masqués aux lecteurs d'écran.

Reste à faire : un test avec de vrais lecteurs d'écran (VoiceOver sur iPhone, TalkBack sur Android).

## Mise en ligne sur GitHub Pages

1. Fusionner cette branche dans `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'app est disponible sur `https://<compte>.github.io/<dépôt>/`.

## Modifier les cartes

Tout le contenu est dans [`js/cards.js`](js/cards.js) : texte des cartes, nom de chaque règle d'or (`theme`, repris du dos des cartes), image du dos (`back`) et explication de l'undercover (`why`).
Les dos de cartes sont dans [`img/dos/`](img/dos) (WebP 640 px, coins transparents). Les explications `why` ont été **rédigées à partir des cartes** : relisez-les et ajustez-les à votre référentiel.
Après une modification, incrémentez `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Développement

```bash
npm start   # serveur local sur http://localhost:8000
npm test    # tests du moteur (Node 18+)
```

Structure :

| Fichier | Rôle |
| --- | --- |
| `index.html`, `css/style.css` | Page unique, design mobile-first |
| `js/cards.js` | Contenu du jeu |
| `img/dos/regle-N.webp`, `-mini.webp`, `-trame.png` | Dos des cartes : grand format, vignette, illustration tramée (low-tech) |
| `js/game.js` | Moteur déterministe : code de partie, distribution, conditions de victoire |
| `js/app.js` | Écrans (accueil, animateur, joueur, distribution, débrief, règles, catalogue) |
| `vendor/qrcode.min.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), minifié, chargé à la demande |
| `sw.js`, `manifest.webmanifest` | Fonctionnement hors ligne / installation |
