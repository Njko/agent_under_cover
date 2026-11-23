// Notes de version affichées dans la page « Nouveautés » (#/nouveautes), de la plus récente à la plus
// ancienne. À chaque mise à jour visible des joueurs ou de l'animateur, ajoutez une entrée en tête :
// l'accueil signale « Nouveau » tant que la personne n'a pas ouvert la page.
//
// date : date de mise en ligne (AAAA-MM-JJ) ; items : changements, du point de vue des joueurs.
// Traductions : une propriété par langue de js/i18n.js ({ title, items }), par exemple en. Toute nouvelle
// entrée est écrite dans toutes les langues ; les entrées plus anciennes s'affichent en français.

export const CHANGELOG = [
  {
    date: "2026-11-23",
    title: "Le jeu en anglais",
    items: [
      "Le jeu est désormais disponible en anglais : interface, aide et toutes les cartes des deux éditions. La traduction est encore à relire.",
      "La langue est celle du téléphone. Pour en changer, utilisez le choix « Langue » en bas de l'accueil ou de l'écran « Rejoindre une partie » : il est mémorisé sur ce téléphone.",
      "Dans une même partie, chacun peut jouer dans sa langue : le code de partie et la distribution des cartes ne changent pas.",
    ],
    en: {
      title: "The game in English",
      items: [
        "The game is now available in English: interface, help and all the cards of both editions. The translation still needs to be reviewed.",
        "The language follows your phone's settings. To change it, use the “Language” option at the bottom of the home screen or of the “Join a game” screen: it is remembered on this phone.",
        "Within the same game, everyone can play in their own language: the game code and the cards dealt do not change.",
      ],
    },
  },
  {
    date: "2026-11-23",
    title: "Dos de cartes plus lisibles",
    items: [
      "Le titre de la règle d'or est désormais écrit en texte sur le dos des cartes, et non plus dans l'image : il reste net à toutes les tailles d'écran et il est lu par les lecteurs d'écran. Le libellé « Règle d'or » est un peu plus clair, pour mieux ressortir sur le fond.",
      "Les illustrations et les couleurs ne changent pas. C'est une première étape vers un jeu disponible en anglais, allemand, italien et espagnol.",
    ],
    en: {
      title: "Easier-to-read card backs",
      items: [
        "The golden rule's title is now written as text on the card backs, rather than in the image: it stays sharp at every screen size and is read out by screen readers. The “Golden rule” label is slightly lighter, to stand out better against the background.",
        "The illustrations and colours are unchanged. This is a first step towards a game available in English, German, Italian and Spanish.",
      ],
    },
  },
  {
    date: "2026-11-23",
    title: "Afficher la carte d'un joueur",
    items: [
      "Mode coopératif : sur l'écran de l'animateur, le bouton en forme d'œil, à gauche de « Désigner », affiche la carte d'un joueur à tout le groupe, par exemple au vidéoprojecteur pendant qu'il la lit. Son rôle n'est pas révélé.",
      "Le mode compétitif n'a pas ce bouton : chacun y décrit sa carte avec ses mots, et l'afficher trahirait le bluff de l'undercover. La préparation de la partie le précise.",
    ],
  },
  {
    date: "2026-11-23",
    title: "Illustrations des règles d'or remises à leur place",
    items: [
      "Chaque dos de carte montre désormais l'illustration de sa règle d'or : la main qui garde le contrôle pour le contrôle humain, le bouclier pour la sécurité, l'institution reliée à tous les domaines pour la gouvernance, la feuille pour l'impact environnemental, le cercle de personnes pour l'équité et l'inclusion, le cœur pour l'IA au cœur de l'humain. Les titres et les couleurs ne changent pas.",
      "Le mode low-tech suit le même changement.",
    ],
  },
  {
    date: "2026-11-17",
    title: "Aperçu des liens, code plus long, écran animateur allégé",
    items: [
      "Les liens envoyés dans Teams ou une messagerie affichent désormais un aperçu propre : un titre qui dit ce que l'on ouvre (rejoindre une partie, résultats de la partie…) et une image du jeu. Les liens déjà envoyés gardent l'ancien aperçu.",
      "L'écran de l'animateur n'affiche plus le bouton « Distribuer sur ce téléphone », sans objet quand l'écran est projeté.",
      "Le code de partie compte désormais 9 caractères au lieu de 8, pour prévoir de nouvelles éditions spéciales. Les codes des parties en cours ne sont plus valables : créez une nouvelle partie.",
    ],
  },
  {
    date: "2026-11-17",
    title: "Édition Product Owner",
    items: [
      "Les cartes undercover sont plus difficiles à repérer : 6 cartes par règle d'or au lieu de 4, dont 2 faciles, 2 moyennes et 2 difficiles. Dans les cartes difficiles, l'infraction se cache dans un détail et la formulation ressemble à celle d'une bonne pratique.",
      "Les nouvelles cartes undercover font partie de l'extension : le jeu de base garde une carte facile par règle.",
      "Les « civils » deviennent des « équipiers », un terme plus clair pour celles et ceux qui ne connaissent pas le jeu d'origine. L'undercover garde son nom.",
      "Nouvelle édition spéciale pour les Product Owners : mêmes 7 règles d'or, mais des cartes tirées de situations de PO (discovery, backlog, recette, roadmap, parties prenantes).",
      "Une partie en édition spéciale a un thème vert et un badge dans la barre du haut, pour la distinguer d'une session générique.",
      "Le catalogue des cartes propose les deux éditions.",
    ],
  },
  {
    date: "2026-11-06",
    title: "Retours d'utilisateurs",
    items: [
      "La carte se retourne d'une touche, d'un clic ou d'un glissement, et le même geste la cache : plus besoin de garder le doigt appuyé.",
      "Faire glisser le doigt de haut en bas sur la carte fait défiler la page, comme ailleurs sur le site.",
      "L'en-tête de chaque carte affiche le numéro et le titre de sa règle d'or ; l'énoncé de la règle apparaît dans un bandeau distinct.",
      "Deux joueurs ne reçoivent plus jamais la même carte dans une manche.",
      "2 undercovers à partir de 7 joueurs seulement : en dessous, le choix reste visible mais n'est pas disponible.",
      "10 joueurs au maximum. Au-delà de 5 joueurs, le jeu de base et l'extension sont obligatoires : le jeu de base seul n'a pas assez de cartes différentes (4 bonnes pratiques seulement pour la règle 1).",
      "Un second appui sur « ? » referme l'aide et ramène à l'écran précédent.",
      "Nouvelle page « Nouveautés » : ce qui a changé à chaque mise à jour.",
      "Le catalogue des cartes s'exporte en fichier Excel, pour revoir et modifier les textes plus facilement.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Une carte par undercover",
    items: [
      "Avec 2 undercovers, l'animateur choisit s'ils ont la même carte ou une carte différente chacun (avec l'extension).",
      "Les codes de partie créés avant cette version ne sont plus acceptés.",
    ],
  },
  {
    date: "2026-10-26",
    title: "Extension métiers et fin de partie",
    items: [
      "Extension de 88 cartes tirées des métiers administratifs de l'assurance, à valider en atelier : 132 cartes au total.",
      "Les règles d'or reprennent les formulations exactes de la charte ; la page des règles présente l'objectif du jeu.",
      "Catalogue des cartes plus lisible : une section repliable par règle, des cartes de même taille, un filtre jeu de base / extension.",
      "En fin de partie, chaque manche se rouvre pour revoir qui avait quelle carte, y compris les manches non jouées d'une partie terminée plus tôt.",
      "Animations sobres dans l'affichage normal : carte qui se retourne, éventail de l'accueil, score qui progresse, débrief dévoilé dans l'ordre.",
      "Accessibilité du mode low-tech améliorée (contrastes, titres pour les lecteurs d'écran).",
    ],
  },
  {
    date: "2026-10-24",
    title: "Retours des premiers ateliers",
    items: [
      "Fin du chrono bien visible, débat d'une minute par défaut et minuteur de discussion au débrief.",
      "Le rôle d'undercover et le premier joueur tournent d'une manche à l'autre.",
      "Mode compétitif à partir de 4 joueurs ; conseils de bluff pour l'undercover et mission pour les civils.",
      "Questions de débrief propres à chaque règle d'or ; cartes undercover réécrites pour ne plus se repérer d'emblée.",
      "Messages rassurants en cas de désignation à tort, rappel « Manche suivante » côté animateur.",
    ],
  },
  {
    date: "2026-10-22",
    title: "Grand écran",
    items: ["Mise en page adaptée aux grands écrans et au vidéoprojecteur."],
  },
  {
    date: "2026-10-21",
    title: "Modes de jeu et low-tech",
    items: [
      "Modes coopératif (score d'équipe) et compétitif.",
      "Prénoms des joueurs, choix des règles d'or jouées, nombre de manches et minuteur de débat.",
      "Dos de cartes illustrés des 7 règles d'or.",
      "Mode low-tech : affichage sobre et léger, qui consomme moins de données.",
      "Corrections d'accessibilité (WCAG 2.1 AA).",
    ],
  },
  {
    date: "2026-10-20",
    title: "Première version",
    items: ["Le jeu de cartes « IA responsable » se joue sur les appareils des participants, avec un QR code pour rejoindre la partie."],
  },
];

export const LATEST_CHANGE = CHANGELOG[0].date;
