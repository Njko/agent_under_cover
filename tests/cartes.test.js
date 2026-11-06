import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { RULES } from "../js/cards.js";
import { buildXlsx, cardsWorkbook, crc32 } from "../js/xlsx.js";
import { readXlsx, readZip } from "../scripts/xlsx-read.mjs";
import { applyWorkbook, renderCardsJs } from "../scripts/cartes-import.mjs";

const exported = () => readXlsx(Buffer.from(buildXlsx(cardsWorkbook(RULES))));

test("l'export Excel contient toutes les cartes et les règles", () => {
  const sheets = exported();
  assert.deepEqual([...sheets.keys()], ["Cartes", "Règles", "Mode d'emploi"]);
  const total = RULES.reduce((n, r) => n + r.civilians.length + r.undercovers.length, 0);
  assert.equal(sheets.get("Cartes").length, total + 1, "une ligne par carte, plus l'en-tête");
  assert.equal(sheets.get("Règles").length, RULES.length + 1);
  const first = sheets.get("Cartes")[1];
  assert.equal(first[0], "R1-C01");
  assert.equal(first[6], RULES[0].civilians[0].text);
});

test("importer l'export sans modification redonne exactement js/cards.js", () => {
  const { rules, changes, errors } = applyWorkbook(exported());
  assert.deepEqual(errors, []);
  assert.deepEqual(changes, []);
  const source = readFileSync(new URL("../js/cards.js", import.meta.url), "utf8");
  assert.equal(renderCardsJs(source, rules), source);
});

test("l'import reporte les textes modifiés, ajoutés et supprimés", () => {
  const sheets = exported();
  const cards = sheets.get("Cartes");
  cards[1][6] = "Texte modifié pour le test, assez long pour ressembler à une vraie carte du jeu.";
  cards.splice(2, 1); // supprime R1-C02
  cards.push(["", 3, "", "Undercover", "ext", "Réclamations", "Nouvelle carte undercover de test.", "Son explication."]);
  sheets.get("Règles")[1][3] = "Nouvelle question de débrief ?";
  const { rules, changes, errors } = applyWorkbook(sheets);
  assert.deepEqual(errors, []);
  assert.equal(changes.length, 4);
  assert.equal(rules[0].civilians[0].text, cards[1][6]);
  assert.equal(rules[0].civilians.length, RULES[0].civilians.length - 1);
  assert.equal(rules[2].undercovers.at(-1).why, "Son explication.");
  assert.equal(rules[0].question, "Nouvelle question de débrief ?");
});

test("l'import refuse un classeur incohérent sans rien modifier", () => {
  const sheets = exported();
  const cards = sheets.get("Cartes");
  cards[1][4] = "autre"; // jeu inconnu
  cards.push(["R9-C99", 1, "", "Civil", "base", "", "Carte avec un identifiant inconnu."]);
  cards.push(["", 2, "", "Undercover", "base", "", "Undercover sans explication."]);
  cards.push(["", 2, "", "Civil", "base", "", cards[3][6]]); // texte en double
  const { errors } = applyWorkbook(sheets);
  assert.equal(errors.length, 4, errors.join("\n"));
});

test("le lecteur accepte une archive compressée, comme celles d'Excel", () => {
  // Recompresse chaque fichier de l'export (méthode 8, deflate) dans une nouvelle archive.
  const files = readZip(Buffer.from(buildXlsx(cardsWorkbook(RULES))));
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, data] of files) {
    const packed = deflateRawSync(data);
    const n = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(n.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(crc32(data), 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(n.length, 28);
    entry.writeUInt32LE(offset, 42);
    parts.push(local, n, packed);
    central.push(entry, n);
    offset += 30 + n.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  const sheets = readXlsx(Buffer.concat([...parts, dir, end]));
  assert.deepEqual(applyWorkbook(sheets).changes, []);
});
