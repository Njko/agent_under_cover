// Textes de l'interface dans la langue active : t("clé", { paramètres }).
// Les textes sont rangés par langue dans js/i18n/<langue>.js, et ceux des cartes et des règles d'or
// dans js/i18n/cards-<langue>.js. Le français est la référence : un texte absent d'une autre langue
// s'affiche en français (fr.js pour l'interface, js/cards.js pour les cartes).

import fr from "./i18n/fr.js";

// Langues proposées, sous leur propre nom.
export const LANGUAGES = { fr: "Français", en: "English" };

export let lang = "fr";
let dict = fr;
// Textes traduits des cartes (clé : identifiant de la carte) et des règles d'or (clé : numéro).
let content = { rules: {}, cards: {} };

const known = (code) => typeof code === "string" && Object.hasOwn(LANGUAGES, code);

/**
 * Langue de l'interface : celle choisie sur ce téléphone, sinon celle du lien ouvert, sinon la
 * première langue du navigateur que le jeu connaît, sinon le français.
 */
export function pickLanguage(chosen, fromLink, browser = []) {
  const candidates = [chosen, fromLink, ...browser.map((tag) => String(tag).slice(0, 2).toLowerCase())];
  return candidates.find(known) || "fr";
}

/** Charge les textes d'une langue (fichiers téléchargés seulement si elle n'est pas le français). */
export async function loadLanguage(code) {
  lang = known(code) ? code : "fr";
  pluralRules.clear();
  if (lang === "fr") {
    dict = fr;
    content = { rules: {}, cards: {} };
    return;
  }
  const [ui, cards] = await Promise.all([import(`./i18n/${lang}.js`), import(`./i18n/cards-${lang}.js`)]);
  dict = ui.default;
  content = cards.default;
}

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

/** Texte d'une carte dans la langue active : field « text » (la carte) ou « why » (l'explication). */
export function cardText(card, field = "text") {
  return content.cards[card.id]?.[field] ?? card[field];
}

/** Texte d'une règle d'or dans la langue active : field « theme », « summary » ou « question ». */
export function ruleText(rule, field) {
  return content.rules[rule.id]?.[field] ?? rule[field];
}

/** Date AAAA-MM-JJ en toutes lettres (« 23 novembre 2026 »). */
export function formatDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
}

/** Nombre décimal à un chiffre après la virgule (« 12,5 »). */
export function formatDecimal(n) {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }).format(n);
}
