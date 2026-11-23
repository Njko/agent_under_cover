# Fonctionnement technique

Ce document explique comment fonctionne Undercover IA responsable et justifie qu'il s'agit d'une **application non connectée** : aucun serveur applicatif, aucune base de données, aucun échange de données entre les téléphones ni vers un service tiers.

## En résumé

| Question | Réponse |
| --- | --- |
| Y a-t-il un serveur applicatif, une API, une base de données ? | **Non.** Un simple serveur de fichiers statiques (GitHub Pages, nginx…) envoie des fichiers HTML, CSS, JavaScript et images. Il ne reçoit, ne calcule et ne stocke rien. |
| Les téléphones communiquent-ils entre eux ? | **Non.** Chaque téléphone recalcule seul sa carte à partir du code de la partie. |
| Des données sont-elles envoyées quelque part ? | **Non.** L'application ne fait que des requêtes `GET` vers son propre site, pour télécharger ses fichiers. Aucun formulaire n'est envoyé, aucun appel d'API n'existe. |
| Y a-t-il des comptes, des cookies, des traceurs, des statistiques ? | **Non.** Aucun cookie, aucune mesure d'audience, aucune publicité, aucune police ou bibliothèque chargée depuis un autre site. |
| Où sont les données de jeu (prénoms, scores) ? | **Uniquement sur les téléphones** (stockage local du navigateur), et dans les liens/QR codes que les participants s'échangent en présentiel. |
| Est-ce garanti techniquement ? | **Oui.** Une politique de sécurité du contenu (CSP) interdit au navigateur de contacter tout autre site que celui de l'application, et en Kubernetes une NetworkPolicy interdit au serveur toute connexion sortante. |

## Architecture

```mermaid
flowchart LR
    S[("Serveur de fichiers statiques<br>GitHub Pages ou nginx")]
    A["Téléphone de l'animateur"]
    J1["Téléphone du joueur 1"]
    J2["Téléphone du joueur 2"]
    S -- "1 · GET des fichiers (HTML, CSS, JS, images)" --> A
    S -- "1 · GET des fichiers" --> J1
    S -- "1 · GET des fichiers" --> J2
    A -. "2 · QR code affiché à l'écran, scanné en présentiel" .-> J1
    A -. "2 · QR code" .-> J2
```

1. Chaque téléphone télécharge les fichiers de l'application, comme pour n'importe quelle page web. C'est le **seul** trafic réseau.
2. Les informations de la partie passent d'un téléphone à l'autre par un **QR code affiché à l'écran** (ou un lien copié), jamais par le réseau de l'application.

Il n'y a pas de flèche entre les téléphones et le serveur dans l'autre sens : le serveur ne reçoit jamais de donnée de jeu.

## Comment les téléphones jouent sans communiquer

Le jeu repose sur une **distribution déterministe** (`js/game.js`) :

1. L'animateur crée une partie. L'application tire une graine aléatoire et l'assemble avec les paramètres (édition, mode, jeu de cartes, nombre de joueurs, undercovers et leurs cartes, règles d'or, ordre, nombre de manches) dans un **code de 9 caractères** (45 bits, dont 6 de somme de contrôle contre les fautes de frappe).
2. Les joueurs reçoivent ce code via le QR code. Chaque téléphone exécute le **même calcul** à partir de *(code, numéro de manche, numéro de joueur)* et obtient exactement la même distribution des cartes que celui de l'animateur.
3. Le passage à la manche suivante se fait de la même façon, sans nouvel échange : chacun appuie sur « Manche suivante ».
4. Pour répartir le rôle d'undercover et la prise de parole, chaque téléphone recalcule aussi les manches précédentes : un joueur qui a déjà eu le rôle a 4 fois moins de chances de l'avoir de nouveau. Le calcul reste identique sur tous les appareils.

Les tests automatiques (`npm test`) vérifient que deux appareils obtiennent toujours la même distribution à partir du même code.

Le moteur désigne chaque carte par un identifiant (`classique:R1-C03`, `po:R2-U01` : édition, règle, type et rang dans `js/cards.js`), jamais par son texte. Corriger ou traduire un texte ne change donc pas la distribution ; ajouter, supprimer ou déplacer une carte la change.

## Textes de l'interface

Les textes affichés ne sont pas écrits dans le code : ils sont rangés par clé dans `js/i18n/fr.js` (le français, langue de référence) et affichés par la fonction `t("clé", { paramètres })` de `js/i18n.js`. Les pluriels s'appuient sur `Intl.PluralRules` et les dates sur `toLocaleDateString`, intégrés au navigateur : aucune bibliothèque, aucune requête.

Langues proposées : `LANGUAGES` dans `js/i18n.js`. Chaque langue a deux fichiers : `js/i18n/<langue>.js` pour l'interface (mêmes clés que `fr.js`) et `js/i18n/cards-<langue>.js` pour les règles d'or et les cartes, rangées par identifiant de carte. Les textes français des cartes restent dans `js/cards.js`, qui reste la source de l'export Excel ; `cardText()` et `ruleText()` renvoient le texte dans la langue active. Seuls les fichiers de la langue active sont chargés à l'ouverture ; le service worker les garde tous en cache pour le hors-ligne.

Langues actuelles : français (référence), anglais, allemand, italien et espagnol. Les traductions sont à faire relire par des personnes du métier dans chaque pays. Pour **ajouter une langue** : créez `js/i18n/<code>.js` et `js/i18n/cards-<code>.js` (en partant de l'anglais pour la structure), ajoutez le code à `LANGUAGES`, puis lancez `npm run liens:generer` et `npm run apercu`, ajoutez les fichiers et les pages `links/<code>/join/` et `links/<code>/results/` à `ASSETS` dans `sw.js`, et traduisez la dernière entrée de `js/changelog.js`. `npm test` signale tout oubli.

La langue est un réglage du téléphone, pas de la partie : elle n'entre pas dans le code de partie, et des joueurs d'une même partie peuvent jouer dans des langues différentes. Ordre de choix : langue choisie sur le téléphone (`lang`), sinon celle du lien ouvert, sinon la première langue du navigateur que le jeu connaît, sinon le français. Les tests (`tests/i18n.test.js`) vérifient que chaque traduction est complète : mêmes clés et mêmes paramètres que le français, une traduction pour chaque carte et chaque explication.

## Éditions spéciales

Le jeu existe en plusieurs éditions (`EDITIONS` dans `js/cards.js`) : « Classique » et « Product Owner ». Elles partagent les 7 règles d'or, leurs dos de cartes et la même répartition en jeu de base et extension (44 + 88 cartes) : seules les situations changent. L'édition est stockée sur 3 bits dans le code de partie (la graine fait 16 bits) : les joueurs qui rejoignent une partie en héritent sans rien choisir. `data-edition` posé sur `<html>` change le thème (couleur verte, bandeau hachuré, badge dans la barre du haut). Pour ajouter une édition, ajouter une entrée à la fin de `EDITIONS` (8 au maximum : au-delà, recycler une édition existante) et, si besoin, un bloc `:root[data-edition="…"]` dans `css/style.css`.

### Aperçu des liens (Teams, messageries)

Teams et les messageries lisent le HTML d'un lien sans exécuter le JavaScript et ignorent le fragment (`#…`) : tous les liens `/#/…` avaient donc le même titre, celui d'`index.html`. Chaque type de lien passe par une **page d'entrée** statique, dans chaque langue : `links/<langue>/<page>/index.html`, qui porte son propre `<title>`, sa description et son image dans la langue du lien (`og:title`, `og:description`, `og:locale`, `og:image` = `img/apercu-<langue>.png`, 1200 × 630). `js/entree.js` retient la langue du lien sur le téléphone (`linkLang`, utilisée si le joueur n'a pas choisi sa langue), puis redirige vers l'application en gardant le fragment, ou vers la route de la page (`data-route`) quand il n'y en a pas.

| Page (`links/<langue>/…`) | Utilisée par | Aperçu (en français) |
| --- | --- | --- |
| `join/` | liens et QR codes de la partie (`joinUrl`), dans la langue de l'animateur | « Rejoindre une partie » |
| `results/` | lien des résultats (`resultsUrl`), dans la langue de l'animateur | « Résultats de la partie » |
| `cards/`, `rules/`, `news/` | à coller à la main (l'application ne les génère pas) | catalogue, règles, nouveautés |

Ces pages sont **générées** par `npm run liens:generer` (`scripts/liens-generer.mjs`) à partir des textes `link.*` de `js/i18n/<langue>.js` et de la CSP d'`index.html`, puis versionnées : le site reste statique. Les images d'aperçu sont générées par `npm run apercu` (`scripts/apercu.py`, Python avec Pillow et Node.js) à partir des dos de cartes et des mêmes textes. Le test `tests/liens.test.js` vérifie que les pages sont à jour et que leurs images existent. Les anciennes pages `liens/<page>/` (en français, sans langue de lien) restent en place pour les liens déjà partagés.

L'accueil (`index.html`) porte les mêmes balises, en français. Le code de partie, les prénoms et les scores restent dans le fragment : ils ne partent ni vers le serveur ni vers Teams, et **l'aperçu ne peut donc pas décrire la partie** (édition, joueurs). Pour ajouter une page : ajoutez-la à `PAGES` dans `scripts/liens-generer.mjs`, avec ses textes `link.<page>.title` et `link.<page>.description` dans chaque langue. Teams garde l'aperçu en cache : les liens déjà envoyés ne changent pas. `og:image` doit être une adresse absolue (les messageries ne résolvent pas les chemins relatifs) : elle pointe sur GitHub Pages (`SITE` dans `scripts/liens-generer.mjs`). Sur un autre hébergement (image Docker, autre domaine), le titre et la description restent corrects mais la vignette vient de GitHub Pages : changez cette adresse dans le script, `index.html` et les pages de `liens/` si le site est publié ailleurs.

### Mode « Distribuer sur ce téléphone » (masqué)

Héritage du jeu d'origine : l'animateur fait passer un seul téléphone, chaque joueur y découvre sa carte à son tour (route `#/pass/<code>`, écran `viewPass` dans `js/app.js`). Cette fonction est **conservée mais masquée** : le bouton a été retiré de l'écran d'animateur (`viewHost`), et l'aide ainsi que le README n'en parlent plus, car elle n'a pas de sens quand l'animateur projette son écran. La route reste active (un lien direct fonctionne encore). Pour la réactiver, remettre dans `viewHost` le lien `<a class="btn" href="#/pass/${code}">Distribuer sur ce téléphone</a>` (à l'emplacement du commentaire qui le remplace) et la phrase correspondante dans l'aide.

## Ce qui transite dans les liens et QR codes

Les liens de l'application placent leurs informations **après le `#`** (le fragment d'URL) :

| Lien | Contenu après le `#` |
| --- | --- |
| Rejoindre une partie | `join-CODE-N~xxxx` : code de partie, numéro du joueur (facultatif), prénoms encodés en base64url |
| Résultats de fin de partie | `results-CODE~xxxx` : prénoms et issue de chaque manche, encodés en base64url |
| Navigation interne | `#/host/CODE`, `#/play/CODE/3`… |

Le fragment d'URL **n'est jamais transmis au serveur** par le navigateur (RFC 3986, section 3.5). Le serveur ne voit passer que la demande de la page `/`, sans le code, les prénoms ni les scores.

À noter : les prénoms et résultats sont **encodés**, pas chiffrés. Toute personne qui scanne le QR code peut les lire, ce qui correspond à l'usage (des participants réunis dans la même salle).

## Ce qui est stocké sur les téléphones

Tout est stocké dans le `localStorage` du navigateur, sur l'appareil, et n'en sort jamais :

| Clé | Contenu | Appareil |
| --- | --- | --- |
| `host:CODE` | Manche en cours, joueurs éliminés ou désignés, prénoms, résultats des manches | Animateur |
| `hostPrefs` | Derniers réglages de création de partie. Les prénoms saisis ne sont pas remis d'office : un bouton « Reprendre les prénoms de la partie précédente » les propose | Animateur |
| `lastHost` | Code de la dernière partie animée | Animateur |
| `names:CODE` | Prénoms reçus via le QR code | Joueur |
| `player:CODE:N` | Manche affichée par le joueur N | Joueur |
| `lastPlayer` | Dernière partie rejointe | Joueur |
| `lang` | Langue choisie avec le sélecteur de l'accueil, de l'écran « Rejoindre une partie » ou de l'écran du joueur | Tous |
| `linkLang` | Langue du dernier lien ouvert (page d'entrée `links/<langue>/…`), utilisée si aucune langue n'a été choisie | Tous |
| `lowtech`, `timerDuration`, `debriefDuration` | Préférences d'affichage et durées des minuteurs (débat, discussion du débrief) | Tous |
| `cardsFilter`, `cardsOpen`, `seenChangelog` | Catalogue (filtre, règles dépliées) et dernière page « Nouveautés » vue | Tous |

Le service worker garde aussi une copie des fichiers de l'application (Cache Storage) pour fonctionner hors ligne.

Ces données s'effacent depuis l'application (icône corbeille sur l'accueil, « Supprimer la partie », « Effacer toutes les parties de ce téléphone ») ou en effaçant les données du site dans le navigateur.

## Les requêtes réseau, une par une

Toutes les requêtes sont des `GET` vers le site de l'application :

| Fichiers | Quand |
| --- | --- |
| `index.html`, `css/style.css`, `js/boot.js`, `js/app.js`, `js/game.js`, `js/cards.js`, `js/changelog.js`, `js/icons.js` | À l'ouverture |
| `js/xlsx.js` | Uniquement au clic sur « Exporter en Excel » (catalogue) : le classeur est créé sur l'appareil, rien n'est envoyé |
| `img/dos/regle-N-mini.webp`, `img/dos/regle-N.webp` | Selon les écrans affichés (aucune en mode low-tech) |
| `vendor/qrcode.min.js` | Uniquement sur les écrans qui affichent un QR code (animateur) |
| `sw.js`, `manifest.webmanifest`, `icons/icon.svg` | Service worker et installation sur l'écran d'accueil |

La bibliothèque de QR codes ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), licence MIT) est **hébergée avec l'application** : aucun CDN n'est utilisé.

Le service worker (`sw.js`) ne traite que les requêtes `GET` vers le site lui-même. Il ignore tout le reste et ne contacte aucun autre domaine.

**Seule exception, volontaire :** la page « Pourquoi un Web low-tech ? » contient deux liens vers Low-tech Magazine. Ils ne s'ouvrent que si l'utilisateur les touche, dans un nouvel onglet, sans transmettre l'adresse de la page d'origine (`Referrer-Policy: no-referrer`).

## Les garanties techniques

### Politique de sécurité du contenu (CSP)

`index.html` déclare une CSP, que le serveur nginx de l'image Docker envoie aussi en en-tête HTTP :

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self';
font-src 'none'; object-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'self';
manifest-src 'self'; base-uri 'self'; form-action 'none'
```

Avec cette politique, le navigateur **refuse** de charger un script, une image, une police ou une feuille de style venant d'un autre site. Il refuse aussi d'y envoyer des données (`fetch`, `sendBeacon`, WebSocket) et de soumettre un formulaire. Même un code ajouté par erreur ne pourrait pas faire sortir de données. Pour que cette politique soit stricte, l'application n'a aucun script ni aucun style écrit directement dans le HTML.

L'en-tête HTTP ajoute `frame-ancestors 'none'` (l'application ne peut pas être affichée dans le cadre d'un autre site) et plusieurs en-têtes de durcissement : `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (caméra, micro, géolocalisation désactivés), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`. Voir `deploy/nginx/default.conf`.

### Côté serveur (Kubernetes)

La NetworkPolicy `deploy/kubernetes/networkpolicy.yaml` interdit au serveur **toute connexion sortante**, y compris DNS. Le serveur ne peut que répondre aux navigateurs. Il tourne sans droits root, avec un système de fichiers en lecture seule (voir [kubernetes.md](kubernetes.md)).

### Vérification réalisée

Mesures faites le 22/10/2026 dans Chrome (émulation iPhone 13), sur un parcours complet joué dans les quatre combinaisons (coopératif et compétitif, affichage normal et low-tech) : création de partie, QR codes, minuteur, désignations, débrief, fin de partie, joueur qui rejoint, révèle sa carte, change de manche et consulte la fin de partie, mode « Distribuer sur ce téléphone ».

- **Domaines contactés :** un seul, celui de l'application.
- **Méthodes HTTP :** `GET` uniquement.
- **Violations de la CSP :** aucune, la politique n'empêche aucune fonction de l'application.
- **Tentatives volontaires de sortie depuis la page** : `fetch` (POST), `navigator.sendBeacon`, image et script externes, WebSocket. Toutes ont été **bloquées** par le navigateur, et aucune requête n'est partie vers l'extérieur.

### Vérifier soi-même

1. Ouvrir l'application dans un navigateur de bureau, puis les outils de développement, onglet **Réseau**.
2. Jouer une partie : seules des requêtes `GET` vers le domaine de l'application apparaissent.
3. Une fois l'application chargée en HTTPS, **couper le réseau** (mode avion) : la partie continue de fonctionner, puisque le service worker sert les fichiers depuis le cache.

## Ce que voit l'hébergeur

Comme pour tout site web, le serveur de fichiers reçoit l'adresse IP du visiteur, l'heure, le fichier demandé et l'identification du navigateur. Il ne reçoit **ni** le code de partie, **ni** les prénoms, **ni** les scores (voir le fragment d'URL ci-dessus).

- **Sur GitHub Pages**, GitHub conserve ses journaux techniques selon sa propre politique.
- **Sur votre infrastructure**, les journaux d'accès de nginx vont sur la sortie standard du conteneur. Pour ne rien journaliser, ajoutez `access_log off;` dans le bloc `server` de `deploy/nginx/default.conf`.

## Limites assumées

- **Fair-play :** le code de partie permet en théorie de calculer les cartes de tous les joueurs, comme on pourrait regarder la carte d'un voisin dans un jeu physique.
- **Scores côté animateur uniquement :** les scores sont tenus sur son téléphone, faute de serveur. Les joueurs les reçoivent en scannant le QR code des résultats.
- **Mode hors ligne :** il nécessite HTTPS, ce qui est le cas sur GitHub Pages et derrière un ingress TLS.
