# Créer le formulaire « Déclarer l'atelier » (Microsoft Forms)

Ce guide s'adresse à l'équipe qui suit les ateliers. Il explique comment créer le formulaire Microsoft Forms qu'ouvre l'application à la création d'une partie (case « Déclarer l'atelier en créant la partie »), puis comment compter les participants par direction.

**Principe :**
- Sur l'écran de création de partie, la case « Déclarer l'atelier en créant la partie » est cochée par défaut.
- Quand l'animateur touche « Générer la partie », le formulaire s'ouvre dans un nouvel onglet. La date, l'édition, le nombre de joueurs et le code de partie sont déjà remplis.
- L'animateur indique la première direction et son nombre de participants. Il répond « Oui » à « Ajouter une autre direction ? » autant de fois que nécessaire, jusqu'à 5 directions, puis il envoie.
- **Une seule réponse par atelier.** C'est indispensable : « Envoyer une autre réponse » réinitialise le formulaire et perd les informations préremplies.
- Rien ne s'affiche sur l'écran de la partie, projeté dans la salle. Aucun nom n'est demandé.

## 1. Créer le formulaire

Créez-le de préférence **depuis l'espace d'une équipe Teams ou d'un site SharePoint** (Forms de groupe) plutôt que depuis un compte personnel. Ainsi, le formulaire et ses réponses ne disparaissent pas au départ de la personne qui l'a créé.

1. Ouvrez [forms.office.com](https://forms.office.com), puis **Nouveau formulaire**. Pour un formulaire de groupe, choisissez **Formulaires de groupe** et sélectionnez le groupe de l'équipe.
2. Titre : « Déclarer un atelier Undercover IA responsable ».
3. Description, par exemple :
   « Une seule réponse par atelier. Les informations sur la partie sont déjà remplies : indiquez combien de participants viennent de chaque direction. »

**Vous avez déjà créé le formulaire** avec une réponse par direction ? Ne supprimez pas les questions 1 à 4 : leurs identifiants sont dans le lien prérempli de l'application, qui resterait alors valable. Renommez la question « Direction » en « Direction 1 » et « Nombre de participants de cette direction » en « Participants direction 1 ». Ajoutez ensuite la question « Ajouter une autre direction ? » et les sections 2 à 5 décrites ci-dessous.

## 2. Ajouter les questions et les sections

Le formulaire compte **5 sections**, une par direction. On n'affiche la suivante que si l'animateur en demande une autre.

### Section 1 : la partie et la première direction

| # | Question | Type | Réglages |
| --- | --- | --- | --- |
| 1 | Date de l'atelier | **Texte** | Obligatoire |
| 2 | Édition du jeu | **Texte** | Obligatoire |
| 3 | Nombre de joueurs de la partie | **Texte** | Obligatoire |
| 4 | Code de partie | **Texte** | Facultatif |
| 5 | Direction 1 | **Choix** | Obligatoire. Une option par direction connue, puis **Ajouter l'option « Autre »** (texte libre) |
| 6 | Participants direction 1 | **Texte** | Obligatoire. Menu « … » de la question → **Restrictions** → **Nombre**, et **Supérieur ou égal à** 1 |
| 7 | Ajouter une autre direction ? | **Choix** | Obligatoire. Options « Oui » et « Non » |

Pourquoi des questions **Texte** pour les quatre premières ? Ce sont elles que l'application remplit automatiquement. Le type Texte est le seul dont le préremplissage est sûr. Ne les transformez pas en questions Date ou Choix.

### Sections 2 à 5 : une direction de plus

Pour ajouter une section : **+ Ajouter une nouvelle question**, puis le menu **« … »** et **Section**. Chaque section reprend le même modèle, avec son numéro (2, 3, 4, puis 5) :

| Question | Type | Réglages |
| --- | --- | --- |
| Direction 2 | **Choix** | Obligatoire. Mêmes options que « Direction 1 », avec « Autre ». Le plus simple est de **dupliquer** la question « Direction 1 », puis de la renommer |
| Participants direction 2 | **Texte** | Obligatoire, restriction **Nombre** ≥ 1 |
| Ajouter une autre direction ? | **Choix** | Obligatoire, « Oui » / « Non ». **Pas dans la section 5**, qui est la dernière |

Donnez à chaque question un **titre différent** (« Direction 2 », « Participants direction 2 »…) : ces titres deviennent les noms des colonnes dans Excel.

### Les branchements

Menu **« … »** du formulaire, puis **Branchement** (*Branching*). Pour chaque question « Ajouter une autre direction ? » :

- **Oui** → la section suivante (section 2 après la section 1, section 3 après la section 2, etc.) ;
- **Non** → **Fin du formulaire**.

Ajoutez enfin, sous la section 5, **Après la section 5 → Fin du formulaire**.

Avec ces branchements, l'animateur ne voit que les directions dont il a besoin, et il n'envoie le formulaire qu'une fois.

La liste des directions n'a pas besoin d'être complète au départ. Les réponses « Autre » vous indiqueront les directions à y ajouter au fil du temps. Ajoutez chaque nouvelle direction **dans les 5 questions « Direction »**.

## 3. Régler les paramètres

Menu **« … »** (en haut à droite), puis **Paramètres** :

- **Qui peut remplir ce formulaire :** **Seules les personnes de mon organisation peuvent répondre.** Les personnes extérieures qui utiliseraient le lien du jeu ne pourront pas fausser vos chiffres.
- **Enregistrer le nom :** **désactivé**. Vous ne comptez que des chiffres. Décidez en équipe s'il est utile de savoir quel animateur a déclaré : si vous l'activez, le nom de l'animateur, et pas ceux des participants, est enregistré avec chaque réponse.
- **Une réponse par personne :** **désactivé**. Un même animateur doit pouvoir déclarer plusieurs ateliers.

## 4. Obtenir le lien prérempli pour l'application

C'est le seul élément à transmettre à la personne qui met à jour l'application. Si le formulaire existait déjà et que les questions 1 à 4 n'ont pas été recréées, le lien actuel reste valable : passez directement à l'étape 5.

1. Menu **« … »**, puis **Obtenir l'URL pré-remplie** (*Get Pre-filled URL*).
2. En haut du formulaire, activez **Activer les réponses pré-remplies**.
3. Saisissez **exactement** ces marqueurs, sans espace avant ni après :

   | Question | Valeur à saisir |
   | --- | --- |
   | 1 · Date de l'atelier | `__DATE__` |
   | 2 · Édition du jeu | `__EDITION__` |
   | 3 · Nombre de joueurs de la partie | `__JOUEURS__` |
   | 4 · Code de partie | `__CODE__` |

   Laissez toutes les autres questions **vides**.
4. En bas, cliquez sur **Obtenir le lien prérempli**, puis copiez-le.
5. Transmettez ce lien. L'application remplace chaque marqueur par la vraie valeur au moment où l'animateur ouvre le formulaire.

Si vous modifiez plus tard le formulaire en ajoutant, supprimant ou recréant les questions 1 à 4, recommencez cette étape et transmettez le nouveau lien. Modifier les directions, les sections ou les branchements ne demande rien.

Pour la personne qui met à jour l'application : collez le lien dans la constante `DECLARATION_FORM_URL` de `js/declaration.js`. La case à cocher apparaît alors sur l'écran de création de partie. Comme pour toute mise à jour visible, incrémentez `VERSION` dans `sw.js` et ajoutez une entrée à `js/changelog.js`, dans toutes les langues.

## 5. Tester avant de diffuser

1. Créez une partie de test en laissant cochée **Déclarer l'atelier en créant la partie** : le formulaire s'ouvre dans un nouvel onglet.
2. Vérifiez que les questions 1 à 4 affichent la date, l'édition (`classique` ou `po`), le nombre de joueurs et un code, et non les marqueurs `__…__`.
3. Déclarez trois directions : « Oui » deux fois, puis « Non ». Vérifiez que chaque section s'affiche, que « Non » mène à l'envoi, et que la section 5 se termine bien par l'envoi.
4. Envoyez, puis vérifiez dans Excel (étape 6) que la réponse apparaît sur une seule ligne, avec les trois directions.
5. Supprimez les réponses de test de l'onglet **Réponses**.

## 6. Compter les participants par direction

1. Onglet **Réponses**, puis **Ouvrir dans Excel**. Pour un formulaire de groupe, le classeur est enregistré dans SharePoint et se met à jour à chaque réponse.
2. **Une ligne par atelier**, avec les colonnes « Direction 1 », « Participants direction 1 », « Direction 2 »… Les colonnes des directions non utilisées restent vides.
3. Pour additionner par direction, créez une feuille **Synthèse**. Le classeur des réponses est un tableau Excel, appelé ici `Réponses` : vérifiez son nom dans **Création de tableau**.

   **Solution simple (toutes les versions d'Excel) :**
   - En colonne A, listez les directions : une par ligne, à partir de A2.
   - En B2, mettez la formule ci-dessous, puis recopiez-la vers le bas :

   ```
   =SOMME.SI.ENS(Réponses[Participants direction 1];Réponses[Direction 1];A2)
   +SOMME.SI.ENS(Réponses[Participants direction 2];Réponses[Direction 2];A2)
   +SOMME.SI.ENS(Réponses[Participants direction 3];Réponses[Direction 3];A2)
   +SOMME.SI.ENS(Réponses[Participants direction 4];Réponses[Direction 4];A2)
   +SOMME.SI.ENS(Réponses[Participants direction 5];Réponses[Direction 5];A2)
   ```

   **Solution automatique (Excel 365 ou Excel pour le web récent) :** une seule formule, en A1, produit la liste des directions, avec les nouvelles et les « Autre », et leurs totaux :

   ```
   =LET(
     d;ASSEMB.V(Réponses[Direction 1];Réponses[Direction 2];Réponses[Direction 3];Réponses[Direction 4];Réponses[Direction 5]);
     n;ASSEMB.V(Réponses[Participants direction 1];Réponses[Participants direction 2];Réponses[Participants direction 3];Réponses[Participants direction 4];Réponses[Participants direction 5]);
     GROUPER.PAR(d;n;SOMME;0;0;;ESTTEXTE(d))
   )
   ```

   `ESTTEXTE(d)` écarte les cellules des directions non utilisées. Excel anglais : `VSTACK` à la place de `ASSEMB.V`, `GROUPBY` à la place de `GROUPER.PAR`, `SUM` à la place de `SOMME`, `ISTEXT` à la place de `ESTTEXTE`, et des virgules à la place des points-virgules.

   **Si les totaux restent à 0**, les nombres ont été enregistrés comme du texte. Sélectionnez les colonnes « Participants direction… », puis **Données** → **Convertir** → **Terminer**.
4. **Doublons :** une même partie déclarée deux fois apparaît sur deux lignes avec le même « Code de partie ». Triez sur cette colonne pour les repérer, puis supprimez la ligne en trop dans une copie des données.
5. **Réponses « Autre » :** harmonisez l'orthographe des directions saisies à la main (par exemple « DRH » et « Direction RH »), puis ajoutez-les aux 5 questions « Direction ».

## Bon à savoir

- **Une seule réponse par atelier :** « Envoyer une autre réponse » repart d'un formulaire vide, sans les informations préremplies. Toutes les directions se déclarent donc dans la même réponse.
- **Plus de 5 directions :** si un atelier en réunit davantage, regroupez les plus petites sous « Autre », ou ajoutez une section 6 sur le même modèle, ainsi qu'une ligne à la formule de l'étape 6.
- **Réponses préremplies modifiables :** l'animateur peut changer les valeurs préremplies, car Forms ne propose pas de champ caché ni en lecture seule. Les chiffres sont déclaratifs.
- **Page rechargée :** si l'animateur recharge la page du formulaire, les réponses préremplies disparaissent. Il les ressaisit à partir de l'écran de la partie : date, édition, nombre de joueurs et code de partie.
- **Langue :** le formulaire est en français. Un animateur qui joue dans une autre langue verra quand même le formulaire en français.
- **Formulaire non configuré :** si le formulaire n'est pas configuré dans l'application, la case « Déclarer l'atelier en créant la partie » n'apparaît pas.
