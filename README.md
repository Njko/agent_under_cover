# Undercover · IA responsable

Serious game inspiré d'**Undercover**, construit à partir du jeu de cartes « IA responsable » (7 règles, 44 cartes).
L'application est **100 % statique** : elle tourne sur GitHub Pages, sans serveur ni base de données, et chaque participant joue sur son téléphone.

## Principe du jeu

- L'animateur saisit les **prénoms** des joueurs : chacun touche son prénom en rejoignant la partie.
- Il choisit le **nombre de manches** et les **règles d'or** jouées (toutes, quelques-unes ou une seule), au hasard ou dans l'ordre.
- À chaque manche, une règle est tirée parmi celles choisies (toutes passent avant qu'une revienne) et annoncée : les cartes apparaissent face cachée avec le dos de la règle.
- Les **civils** reçoivent chacun une bonne pratique de cette règle (cartes différentes tant que possible).
- L'**undercover** reçoit la carte « UNDERCOVER » de la règle : elle parle du même sujet mais *enfreint* la règle.
- Deux **modes de jeu**, choisis à la création :
  - **Coopératif** (par défaut) : l'application ne révèle aucun rôle (celui qui a la carte undercover peut la reconnaître, mais la lit comme les autres). Chacun **lit sa carte à voix haute**, l'équipe débat puis désigne un suspect ; un civil désigné à tort est disculpé et reste en jeu. **Score d'équipe** : 3 points si l'undercover est trouvé au premier vote, 2 au deuxième, 1 au troisième, 0 ensuite.
  - **Compétitif** : l'undercover **sait qu'il l'est** en retournant sa carte et bluffe. Chacun peut garder sa carte sous les yeux mais la **décrit avec ses mots**. Vote, élimination ; le score compte les **manches gagnées par chaque camp** (civils contre undercover).
- Débat **chronométré** (30 s à 2 min, 1 min par défaut, avec signal sonore), puis **débrief** : l'app affiche la règle, la carte undercover, *pourquoi* elle enfreint la règle, des questions de discussion (dont une propre à chaque règle) et un minuteur de discussion (3, 5 ou 10 min).
- **Fin de partie** : score de l'équipe (ou des deux camps) et récapitulatif des manches sur l'écran de l'animateur, avec un QR code qui transmet les résultats aux téléphones des joueurs.
- Chaque partie peut être **supprimée** du téléphone (accueil, tableau de bord ou fin de partie).

## Comment ça marche sans serveur ?

GitHub Pages ne sert que des fichiers statiques : les téléphones ne peuvent pas échanger de données entre eux.
L'app utilise donc une **distribution déterministe** :

1. L'animateur crée une partie. L'app génère un **code de 8 caractères** (ex. `BVWA RY5W`) qui contient une graine aléatoire et les paramètres (mode de jeu, nombre de joueurs, undercovers, règles jouées, ordre, nombre de manches), plus une somme de contrôle contre les fautes de frappe.
2. Les joueurs scannent le **QR code** et touchent **leur prénom** : les prénoms sont inclus dans le lien du QR code. Avec le code saisi à la main, ils choisissent leur numéro.
3. Chaque téléphone recalcule seul, à partir de *(code, manche, numéro)*, exactement la même distribution que celle de l'animateur. Aucune donnée ne circule.
4. Pour la manche suivante, l'animateur et les joueurs appuient sur « Manche suivante » : pas besoin de rescanner.

Le téléphone de l'animateur sert de tableau de bord : premier joueur à parler, éliminations (avec révélation du rôle), détection de la victoire, scores et débrief.
S'il manque des téléphones, le mode **« Distribuer sur ce téléphone »** permet de faire passer un seul appareil.

Une fois chargée, l'app fonctionne **hors ligne** (service worker) et peut être ajoutée à l'écran d'accueil.

> Le code permet en théorie de retrouver toutes les cartes : comme pour un jeu de cartes physique, on compte sur le fair-play des joueurs.

L'application n'envoie aucune donnée : pas de backend, pas de cookie, pas de traceur, et une politique de sécurité (CSP) interdit au navigateur de contacter un autre site. Le détail et les vérifications sont dans [doc/fonctionnement-technique.md](doc/fonctionnement-technique.md).

## Mode low-tech

Le bouton **Low-tech** de l'en-tête bascule vers un affichage inspiré du [site solaire de Low-tech Magazine](https://solar.lowtechmagazine.com/) : police du système, deux encres (papier et noir, noir pur en thème sombre pour les écrans OLED), aucune ombre, couleur ni animation, dos de cartes rendus en texte avec un **dessin simplifié au trait** de chaque illustration (`js/icons.js`, SVG de moins de 1 Ko intégré à la page, qui prend la couleur du thème), images décoratives supprimées. Le choix est mémorisé ; il est activé d'office quand le téléphone est en mode « économie de données ». Une page « Pourquoi un Web low-tech ? » explique la démarche, et un indicateur affiche les données transférées.

Optimisations valables dans les deux modes : vignettes de 200 px (`-mini.webp`) pour les petits affichages, bibliothèque QR hébergée avec le site, minifiée et chargée seulement sur les écrans qui affichent un QR code, logo intégré au HTML, préchargement hors ligne limité au cœur de l'application.

Données transférées lors d'une première visite (fichiers compressés comme sur GitHub Pages) :

| Parcours | Avant | Normal | Low-tech |
| --- | ---: | ---: | ---: |
| Rejoindre une partie et voir sa carte | 292 Ko | 117 Ko | 35 Ko |
| Créer une partie et afficher le QR code | 292 Ko | 100 Ko | 43 Ko |
| Parcourir les 44 cartes | 262 Ko | 260 Ko | 35 Ko |

Les illustrations ont d'abord été tramées en 4 gris, comme sur Low-tech Magazine : légères (3 Ko) mais peu lisibles à petite taille. Elles sont désormais redessinées au trait en SVG : plus nettes, adaptées au thème sombre, et sans aucun téléchargement d'image.

## Grand écran et vidéoprojecteur

L'animateur présente le jeu depuis son ordinateur, souvent projeté. À partir de 1024 px, les écrans passent en colonnes pour exploiter toute la largeur. Le mobile reste inchangé.

| Écran | Mise en page |
| --- | --- |
| Accueil | Écran partagé : éventail et titre à gauche, actions à droite |
| Création de partie | Deux colonnes : réglages à gauche, règles d'or à droite ; bouton « Générer » toujours visible |
| Tableau de bord | Vue présentateur : règle, minuteur et joueurs (en deux colonnes) à gauche, QR code fixe à droite |
| Débrief | Carte undercover face aux cartes des civils |
| Fin de partie | Score en grand et QR code des résultats à gauche, manches à droite |
| Règles, pages joueur | Largeur de lecture limitée, centrée |

Le texte grossit légèrement sur grand écran (17 px, puis 18 px à partir de 1600 px) pour rester lisible du fond de la salle.

## Accessibilité

Audit WCAG 2.1 AA réalisé sur les deux thèmes (normal et low-tech, clair et sombre) : scan axe-core sur 13 écrans × 4 thèmes sans violation, puis tests manuels.

- **Carte secrète** : en plus de l'appui long, un bouton « Afficher ma carte » (clavier, lecteur d'écran) révèle la carte et y place le focus.
- **Modales** : nom accessible, page derrière inerte, fermeture par Échap, focus rendu à l'élément d'origine.
- **Changement d'écran** : titre de l'onglet mis à jour et focus placé sur le titre de l'écran.
- **Contrastes** ≥ 4,5:1 dans les 4 thèmes (couleurs d'état déclinées par thème), focus clavier visible, cibles tactiles de 44 px minimum.
- **Reflow** : aucun défilement horizontal à 320 px, y compris avec un texte agrandi à 200 %.
- **Annonces** (fin du minuteur, lien copié) via une zone `aria-live` ; QR codes nommés, émojis et vignettes décoratifs masqués aux lecteurs d'écran.

Reste à faire : un test avec de vrais lecteurs d'écran (VoiceOver sur iPhone, TalkBack sur Android).

## Documentation

| Document | Contenu |
| --- | --- |
| [Fonctionnement technique](doc/fonctionnement-technique.md) | Architecture, données échangées et stockées, garanties (CSP, NetworkPolicy) : pourquoi l'application n'est pas connectée |
| [Image Docker](doc/docker.md) | Construire, lancer et publier l'image nginx de l'application |
| [Kubernetes](doc/kubernetes.md) | Déployer l'image dans un cluster : manifestes, sécurité du pod, ingress, opérations |

## Déploiement

### GitHub Pages (version actuelle)

1. Fusionner cette branche dans `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'app est disponible sur `https://<compte>.github.io/<dépôt>/`.

### Autres hébergements : Docker et Kubernetes

L'application est aussi livrée sous forme d'**image Docker** (nginx sans root, lecture seule, en-têtes de sécurité). Elle est publiée sur `ghcr.io/njko/agent_under_cover` par le workflow GitHub Actions, avec des **manifestes Kubernetes** prêts à l'emploi :

```bash
npm run docker:build && npm run docker:run   # http://localhost:8080
kubectl apply -k deploy/kubernetes           # après avoir adapté l'ingress (domaine, TLS)
```

Tout autre serveur de fichiers statiques convient aussi (Azure Static Web Apps, S3 + CloudFront, Netlify…) : il suffit de servir les fichiers du dépôt en HTTPS. Voir [doc/docker.md](doc/docker.md) et [doc/kubernetes.md](doc/kubernetes.md).

## Modifier les cartes

Tout le contenu est dans [`js/cards.js`](js/cards.js) : texte des cartes, nom de chaque règle d'or (`theme`, repris du dos des cartes), énoncé court de la règle (`summary`, rappelé sur les cartes, le tableau de bord et le débrief), image du dos (`back`) explication de l'undercover (`why`) et question de débrief propre à la règle (`question`).
Les dos de cartes sont dans [`img/dos/`](img/dos) (WebP 640 px, coins transparents). Les énoncés `summary` et les explications `why` ont été **rédigés à partir des cartes** : relisez-les et ajustez-les à votre référentiel.
Après une modification, incrémentez `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version (et republiez l'image Docker si vous l'utilisez).

## Développement

```bash
npm start              # serveur local sur http://localhost:8000
npm test               # tests du moteur (Node 18+)
npm run docker:build   # image Docker undercover:local
npm run docker:run     # conteneur durci sur http://localhost:8080
npm run k8s:render     # manifestes Kubernetes rendus par Kustomize
```

Les consignes pour les agents de code (Claude Code, Codex…) sont dans [AGENTS.md](AGENTS.md).

Structure :

| Fichier | Rôle |
| --- | --- |
| `index.html`, `css/style.css` | Page unique, design mobile-first, CSP en balise meta |
| `js/boot.js` | Applique le mode low-tech avant le premier affichage |
| `js/cards.js` | Contenu du jeu |
| `img/dos/regle-N.webp`, `-mini.webp` | Dos des cartes : grand format et vignette |
| `js/icons.js` | Dessins simplifiés des 7 illustrations (mode low-tech) |
| `js/game.js` | Moteur déterministe : code de partie, distribution, conditions de victoire |
| `js/app.js` | Écrans (accueil, animateur, joueur, distribution, débrief, règles, catalogue) |
| `vendor/qrcode.min.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), minifié, chargé à la demande |
| `sw.js`, `manifest.webmanifest` | Fonctionnement hors ligne / installation |
| `doc/` | Documentation technique et d'exploitation |
| `Dockerfile`, `.dockerignore`, `deploy/nginx/default.conf` | Image Docker et configuration nginx |
| `deploy/kubernetes/` | Manifestes Kubernetes (Kustomize) |
| `.github/workflows/docker-image.yml` | Construction, test et publication de l'image sur ghcr.io |
