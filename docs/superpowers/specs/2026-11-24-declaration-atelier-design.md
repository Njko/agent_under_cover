# Déclarer un atelier (comptage des participants par direction) — design

Date : 2026-11-24 · Statut : validé

## Intention

Les animateurs ne disposent d'aucun moyen de recenser les participants aux ateliers. L'équipe veut connaître le **nombre de participants par direction**. Les noms ne l'intéressent pas. Le lien du jeu circulera de plus en plus largement, sans contrôle de qui l'utilise, et il faut pouvoir compter sans remettre en cause l'engagement « application non connectée » (`doc/fonctionnement-technique.md`).

## Objectifs, non-objectifs, anti-objectifs

- **Objectif :** en créant la partie, l'animateur déclare l'atelier en une action, et les chiffres se consolident d'eux-mêmes chez l'équipe (Excel SharePoint), sans fichier à transmettre.
- **Non-objectifs :** collecter des noms, envoyer des données automatiquement, gérer la liste des directions dans l'application.
- **Anti-objectifs :**
  - l'application envoie elle-même des données (requête `fetch`/`POST`) ;
  - la CSP doit être assouplie ;
  - des données personnelles sont collectées.

## Approches envisagées

1. **Lien vers un Microsoft Forms prérempli** (retenue). L'application n'envoie rien : c'est l'animateur qui ouvre le lien, et les réponses arrivent dans l'Excel de l'équipe. Le formulaire étant réservé à l'organisation, les usages extérieurs ne faussent pas les chiffres. Limite : la déclaration dépend d'un clic.
2. **Fichier Excel horodaté téléchargé automatiquement.** Rien à héberger, mais il faut ensuite transmettre le fichier, et cette étape se perdra avec le temps.
3. **Compteur en ligne (Firebase).** Automatique, mais casse l'engagement « non connectée » : CSP, NetworkPolicy et documentation seraient à revoir, et un site public accepte des écritures parasites.

## Décisions

- **Case « Déclarer l'atelier en créant la partie »**, cochée par défaut, sur l'écran de création de partie (décision du 2026-11-24 : la déclaration se fait à la création, et rien ne s'affiche sur l'écran de la partie, projeté dans la salle). Au clic sur « Générer la partie », le formulaire s'ouvre dans un nouvel onglet (`window.open(…, "_blank", "noopener")`, dans le geste de l'utilisateur), prérempli avec le code tout juste tiré. Ce n'est pas une requête de l'application. La CSP ne bloque pas la navigation et reste inchangée.
- **Données préremplies** (aucune donnée personnelle) :

  | Champ | Valeur |
  | --- | --- |
  | Date | Date du jour |
  | Édition | Identifiant stable : `classique`, `po` |
  | Nombre de joueurs | Nombre de joueurs de la partie |
  | Code de partie | Code de la partie, pour repérer les doublons |

- **Configuration : une seule constante**, l'adresse du lien prérempli copiée depuis Forms.
  - On y laisse des **marqueurs** `__DATE__`, `__EDITION__`, `__JOUEURS__` et `__CODE__`, que l'application remplace par les valeurs (encodées) au moment de l'ouverture.
  - Aucun identifiant de question à extraire à la main : si l'équipe change le formulaire, elle recolle simplement le nouveau lien.
  - Constante vide : la case n'apparaît pas, et le jeu reste utilisable hors de l'organisation.
- **Directions saisies dans Forms**, une réponse par direction présente. Une question à choix « Direction » avec l'option « Autre » permet de saisir une direction absente de la liste. Guide pour l'équipe : `doc/formulaire-declaration.md`.
- **Règles du projet à respecter :**
  - texte de la case dans les 5 langues ;
  - deux thèmes, en clair et en sombre ;
  - cible tactile de 44 px ;
  - incrémenter `VERSION` dans `sw.js` ;
  - entrée dans `js/changelog.js` ;
  - `doc/fonctionnement-technique.md` corrigé pour dire ce qui sort, quand, et uniquement sur action de l'animateur.

## Contraintes connues de Forms

- Les réponses préremplies restent **modifiables** par l'animateur. Forms ne permet ni champ masqué ni champ en lecture seule. C'est acceptable : il s'agit de chiffres déclaratifs.
- Les types de questions acceptant le préremplissage ne sont pas documentés. Les champs préremplis seront donc des questions **Texte**, le type le plus sûr.
- Pour une question à choix, seule une valeur existant dans la liste peut être préremplie. On ne préremplit donc pas « Direction ».

## Laissé au constructeur

- Emplacement de la constante (fichier dédié ou `js/app.js`).
- Libellé exact de la case et sa place dans le formulaire de création.
- Format de la date (ISO `AAAA-MM-JJ` conseillé, pour un tri fiable dans Excel).
