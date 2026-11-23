import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES } from "../js/cards.js";
import { buildXlsx, cardId, cardsWorkbook, crc32 } from "../js/xlsx.js";

// Lit l'archive produite par buildXlsx (fichiers stockés sans compression) et vérifie chaque CRC.
function unzipStored(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map();
  for (let at = 0; view.getUint32(at, true) === 0x04034b50; ) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength));
    const data = bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size);
    assert.equal(view.getUint16(at + 8, true), 0, `${name} : stocké sans compression`);
    assert.equal(crc32(data), view.getUint32(at + 14, true), `${name} : CRC`);
    files.set(name, new TextDecoder().decode(data));
    at += 30 + nameLength + size;
  }
  return files;
}

const xml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

test("l'export Excel est une archive valide avec les onglets Cartes, Règles et Mode d'emploi", () => {
  const files = unzipStored(buildXlsx(cardsWorkbook(RULES)));
  for (const part of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml"]) {
    assert.ok(files.has(part), part);
  }
  const sheets = [...files.get("xl/workbook.xml").matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sheets, ["Cartes", "Règles", "Mode d'emploi"]);
});

test("l'export contient chaque carte avec son identifiant, et chaque règle", () => {
  const files = unzipStored(buildXlsx(cardsWorkbook(RULES)));
  const cards = files.get("xl/worksheets/sheet1.xml");
  const rules = files.get("xl/worksheets/sheet2.xml");
  const total = RULES.reduce((n, r) => n + r.civilians.length + r.undercovers.length, 0);
  assert.equal((cards.match(/<row /g) || []).length, total + 1, "une ligne par carte, plus l'en-tête");
  for (const rule of RULES) {
    rule.civilians.forEach((c, i) => {
      assert.ok(cards.includes(`>${cardId(rule.id, "civilian", i)}<`));
      assert.ok(cards.includes(xml(c.text)), c.text);
    });
    rule.undercovers.forEach((u, i) => {
      assert.ok(cards.includes(`>${cardId(rule.id, "undercover", i)}<`));
      assert.ok(cards.includes(xml(u.text)) && cards.includes(xml(u.why)), u.text);
    });
    assert.ok(rules.includes(xml(rule.summary)) && rules.includes(xml(rule.question)), `règle ${rule.id}`);
  }
});

test("l'export ajoute les traductions en colonnes, sur la ligne de chaque carte", async () => {
  const { EDITIONS } = await import("../js/cards.js");
  const { cardTranslations } = await import("../js/i18n.js");
  const translations = await cardTranslations();
  const rules = EDITIONS.po.rules;
  const files = unzipStored(buildXlsx(cardsWorkbook(rules, translations, "Product Owner")));
  const cards = files.get("xl/worksheets/sheet1.xml");
  const ruleSheet = files.get("xl/worksheets/sheet2.xml");
  for (const lang of Object.keys(translations)) {
    const code = lang.toUpperCase();
    assert.ok(cards.includes(`>Texte ${code}<`) && cards.includes(`>Pourquoi ${code} (undercover)<`), `colonnes ${code}`);
    assert.ok(ruleSheet.includes(`>Thème ${code}<`), `règles ${code}`);
    for (const rule of rules) {
      assert.ok(ruleSheet.includes(xml(translations[lang].rules[rule.id].summary)), `${code} : règle ${rule.id}`);
      // Chaque traduction est sur la ligne de sa carte (même ligne que le texte français).
      for (const card of [rule.civilians[0], rule.undercovers[0]]) {
        const row = cards.split("<row ").find((r) => r.includes(`>${xml(card.text)}<`));
        assert.ok(row?.includes(xml(translations[lang].cards[card.id].text)), `${code} : ${card.id}`);
        if (card.why) assert.ok(row.includes(xml(translations[lang].cards[card.id].why)), `${code} : explication de ${card.id}`);
      }
    }
  }
  assert.ok(files.get("xl/worksheets/sheet3.xml").includes("édition Product Owner"));
});
