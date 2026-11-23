// Exporte le contenu des cartes dans un classeur Excel, comme le bouton « Exporter en Excel » du
// catalogue, avec les traductions en colonnes.
//   npm run cartes:export -- [fichier.xlsx] [édition]
// Par défaut : cartes-undercover.xlsx, édition classique (autre édition : po).

import { writeFileSync } from "node:fs";
import { EDITIONS } from "../js/cards.js";
import { cardTranslations } from "../js/i18n.js";
import fr from "../js/i18n/fr.js";
import { buildXlsx, cardsWorkbook } from "../js/xlsx.js";

const file = process.argv[2] || "cartes-undercover.xlsx";
const edition = process.argv[3] || "classique";
if (!EDITIONS[edition]) throw new Error(`Édition inconnue : ${edition} (${Object.keys(EDITIONS).join(", ")})`);
writeFileSync(file, buildXlsx(cardsWorkbook(EDITIONS[edition].rules, await cardTranslations(), fr[`edition.${edition}`])));
console.log(`Classeur écrit : ${file}`);
