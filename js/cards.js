// Contenu du jeu de cartes « IA responsable » (source : Jeu_de_cartes_IA_AXA_recto.pdf).
//
// Chaque règle contient :
//   - theme       : nom de la règle d'or (tel qu'imprimé au dos des cartes)
//   - summary     : énoncé court de la règle d'or, rappelé sur les cartes et à l'écran
//                   (formulation exacte du pilier correspondant de la charte IA responsable)
//   - question    : question de débrief propre à la règle, sur les notions souvent mal comprises
//   - back        : image du dos de carte (img/dos/)
//   - civilians   : cartes « bonne pratique » distribuées aux civils
//   - undercover  : la carte UNDERCOVER (pratique qui enfreint la règle)
//   - why         : explication affichée au débrief pour justifier l'undercover
//
// Pour modifier le jeu, il suffit d'éditer ce fichier : aucune autre modification n'est nécessaire.

export const RULES = [
  {
    id: 1,
    theme: "Contrôle humain & Responsabilité",
    back: "img/dos/regle-1.webp",
    summary: "L'IA reste sous contrôle humain à chaque étape de son utilisation.",
    question:
      "Vérifier chaque résultat de l'IA (règle 1) ou surveiller le système dans la durée (règle 2) : qui fait quoi chez vous ?",
    civilians: [
      "L'IA produit du code. Chaque livraison passe par revue de code et tests.",
      "Une IA suggère des réponses aux clients. Le conseiller choisit toujours la réponse finale parmi celles suggérées par l'IA.",
      "Nous utilisons Copilot pour rédiger des comptes-rendus. Le manager relit et valide systématiquement avant diffusion.",
      "Un modèle recommande des fraudes potentielles. L'expert fraude décide de lancer ou non une investigation.",
    ],
    undercover:
      "Les décisions d'augmentation tarifaire sont prises automatiquement par l'IA sans intervention humaine.",
    why:
      "Une décision à fort impact pour le client est prise sans aucune supervision humaine : l'IA décide seule au lieu d'assister.",
  },
  {
    id: 2,
    theme: "Sécurité & Robustesse",
    back: "img/dos/regle-2.webp",
    summary: "Utilisation de systèmes d'IA performants, fiables et sécurisés.",
    question:
      "Tester, surveiller, pouvoir arrêter le système (règle 2) : en quoi est-ce différent de vérifier chaque résultat avant de l'utiliser (règle 1) ?",
    civilians: [
      "Avant sa mise en production, le modèle IA a été testé sur plusieurs jeux de données représentatifs afin d'évaluer sa fiabilité et ses performances.",
      "Les équipes métiers participent aux tests afin de vérifier que les résultats produits sont cohérents avec les besoins réels du terrain.",
      "Un processus permet de suspendre ou désactiver rapidement le système si un problème majeur est identifié.",
      "Une équipe surveille les performances du modèle après son déploiement afin de détecter rapidement toute dégradation ou comportement inattendu.",
      "Lorsque l'IA manque d'informations ou n'est pas certaine de sa réponse, elle le signale au lieu d'inventer une réponse.",
      "Des audits périodiques vérifient que le système respecte toujours les niveaux de qualité et de sécurité attendus.",
    ],
    undercover:
      "Le modèle de tri des demandes a convaincu les métiers lors d'une démonstration. Il est mis en production la semaine suivante.",
    why:
      "Une démonstration réussie ne remplace pas des tests représentatifs : le modèle part en production sans validation de sa fiabilité.",
  },
  {
    id: 3,
    theme: "Gouvernance des données et de l'IA",
    back: "img/dos/regle-3.webp",
    summary: "Instances mises en place pour garantir le contrôle et l'application des politiques d'IA.",
    question:
      "Quelles instances contrôlent les projets d'IA chez vous, et à quel moment faut-il les solliciter ?",
    civilians: [
      "Avant de mettre le chatbot en production, l'équipe présente le projet devant un comité qui vérifie son alignement avec les politiques IA du Groupe.",
      "Une équipe Data Science a documenté son modèle : objectif ; données utilisées ; responsables ; risques identifiés. La documentation est mise à jour à chaque évolution.",
      "Nous utilisons un assistant IA validé par AXA. Avant son déploiement, le projet a été déclaré auprès de l'instance de gouvernance IA. Les équipes conformité et sécurité ont été consultées.",
      "Un projet IA lancé dans plusieurs pays applique les mêmes standards de contrôle et les mêmes principes de gouvernance définis par AXA Groupe.",
      "Une équipe souhaite réutiliser un modèle IA déjà utilisé dans un autre pays AXA. Avant de le déployer localement, elle vérifie que les données, règles et contraintes sont adaptées au contexte français.",
    ],
    undercover:
      "Une équipe met à disposition de ses collègues un assistant IA qu'elle a développé. Elle le déclarera à la gouvernance une fois la version finale prête.",
    why:
      "C'est du « shadow AI » : l'outil est déployé avant toute déclaration à la gouvernance IA, sans contrôle conformité ni sécurité.",
  },
  {
    id: 4,
    theme: "Impact environnemental",
    back: "img/dos/regle-4.webp",
    summary: "Engagement pour stabiliser les émissions de carbone liées aux opérations d'IA.",
    question:
      "Comment suivre les émissions de carbone liées à vos usages de l'IA : calculatrice carbone, taille du modèle, nombre de requêtes… ? Qu'utilisez-vous déjà ?",
    civilians: [
      "L'équipe limite les générations inutiles. Elle affine progressivement ses prompts au lieu de lancer des dizaines de requêtes successives.",
      "Avant de lancer un nouveau projet IA, l'équipe utilise la calculatrice carbone du Groupe afin d'estimer l'impact environnemental de la solution envisagée.",
      "Pour résumer les comptes-rendus de réunion, l'équipe utilise un modèle léger suffisamment performant pour la tâche. Elle a comparé plusieurs options avant son choix.",
      "Avant d'automatiser une tâche répétitive avec l'IA, l'équipe vérifie qu'un script simple ne suffirait pas, pour éviter une consommation inutile.",
      "Deux modèles donnent des résultats similaires. L'équipe choisit celui qui consomme moins de ressources tout en répondant aux besoins métiers.",
    ],
    undercover:
      "Pour rédiger ses synthèses internes, l'équipe utilise par défaut le modèle d'IA le plus puissant du catalogue, pour toutes ses demandes.",
    why:
      "Le modèle le plus puissant est utilisé par défaut, même quand un modèle plus sobre suffirait : l'impact environnemental n'est pas pris en compte.",
  },
  {
    id: 5,
    theme: "Confiance & Transparence",
    back: "img/dos/regle-5.webp",
    summary: "Une information claire et systématique est fournie lors des interactions avec les systèmes d'IA.",
    question:
      "Dans vos outils, l'utilisateur sait-il toujours qu'il échange avec une IA, et connaît-il ses limites ?",
    civilians: [
      "L'application informe clairement l'utilisateur que l'IA peut commettre des erreurs et que certaines réponses doivent être vérifiées.",
      "Lorsqu'un compte-rendu est généré automatiquement, une mention indique qu'il a été produit avec l'aide d'une IA et invite l'utilisateur à le relire avant diffusion.",
      "Les collaborateurs discutent avec un assistant RH. Une bannière visible indique clairement : « Vous échangez actuellement avec un assistant alimenté par l'intelligence artificielle. »",
      "Quand l'assistant IA donne une réponse erronée, l'équipe le signale vite, corrige et en tire les leçons, sans chercher de coupable.",
      "Les utilisateurs peuvent facilement savoir quand une réponse provient d'une IA ou d'un conseiller humain.",
      "Les performances du système sont suivies régulièrement afin de détecter les erreurs ou les dérives pouvant affecter la qualité des réponses.",
      "Un collaborateur remarque que les données utilisées par l'outil d'IA sont incomplètes. Il le signale avant que les résultats servent à prendre une décision.",
    ],
    undercover:
      "Un chatbot répond aux demandes clients en signant du prénom d'un conseiller. Les clients apprécient ce contact personnalisé.",
    why:
      "Le chatbot se fait passer pour un conseiller : les clients ignorent qu'ils parlent à une IA, et leur satisfaction ne compense pas ce manque de transparence.",
  },
  {
    id: 6,
    theme: "Équité & Inclusion",
    back: "img/dos/regle-6.webp",
    summary: "Des formations sur l'IA responsable, l'éthique et la durabilité sont proposées à tous.",
    question:
      "Les formations sur l'IA responsable sont-elles vraiment accessibles à tous chez vous, quels que soient le métier et le niveau ?",
    civilians: [
      "Une nouvelle formation IA est proposée à l'ensemble des collaborateurs, quel que soit leur métier ou leur niveau technique. Des parcours débutant, intermédiaire et avancé sont disponibles.",
      "Tous les collaborateurs concernés suivent un module obligatoire sur les usages responsables de l'IA, les risques et les bonnes pratiques.",
      "Une communauté interne permet aux collaborateurs de partager leurs bonnes pratiques et leurs questions sur l'IA responsable.",
      "Les collaborateurs qui découvrent l'IA bénéficient d'ateliers pratiques supplémentaires afin de progresser à leur rythme.",
      "Les collaborateurs les plus avancés accompagnent ponctuellement leurs collègues sur les premiers cas d'usage.",
    ],
    undercover:
      "Les formations IA sont proposées aux équipes techniques et Data. Les autres métiers reçoivent une synthèse de leurs travaux.",
    why:
      "La formation est réservée à une élite technique : les autres métiers sont exclus alors qu'ils utilisent aussi l'IA. L'accès à la formation doit être équitable.",
  },
  {
    id: 7,
    theme: "L'IA au cœur de l'humain",
    back: "img/dos/regle-7.webp",
    summary: "Chaque système d'IA doit créer de la valeur pour les clients, les collaborateurs et la société.",
    question:
      "Quel besoin concret justifie cet usage de l'IA, et comment vérifier qu'il libère vraiment du temps ?",
    civilians: [
      "Une IA prépare les informations pertinentes avant un rendez-vous client afin de réduire les tâches administratives et permettre au conseiller de consacrer davantage de temps à l'écoute et au conseil.",
      "Un assistant IA répond aux questions sur les procédures internes afin d'aider les nouveaux arrivants à gagner en autonomie.",
      "Une IA analyse les dossiers afin d'identifier plus rapidement les situations nécessitant l'intervention d'un expert humain.",
      "Un assistant IA aide les clients à comprendre leurs garanties en reformulant les informations dans un langage plus simple.",
      "Une solution IA génère automatiquement des sous-titres et des transcriptions pour rendre les contenus accessibles à davantage de collaborateurs.",
    ],
    undercover:
      "Une équipe ajoute une fonctionnalité d'IA générative à son application pour l'annoncer au prochain salon. Les besoins clients seront étudiés ensuite.",
    why:
      "L'IA est utilisée pour l'effet vitrine, sans besoin identifié ni bénéfice mesuré pour les clients ou les collaborateurs.",
  },
];
