// Export du contenu des cartes en classeur Excel (.xlsx), sans bibliothèque externe.
//
// Un fichier .xlsx est une archive ZIP de fichiers XML (format Office Open XML). Les fichiers sont
// stockés sans compression : l'archive reste petite (quelques dizaines de Ko) et le code simple.
// Ce module sert au navigateur (bouton « Exporter en Excel » du catalogue) et à npm run cartes:export.
// Le classeur modifié est reporté dans js/cards.js par un agent de code (voir AGENTS.md).

// --- Contenu : les cartes et les règles d'or ----------------------------------------------------

export const CARD_COLUMNS = [
  { key: "id", title: "Identifiant", width: 12 },
  { key: "rule", title: "Règle", width: 7 },
  { key: "theme", title: "Thème", width: 24 },
  { key: "kind", title: "Type", width: 12 },
  { key: "deck", title: "Jeu", width: 7 },
  { key: "job", title: "Métier", width: 22 },
  { key: "text", title: "Texte de la carte", width: 70 },
  { key: "why", title: "Pourquoi elle enfreint la règle (undercover)", width: 60 },
  { key: "length", title: "Longueur du texte", width: 10 },
];

export const RULE_COLUMNS = [
  { key: "rule", title: "Règle", width: 7 },
  { key: "theme", title: "Thème (dos de carte)", width: 30 },
  { key: "summary", title: "Énoncé de la charte", width: 70 },
  { key: "question", title: "Question de débrief", width: 70 },
];

export const KINDS = { civilian: "Civil", undercover: "Undercover" };

/** Identifiant stable d'une carte dans l'export : R<règle>-C<n> (civil) ou R<règle>-U<n> (undercover). */
export function cardId(ruleId, kind, index) {
  return `R${ruleId}-${kind === "undercover" ? "U" : "C"}${String(index + 1).padStart(2, "0")}`;
}

const HOW_TO = [
  "Ce classeur contient le texte de toutes les cartes du jeu « Undercover IA responsable ».",
  "",
  "Modifier un texte : changez-le dans l'onglet « Cartes » (colonnes « Texte de la carte » et « Pourquoi elle enfreint la règle ») ou « Règles » (énoncé et question de débrief).",
  "Jeu : « base » pour une carte validée, « ext » pour une carte de l'extension, encore à valider.",
  "Ajouter une carte : ajoutez une ligne avec la règle, le type (Civil ou Undercover), le jeu et le texte, en laissant l'identifiant vide. Une carte undercover a besoin d'une explication.",
  "Supprimer une carte : supprimez sa ligne.",
  "Ne modifiez pas les identifiants : ils relient chaque ligne à sa carte.",
  "Longueur conseillée : 100 à 170 caractères, la même pour les cartes civiles et undercover (une carte undercover plus longue se repère trop vite).",
  "",
  "Pour mettre le jeu à jour, enregistrez le fichier au format Excel (.xlsx) et transmettez-le à la personne qui maintient le jeu : elle demande à un agent de code de reporter les modifications.",
];

/** Classeur des cartes : onglets « Cartes », « Règles » et « Mode d'emploi ». */
export function cardsWorkbook(rules) {
  const cards = [];
  for (const rule of rules) {
    const add = (card, kind, index) =>
      cards.push({
        id: cardId(rule.id, kind, index),
        rule: rule.id,
        theme: rule.theme,
        kind: KINDS[kind],
        deck: card.deck,
        job: card.job || "",
        text: card.text,
        why: card.why || "",
      });
    rule.civilians.forEach((card, i) => add(card, "civilian", i));
    rule.undercovers.forEach((card, i) => add(card, "undercover", i));
  }
  const textColumn = columnLetter(CARD_COLUMNS.findIndex((c) => c.key === "text"));
  return [
    {
      name: "Cartes",
      columns: CARD_COLUMNS,
      // La longueur est une formule : elle se met à jour pendant la modification du texte.
      rows: cards.map((card, i) => CARD_COLUMNS.map((c) => (c.key === "length" ? { formula: `LEN(${textColumn}${i + 2})` } : card[c.key]))),
    },
    {
      name: "Règles",
      columns: RULE_COLUMNS,
      rows: rules.map((rule) => [rule.id, rule.theme, rule.summary, rule.question]),
    },
    {
      name: "Mode d'emploi",
      columns: [{ title: "Mode d'emploi", width: 120 }],
      rows: HOW_TO.map((line) => [line]),
    },
  ];
}

// --- Écriture du classeur ------------------------------------------------------------------------

/**
 * Construit un fichier .xlsx. sheets : [{ name, columns: [{ title, width }], rows: [[valeur]] }].
 * Une valeur est un texte, un nombre ou { formula: "LEN(G2)" }. Renvoie un Uint8Array.
 */
export function buildXlsx(sheets) {
  const files = [
    ["[Content_Types].xml", contentTypes(sheets.length)],
    ["_rels/.rels", ROOT_RELS],
    ["xl/workbook.xml", workbook(sheets)],
    ["xl/_rels/workbook.xml.rels", workbookRels(sheets.length)],
    ["xl/styles.xml", STYLES],
    ...sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, worksheet(sheet)]),
  ];
  return zipStore(files.map(([name, xml]) => [name, new TextEncoder().encode(xml)]));
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function xmlEscape(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function columnLetter(index) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function contentTypes(count) {
  return `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${Array.from({ length: count }, (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`;
}

const ROOT_RELS = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

function workbook(sheets) {
  return `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
<sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;
}

function workbookRels(count) {
  return `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${count + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>
</Relationships>`;
}

// Styles : 0 par défaut, 1 en-tête (gras, fond gris, retour à la ligne), 2 texte (retour à la ligne, en haut).
const STYLES = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cell(ref, value, style) {
  if (value && typeof value === "object" && "formula" in value) return `<c r="${ref}" s="${style}"><f>${xmlEscape(value.formula)}</f></c>`;
  if (typeof value === "number") return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value ?? "")}</t></is></c>`;
}

function worksheet({ columns, rows }) {
  const last = columnLetter(columns.length - 1);
  const header = `<row r="1">${columns.map((c, i) => cell(`${columnLetter(i)}1`, c.title, 1)).join("")}</row>`;
  const body = rows.map((row, r) => `<row r="${r + 2}">${row.map((v, i) => cell(`${columnLetter(i)}${r + 2}`, v, 2)).join("")}</row>`).join("\n");
  return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 15}" customWidth="1"/>`).join("")}</cols>
<sheetData>
${header}
${body}
</sheetData>
${rows.length ? `<autoFilter ref="A1:${last}${rows.length + 1}"/>` : ""}
</worksheet>`;
}

// --- Archive ZIP (sans compression) ---------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 1er janvier 2026 : date fixe, export reproductible
  for (const [name, data] of files) {
    const nameBytes = new TextEncoder().encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // noms en UTF-8
    local.setUint16(8, 0, true); // stocké, sans compression
    local.setUint16(10, DOS_TIME, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, DOS_TIME, true);
    entry.setUint16(14, DOS_DATE, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
