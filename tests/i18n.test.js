import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { t } from "../js/i18n.js";
import fr from "../js/i18n/fr.js";

test("t() remplace les paramètres et choisit le pluriel", () => {
  assert.equal(t("player.n", { n: 3 }), "Joueur 3");
  assert.equal(t("cards.civilianCount", { n: 1 }), "1 bonne pratique");
  assert.equal(t("cards.civilianCount", { n: 0 }), "0 bonne pratique");
  assert.equal(t("cards.civilianCount", { n: 14 }), "14 bonnes pratiques");
  assert.equal(t("result.found", { ord: 1, pts: 3 }), "Trouvé au 1er vote · +3");
  assert.equal(t("result.found", { ord: 2, pts: 2 }), "Trouvé au 2e vote · +2");
  assert.equal(t("clé.inconnue"), "clé.inconnue");
});

test("chaque clé écrite en toutes lettres dans le code existe dans fr.js", () => {
  // Toute chaîne « groupe.nom » dont le groupe existe dans fr.js est une clé (y compris dans t(a ? "x" : "y")).
  const groups = new Set(Object.keys(fr).map((key) => key.split(".")[0]));
  let checked = 0;
  for (const file of ["js/app.js", "js/game.js"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const [, key] of source.matchAll(/"([a-z]+\.[\w.]+)"/g)) {
      if (!groups.has(key.split(".")[0])) continue;
      assert.ok(key in fr, `${file} : clé absente de fr.js : ${key}`);
      checked++;
    }
  }
  assert.ok(checked > 200, `seulement ${checked} clés trouvées dans le code`);
});
