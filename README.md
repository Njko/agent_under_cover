# Undercover · IA responsable

Serious game inspiré d'**Undercover**, construit à partir du jeu de cartes « IA responsable » (7 règles, 44 cartes).
L'application est **100 % statique** : elle tourne sur GitHub Pages, sans serveur ni base de données, et chaque participant joue sur son téléphone.

## Principe du jeu

- À chaque manche, une **règle** est tirée au sort (les 7 règles passent toutes avant qu'une revienne).
- Les **civils** reçoivent chacun une bonne pratique de cette règle (cartes différentes tant que possible).
- L'**undercover** reçoit la carte « UNDERCOVER » de la règle : elle parle du même sujet mais *enfreint* la règle.
- Option **Mr White** : un joueur sans carte, qui doit bluffer et peut gagner en devinant la règle.
- Tour de parole (un mot ou une phrase par joueur), débat, vote, élimination… puis **débrief** : l'app affiche la règle, la carte undercover, *pourquoi* elle enfreint la règle et des questions de discussion.

## Comment ça marche sans serveur ?

GitHub Pages ne sert que des fichiers statiques : les téléphones ne peuvent pas échanger de données entre eux.
L'app utilise donc une **distribution déterministe** :

1. L'animateur crée une partie. L'app génère un **code de 6 caractères** (ex. `YYT F8H`) qui contient une graine aléatoire et les paramètres (nombre de joueurs, undercovers, Mr White), plus une somme de contrôle contre les fautes de frappe.
2. Les joueurs scannent le **QR code** (ou saisissent le code) et choisissent **leur numéro** (l'ordre autour de la table).
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
