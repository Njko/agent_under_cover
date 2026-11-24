# Créer le formulaire « Déclarer l'atelier » (Microsoft Forms)

Ce guide s'adresse à l'équipe qui suit les ateliers. Il explique comment créer le formulaire Microsoft Forms qu'ouvre l'application à la création d'une partie (case « Déclarer l'atelier en créant la partie »), puis comment compter les participants par direction.

**Principe :** sur l'écran de création de partie, la case « Déclarer l'atelier en créant la partie » est cochée par défaut. Quand l'animateur touche « Générer la partie », le formulaire s'ouvre dans un nouvel onglet, avec la date, l'édition, le nombre de joueurs et le code de partie déjà remplis. L'animateur choisit une direction, indique combien de participants en viennent, puis envoie. Il renvoie le formulaire une fois par direction présente. Pour la direction suivante, il utilise « Envoyer une autre réponse » dans l'onglet du formulaire : vérifiez lors du test (étape 5) que les informations préremplies sont conservées. Rien ne s'affiche sur l'écran de la partie, projeté dans la salle. Aucun nom n'est demandé.

## 1. Créer le formulaire

Créez-le de préférence **depuis l'espace d'une équipe Teams ou d'un site SharePoint** (Forms de groupe) plutôt que depuis un compte personnel. Ainsi, le formulaire et ses réponses ne disparaissent pas au départ de la personne qui l'a créé.

1. Ouvrez [forms.office.com](https://forms.office.com), puis **Nouveau formulaire**. Pour un formulaire de groupe, choisissez **Formulaires de groupe** et sélectionnez le groupe de l'équipe.
2. Titre : « Déclarer un atelier Undercover IA responsable ».
3. Description, par exemple :
   « Une réponse par direction présente à l'atelier. Si les participants viennent de plusieurs directions, envoyez le formulaire une fois pour chacune. Les informations sur la partie sont déjà remplies. »

## 2. Ajouter les questions

Créez les questions **dans cet ordre**, avec ces types :

| # | Question | Type | Réglages |
| --- | --- | --- | --- |
| 1 | Date de l'atelier | **Texte** | Obligatoire |
| 2 | Édition du jeu | **Texte** | Obligatoire |
| 3 | Nombre de joueurs de la partie | **Texte** | Obligatoire |
| 4 | Code de partie | **Texte** | Facultatif |
| 5 | Direction | **Choix** | Obligatoire. Une option par direction connue, puis **Ajouter l'option « Autre »** (texte libre) |
| 6 | Nombre de participants de cette direction | **Texte** | Obligatoire. Menu « … » de la question → **Restrictions** → **Nombre**, et **Supérieur ou égal à** 1 |

Pourquoi des questions **Texte** pour les quatre premières ? Ce sont elles que l'application remplit automatiquement. Le type Texte est le seul dont le préremplissage est sûr. Ne les transformez pas en questions Date ou Choix.

La liste des directions de la question 5 n'a pas besoin d'être complète au départ. Les réponses « Autre » vous indiqueront les directions à y ajouter au fil du temps.

## 3. Régler les paramètres

Menu **« … »** (en haut à droite), puis **Paramètres** :

- **Qui peut remplir ce formulaire :** **Seules les personnes de mon organisation peuvent répondre.** Les personnes extérieures qui utiliseraient le lien du jeu ne pourront pas fausser vos chiffres.
- **Enregistrer le nom :** **désactivé**. Vous ne comptez que des chiffres. Décidez en équipe s'il est utile de savoir quel animateur a déclaré : si vous l'activez, le nom de l'animateur, et pas ceux des participants, est enregistré avec chaque réponse.
- **Une réponse par personne :** **désactivé**. L'animateur doit pouvoir envoyer une réponse par direction, et animer plusieurs ateliers.

## 4. Obtenir le lien prérempli pour l'application

C'est le seul élément à transmettre à la personne qui met à jour l'application.

1. Menu **« … »**, puis **Obtenir l'URL pré-remplie** (*Get Pre-filled URL*).
2. En haut du formulaire, activez **Activer les réponses pré-remplies**.
3. Saisissez **exactement** ces marqueurs, sans espace avant ni après :

   | Question | Valeur à saisir |
   | --- | --- |
   | 1 · Date de l'atelier | `__DATE__` |
   | 2 · Édition du jeu | `__EDITION__` |
   | 3 · Nombre de joueurs de la partie | `__JOUEURS__` |
   | 4 · Code de partie | `__CODE__` |

   Laissez les questions 5 et 6 **vides**.
4. En bas, cliquez sur **Obtenir le lien prérempli**, puis copiez-le.
5. Transmettez ce lien. L'application remplace chaque marqueur par la vraie valeur au moment où l'animateur ouvre le formulaire.

Si vous modifiez plus tard le formulaire en ajoutant, supprimant ou recréant les questions 1 à 4, recommencez cette étape et transmettez le nouveau lien. Modifier la liste des directions (question 5) ne demande rien.

Pour la personne qui met à jour l'application : collez le lien dans la constante `DECLARATION_FORM_URL` de `js/declaration.js`. La case à cocher apparaît alors sur l'écran de création de partie. Comme pour toute mise à jour visible, incrémentez `VERSION` dans `sw.js` et ajoutez une entrée à `js/changelog.js`, dans toutes les langues.

## 5. Tester avant de diffuser

Une fois l'application mise à jour :

1. Créez une partie de test en laissant cochée **Déclarer l'atelier en créant la partie** : le formulaire s'ouvre dans un nouvel onglet.
2. Vérifiez que les questions 1 à 4 affichent la date, l'édition (`classique` ou `po`), le nombre de joueurs et un code, et non les marqueurs `__…__`.
3. Envoyez une réponse, puis touchez **Envoyer une autre réponse** : vérifiez que les questions 1 à 4 sont toujours remplies. Sinon, signalez-le à la personne qui met à jour l'application.
4. Supprimez les réponses de test de l'onglet **Réponses**.

## 6. Compter les participants par direction

1. Onglet **Réponses**, puis **Ouvrir dans Excel**. Pour un formulaire de groupe, le classeur est enregistré dans SharePoint et se met à jour à chaque réponse.
2. Dans le classeur, **Insertion**, puis **Tableau croisé dynamique**, à partir du tableau des réponses :
   - **Lignes :** « Direction » ;
   - **Valeurs :** « Nombre de participants de cette direction », en **Somme** ;
   - en option, **Filtres :** « Date de l'atelier » ou « Édition du jeu ».
3. **Doublons :** une même partie déclarée deux fois apparaît avec le même « Code de partie » et la même « Direction ». Pour les repérer, triez sur ces deux colonnes. Pour les supprimer, utilisez **Données**, puis **Supprimer les doublons**, sur ces deux colonnes, dans une copie des données.
4. **Réponses « Autre » :** harmonisez l'orthographe des directions saisies à la main (par exemple « DRH » et « Direction RH »), puis ajoutez-les à la question 5.

## Bon à savoir

- Les réponses préremplies restent **modifiables** par l'animateur : Forms ne propose pas de champ caché ni en lecture seule. Les chiffres sont déclaratifs.
- Si l'animateur recharge la page du formulaire, les réponses préremplies disparaissent : il les ressaisit à partir de l'écran de la partie (date, édition, nombre de joueurs, code de partie).
- Le formulaire est en français. Un animateur qui joue dans une autre langue verra quand même le formulaire en français.
- Si le formulaire n'est pas configuré dans l'application, la case « Déclarer l'atelier en créant la partie » n'apparaît pas.
