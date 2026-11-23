import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EDITIONS, RULES } from "../js/cards.js";
import { LANGUAGES, cardText, loadLanguage, pickLanguage, ruleText, t } from "../js/i18n.js";
import fr from "../js/i18n/fr.js";

const others = Object.keys(LANGUAGES).filter((code) => code !== "fr");
const placeholders = (entry) => new Set([...JSON.stringify(entry).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

test("t() remplace les paramètres et choisit le pluriel", async () => {
  await loadLanguage("fr");
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

test("langue retenue : choix du joueur, puis lien, puis navigateur, puis français", () => {
  assert.equal(pickLanguage("en", "fr", ["fr-FR"]), "en");
  assert.equal(pickLanguage(null, "en", ["fr-FR"]), "en");
  assert.equal(pickLanguage(null, null, ["xx", "en-GB", "fr"]), "en");
  assert.equal(pickLanguage("constructor", undefined, ["zz"]), "fr");
});

for (const code of others) {
  test(`${code} : interface traduite en entier, avec les mêmes paramètres`, async () => {
    const { default: dict } = await import(`../js/i18n/${code}.js`);
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(fr).sort());
    for (const key of Object.keys(fr)) {
      assert.deepEqual(placeholders(dict[key]), placeholders(fr[key]), `${code} : paramètres de ${key}`);
      if (typeof fr[key] === "object") assert.ok(typeof dict[key] === "object" && dict[key].other, `${code} : pluriel de ${key}`);
    }
  });

  test(`${code} : toutes les cartes et les règles sont traduites, sans doublon`, async () => {
    const { default: content } = await import(`../js/i18n/cards-${code}.js`);
    for (const rule of RULES) {
      for (const field of ["theme", "summary", "question"]) assert.ok(content.rules[rule.id]?.[field], `${code} : règle ${rule.id}, ${field}`);
    }
    const ids = new Set();
    for (const { rules } of Object.values(EDITIONS)) {
      const texts = new Set();
      for (const rule of rules) {
        for (const card of [...rule.civilians, ...rule.undercovers]) {
          const tr = content.cards[card.id];
          assert.ok(tr?.text, `${code} : carte non traduite ${card.id}`);
          assert.equal(Boolean(tr.why), Boolean(card.why), `${code} : explication de ${card.id}`);
          assert.ok(!texts.has(tr.text), `${code} : texte en double ${card.id}`);
          texts.add(tr.text);
          ids.add(card.id);
        }
      }
    }
    assert.deepEqual(Object.keys(content.cards).filter((id) => !ids.has(id)), [], `${code} : identifiants inconnus`);
  });
}

test("cardText et ruleText suivent la langue chargée, le français sinon", async () => {
  const card = RULES[0].undercovers[0];
  await loadLanguage("en");
  assert.notEqual(cardText(card), card.text);
  assert.notEqual(cardText(card, "why"), card.why);
  assert.notEqual(ruleText(RULES[0], "theme"), RULES[0].theme);
  assert.equal(t("result.found", { ord: 3, pts: 1 }), "Found on the 3rd vote · +1");
  await loadLanguage("fr");
  assert.equal(cardText(card), card.text);
  assert.equal(ruleText(RULES[0], "summary"), RULES[0].summary);
});
