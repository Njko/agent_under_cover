// Exporte le contenu des cartes dans un classeur Excel, comme le bouton « Exporter en Excel » du
// catalogue.   npm run cartes:export -- [fichier.xlsx]   (par défaut : cartes-undercover.xlsx)

import { writeFileSync } from "node:fs";
import { RULES } from "../js/cards.js";
import { buildXlsx, cardsWorkbook } from "../js/xlsx.js";

const file = process.argv[2] || "cartes-undercover.xlsx";
writeFileSync(file, buildXlsx(cardsWorkbook(RULES)));
console.log(`Classeur écrit : ${file}`);
