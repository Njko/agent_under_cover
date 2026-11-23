// Génère les pages d'entrée des liens à partager, une par langue et par page : links/<langue>/<page>/index.html.
// Elles donnent aux liens un aperçu propre dans Teams et les messageries (titre, description, image dans la
// langue du lien), puis js/entree.js redirige vers l'application en gardant le fragment.
//
//   npm run liens:generer
//
// À relancer après l'ajout d'une langue (LANGUAGES dans js/i18n.js) ou un changement des textes « link.* ».
// Les pages sont versionnées : le site reste statique, sans étape de construction au déploiement.
// tests/liens.test.js vérifie qu'elles sont à jour.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "../js/i18n.js";

const racine = new URL("../", import.meta.url);

// Adresse publique des images d'aperçu : les messageries ne résolvent pas les chemins relatifs.
export const SITE = "https://njko.github.io/agent_under_cover/";

// page : route de l'application ouverte quand le lien n'a pas de fragment.
export const PAGES = {
  join: "#/join",
  results: "",
  cards: "#/cards",
  rules: "#/rules",
  news: "#/nouveautes",
};

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Contenu de chaque page d'entrée : { "links/<langue>/<page>/index.html": html }. */
export async function liensPages() {
  // Même politique de sécurité que l'application : relue dans index.html, qui en est la référence.
  const csp = readFileSync(new URL("index.html", racine), "utf8").match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const pages = {};
  for (const lang of Object.keys(LANGUAGES)) {
    const { default: dict } = await import(`../js/i18n/${lang}.js`);
    const app = dict["app.name"];
    for (const [page, route] of Object.entries(PAGES)) {
      const title = `${dict[`link.${page}.title`]} – ${app}`;
      const description = dict[`link.${page}.description`];
      const opening = dict["link.opening"].replace("{app}", `<a href="../../../${route}">${app}</a>`);
      pages[`links/${lang}/${page}/index.html`] = `<!doctype html>
<html lang="${lang}" data-lang="${lang}" data-root="../../../" data-route="${route}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <!-- Page générée par scripts/liens-generer.mjs (npm run liens:generer) : ne pas modifier à la main. Voir doc/fonctionnement-technique.md. -->
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="referrer" content="no-referrer">
  <meta name="description" content="${attr(description)}">
  <meta name="theme-color" content="#00008f">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${dict["link.locale"]}">
  <meta property="og:site_name" content="${attr(app)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:image" content="${SITE}img/apercu-${lang}.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${attr(dict["link.imageAlt"])}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../../../icons/icon.svg" type="image/svg+xml">
  <script src="../../../js/entree.js"></script>
</head>
<body>
  <p>${opening}</p>
</body>
</html>
`;
    }
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, html] of Object.entries(await liensPages())) {
    const file = new URL(path, racine);
    mkdirSync(new URL("./", file), { recursive: true });
    writeFileSync(file, html);
    console.log(path);
  }
}
