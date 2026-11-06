// Reporte dans js/cards.js les textes modifiés dans le classeur Excel des cartes.
//
//   npm run cartes:import -- cartes.xlsx            applique les modifications
//   npm run cartes:import -- cartes.xlsx --essai    affiche les modifications sans rien écrire
//
// Le classeur est celui du bouton « Exporter en Excel » du catalogue (ou de npm run cartes:export),
// modifié puis enregistré au format .xlsx. Chaque ligne de l'onglet « Cartes » est reliée à sa carte
// par son identifiant : une ligne sans identifiant ajoute une carte, une carte absente du fichier
// est supprimée. L'onglet « Règles » met à jour le thème, l'énoncé et la question de chaque règle.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RULES } from "../js/cards.js";
import { CARD_COLUMNS, KINDS, RULE_COLUMNS, cardId } from "../js/xlsx.js";
import { readXlsx } from "./xlsx-read.mjs";

const CARDS_FILE = fileURLToPath(new URL("../js/cards.js", import.meta.url));

/** Lignes d'un onglet sous forme d'objets, d'après les titres de colonnes (l'ordre peut changer). */
function records(rows, columns, sheetName) {
  const header = (rows[0] || []).map((v) => String(v).trim());
  const index = Object.fromEntries(columns.map((c) => [c.key, header.indexOf(c.title)]));
  const missing = columns.filter((c) => index[c.key] < 0 && c.key !== "length").map((c) => `« ${c.title} »`);
  if (missing.length) throw new Error(`Onglet « ${sheetName} » : colonne${missing.length > 1 ? "s" : ""} introuvable${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`);
  return rows.slice(1).map((row, i) => ({
    line: i + 2,
    ...Object.fromEntries(columns.map((c) => [c.key, index[c.key] < 0 ? "" : String(row[index[c.key]] ?? "").trim()])),
  }));
}

/** Applique le classeur aux règles actuelles. Renvoie les nouvelles règles et la liste des changements. */
export function applyWorkbook(sheets, rules = RULES) {
  const cardRows = sheets.get("Cartes");
  const ruleRows = sheets.get("Règles");
  if (!cardRows) throw new Error("Onglet « Cartes » introuvable : utilisez le classeur exporté depuis le catalogue.");
  const errors = [];
  const changes = [];

  // Cartes actuelles, par identifiant d'export
  const current = new Map();
  for (const rule of rules) {
    rule.civilians.forEach((card, i) => current.set(cardId(rule.id, "civilian", i), { rule: rule.id, kind: "civilian", card }));
    rule.undercovers.forEach((card, i) => current.set(cardId(rule.id, "undercover", i), { rule: rule.id, kind: "undercover", card }));
  }

  const next = new Map(rules.map((r) => [r.id, { ...r, civilians: [], undercovers: [] }]));
  const kinds = Object.fromEntries(Object.entries(KINDS).map(([k, label]) => [label.toLowerCase(), k]));
  const seen = new Set();
  const texts = new Map();
  for (const row of records(cardRows, CARD_COLUMNS, "Cartes")) {
    if (!row.id && !row.text) continue; // ligne vide
    const where = `Cartes, ligne ${row.line}${row.id ? ` (${row.id})` : ""}`;
    const ruleId = Number(row.rule);
    const kind = kinds[row.kind.toLowerCase()];
    const deck = row.deck.toLowerCase();
    if (!next.has(ruleId)) errors.push(`${where} : règle « ${row.rule} » inconnue (1 à ${rules.length}).`);
    if (!kind) errors.push(`${where} : type « ${row.kind} » inconnu (Civil ou Undercover).`);
    if (deck !== "base" && deck !== "ext") errors.push(`${where} : jeu « ${row.deck} » inconnu (base ou ext).`);
    if (!row.text) errors.push(`${where} : le texte de la carte est vide.`);
    if (kind === "undercover" && !row.why) errors.push(`${where} : une carte undercover a besoin de son explication.`);
    if (deck === "ext" && !row.job) errors.push(`${where} : une carte de l'extension a besoin de son métier.`);
    if (texts.has(row.text)) errors.push(`${where} : même texte que la ligne ${texts.get(row.text)}.`);
    texts.set(row.text, row.line);
    const before = row.id ? current.get(row.id) : null;
    if (row.id && !before) errors.push(`${where} : identifiant inconnu. Laissez-le vide pour ajouter une carte.`);
    if (row.id && seen.has(row.id)) errors.push(`${where} : identifiant en double.`);
    seen.add(row.id);
    if (!next.has(ruleId) || !kind) continue;

    const card = kind === "undercover" ? { deck, ...(deck === "ext" ? { job: row.job } : {}), text: row.text, why: row.why } : { deck, ...(deck === "ext" ? { job: row.job } : {}), text: row.text };
    next.get(ruleId)[kind === "undercover" ? "undercovers" : "civilians"].push(card);
    if (!before) {
      changes.push(`+ ${where} : nouvelle carte ${kind === "undercover" ? "undercover" : "civile"} de la règle ${ruleId}.`);
      continue;
    }
    if (before.rule !== ruleId || before.kind !== kind) changes.push(`~ ${row.id} : déplacée vers la règle ${ruleId} (carte ${kind === "undercover" ? "undercover" : "civile"}).`);
    for (const field of ["text", "why", "deck", "job"]) {
      const old = before.card[field] || "";
      const now = card[field] || "";
      if (old !== now) changes.push(`~ ${row.id} : ${{ text: "texte", why: "explication", deck: "jeu", job: "métier" }[field]} « ${old} » → « ${now} »`);
    }
  }
  for (const id of current.keys()) if (!seen.has(id)) changes.push(`- ${id} : carte supprimée (« ${current.get(id).card.text} »).`);

  if (ruleRows) {
    for (const row of records(ruleRows, RULE_COLUMNS, "Règles")) {
      if (!row.rule) continue;
      const rule = next.get(Number(row.rule));
      if (!rule) {
        errors.push(`Règles, ligne ${row.line} : règle « ${row.rule} » inconnue.`);
        continue;
      }
      for (const field of ["theme", "summary", "question"]) {
        if (!row[field]) errors.push(`Règles, ligne ${row.line} : ${{ theme: "thème", summary: "énoncé", question: "question" }[field]} vide.`);
        else if (row[field] !== rule[field]) {
          changes.push(`~ Règle ${rule.id} : ${{ theme: "thème", summary: "énoncé", question: "question" }[field]} « ${rule[field]} » → « ${row[field]} »`);
          rule[field] = row[field];
        }
      }
    }
  }

  // Le jeu doit rester jouable : chaque règle garde des cartes dans le jeu de base.
  for (const rule of next.values()) {
    const base = (list) => list.filter((c) => c.deck === "base").length;
    if (base(rule.civilians) < 2) errors.push(`Règle ${rule.id} : il faut au moins 2 bonnes pratiques dans le jeu de base.`);
    if (base(rule.undercovers) < 1) errors.push(`Règle ${rule.id} : il faut au moins une carte undercover dans le jeu de base.`);
  }
  return { rules: [...next.values()], changes, errors };
}

/** Réécrit js/cards.js : l'en-tête (commentaires, DECKS) est conservé, la liste RULES régénérée. */
export function renderCardsJs(source, rules) {
  const q = (s) => JSON.stringify(s);
  const header = source.slice(0, source.indexOf("export const RULES = ["));
  const card = (c, indent) =>
    c.why !== undefined
      ? `${indent}{\n${indent}  deck: ${q(c.deck)},\n${c.job ? `${indent}  job: ${q(c.job)},\n` : ""}${indent}  text: ${q(c.text)},\n${indent}  why: ${q(c.why)},\n${indent}},\n`
      : `${indent}{ deck: ${q(c.deck)}, ${c.job ? `job: ${q(c.job)}, ` : ""}text: ${q(c.text)} },\n`;
  let out = `${header}export const RULES = [\n`;
  for (const r of rules) {
    out += `  {\n    id: ${r.id},\n    theme: ${q(r.theme)},\n    back: ${q(r.back)},\n    summary: ${q(r.summary)},\n    question:\n      ${q(r.question)},\n    civilians: [\n`;
    for (const c of r.civilians) out += card(c, "      ");
    out += "    ],\n    undercovers: [\n";
    for (const c of r.undercovers) out += card({ ...c, why: c.why ?? "" }, "      ");
    out += "    ],\n  },\n";
  }
  return `${out}];\n`;
}

// --- Ligne de commande ----------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--essai");
  if (!file) {
    console.error("Usage : npm run cartes:import -- cartes.xlsx [--essai]");
    process.exit(1);
  }
  try {
    const { rules, changes, errors } = applyWorkbook(readXlsx(readFileSync(file)));
    if (errors.length) {
      console.error(`Le classeur contient ${errors.length} erreur${errors.length > 1 ? "s" : ""}, rien n'a été modifié :\n${errors.map((e) => `  ${e}`).join("\n")}`);
      process.exit(1);
    }
    if (!changes.length) {
      console.log("Aucune modification : js/cards.js est déjà à jour.");
      process.exit(0);
    }
    console.log(`${changes.length} modification${changes.length > 1 ? "s" : ""} :\n${changes.map((c) => `  ${c}`).join("\n")}`);
    if (dryRun) {
      console.log("\nEssai : js/cards.js n'a pas été modifié.");
    } else {
      writeFileSync(CARDS_FILE, renderCardsJs(readFileSync(CARDS_FILE, "utf8"), rules));
      console.log("\njs/cards.js mis à jour. Lancez npm test, puis incrémentez VERSION dans sw.js.");
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
