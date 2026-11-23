import { EDITION_IDS, RULES, rulesOf } from "./cards.js";
import { CHANGELOG, LATEST_CHANGE } from "./changelog.js";
import { ICONS } from "./icons.js";
import { LANGUAGES, cardText, formatDate, formatDecimal, lang, loadLanguage, pickLanguage, ruleText, t } from "./i18n.js";
import {
  CODE_LENGTH,
  MAX_ROUNDS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_BASE_PLAYERS,
  MIN_PLAYERS_TWO_UNDERCOVERS,
  decodeCode,
  dealRound,
  COOP_MAX_POINTS,
  coopFound,
  coopPoints,
  deckShortage,
  newCode,
  outcome,
  rulePool,
  validateSettings,
  wrongGuesses,
} from "./game.js";

const app = document.getElementById("app");
const modal = document.getElementById("modal");

// Issue de chaque manche, stockée en un caractère (elle voyage aussi dans le lien des résultats) :
// coopératif : points obtenus « 0 » à « 3 » ; compétitif : « c » équipiers, « i » undercover ;
// dans les deux modes : « r » rôles révélés sans vainqueur, « s » manche passée.
const RESULT_CODES = { civilians: "c", impostors: "i", revealed: "r" };

function resultLabel(res) {
  if (/^\d$/.test(res)) {
    const pts = Number(res);
    return pts ? t("result.found", { ord: COOP_MAX_POINTS + 1 - pts, pts }) : t("result.foundZero");
  }
  return res && "cirsn".includes(res) ? t(`result.${res}`) : "";
}

function resultClass(res) {
  return /^\d$/.test(res) ? (Number(res) > 0 ? "c" : "i") : res;
}

// Score collectif : total de l'équipe (coopératif) ou manches gagnées par camp (compétitif).
// « rounds » : nombre de manches sur lequel calculer le maximum (toute la partie, ou les manches jouées).
// Manches comptées dans le score : toutes sauf celles jamais jouées (« n », partie terminée plus tôt).
function countedRounds(results) {
  return Object.values(results).filter((r) => r !== "n").length;
}

function teamScore(game, results, rounds = countedRounds(results)) {
  const codes = Object.values(results);
  if (game.mode === "coop") {
    return { points: codes.reduce((sum, r) => sum + (/^\d$/.test(r) ? Number(r) : 0), 0), max: rounds * COOP_MAX_POINTS };
  }
  return { civilians: codes.filter((r) => r === "c").length, undercover: codes.filter((r) => r === "i").length };
}

function teamScoreHtml(game, results, big = false) {
  // Pendant la partie, le maximum porte sur toutes les manches prévues ; à la fin, sur les manches jouées.
  const score = teamScore(game, results, big ? countedRounds(results) : game.rounds);
  if (game.mode === "coop") {
    const ratio = score.max ? score.points / score.max : 0;
    const verdict = !score.max ? "" : t(ratio >= 0.8 ? "score.excellent" : ratio >= 0.5 ? "score.good" : "score.tough");
    return `
      <div class="team-score ${big ? "team-score--big" : ""}">
        <p class="label">${t("score.team")}</p>
        <p class="team-score-value">${t("score.points", { points: score.points, max: score.max })}</p>
        ${big && verdict ? `<p>${verdict}</p>` : ""}
      </div>`;
  }
  return `
    <div class="team-score ${big ? "team-score--big" : ""}">
      <p class="label">${t("score.roundsWon")}</p>
      <p class="team-score-value">${t("score.camps", { civilians: score.civilians, undercover: score.undercover })}</p>
    </div>`;
}

// Issue de la manche selon le mode : en coopératif, gagnée dès que l'équipe a trouvé tous les undercovers.
function roundOutcome(game, deal, designated) {
  if (game.mode === "coop") return coopFound(deal, designated) ? "found" : null;
  return outcome(deal, designated);
}

// --- Utilitaires ----------------------------------------------------------------------------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible (navigation privée) : le jeu fonctionne quand même */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* rien à effacer */
    }
  },
  keys() {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};

// Efface d'un téléphone tout ce qui concerne une partie (animateur ou joueur).
function forgetGame(code) {
  for (const key of store.keys()) {
    if (key === `host:${code}` || key === `names:${code}` || key.startsWith(`player:${code}:`)) store.remove(key);
  }
  if (store.get("lastHost", null) === code) store.remove("lastHost");
  if (store.get("lastPlayer", null)?.code === code) store.remove("lastPlayer");
}

function forgetAllGames() {
  for (const key of store.keys()) {
    if (/^(host|names|player):/.test(key) || key === "lastHost" || key === "lastPlayer") store.remove(key);
  }
}

// Une page peut imposer son adresse publique (ex. quand elle est intégrée dans une iframe).
function baseUrl() {
  return window.UNDERCOVER_SHARE_URL || location.href.split("#")[0];
}

// Les liens à partager passent par une page d'entrée (liens/<page>/) qui porte l'aperçu du lien
// (titre, description, image) ; le fragment, lui, n'est jamais envoyé au serveur.
function entryUrl(page) {
  return `${baseUrl().replace(/[^/]*$/, "")}liens/${page}/`;
}

// Les prénoms et les résultats voyagent dans les liens (il n'y a pas de serveur pour les partager),
// encodés en base64url pour rester dans des liens courts : lettres, chiffres, - _ ~.
const MAX_NAME_LENGTH = 20;

function cleanName(name) {
  return String(name || "").replace(/[|\n,]/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token) {
  const bytes = Uint8Array.from(atob(token.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function nameList(names, players) {
  return Array.from({ length: players }, (_, i) => cleanName(names[i + 1]));
}

function encodeNames(names, players) {
  const list = nameList(names, players);
  return list.some(Boolean) ? toBase64Url(list.join("|")) : "";
}

function decodeNames(token) {
  try {
    const names = {};
    fromBase64Url(token)
      .split("|")
      .forEach((n, i) => {
        if (cleanName(n)) names[i + 1] = cleanName(n);
      });
    return names;
  } catch {
    return {};
  }
}

function joinUrl(code, seat, names = {}, players = 0) {
  const token = encodeNames(names, players);
  return `${entryUrl("rejoindre")}#join-${code}${seat ? `-${seat}` : ""}${token ? `~${token}` : ""}`;
}

// Lien des résultats : prénoms, scores et issue de chaque manche.
function resultsUrl(code, game, state) {
  const results = Array.from({ length: game.rounds }, (_, i) => (i < playedRounds(state) ? state.results[i + 1] || "s" : "n")).join("");
  const scores = "";
  return `${entryUrl("resultats")}#results-${code}~${toBase64Url([nameList(state.names, game.players).join("|"), scores, results].join("\n"))}`;
}

function decodeResults(token, players) {
  try {
    const [names, scores, results] = fromBase64Url(token).split("\n");
    const nameMap = {};
    names.split("|").forEach((n, i) => {
      if (cleanName(n)) nameMap[i + 1] = cleanName(n);
    });
    const scoreMap = {};
    scores.split(",").forEach((s, i) => {
      if (i < players) scoreMap[i + 1] = Number(s) || 0;
    });
    return { names: nameMap, scores: scoreMap, results: Object.fromEntries([...results].map((r, i) => [i + 1, r])) };
  } catch {
    return null;
  }
}

// Prénoms connus par le téléphone d'un joueur (reçus via le QR code).
function knownNames(code) {
  return store.get(`names:${code}`, {});
}

// La bibliothèque QR (21 Ko) n'est téléchargée que lorsqu'un écran affiche un QR code :
// les téléphones des joueurs ne la chargent jamais.
let qrLibrary = null;

function loadQrLibrary() {
  qrLibrary ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "vendor/qrcode.min.js";
    script.onload = resolve;
    script.onerror = () => {
      qrLibrary = null;
      reject();
    };
    document.head.append(script);
  });
  return qrLibrary;
}

function qrSlot(text, label, cell = 6, className = "") {
  return `<div class="qr ${className}" data-qr="${esc(text)}" data-cell="${cell}" role="img" aria-label="${esc(label)}"></div>`;
}

function hydrateQr(root = document) {
  const slots = [...root.querySelectorAll("[data-qr]")].filter((el) => el.dataset.drawn !== el.dataset.qr);
  if (!slots.length) return;
  loadQrLibrary()
    .then(() => {
      for (const el of slots) {
        const qr = window.qrcode(0, "M");
        qr.addData(el.dataset.qr);
        qr.make();
        el.innerHTML = qr.createSvgTag({ cellSize: Number(el.dataset.cell), margin: 2, scalable: true });
        el.dataset.drawn = el.dataset.qr;
      }
    })
    .catch(() => slots.forEach((el) => (el.textContent = t("qr.unavailable"))));
}

function prettyCode(code) {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

// Message lu par les lecteurs d'écran sans déplacer le focus (zone aria-live de index.html).
function announce(message) {
  const live = document.getElementById("live");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => (live.textContent = message), 50);
}

// Élément qui avait le focus avant l'ouverture de la modale, pour l'y ramener à la fermeture.
let modalOpener = null;

function setBackgroundInert(on) {
  for (const el of document.querySelectorAll("body > :not(#modal)")) el.inert = on;
}

// --- Animations -----------------------------------------------------------------------------
// Les animations CSS sont coupées en low-tech et si l'appareil demande moins d'animations ; les effets
// pilotés en JavaScript (compteur de score, cascade) vérifient la même condition.
function motionAllowed() {
  return !isLowTech() && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let lastRoute = null; // dernier écran affiché, pour n'animer que les changements d'écran
let justRevealed = null; // { code, seat } du joueur que l'on vient de désigner ou d'éliminer
const scoreSeen = new Map(); // score affiché par partie, pour animer sa progression
let onModalClosed = null;

// Score de l'équipe : si un nombre a augmenté depuis le dernier affichage, il défile jusqu'à sa
// nouvelle valeur et « +N » apparaît. Si une fenêtre est ouverte (résultat d'une désignation),
// l'animation attend sa fermeture pour être vue.
function animateScore(code) {
  const strongs = [...app.querySelectorAll(".team-score-value strong")];
  const values = strongs.map((el) => Number(el.textContent));
  const previous = scoreSeen.get(code);
  scoreSeen.set(code, values);
  if (!previous || previous.length !== values.length || !motionAllowed()) return;
  const gains = values.map((v, i) => v - previous[i]);
  if (!gains.some((g) => g > 0)) return;
  strongs.forEach((el, i) => gains[i] > 0 && (el.textContent = previous[i]));
  const run = () => {
    strongs.forEach((el, i) => {
      if (gains[i] <= 0 || !el.isConnected) return;
      countUp(el, previous[i], values[i]);
      el.classList.add("bump");
      el.insertAdjacentHTML("afterend", `<span class="score-delta" aria-hidden="true">+${gains[i]}</span>`);
      el.nextElementSibling.addEventListener("animationend", (e) => e.target.remove());
    });
  };
  setTimeout(() => (modal.hidden ? run() : (onModalClosed = run)), 0);
}

// Fait défiler un nombre affiché de « from » à « to ».
function countUp(el, from, to, duration = 600) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(from + (to - from) * t);
    if (t < 1 && el.isConnected) requestAnimationFrame(step);
  };
  el.textContent = from;
  requestAnimationFrame(step);
}

// Fin de partie et résultats : le score de l'équipe monte depuis 0 ; les manches arrivent une à une.
function animateFinalScore() {
  app.querySelectorAll(".results-rounds .recap li").forEach((li, i) => li.style.setProperty("--i", Math.min(i, 16)));
  if (!motionAllowed()) return;
  app.querySelectorAll(".team-score--big .team-score-value strong").forEach((el) => countUp(el, 0, Number(el.textContent), 900));
}

function openModal(html) {
  if (modal.hidden) modalOpener = document.activeElement;
  modal.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
  // Le premier titre (ou à défaut le premier paragraphe) nomme la boîte de dialogue.
  const title = modal.querySelector("h2, p");
  if (title) {
    title.id = "modal-title";
    modal.firstElementChild.setAttribute("aria-labelledby", "modal-title");
  }
  modal.hidden = false;
  setBackgroundInert(true);
  hydrateQr(modal);
  modal.querySelector("button, a, input")?.focus();
}

function confirmModal(message, okLabel, onConfirm, danger = false) {
  openModal(`
    <p>${esc(message)}</p>
    <div class="actions">
      <button class="btn ${danger ? "btn--danger" : "btn--primary"}" id="confirm-ok">${esc(okLabel)}</button>
      <button class="btn" data-close>${t("common.cancel")}</button>
    </div>`);
  document.getElementById("confirm-ok").onclick = () => {
    closeModal();
    onConfirm();
  };
}

function closeModal(restoreFocus = true) {
  if (modal.hidden) return;
  modal.hidden = true;
  modal.innerHTML = "";
  setBackgroundInert(false);
  // Après un nouveau rendu, l'élément d'origine peut avoir disparu : on se rabat sur le titre de l'écran.
  if (restoreFocus) (modalOpener?.isConnected ? modalOpener : app.querySelector("h1"))?.focus({ preventScroll: true });
  modalOpener = null;
  const then = onModalClosed;
  onModalClosed = null;
  then?.();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.closest("[data-close]")) closeModal();
});

// label : « host » (l'animation) ou « game » (une partie rejointe).
function confirmForget(code, label) {
  confirmModal(
    t("forget.confirm", { what: t(`forget.${label}`) }),
    t("forget.ok"),
    () => {
      forgetGame(code);
      go("#/");
    },
    true
  );
}

function cardHtml({ ruleId, text, kind = "civilian", label, theme, summary, note, card }) {
  // card : objet carte de js/cards.js. Sa mention « Extension » n'est montrée qu'au catalogue et au
  // débrief, jamais pendant le jeu : elle pourrait aider à deviner un rôle.
  const ext = card?.deck === "ext";
  // L'en-tête nomme la règle d'or (numéro et titre), sur toutes les cartes.
  const rule = RULES.find((r) => r.id === ruleId);
  const ruleTheme = theme ?? (rule ? ruleText(rule, "theme") : "");
  return `
    <article class="card card--rule${ruleId} ${kind === "undercover" ? "card--undercover" : ""}" data-deck="${card?.deck || ""}">
      <header class="card-head">
        <p class="card-rule"><span class="card-rule-num">${t("card.rule", { id: ruleId })}</span><span class="visually-hidden"> : </span><span class="card-rule-title">${esc(ruleTheme)}</span></p>
        <i></i>
      </header>
      ${summary ? `<p class="card-summary">${esc(summary)}</p>` : ""}
      <p class="card-text">${esc(text ?? cardText(card))}</p>
      ${ext ? `<p class="card-deck">${t("deck.ext")}</p>` : ""}
      ${note ? `<p class="card-note">${note}</p>` : ""}
      ${kind === "undercover" ? `<footer class="card-foot">${t("card.undercover")}</footer>` : ""}
      ${label ? `<footer class="card-label">${esc(label)}</footer>` : ""}
    </article>`;
}

// --- Langue ----------------------------------------------------------------------------------
// Le choix est mémorisé sur ce téléphone ; la page est rechargée pour tout afficher dans la langue choisie.
function languagePicker() {
  const options = Object.entries(LANGUAGES)
    .map(([code, name]) => `<option value="${code}" lang="${code}" ${code === lang ? "selected" : ""}>${name}</option>`)
    .join("");
  return `<p class="lang-pick"><label for="lang-select"><span aria-hidden="true">🌐 </span>${t("lang.label")}</label><select id="lang-select">${options}</select></p>`;
}

function bindLanguagePicker() {
  document.getElementById("lang-select")?.addEventListener("change", (e) => {
    store.set("lang", e.target.value);
    location.reload();
  });
}

// --- Mode low-tech ---------------------------------------------------------------------------
// Inspiré du site solaire de Low-tech Magazine : police du système, pas de couleurs ni d'effets,
// dessins vectoriels simplifiés intégrés à la page, et les petites illustrations décoratives sont supprimées.

function isLowTech() {
  return document.documentElement.hasAttribute("data-lowtech");
}

function setLowTech(on) {
  document.documentElement.toggleAttribute("data-lowtech", on);
  store.set("lowtech", on);
  syncModeToggle();
  render();
}

function syncModeToggle() {
  const btn = document.getElementById("mode-toggle");
  if (!btn) return;
  btn.setAttribute("aria-checked", String(isLowTech()));
  btn.title = t(isLowTech() ? "lowtech.toggleOn" : "lowtech.toggleOff");
}

// Poids réellement transféré depuis l'ouverture de la page (0 pour ce qui vient du cache).
function paintWeight() {
  const el = document.getElementById("weight");
  if (!el) return;
  if (!isLowTech()) {
    el.hidden = true;
    return;
  }
  const bytes = transferredBytes();
  el.hidden = false;
  el.innerHTML = t("lowtech.weight", { size: formatKo(bytes) });
}

function transferredBytes() {
  return [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")].reduce(
    (sum, e) => sum + (e.transferSize || 0),
    0
  );
}

function formatKo(bytes) {
  return t("unit.ko", { n: formatDecimal(bytes / 1024) });
}

/**
 * Dos de carte. « small » : vignette décorative (supprimée en mode low-tech).
 * Sinon : grande image couleur, ou en low-tech une carte en texte avec un dessin vectoriel simplifié (< 1 Ko).
 */
function backImg(rule, className = "back", { lazy = true, small = false } = {}) {
  const alt = t("back.alt", { id: rule.id, theme: esc(ruleText(rule, "theme")) });
  if (isLowTech()) {
    if (small) return "";
    return `
      <div class="lt-back ${className}" role="img" aria-label="${alt}">
        <svg class="lt-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[rule.id]}</svg>
        <span class="lt-back-label">${t("rule.n", { id: rule.id })}</span>
        <strong>${esc(ruleText(rule, "theme"))}</strong>
        <span class="lt-back-foot">${t("back.foot")}</span>
      </div>`;
  }
  const loading = lazy ? 'loading="lazy"' : "";
  // Les vignettes sont toujours accompagnées du nom de la règle en texte : elles sont décoratives.
  if (small) return `<img class="${className}" src="${rule.back.replace(".webp", "-mini.webp")}" width="200" height="279" draggable="false" ${loading} alt="">`;
  // Grand dos : illustration sans texte, et le texte de la carte en HTML (traduisible).
  return `
    <div class="${className} back-art back--r${rule.id}" role="img" aria-label="${alt}">
      <img src="${rule.back}" width="640" height="893" draggable="false" ${loading} alt="">
      <span class="back-text" aria-hidden="true">
        <span class="back-label">${t("back.label")}</span>
        <strong>${esc(ruleText(rule, "theme"))}</strong>
        <span class="back-foot">${t("back.foot")}</span>
      </span>
    </div>`;
}

// Carte secrète : le dos de la carte de la règle d'or la masque. On la retourne en la touchant, en
// cliquant dessus ou en la faisant glisser (le même geste la cache), ou avec le bouton
// « Afficher ma carte », utilisable au clavier et avec un lecteur d'écran.
function secretHtml(rule, front) {
  return `
    <div class="secret" id="secret">
      <div class="secret-cover secret-cover--back" aria-hidden="true">${backImg(rule, "back", { lazy: false })}</div>
      <div class="secret-content" id="secret-content" tabindex="-1" aria-label="${t("secret.label")}">${front}</div>
    </div>
    <button type="button" class="btn secret-toggle" id="secret-toggle" aria-pressed="false" aria-controls="secret-content">${t("secret.show")}</button>
    <p class="secret-hint"><span aria-hidden="true">👆 </span>${t("secret.hint")}</p>`;
}

// Carte secrète : une touche, un clic ou un glissement horizontal la retourne, un second geste la cache.
// Un glissement vertical fait défiler la page, comme ailleurs (touch-action: pan-y). Seuls deux gestes
// retournent la carte : une touche franche (doigt presque immobile, relâché vite) ou un glissement
// nettement horizontal. Tout le reste est ignoré, en particulier un pouce qui commence à faire défiler.
const TAP_MAX_MOVE = 10; // px
const TAP_MAX_MS = 700;
const SWIPE_MIN = 40; // px
// Le bouton « Afficher ma carte » fait de même au clavier et pour les lecteurs d'écran.
function bindSecret() {
  const secret = document.getElementById("secret");
  const toggle = document.getElementById("secret-toggle");
  let revealed = false;
  let start = null;
  const set = (on, focus = false) => {
    revealed = on;
    secret.classList.toggle("revealed", on);
    toggle.setAttribute("aria-pressed", String(on));
    toggle.textContent = t(on ? "secret.hide" : "secret.show");
    // Le lecteur d'écran lit la carte dès qu'elle est affichée.
    if (on && focus) document.getElementById("secret-content").focus({ preventScroll: true });
  };
  secret.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") e.preventDefault(); // pas de sélection de texte à la souris
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, time: performance.now(), scroll: scrollY };
  });
  secret.addEventListener("pointerup", (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const tap = Math.hypot(dx, dy) < TAP_MAX_MOVE && performance.now() - start.time < TAP_MAX_MS;
    const swipe = Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy);
    const scrolled = Math.abs(scrollY - start.scroll) > 2;
    start = null;
    if (scrolled || !(tap || swipe)) return;
    // Un glissement fait tourner la carte dans le sens du doigt ; une touche, vers la gauche.
    secret.style.setProperty("--flip", swipe && dx > 0 ? -1 : 1);
    set(!revealed);
  });
  secret.addEventListener("pointercancel", () => (start = null));
  secret.addEventListener("contextmenu", (e) => e.preventDefault());
  toggle.addEventListener("click", () => {
    secret.style.setProperty("--flip", 1);
    set(!revealed, true);
  });
}

// Carte vue par un joueur. Coopératif : personne ne connaît son rôle. Compétitif : chacun le connaît.
function playerCardHtml(game, deal, me) {
  const { id: ruleId } = deal.rule;
  const [theme, summary] = [ruleText(deal.rule, "theme"), ruleText(deal.rule, "summary")];
  if (game.mode === "coop") return cardHtml({ ruleId, text: cardText(me.card), theme, summary });
  return me.role === "undercover"
    ? cardHtml({ ruleId, text: cardText(me.card), theme, summary, kind: "undercover", note: t("play.noteUndercover") })
    : cardHtml({ ruleId, text: cardText(me.card), theme, summary, note: t("play.noteCivilian") });
}

// Indication visible sous la carte, même face cachée : elle ne doit pas dépendre du rôle.
function playerHint(game) {
  return t(game.mode === "coop" ? "play.hintCoop" : "play.hintCompet");
}

function ruleTag(rule) {
  return `<p class="round-theme round-theme--${rule.id}"><span>${t("rule.n", { id: rule.id })}</span> ${esc(ruleText(rule, "theme"))}</p>
    <p class="rule-summary">${esc(ruleText(rule, "summary"))}</p>`;
}

// --- État de l'hôte (persisté par code de partie) -------------------------------------------

function hostState(code) {
  return { round: 1, eliminated: [], names: {}, scores: {}, finished: null, results: {}, ...store.get(`host:${code}`, {}) };
}

function saveHostState(code, state) {
  store.set(`host:${code}`, state);
  store.set("lastHost", code);
}

function playerName(state, seat) {
  return state.names[seat] || t("player.n", { n: seat });
}

// Nombre de manches à afficher dans le récapitulatif : la manche en cours compte si elle est jouée.
function playedRounds(state) {
  return state.results[state.round] ? state.round : state.round - 1;
}

// --- Minuteur de débat (écran animateur) ---------------------------------------------------
// L'état repose sur une heure de fin : il survit aux rafraîchissements de l'écran animateur.

// Deux minuteurs : le débat avant le vote (écran de la manche) et la discussion du débrief.
// Textes : clés timer.<minuteur>.label, .aria, .start, .done (.doneCoop pour le débat coopératif), .announce.
const TIMERS = {
  debate: { durations: [30, 60, 90, 120], storeKey: "timerDuration", fallback: 60 },
  debrief: { durations: [180, 300, 600], storeKey: "debriefDuration", fallback: 300 },
};
const timer = { key: null, kind: "debate", duration: 60, end: null, remaining: 0, interval: null, audio: null };

function timerRemaining() {
  return timer.end ? Math.max(0, timer.end - Date.now()) : timer.remaining;
}

function resetTimer(key) {
  timer.key = key;
  timer.end = null;
  timer.remaining = timer.duration * 1000;
}

function formatSeconds(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function durationLabel(seconds) {
  return seconds < 120 ? t("unit.seconds", { n: seconds }) : t("unit.minutes", { n: seconds / 60 });
}

function timerHtml(coop, kind = "debate") {
  const cfg = TIMERS[kind];
  return `
    <section class="timer" id="timer" aria-label="${t(`timer.${kind}.aria`)}">
      <div class="timer-main">
        <p class="label">${t(`timer.${kind}.label`)}</p>
        <p class="timer-face" id="timer-face" role="timer" aria-live="off"></p>
      </div>
      <p class="timer-done-msg" id="timer-done-msg" hidden>
        <span aria-hidden="true">⏰ </span>${t(`timer.${kind}.${kind === "debate" && coop ? "doneCoop" : "done"}`)}
      </p>
      <div class="timer-bar"><i id="timer-bar"></i></div>
      <div class="timer-controls">
        <div class="chips" role="group" aria-label="${t("timer.duration")}">
          ${cfg.durations.map((d) => `<button type="button" class="chip" data-duration="${d}">${durationLabel(d)}</button>`).join("")}
        </div>
        <button type="button" class="btn btn--small btn--primary" id="timer-toggle"></button>
        <button type="button" class="btn btn--small" id="timer-reset">${t("timer.reset")}</button>
      </div>
    </section>`;
}

function beep() {
  try {
    const ctx = timer.audio;
    if (!ctx) return;
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {
    /* pas de son disponible : l'affichage suffit */
  }
  navigator.vibrate?.([300, 150, 300]);
}

function paintTimer() {
  const el = document.getElementById("timer");
  if (!el) return;
  const left = timerRemaining();
  if (timer.end && left === 0) {
    timer.end = null;
    timer.remaining = 0;
    beep();
    announce(t(`timer.${timer.kind}.announce`));
  }
  const running = Boolean(timer.end);
  const done = left === 0;
  el.classList.toggle("timer--running", running);
  el.classList.toggle("timer--done", done);
  el.classList.toggle("timer--urgent", running && left <= 10000);
  document.getElementById("timer-face").textContent = formatSeconds(left);
  document.getElementById("timer-done-msg").hidden = !done;
  document.getElementById("timer-bar").style.width = `${(left / (timer.duration * 1000)) * 100}%`;
  document.getElementById("timer-toggle").textContent = t(running ? "timer.pause" : done ? "timer.restart" : left < timer.duration * 1000 ? "timer.resume" : `timer.${timer.kind}.start`);
  el.querySelectorAll("[data-duration]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.duration) === timer.duration)));
}

function mountTimer(key, kind = "debate") {
  if (timer.key !== key) {
    const cfg = TIMERS[kind];
    timer.kind = kind;
    timer.duration = store.get(cfg.storeKey, cfg.fallback);
    if (!cfg.durations.includes(timer.duration)) timer.duration = cfg.fallback;
    resetTimer(key);
  }
  const el = document.getElementById("timer");
  el.addEventListener("click", (e) => {
    const duration = e.target.closest("[data-duration]");
    if (duration) {
      timer.duration = Number(duration.dataset.duration);
      store.set(TIMERS[timer.kind].storeKey, timer.duration);
      if (!timer.end) timer.remaining = timer.duration * 1000;
    }
    if (e.target.id === "timer-toggle") {
      // Le contexte audio doit être créé lors d'un geste de l'utilisateur.
      try {
        timer.audio ??= new (window.AudioContext || window.webkitAudioContext)();
        timer.audio.resume?.();
      } catch {
        /* son indisponible */
      }
      if (timer.end) {
        timer.remaining = timerRemaining();
        timer.end = null;
      } else {
        if (timerRemaining() === 0) timer.remaining = timer.duration * 1000;
        timer.end = Date.now() + timer.remaining;
      }
    }
    if (e.target.id === "timer-reset") resetTimer(key);
    paintTimer();
  });
  clearInterval(timer.interval);
  timer.interval = setInterval(paintTimer, isLowTech() ? 1000 : 250);
  paintTimer();
}

// --- Écrans -----------------------------------------------------------------------------------

// --- Éventail de l'accueil ------------------------------------------------------------------
// Pure décoration, pour le plaisir : masqué aux technologies d'assistance (aria-hidden) et hors du
// parcours clavier. Au survol une carte se soulève (CSS) ; au clic elle est présentée (redressée,
// agrandie, centrée), sans être retournée. Un second clic, un clic ailleurs ou Échap la remet en place.
let unpresentFan = null;

function bindFan() {
  const fan = app.querySelector(".fan");
  unpresentFan = null;
  if (!fan) return;
  const present = (card) => {
    fan.querySelectorAll(".fan-card").forEach((c) => c.classList.toggle("fan-card--presented", c === card));
    fan.classList.toggle("is-presenting", Boolean(card));
    // Agrandie, la vignette serait floue : on charge l'image en taille réelle à la première présentation.
    const img = card?.querySelector("img[data-full]");
    if (img) {
      img.src = img.dataset.full;
      img.removeAttribute("data-full");
    }
  };
  fan.addEventListener("click", (e) => {
    const card = e.target.closest(".fan-card");
    if (card) present(card.classList.contains("fan-card--presented") ? null : card);
  });
  unpresentFan = () => {
    if (!fan.isConnected || !fan.classList.contains("is-presenting")) return false;
    present(null);
    return true;
  };
}

document.addEventListener("click", (e) => {
  if (!e.target.closest?.(".fan-card")) unpresentFan?.();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.hidden) unpresentFan?.();
});

function viewHome() {
  const lastHost = store.get("lastHost", null);
  const lastPlayer = store.get("lastPlayer", null);
  const hostGame = lastHost && decodeCode(lastHost);
  const playerGame = lastPlayer && decodeCode(lastPlayer.code);
  const hasData = store.keys().some((k) => /^(host|names|player):/.test(k));

  app.innerHTML = `
    <section class="hero">
      ${
        isLowTech()
          ? `<p class="lt-logo" aria-hidden="true">UNDER←COVER</p>`
          : `<div class="fan" aria-hidden="true">
              ${RULES.map(
                (r, i) => `<span class="fan-card fan-${i}"><img src="${r.back.replace(".webp", "-mini.webp")}" data-full="${r.back}" alt="" width="200" height="279" draggable="false"></span>`
              ).join("")}
            </div>`
      }
      <h1>${t("home.title")}</h1>
      <p>${t("home.intro")}</p>
    </section>
    <div class="actions">
      <a class="btn btn--primary" href="#/host">${t("home.create")}</a>
      <a class="btn" href="#/join">${t("home.join")}</a>
    </div>

    ${
      hostGame || playerGame
        ? `<section class="resume">
            <h2 class="section-title">${t("home.resume")}</h2>
            ${
              hostGame
                ? `<div class="resume-item">
                    <a href="#/host/${lastHost}">
                      <strong>${t("home.resumeHost")}</strong>
                      <small>${t("home.hostGame", { code: esc(prettyCode(lastHost)), round: hostState(lastHost).round, rounds: hostGame.rounds })}</small>
                    </a>
                    <button class="icon-btn" data-forget="${lastHost}" data-label="host" aria-label="${t("home.forgetHost", { code: esc(prettyCode(lastHost)) })}">${TRASH_ICON}</button>
                  </div>`
                : ""
            }
            ${
              playerGame
                ? `<div class="resume-item">
                    <a href="#/play/${lastPlayer.code}/${lastPlayer.seat}">
                      <strong>${t("home.resumePlayer")}</strong>
                      <small>${t("home.playerGame", { code: esc(prettyCode(lastPlayer.code)), name: esc(knownNames(lastPlayer.code)[lastPlayer.seat] || t("player.seat", { n: lastPlayer.seat })) })}</small>
                    </a>
                    <button class="icon-btn" data-forget="${lastPlayer.code}" data-label="game" aria-label="${t("home.forgetGame", { code: esc(prettyCode(lastPlayer.code)) })}">${TRASH_ICON}</button>
                  </div>`
                : ""
            }
          </section>`
        : ""
    }

    <nav class="tiles" aria-label="${t("home.discover")}">
      <a class="tile" href="#/rules">
        <span class="tile-icon" aria-hidden="true">📖</span>
        <span><strong>${t("help.title")}</strong><small>${t("home.rulesTile")}</small></span>
      </a>
      <a class="tile" href="#/cards">
        <span class="tile-icon" aria-hidden="true">🃏</span>
        <span><strong>${t("cards.title")}</strong><small>${t("home.cardsTile", { n: countCards("ext") })}</small></span>
      </a>
      <a class="tile" href="#/nouveautes">
        <span class="tile-icon" aria-hidden="true">🆕</span>
        <span><strong>${t("news.title")}${
          store.get("seenChangelog", "") < LATEST_CHANGE ? ` <span class="badge-new">${t("news.badge")}</span>` : ""
        }</strong><small>${t("home.newsTile", { date: formatDate(LATEST_CHANGE) })}</small></span>
      </a>
      ${
        isLowTech()
          ? `<a class="tile" href="#/lowtech">
              <span class="tile-icon" aria-hidden="true">🌱</span>
              <span><strong>${t("lowtech.title")}</strong><small>${t("home.lowtechTile")}</small></span>
            </a>`
          : ""
      }
    </nav>

    ${languagePicker()}
    ${hasData ? `<p class="center-small"><button class="link-btn" id="forget-all">${t("home.forgetAll")}</button></p>` : ""}`;

  app.querySelectorAll("[data-forget]").forEach((btn) =>
    btn.addEventListener("click", () => confirmForget(btn.dataset.forget, btn.dataset.label))
  );
  document.getElementById("forget-all")?.addEventListener("click", () =>
    confirmModal(
      t("home.forgetAllConfirm"),
      t("home.forgetAllOk"),
      () => {
        forgetAllGames();
        render();
      },
      true
    )
  );
  bindFan();
  bindLanguagePicker();
}

const TRASH_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`;

function viewRules() {
  app.innerHTML = `
    <section class="prose">
      ${t("rules.html")}
      <p><button class="btn" id="back">${t("help.close")}</button></p>
    </section>`;
  document.getElementById("back").onclick = closeHelp;
}

// --- Notes de version ---------------------------------------------------------------------------

function viewChangelog() {
  // Une fois la page vue, l'accueil ne signale plus « Nouveau » jusqu'à la prochaine mise à jour.
  store.set("seenChangelog", LATEST_CHANGE);
  app.innerHTML = `
    <section class="prose">
      <h1>${t("news.title")}</h1>
      <p>${t("news.intro")}</p>
      ${CHANGELOG.map((release) => {
        // Texte dans la langue active s'il existe (release.en…), sinon en français.
        const { title, items } = release[lang] || release;
        return `
        <h2>${formatDate(release.date)} · ${esc(title)}</h2>
        <ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
      }
      ).join("")}
      <p><a class="btn" href="#/">${t("common.backHome")}</a></p>
    </section>`;
}

// Aide (« ? » de l'en-tête) : un second appui la referme et ramène à l'écran d'où on l'a ouverte.
let helpFromApp = false;

function closeHelp() {
  if (helpFromApp) history.back();
  else go("#/");
}

function syncHelpButton() {
  const help = document.querySelector(".topbar-help");
  const open = app.dataset.view === "rules";
  help.classList.toggle("topbar-help--open", open);
  help.setAttribute("aria-label", t(open ? "help.close" : "help.title"));
  help.title = t(open ? "help.close" : "help.title");
}

document.addEventListener("click", (e) => {
  if (e.target.closest?.(".topbar-help") && app.dataset.view === "rules") {
    e.preventDefault();
    closeHelp();
  }
});

// Mesures faites sur cette application (Chrome, profil iPhone 13, fichiers compressés comme sur GitHub Pages).
const WEIGHT_TABLE = [
  ["lowtech.rowJoin", 292, 137, 52],
  ["lowtech.rowHost", 292, 116, 60],
  ["lowtech.rowCards", 262, 277, 52],
];

function viewLowTech() {
  app.innerHTML = `
    <section class="prose">
      ${t("lowtech.html", {
        rows: WEIGHT_TABLE.map(
          ([label, before, normal, low]) =>
            `<tr><th scope="row">${t(label)}</th><td>${t("unit.ko", { n: before })}</td><td>${t("unit.ko", { n: normal })}</td><td><strong>${t("unit.ko", { n: low })}</strong></td></tr>`
        ).join(""),
        size: formatKo(transferredBytes()),
      })}
      <p><button class="btn" id="back">${t("common.back")}</button></p>
    </section>`;
  document.getElementById("back").onclick = () => (history.length > 1 ? history.back() : go("#/"));
}

// Nombre de cartes d'un jeu (« base » ou « ext » : jeu de base et extension).
function countCards(deck, edition = "classique") {
  return rulesOf(edition).reduce((n, r) => {
    const pool = rulePool(r, deck);
    return n + pool.civilians.length + pool.undercovers.length;
  }, 0);
}

function viewCards(edition) {
  if (!EDITION_IDS.includes(edition)) edition = "classique";
  applyEdition(edition);
  const rules = rulesOf(edition);
  const filter = store.get("cardsFilter", "all");
  const opened = new Set(store.get("cardsOpen", []));
  const shown = (card) => filter === "all" || card.deck === filter;
  app.innerHTML = `
    <section class="catalog">
      <h1>${t("cards.title")}</h1>
      <div class="chips" role="group" aria-label="${t("setup.edition")}">
        ${EDITION_IDS.map((id) => `<a class="chip" href="#/cards/${id}" aria-current="${id === edition}">${esc(t(`edition.${id}`))}</a>`).join("")}
      </div>
      <div class="chips" role="group" aria-label="${t("cards.filter")}">
        ${["all", "base", "ext"]
          .map((value) => `<button type="button" class="chip" data-filter="${value}" aria-pressed="${filter === value}">${t(value === "all" ? "cards.all" : `deck.${value}`)}</button>`)
          .join("")}
      </div>
      <div class="catalog-actions">
        <button type="button" class="btn btn--small" id="toggle-all"></button>
        <button type="button" class="btn btn--small" id="export-xlsx" aria-describedby="export-xlsx-hint">${t("cards.export")}</button>
      </div>
      <p class="hint" id="export-xlsx-hint">${t("cards.exportHint")}</p>
      ${rules.map((r) => {
        const civilians = r.civilians.filter(shown);
        const undercovers = r.undercovers.filter(shown);
        return `
        <section class="rule-section" data-rule="${r.id}">
          <h2 class="rule-head">
            <button type="button" class="rule-toggle" aria-expanded="${opened.has(r.id)}" aria-controls="rule-panel-${r.id}">
              ${backImg(r, "back back--thumb", { small: true })}
              <span class="rule-section-title">
                <span class="rule-title">${t("rule.n", { id: r.id })} · ${esc(ruleText(r, "theme"))}</span>
                <small>${t("cards.civilianCount", { n: civilians.length })} · ${t("cards.undercoverCount", { n: undercovers.length })}</small>
              </span>
            </button>
          </h2>
          <div class="rule-panel" id="rule-panel-${r.id}" ${opened.has(r.id) ? "" : "hidden"}>
          <p class="rule-summary">${esc(ruleText(r, "summary"))}</p>
          <h3 class="cards-sub">${t("cards.civilians")}</h3>
          <div class="grid">
            ${backImg(r, "back back--grid")}
            ${civilians.map((c) => cardHtml({ ruleId: r.id, card: c })).join("")}
          </div>
          <h3 class="cards-sub">${t("cards.undercovers")}</h3>
          <div class="grid">
            ${undercovers
              .map(
                (u) => `<div class="uc-pair">
                  ${cardHtml({ ruleId: r.id, card: u, kind: "undercover" })}
                  <p class="why"><strong>${t("card.why")}</strong> ${esc(cardText(u, "why"))}</p>
                </div>`
              )
              .join("")}
          </div>
          </div>
        </section>`;
      }).join("")}
      <p><a class="btn" href="#/">${t("common.back")}</a></p>
    </section>`;

  const toggles = [...app.querySelectorAll(".rule-toggle")];
  const isOpen = (t) => t.getAttribute("aria-expanded") === "true";
  const setOpen = (t, open) => {
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    if (open && panel.hidden && motionAllowed()) {
      // Cascade rapide : chaque carte arrive 20 ms après la précédente (plafonnée à 20 cartes).
      panel.querySelectorAll(".grid").forEach((grid) => [...grid.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, 20))));
      panel.classList.add("panel-enter");
      setTimeout(() => panel.classList.remove("panel-enter"), 1000);
    }
    t.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };
  const toggleAll = document.getElementById("toggle-all");
  const syncToggleAll = () => {
    toggleAll.textContent = t(toggles.every(isOpen) ? "cards.collapseAll" : "cards.expandAll");
    store.set("cardsOpen", toggles.filter(isOpen).map((t) => Number(t.closest(".rule-section").dataset.rule)));
  };
  toggleAll.onclick = () => {
    const open = !toggles.every(isOpen);
    toggles.forEach((t) => setOpen(t, open));
    syncToggleAll();
  };
  toggles.forEach((t) =>
    t.addEventListener("click", () => {
      setOpen(t, !isOpen(t));
      syncToggleAll();
    })
  );
  syncToggleAll();

  // Export Excel : le module n'est chargé qu'au clic ; le fichier est créé sur l'appareil, sans réseau.
  document.getElementById("export-xlsx").onclick = async (e) => {
    const button = e.currentTarget;
    button.disabled = true;
    try {
      const { buildXlsx, cardsWorkbook } = await import("./xlsx.js");
      const blob = new Blob([buildXlsx(cardsWorkbook(rules))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cartes-undercover-ia-responsable.xlsx";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce(t("cards.exported"));
    } finally {
      button.disabled = false;
    }
  };

  app.querySelector(".chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    store.set("cardsFilter", chip.dataset.filter);
    render();
    app.querySelector(`[data-filter="${chip.dataset.filter}"]`).focus();
  });
  equalizeCards();
}

// Catalogue : toutes les cartes (et les dos) prennent la hauteur de la carte la plus haute, c'est-à-dire
// celle dont le texte est le plus long. Recalculé quand la largeur ou la taille du texte change.
let equalizeFrame = 0;
function equalizeCards() {
  if (app.dataset.view !== "cards") return window.removeEventListener("resize", onCatalogResize);
  app.style.removeProperty("--card-h");
  // Les sections repliées ne sont pas mises en page : on les ouvre le temps de la mesure, sans rendu
  // intermédiaire (tout se passe dans la même tâche).
  const closed = [...app.querySelectorAll(".rule-panel[hidden]")];
  closed.forEach((panel) => (panel.hidden = false));
  const heights = [...app.querySelectorAll(".grid .card")].map((card) => card.getBoundingClientRect().height);
  closed.forEach((panel) => (panel.hidden = true));
  if (heights.length) app.style.setProperty("--card-h", `${Math.ceil(Math.max(...heights))}px`);
  window.addEventListener("resize", onCatalogResize);
}

function onCatalogResize() {
  cancelAnimationFrame(equalizeFrame);
  equalizeFrame = requestAnimationFrame(equalizeCards);
}

function viewHostSetup() {
  const prefs = {
    players: 5,
    undercovers: 1,
    rules: RULES.map((r) => r.id),
    ordered: false,
    rounds: 5,
    mode: "coop",
    deck: "base",
    ucCards: "same",
    edition: "classique",
    names: {},
    ...store.get("hostPrefs", {}),
  };
  if (!EDITION_IDS.includes(prefs.edition)) prefs.edition = "classique";
  // Réglages enregistrés avec une ancienne limite (jusqu'à 18 joueurs) : ramenés à la limite actuelle.
  prefs.players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(prefs.players) || MIN_PLAYERS));
  // Les prénoms de la partie précédente ne sont pas repris d'office : une nouvelle équipe
  // risquerait de jouer sous les prénoms de la précédente. Un bouton permet de les reprendre.
  const lastNames = Object.keys(prefs.names)
    .sort((a, b) => a - b)
    .map((seat) => cleanName(prefs.names[seat]))
    .filter(Boolean);
  app.innerHTML = `
    <section>
      <h1>${t("setup.title")}</h1>
      <form id="setup" class="form">
        <fieldset class="fs-edition">
          <legend>${t("setup.edition")}</legend>
          ${EDITION_IDS.map(
            (id) => `
          <label class="radio mode-pick"><input type="radio" name="edition" value="${id}" ${prefs.edition === id ? "checked" : ""}>
            <span><strong>${esc(t(`edition.${id}`))}</strong><br><small>${t(`setup.editionHint.${id}`)}</small></span></label>`
          ).join("")}
        </fieldset>

        <fieldset class="fs-mode">
          <legend>${t("setup.mode")}</legend>
          <label class="radio mode-pick"><input type="radio" name="mode" value="coop" ${prefs.mode !== "compet" ? "checked" : ""}>
            <span>${t("setup.coop")}<br><small>${t("setup.coopHint")}</small></span></label>
          <label class="radio mode-pick"><input type="radio" name="mode" value="compet" ${prefs.mode === "compet" ? "checked" : ""}>
            <span>${t("setup.compet")}<br><small>${t("setup.competHint")}</small></span></label>
        </fieldset>

        <fieldset class="fs-players">
          <legend>${t("setup.players")}</legend>
          <div class="stepper" data-target="players">
            <button type="button" data-step="-1" aria-label="${t("setup.playersLess")}">−</button>
            <input id="players" name="players" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${prefs.players}" aria-label="${t("setup.playersCount")}" aria-describedby="players-hint">
            <button type="button" data-step="1" aria-label="${t("setup.playersMore")}">+</button>
          </div>
          <p class="hint" id="players-hint">${t("setup.playersHint")}</p>
          <ol class="name-list" id="name-list"></ol>
          ${
            lastNames.length
              ? `<div class="reuse-names" id="reuse-names">
                  <button type="button" class="btn btn--small" id="reuse-names-btn" aria-describedby="reuse-names-list">${t("setup.reuseNames")}</button>
                  <p class="small" id="reuse-names-list">${esc(lastNames.join(", "))}</p>
                </div>`
              : ""
          }
        </fieldset>

        <fieldset class="fs-rounds">
          <legend>${t("setup.rounds")}</legend>
          <div class="stepper" data-target="rounds">
            <button type="button" data-step="-1" aria-label="${t("setup.roundsLess")}">−</button>
            <input id="rounds" name="rounds" type="number" inputmode="numeric" min="1" max="${MAX_ROUNDS}" value="${prefs.rounds}" aria-label="${t("setup.roundsCount")}">
            <button type="button" data-step="1" aria-label="${t("setup.roundsMore")}">+</button>
          </div>
          <p class="hint">${t("setup.roundsHint")}</p>
        </fieldset>

        <fieldset class="fs-rules">
          <legend>${t("setup.rules")}</legend>
          <div class="rule-picks">
            ${RULES.map(
              (r) => `
              <label class="check rule-pick">
                <input type="checkbox" name="rules" value="${r.id}" ${prefs.rules.includes(r.id) ? "checked" : ""}>
                ${backImg(r, "back back--thumb", { small: true })}
                <span><strong>${t("rule.n", { id: r.id })}</strong><br>${esc(ruleText(r, "theme"))}</span>
              </label>`
            ).join("")}
          </div>
          <div class="inline-actions">
            <button type="button" class="btn btn--small" data-rules="all">${t("setup.rulesAll")}</button>
            <button type="button" class="btn btn--small" data-rules="none">${t("setup.rulesNone")}</button>
          </div>
          <label class="radio"><input type="radio" name="ordered" value="0" ${!prefs.ordered ? "checked" : ""}> <span>${t("setup.random")}</span></label>
          <label class="radio"><input type="radio" name="ordered" value="1" ${prefs.ordered ? "checked" : ""}> <span>${t("setup.ordered")}</span></label>
          <p class="rules-hint" id="rules-hint" aria-live="polite"></p>
        </fieldset>

        <fieldset class="fs-deck">
          <legend>${t("setup.deck")}</legend>
          <label class="radio"><input type="radio" name="deck" value="base" ${prefs.deck !== "ext" ? "checked" : ""}> <span>${t("deck.base")} <small>${t("setup.deckBaseCount", { n: countCards("base") })}</small></span></label>
          <label class="radio"><input type="radio" name="deck" value="ext" ${prefs.deck === "ext" ? "checked" : ""}> <span>${t("setup.deckExt")} <small>${t("setup.deckExtCount", { n: countCards("ext") })}</small></span></label>
          <p class="hint" id="deck-hint" aria-live="polite"></p>
        </fieldset>

        <fieldset class="fs-undercovers">
          <legend>${t("setup.undercovers")}</legend>
          <label class="radio"><input type="radio" name="undercovers" value="1" ${prefs.undercovers === 1 ? "checked" : ""}> <span>${t("setup.oneUndercover")}</span></label>
          <label class="radio"><input type="radio" name="undercovers" value="2" ${prefs.undercovers === 2 ? "checked" : ""}> <span>${t("setup.twoUndercovers", { n: MIN_PLAYERS_TWO_UNDERCOVERS })}</span></label>
          <fieldset class="uc-cards" id="uc-cards" ${prefs.undercovers === 2 ? "" : "hidden"}>
            <legend>${t("setup.ucCards")}</legend>
            <label class="radio"><input type="radio" name="ucCards" value="same" ${prefs.ucCards !== "distinct" ? "checked" : ""}> <span>${t("setup.ucSame")}</span></label>
            <label class="radio"><input type="radio" name="ucCards" value="distinct" ${prefs.ucCards === "distinct" ? "checked" : ""}> <span>${t("setup.ucDistinct")}</span></label>
          </fieldset>
        </fieldset>

        <p class="error" id="setup-error" role="alert"></p>
        <button class="btn btn--primary" type="submit">${t("setup.submit")}</button>
      </form>
    </section>`;

  const form = document.getElementById("setup");
  const nameListEl = document.getElementById("name-list");
  const typedNames = {};

  const renderNames = () => {
    const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(form.elements.players.value) || MIN_PLAYERS));
    nameListEl.innerHTML = Array.from(
      { length: count },
      (_, i) => `
        <li><input id="name-${i + 1}" class="name-input" data-seat="${i + 1}" maxlength="${MAX_NAME_LENGTH}" autocomplete="off"
          placeholder="${t("player.n", { n: i + 1 })}" value="${esc(typedNames[i + 1] || "")}" aria-label="${t("player.nameLabel", { n: i + 1 })}"></li>`
    ).join("");
  };
  nameListEl.addEventListener("input", (e) => {
    if (e.target.dataset.seat) typedNames[e.target.dataset.seat] = e.target.value;
  });

  form.addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (step) {
      const input = form.elements[step.closest(".stepper").dataset.target];
      input.value = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) + Number(step.dataset.step)));
      if (input.name === "players") renderNames();
    }
    const bulk = e.target.closest("[data-rules]");
    if (bulk) form.querySelectorAll('input[name="rules"]').forEach((c) => (c.checked = bulk.dataset.rules === "all"));
    syncRulesHint();
    syncDeck();
  });
  form.elements.players.addEventListener("change", renderNames);

  document.getElementById("reuse-names-btn")?.addEventListener("click", () => {
    Object.assign(typedNames, prefs.names);
    const seats = Object.keys(prefs.names).filter((seat) => cleanName(prefs.names[seat])).map(Number);
    const players = form.elements.players;
    players.value = Math.min(Number(players.max), Math.max(Number(players.value), ...seats));
    renderNames();
    document.getElementById("reuse-names").remove();
    announce(t("setup.namesReused", { names: lastNames.join(", ") }));
    document.getElementById("name-1").focus();
  });

  // Compare le nombre de manches au nombre de règles choisies : toutes ne seront pas forcément jouées.
  const syncRulesHint = () => {
    const hint = document.getElementById("rules-hint");
    const rules = form.querySelectorAll('input[name="rules"]:checked').length;
    const rounds = Number(form.elements.rounds.value) || 0;
    const ordered = form.elements.ordered.value === "1";
    hint.textContent =
      !rules || !rounds
        ? ""
        : rounds < rules
          ? t("setup.rulesFewer", {
              rules: t("setup.chosenRules", { n: rules }),
              rounds: t("setup.roundCount", { n: rounds }),
              played: t("setup.played", { n: rounds }),
              how: ordered ? t("setup.playedOrdered", { n: rounds }) : t("setup.playedRandom", { n: rounds }),
              skipped: t("setup.skipped", { n: rules - rounds }),
            })
          : rounds > rules
            ? t("setup.rulesMore", { rounds: t("setup.roundCount", { n: rounds }), rules: t("setup.ruleCount", { n: rules }) })
            : t("setup.rulesEqual");
    hint.classList.toggle("rules-hint--warn", rules > 0 && rounds > 0 && rounds < rules);
  };
  // Undercovers : 2 seulement à partir de 7 joueurs (le choix reste visible, mais indisponible) ; le
  // choix de leurs cartes n'apparaît qu'avec 2 undercovers.
  const syncUcCards = () => {
    const players = Number(form.elements.players.value) || MIN_PLAYERS;
    const one = form.querySelector('input[name="undercovers"][value="1"]');
    const two = form.querySelector('input[name="undercovers"][value="2"]');
    two.disabled = players < MIN_PLAYERS_TWO_UNDERCOVERS;
    if (two.disabled && two.checked) one.checked = true;
    document.getElementById("uc-cards").hidden = !two.checked;
  };
  form.addEventListener("change", syncUcCards);
  syncUcCards();

  // Jeu de cartes : au-delà de 5 joueurs, l'extension est obligatoire (jeu de base trop petit pour que
  // chacun ait une carte différente). En dessous, on signale une règle qui manquerait de cartes.
  const syncDeck = () => {
    const players = Number(form.elements.players.value) || MIN_PLAYERS;
    const baseInput = form.querySelector('input[name="deck"][value="base"]');
    const tooMany = players > MAX_BASE_PLAYERS;
    baseInput.disabled = tooMany;
    if (tooMany && baseInput.checked) form.querySelector('input[name="deck"][value="ext"]').checked = true;
    const rules = [...form.querySelectorAll('input[name="rules"]:checked')].map((c) => Number(c.value));
    const shortage =
      !tooMany && baseInput.checked && rules.length
        ? deckShortage({ players, undercovers: Number(form.elements.undercovers.value), rules, deck: "base", edition: form.elements.edition.value })
        : null;
    document.getElementById("deck-hint").textContent = tooMany ? t("setup.extRequired", { n: MAX_BASE_PLAYERS }) : shortage || "";
    syncUcCards();
  };
  form.addEventListener("change", syncDeck);
  form.elements.edition.forEach((r) => r.addEventListener("change", () => applyEdition(form.elements.edition.value)));
  form.elements.players.addEventListener("input", syncDeck);
  syncDeck();
  form.addEventListener("input", syncRulesHint);
  form.addEventListener("change", syncRulesHint);
  syncRulesHint();
  renderNames();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      players: Number(form.elements.players.value),
      undercovers: Number(form.elements.undercovers.value),
      rules: [...form.querySelectorAll('input[name="rules"]:checked')].map((c) => Number(c.value)),
      ordered: form.elements.ordered.value === "1",
      rounds: Number(form.elements.rounds.value),
      mode: form.elements.mode.value,
      deck: form.elements.deck.value,
      edition: form.elements.edition.value,
      ucCards: form.elements.undercovers.value === "2" ? form.elements.ucCards.value : "same",
    };
    const error = validateSettings(settings);
    if (error) {
      document.getElementById("setup-error").textContent = error;
      return;
    }
    const names = {};
    for (let seat = 1; seat <= settings.players; seat++) {
      if (cleanName(typedNames[seat])) names[seat] = cleanName(typedNames[seat]);
    }
    store.set("hostPrefs", { ...settings, names: typedNames });
    const code = newCode(settings, () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
    saveHostState(code, { ...hostState(code), names });
    go(`#/host/${code}`);
  });
}

function viewHost(code) {
  const game = decodeCode(code);
  if (!game) return viewInvalid(code);
  const state = hostState(code);
  saveHostState(code, state);
  const deal = dealRound(game, state.round);
  const coop = game.mode === "coop";
  const result = state.finished || roundOutcome(game, deal, state.eliminated);
  const lastRound = state.round >= game.rounds;
  const url = joinUrl(code, 0, state.names, game.players);
  const summary = [
    ...(game.edition === "classique" ? [] : [t("host.edition", { name: esc(t(`edition.${game.edition}`)) })]),
    t(coop ? "host.modeCoop" : "host.modeCompet"),
    t("host.players", { n: game.players }),
    t("host.undercovers", { n: game.undercovers }) + (game.undercovers > 1 && game.ucCards === "distinct" && game.deck === "ext" ? ` ${t("host.ucDistinct")}` : ""),
    t("setup.roundCount", { n: game.rounds }),
    game.rules.length === RULES.length ? t("host.allRules") : t("host.someRules", { n: game.rules.length, list: game.rules.join(", ") }),
    t(game.deck === "ext" ? "host.deckExt" : "host.deckBase"),
  ].join(" · ");

  app.innerHTML = `
    <section class="host">
      <aside class="host-side" aria-label="${t("host.joinAria")}">
      <div class="share">
        ${qrSlot(url, t("host.qr"))}
        <div>
          <p class="label">${t("host.code")}</p>
          <p class="code">${esc(prettyCode(code))}</p>
          <p class="small">${summary}</p>
          <button class="btn btn--small" id="copy">${t("host.copy")}</button>
          <button class="btn btn--small" id="seat-qrs">${t("host.seatQrs")}</button>
        </div>
      </div>
      </aside>

      <div class="host-main">
      <div class="round-bar">
        ${backImg(deal.rule, "back back--round", { lazy: false, small: true })}
        <div>
          <h1>${t("round.title", { round: state.round, rounds: game.rounds })}</h1>
          ${ruleTag(deal.rule)}
          ${
            state.round > 1 && !result
              ? `<p class="round-reminder"><span aria-hidden="true">📱 </span>${t("host.reminder", { round: state.round })}</p>`
              : `<p>${t("host.showRound", { round: state.round })}</p>`
          }
        </div>
      </div>

      ${teamScoreHtml(game, state.results)}

      ${result ? "" : timerHtml(coop)}

      ${
        result
          ? resultBanner(result, "div", state.results[state.round])
          : `<div class="starter">
              <p><span aria-hidden="true">🎙️ </span>${t(coop ? "host.starterCoop" : "host.starterCompet", { name: esc(playerName(state, deal.starter)) })}</p>
              <p class="small">${t(coop ? "host.afterCoop" : "host.afterCompet")}</p>
            </div>`
      }

      <ul class="players">
        ${deal.roles
          .map((r) => {
            const out = state.eliminated.includes(r.seat);
            const revealed = out || result;
            // Coopératif : un équipier désigné à tort est disculpé et reste en jeu.
            const status = !out ? "" : ` · ${t(coop ? (r.role === "undercover" ? "host.unmasked" : "host.cleared") : "host.eliminated")}`;
            return `
            <li class="${out && !coop ? "out" : ""} ${justRevealed?.code === code && justRevealed.seat === r.seat ? "row-just" : ""}">
              <span class="seat">${r.seat}</span>
              <input class="name" id="host-name-${r.seat}" data-seat="${r.seat}" maxlength="${MAX_NAME_LENGTH}" value="${esc(state.names[r.seat] || "")}" placeholder="${t("player.n", { n: r.seat })}" aria-label="${t("player.nameLabel", { n: r.seat })}">
              ${
                revealed
                  ? `<span class="role role--${r.role}">${t(`role.${r.role}`)}${status}</span>`
                  : coop
                    ? `<button class="btn btn--small btn--icon" data-show-card="${r.seat}" aria-label="${t("host.showCardAria", { n: r.seat })}" title="${t("host.showCardTitle")}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg></button>
                      <button class="btn btn--small" data-eliminate="${r.seat}">${t("host.designate")}</button>`
                    : `<button class="btn btn--small btn--danger" data-eliminate="${r.seat}">${t("host.eliminate")}</button>`
              }
            </li>`;
          })
          .join("")}
      </ul>

      <div class="actions">
        ${result ? `<button class="btn btn--primary" id="debrief">${t("host.debrief")}</button>` : ""}
        ${
          lastRound
            ? `<a class="btn" href="#/end/${code}" id="finish">${t("host.results")}</a>`
            : `<button class="btn" id="next">${t("round.next")}</button>`
        }
        ${/* Option « Distribuer sur ce téléphone » masquée : sans objet quand l'animateur projette son écran. La route #/pass reste en place. */ ""}
        ${!result ? `<button class="btn btn--ghost" id="debrief">${t("host.reveal")}</button>` : ""}
      </div>
      ${!lastRound ? `<div class="actions actions--secondary"><button class="btn btn--ghost" id="end-now">${t("host.endNow")}</button></div>` : ""}
      <div class="danger-zone">
        <p class="small">${t("host.forgetHint")}</p>
        <button class="btn btn--small btn--danger" id="forget">${t("host.forget")}</button>
      </div>
      </div>
    </section>`;

  document.getElementById("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      document.getElementById("copy").textContent = t("common.copied");
      announce(t("host.copiedAnnounce"));
    } catch {
      openModal(`
        <h2>${t("host.shareTitle")}</h2>
        <input class="share-url" id="share-url" readonly value="${esc(url)}" aria-label="${t("host.shareAria")}">
        <button class="btn btn--primary" data-close>${t("common.close")}</button>`);
      document.getElementById("share-url").select();
    }
  };
  document.getElementById("seat-qrs").onclick = () => showSeatQrs(code, game, hostState(code));
  if (!result) mountTimer(`${code}:${state.round}`);
  justRevealed = null;
  animateScore(code);

  // Un prénom modifié ici est intégré au QR code : les joueurs qui le scannent ensuite le verront.
  app.querySelectorAll("input.name").forEach((input) =>
    input.addEventListener("change", () => {
      const s = hostState(code);
      s.names[input.dataset.seat] = cleanName(input.value);
      saveHostState(code, s);
      app.querySelector(".share .qr").dataset.qr = joinUrl(code, 0, s.names, game.players);
      hydrateQr(app);
    })
  );

  // Coopératif seulement : la carte lue à voix haute est affichée à tout le groupe (vidéoprojecteur),
  // sans mention du rôle. En compétitif, on décrit sa carte sans la lire : l'afficher trahirait le bluff.
  app.querySelectorAll("[data-show-card]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const seat = Number(btn.dataset.showCard);
      const { id: ruleId } = deal.rule;
      const [theme, summary] = [ruleText(deal.rule, "theme"), ruleText(deal.rule, "summary")];
      openModal(`
        <h2>${t("host.cardOf", { name: esc(playerName(hostState(code), seat)) })}</h2>
        ${cardHtml({ ruleId, text: cardText(deal.roles[seat - 1].card), theme, summary })}
        <button class="btn btn--primary" data-close>${t("common.close")}</button>`);
    })
  );

  app.querySelectorAll("[data-eliminate]").forEach((btn) =>
    btn.addEventListener("click", () => eliminate(code, game, deal, Number(btn.dataset.eliminate)))
  );

  // Une manche interrompue sans vainqueur est marquée « révélée » (sans points).
  const closeRound = (s, mark) => {
    if (!s.results[s.round]) s.results[s.round] = mark;
    if (!s.finished) s.finished = "revealed";
  };

  document.getElementById("debrief").onclick = () => {
    const s = hostState(code);
    if (s.finished || roundOutcome(game, deal, s.eliminated)) return go(`#/debrief/${code}`);
    confirmModal(t("host.revealConfirm"), t("host.revealOk"), () => {
      closeRound(s, "r");
      saveHostState(code, s);
      go(`#/debrief/${code}`);
    });
  };

  const nextRound = () => {
    const s = hostState(code);
    closeRound(s, "s");
    s.round += 1;
    s.eliminated = [];
    s.finished = null;
    saveHostState(code, s);
    render();
    openModal(`
      <h2>${t("round.plain", { round: s.round, rounds: game.rounds })}</h2>
      ${ruleTag(dealRound(game, s.round).rule)}
      <p>${t("host.nextRoundInfo")}</p>
      <button class="btn btn--primary" data-close>${t("common.ok")}</button>`);
  };
  document.getElementById("next")?.addEventListener("click", () =>
    result ? nextRound() : confirmModal(t("host.skipConfirm"), t("host.skipOk"), nextRound)
  );

  const endGame = () => {
    const s = hostState(code);
    if (!s.finished) closeRound(s, "s");
    saveHostState(code, s);
    go(`#/end/${code}`);
  };
  document.getElementById("finish")?.addEventListener("click", (e) => {
    if (result) return;
    e.preventDefault();
    confirmModal(t("host.finishConfirm"), t("host.results"), endGame);
  });
  document.getElementById("end-now")?.addEventListener("click", () =>
    confirmModal(
      state.round + 1 === game.rounds
        ? t("host.endNowOne", { round: game.rounds })
        : t("host.endNowMany", { from: state.round + 1, to: game.rounds }),
      t("host.endOk"),
      endGame
    )
  );
  document.getElementById("forget").onclick = () => confirmForget(code, "game");
}

function resultBanner(result, tag = "p", code = "") {
  const pts = Number(code);
  const [icon, text] =
    result === "found"
      ? ["🎉", t("banner.found", { n: pts })]
      : result === "civilians"
      ? ["🎉", t("banner.civilians")]
      : result === "impostors"
        ? ["🕵️", t("banner.impostors")]
        : ["", t("banner.revealed")];
  return `<${tag} class="banner banner--${result === "civilians" || result === "found" ? "win" : "lose"}">${icon ? `<span aria-hidden="true">${icon} </span>` : ""}${text}</${tag}>`;
}

// Compétitif : le joueur éliminé quitte la manche. Coopératif : l'équipe désigne un suspect ;
// s'il n'a pas la carte undercover, il est disculpé et reste en jeu.
function eliminate(code, game, deal, seat) {
  const state = hostState(code);
  const player = deal.roles[seat - 1];
  const name = playerName(state, seat);
  const coop = game.mode === "coop";

  openModal(
    coop
      ? `
    <h2>${t("elim.designateTitle", { name: esc(name) })}</h2>
    <p>${t("elim.designateText", { name: esc(name) })}</p>
    <div class="actions">
      <button class="btn btn--primary" id="do-eliminate">${t("host.designate")}</button>
      <button class="btn" data-close>${t("common.cancel")}</button>
    </div>`
      : `
    <h2>${t("elim.eliminateTitle", { name: esc(name) })}</h2>
    <p>${t("elim.eliminateText")}</p>
    <div class="actions">
      <button class="btn btn--danger" id="do-eliminate">${t("host.eliminate")}</button>
      <button class="btn" data-close>${t("common.cancel")}</button>
    </div>`
  );

  document.getElementById("do-eliminate").onclick = () => {
    state.eliminated.push(seat);
    justRevealed = { code, seat };
    const result = roundOutcome(game, deal, state.eliminated);
    if (result) {
      state.finished = result;
      state.results[state.round] = coop ? String(coopPoints(wrongGuesses(deal, state.eliminated))) : RESULT_CODES[result];
    }
    saveHostState(code, state);
    render();
    const errors = wrongGuesses(deal, state.eliminated);
    const next = coop
      ? player.role === "undercover"
        ? t("elim.oneLeft")
        : errors >= COOP_MAX_POINTS
          ? t("elim.cleared", { name: esc(name) })
          : t("elim.clearedWorth", { name: esc(name), n: coopPoints(errors) })
      : t("elim.continue");
    // On débat des pratiques, pas des personnes : personne ne choisit sa carte.
    const reassure = !coop
      ? ""
      : player.role === "undercover"
        ? t("elim.reassureUndercover", { name: esc(name) })
        : t("elim.reassureCivilian");
    openModal(`
      <p class="label">${t(coop ? "elim.had" : "elim.was", { name: esc(name) })}</p>
      <p class="role-reveal role--${player.role}">${t(coop ? (player.role === "undercover" ? "elim.undercoverCard" : "elim.goodPractice") : `role.${player.role}`)}</p>
      ${result ? resultBanner(result, "p", state.results[state.round]) : `<p>${next}</p>`}
      ${reassure ? `<p class="reassure">${reassure}</p>` : ""}
      <button class="btn btn--primary" data-close>${t("common.continue")}</button>`);
  };
}

function showSeatQrs(code, game, state) {
  const seats = Array.from({ length: game.players }, (_, i) => i + 1);
  let index = 0;
  const show = () => {
    const seat = seats[index];
    openModal(`
      <p class="label">${t("qr.turnOf")}</p>
      <h2>${esc(playerName(state, seat))}</h2>
      ${qrSlot(joinUrl(code, seat, state.names, game.players), t("qr.seatLabel", { name: playerName(state, seat) }), 8, "qr--big")}
      <p class="small">${t("qr.seatHint")}</p>
      <div class="actions">
        <button class="btn" id="qr-prev" ${index === 0 ? "disabled" : ""}>←</button>
        <button class="btn btn--primary" id="qr-next">${t(index === seats.length - 1 ? "qr.done" : "qr.next")}</button>
      </div>`);
    document.getElementById("qr-prev").onclick = () => {
      index--;
      show();
    };
    document.getElementById("qr-next").onclick = () => {
      if (index === seats.length - 1) return closeModal();
      index++;
      show();
    };
  };
  show();
}

/**
 * Débrief d'une manche : qui avait quelle carte, pourquoi l'undercover enfreint la règle, questions.
 * Sans option : manche en cours de l'animateur. Avec round : revue d'une manche depuis la fin de partie
 * (animateur) ou depuis les résultats reçus par QR code (joueur : names et back fournis, pas de minuteur).
 */
function viewDebrief(code, { round, names, back, mySeat = null, unplayed = false } = {}) {
  const game = decodeCode(code);
  if (!game) return viewInvalid(code);
  app.dataset.view = "debrief"; // mise en page grand écran du débrief, quel que soit le lien d'accès
  const state = hostState(code);
  const shown = round >= 1 && round <= game.rounds ? round : state.round;
  const deal = dealRound(game, shown);
  const rule = deal.rule;
  const label = (seat) => {
    const name = names ? names[seat] || t("player.n", { n: seat }) : playerName(state, seat);
    return seat === mySeat ? t("player.you", { name }) : name;
  };
  const holders = (card) =>
    deal.roles
      .filter((r) => r.card === card)
      .map((r) => label(r.seat))
      .join(", ");
  const [backHref, backText] = back || (round ? [`#/end/${code}`, t("debrief.backResults")] : [`#/host/${code}`, t("debrief.backGame")]);
  const distributed = rule.civilians.filter((c) => holders(c));

  app.innerHTML = `
    <section>
      <div class="debrief-head">
        ${backImg(rule, "back back--round", { lazy: false, small: true })}
        <div>
          <p class="label">${t("round.plain", { round: shown, rounds: game.rounds })} · ${t(unplayed ? "debrief.unplayed" : "debrief.label")}</p>
          <h1>${t("rule.n", { id: rule.id })} · ${esc(ruleText(rule, "theme"))}</h1>
          <p class="rule-summary">${esc(ruleText(rule, "summary"))}</p>
        </div>
      </div>

      ${unplayed ? `<p class="hint unplayed-note">${t("debrief.unplayedNote")}</p>` : ""}
      <div class="debrief-uc ${deal.undercovers.length > 1 ? "debrief-uc--multi" : ""}">
      <h2>${t("debrief.undercovers", { n: deal.undercovers.length })}</h2>
      ${deal.undercovers
        .map(
          (u) => `${cardHtml({ ruleId: rule.id, card: u, kind: "undercover", label: holders(u) })}
      <p class="why"><strong>${t("card.why")}</strong> ${esc(cardText(u, "why"))}</p>`
        )
        .join("")}
      </div>

      <div class="debrief-civ">
      <h2>${t("debrief.civilians")}</h2>
      <div class="grid">
        ${distributed.map((c) => cardHtml({ ruleId: rule.id, card: c, label: holders(c) })).join("")}
      </div>

      <h2>${t("debrief.questions")}</h2>
      ${names ? "" : timerHtml(game.mode === "coop", "debrief")}
      <ul class="questions">
        <li><strong>${esc(ruleText(rule, "question"))}</strong></li>
        <li>${t("debrief.q1")}</li>
        <li>${t("debrief.q2")}</li>
        <li>${t("debrief.q3", { id: rule.id })}</li>
        <li>${t("debrief.q4")}</li>
      </ul>
      </div>

      <div class="actions">
        <a class="btn btn--primary" href="${backHref}">${backText}</a>
      </div>
    </section>`;
  app.querySelectorAll(".debrief-civ .grid > .card").forEach((card, i) => card.style.setProperty("--i", Math.min(i, 16)));
  if (!names) mountTimer(`debrief:${code}:${shown}`, "debrief");
}

// Classement et récapitulatif des manches, partagés par l'écran animateur et les téléphones.
// roundHref(round) : lien vers le débrief de la manche (qui avait quelle carte).
function resultsHtml(game, names, results, mySeat, roundHref) {
  const label = (seat) => names[seat] || t("player.n", { n: seat });
  const rounds = Object.keys(results).map(Number).sort((a, b) => a - b);

  return `
    ${teamScoreHtml(game, results, true)}
    ${
      rounds.length
        ? `<div class="results-rounds">
          <h2 class="section-title">${t("results.rounds")}</h2>
          ${roundHref ? `<p class="hint">${t("results.hint")}</p>` : ""}
          <ol class="recap">
            ${rounds
              .map((round) => {
                const deal = dealRound(game, round);
                const undercovers = deal.roles
                  .filter((r) => r.role === "undercover")
                  .map((r) => (r.seat === mySeat ? t("player.you", { name: label(r.seat) }) : label(r.seat)));
                const res = results[round];
                return `
                <li class="${roundHref ? "recap-item--link" : ""}">
                  ${backImg(deal.rule, "back back--thumb", { small: true })}
                  <div>
                    <p class="recap-title">${
                      roundHref
                        ? `<a class="recap-link" href="${roundHref(round)}">${t("round.n", { round })} · ${esc(ruleText(deal.rule, "theme"))}</a>`
                        : `${t("round.n", { round })} · ${esc(ruleText(deal.rule, "theme"))}`
                    }</p>
                    <p class="small">${
                      res === "n" ? t("results.unplayed") : t("results.undercover", { names: esc(undercovers.join(", ")) })
                    }</p>
                  </div>
                  <span class="result result--${resultClass(res)}">${resultLabel(res)}</span>
                </li>`;
              })
              .join("")}
          </ol>
          </div>`
        : ""
    }`;
}

function viewEnd(code) {
  const game = decodeCode(code);
  if (!game) return viewInvalid(code);
  const state = hostState(code);
  // Partie terminée plus tôt : les manches jamais jouées restent consultables (« Non jouée », hors score).
  const results = Object.fromEntries(
    Array.from({ length: game.rounds }, (_, i) => [i + 1, i < playedRounds(state) ? state.results[i + 1] || "s" : "n"])
  );
  const shareUrl = resultsUrl(code, game, state);

  app.innerHTML = `
    <section class="end">
      <p class="label center-text">${t("end.game", { code: esc(prettyCode(code)) })}</p>
      <h1 class="center-text">${t("end.title")}</h1>
      ${resultsHtml(game, state.names, results, null, (round) => `#/debrief/${code}/${round}`)}

      <div class="share share--results">
        ${qrSlot(shareUrl, t("end.qr"))}
        <div>
          <p class="label">${t("end.share")}</p>
          <p>${t("end.shareHint")}</p>
          <button class="btn btn--small" id="copy-results">${t("end.copy")}</button>
        </div>
      </div>

      <div class="actions">
        <a class="btn btn--primary" href="#/host">${t("setup.title")}</a>
        <a class="btn" href="#/host/${code}">${t("end.backHost")}</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">${t("host.forget")}</button>
      </div>
    </section>`;
  document.getElementById("copy-results").onclick = async (e) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      e.target.textContent = t("common.copied");
      announce(t("end.copiedAnnounce"));
    } catch {
      openModal(`
        <h2>${t("end.link")}</h2>
        <input class="share-url" id="share-url" readonly value="${esc(shareUrl)}" aria-label="${t("end.link")}">
        <button class="btn btn--primary" data-close>${t("common.close")}</button>`);
      document.getElementById("share-url").select();
    }
  };
  document.getElementById("forget").onclick = () => confirmForget(code, "game");
  animateFinalScore();
}

function viewResults(code, token, round) {
  const game = decodeCode(code);
  const data = game && token && decodeResults(token, game.players);
  if (!game || !data) return viewInvalid(code);
  const me = store.get("lastPlayer", null);
  const mySeat = me?.code === game.code ? me.seat : null;
  const resultsHref = `#results-${game.code}~${token}`;
  // Revue d'une manche jouée : même écran que le débrief, avec les prénoms reçus par QR code.
  if (round && data.results[round]) {
    return viewDebrief(game.code, { round, names: data.names, mySeat, back: [resultsHref, t("debrief.backResults")], unplayed: data.results[round] === "n" });
  }

  app.innerHTML = `
    <section class="end">
      <p class="label center-text">${t("end.game", { code: esc(prettyCode(game.code)) })}</p>
      <h1 class="center-text">${t("results.title")}</h1>
      ${resultsHtml(game, data.names, data.results, mySeat, (r) => `${resultsHref}~${r}`)}
      <div class="actions">
        <a class="btn btn--primary" href="#/">${t("common.home")}</a>
        <a class="btn" href="#/cards">${t("results.allCards")}</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">${t("common.forgetHere")}</button>
      </div>
    </section>`;
  document.getElementById("forget").onclick = () => confirmForget(game.code, "game");
  animateFinalScore();
}

function viewJoin(prefill, seatPrefill, namesToken) {
  const game = prefill ? decodeCode(prefill) : null;
  if (game && namesToken) store.set(`names:${game.code}`, decodeNames(namesToken));
  if (game && seatPrefill && seatPrefill >= 1 && seatPrefill <= game.players) {
    return go(`#/play/${game.code}/${seatPrefill}`);
  }
  app.innerHTML = `
    <section>
      <h1>${t("join.title")}</h1>
      <form id="join" class="form">
        <label>${t("host.code")}
          <input id="join-code" name="code" class="code-input" autocomplete="off" autocapitalize="characters" maxlength="${CODE_LENGTH + 1}" placeholder="ABCD 12345" value="${esc(game ? prettyCode(game.code) : prefill || "")}">
        </label>
        <div id="seats"></div>
        <p class="error" id="join-error" role="alert"></p>
      </form>
      ${languagePicker()}
    </section>`;
  bindLanguagePicker();

  const form = document.getElementById("join");
  const seatsEl = document.getElementById("seats");
  const errorEl = document.getElementById("join-error");

  const update = () => {
    const raw = form.elements.code.value;
    const g = decodeCode(raw);
    errorEl.textContent = "";
    if (!g) {
      seatsEl.innerHTML = "";
      if (raw.replace(/\s/g, "").length >= CODE_LENGTH) errorEl.textContent = t("join.invalid");
      return;
    }
    const names = knownNames(g.code);
    const hasNames = Object.keys(names).length > 0;
    seatsEl.innerHTML = `
      <p class="label">${t(hasNames ? "join.who" : "join.whichSeat")}</p>
      <div class="seat-grid ${hasNames ? "seat-grid--names" : ""}">
        ${Array.from(
          { length: g.players },
          (_, i) => `
          <a class="seat-btn" href="#/play/${g.code}/${i + 1}">
            ${names[i + 1] ? `<span>${esc(names[i + 1])}</span><small>${t("player.seat", { n: i + 1 })}</small>` : i + 1}
          </a>`
        ).join("")}
      </div>
      <p class="hint">${t(hasNames ? "join.tapName" : "join.pickSeat")}</p>`;
  };
  form.elements.code.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  update();
}

function viewPlay(code, seat) {
  const game = decodeCode(code);
  if (!game || !(seat >= 1 && seat <= game.players)) return viewInvalid(code);
  const key = `player:${game.code}:${seat}`;
  const round = Math.min(game.rounds, store.get(key, 1));
  store.set("lastPlayer", { code: game.code, seat });
  const deal = dealRound(game, round);
  const me = deal.roles[seat - 1];
  const myName = knownNames(game.code)[seat];
  const last = round >= game.rounds;

  app.innerHTML = `
    <section class="play">
      <div class="play-head">
        <h1>${myName ? `${esc(myName)} <small class="small">${t("player.seat", { n: seat })}</small>` : t("player.n", { n: seat })}</h1>
        <span class="small">${esc(prettyCode(game.code))}</span>
      </div>
      ${
        myName
          ? ""
          : `<p class="hint seat-check">${t("play.seatCheck", { n: seat })} <a href="#join-${game.code}">${t("play.changeSeat")}</a></p>`
      }
      <div class="round-switch">
        <button class="btn btn--small" id="prev" ${round <= 1 ? "disabled" : ""} aria-label="${t("play.prevRound")}">←</button>
        <strong>${t("round.title", { round, rounds: game.rounds })}</strong>
        ${
          last
            ? `<a class="btn btn--small btn--primary" href="#/over/${game.code}/${seat}">${t("play.end")}</a>`
            : `<button class="btn btn--small" id="next">${t("play.next")}</button>`
        }
      </div>

      ${secretHtml(deal.rule, playerCardHtml(game, deal, me))}

      <p class="hint">${playerHint(game)}</p>
    </section>`;

  bindSecret();
  document.getElementById("prev").onclick = () => {
    store.set(key, Math.max(1, round - 1));
    render();
  };
  document.getElementById("next")?.addEventListener("click", () => {
    store.set(key, round + 1);
    render();
  });
}

// Fin de partie côté joueur. Les rôles ne sont pas affichés ici : le joueur a pu y arriver avant la
// fin réelle de la partie. Seuls les résultats de l'animateur (QR code) révèlent les manches jouées.
function viewOver(code, seat) {
  const game = decodeCode(code);
  if (!game || !(seat >= 1 && seat <= game.players)) return viewInvalid(code);
  const myName = knownNames(game.code)[seat];

  app.innerHTML = `
    <section class="end">
      <h1 class="center-text">${myName ? t("over.titleName", { name: esc(myName) }) : t("over.title")}</h1>
      <p class="center-text">${t(game.mode === "coop" ? "over.textCoop" : "over.textCompet")}</p>
      <p class="hint center-text">${t("over.notOver")}</p>

      <div class="actions">
        <a class="btn btn--primary" href="#/play/${game.code}/${seat}">${t("over.cards")}</a>
        <a class="btn" href="#/">${t("common.home")}</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">${t("common.forgetHere")}</button>
      </div>
    </section>`;
  document.getElementById("forget").onclick = () => confirmForget(game.code, "game");
}

function viewPass(code) {
  const game = decodeCode(code);
  if (!game) return viewInvalid(code);
  const state = hostState(code);
  const deal = dealRound(game, state.round);
  let seat = 1;

  const step = () => {
    if (seat > game.players) {
      app.innerHTML = `
        <section class="center">
          <h1>${t("pass.doneTitle")}</h1>
          <p>${t("pass.doneText")}</p>
          <a class="btn btn--primary" href="#/host/${code}">${t("pass.toHost")}</a>
        </section>`;
      announceView();
      return;
    }
    const me = deal.roles[seat - 1];
    app.innerHTML = `
      <section class="center pass">
        <p class="label">${t("round.plain", { round: state.round, rounds: game.rounds })} · ${t("pass.label")}</p>
        <h1>${esc(playerName(state, seat))}</h1>
        <p>${t("pass.text")}</p>
        ${secretHtml(deal.rule, playerCardHtml(game, deal, me))}
        <p class="hint">${playerHint(game)}</p>
        <button class="btn btn--primary" id="next-seat">${t("pass.next")}</button>
      </section>`;
    bindSecret();
    announceView();
    document.getElementById("next-seat").onclick = () => {
      seat++;
      step();
    };
  };
  step();
}

function viewInvalid(code) {
  app.innerHTML = `
    <section class="center">
      <h1>${t("invalid.title")}</h1>
      <p>${t("invalid.text", { code: esc(code || "") })}</p>
      <a class="btn btn--primary" href="#/join">${t("invalid.enter")}</a>
    </section>`;
}

// --- Routeur --------------------------------------------------------------------------------

// Titre de l'onglet = titre de l'écran ; le focus va sur ce titre pour que le lecteur d'écran l'annonce.
let firstRender = true;
function announceView() {
  const h1 = app.querySelector("h1");
  const name = h1?.textContent.replace(/\s+/g, " ").trim();
  document.title = name ? `${name} – ${t("app.name")}` : t("app.name");
  if (h1 && !firstRender) {
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }
  firstRender = false;
}

// Édition spéciale : `data-edition` sur <html> change le thème (voir css/style.css) et le badge de
// la barre du haut. L'édition d'une partie vient de son code ; hors partie, c'est l'édition générique.
function applyEdition(id) {
  const special = id && id !== "classique";
  if (special) document.documentElement.dataset.edition = id;
  else delete document.documentElement.dataset.edition;
  const badge = document.getElementById("edition-badge");
  badge.hidden = !special;
  badge.textContent = special ? t(`edition.${id}`) : "";
  document.querySelector('meta[name="theme-color"]').content = special ? "#0b5f55" : "#00008f";
}

function editionOf(route, code) {
  if (route === "host" && !code) return store.get("hostPrefs", {}).edition;
  const inGame = ["host", "debrief", "end", "results", "join", "play", "over", "pass"].includes(route);
  return inGame ? decodeCode(code)?.edition : null;
}

function render() {
  closeModal(false);
  const viewName = location.hash.replace(/^#\/?/, "").split(/[/~-]/)[0] || "home";
  app.dataset.view = viewName === "host" && !location.hash.split("/")[2] ? "setup" : viewName;
  clearInterval(timer.interval);
  const hash = location.hash.replace(/^#/, "");
  const join = hash.match(/^join-([A-Za-z0-9]+)(?:-(\d+))?(?:~([A-Za-z0-9_-]+))?$/);
  const results = hash.match(/^results-([A-Za-z0-9]+)~([A-Za-z0-9_-]+)(?:~(\d+))?$/);
  const [, route = "", a, b, c] = join
    ? ["", "join", join[1], join[2], join[3]]
    : results
      ? ["", "results", results[1], results[2], results[3]]
      : hash.split("/");
  applyEdition(editionOf(route, a));
  switch (route) {
    case "host":
      a ? viewHost(a) : viewHostSetup();
      break;
    case "debrief": {
      const round = Number(b) || undefined;
      viewDebrief(a, { round, unplayed: Boolean(round) && round > playedRounds(hostState(a)) });
      break;
    }
    case "end":
      viewEnd(a);
      break;
    case "results":
      viewResults(a, b, Number(c) || undefined);
      break;
    case "join":
      viewJoin(a, Number(b), c);
      break;
    case "play":
      viewPlay(a, Number(b));
      break;
    case "over":
      viewOver(a, Number(b));
      break;
    case "pass":
      viewPass(a);
      break;
    case "rules":
      viewRules();
      break;
    case "cards":
      viewCards(a);
      break;
    case "lowtech":
      viewLowTech();
      break;
    case "nouveautes":
      viewChangelog();
      break;
    default:
      viewHome();
  }
  hydrateQr(app);
  // Fondu d'entrée uniquement quand on change d'écran (pas à chaque mise à jour du même écran).
  const routeKey = location.hash.replace(/~[A-Za-z0-9_-]{8,}/, "");
  // Aide ouverte depuis un écran de l'application : la refermer revient en arrière dans l'historique.
  if (app.dataset.view === "rules" && routeKey !== lastRoute) helpFromApp = lastRoute !== null;
  syncHelpButton();
  if (routeKey !== lastRoute) {
    app.classList.remove("view-enter");
    void app.offsetWidth; // relance l'animation
    app.classList.add("view-enter");
  }
  lastRoute = routeKey;
  window.scrollTo(0, 0);
  announceView();
  paintWeight();
  setTimeout(paintWeight, 1500);
}

// Textes fixes de index.html (barre du haut), dans la langue de l'interface.
function localizeShell() {
  document.querySelector(".switch-label").textContent = t("lowtech.switch");
  document.querySelector(".brand").setAttribute("aria-label", t("common.home"));
  document.querySelector(".brand small").textContent = t("app.tagline");
}

await loadLanguage(pickLanguage(store.get("lang", null), store.get("linkLang", null), navigator.languages || [navigator.language]));
document.documentElement.lang = lang;
localizeShell();
document.getElementById("mode-toggle")?.addEventListener("click", () => setLowTech(!isLowTech()));
window.addEventListener("load", paintWeight);
// Retour visuel à l'appui : la classe .is-pressed reste au moins 150 ms, même pour un toucher très
// bref (l'état :active seul est souvent invisible sur mobile). L'écouteur « touchstart » active
// aussi :active sur Safari iPhone.
const PRESSABLE = ".btn, .chip, .seat-btn, .tile, .resume-item a, .stepper button, .icon-btn, .mode-toggle, .topbar-help, .link-btn";
document.addEventListener("touchstart", () => {}, { passive: true });
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(PRESSABLE);
  if (!el || el.disabled) return;
  const since = Date.now();
  el.classList.add("is-pressed");
  const release = () => {
    setTimeout(() => el.classList.remove("is-pressed"), Math.max(0, 150 - (Date.now() - since)));
    document.removeEventListener("pointerup", release);
    document.removeEventListener("pointercancel", release);
  };
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
});
window.addEventListener("hashchange", render);
syncModeToggle();
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
