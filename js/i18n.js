// Textes de l'interface dans la langue active : t("clé", { paramètres }).
// Les textes sont rangés par langue dans js/i18n/<langue>.js. Le français (fr.js) est la référence :
// un texte absent d'une autre langue s'affiche en français.

import fr from "./i18n/fr.js";

export let lang = "fr";
const dict = fr;

const pluralRules = new Map();
function pluralCategory(type, n) {
  const key = `${lang}:${type}`;
  if (!pluralRules.has(key)) pluralRules.set(key, new Intl.PluralRules(lang, { type }));
  return pluralRules.get(key).select(n);
}

/**
 * Texte de la clé « key ». Chaque {nom} est remplacé par params.nom, tel quel : échappez les valeurs
 * insérées dans du HTML. Une entrée peut varier selon un nombre ({ one: "…", other: "…" }) : la forme
 * est choisie d'après params.n, ou d'après params.ord pour un ordinal (1er, 2e…).
 */
export function t(key, params = {}) {
  let text = dict[key] ?? fr[key];
  if (text === undefined) return key;
  if (typeof text === "object") {
    const category = "ord" in params ? pluralCategory("ordinal", params.ord) : pluralCategory("cardinal", params.n);
    text = text[category] ?? text.other;
  }
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** Date AAAA-MM-JJ en toutes lettres (« 23 novembre 2026 »). */
export function formatDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
}

/** Nombre décimal à un chiffre après la virgule (« 12,5 »). */
export function formatDecimal(n) {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(n);
}
