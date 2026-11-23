// Pages d'entrée des liens (liens/<page>/) : aperçu propre et image présente.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const racine = new URL("../", import.meta.url);
const pages = readdirSync(new URL("liens/", racine));

test("chaque page d'entrée a son titre, son image d'aperçu et sa redirection", () => {
  assert.ok(pages.includes("rejoindre") && pages.includes("resultats"), "pages utilisées par l'application");
  const titres = new Set();
  for (const page of pages) {
    const html = readFileSync(new URL(`liens/${page}/index.html`, racine), "utf8");
    const titre = html.match(/<title>(.+?)<\/title>/)?.[1];
    assert.ok(titre?.includes("Undercover IA responsable"), `${page} : titre`);
    assert.ok(html.includes(`content="${titre}"`), `${page} : og:title identique au titre`);
    titres.add(titre);
    assert.ok(html.includes('<script src="../../js/entree.js">'), `${page} : redirection`);
    const image = html.match(/og:image" content="https:\/\/njko\.github\.io\/agent_under_cover\/(.+?)"/)?.[1];
    assert.ok(image && existsSync(new URL(image, racine)), `${page} : image d'aperçu (adresse absolue)`);
  }
  assert.equal(titres.size, pages.length, "deux pages ne partagent pas le même titre");
});
