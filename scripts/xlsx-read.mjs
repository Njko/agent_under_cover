// Lecture d'un classeur .xlsx (Node uniquement), sans bibliothèque externe.
// Gère les fichiers produits par js/xlsx.js comme ceux réenregistrés par Excel ou LibreOffice
// (archive compressée, textes partagés, texte enrichi, formules).

import { inflateRawSync } from "node:zlib";

/** Contenu de l'archive ZIP : Map nom de fichier → Buffer. */
export function readZip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx) valide.");
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(at) !== 0x02014b50) throw new Error("Archive .xlsx endommagée.");
    const method = buffer.readUInt16LE(at + 10);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method !== 0 && method !== 8) throw new Error(`Compression non prise en charge dans ${name}.`);
    files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attributes(tag) {
  const attrs = {};
  for (const [, name, value] of tag.matchAll(/([\w:]+)="([^"]*)"/g)) attrs[name.replace(/^\w+:/, "")] = decodeEntities(value);
  return attrs;
}

// Texte d'un élément : concaténation de ses balises <t> (le texte enrichi est découpé en plusieurs).
function textOf(xml) {
  return [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => decodeEntities(m[1])).join("");
}

function columnIndex(ref) {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

/** Feuilles du classeur : Map nom de l'onglet → lignes (tableaux de valeurs, texte ou nombre). */
export function readXlsx(buffer) {
  const files = readZip(buffer);
  const read = (name) => files.get(name)?.toString("utf8");
  const workbook = read("xl/workbook.xml");
  if (!workbook) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx) valide.");
  const targets = new Map(
    [...(read("xl/_rels/workbook.xml.rels") || "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
      const a = attributes(m[0]);
      return [a.Id, a.Target.startsWith("/") ? a.Target.slice(1) : `xl/${a.Target}`];
    })
  );
  const shared = [...(read("xl/sharedStrings.xml") || "").matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => textOf(m[1]));
  const sheets = new Map();
  for (const m of workbook.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    const { name, id } = attributes(m[0]);
    const xml = read(targets.get(id)) || "";
    const rows = [];
    for (const row of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
      const r = Number(attributes(row[1]).r) - 1;
      const values = [];
      for (const c of (row[2] || "").matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        const a = attributes(c[1]);
        const inner = c[2] || "";
        const v = inner.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
        let value = "";
        if (a.t === "s") value = shared[Number(v)] ?? "";
        else if (a.t === "inlineStr") value = textOf(inner);
        else if (a.t === "str" || a.t === "e") value = decodeEntities(v ?? "");
        else if (a.t === "b") value = v === "1";
        else if (v !== undefined) value = Number(v);
        values[a.r ? columnIndex(a.r) : values.length] = value;
      }
      rows[Number.isNaN(r) ? rows.length : r] = Array.from(values, (v) => v ?? "");
    }
    sheets.set(name, Array.from(rows, (row) => row ?? []));
  }
  return sheets;
}
