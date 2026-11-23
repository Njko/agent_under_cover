// Pages d'entrée des liens : aperçu propre (titre, description, image) et redirection vers l'application.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { LANGUAGES } from "../js/i18n.js";
import { PAGES, liensPages } from "../scripts/liens-generer.mjs";

const racine = new URL("../", import.meta.url);
const lire = (path) => readFileSync(new URL(path, racine), "utf8").replace(/\r\n/g, "\n");
const imageDe = (html) => html.match(/og:image" content="https:\/\/njko\.github\.io\/agent_under_cover\/(.+?)"/)?.[1];

test("anciennes pages d'entrée (liens/<page>/) : titre, image d'aperçu et redirection", () => {
  const pages = readdirSync(new URL("liens/", racine));
  assert.ok(pages.includes("rejoindre") && pages.includes("resultats"), "liens déjà partagés");
  const titres = new Set();
  for (const page of pages) {
    const html = lire(`liens/${page}/index.html`);
    const titre = html.match(/<title>(.+?)<\/title>/)?.[1];
    assert.ok(titre?.includes("Undercover IA responsable"), `${page} : titre`);
    assert.ok(html.includes(`content="${titre}"`), `${page} : og:title identique au titre`);
    titres.add(titre);
    assert.ok(html.includes('<script src="../../js/entree.js">'), `${page} : redirection`);
    assert.ok(existsSync(new URL(imageDe(html), racine)), `${page} : image d'aperçu (adresse absolue)`);
  }
  assert.equal(titres.size, pages.length, "deux pages ne partagent pas le même titre");
});

test("pages d'entrée par langue (links/) : à jour, avec leur image d'aperçu", async () => {
  const pages = await liensPages();
  assert.equal(Object.keys(pages).length, Object.keys(LANGUAGES).length * Object.keys(PAGES).length);
  const titres = new Set();
  for (const [path, html] of Object.entries(pages)) {
    assert.ok(existsSync(new URL(path, racine)), `${path} absente : lancez npm run liens:generer`);
    assert.equal(lire(path), html, `${path} pas à jour : lancez npm run liens:generer`);
    assert.ok(existsSync(new URL(imageDe(html), racine)), `${path} : image d'aperçu absente, lancez npm run apercu`);
    titres.add(html.match(/<title>(.+?)<\/title>/)[1]);
  }
  assert.equal(titres.size, Object.keys(pages).length, "deux pages ne partagent pas le même titre");
});

test("les pages d'entrée des liens de l'application sont mises en cache pour le hors-ligne", () => {
  const sw = lire("sw.js");
  for (const lang of Object.keys(LANGUAGES)) {
    for (const page of ["join", "results"]) assert.ok(sw.includes(`"links/${lang}/${page}/"`), `sw.js : links/${lang}/${page}/`);
    for (const file of [`js/i18n/${lang}.js`, ...(lang === "fr" ? [] : [`js/i18n/cards-${lang}.js`])]) assert.ok(sw.includes(`"${file}"`), `sw.js : ${file}`);
  }
});
