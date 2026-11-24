# Déclarer l'atelier — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** ajouter sur l'écran de fin de partie de l'animateur un lien « Déclarer l'atelier », qui ouvre le formulaire Microsoft Forms de l'organisation avec la date, l'édition, le nombre de joueurs et le code de partie déjà remplis.

**Architecture :**
- Un petit module pur `js/declaration.js` contient la constante `DECLARATION_FORM_URL` (le lien prérempli copié depuis Forms, avec des marqueurs) et `declarationUrl()`, qui remplace ces marqueurs par les valeurs.
- `viewEnd()` (`js/app.js`) affiche le lien seulement si la constante n'est pas vide.
- Le lien est une simple navigation : aucune requête de l'application, et la CSP ne change pas.

**Tech Stack :** modules ES, sans dépendance, tests `node --test`.

**Spec :** `docs/superpowers/specs/2026-11-24-declaration-atelier-design.md`. Le guide Forms destiné à l'équipe est `doc/formulaire-declaration.md`.

## Global Constraints

- Marqueurs exacts dans le lien : `__DATE__`, `__EDITION__`, `__JOUEURS__`, `__CODE__`.
- Valeurs envoyées :
  - date locale au format `AAAA-MM-JJ` ;
  - identifiant d'édition (`classique`, `po`), sans traduction ;
  - `game.players` ;
  - code de partie brut, sans `prettyCode`.
- Aucune donnée personnelle : ni prénom, ni score.
- Aucune requête `fetch`/`POST`. CSP inchangée dans `index.html` et dans `deploy/nginx/default.conf`.
- Texte de l'interface via `t()`, présent dans les 5 langues de `LANGUAGES`.
- Commentaires en français.
- Cible tactile de 44 px, focus visible, deux thèmes en clair et en sombre : réutiliser les classes `.btn` existantes.
- Incrémenter `VERSION` dans `sw.js` et ajouter `js/declaration.js` à `ASSETS`.
- Entrée `js/changelog.js` dans les 5 langues.
- **Le dépôt contient déjà des modifications non commitées** dans `js/app.js`, `js/i18n/*.js`, `js/changelog.js` et `sw.js`. Ne rien committer sans l'accord de l'utilisateur.

## Review Focus

- **Atelier vers minuit :** la date doit être la date **locale** de l'appareil, pas la date UTC de `toISOString()`. Testé en tâche 1.
- **Constante vide**, cas par défaut tant que l'équipe n'a pas fourni le lien : aucun bouton, aucun lien vide. Testé en tâche 1 (`null`), vérifié en tâche 2.
- **Lien collé sans marqueurs**, ou avec un seul : le lien s'ouvre tel quel, sans erreur. Testé en tâche 1.
- **Écran des résultats côté joueur** (`viewResults`, ouvert par QR code) : pas de bouton, seul l'animateur déclare. Vérifié en tâche 2.
- **Valeurs à caractères spéciaux** : toujours `encodeURIComponent`. Testé en tâche 1.

---

### Task 1 : module `js/declaration.js`

**Files :**
- Create : `js/declaration.js`
- Test : `tests/declaration.test.js`

**Interfaces :**
- Produces :
  - `export const DECLARATION_FORM_URL = ""` (chaîne, vide par défaut) ;
  - `export function declarationUrl(template: string, { date: Date, edition: string, players: number, code: string }): string | null`, qui renvoie `null` si `template` est vide.

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/declaration.test.js`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { DECLARATION_FORM_URL, declarationUrl } from "../js/declaration.js";

const T = "https://forms.office.com/Pages/ResponsePage.aspx?id=abc&r1=__DATE__&r2=__EDITION__&r3=__JOUEURS__&r4=__CODE__";
const v = { date: new Date(2026, 10, 24, 0, 30), edition: "po", players: 7, code: "AB12cd" };

test("remplace les quatre marqueurs", () => {
  assert.equal(declarationUrl(T, v), "https://forms.office.com/Pages/ResponsePage.aspx?id=abc&r1=2026-11-24&r2=po&r3=7&r4=AB12cd");
});
test("date locale, même juste après minuit", () => {
  assert.match(declarationUrl("x=__DATE__", { ...v, date: new Date(2026, 0, 1, 0, 5) }), /x=2026-01-01$/);
});
test("encode les valeurs", () => {
  assert.equal(declarationUrl("e=__EDITION__", { ...v, edition: "a b&c" }), "e=a%20b%26c");
});
test("sans lien configuré : null", () => {
  assert.equal(declarationUrl("", v), null);
  assert.equal(typeof DECLARATION_FORM_URL, "string");
});
test("lien sans marqueur : inchangé", () => {
  assert.equal(declarationUrl("https://forms.office.com/r/xyz", v), "https://forms.office.com/r/xyz");
});
```

- [ ] **Step 2 : lancer les tests.** `node --test tests/declaration.test.js` : ÉCHEC (module introuvable).
- [ ] **Step 3 : implémenter `js/declaration.js`.**
  - En-tête en commentaire : renvoyer vers `doc/formulaire-declaration.md`, et préciser que la constante vide masque le bouton.
  - Date : `getFullYear` / `getMonth` / `getDate` avec `padStart`. Pas de `toISOString`, qui donne la date UTC.
  - Remplacement : `replaceAll(marqueur, encodeURIComponent(String(valeur)))`.
- [ ] **Step 4 : lancer `npm test`.** Tous les tests passent, y compris les tests existants.
- [ ] **Step 5 : commit.** Seulement avec l'accord de l'utilisateur : `git add js/declaration.js tests/declaration.test.js`, puis `git commit -m "Ajoute le lien prérempli de déclaration d'atelier"`.

### Task 2 : bouton sur l'écran de fin, textes, version, documentation

**Files :**
- Modify :
  - `js/app.js` : imports en tête ; `viewEnd()`, entre le bloc `.share--results` et `.actions` (lignes 1867 à 1876 actuellement) ;
  - `js/i18n/fr.js`, `en.js`, `de.js`, `it.js`, `es.js` : clés `end.*` ;
  - `sw.js` : `VERSION` et `ASSETS` ;
  - `js/changelog.js` ;
  - `doc/fonctionnement-technique.md` : tableau « En résumé » et section « Ce qui est stocké » ;
  - `README.md`, si une liste de la documentation y figure : lien vers `doc/formulaire-declaration.md`.

**Interfaces :**
- Consumes : `DECLARATION_FORM_URL` et `declarationUrl()` de la tâche 1.

- [ ] **Step 1 : ajouter les textes.** Dans `fr.js`, après `end.copy` :
  - `"end.declare": "Déclarer l'atelier"` ;
  - `"end.declareHint": "Ouvre le formulaire de votre organisation pour compter les participants par direction. Aucun prénom n'est transmis."`

  Ajouter les traductions dans `en`, `de`, `it` et `es`.
- [ ] **Step 2 : lancer `npm test`.** `i18n.test.js` passe : les clés existent dans toutes les langues.
- [ ] **Step 3 : modifier `viewEnd()`.**
  - Calculer `const declareUrl = declarationUrl(DECLARATION_FORM_URL, { date: new Date(), edition: game.edition, players: game.players, code })`.
  - Si ce n'est pas `null`, insérer un bloc qui contient :
    - le paragraphe `end.declareHint` ;
    - le lien `<a class="btn" href="${esc(declareUrl)}" target="_blank" rel="noopener">${t("end.declare")}</a>`.
  - Si c'est `null`, rien n'est inséré.
  - Ne rien ajouter dans `viewResults()`.
- [ ] **Step 4 : version et cache.** Incrémenter `VERSION` dans `sw.js` (actuellement `"v69"`) et ajouter `"js/declaration.js"` à `ASSETS`, après `"js/game.js"`.
- [ ] **Step 5 : changelog.**
  - Si l'entrée en tête n'est pas encore en ligne (date du jour, travail non commité), y ajouter un item ; sinon, créer une nouvelle entrée.
  - Item français : « En fin de partie, l'animateur peut déclarer l'atelier : un formulaire de l'organisation s'ouvre, déjà rempli (date, édition, nombre de joueurs), pour compter les participants par direction. Aucun prénom n'est transmis. »
  - Ajouter l'item traduit dans les 4 autres langues de l'entrée.
- [ ] **Step 6 : documentation.** Dans `doc/fonctionnement-technique.md` :
  - Ligne « Des données sont-elles envoyées quelque part ? » : réponse « **Non, sauf déclaration volontaire.** ». Si l'organisation a configuré un formulaire, l'animateur peut, en fin de partie, ouvrir un lien vers ce formulaire. La date, l'édition, le nombre de joueurs et le code de partie figurent dans le lien. Ce n'est pas une requête de l'application, et aucun prénom ni score n'est transmis. L'animateur relit et envoie lui-même le formulaire.
  - Ligne CSP : préciser qu'elle n'empêche pas d'ouvrir un lien, ce qui est voulu.
  - Ajouter un renvoi vers `doc/formulaire-declaration.md`.
- [ ] **Step 7 : vérifier dans le navigateur.**
  - Lancer `npm start`.
  - **Avec un lien de test :** mettre temporairement dans `DECLARATION_FORM_URL` la valeur `https://forms.office.com/Pages/ResponsePage.aspx?id=TEST&r1=__DATE__&r2=__EDITION__&r3=__JOUEURS__&r4=__CODE__`. Créer une partie, aller à `#/end/<code>` et lire le `href` du bouton : date du jour, édition, nombre de joueurs et code, sans aucun `__`.
  - **Thèmes :** contrôler le bouton en thème normal et low-tech, en clair et en sombre, ainsi qu'à 320 px de large.
  - **Sans lien :** remettre `""`, recharger et vérifier qu'aucun bouton n'apparaît.
  - **Côté joueur :** sur `#results-…`, vérifier qu'il n'y a pas de bouton.
- [ ] **Step 8 : lancer `npm test`.** Tout passe.
- [ ] **Step 9 : commit.** Seulement avec l'accord de l'utilisateur, car ces fichiers contiennent déjà d'autres modifications non commitées. Message : « Ajoute le bouton « Déclarer l'atelier » en fin de partie ».

### Après livraison (côté équipe)

Suivre `doc/formulaire-declaration.md`, puis coller le lien prérempli dans `DECLARATION_FORM_URL` et incrémenter `VERSION`.
