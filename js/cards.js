// Contenu du jeu de cartes « IA responsable » (source : Jeu_de_cartes_IA_AXA_recto.pdf).
//
// Chaque règle contient :
//   - theme       : nom de la règle d'or (tel qu'imprimé au dos des cartes)
//   - summary     : énoncé court de la règle d'or, rappelé sur les cartes et à l'écran
//                   (formulation exacte du pilier correspondant de la charte IA responsable)
//   - question    : question de débrief propre à la règle, sur les notions souvent mal comprises
//   - back        : image du dos de carte (img/dos/)
//   - civilians   : cartes « bonne pratique » distribuées aux équipiers
//   - undercovers : cartes UNDERCOVER (pratiques qui enfreignent la règle), avec leur explication
//                   (why) affichée au débrief et leur difficulté (level) : 2 « easy » (infraction
//                   visible d'emblée), 2 « medium » et 2 « hard » (infraction cachée dans un détail,
//                   à peine plus longue que la bonne pratique correspondante) par règle
//
// Chaque carte indique son jeu (deck) :
//   - "base" : jeu de base, cartes validées ;
//   - "ext"  : extension, cartes à valider en atelier. job indique le métier dont la situation est
//              tirée.
// L'animateur choisit à la création de la partie de jouer avec le jeu de base seul ou avec l'extension.
//
// Pour modifier le jeu, il suffit d'éditer ce fichier : aucune autre modification n'est nécessaire.
// Chaque carte reçoit un identifiant (id) d'après sa place dans sa règle : le moteur distribue les cartes
// par identifiant. Modifier un texte ne change donc pas la distribution des parties en cours ; ajouter,
// supprimer ou déplacer une carte la change.

export const DECKS = {
  base: "Jeu de base",
  ext: "Extension",
};

export const RULES = [
  {
    id: 1,
    theme: "Contrôle humain & Responsabilité",
    back: "img/dos/regle-1.webp",
    summary: "L'IA reste sous contrôle humain à chaque étape de son utilisation.",
    question:
      "Vérifier chaque résultat de l'IA (règle 1) ou surveiller le système dans la durée (règle 2) : qui fait quoi chez vous ?",
    civilians: [
      { deck: "base", text: "L'IA produit du code. Chaque livraison passe par revue de code et tests." },
      { deck: "base", text: "Une IA suggère des réponses aux clients. Le conseiller choisit toujours la réponse finale parmi celles suggérées par l'IA." },
      { deck: "base", text: "Nous utilisons Copilot pour rédiger des comptes-rendus. Le manager relit et valide systématiquement avant diffusion." },
      { deck: "base", text: "Un modèle recommande des fraudes potentielles. L'expert fraude décide de lancer ou non une investigation." },
      { deck: "ext", job: "Gestion des sinistres", text: "Un outil d'IA lit les constats amiables et propose un partage de responsabilité. Le gestionnaire le valide ou le corrige avant d'informer l'assuré." },
      { deck: "ext", job: "Gestion des contrats", text: "Un outil d'IA pré-remplit la saisie d'une souscription à partir du permis scanné. Le gestionnaire contrôle chaque champ avant de valider le contrat." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Une IA propose le lettrage des paiements. Le comptable valide chaque rapprochement douteux avant l'écriture en comptabilité." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Un outil d'IA lit les factures d'hospitalisation et propose un montant à rembourser. Le gestionnaire valide chaque proposition avant le paiement." },
      { deck: "ext", job: "Ressources humaines", text: "Un outil d'IA classe les CV reçus pour un poste. Le recruteur ouvre chaque dossier écarté avant de valider la liste des refus." },
      { deck: "ext", job: "Réclamations", text: "Un outil d'IA signale les dossiers où une clause d'exclusion semble applicable. Le juriste examine le contrat et décide seul d'un refus de garantie." },
      { deck: "ext", job: "Relation client", text: "Un assistant IA résume l'appel en fin d'échange. Le conseiller relit le résumé et le corrige avant de l'enregistrer dans le dossier du client." },
      { deck: "ext", job: "Gestion des sinistres", text: "Un outil d'IA repère les dossiers auto qui méritent une expertise. Le gestionnaire décide seul de missionner ou non un expert." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Un modèle signale des devis dentaires au tarif inhabituel. Le gestionnaire appelle le praticien avant toute décision sur la prise en charge." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Une IA prépare les écritures de clôture mensuelle. Le chef comptable les valide une par une avant leur comptabilisation." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Les décisions d'augmentation tarifaire sont prises automatiquement par l'IA sans intervention humaine.",
        why: "Une décision à fort impact pour le client est prise sans aucune supervision humaine : l'IA décide seule au lieu d'assister.",
      },
      {
        deck: "ext",
        job: "Gestion des sinistres",
        level: "easy",
        text: "Un outil d'IA calcule les indemnités des petits sinistres habitation. Les règlements partent directement sur le compte de l'assuré, sans gestionnaire.",
        why: "Un règlement est versé sans aucune validation humaine : l'IA décide seule d'une indemnisation au lieu d'assister le gestionnaire.",
      },
      {
        deck: "ext",
        job: "Relation client",
        level: "medium",
        text: "Un assistant IA envoie les réponses aux réclamations simples. Chaque conseiller consulte l'historique de ses dossiers et signale les réponses à corriger.",
        why: "Les réponses partent avant tout contrôle : le conseiller ne relit qu'après l'envoi, quand il ne peut plus empêcher une erreur.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "medium",
        text: "Les remboursements d'optique courants sont validés par l'IA. Le gestionnaire traite les dossiers complexes et ceux que l'assuré conteste.",
        why: "L'IA décide seule des remboursements courants : personne ne les relit, sauf si l'assuré les conteste.",
      },
      {
        deck: "ext",
        job: "Gestion des sinistres",
        level: "hard",
        text: "Une IA propose un partage de responsabilité à partir des constats amiables. Le gestionnaire valide les propositions dont le niveau de confiance est faible.",
        why: "Les propositions jugées fiables par l'IA ne sont jamais validées : un niveau de confiance élevé ne garantit pas l'exactitude, et c'est là que personne ne regarde.",
      },
      {
        deck: "ext",
        job: "Ressources humaines",
        level: "hard",
        text: "Un outil d'IA classe les CV reçus pour un poste. Le recruteur relit les dossiers les mieux classés et valide la liste des candidats retenus pour entretien.",
        why: "Les dossiers écartés par l'IA ne sont jamais relus : l'IA élimine seule des candidats, la validation humaine ne porte que sur les candidats retenus.",
      },
    ],
  },
  {
    id: 2,
    theme: "Sécurité & Robustesse",
    back: "img/dos/regle-2.webp",
    summary: "Utilisation de systèmes d'IA performants, fiables et sécurisés.",
    question:
      "Tester, surveiller, pouvoir arrêter le système (règle 2) : en quoi est-ce différent de vérifier chaque résultat avant de l'utiliser (règle 1) ?",
    civilians: [
      { deck: "base", text: "Avant sa mise en production, le modèle IA a été testé sur plusieurs jeux de données représentatifs afin d'évaluer sa fiabilité et ses performances." },
      { deck: "base", text: "Les équipes métiers participent aux tests afin de vérifier que les résultats produits sont cohérents avec les besoins réels du terrain." },
      { deck: "base", text: "Un processus permet de suspendre ou désactiver rapidement le système si un problème majeur est identifié." },
      { deck: "base", text: "Une équipe surveille les performances du modèle après son déploiement afin de détecter rapidement toute dégradation ou comportement inattendu." },
      { deck: "base", text: "Lorsque l'IA manque d'informations ou n'est pas certaine de sa réponse, elle le signale au lieu d'inventer une réponse." },
      { deck: "base", text: "Des audits périodiques vérifient que le système respecte toujours les niveaux de qualité et de sécurité attendus." },
      { deck: "ext", job: "Relation client", text: "Avant son ouverture au plateau, l'outil de transcription d'appels a été testé sur de vrais appels : accents, voix âgées, bruit de fond, noms de rues." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Pendant les trois premières clôtures, le nouvel outil de lettrage tourne en parallèle de l'ancien processus, et l'équipe compare les résultats." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Si l'outil de lecture de factures se trompe de montant, un bouton le désactive et les factures repassent en saisie manuelle le temps de corriger." },
      { deck: "ext", job: "Gestion des contrats", text: "Quand l'IA de lecture ne parvient pas à lire une date sur un justificatif, elle laisse le champ vide et le signale au gestionnaire." },
      { deck: "ext", job: "Ressources humaines", text: "L'accès à l'outil d'IA de paie est réservé aux gestionnaires habilités, avec un compte nominatif et une double authentification." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "L'assistant IA des gestionnaires n'ouvre que les dossiers de leur portefeuille. Les accès sont journalisés et revus régulièrement." },
      { deck: "ext", job: "Réclamations", text: "Chaque mois, un juriste compare les résumés produits par l'IA à un échantillon de dossiers qu'il a relus, pour repérer toute baisse de qualité." },
      { deck: "ext", job: "Ressources humaines", text: "Après chaque mise à jour du barème de cotisations, l'équipe paie rejoue l'outil d'IA sur des bulletins déjà vérifiés et compare les résultats." },
      { deck: "ext", job: "Gestion des sinistres", text: "Avant son déploiement, l'outil d'IA de lecture des factures de garage est testé sur des scans froissés et des factures manuscrites, pas seulement sur des PDF propres." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Le modèle de tri des demandes a convaincu les métiers lors d'une démonstration. Il est mis en production la semaine suivante.",
        why: "Une démonstration réussie ne remplace pas des tests représentatifs : le modèle part en production sans validation de sa fiabilité.",
      },
      {
        deck: "ext",
        job: "Réclamations",
        level: "easy",
        text: "Les gestionnaires consultent l'assistant IA des dossiers avec un identifiant d'équipe unique, dont le mot de passe est affiché au mur du plateau.",
        why: "Un identifiant partagé et visible rend les accès non sécurisés et non traçables : on ignore qui consulte quels dossiers clients.",
      },
      {
        deck: "ext",
        job: "Gestion des sinistres",
        level: "medium",
        text: "L'outil de lecture des factures de garage est déployé auprès de tous les gestionnaires dès sa livraison ; un canal remonte les erreurs à l'équipe projet.",
        why: "L'outil est déployé dès sa livraison, avant tout test de fiabilité : on ne le connaît qu'à travers les erreurs que les gestionnaires remarquent.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "medium",
        text: "La direction a validé la procédure de repli de l'assistant IA lors de sa rédaction ; elle sera appliquée pour la première fois lors d'une panne.",
        why: "Un mode de repli jamais testé n'est pas fiable : on ignore s'il fonctionnera le jour d'une panne réelle.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "hard",
        text: "Le service mesure chaque mois la fiabilité de l'outil de lecture de factures à partir des factures que les comptables ont corrigées.",
        why: "Seules les erreurs remarquées par les comptables sont comptées : les erreurs non détectées échappent à la mesure, la fiabilité est surestimée.",
      },
      {
        deck: "ext",
        job: "Gestion des contrats",
        level: "hard",
        text: "Le fournisseur met à jour chaque mois le modèle qui lit les dates sur les justificatifs. L'équipe consulte les notes de version et valide la mise en service.",
        why: "L'équipe lit les notes de version mais ne teste pas le nouveau modèle sur ses propres cas : une régression passerait inaperçue.",
      },
    ],
  },
  {
    id: 3,
    theme: "Gouvernance des données et de l'IA",
    back: "img/dos/regle-3.webp",
    summary: "Instances mises en place pour garantir le contrôle et l'application des politiques d'IA.",
    question:
      "Quelles instances contrôlent les projets d'IA chez vous, et à quel moment faut-il les solliciter ?",
    civilians: [
      { deck: "base", text: "Avant de mettre le chatbot en production, l'équipe présente le projet devant un comité qui vérifie son alignement avec les politiques IA du Groupe." },
      { deck: "base", text: "Une équipe Data Science a documenté son modèle : objectif ; données utilisées ; responsables ; risques identifiés. La documentation est mise à jour à chaque évolution." },
      { deck: "base", text: "Nous utilisons un assistant IA validé par AXA. Avant son déploiement, le projet a été déclaré auprès de l'instance de gouvernance IA. Les équipes conformité et sécurité ont été consultées." },
      { deck: "base", text: "Un projet IA lancé dans plusieurs pays applique les mêmes standards de contrôle et les mêmes principes de gouvernance définis par AXA Groupe." },
      { deck: "base", text: "Une équipe souhaite réutiliser un modèle IA déjà utilisé dans un autre pays AXA. Avant de le déployer localement, elle vérifie que les données, règles et contraintes sont adaptées au contexte français." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Le projet de lecture automatique des factures est déclaré à l'instance IA, avec les données traitées, le responsable désigné et les contrôles prévus." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Le fournisseur de l'outil de scoring des impayés change de modèle. L'équipe le déclare à la gouvernance IA, qui valide avant la reprise de l'outil." },
      { deck: "ext", job: "Gestion des contrats", text: "Le responsable d'équipe tient à jour la liste des usages d'IA du service : outil, périmètre, données traitées et référent désigné." },
      { deck: "ext", job: "Gestion des contrats", text: "Une agence demande l'accès à l'outil de lecture des pièces. Le déploiement attend l'avis de la conformité sur les données qui y seront traitées." },
      { deck: "ext", job: "Réclamations", text: "Un gestionnaire imagine un usage de l'IA pour trier les courriers. Il le soumet au référent IA du service, qui l'inscrit au circuit de validation du groupe." },
      { deck: "ext", job: "Relation client", text: "Le centre de contacts affiche la liste des outils d'IA autorisés. Elle est tenue à jour avec la gouvernance et consultable par tous les conseillers." },
      { deck: "ext", job: "Relation client", text: "Un référent IA du plateau relaie les règles de la charte aux conseillers et remonte à la gouvernance les usages qu'ils expérimentent." },
      { deck: "ext", job: "Ressources humaines", text: "Un manager propose un nouvel usage de l'IA pour préparer les entretiens annuels. Le projet passe par la conformité et le DPO avant tout essai." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Avant d'utiliser l'IA de lecture des factures sur des données de santé, l'équipe la déclare au référent IA et recueille l'avis du délégué à la protection des données." },
      { deck: "ext", job: "Gestion des sinistres", text: "Toute modification des consignes de l'assistant IA de rédaction de courriers est soumise au référent IA du métier avant d'être appliquée à toute l'équipe." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Une équipe met à disposition de ses collègues un assistant IA qu'elle a développé. Elle le déclarera à la gouvernance une fois la version finale prête.",
        why: "C'est du « shadow AI » : l'outil est déployé avant toute déclaration à la gouvernance IA, sans contrôle conformité ni sécurité.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "easy",
        text: "Un gestionnaire crée avec un outil d'IA grand public un assistant de relances. Son manager l'a validé à l'oral et l'équipe s'en sert depuis un mois.",
        why: "Un accord oral du manager ne remplace pas la déclaration à la gouvernance IA : l'outil tourne sans contrôle conformité ni sécurité.",
      },
      {
        deck: "ext",
        job: "Ressources humaines",
        level: "medium",
        text: "L'équipe RH étend aux évaluations annuelles l'outil d'IA validé par la gouvernance pour les offres d'emploi, sur la base de l'autorisation initiale.",
        why: "Le nouvel usage porte sur des données plus sensibles, sans nouvelle déclaration ni revalidation : l'autorisation initiale ne le couvre pas.",
      },
      {
        deck: "ext",
        job: "Réclamations",
        level: "medium",
        text: "Un juriste a choisi lui-même un assistant IA du marché pour résumer les dossiers de réclamation, qu'il anonymise à la main avant de les saisir.",
        why: "L'outil a été choisi hors du circuit de validation, et l'anonymisation manuelle n'est pas contrôlée : des données de réclamants peuvent fuiter.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "hard",
        text: "Le résumeur de dossiers a été validé par la gouvernance à son lancement. Il traite depuis d'autres types de dossiers ; la documentation date du lancement.",
        why: "L'usage a évolué depuis la validation sans que la documentation ni la gouvernance suivent : le contrôle ne couvre plus ce que fait l'outil.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "hard",
        text: "Le prestataire de l'outil de lettrage a été validé par la gouvernance. Ses sous-traitants d'hébergement sont listés dans son contrat avec le service achats.",
        why: "Les sous-traitants ne sont connus que du service achats : la gouvernance a validé le prestataire sans examiner qui héberge les données.",
      },
    ],
  },
  {
    id: 4,
    theme: "Impact environnemental",
    back: "img/dos/regle-4.webp",
    summary: "Engagement pour stabiliser les émissions de carbone liées aux opérations d'IA.",
    question:
      "Comment suivre les émissions de carbone liées à vos usages de l'IA : calculatrice carbone, taille du modèle, nombre de requêtes… ? Qu'utilisez-vous déjà ?",
    civilians: [
      { deck: "base", text: "L'équipe limite les générations inutiles. Elle affine progressivement ses prompts au lieu de lancer des dizaines de requêtes successives." },
      { deck: "base", text: "Avant de lancer un nouveau projet IA, l'équipe utilise la calculatrice carbone du Groupe afin d'estimer l'impact environnemental de la solution envisagée." },
      { deck: "base", text: "Pour résumer les comptes-rendus de réunion, l'équipe utilise un modèle léger suffisamment performant pour la tâche. Elle a comparé plusieurs options avant son choix." },
      { deck: "base", text: "Avant d'automatiser une tâche répétitive avec l'IA, l'équipe vérifie qu'un script simple ne suffirait pas, pour éviter une consommation inutile." },
      { deck: "base", text: "Deux modèles donnent des résultats similaires. L'équipe choisit celui qui consomme moins de ressources tout en répondant aux besoins métiers." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Pour repérer les factures en doublon, l'équipe utilise une règle de calcul sur le numéro et le montant, plutôt qu'un modèle d'IA." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Pour les relances standard, l'équipe utilise un modèle léger d'IA générative. Le grand modèle est réservé aux courriers de contentieux complexes." },
      { deck: "ext", job: "Gestion des contrats", text: "L'IA de lecture n'est lancée que sur les pièces manuscrites ou de mauvaise qualité. Les documents standards sont lus par un outil classique, plus sobre." },
      { deck: "ext", job: "Réclamations", text: "L'outil d'IA de résumé n'est lancé qu'une seule fois, quand le dossier est complet, et non à chaque pièce ajoutée par le client." },
      { deck: "ext", job: "Réclamations", text: "Avant de signer, le service demande au prestataire de transcription d'appels l'empreinte carbone de son offre et la compare à celle des autres solutions." },
      { deck: "ext", job: "Relation client", text: "Au bout de trois mois, l'équipe constate que personne ne lit les résumés IA des mails simples. Elle arrête de les générer." },
      { deck: "ext", job: "Ressources humaines", text: "L'équipe génère un courrier type avec l'IA une seule fois, puis l'enregistre comme modèle réutilisable au lieu de le régénérer à chaque envoi." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Avant de demander à l'IA générative de rédiger un courrier type, le gestionnaire vérifie s'il existe déjà un modèle de lettre validé dans la bibliothèque." },
      { deck: "ext", job: "Gestion des sinistres", text: "Avant de faire analyser des photos par une IA, le gestionnaire sélectionne les quelques clichés utiles pour évaluer les dommages." },
      { deck: "ext", job: "Ressources humaines", text: "L'assistant IA d'archivage ne traite que les dossiers du personnel nouveaux ou modifiés, et non tout l'historique à chaque passage." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Pour rédiger ses synthèses internes, l'équipe utilise par défaut le modèle d'IA le plus puissant du catalogue, pour toutes ses demandes.",
        why: "Le modèle le plus puissant est utilisé par défaut, même quand un modèle plus sobre suffirait : l'impact environnemental n'est pas pris en compte.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "easy",
        text: "Pour chaque relance, le gestionnaire demande une dizaine de versions à l'IA générative, puis garde la plus naturelle. Il le fait pour tous les courriers.",
        why: "Générer une dizaine de versions de chaque courrier multiplie les requêtes inutilement, sans souci de l'empreinte carbone de l'IA.",
      },
      {
        deck: "ext",
        job: "Gestion des sinistres",
        level: "medium",
        text: "Pour chaque sinistre, l'IA générative rédige un résumé du dossier, en complément du résumé écrit par le gestionnaire.",
        why: "Le résumé de l'IA double un travail déjà fait : des requêtes inutiles, sans se demander si le besoin le justifie ni quel est l'impact.",
      },
      {
        deck: "ext",
        job: "Relation client",
        level: "medium",
        text: "Les conseillers relisent l'orthographe de leurs courriels avec l'IA générative, comme alternative au correcteur de la messagerie.",
        why: "Un outil déjà disponible est remplacé par une IA générative bien plus gourmande en ressources, sans comparaison préalable.",
      },
      {
        deck: "ext",
        job: "Gestion des contrats",
        level: "hard",
        text: "Un petit modèle résume les avenants. Le gestionnaire peut régénérer le résumé jusqu'à ce que le ton lui convienne.",
        why: "Les régénérations successives multiplient les requêtes : le gain d'un petit modèle est annulé, faute de limite fixée.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "hard",
        text: "Le service mesure chaque mois la progression du nombre d'utilisateurs de l'IA générative et se fixe pour objectif de la doubler d'ici la fin de l'année.",
        why: "L'objectif vise la hausse de l'usage et non la stabilisation des émissions : la consommation n'est pas suivie.",
      },
    ],
  },
  {
    id: 5,
    theme: "Confiance & Transparence",
    back: "img/dos/regle-5.webp",
    summary: "Une information claire et systématique est fournie lors des interactions avec les systèmes d'IA.",
    question:
      "Dans vos outils, l'utilisateur sait-il toujours qu'il échange avec une IA, et connaît-il ses limites ?",
    civilians: [
      { deck: "base", text: "L'application informe clairement l'utilisateur que l'IA peut commettre des erreurs et que certaines réponses doivent être vérifiées." },
      { deck: "base", text: "Lorsqu'un compte-rendu est généré automatiquement, une mention indique qu'il a été produit avec l'aide d'une IA et invite l'utilisateur à le relire avant diffusion." },
      { deck: "base", text: "Les collaborateurs discutent avec un assistant RH. Une bannière visible indique clairement : « Vous échangez actuellement avec un assistant alimenté par l'intelligence artificielle. »" },
      { deck: "base", text: "Quand l'assistant IA donne une réponse erronée, l'équipe le signale vite, corrige et en tire les leçons, sans chercher de coupable." },
      { deck: "base", text: "Les utilisateurs peuvent facilement savoir quand une réponse provient d'une IA ou d'un conseiller humain." },
      { deck: "base", text: "Les performances du système sont suivies régulièrement afin de détecter les erreurs ou les dérives pouvant affecter la qualité des réponses." },
      { deck: "base", text: "Un collaborateur remarque que les données utilisées par l'outil d'IA sont incomplètes. Il le signale avant que les résultats servent à prendre une décision." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Le tableau de bord des impayés précise que la prévision vient d'un modèle d'IA, avec sa date de mise à jour et ses limites connues." },
      { deck: "ext", job: "Gestion des contrats", text: "Dans l'outil, chaque champ pré-rempli par l'IA s'affiche avec une pastille distincte, pour le différencier d'une saisie humaine." },
      { deck: "ext", job: "Réclamations", text: "Quand un assuré demande comment l'IA a classé sa réclamation, le gestionnaire lui explique en termes simples les éléments pris en compte." },
      { deck: "ext", job: "Réclamations", text: "Le médiateur reçoit avec le dossier une note précisant quels outils d'IA ont servi à analyser les pièces, et à quelle étape du traitement." },
      { deck: "ext", job: "Ressources humaines", text: "Les offres d'emploi précisent qu'une IA aide à trier les candidatures, et indiquent à qui s'adresser pour obtenir des explications." },
      { deck: "ext", job: "Ressources humaines", text: "Le portail de paie rappelle aux salariés que les réponses de l'assistant IA sont indicatives et que seul le bulletin de paie fait foi." },
      { deck: "ext", job: "Gestion des sinistres", text: "Quand l'outil d'IA lit un montant sur une facture, il affiche aussi son niveau de confiance et l'endroit du document où il l'a trouvé." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Le serveur vocal annonce dès le début de l'appel que la transcription est réalisée par une IA, et laisse l'assuré la refuser." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Un chatbot répond aux demandes clients en signant du prénom d'un conseiller. Les clients apprécient ce contact personnalisé.",
        why: "Le chatbot se fait passer pour un conseiller : les clients ignorent qu'ils parlent à une IA, et leur satisfaction ne compense pas ce manque de transparence.",
      },
      {
        deck: "ext",
        job: "Réclamations",
        level: "easy",
        text: "Un client demande si une IA a traité son dossier. Le gestionnaire répond que son dossier est étudié par un conseiller, sans parler du scoring.",
        why: "Le gestionnaire cache l'usage de l'IA à un client qui pose directement la question : la transparence impose une réponse claire.",
      },
      {
        deck: "ext",
        job: "Relation client",
        level: "medium",
        text: "Un assistant IA propose des réponses aux clients. Le conseiller les relit, les signe de son nom et les envoie depuis sa messagerie.",
        why: "Le client ignore que l'IA a participé : relire une réponse ne dispense pas d'informer sur l'usage de l'IA.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "medium",
        text: "Un score de risque calculé par l'IA s'affiche dans le dossier de chaque assuré, présenté comme une donnée du contrat au même titre que les autres.",
        why: "Le score est présenté sans ses limites ni sa fiabilité : les gestionnaires ne savent pas quelle confiance lui accorder.",
      },
      {
        deck: "ext",
        job: "Gestion des sinistres",
        level: "hard",
        text: "Une IA transcrit les appels pour alimenter le dossier. Le conseiller informe l'assuré de la transcription si celui-ci pose la question.",
        why: "L'information n'est donnée que si l'assuré la demande : elle n'est ni claire ni systématique.",
      },
      {
        deck: "ext",
        job: "Gestion des contrats",
        level: "hard",
        text: "Les résumés IA de dossiers portent la mention « généré par IA » ; le gestionnaire la retire après relecture, même s'il n'a modifié qu'une phrase.",
        why: "Un résumé relu reste en grande partie produit par l'IA : sans la mention, le lecteur ne sait plus ce qu'il doit revérifier.",
      },
    ],
  },
  {
    id: 6,
    theme: "Équité & Inclusion",
    back: "img/dos/regle-6.webp",
    summary: "Des formations sur l'IA responsable, l'éthique et la durabilité sont proposées à tous.",
    question:
      "Les formations sur l'IA responsable sont-elles vraiment accessibles à tous chez vous, quels que soient le métier et le niveau ?",
    civilians: [
      { deck: "base", text: "Une nouvelle formation IA est proposée à l'ensemble des collaborateurs, quel que soit leur métier ou leur niveau technique. Des parcours débutant, intermédiaire et avancé sont disponibles." },
      { deck: "base", text: "Tous les collaborateurs concernés suivent un module obligatoire sur les usages responsables de l'IA, les risques et les bonnes pratiques." },
      { deck: "base", text: "Une communauté interne permet aux collaborateurs de partager leurs bonnes pratiques et leurs questions sur l'IA responsable." },
      { deck: "base", text: "Les collaborateurs qui découvrent l'IA bénéficient d'ateliers pratiques supplémentaires afin de progresser à leur rythme." },
      { deck: "base", text: "Les collaborateurs les plus avancés accompagnent ponctuellement leurs collègues sur les premiers cas d'usage." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Le service intègre un module sur l'IA responsable à l'accueil des nouveaux gestionnaires, avec des exemples tirés des relances et du lettrage." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Les comptables peu à l'aise avec le numérique suivent un atelier pratique en petit groupe avant de passer à l'outil de lettrage par IA." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Quand l'outil de lecture de factures évolue, une session de formation est organisée pour tous les comptables, pas seulement pour les référents." },
      { deck: "ext", job: "Gestion des contrats", text: "Une demi-journée par trimestre est réservée dans le planning du back-office pour s'entraîner à l'outil d'IA sur des dossiers réels du service." },
      { deck: "ext", job: "Gestion des contrats", text: "Les alternants et intérimaires du service suivent le module sur l'usage responsable de l'IA avant d'obtenir l'accès à l'outil de lecture des pièces." },
      { deck: "ext", job: "Réclamations", text: "La formation à l'IA responsable existe en version adaptée aux collaborateurs en situation de handicap, avec sous-titres et supports faciles à lire." },
      { deck: "ext", job: "Relation client", text: "Les conseillers du plateau suivent une formation à l'IA pendant leur temps de travail, avec des cas tirés de leurs propres appels et mails." },
      { deck: "ext", job: "Relation client", text: "Les managers de proximité suivent la formation à l'IA responsable avant leurs équipes afin de répondre aux questions des conseillers." },
      { deck: "ext", job: "Ressources humaines", text: "Le service formation organise des ateliers sur l'IA dans les agences et les centres de gestion, et pas seulement au siège." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Dès leur arrivée, les nouveaux gestionnaires suivent un module sur ce qu'on peut ou non saisir dans un outil d'IA : données de santé, secret médical." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Les formations IA sont proposées aux équipes techniques et Data. Les autres métiers reçoivent une synthèse de leurs travaux.",
        why: "La formation est réservée à une élite technique : les autres métiers sont exclus alors qu'ils utilisent aussi l'IA. L'accès à la formation doit être équitable.",
      },
      {
        deck: "ext",
        job: "Ressources humaines",
        level: "easy",
        text: "Un outil d'IA recommande les parcours de formation sur l'IA. Il ne propose les parcours avancés qu'aux salariés classés cadres.",
        why: "L'accès aux formations avancées dépend du statut et non du besoin : la formation n'est pas proposée à tous de façon équitable.",
      },
      {
        deck: "ext",
        job: "Ressources humaines",
        level: "medium",
        text: "Le module obligatoire sur l'IA responsable se tient en visioconférence le mardi matin, créneau où les équipes en horaires décalés sont absentes.",
        why: "Les équipes en horaires décalés n'ont pas de créneau adapté : l'accès à la formation n'est pas équitable en pratique.",
      },
      {
        deck: "ext",
        job: "Réclamations",
        level: "medium",
        text: "Le catalogue des formations à l'IA est envoyé chaque trimestre aux managers, libres de le transmettre à leurs équipes ou de choisir les inscrits.",
        why: "L'accès dépend du bon vouloir des managers : tous les gestionnaires ne reçoivent pas l'information, l'accès à la formation n'est pas équitable.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "hard",
        text: "Les inscriptions à la formation à l'IA ouvrent un lundi à 9 h pour 30 places, attribuées dans l'ordre ; les équipes de terrain sont alors en rendez-vous clients.",
        why: "Les places partent au premier arrivé : les équipes de terrain, en rendez-vous à cette heure, sont écartées, l'accès n'est pas équitable.",
      },
      {
        deck: "ext",
        job: "Gestion des contrats",
        level: "hard",
        text: "La formation à l'IA responsable se tient au siège, trois demi-journées par an ; les déplacements sont à la charge des agences régionales.",
        why: "Les agences régionales financent leur déplacement : les équipes éloignées ne peuvent pas toutes s'y rendre, l'accès n'est pas égal.",
      },
    ],
  },
  {
    id: 7,
    theme: "L'IA au cœur de l'humain",
    back: "img/dos/regle-7.webp",
    summary: "Chaque système d'IA doit créer de la valeur pour les clients, les collaborateurs et la société.",
    question:
      "Quel besoin concret justifie cet usage de l'IA, et comment vérifier qu'il libère vraiment du temps ?",
    civilians: [
      { deck: "base", text: "Une IA prépare les informations pertinentes avant un rendez-vous client afin de réduire les tâches administratives et permettre au conseiller de consacrer davantage de temps à l'écoute et au conseil." },
      { deck: "base", text: "Un assistant IA répond aux questions sur les procédures internes afin d'aider les nouveaux arrivants à gagner en autonomie." },
      { deck: "base", text: "Une IA analyse les dossiers afin d'identifier plus rapidement les situations nécessitant l'intervention d'un expert humain." },
      { deck: "base", text: "Un assistant IA aide les clients à comprendre leurs garanties en reformulant les informations dans un langage plus simple." },
      { deck: "base", text: "Une solution IA génère automatiquement des sous-titres et des transcriptions pour rendre les contenus accessibles à davantage de collaborateurs." },
      { deck: "ext", job: "Comptabilité et recouvrement", text: "Une IA pré-remplit les échéanciers des assurés en difficulté, ce qui laisse au gestionnaire le temps de les appeler et de trouver une solution adaptée." },
      { deck: "ext", job: "Gestion des contrats", text: "L'équipe mesure avec les gestionnaires si l'IA de pré-remplissage réduit la ressaisie, avant de l'étendre à d'autres produits." },
      { deck: "ext", job: "Réclamations", text: "Un outil d'IA repère dans une réclamation les mots signalant une détresse financière ou un décès, pour que le gestionnaire appelle l'assuré en priorité." },
      { deck: "ext", job: "Réclamations", text: "Avant de déployer l'outil de synthèse, l'équipe demande aux gestionnaires quelles tâches les ralentissent le plus et choisit l'usage de l'IA en conséquence." },
      { deck: "ext", job: "Relation client", text: "Un outil d'IA repère les clients qui rappellent pour le même sinistre et alerte le conseiller pour qu'il leur propose un suivi personnalisé." },
      { deck: "ext", job: "Relation client", text: "Une IA prépare le brouillon du compte rendu d'appel, ce qui libère du temps aux conseillers pour rappeler les clients âgés ou isolés." },
      { deck: "ext", job: "Ressources humaines", text: "Une IA prépare le dossier d'accueil d'un nouvel arrivant selon son poste. L'assistante RH consacre le temps gagné à l'accompagner." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Une IA reformule les courriers de refus en langage clair, avec les démarches possibles. Les assurés rappellent moins pour demander ce qu'ils signifient." },
      { deck: "ext", job: "Prestations santé et prévoyance", text: "Un outil d'IA repère les assurés en arrêt long sans contact depuis des mois. Le gestionnaire les rappelle pour leur proposer un accompagnement." },
      { deck: "ext", job: "Gestion des sinistres", text: "Après une tempête, une IA regroupe les déclarations par commune et type de dégât, pour rappeler en priorité les assurés les plus touchés." },
    ],
    undercovers: [
      {
        deck: "base",
        level: "easy",
        text: "Une équipe ajoute une fonctionnalité d'IA générative à son application pour l'annoncer au prochain salon. Les besoins clients seront étudiés ensuite.",
        why: "L'IA est utilisée pour l'effet vitrine, sans besoin identifié ni bénéfice mesuré pour les clients ou les collaborateurs.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "easy",
        text: "Une IA remplace les appels de suivi aux assurés en invalidité par des SMS automatiques. Les gestionnaires n'ont plus de contact direct avec eux.",
        why: "L'IA supprime le lien humain avec des assurés fragiles : elle crée du gain de volume mais pas de valeur pour les clients ni les collaborateurs.",
      },
      {
        deck: "ext",
        job: "Ressources humaines",
        level: "medium",
        text: "Un outil d'IA repère chaque semaine les télétravailleurs peu connectés et en informe leur manager pour qu'il les contacte.",
        why: "L'IA surveille les collaborateurs au lieu de les aider : elle crée de la défiance, pas de valeur pour eux.",
      },
      {
        deck: "ext",
        job: "Comptabilité et recouvrement",
        level: "medium",
        text: "L'équipe déploie un outil d'IA de relance des impayés, évalué au nombre de paiements obtenus, y compris auprès de clients en difficulté financière.",
        why: "L'efficacité est mesurée sans regarder l'effet sur les clients en difficulté : aucun bénéfice humain n'est examiné.",
      },
      {
        deck: "ext",
        job: "Relation client",
        level: "hard",
        text: "Un assistant IA répond aux questions courantes et propose au client de reformuler sa demande ou de consulter la foire aux questions.",
        why: "Le client en difficulté n'est pas orienté vers un conseiller : l'IA le garde alors qu'elle devrait libérer du temps pour les cas complexes.",
      },
      {
        deck: "ext",
        job: "Prestations santé et prévoyance",
        level: "hard",
        text: "Une IA prépare le dossier avant chaque appel d'assuré. L'équipe suit l'évolution du nombre d'appels traités par heure et par gestionnaire.",
        why: "Le temps gagné est réinvesti en cadence et non en écoute : l'IA devait libérer du temps pour le conseil.",
      },
    ],
  },
];

// --- Édition spéciale « Product Owner » -----------------------------------------------------
// Mêmes 7 règles d'or (mêmes thèmes, mêmes dos de cartes) : seules les situations changent.
// Les cartes ne parlent que de cas d'usage qu'un Product Owner a à traiter.

const PO = {
  1: {
    civilians: [
      "L'IA rédige des user stories à partir des notes d'un atelier. Le PO les relit, les corrige et reste seul à décider de ce qui entre dans le backlog.",
      "Un assistant propose une priorisation du backlog. Le PO l'utilise comme point de départ et assume l'arbitrage final devant les parties prenantes.",
      "Les critères d'acceptation générés par l'IA sont relus avec les développeurs et les testeurs avant le sprint.",
      "Un modèle suggère des demandes clients à traiter en priorité. Le PO vérifie les cas sensibles avant toute décision de roadmap.",
    ],
    undercover:
      "Pour gagner du temps, l'équipe laisse l'IA ordonner automatiquement le backlog. Le PO valide le sprint sans relire le classement proposé.",
    why:
      "Le PO délègue sa décision de priorisation à l'IA : il reste responsable de la valeur livrée, l'IA doit l'assister sans décider à sa place.",
  },
  2: {
    civilians: [
      "Avant de mettre en production une fonctionnalité d'IA, le PO fait tester le modèle sur des cas réels et des cas limites, pas seulement sur le scénario de démonstration.",
      "Les critères d'acceptation d'une fonctionnalité IA incluent le comportement attendu quand le modèle se trompe ou n'est pas sûr de sa réponse.",
      "La fonctionnalité peut être désactivée rapidement par un interrupteur (feature flag) si un problème majeur apparaît.",
      "Une revue de la qualité des réponses est planifiée à chaque sprint après la mise en production.",
      "Des utilisateurs métier participent à la recette pour vérifier que les résultats sont cohérents avec leur quotidien.",
      "L'équipe a défini des indicateurs de qualité du modèle (taux d'erreur, dérive) et surveille leur évolution.",
    ],
    undercover:
      "La démo devant les sponsors est un succès. Le PO décide de livrer la fonctionnalité IA à tous les clients dès la semaine suivante, en retirant la recette prévue pour tenir la date annoncée.",
    why:
      "Une démo réussie ne prouve pas la fiabilité du modèle : la fonctionnalité part en production sans tests représentatifs.",
  },
  3: {
    civilians: [
      "Avant de lancer l'expérimentation d'un assistant IA, le PO déclare le projet à l'instance de gouvernance et consulte la conformité et la sécurité.",
      "La documentation du produit précise ce que fait la fonctionnalité IA, quelles données elle utilise, qui en est responsable et quels risques sont connus. Elle est mise à jour à chaque évolution.",
      "Le PO vérifie dans les conditions d'usage d'un fournisseur d'IA que les données de l'entreprise ne servent pas à entraîner son modèle.",
      "Le PO anonymise les verbatims de clients avant de les confier à un outil d'IA pour les synthétiser.",
      "Une fonctionnalité IA déjà déployée dans un autre pays est revue avec le DPO et la conformité avant d'être reprise localement.",
    ],
    undercover:
      "Pour avancer vite, le PO connecte un outil d'IA grand public à l'export des tickets du support, qui contient des données clients, et prévoit de régulariser la situation une fois le gain démontré.",
    why:
      "C'est du « shadow AI » : des données clients sont envoyées à un outil non validé, sans déclaration ni contrôle conformité ou sécurité.",
  },
  4: {
    civilians: [
      "Avant de lancer une fonctionnalité IA, le PO fait estimer son impact environnemental avec le calculateur de l'entreprise et en tient compte dans la décision.",
      "Pour classer les retours utilisateurs, l'équipe compare un petit modèle et un gros modèle. Elle retient le plus sobre, car les résultats sont équivalents.",
      "Les prompts de l'équipe sont affinés avant d'être lancés en masse, plutôt que de multiplier les générations successives.",
      "Le PO se demande si une règle simple ou une recherche classique répond au besoin avant de passer à un modèle d'IA générative.",
      "Le PO fixe un budget de consommation (nombre d'appels, coût) pour les fonctionnalités IA, suivi à chaque revue de sprint.",
    ],
    undercover:
      "Le PO exige le modèle le plus puissant du marché pour toutes les fonctionnalités IA du produit, y compris pour reformuler des libellés de boutons. Il juge que la meilleure qualité est forcément le meilleur choix.",
    why:
      "Le modèle est surdimensionné pour la tâche et aucune alternative plus sobre n'a été étudiée : l'impact environnemental est ignoré.",
  },
  5: {
    civilians: [
      "L'interface indique clairement quand un contenu a été généré par l'IA.",
      "Un message rappelle à l'utilisateur que l'IA peut se tromper et qu'il doit vérifier les informations importantes.",
      "Le PO suit les retours utilisateurs sur la qualité des réponses de l'IA et les traite comme des anomalies à corriger dans le backlog.",
      "Quand un incident lié à l'IA survient, l'équipe alerte, corrige et tire les enseignements, sans chercher un responsable.",
      "Les notes de version indiquent quelles fonctionnalités reposent sur l'IA et quelles sont leurs limites connues.",
      "Le PO documente les cas où les données sources sont incomplètes ou peu fiables, pour que les décisions s'appuient dessus en connaissance de cause.",
      "Quand un utilisateur conteste une réponse de l'IA, un canal clair lui permet de la signaler et de joindre un humain.",
    ],
    undercover:
      "Les résumés d'avis clients générés par l'IA s'affichent sur la page produit sans aucune mention. Les utilisateurs pensent lire des avis rédigés par des personnes. Les retours sont excellents, donc le PO ne change rien.",
    why:
      "Les utilisateurs ignorent que le contenu vient de l'IA : de bons retours ne compensent pas l'absence de transparence.",
  },
  6: {
    civilians: [
      "Le PO vérifie que les jeux de données qui servent à tester une fonctionnalité IA représentent tous les profils d'utilisateurs, et pas seulement les plus fréquents.",
      "Les personas produits avec l'aide de l'IA sont revus pour éviter les stéréotypes.",
      "Une fonctionnalité IA est testée avec des utilisateurs de profils variés : âge, langue, handicap, aisance numérique.",
      "Le PO prévoit une alternative non IA pour les utilisateurs qui ne souhaitent pas ou ne peuvent pas passer par l'assistant.",
      "Toute l'équipe produit, y compris design et recette, est formée à l'usage responsable de l'IA, pas seulement les développeurs.",
    ],
    undercover:
      "Les critères de priorisation de l'IA sont calibrés sur les retours des clients les plus actifs. Le PO considère que ce sont les plus représentatifs et n'examine pas les autres profils.",
    why:
      "Les besoins des utilisateurs moins actifs ou moins visibles sont ignorés : les critères ne sont ni vérifiés ni équitables.",
  },
  7: {
    civilians: [
      "Le PO a identifié un vrai besoin utilisateur, avec une mesure de départ, avant de proposer une fonctionnalité d'IA. L'équipe mesure ensuite le bénéfice obtenu.",
      "L'IA prépare le contexte avant un entretien utilisateur (historique, questions déjà posées). Le PO consacre ainsi plus de temps à l'écoute.",
      "Un assistant IA aide les nouveaux membres de l'équipe à retrouver les décisions passées et l'historique du produit.",
      "Une fonctionnalité d'IA reformule des informations complexes en langage simple pour les utilisateurs.",
      "L'IA génère les sous-titres et les transcriptions des ateliers pour les rendre accessibles à tous les participants.",
    ],
    undercover:
      "Le PO ajoute un assistant d'IA générative au produit parce que les concurrents le font et que cela fera bien dans la prochaine communication. Aucun besoin utilisateur n'a été identifié et aucun bénéfice n'est mesuré.",
    why:
      "L'IA sert d'effet vitrine, sans besoin identifié ni bénéfice mesuré pour les utilisateurs.",
  },
};

// Extension de l'édition Product Owner : 88 cartes (67 équipiers, 21 undercovers) réparties comme
// celles de l'extension générique. Format : [domaine, texte] pour un équipier, [domaine, texte, why]
// pour un undercover. Comme l'extension générique, ces cartes sont à valider en atelier.
const PO_EXT = {
  1: {
    civilians: [
      ["Discovery", "Une IA synthétise vingt entretiens utilisateurs en grandes tendances. Le PO relit des verbatims bruts avant d'en tirer une conclusion sur le besoin."],
      ["Backlog et priorisation", "L'IA découpe une epic en stories. L'équipe revoit le découpage en affinage et en modifie plusieurs avant de les planifier."],
      ["Delivery et recette", "Un outil d'IA génère des cas de test à partir des critères d'acceptation. Le PO et les testeurs complètent les cas manquants avant la recette."],
      ["Roadmap et pilotage", "Une IA propose un scénario de roadmap pour le trimestre. Le PO le confronte aux contraintes de l'équipe et aux attentes des métiers avant de le présenter."],
      ["Parties prenantes", "L'IA rédige le compte rendu de la revue de sprint. Le PO le relit et corrige les décisions mal restituées avant de l'envoyer aux sponsors."],
      ["Retours utilisateurs", "Un outil classe automatiquement les tickets du support par thème. Le PO contrôle un échantillon chaque semaine et corrige les regroupements douteux."],
      ["Choix d'outils", "Un assistant IA compare trois solutions du marché. Le PO vérifie les informations clés auprès des fournisseurs avant de recommander un choix."],
      ["Backlog et priorisation", "L'IA détecte des doublons dans le backlog. Le PO valide chaque fusion avant de supprimer un ticket."],
      ["Roadmap et pilotage", "Un tableau de bord alimenté par l'IA signale un risque de retard sur une release. Le PO en discute avec l'équipe avant de décaler la date annoncée."],
      ["Discovery", "L'IA propose des hypothèses de valeur pour une nouvelle fonctionnalité. Le PO les fait valider ou invalider par des tests auprès d'utilisateurs avant d'investir."],
    ],
    undercovers: [
      ["Roadmap et pilotage", "Une IA décide des demandes retenues pour la prochaine release à partir d'un score de valeur. Le PO se contente d'informer les équipes de la liste.", "L'arbitrage de la roadmap est pris par un score : le PO n'exerce plus sa responsabilité sur ce qui est livré.", "easy"],
      ["Backlog et priorisation", "Un assistant IA reformule et complète les stories avant l'affinage. Les versions enrichies remplacent les originales dans le backlog.", "Le PO ne contrôle pas ce que l'IA a modifié : une story peut changer de sens sans que personne l'ait décidé.", "medium"],
      ["Parties prenantes", "Un outil d'IA rédige le compte rendu de la revue de sprint et le diffuse aux sponsors. Le PO peut le corriger dans l'outil de suivi de l'équipe.", "Le compte rendu part avant toute relecture : le PO ne peut corriger qu'après coup les décisions mal restituées.", "medium"],
      ["Backlog et priorisation", "Une IA réordonne le backlog chaque nuit selon les retours utilisateurs. Le nouvel ordre s'applique dès le lendemain matin.", "Le nouvel ordre s'applique sans validation du PO : il ne contrôle pas chaque évolution du classement.", "hard"],
      ["Discovery", "Une IA synthétise vingt entretiens utilisateurs en grands thèmes. Le PO valide chaque thème dès qu'un verbatim l'illustre.", "La validation repose sur la présence d'un verbatim et non sur son sens : le PO ne confronte pas les thèmes aux entretiens d'origine.", "hard"],
    ],
  },
  2: {
    civilians: [
      ["Discovery", "Avant d'utiliser l'IA pour analyser des entretiens, le PO l'a testée sur une étude déjà analysée à la main et a comparé les conclusions."],
      ["Delivery et recette", "L'équipe teste la fonctionnalité IA avec des questions piégeuses, des saisies absurdes et des tentatives de détournement avant la livraison."],
      ["Delivery et recette", "La fonctionnalité IA est d'abord ouverte à un petit groupe d'utilisateurs, avec un suivi rapproché, avant d'être étendue à tous."],
      ["Roadmap et pilotage", "Un indicateur de qualité des réponses de l'IA figure dans le tableau de bord du produit, avec un seuil d'alerte décidé avec l'équipe."],
      ["Delivery et recette", "Quand le fournisseur d'IA annonce un changement de version du modèle, l'équipe rejoue ses cas de test avant de l'adopter."],
      ["Backlog et priorisation", "Le backlog contient des stories pour le plan B : que fait le produit quand le service d'IA est indisponible ou trop lent ?"],
      ["Choix d'outils", "Avant de choisir un fournisseur d'IA, le PO vérifie ses engagements de disponibilité, de sécurité et de réversibilité."],
      ["Retours utilisateurs", "Les retours « la réponse de l'IA est fausse » arrivent dans un canal dédié et sont traités en priorité dans le sprint suivant."],
      ["Delivery et recette", "Les critères d'acceptation précisent le niveau d'erreur toléré pour la fonctionnalité IA, validé avec les métiers."],
    ],
    undercovers: [
      ["Roadmap et pilotage", "Personne ne suit la qualité des réponses de l'IA après la mise en production. Le PO considère qu'elle restera la même qu'à la livraison.", "Aucune surveillance après le déploiement : une dégradation ou une dérive du modèle ne serait détectée que par les utilisateurs.", "easy"],
      ["Delivery et recette", "L'équipe teste la fonctionnalité IA à partir des cas de test rédigés par le développeur qui l'a conçue, avant la livraison.", "Les tests sont écrits par celui qui connaît les limites du système : ils ne couvrent pas les cas auxquels il n'a pas pensé.", "medium"],
      ["Choix d'outils", "Le fournisseur publie chaque mois une version améliorée de son modèle, que l'équipe déploie en production le jour de sa sortie.", "La nouvelle version est déployée le jour même : l'équipe ne vérifie pas son comportement avant qu'elle n'arrive chez les utilisateurs.", "medium"],
      ["Roadmap et pilotage", "Le tableau de bord suit la qualité des réponses de l'IA : part des conversations menées à leur terme sans contestation de l'utilisateur.", "L'indicateur ne compte que les conversations menées à terme : les abandons et les erreurs non signalées passent inaperçus, il masque les cas où l'IA se trompe.", "hard"],
      ["Delivery et recette", "Le pilote de collaborateurs volontaires dure un mois ; la généralisation à tous les clients est prévue à la date fixée dans la feuille de route.", "Le passage au déploiement dépend du calendrier et non des résultats du pilote : un pilote interne ne garantit pas que la fonctionnalité convient aux clients.", "hard"],
    ],
  },
  3: {
    civilians: [
      ["Choix d'outils", "Avant de souscrire à un outil d'IA, le PO consulte la liste des outils validés par l'entreprise et demande une validation si l'outil n'y figure pas."],
      ["Discovery", "Avant d'enregistrer des entretiens utilisateurs pour les transcrire par IA, le PO recueille le consentement des participants et précise l'usage prévu."],
      ["Backlog et priorisation", "Les tickets copiés dans un outil d'IA sont d'abord débarrassés des noms, des adresses mail et des numéros de contrat."],
      ["Parties prenantes", "Le PO présente la fonctionnalité IA envisagée au comité IA de l'entreprise avant le lancement du développement."],
      ["Delivery et recette", "Le PO s'assure que les données utilisées pour tester la fonctionnalité IA sont des données de test ou anonymisées, et non des données de production."],
      ["Roadmap et pilotage", "Le registre des usages de l'IA de l'équipe est tenu à jour : outils utilisés, données concernées, responsable de chaque usage."],
      ["Choix d'outils", "Le contrat avec le fournisseur d'IA précise où sont hébergées les données, combien de temps elles sont conservées et comment les récupérer."],
      ["Parties prenantes", "Avant d'utiliser l'IA sur des documents confidentiels d'un partenaire, le PO obtient l'accord de ce dernier."],
      ["Roadmap et pilotage", "La roadmap prévoit le temps nécessaire aux validations de conformité et de sécurité des fonctionnalités IA."],
      ["Retours utilisateurs", "Le PO vérifie avec le DPO que la durée de conservation des retours clients analysés par IA est conforme à la politique de l'entreprise."],
    ],
    undercovers: [
      ["Discovery", "Pour préparer un atelier, le PO colle dans une IA publique le compte rendu complet d'un entretien avec un client, nom et contrat compris.", "Des données personnelles d'un client sont envoyées à un outil non validé : c'est une fuite de données, sans contrôle ni base légale.", "easy"],
      ["Backlog et priorisation", "Pour préparer l'affinage, le PO soumet à un assistant IA du marché des tickets du support contenant des noms de clients, depuis le compte de l'entreprise.", "Des données personnelles de clients sont envoyées à un outil non validé : un compte d'entreprise ne remplace pas la validation de la gouvernance.", "medium"],
      ["Parties prenantes", "Le PO utilise un outil d'IA pour résumer des documents confidentiels d'un partenaire et en informe celui-ci lors du comité de suivi.", "Le partenaire n'a pas donné son accord avant l'usage de ses documents : l'information arrive trop tard.", "medium"],
      ["Choix d'outils", "L'outil d'IA retenu figure sur la liste validée de l'entreprise. L'équipe active l'option d'historique, non examinée lors de la validation.", "L'option change l'usage des données : la validation de l'outil ne couvre pas cette configuration, qui n'a pas été déclarée.", "hard"],
      ["Retours utilisateurs", "Le PO fait analyser par IA les retours clients après suppression des noms et des adresses mail, le numéro de contrat servant de référence.", "Un numéro de contrat permet de retrouver le client : l'anonymisation est insuffisante, ces données restent personnelles.", "hard"],
    ],
  },
  4: {
    civilians: [
      ["Backlog et priorisation", "Pour reformuler des tickets, l'équipe utilise un petit modèle exécuté en interne, suffisant pour cette tâche."],
      ["Discovery", "Le PO regroupe ses demandes à l'IA en un seul prompt bien préparé plutôt que de relancer l'analyse à chaque nouvelle idée."],
      ["Roadmap et pilotage", "Le coût énergétique d'une fonctionnalité IA figure parmi les critères de priorisation, à côté de la valeur et de l'effort."],
      ["Delivery et recette", "L'équipe met en cache les réponses de l'IA aux questions fréquentes, au lieu de relancer le modèle à chaque fois."],
      ["Choix d'outils", "Le PO demande aux fournisseurs d'IA des informations sur la consommation de leurs modèles et en tient compte dans son choix."],
      ["Roadmap et pilotage", "L'équipe suit le nombre d'appels au modèle d'IA et cherche chaque trimestre à réduire ceux qui n'apportent rien."],
      ["Delivery et recette", "La fonctionnalité IA ne s'exécute qu'à la demande de l'utilisateur, plutôt qu'à chaque affichage d'écran."],
      ["Backlog et priorisation", "Avant d'ajouter une fonctionnalité d'IA au backlog, le PO vérifie si une règle simple ou une automatisation classique suffit."],
      ["Discovery", "Pour tester une idée, l'équipe réalise d'abord un prototype sans IA (maquette, scénario joué à la main) avant de construire quoi que ce soit."],
      ["Retours utilisateurs", "Le PO limite la fréquence de l'analyse automatique des retours clients : hebdomadaire plutôt qu'à chaque nouveau message."],
    ],
    undercovers: [
      ["Delivery et recette", "L'équipe fait générer par l'IA des centaines de variantes de textes pour un test A/B, alors que quatre suffiraient.", "Le volume de générations dépasse le besoin : de l'énergie est consommée sans bénéfice.", "easy"],
      ["Backlog et priorisation", "À chaque modification d'un ticket, l'assistant IA harmonise sa description avec celle des tickets voisins.", "Une requête est lancée à chaque modification, même minime : des calculs inutiles qui augmentent la consommation sans bénéfice.", "medium"],
      ["Discovery", "Pour analyser dix entretiens, le PO soumet les transcriptions complètes au modèle le plus puissant, à plusieurs reprises, afin de croiser les résultats.", "Relancer plusieurs fois la même analyse sur un gros modèle multiplie la consommation sans que le besoin le justifie.", "medium"],
      ["Roadmap et pilotage", "La fonctionnalité IA est généralisée au terme d'un pilote de deux mois. Son coût énergétique est mesuré après la généralisation.", "L'estimation arrive après la décision : l'impact environnemental n'est pas pris en compte avant de généraliser la fonctionnalité.", "hard"],
      ["Delivery et recette", "L'équipe met en cache les réponses de l'IA aux questions fréquentes. Le cache est reconstruit entièrement chaque nuit.", "Régénérer tout le cache chaque nuit relance des milliers de requêtes inutiles : seules les réponses devenues obsolètes devraient l'être.", "hard"],
    ],
  },
  5: {
    civilians: [
      ["Retours utilisateurs", "Le formulaire de retour est placé juste à côté de la réponse de l'IA : pouce levé ou baissé, et commentaire libre."],
      ["Discovery", "Le PO indique aux participants d'un atelier qu'une IA transcrit les échanges et leur envoie la transcription pour relecture."],
      ["Parties prenantes", "Le PO explique aux sponsors ce que la fonctionnalité IA sait faire, ce qu'elle ne sait pas faire et les taux d'erreur constatés."],
      ["Delivery et recette", "Quand l'IA ne peut pas répondre à une question, elle propose à l'utilisateur de joindre un conseiller."],
      ["Backlog et priorisation", "Les stories d'une fonctionnalité IA incluent le texte d'information destiné à l'utilisateur, relu par le juridique."],
      ["Roadmap et pilotage", "Les incidents liés à l'IA sont présentés en revue de sprint avec leur cause et les actions décidées, sans chercher de coupable."],
      ["Roadmap et pilotage", "La communication sur la roadmap distingue clairement ce qui est livré, ce qui est expérimental et ce qui repose sur l'IA."],
      ["Choix d'outils", "Le PO demande au fournisseur d'IA la documentation sur les données d'entraînement et sur les limites connues de son modèle."],
    ],
    undercovers: [
      ["Delivery et recette", "Un assistant répond aux utilisateurs avec un prénom et une photo. Rien n'indique qu'il s'agit d'une IA.", "Les utilisateurs croient parler à une personne : ne pas dire qu'on est une IA est un manque de transparence.", "easy"],
      ["Delivery et recette", "L'usage de l'IA par le bloc de résumé est décrit dans les conditions d'utilisation du produit, que l'utilisateur accepte à l'inscription.", "La mention est cachée dans les conditions d'utilisation : l'utilisateur ne sait pas, au moment de lire le résumé, qu'il vient d'une IA.", "medium"],
      ["Parties prenantes", "Le PO présente aux sponsors un taux de 94 % de bonnes réponses de la fonctionnalité IA, mesuré par l'équipe.", "Le chiffre est présenté sans protocole ni limites : les sponsors ne peuvent pas juger de sa fiabilité.", "medium"],
      ["Retours utilisateurs", "Les utilisateurs peuvent signaler une réponse erronée de l'IA depuis un lien en bas de page. Le PO examine les signalements lors du bilan produit trimestriel.", "Les erreurs signalées ne sont traitées qu'à très long terme : le canal existe mais ne permet ni de corriger ni d'informer rapidement.", "hard"],
      ["Delivery et recette", "Les notes de version indiquent les fonctionnalités reposant sur l'IA. Leurs limites connues sont documentées dans le wiki de l'équipe.", "Les limites connues ne sont pas communiquées aux utilisateurs : mentionner l'IA ne suffit pas, il faut aussi informer de ses limites.", "hard"],
    ],
  },
  6: {
    civilians: [
      ["Discovery", "Le PO recrute les participants à ses entretiens parmi des profils variés, y compris des utilisateurs peu à l'aise avec le numérique."],
      ["Delivery et recette", "L'équipe vérifie que l'assistant IA comprend les questions mal orthographiées, les accents régionaux et les messages en langage simple."],
      ["Backlog et priorisation", "Le PO ajoute au backlog des stories d'accessibilité pour les fonctionnalités IA : lecteur d'écran, contraste, navigation au clavier."],
      ["Roadmap et pilotage", "La roadmap réserve du temps pour corriger les écarts de qualité constatés entre différents profils d'utilisateurs."],
      ["Roadmap et pilotage", "Les indicateurs de qualité de l'IA sont suivis par segment d'utilisateurs, pas seulement en moyenne."],
      ["Retours utilisateurs", "Les retours analysés par IA incluent ceux de l'accueil téléphonique et des courriers, pas seulement ceux de l'application."],
      ["Delivery et recette", "Un utilisateur qui ne veut pas parler à l'assistant IA peut joindre directement un conseiller, sans parcours compliqué."],
      ["Choix d'outils", "Le PO demande au fournisseur d'IA comment il a testé les biais de son modèle avant de le retenir."],
      ["Discovery", "Les personas de l'équipe incluent des utilisateurs en situation de handicap et des aidants."],
      ["Backlog et priorisation", "Quand une IA trie ou note des demandes, l'équipe relit les critères pour s'assurer qu'ils ne pénalisent pas un groupe d'utilisateurs."],
    ],
    undercovers: [
      ["Roadmap et pilotage", "L'équipe décide de ne pas prévoir d'alternative à l'assistant IA : les utilisateurs devront s'y habituer.", "Les utilisateurs qui ne peuvent pas ou ne veulent pas l'utiliser perdent l'accès au service : l'inclusion est ignorée.", "easy"],
      ["Parties prenantes", "La formation à l'IA responsable est ouverte aux développeurs et au PO de l'équipe produit, sur inscription auprès du PO.", "Les designers et les testeurs de l'équipe ne sont pas invités : la formation n'est pas proposée à tous les membres.", "medium"],
      ["Delivery et recette", "La formation à l'IA responsable de l'équipe produit est animée en anglais par le fournisseur ; plusieurs membres de l'équipe maîtrisent peu cette langue.", "La langue exclut une partie de l'équipe : la formation n'est pas proposée à tous dans des conditions équitables.", "medium"],
      ["Backlog et priorisation", "Le PO anime chaque mois un atelier sur les bonnes pratiques de l'IA, dont les sujets sont proposés par les développeurs de l'équipe.", "Les besoins des autres métiers de l'équipe (design, recette, métier) ne sont pas pris en compte : la formation ne s'adresse pas à tous de la même manière.", "hard"],
      ["Choix d'outils", "Le fournisseur d'IA offre des licences de formation à l'IA responsable. Le PO les attribue aux membres de l'équipe qui en font la demande.", "La formation va à ceux qui la demandent, souvent les plus à l'aise : elle n'est pas proposée activement à tous.", "hard"],
    ],
  },
  7: {
    civilians: [
      ["Discovery", "L'IA retranscrit les entretiens utilisateurs en direct. Le PO, libéré de la prise de notes, peut se concentrer sur ce que dit la personne."],
      ["Backlog et priorisation", "L'IA reformule les tickets confus en langage clair, pour que toute l'équipe, technique ou non, comprenne le besoin."],
      ["Delivery et recette", "Un assistant IA répond aux questions des développeurs sur le contexte métier, qui peuvent ainsi se concentrer sur la conception."],
      ["Parties prenantes", "L'IA prépare une première version des supports de revue de sprint. Le PO consacre le temps gagné à échanger avec les parties prenantes."],
      ["Retours utilisateurs", "L'IA signale les retours qui expriment une vraie détresse ou une urgence, pour que le PO les fasse traiter par une personne rapidement."],
      ["Roadmap et pilotage", "Un assistant IA prépare une synthèse des indicateurs avant la revue de produit, pour que la discussion porte sur les décisions à prendre."],
      ["Delivery et recette", "L'IA propose aux utilisateurs une aide contextuelle dans les parcours complexes, avec un accès direct à un conseiller en cas de blocage."],
      ["Discovery", "Après un atelier, l'IA rapproche les besoins exprimés de ceux déjà identifiés pour que le PO repère rapidement les sujets vraiment nouveaux."],
      ["Choix d'outils", "Le PO teste un outil d'IA auprès des utilisateurs concernés avant de le déployer : il ne le garde que si leur travail s'en trouve amélioré."],
      ["Roadmap et pilotage", "Chaque initiative IA de la roadmap est liée à un besoin utilisateur documenté et à un indicateur de bénéfice."],
    ],
    undercovers: [
      ["Roadmap et pilotage", "Pour se démarquer lors d'un salon professionnel, le PO inscrit à la roadmap une fonctionnalité d'IA dont personne ne sait encore à quoi elle servira.", "La fonctionnalité est choisie pour l'effet vitrine, sans besoin utilisateur ni bénéfice attendu.", "easy"],
      ["Retours utilisateurs", "L'IA répond automatiquement aux avis négatifs du magasin d'applications. Le PO suit chaque mois le nombre de réponses publiées.", "Personne ne vérifie ce que ressentent les utilisateurs : l'IA parle à leur place sans créer de valeur pour eux.", "medium"],
      ["Roadmap et pilotage", "L'équipe ajoute à la roadmap un assistant IA demandé par le service client ; son succès se mesurera à la baisse du volume d'appels.", "Le besoin et la mesure du succès viennent de l'organisation interne : le bénéfice pour les utilisateurs n'est ni identifié ni mesuré.", "medium"],
      ["Roadmap et pilotage", "L'IA propose des réponses suggérées sur chaque écran du produit. Le taux de clic sur ces suggestions figure dans le tableau de bord de l'équipe.", "Un clic ne prouve pas que l'utilisateur a été aidé : le bénéfice réel n'est pas mesuré.", "hard"],
      ["Discovery", "L'IA retranscrit les entretiens utilisateurs et en tire les besoins. Le PO travaille à partir des synthèses et assiste moins aux entretiens.", "Le PO perd le contact direct avec les utilisateurs : l'IA remplace l'écoute au lieu de lui libérer du temps pour elle.", "hard"],
    ],
  },
};

// Cartes de l'édition PO au format du jeu : jeu de base (PO ci-dessus, cartes à valider elles aussi)
// puis extension (PO_EXT). Même nombre de cartes que l'édition générique : 44 + 88.
const poRule = (r) => ({
  ...r,
  civilians: [
    ...PO[r.id].civilians.map((text) => ({ deck: "base", text })),
    ...PO_EXT[r.id].civilians.map(([job, text]) => ({ deck: "ext", job, text })),
  ],
  undercovers: [
    { deck: "base", level: "easy", text: PO[r.id].undercover, why: PO[r.id].why },
    ...PO_EXT[r.id].undercovers.map(([job, text, why, level]) => ({ deck: "ext", job, level, text, why })),
  ],
});

// Catalogue des éditions. L'ordre fixe le numéro stocké dans le code de partie (2 bits, 4 éditions
// au plus) : n'insérez une nouvelle édition qu'à la fin.
export const EDITIONS = {
  classique: { label: "Classique", rules: RULES },
  po: { label: "Product Owner", rules: RULES.map(poRule) },
};
export const EDITION_IDS = Object.keys(EDITIONS);

/** Identifiant d'une carte dans sa règle : R<règle>-C<n> (équipier) ou R<règle>-U<n> (undercover). */
export function cardId(ruleId, kind, index) {
  return `R${ruleId}-${kind === "undercover" ? "U" : "C"}${String(index + 1).padStart(2, "0")}`;
}

// Identifiant unique de chaque carte, préfixé par l'édition : « classique:R1-C03 », « po:R2-U01 ».
for (const [edition, { rules }] of Object.entries(EDITIONS)) {
  for (const rule of rules) {
    rule.civilians.forEach((card, i) => (card.id = `${edition}:${cardId(rule.id, "civilian", i)}`));
    rule.undercovers.forEach((card, i) => (card.id = `${edition}:${cardId(rule.id, "undercover", i)}`));
  }
}
export const rulesOf = (edition) => EDITIONS[edition].rules;
