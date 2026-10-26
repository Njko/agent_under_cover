# Consignes pour les agents de code

Undercover IA responsable est un serious game web, en français, joué sur les téléphones des participants. C'est un **site 100 % statique, sans backend** : HTML, CSS et JavaScript (modules ES), sans framework ni étape de build.

## Commandes

```bash
npm test               # tests du moteur de jeu (node --test), à lancer après toute modification de js/
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
| `js/icons.js` | Dessins SVG du mode low-tech |
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
- **Grands écrans (≥ 1024 px, vidéoprojecteur) :** les mises en page en colonnes sont regroupées en fin de `css/style.css` et ciblent l'écran via `#app[data-view="…"]` (posé par `render()`). Les conteneurs de colonnes (`.host-side`, `.host-main`, `.debrief-uc`, `.debrief-civ`, `.results-rounds`) sont en `display: contents` sur mobile : **le rendu mobile ne doit pas changer** quand on retouche le grand écran, et l'ordre du DOM reste celui du mobile.

## Déploiement

- **GitHub Pages :** sert la branche `main` à la racine.
- **Image Docker :** construite, testée et publiée sur `ghcr.io/njko/agent_under_cover` par `.github/workflows/docker-image.yml`. Voir `doc/docker.md`.
- **Kubernetes :** manifestes Kustomize dans `deploy/kubernetes/`, avec Pod Security `restricted` et une NetworkPolicy sans aucune sortie. Voir `doc/kubernetes.md`.
