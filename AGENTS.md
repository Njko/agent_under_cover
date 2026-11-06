# Consignes pour les agents de code

Undercover IA responsable est un serious game web, en français, joué sur les téléphones des participants. C'est un **site 100 % statique, sans backend** : HTML, CSS et JavaScript (modules ES), sans framework ni étape de build.

## Commandes

```bash
npm test               # tests du moteur de jeu et de l'export Excel (node --test), à lancer après toute modification de js/
npm run cartes:export  # classeur Excel des cartes (même fichier que le bouton du catalogue)
npm start              # serveur local : http://localhost:8000
npm run docker:build   # image Docker
npm run docker:run     # conteneur durci : http://localhost:8080
npm run k8s:render     # rendu Kustomize des manifestes Kubernetes
```

## Structure

| Chemin | Rôle |
| --- | --- |
| `index.html` | Page unique (CSP en balise meta) |
| `js/boot.js` | Script classique chargé dans `<head>` : mode low-tech avant le premier affichage |
| `js/app.js` | Écrans, routeur (fragment d'URL `#/…`), minuteur, accessibilité |
| `js/game.js` | Moteur déterministe : code de partie, distribution, conditions de victoire, scores |
| `js/cards.js` | Contenu des 7 règles d'or et des 132 cartes : 44 du jeu de base (`deck: "base"`, validées) et 88 de l'extension (`deck: "ext"`, à valider) |
| `js/changelog.js` | Notes de version (page « Nouveautés ») |
| `js/xlsx.js` | Export Excel des cartes (navigateur et scripts), sans dépendance |
| `js/icons.js` | Dessins SVG du mode low-tech |
| `scripts/` | Export Excel des cartes en ligne de commande (Node, non servi) |
| `css/style.css` | Styles des deux thèmes (normal et low-tech, clair et sombre) |
| `sw.js` | Service worker (hors ligne) |
| `vendor/qrcode.min.js` | Bibliothèque QR, hébergée localement |
| `tests/` | Tests du moteur |
| `doc/` | Documentation technique et d'exploitation |
| `Dockerfile`, `deploy/` | Image nginx et manifestes Kubernetes |

## Règles à respecter

### Application non connectée

C'est un engagement documenté dans `doc/fonctionnement-technique.md`. Ne le cassez pas :

- **Pas de requête vers un autre domaine :** ni CDN, ni police web, ni API, ni analytics, ni traceur. Une dépendance tierce doit être copiée dans `vendor/`.
- **Pas d'envoi de données :** pas de `POST`, pas de backend. L'état de jeu reste dans `localStorage` et dans le fragment d'URL des liens et QR codes.
- **CSP stricte :** pas de `<script>` ni d'attribut `style="…"` écrits dans le HTML, pas de gestionnaire `on…=""`. Ajoutez le code dans un fichier `.js` et les styles dans `css/style.css`. Modifier `el.style.x` en JavaScript reste autorisé.
- **Deux copies de la CSP :** si vous la changez, mettez à jour `index.html` (balise meta) **et** `deploy/nginx/default.conf` (en-tête HTTP), puis la documentation.

### Versions et compatibilité

- À **chaque modification** d'un fichier servi, incrémentez `VERSION` dans `sw.js`. Sinon, les téléphones gardent l'ancienne version en cache.
- À chaque mise à jour **visible des joueurs ou de l'animateur**, ajoutez une entrée en tête de `js/changelog.js` (date de mise en ligne, changements du point de vue des joueurs) : c'est la page « Nouveautés ».
- Un nouveau fichier servi doit être ajouté à `ASSETS` dans `sw.js` (s'il fait partie du cœur de l'application) et, s'il est dans un nouveau dossier, au `Dockerfile` et au `.dockerignore`.
- Changer le format du code de partie (`FIELDS` dans `js/game.js`) invalide les parties en cours : signalez-le à l'utilisateur.

### Interface et accessibilité

- **Langue :** les textes de l'interface, les commentaires et les messages de commit sont en **français**.
- **Thèmes :** toute nouvelle interface doit fonctionner dans les deux thèmes (normal et low-tech), en clair et en sombre. Les couleurs passent par les variables CSS de `:root`.
- **Accessibilité (WCAG 2.1 AA) :**
  - contraste d'au moins 4,5:1 ;
  - cibles tactiles d'au moins 44 px ;
  - focus visible ;
  - libellés sur tous les champs ;
  - pas de défilement horizontal à 320 px, même avec le texte agrandi à 200 %.
- **Mode low-tech :** pas d'image décorative ni d'animation, police du système.
- **Animations (thème normal) :** courtes et sobres (transform et opacity), regroupées en fin de `css/style.css` sous `@media (prefers-reduced-motion: no-preference)` et `:root:not([data-lowtech])`. Un effet piloté en JavaScript vérifie `motionAllowed()`.
- **Grands écrans (≥ 1024 px, vidéoprojecteur) :** les mises en page en colonnes sont regroupées en fin de `css/style.css` et ciblent l'écran via `#app[data-view="…"]` (posé par `render()`). Les conteneurs de colonnes (`.host-side`, `.host-main`, `.debrief-uc`, `.debrief-civ`, `.results-rounds`) sont en `display: contents` sur mobile : **le rendu mobile ne doit pas changer** quand on retouche le grand écran, et l'ordre du DOM reste celui du mobile.

## Importer un classeur Excel de cartes

Les textes des cartes se modifient dans Excel : le bouton « Exporter en Excel » du catalogue (ou `npm run cartes:export`) produit le classeur, l'équipe le modifie, puis demande à un agent de reporter les modifications. **Il n'y a pas de script d'import : c'est vous qui mettez à jour `js/cards.js`.** La source de données reste ce fichier, publié par un commit sur `main`.

### Le classeur

- **Onglet « Cartes »** : une ligne par carte. Colonnes : `Identifiant`, `Règle` (1 à 7), `Type` (`Civil` ou `Undercover`), `Jeu` (`base` ou `ext`), `Métier`, `Texte de la carte`, `Pourquoi elle enfreint la règle (undercover)`. Les colonnes `Thème` et `Longueur du texte` sont indicatives (la longueur est une formule) : ne les reportez pas.
- **Onglet « Règles »** : `Règle`, `Thème (dos de carte)`, `Énoncé de la charte`, `Question de débrief`, qui correspondent à `theme`, `summary` et `question` dans `js/cards.js`.
- **Identifiants** : `R<règle>-C<nn>` pour la *n*-ième carte de `civilians`, `R<règle>-U<nn>` pour la *n*-ième de `undercovers` (`cardId` dans `js/xlsx.js`), **selon l'ordre de `js/cards.js` au moment de l'export**. Une ligne sans identifiant est une nouvelle carte ; une carte absente du classeur a été supprimée.
- Le classeur réenregistré par Excel est une archive compressée avec textes partagés : lisez-le avec l'outil dont vous disposez (par exemple `openpyxl` en Python), sans ajouter de dépendance au projet.

### Procédure

1. **Vérifier la base de l'export** : si `js/cards.js` a changé depuis l'export (`git log -- js/cards.js`), les identifiants peuvent ne plus correspondre. Retrouvez alors les cartes par leur texte d'origine (exportez la version de l'époque avec `git show`) ou demandez à l'utilisateur.
2. **Lister les changements avant d'écrire** : textes et explications modifiés, cartes ajoutées, supprimées ou déplacées, changements de jeu (`ext` → `base` = carte validée), énoncés et questions des règles. Montrez cette liste à l'utilisateur ; demandez confirmation pour toute suppression et pour tout changement de `theme`, qui doit rester celui imprimé au dos des cartes (`img/dos/`).
3. **Contrôler le classeur**, et signaler chaque anomalie avec son numéro de ligne plutôt que de la corriger en silence :
   - règle, type et jeu connus, texte non vide ;
   - une explication (`why`) pour chaque carte undercover, un métier (`job`) pour chaque carte de l'extension ;
   - aucun texte en double (deux joueurs ne doivent jamais recevoir la même carte) ;
   - de quoi jouer : pour chaque règle, au moins 4 bonnes pratiques et une carte undercover dans le jeu de base (parties jusqu'à `MAX_BASE_PLAYERS` = 5 joueurs), et au moins 9 bonnes pratiques avec l'extension (parties à 10 joueurs) ;
   - longueur conseillée de 100 à 170 caractères, la même pour les cartes civiles et undercover : signalez les écarts sans les bloquer.
4. **Mettre à jour `js/cards.js`** en gardant sa structure : objets `{ deck, job?, text }` pour les cartes civiles, `{ deck, job?, text, why }` pour les cartes undercover, `job` seulement pour l'extension, ordre des lignes du classeur. Ne touchez ni à `back` ni à l'en-tête du fichier.
5. **Vérifier et publier** : `npm test` (il contrôle notamment l'unicité des textes et le nombre de cartes par règle), réexportez le classeur pour comparer avec le fichier reçu, incrémentez `VERSION` dans `sw.js`, ajoutez une entrée à `js/changelog.js` si le changement est visible des joueurs, puis faites un commit en français qui résume les modifications.

Changer le texte d'une carte change la distribution des parties en cours qui l'utilisent : signalez-le à l'utilisateur.

## Déploiement

- **GitHub Pages :** sert la branche `main` à la racine.
- **Image Docker :** construite, testée et publiée sur `ghcr.io/njko/agent_under_cover` par `.github/workflows/docker-image.yml`. Voir `doc/docker.md`.
- **Kubernetes :** manifestes Kustomize dans `deploy/kubernetes/`, avec Pod Security `restricted` et une NetworkPolicy sans aucune sortie. Voir `doc/kubernetes.md`.
