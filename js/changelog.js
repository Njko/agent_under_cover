// Notes de version affichées dans la page « Nouveautés » (#/nouveautes), de la plus récente à la plus
// ancienne. À chaque mise à jour visible des joueurs ou de l'animateur, ajoutez une entrée en tête :
// l'accueil signale « Nouveau » tant que la personne n'a pas ouvert la page.
//
// date : date de mise en ligne (AAAA-MM-JJ) ; items : changements, du point de vue des joueurs.

export const CHANGELOG = [
  {
    date: "2026-11-06",
    title: "Retours d'utilisateurs",
    items: [
      "La carte se retourne d'une touche, d'un clic ou d'un glissement, et le même geste la cache : plus besoin de garder le doigt appuyé.",
      "Faire glisser le doigt de haut en bas sur la carte fait défiler la page, comme ailleurs sur le site.",
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
