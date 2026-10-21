# Undercover · IA responsable

Serious game inspiré d'**Undercover**, construit à partir du jeu de cartes « IA responsable » (7 règles, 44 cartes).
L'application est **100 % statique** : elle tourne sur GitHub Pages, sans serveur ni base de données, et chaque participant joue sur son téléphone.

## Principe du jeu

- L'animateur saisit les **prénoms** des joueurs : chacun touche son prénom en rejoignant la partie.
- Il choisit les **règles d'or** jouées (toutes, quelques-unes ou une seule), au hasard ou dans l'ordre, et peut **annoncer la règle de chaque manche** (affichée sur son écran et sur les cartes).
- À chaque manche, une règle est tirée parmi celles choisies (toutes passent avant qu'une revienne).
- Les **civils** reçoivent chacun une bonne pratique de cette règle (cartes différentes tant que possible).
- L'**undercover** reçoit la carte « UNDERCOVER » de la règle : elle parle du même sujet mais *enfreint* la règle.
- Option **Mr White** : un joueur sans carte, qui doit bluffer et peut gagner en devinant la règle.
- Tour de parole (un mot ou une phrase par joueur), **débat chronométré** (30, 60 ou 90 secondes, avec signal sonore), vote, élimination… puis **débrief** : l'app affiche la règle, la carte undercover, *pourquoi* elle enfreint la règle et des questions de discussion.

## Comment ça marche sans serveur ?

GitHub Pages ne sert que des fichiers statiques : les téléphones ne peuvent pas échanger de données entre eux.
L'app utilise donc une **distribution déterministe** :

1. L'animateur crée une partie. L'app génère un **code de 8 caractères** (ex. `ZP33 633W`) qui contient une graine aléatoire et les paramètres (nombre de joueurs, undercovers, Mr White, règles jouées, ordre, annonce de la règle), plus une somme de contrôle contre les fautes de frappe. Les codes à 6 caractères de la première version restent valides.
2. Les joueurs scannent le **QR code** et touchent **leur prénom** : les prénoms sont inclus dans le lien du QR code. Avec le code saisi à la main, ils choisissent leur numéro.
3. Chaque téléphone recalcule seul, à partir de *(code, manche, numéro)*, exactement la même distribution que celle de l'animateur. Aucune donnée ne circule.
4. Pour la manche suivante, l'animateur et les joueurs appuient sur « Manche suivante » : pas besoin de rescanner.

Le téléphone de l'animateur sert de tableau de bord : premier joueur à parler, éliminations (avec révélation du rôle), détection de la victoire, scores et débrief.
S'il manque des téléphones, le mode **« Distribuer sur ce téléphone »** permet de faire passer un seul appareil.

Une fois chargée, l'app fonctionne **hors ligne** (service worker) et peut être ajoutée à l'écran d'accueil.

> Le code permet en théorie de retrouver toutes les cartes : comme pour un jeu de cartes physique, on compte sur le fair-play des joueurs.

## Mise en ligne sur GitHub Pages

1. Fusionner cette branche dans `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'app est disponible sur `https://<compte>.github.io/<dépôt>/`.

## Modifier les cartes

Tout le contenu est dans [`js/cards.js`](js/cards.js) : texte des cartes, intitulé de chaque règle (`theme`) et explication de l'undercover (`why`).
Les intitulés et explications ont été **rédigés à partir des cartes** (le PDF n'indique que « RÈGLE 1 » à « RÈGLE 7 ») : relisez-les et ajustez-les à votre référentiel.
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
| `js/game.js` | Moteur déterministe : code de partie, distribution, conditions de victoire |
| `js/app.js` | Écrans (accueil, animateur, joueur, distribution, débrief, règles, catalogue) |
| QR codes | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), chargé depuis jsDelivr puis mis en cache hors ligne |
| `sw.js`, `manifest.webmanifest` | Fonctionnement hors ligne / installation |
