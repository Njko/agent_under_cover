import { test } from "node:test";
import assert from "node:assert/strict";
import { DECLARATION_FORM_URL, declarationUrl } from "../js/declaration.js";

const T = "https://forms.office.com/Pages/ResponsePage.aspx?id=abc&r1=__DATE__&r2=__EDITION__&r3=__JOUEURS__&r4=__CODE__";
const v = { date: new Date(2026, 10, 24, 0, 30), edition: "po", players: 7, code: "AB12cd" };

test("déclaration : remplace les quatre marqueurs", () => {
  assert.equal(declarationUrl(T, v), "https://forms.office.com/Pages/ResponsePage.aspx?id=abc&r1=2026-11-24&r2=po&r3=7&r4=AB12cd");
});

test("déclaration : date locale, même juste après minuit", () => {
  assert.match(declarationUrl("x=__DATE__", { ...v, date: new Date(2026, 0, 1, 0, 5) }), /x=2026-01-01$/);
});

test("déclaration : encode les valeurs", () => {
  assert.equal(declarationUrl("e=__EDITION__", { ...v, edition: "a b&c" }), "e=a%20b%26c");
});

test("déclaration : sans lien configuré, pas de lien", () => {
  assert.equal(declarationUrl("", v), null);
  assert.equal(typeof DECLARATION_FORM_URL, "string");
});

test("déclaration : un lien sans marqueur reste inchangé", () => {
  assert.equal(declarationUrl("https://forms.office.com/r/xyz", v), "https://forms.office.com/r/xyz");
});

test("déclaration : le lien configuré contient les quatre marqueurs", () => {
  // Un lien recopié depuis Forms sans un marqueur laisserait une question vide sans erreur visible.
  if (!DECLARATION_FORM_URL) return;
  for (const marker of ["__DATE__", "__EDITION__", "__JOUEURS__", "__CODE__"]) assert.ok(DECLARATION_FORM_URL.includes(marker), marker);
});
