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
    title: "Le jeu en cinq langues",
    items: [
      "Le jeu est désormais disponible en français, anglais, allemand, italien et espagnol : interface, aide et toutes les cartes des deux éditions. Les traductions sont encore à relire.",
      "La langue est celle du téléphone, ou celle du lien ouvert. Pour en changer, utilisez le choix « Langue » en bas de l'accueil, de l'écran « Rejoindre une partie » ou de l'écran de sa carte : il est mémorisé sur ce téléphone.",
      "Dans une même partie, chacun peut jouer dans sa langue : le code de partie et la distribution des cartes ne changent pas.",
      "Les liens et QR codes de l'animateur sont dans sa langue : dans Teams ou une messagerie, leur aperçu (titre, description, image) est traduit.",
      "L'export Excel du catalogue contient aussi les traductions, en colonnes à côté du français, pour les faire relire.",
    ],
    en: {
      title: "The game in five languages",
      items: [
        "The game is now available in French, English, German, Italian and Spanish: interface, help and all the cards of both editions. The translations still need to be reviewed.",
        "The language follows your phone's settings, or the link you opened. To change it, use the “Language” option at the bottom of the home screen, the “Join a game” screen or your card screen: it is remembered on this phone.",
        "Within the same game, everyone can play in their own language: the game code and the cards dealt do not change.",
        "The facilitator's links and QR codes are in their language: in Teams or a messaging app, their preview (title, description, image) is translated.",
        "The catalogue's Excel export also contains the translations, in columns next to the French, so they can be reviewed.",
      ],
    },
    de: {
      title: "Das Spiel in fünf Sprachen",
      items: [
        "Das Spiel ist jetzt auf Französisch, Englisch, Deutsch, Italienisch und Spanisch verfügbar: Oberfläche, Hilfe und alle Karten beider Editionen. Die Übersetzungen müssen noch geprüft werden.",
        "Die Sprache richtet sich nach dem Telefon oder nach dem geöffneten Link. Zum Wechseln nutzen Sie die Auswahl „Sprache“ unten auf der Startseite, auf dem Bildschirm „Spiel beitreten“ oder auf dem Bildschirm Ihrer Karte: Sie wird auf diesem Telefon gespeichert.",
        "Im selben Spiel kann jeder in seiner Sprache spielen: Der Spielcode und die verteilten Karten ändern sich nicht.",
        "Die Links und QR-Codes der Spielleitung sind in ihrer Sprache: In Teams oder einem Messenger ist ihre Vorschau (Titel, Beschreibung, Bild) übersetzt.",
        "Der Excel-Export des Katalogs enthält auch die Übersetzungen, in Spalten neben dem Französischen, damit sie geprüft werden können.",
      ],
    },
    it: {
      title: "Il gioco in cinque lingue",
      items: [
        "Il gioco è ora disponibile in francese, inglese, tedesco, italiano e spagnolo: interfaccia, aiuto e tutte le carte delle due edizioni. Le traduzioni sono ancora da rivedere.",
        "La lingua è quella del telefono, o quella del link aperto. Per cambiarla, usate la scelta «Lingua» in fondo alla home, alla schermata «Entra in una partita» o alla schermata della propria carta: viene memorizzata su questo telefono.",
        "Nella stessa partita, ognuno può giocare nella propria lingua: il codice della partita e la distribuzione delle carte non cambiano.",
        "I link e i QR code di chi conduce sono nella sua lingua: in Teams o in una chat, la loro anteprima (titolo, descrizione, immagine) è tradotta.",
        "L'esportazione Excel del catalogo contiene anche le traduzioni, in colonne accanto al francese, per farle rivedere.",
      ],
    },
    es: {
      title: "El juego en cinco idiomas",
      items: [
        "El juego ya está disponible en francés, inglés, alemán, italiano y español: interfaz, ayuda y todas las cartas de las dos ediciones. Las traducciones aún están por revisar.",
        "El idioma es el del teléfono, o el del enlace abierto. Para cambiarlo, usad la opción «Idioma» al pie de la página de inicio, de la pantalla «Unirse a una partida» o de la pantalla de vuestra carta: se guarda en este teléfono.",
        "En una misma partida, cada uno puede jugar en su idioma: el código de la partida y el reparto de las cartas no cambian.",
        "Los enlaces y códigos QR de quien dirige están en su idioma: en Teams o en una mensajería, su vista previa (título, descripción, imagen) está traducida.",
        "La exportación a Excel del catálogo también contiene las traducciones, en columnas junto al francés, para que se revisen.",
      ],
    },
  },
  {
    date: "2026-11-23",
    title: "Dos de cartes plus lisibles",
    items: [
      "Le titre de la règle d'or est désormais écrit en texte sur le dos des cartes, et non plus dans l'image : il reste net à toutes les tailles d'écran et il est lu par les lecteurs d'écran. Le libellé « Règle d'or » est un peu plus clair, pour mieux ressortir sur le fond.",
      "Les illustrations et les couleurs ne changent pas.",
    ],
    en: {
      title: "Easier-to-read card backs",
      items: [
        "The golden rule's title is now written as text on the card backs, rather than in the image: it stays sharp at every screen size and is read out by screen readers. The “Golden rule” label is slightly lighter, to stand out better against the background.",
        "The illustrations and colours are unchanged.",
      ],
    },
    de: {
      title: "Besser lesbare Kartenrückseiten",
      items: [
        "Der Titel der goldenen Regel steht jetzt als Text auf der Kartenrückseite und nicht mehr im Bild: Er bleibt auf allen Bildschirmgrößen scharf und wird von Screenreadern vorgelesen. Die Beschriftung „Goldene Regel“ ist etwas heller, damit sie sich besser vom Hintergrund abhebt.",
        "Illustrationen und Farben bleiben unverändert.",
      ],
    },
    it: {
      title: "Dorsi delle carte più leggibili",
      items: [
        "Il titolo della regola d'oro è ora scritto come testo sul dorso delle carte, e non più nell'immagine: resta nitido su tutti gli schermi ed è letto dai lettori di schermo. L'etichetta «Regola d'oro» è un po' più chiara, per risaltare meglio sullo sfondo.",
        "Le illustrazioni e i colori non cambiano.",
      ],
    },
    es: {
      title: "Dorsos de las cartas más legibles",
      items: [
        "El título de la regla de oro aparece ahora como texto en el dorso de las cartas, y no en la imagen: se ve nítido en todos los tamaños de pantalla y lo leen los lectores de pantalla. La etiqueta «Regla de oro» es algo más clara, para destacar mejor sobre el fondo.",
        "Las ilustraciones y los colores no cambian.",
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
