import { DECKS, RULES } from "./cards.js";
import { ICONS } from "./icons.js";
import {
  CODE_LENGTH,
  MAX_ROUNDS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  decodeCode,
  dealRound,
  COOP_MAX_POINTS,
  coopFound,
  coopPoints,
  newCode,
  outcome,
  rulePool,
  validateSettings,
  wrongGuesses,
} from "./game.js";

const app = document.getElementById("app");
const modal = document.getElementById("modal");

const ROLE_LABELS = { civilian: "Civil", undercover: "Undercover" };
// Issue de chaque manche, stockée en un caractère (elle voyage aussi dans le lien des résultats) :
// coopératif : points obtenus « 0 » à « 3 » ; compétitif : « c » civils, « i » undercover ;
// dans les deux modes : « r » rôles révélés sans vainqueur, « s » manche passée.
const RESULT_CODES = { civilians: "c", impostors: "i", revealed: "r" };

function resultLabel(res) {
  if (/^\d$/.test(res)) {
    const pts = Number(res);
    return pts ? `Trouvé au ${COOP_MAX_POINTS + 1 - pts}${pts === COOP_MAX_POINTS ? "er" : "e"} vote · +${pts}` : "Trouvé · +0";
  }
  return { c: "Victoire des civils", i: "Victoire de l'undercover", r: "Rôles révélés", s: "Manche passée" }[res] || "";
}

function resultClass(res) {
  return /^\d$/.test(res) ? (Number(res) > 0 ? "c" : "i") : res;
}

// Score collectif : total de l'équipe (coopératif) ou manches gagnées par camp (compétitif).
// « rounds » : nombre de manches sur lequel calculer le maximum (toute la partie, ou les manches jouées).
function teamScore(game, results, rounds = Object.keys(results).length) {
  const codes = Object.values(results);
  if (game.mode === "coop") {
    return { points: codes.reduce((sum, r) => sum + (/^\d$/.test(r) ? Number(r) : 0), 0), max: rounds * COOP_MAX_POINTS };
  }
  return { civilians: codes.filter((r) => r === "c").length, undercover: codes.filter((r) => r === "i").length };
}

function teamScoreHtml(game, results, big = false) {
  // Pendant la partie, le maximum porte sur toutes les manches prévues ; à la fin, sur les manches jouées.
  const score = teamScore(game, results, big ? Object.keys(results).length : game.rounds);
  if (game.mode === "coop") {
    const ratio = score.max ? score.points / score.max : 0;
    const verdict = !score.max ? "" : ratio >= 0.8 ? "Excellent travail d'équipe !" : ratio >= 0.5 ? "Bonne enquête collective." : "L'undercover vous a donné du fil à retordre.";
    return `
      <div class="team-score ${big ? "team-score--big" : ""}">
        <p class="label">Score de l'équipe</p>
        <p class="team-score-value"><strong>${score.points}</strong> / ${score.max} points</p>
        ${big && verdict ? `<p>${verdict}</p>` : ""}
      </div>`;
  }
  return `
    <div class="team-score ${big ? "team-score--big" : ""}">
      <p class="label">Manches gagnées</p>
      <p class="team-score-value">Civils <strong>${score.civilians}</strong> – <strong>${score.undercover}</strong> Undercover</p>
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
  return `${baseUrl()}#join-${code}${seat ? `-${seat}` : ""}${token ? `~${token}` : ""}`;
}

// Lien des résultats : prénoms, scores et issue de chaque manche.
function resultsUrl(code, game, state) {
  const results = Array.from({ length: playedRounds(state) }, (_, i) => state.results[i + 1] || "s").join("");
  const scores = "";
  return `${baseUrl()}#results-${code}~${toBase64Url([nameList(state.names, game.players).join("|"), scores, results].join("\n"))}`;
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
    .catch(() => slots.forEach((el) => (el.textContent = "QR code indisponible : utilisez le code ou le lien.")));
}

function prettyCode(code) {
  const half = code.length / 2;
  return `${code.slice(0, half)} ${code.slice(half)}`;
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
      <button class="btn" data-close>Annuler</button>
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
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.closest("[data-close]")) closeModal();
});

function confirmForget(code, label) {
  confirmModal(
    `Supprimer ${label} de ce téléphone ? Les prénoms, scores et manches enregistrés seront effacés.`,
    "Supprimer",
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
  return `
    <article class="card card--rule${ruleId} ${kind === "undercover" ? "card--undercover" : ""}" data-deck="${card?.deck || ""}">
      <header class="card-head"><span>RÈGLE ${ruleId}</span><i></i></header>
      ${theme ? `<p class="card-theme">${esc(theme)}</p>` : ""}
      ${summary ? `<p class="card-summary">${esc(summary)}</p>` : ""}
      <p class="card-text">${esc(text ?? card.text)}</p>
      ${ext ? `<p class="card-deck">${DECKS.ext}</p>` : ""}
      ${note ? `<p class="card-note">${note}</p>` : ""}
      ${kind === "undercover" ? `<footer class="card-foot">UNDERCOVER</footer>` : ""}
      ${label ? `<footer class="card-label">${esc(label)}</footer>` : ""}
    </article>`;
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
  btn.title = isLowTech() ? "Mode low-tech activé : toucher pour revenir à l'affichage normal" : "Activer le mode low-tech (moins de données, moins d'énergie)";
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
  el.innerHTML = `Mode low-tech · <strong>${formatKo(bytes)}</strong> transférés depuis l'ouverture · police du système, dessins vectoriels, aucun traceur. <a href="#/lowtech">Pourquoi ?</a>`;
}

function transferredBytes() {
  return [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")].reduce(
    (sum, e) => sum + (e.transferSize || 0),
    0
  );
}

function formatKo(bytes) {
  return `${(bytes / 1024).toFixed(1).replace(".", ",")} Ko`;
}

/**
 * Dos de carte. « small » : vignette décorative (supprimée en mode low-tech).
 * Sinon : grande image couleur, ou en low-tech une carte en texte avec un dessin vectoriel simplifié (< 1 Ko).
 */
function backImg(rule, className = "back", { lazy = true, small = false } = {}) {
  const alt = `Dos de carte, règle d'or ${rule.id} : ${esc(rule.theme)}`;
  if (isLowTech()) {
    if (small) return "";
    return `
      <div class="lt-back ${className}" role="img" aria-label="${alt}">
        <svg class="lt-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[rule.id]}</svg>
        <span class="lt-back-label">Règle d'or ${rule.id}</span>
        <strong>${esc(rule.theme)}</strong>
        <span class="lt-back-foot">L'IA sous couverture</span>
      </div>`;
  }
  const src = small ? rule.back.replace(".webp", "-mini.webp") : rule.back;
  const [w, h] = small ? [200, 279] : [640, 893];
  // Les vignettes sont toujours accompagnées du nom de la règle en texte : elles sont décoratives.
  return `<img class="${className}" src="${src}" width="${w}" height="${h}" draggable="false" ${lazy ? 'loading="lazy"' : ""} alt="${small ? "" : alt}">`;
}

// Carte secrète : le dos de la carte de la règle d'or la masque ; on la retourne en maintenant le doigt.
// Deux façons de voir sa carte : maintenir le doigt dessus (elle se recache en relâchant), ou le
// bouton « Afficher ma carte », utilisable au clavier et avec un lecteur d'écran.
function secretHtml(rule, front) {
  return `
    <div class="secret" id="secret">
      <div class="secret-cover secret-cover--back" aria-hidden="true">${backImg(rule, "back", { lazy: false })}</div>
      <div class="secret-content" id="secret-content" tabindex="-1" aria-label="Ta carte">${front}</div>
    </div>
    <button type="button" class="btn secret-toggle" id="secret-toggle" aria-pressed="false" aria-controls="secret-content">Afficher ma carte</button>
    <p class="secret-hint"><span aria-hidden="true">👆 </span>Maintiens le doigt sur la carte pour la retourner, ou touche « Afficher ma carte ». Cache ton écran des autres joueurs.</p>`;
}

function bindSecret() {
  const secret = document.getElementById("secret");
  const toggle = document.getElementById("secret-toggle");
  let pinned = false;
  const show = (on) => secret.classList.toggle("revealed", on || pinned);
  secret.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    show(true);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => secret.addEventListener(ev, () => show(false)));
  secret.addEventListener("contextmenu", (e) => e.preventDefault());
  toggle.addEventListener("click", () => {
    pinned = !pinned;
    show(pinned);
    toggle.setAttribute("aria-pressed", String(pinned));
    toggle.textContent = pinned ? "Masquer ma carte" : "Afficher ma carte";
    // Le lecteur d'écran lit la carte dès qu'elle est affichée.
    if (pinned) document.getElementById("secret-content").focus({ preventScroll: true });
  });
}

// Carte vue par un joueur. Coopératif : personne ne connaît son rôle. Compétitif : chacun le connaît.
function playerCardHtml(game, deal, me) {
  const { id: ruleId, theme, summary } = deal.rule;
  if (game.mode === "coop") return cardHtml({ ruleId, text: me.card, theme, summary });
  return me.role === "undercover"
    ? cardHtml({ ruleId, text: me.card, theme, summary, kind: "undercover", note: "<strong>Tu es l'undercover :</strong> ta carte enfreint la règle d'or. Fais-toi passer pour un civil ! <strong>Pour bluffer :</strong> décris le contexte de ta carte (qui, quel outil, pour quoi faire) et tais le détail qui enfreint la règle." })
    : cardHtml({ ruleId, text: me.card, theme, summary, note: "<strong>Tu es civil :</strong> ta carte respecte la règle d'or. Démasque l'undercover ! <strong>Ta mission :</strong> repère la description trop vague ou qui évite un détail, et pose une question à ce joueur pendant le débat." });
}

// Indication visible sous la carte, même face cachée : elle ne doit pas dépendre du rôle.
function playerHint(game) {
  return game.mode === "coop"
    ? `À ton tour, <strong>lis ta carte à voix haute, mot pour mot</strong>. L'application ne révèle aucun rôle : même si tu crois reconnaître la carte undercover, lis-la comme les autres et enquêtez ensemble pour trouver la pratique qui enfreint la règle d'or.`
    : `Garde ta carte sous les yeux si tu veux, mais à ton tour <strong>décris-la avec tes mots</strong>, sans la lire.`;
}

function ruleTag(rule) {
  return `<p class="round-theme round-theme--${rule.id}"><span>Règle d'or ${rule.id}</span> ${esc(rule.theme)}</p>
    <p class="rule-summary">${esc(rule.summary)}</p>`;
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
  return state.names[seat] || `Joueur ${seat}`;
}

// Nombre de manches à afficher dans le récapitulatif : la manche en cours compte si elle est jouée.
function playedRounds(state) {
  return state.results[state.round] ? state.round : state.round - 1;
}

// --- Minuteur de débat (écran animateur) ---------------------------------------------------
// L'état repose sur une heure de fin : il survit aux rafraîchissements de l'écran animateur.

// Deux minuteurs : le débat avant le vote (écran de la manche) et la discussion du débrief.
const TIMERS = {
  debate: {
    label: "Débat",
    aria: "Minuteur du débat",
    durations: [30, 60, 90, 120],
    storeKey: "timerDuration",
    fallback: 60,
    start: "Lancer le débat",
    done: (coop) => `Temps écoulé : ${coop ? "place au vote, désignez un suspect !" : "place au vote !"}`,
    announce: "Temps écoulé : place au vote.",
  },
  debrief: {
    label: "Discussion",
    aria: "Minuteur de la discussion",
    durations: [180, 300, 600],
    storeKey: "debriefDuration",
    fallback: 300,
    start: "Lancer la discussion",
    done: () => "Temps écoulé : concluez la discussion avant de passer à la suite.",
    announce: "Temps écoulé : concluez la discussion.",
  },
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
  return seconds < 120 ? `${seconds} s` : `${seconds / 60} min`;
}

function timerHtml(coop, kind = "debate") {
  const cfg = TIMERS[kind];
  return `
    <section class="timer" id="timer" aria-label="${cfg.aria}">
      <div class="timer-main">
        <p class="label">${cfg.label}</p>
        <p class="timer-face" id="timer-face" role="timer" aria-live="off"></p>
      </div>
      <p class="timer-done-msg" id="timer-done-msg" hidden>
        <span aria-hidden="true">⏰ </span>${cfg.done(coop)}
      </p>
      <div class="timer-bar"><i id="timer-bar"></i></div>
      <div class="timer-controls">
        <div class="chips" role="group" aria-label="Durée">
          ${cfg.durations.map((d) => `<button type="button" class="chip" data-duration="${d}">${durationLabel(d)}</button>`).join("")}
        </div>
        <button type="button" class="btn btn--small btn--primary" id="timer-toggle"></button>
        <button type="button" class="btn btn--small" id="timer-reset">Réinitialiser</button>
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
    announce(TIMERS[timer.kind].announce);
  }
  const running = Boolean(timer.end);
  const done = left === 0;
  el.classList.toggle("timer--running", running);
  el.classList.toggle("timer--done", done);
  el.classList.toggle("timer--urgent", running && left <= 10000);
  document.getElementById("timer-face").textContent = formatSeconds(left);
  document.getElementById("timer-done-msg").hidden = !done;
  document.getElementById("timer-bar").style.width = `${(left / (timer.duration * 1000)) * 100}%`;
  document.getElementById("timer-toggle").textContent = running ? "Pause" : done ? "Relancer" : left < timer.duration * 1000 ? "Reprendre" : TIMERS[timer.kind].start;
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
              ${RULES.map((r, i) => `<img class="fan-${i}" src="${r.back.replace(".webp", "-mini.webp")}" alt="" width="200" height="279" draggable="false">`).join("")}
            </div>`
      }
      <h1>Qui enfreint la règle ?</h1>
      <p>Chaque joueur reçoit une pratique liée à une même règle d'or de l'IA responsable.
      Un <strong>undercover</strong> a reçu une pratique qui l'enfreint. Démasquez-le !</p>
    </section>
    <div class="actions">
      <a class="btn btn--primary" href="#/host">Créer une partie <small>animateur</small></a>
      <a class="btn" href="#/join">Rejoindre une partie <small>joueur</small></a>
    </div>

    ${
      hostGame || playerGame
        ? `<section class="resume">
            <h2 class="section-title">Parties en cours sur ce téléphone</h2>
            ${
              hostGame
                ? `<div class="resume-item">
                    <a href="#/host/${lastHost}">
                      <strong>Reprendre l'animation</strong>
                      <small>Partie ${esc(prettyCode(lastHost))} · manche ${hostState(lastHost).round} / ${hostGame.rounds}</small>
                    </a>
                    <button class="icon-btn" data-forget="${lastHost}" data-label="l'animation" aria-label="Supprimer l'animation ${esc(prettyCode(lastHost))}">${TRASH_ICON}</button>
                  </div>`
                : ""
            }
            ${
              playerGame
                ? `<div class="resume-item">
                    <a href="#/play/${lastPlayer.code}/${lastPlayer.seat}">
                      <strong>Revoir ma carte</strong>
                      <small>Partie ${esc(prettyCode(lastPlayer.code))} · ${esc(knownNames(lastPlayer.code)[lastPlayer.seat] || `joueur ${lastPlayer.seat}`)}</small>
                    </a>
                    <button class="icon-btn" data-forget="${lastPlayer.code}" data-label="cette partie" aria-label="Supprimer la partie ${esc(prettyCode(lastPlayer.code))}">${TRASH_ICON}</button>
                  </div>`
                : ""
            }
          </section>`
        : ""
    }

    <nav class="tiles" aria-label="Découvrir le jeu">
      <a class="tile" href="#/rules">
        <span class="tile-icon" aria-hidden="true">📖</span>
        <span><strong>Comment jouer ?</strong><small>Déroulement, rôles et points</small></span>
      </a>
      <a class="tile" href="#/cards">
        <span class="tile-icon" aria-hidden="true">🃏</span>
        <span><strong>Toutes les cartes</strong><small>Les 7 règles d'or et leurs ${countCards("ext")} cartes</small></span>
      </a>
      ${
        isLowTech()
          ? `<a class="tile" href="#/lowtech">
              <span class="tile-icon" aria-hidden="true">🌱</span>
              <span><strong>Pourquoi un Web low-tech ?</strong><small>Ce que pèse une page, et comment l'alléger</small></span>
            </a>`
          : ""
      }
    </nav>

    ${hasData ? `<p class="center-small"><button class="link-btn" id="forget-all">Effacer toutes les parties de ce téléphone</button></p>` : ""}`;

  app.querySelectorAll("[data-forget]").forEach((btn) =>
    btn.addEventListener("click", () => confirmForget(btn.dataset.forget, btn.dataset.label))
  );
  document.getElementById("forget-all")?.addEventListener("click", () =>
    confirmModal(
      "Effacer toutes les parties enregistrées sur ce téléphone ?",
      "Tout effacer",
      () => {
        forgetAllGames();
        render();
      },
      true
    )
  );
}

const TRASH_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`;

function viewRules() {
  app.innerHTML = `
    <section class="prose">
      <h1>Comment jouer ?</h1>
      <h2>Objectif</h2>
      <p>Undercover IA responsable est un <strong>serious game</strong> : en démasquant la pratique qui enfreint la règle, on <strong>apprend ou on se rappelle les 7 règles d'or</strong> de l'IA responsable, et on <strong>challenge nos pratiques actuelles</strong> en les confrontant à ces règles.</p>
      <h2>Mise en place</h2>
      <ol>
        <li>L'animateur crée une partie : prénoms des joueurs, règles d'or à jouer, nombre de manches et cartes (le jeu de base, validé, ou le jeu de base avec l'extension, dont les cartes tirées des métiers de l'assurance sont encore à valider). L'animateur ne joue pas : il ne se compte pas parmi les joueurs.</li>
        <li>Il affiche le <strong>QR code</strong> (ou le code de la partie).</li>
        <li>Chacun scanne le QR code et sélectionne <strong>son prénom</strong>, ou choisit un <strong>numéro de place</strong> si aucun prénom n'a été établi avant de lancer la partie. Chaque prénom ou numéro ne doit être pris qu'une fois. Il n'y a pas de contrôle automatisé des participants pour garder le système de jeu le plus simple possible.</li>
        <li>Sur l'appareil du participant (téléphone ou ordinateur), la carte distribuée pour la manche actuelle est affichée face cachée : on la retourne soit en maintenant le doigt dessus (sur téléphone), soit en cliquant longuement dessus, soit en cliquant ou en tapant sur « Afficher ma carte ».</li>
      </ol>
      <p class="hint">Aucune connexion entre téléphones n'est nécessaire : chaque téléphone calcule sa propre carte à partir du code.
      Pas assez de téléphones ? Utilisez le mode « Distribuer sur ce téléphone ».</p>
      <h2>Deux modes de jeu</h2>
      <p>Dans les deux modes, les <strong>civils</strong> ont une bonne pratique liée à la règle d'or de la manche ; l'<strong>undercover</strong> a une carte qui parle du même sujet mais <em>enfreint</em> la règle.</p>

      <h3>Coopératif (recommandé)</h3>
      <ol>
        <li><strong>L'application ne révèle aucun rôle</strong>. Celui qui a la carte undercover peut la reconnaître en la lisant : il la lit quand même mot pour mot, comme les autres.</li>
        <li><strong>Lecture</strong> : à partir du joueur désigné, chacun lit sa carte à voix haute, <strong>mot pour mot</strong>. Une carte résumée ou reformulée fausse l'enquête de toute l'équipe.</li>
        <li><strong>Débat</strong> chronométré (1 minute par défaut) : quelle pratique enfreint la règle d'or, et pourquoi ? Citez la phrase précise de la carte avant de juger.</li>
        <li><strong>Désignation</strong> : l'équipe désigne un suspect. S'il n'a pas la carte undercover, il est disculpé et on recommence.</li>
        <li><strong>Pas de coupable</strong> : être désigné, ou avoir la carte undercover, n'est la faute de personne. Personne ne choisit sa carte : on discute des pratiques, pas des personnes.</li>
        <li><strong>Points pour l'équipe</strong> : 3 points si l'undercover est trouvé au premier vote, 2 au deuxième, 1 au troisième, 0 ensuite.</li>
      </ol>

      <h3>Compétitif</h3>
      <ol>
        <li>En retournant sa carte, chacun découvre son rôle : <strong>l'undercover sait qu'il l'est</strong> et doit se faire passer pour un civil. Il faut au moins 4 joueurs : à 3, un seul civil éliminé à tort fait perdre la manche.</li>
        <li><strong>Tour de parole</strong> : chacun peut garder sa carte sous les yeux, mais la <strong>décrit avec ses mots</strong>, sans la lire. Les civils la décrivent honnêtement : seul l'undercover a le droit de bluffer.</li>
        <li><strong>Débat</strong> chronométré : chacun peut poser une question à un joueur dont la description lui semble floue. Les civils cherchent la description qui évite un détail ; l'undercover parle du contexte de sa carte et tait ce qui la trahit. Une description vague ou exagérée ne prouve rien : un civil peut aussi mal décrire sa carte.</li>
        <li><strong>Vote</strong> : le joueur éliminé révèle son rôle. Si c'est un civil, la manche continue : nouveau débat, nouveau vote.</li>
        <li>Les <strong>civils</strong> gagnent la manche s'ils éliminent l'undercover ; l'<strong>undercover</strong> la gagne s'il ne reste plus qu'un civil.</li>
        <li>Le score compte les <strong>manches gagnées par chaque camp</strong>.</li>
      </ol>

      <h2>Équité</h2>
      <p>D'une manche à l'autre, l'application fait tourner le rôle d'undercover et le joueur qui commence : un même joueur peut les avoir deux fois de suite, mais c'est rare.</p>
      <h2>Fin de partie</h2>
      <p>Après la dernière manche, l'animateur affiche le score et un QR code : en le scannant, chaque joueur retrouve les résultats sur son téléphone.</p>
      <h2>Débrief</h2>
      <p>À la fin de chaque manche, l'animateur affiche la règle, la carte undercover et pourquoi elle l'enfreint. C'est le moment d'échanger sur les pratiques réelles des équipes.</p>
      <p><button class="btn" id="back">Retour</button></p>
    </section>`;
  document.getElementById("back").onclick = () => (history.length > 1 ? history.back() : go("#/"));
}

// Mesures faites sur cette application (Chrome, profil iPhone 13, fichiers compressés comme sur GitHub Pages).
const WEIGHT_TABLE = [
  ["Rejoindre une partie et voir sa carte", 292, 137, 52],
  ["Créer une partie et afficher le QR code", 292, 116, 60],
  ["Parcourir les 132 cartes", 262, 277, 52],
];

function viewLowTech() {
  app.innerHTML = `
    <section class="prose">
      <h1>Pourquoi un Web low-tech ?</h1>
      <p>Chaque page consultée met en mouvement des serveurs, des réseaux et surtout l'appareil que vous tenez en main.
      Un Web plus léger demande moins d'énergie à chacun de ces maillons, et permet de garder plus longtemps des téléphones moins puissants.</p>

      <h2>Ce que pèse le numérique</h2>
      <ul>
        <li>En France, selon l'étude ADEME–Arcep de 2022, la <strong>fabrication et l'usage des terminaux</strong> (téléphones, ordinateurs, écrans) représentent la plus grande part de l'empreinte carbone du numérique, loin devant les réseaux et les centres de données.</li>
        <li>Des pages plus lourdes poussent à renouveler les appareils : un site qui reste fluide sur un vieux téléphone prolonge sa durée de vie.</li>
        <li>Une page web médiane pèse aujourd'hui de l'ordre de <strong>2 Mo</strong> sur mobile, essentiellement en images et en scripts : une grande partie n'est pas indispensable à ce que l'on vient y lire.</li>
      </ul>

      <h2>L'exemple de Low-tech Magazine</h2>
      <p>Le site de <a href="https://solar.lowtechmagazine.com/" target="_blank" rel="noopener">Low-tech Magazine<span class="visually-hidden"> (nouvel onglet)</span></a> est hébergé sur un petit serveur alimenté par un panneau solaire. Pour tenir sur cette énergie, il a été repensé :</p>
      <ul>
        <li><strong>site statique</strong> : les pages sont prêtes à l'avance, aucun calcul à chaque visite ;</li>
        <li><strong>images tramées</strong> en quelques niveaux de gris, bien plus légères que des photos en couleur ;</li>
        <li><strong>police par défaut</strong> du système, sans police à télécharger, et pas de logo en image ;</li>
        <li><strong>aucun traceur</strong>, aucune publicité, aucun service tiers ;</li>
        <li>il accepte d'être <strong>hors ligne</strong> quand le ciel est couvert trop longtemps, et affiche le niveau de sa batterie.</li>
      </ul>
      <p>Pour aller plus loin : <a href="https://solar.lowtechmagazine.com/2018/09/how-to-build-a-low-tech-website/" target="_blank" rel="noopener">How to Build a Low-tech Website?<span class="visually-hidden"> (article en anglais, nouvel onglet)</span></a> (en anglais).</p>
      <p class="hint">Le site étant alimenté par le soleil, il peut être hors ligne après plusieurs jours sans soleil : c'est voulu. Réessayez plus tard.</p>

      <h2>Ce que fait ce mode</h2>
      <ul>
        <li>Police du système et deux encres : pas de couleurs, d'ombres, de dégradés ni d'animations.</li>
        <li>Dos de cartes rendus en texte, avec un dessin simplifié au trait de moins de 1 Ko, intégré à la page, au lieu d'une image couleur de 30 Ko.</li>
        <li>Les images décoratives (éventail de l'accueil, vignettes) ne sont pas téléchargées.</li>
        <li>En thème sombre, fond noir pur : sur les écrans OLED, les pixels noirs sont éteints.</li>
        <li>Le minuteur se redessine une fois par seconde au lieu de quatre.</li>
        <li>Partout, l'application ne charge la bibliothèque des QR codes que sur les écrans qui en affichent, et garde ses fichiers en cache pour fonctionner hors ligne.</li>
      </ul>

      <h2>Les chiffres de cette application</h2>
      <div class="table-wrap">
        <table class="weights">
          <thead><tr><th scope="col">Parcours</th><th scope="col">Avant</th><th scope="col">Normal</th><th scope="col">Low-tech</th></tr></thead>
          <tbody>
            ${WEIGHT_TABLE.map(([label, before, normal, low]) => `<tr><th scope="row">${label}</th><td>${before} Ko</td><td>${normal} Ko</td><td><strong>${low} Ko</strong></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="hint">« Avant » : la version de l'application précédant ce mode. Données transférées lors d'une première visite, fichiers compressés comme sur GitHub Pages.
      Depuis l'ouverture de cette page, votre téléphone a transféré <strong>${formatKo(transferredBytes())}</strong> (0 Ko pour ce qui vient du cache).</p>

      <h2>Et vous, quel Web efficace ?</h2>
      <p>Quelques questions pour se projeter, en lien avec la règle d'or <em>Impact environnemental</em> :</p>
      <ul class="questions">
        <li>Quels outils utilisez-vous chaque jour qui pourraient fonctionner avec moins d'images, de vidéos ou de scripts ?</li>
        <li>Pour vos usages d'IA, quand un modèle plus léger, ou pas d'IA du tout, suffirait-il ?</li>
        <li>Seriez-vous prêts à accepter un service parfois indisponible, comme Low-tech Magazine, s'il consommait beaucoup moins ?</li>
        <li>Quelle serait la version « low-tech » d'un projet sur lequel vous travaillez ?</li>
      </ul>
      <p><button class="btn" id="back">Retour</button></p>
    </section>`;
  document.getElementById("back").onclick = () => (history.length > 1 ? history.back() : go("#/"));
}

// Nombre de cartes d'un jeu (« base » ou « ext » : jeu de base et extension).
function countCards(deck) {
  return RULES.reduce((n, r) => {
    const pool = rulePool(r, deck);
    return n + pool.civilians.length + pool.undercovers.length;
  }, 0);
}

function viewCards() {
  const filter = store.get("cardsFilter", "all");
  const opened = new Set(store.get("cardsOpen", []));
  const shown = (card) => filter === "all" || card.deck === filter;
  const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  app.innerHTML = `
    <section class="catalog">
      <h1>Toutes les cartes</h1>
      <p>${countCards("ext")} cartes : ${countCards("base")} dans le ${DECKS.base.toLowerCase()}, validées, et ${countCards("ext") - countCards("base")} dans l'${DECKS.ext.toLowerCase()}, à valider en atelier.</p>
      <div class="chips" role="group" aria-label="Cartes affichées">
        ${[["all", "Toutes"], ["base", DECKS.base], ["ext", DECKS.ext]]
          .map(([value, text]) => `<button type="button" class="chip" data-filter="${value}" aria-pressed="${filter === value}">${text}</button>`)
          .join("")}
      </div>
      <p><button type="button" class="btn btn--small" id="toggle-all"></button></p>
      ${RULES.map((r) => {
        const civilians = r.civilians.filter(shown);
        const undercovers = r.undercovers.filter(shown);
        return `
        <section class="rule-section" data-rule="${r.id}">
          <h2 class="rule-head">
            <button type="button" class="rule-toggle" aria-expanded="${opened.has(r.id)}" aria-controls="rule-panel-${r.id}">
              ${backImg(r, "back back--thumb", { small: true })}
              <span class="rule-section-title">
                <span class="rule-title">Règle d'or ${r.id} · ${esc(r.theme)}</span>
                <small>${count(civilians.length, "bonne pratique", "bonnes pratiques")} · ${count(undercovers.length, "carte undercover", "cartes undercover")}</small>
              </span>
            </button>
          </h2>
          <div class="rule-panel" id="rule-panel-${r.id}" ${opened.has(r.id) ? "" : "hidden"}>
          <p class="rule-summary">${esc(r.summary)}</p>
          <h3 class="cards-sub">Bonnes pratiques (cartes des civils)</h3>
          <div class="grid">
            ${backImg(r, "back back--grid")}
            ${civilians.map((c) => cardHtml({ ruleId: r.id, card: c })).join("")}
          </div>
          <h3 class="cards-sub">Cartes undercover</h3>
          <div class="grid">
            ${undercovers
              .map(
                (u) => `<div class="uc-pair">
                  ${cardHtml({ ruleId: r.id, card: u, kind: "undercover" })}
                  <p class="why"><strong>Pourquoi elle enfreint la règle :</strong> ${esc(u.why)}</p>
                </div>`
              )
              .join("")}
          </div>
          </div>
        </section>`;
      }).join("")}
      <p><a class="btn" href="#/">Retour</a></p>
    </section>`;

  const toggles = [...app.querySelectorAll(".rule-toggle")];
  const isOpen = (t) => t.getAttribute("aria-expanded") === "true";
  const setOpen = (t, open) => {
    t.setAttribute("aria-expanded", String(open));
    document.getElementById(t.getAttribute("aria-controls")).hidden = !open;
  };
  const toggleAll = document.getElementById("toggle-all");
  const syncToggleAll = () => {
    toggleAll.textContent = toggles.every(isOpen) ? "Tout replier" : "Tout déplier";
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
    players: 6,
    undercovers: 1,
    rules: RULES.map((r) => r.id),
    ordered: false,
    rounds: 5,
    mode: "coop",
    deck: "base",
    names: {},
    ...store.get("hostPrefs", {}),
  };
  // Les prénoms de la partie précédente ne sont pas repris d'office : une nouvelle équipe
  // risquerait de jouer sous les prénoms de la précédente. Un bouton permet de les reprendre.
  const lastNames = Object.keys(prefs.names)
    .sort((a, b) => a - b)
    .map((seat) => cleanName(prefs.names[seat]))
    .filter(Boolean);
  app.innerHTML = `
    <section>
      <h1>Nouvelle partie</h1>
      <form id="setup" class="form">
        <fieldset class="fs-mode">
          <legend>Mode de jeu</legend>
          <label class="radio mode-pick"><input type="radio" name="mode" value="coop" ${prefs.mode !== "compet" ? "checked" : ""}>
            <span><strong>Coopératif</strong> (recommandé)<br><small>L'application ne révèle aucun rôle. Chacun lit sa carte à voix haute et l'équipe enquête ensemble. 3, 2 ou 1 point selon le nombre de votes.</small></span></label>
          <label class="radio mode-pick"><input type="radio" name="mode" value="compet" ${prefs.mode === "compet" ? "checked" : ""}>
            <span><strong>Compétitif</strong><br><small>L'undercover sait qu'il l'est et bluffe. On décrit sa carte avec ses mots. Civils contre undercover. À partir de 4 joueurs.</small></span></label>
        </fieldset>

        <fieldset class="fs-players">
          <legend>Joueurs (sans l'animateur)</legend>
          <div class="stepper" data-target="players">
            <button type="button" data-step="-1" aria-label="Un joueur de moins">−</button>
            <input id="players" name="players" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${prefs.players}" aria-label="Nombre de joueurs, sans compter l'animateur" aria-describedby="players-hint">
            <button type="button" data-step="1" aria-label="Un joueur de plus">+</button>
          </div>
          <p class="hint" id="players-hint">Comptez uniquement les personnes qui reçoivent une carte : l'animateur ne joue pas. Saisissez leurs prénoms : chacun retrouvera le sien en scannant le QR code, et l'écran de l'animateur affiche le numéro de chacun.</p>
          <ol class="name-list" id="name-list"></ol>
          ${
            lastNames.length
              ? `<div class="reuse-names" id="reuse-names">
                  <button type="button" class="btn btn--small" id="reuse-names-btn" aria-describedby="reuse-names-list">Reprendre les prénoms de la partie précédente</button>
                  <p class="small" id="reuse-names-list">${esc(lastNames.join(", "))}</p>
                </div>`
              : ""
          }
        </fieldset>

        <fieldset class="fs-rounds">
          <legend>Manches</legend>
          <div class="stepper" data-target="rounds">
            <button type="button" data-step="-1" aria-label="Une manche de moins">−</button>
            <input id="rounds" name="rounds" type="number" inputmode="numeric" min="1" max="${MAX_ROUNDS}" value="${prefs.rounds}" aria-label="Nombre de manches">
            <button type="button" data-step="1" aria-label="Une manche de plus">+</button>
          </div>
          <p class="hint">À la fin de la dernière manche, l'application affiche le score de l'équipe et le récapitulatif des manches.</p>
        </fieldset>

        <fieldset class="fs-rules">
          <legend>Règles d'or jouées</legend>
          <div class="rule-picks">
            ${RULES.map(
              (r) => `
              <label class="check rule-pick">
                <input type="checkbox" name="rules" value="${r.id}" ${prefs.rules.includes(r.id) ? "checked" : ""}>
                ${backImg(r, "back back--thumb", { small: true })}
                <span><strong>Règle d'or ${r.id}</strong><br>${esc(r.theme)}</span>
              </label>`
            ).join("")}
          </div>
          <div class="inline-actions">
            <button type="button" class="btn btn--small" data-rules="all">Toutes</button>
            <button type="button" class="btn btn--small" data-rules="none">Aucune</button>
          </div>
          <label class="radio"><input type="radio" name="ordered" value="0" ${!prefs.ordered ? "checked" : ""}> <span>Ordre aléatoire</span></label>
          <label class="radio"><input type="radio" name="ordered" value="1" ${prefs.ordered ? "checked" : ""}> <span>Dans l'ordre des règles (une règle par manche)</span></label>
          <p class="rules-hint" id="rules-hint" aria-live="polite"></p>
        </fieldset>

        <fieldset class="fs-deck">
          <legend>Cartes</legend>
          <label class="radio"><input type="radio" name="deck" value="base" ${prefs.deck !== "ext" ? "checked" : ""}> <span>${DECKS.base} <small>(${countCards("base")} cartes validées)</small></span></label>
          <label class="radio"><input type="radio" name="deck" value="ext" ${prefs.deck === "ext" ? "checked" : ""}> <span>${DECKS.base} et ${DECKS.ext.toLowerCase()} <small>(${countCards("ext")} cartes, dont ${countCards("ext") - countCards("base")} à valider en atelier)</small></span></label>
        </fieldset>

        <fieldset class="fs-undercovers">
          <legend>Undercovers</legend>
          <label class="radio"><input type="radio" name="undercovers" value="1" ${prefs.undercovers === 1 ? "checked" : ""}> <span>1 undercover</span></label>
          <label class="radio"><input type="radio" name="undercovers" value="2" ${prefs.undercovers === 2 ? "checked" : ""}> <span>2 undercovers <small>(à partir de 7 joueurs)</small></span></label>
        </fieldset>

        <p class="error" id="setup-error" role="alert"></p>
        <button class="btn btn--primary" type="submit">Générer la partie</button>
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
          placeholder="Joueur ${i + 1}" value="${esc(typedNames[i + 1] || "")}" aria-label="Prénom du joueur ${i + 1}"></li>`
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
  });
  form.elements.players.addEventListener("change", renderNames);

  document.getElementById("reuse-names-btn")?.addEventListener("click", () => {
    Object.assign(typedNames, prefs.names);
    const seats = Object.keys(prefs.names).filter((seat) => cleanName(prefs.names[seat])).map(Number);
    const players = form.elements.players;
    players.value = Math.min(Number(players.max), Math.max(Number(players.value), ...seats));
    renderNames();
    document.getElementById("reuse-names").remove();
    announce(`Prénoms repris : ${lastNames.join(", ")}.`);
    document.getElementById("name-1").focus();
  });

  // Compare le nombre de manches au nombre de règles choisies : toutes ne seront pas forcément jouées.
  const syncRulesHint = () => {
    const hint = document.getElementById("rules-hint");
    const rules = form.querySelectorAll('input[name="rules"]:checked').length;
    const rounds = Number(form.elements.rounds.value) || 0;
    const ordered = form.elements.ordered.value === "1";
    const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
    hint.textContent =
      !rules || !rounds
        ? ""
        : rounds < rules
          ? `${plural(rules, "règle")} d'or choisie${rules > 1 ? "s" : ""} pour ${plural(rounds, "manche")} : seule${rounds > 1 ? "s" : ""} ${rounds} ${rounds > 1 ? "seront jouées" : "sera jouée"}, ${
              ordered ? "les premières dans l'ordre" : "tirée" + (rounds > 1 ? "s" : "") + " au hasard"
            }. ${rules - rounds} ne ${rules - rounds > 1 ? "seront" : "sera"} pas abordée${rules - rounds > 1 ? "s" : ""}.`
          : rounds > rules
            ? `${plural(rounds, "manche")} pour ${plural(rules, "règle")} d'or : toutes seront jouées, et certaines reviendront une seconde fois.`
            : `Chaque règle d'or choisie sera jouée une fois.`;
    hint.classList.toggle("rules-hint--warn", rules > 0 && rounds > 0 && rounds < rules);
  };
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
  const rulesSummary =
    game.rules.length === RULES.length ? "toutes les règles" : `règle${game.rules.length > 1 ? "s" : ""} ${game.rules.join(", ")}`;

  app.innerHTML = `
    <section class="host">
      <aside class="host-side" aria-label="Rejoindre la partie">
      <div class="share">
        ${qrSlot(url, "QR code pour rejoindre la partie")}
        <div>
          <p class="label">Code de la partie</p>
          <p class="code">${esc(prettyCode(code))}</p>
          <p class="small">Mode ${coop ? "coopératif" : "compétitif"} · ${game.players} joueurs · ${game.undercovers} undercover${game.undercovers > 1 ? "s" : ""} · ${game.rounds} manche${game.rounds > 1 ? "s" : ""} · ${rulesSummary} · ${game.deck === "ext" ? `${DECKS.base.toLowerCase()} et ${DECKS.ext.toLowerCase()}` : DECKS.base.toLowerCase()}</p>
          <button class="btn btn--small" id="copy">Copier le lien</button>
          <button class="btn btn--small" id="seat-qrs">QR par joueur</button>
        </div>
      </div>
      </aside>

      <div class="host-main">
      <div class="round-bar">
        ${backImg(deal.rule, "back back--round", { lazy: false, small: true })}
        <div>
          <h1>Manche ${state.round} <span class="of">/ ${game.rounds}</span></h1>
          ${ruleTag(deal.rule)}
          ${
            state.round > 1 && !result
              ? `<p class="round-reminder"><span aria-hidden="true">📱 </span>Demandez à chacun de toucher <strong>«&nbsp;Manche suivante&nbsp;»</strong>&nbsp;: son téléphone doit afficher <strong>Manche&nbsp;${state.round}</strong>.</p>`
              : `<p>Les joueurs doivent afficher la <strong>manche ${state.round}</strong> sur leur téléphone.</p>`
          }
        </div>
      </div>

      ${teamScoreHtml(game, state.results)}

      ${result ? "" : timerHtml(coop)}

      ${
        result
          ? resultBanner(result, "div", state.results[state.round])
          : `<div class="starter">
              <p><span aria-hidden="true">🎙️ </span><strong>${esc(playerName(state, deal.starter))}</strong> ${
                coop ? "commence : chacun lit sa carte à voix haute, mot pour mot, puis l'équipe désigne un suspect." : "commence le tour de parole : chacun décrit sa carte avec ses mots, sans la lire."
              }</p>
              <p class="small">${
                coop
                  ? "Si le suspect est disculpé, l'équipe relance le débat et désigne quelqu'un d'autre."
                  : "Pendant le débat, chacun peut poser une question à un joueur. Une description vague ou exagérée ne prouve rien : un civil peut aussi mal décrire sa carte. Si un civil est éliminé, la manche continue : nouveau débat, nouveau vote."
              }</p>
            </div>`
      }

      <ul class="players">
        ${deal.roles
          .map((r) => {
            const out = state.eliminated.includes(r.seat);
            const revealed = out || result;
            // Coopératif : un civil désigné à tort est disculpé et reste en jeu.
            const status = !out ? "" : coop ? (r.role === "undercover" ? " · démasqué" : " · disculpé") : " · éliminé";
            return `
            <li class="${out && !coop ? "out" : ""}">
              <span class="seat">${r.seat}</span>
              <input class="name" id="host-name-${r.seat}" data-seat="${r.seat}" maxlength="${MAX_NAME_LENGTH}" value="${esc(state.names[r.seat] || "")}" placeholder="Joueur ${r.seat}" aria-label="Prénom du joueur ${r.seat}">
              ${
                revealed
                  ? `<span class="role role--${r.role}">${ROLE_LABELS[r.role]}${status}</span>`
                  : coop
                    ? `<button class="btn btn--small" data-eliminate="${r.seat}">Désigner</button>`
                    : `<button class="btn btn--small btn--danger" data-eliminate="${r.seat}">Éliminer</button>`
              }
            </li>`;
          })
          .join("")}
      </ul>

      <div class="actions">
        ${result ? `<button class="btn btn--primary" id="debrief">Débrief de la manche</button>` : ""}
        ${
          lastRound
            ? `<a class="btn" href="#/end/${code}" id="finish">Voir les résultats</a>`
            : `<button class="btn" id="next">Manche suivante</button>`
        }
        <a class="btn" href="#/pass/${code}">Distribuer sur ce téléphone</a>
        ${!result ? `<button class="btn btn--ghost" id="debrief">Révéler et débriefer</button>` : ""}
      </div>
      ${!lastRound ? `<div class="actions actions--secondary"><button class="btn btn--ghost" id="end-now">Terminer la partie maintenant</button></div>` : ""}
      <div class="danger-zone">
        <p class="small">Efface la partie de cet appareil (prénoms, scores, manches). Une confirmation est demandée.</p>
        <button class="btn btn--small btn--danger" id="forget">Supprimer la partie</button>
      </div>
      </div>
    </section>`;

  document.getElementById("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      document.getElementById("copy").textContent = "Lien copié";
      announce("Lien de la partie copié.");
    } catch {
      openModal(`
        <h2>Lien à partager</h2>
        <input class="share-url" id="share-url" readonly value="${esc(url)}" aria-label="Lien de la partie">
        <button class="btn btn--primary" data-close>Fermer</button>`);
      document.getElementById("share-url").select();
    }
  };
  document.getElementById("seat-qrs").onclick = () => showSeatQrs(code, game, hostState(code));
  if (!result) mountTimer(`${code}:${state.round}`);

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
    confirmModal("La manche n'est pas terminée. Révéler tous les rôles ?", "Révéler", () => {
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
      <h2>Manche ${s.round} / ${game.rounds}</h2>
      ${ruleTag(dealRound(game, s.round).rule)}
      <p>Demandez à chaque joueur d'appuyer sur <strong>« Manche suivante »</strong> sur son téléphone pour découvrir sa nouvelle carte.</p>
      <button class="btn btn--primary" data-close>OK</button>`);
  };
  document.getElementById("next")?.addEventListener("click", () =>
    result ? nextRound() : confirmModal("La manche en cours n'est pas terminée. Passer à la suivante ?", "Passer", nextRound)
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
    confirmModal("La dernière manche n'est pas terminée. Afficher quand même les résultats ?", "Voir les résultats", endGame);
  });
  document.getElementById("end-now")?.addEventListener("click", () =>
    confirmModal(
      `Terminer la partie maintenant ? Les manches ${state.round + 1} à ${game.rounds} ne seront pas jouées.`,
      "Terminer",
      endGame
    )
  );
  document.getElementById("forget").onclick = () => confirmForget(code, "cette partie");
}

function resultBanner(result, tag = "p", code = "") {
  const pts = Number(code);
  const [icon, text] =
    result === "found"
      ? ["🎉", `Undercover démasqué ! +${pts} point${pts > 1 ? "s" : ""} pour l'équipe.`]
      : result === "civilians"
      ? ["🎉", "Les civils ont démasqué l'undercover !"]
      : result === "impostors"
        ? ["🕵️", "L'undercover l'emporte : il ne reste qu'un civil."]
        : ["", "Rôles révélés."];
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
    <h2>Désigner ${esc(name)} ?</h2>
    <p>L'équipe pense que ${esc(name)} a la carte qui enfreint la règle d'or. Son rôle sera révélé.</p>
    <div class="actions">
      <button class="btn btn--primary" id="do-eliminate">Désigner</button>
      <button class="btn" data-close>Annuler</button>
    </div>`
      : `
    <h2>Éliminer ${esc(name)} ?</h2>
    <p>Son rôle sera révélé à tout le groupe.</p>
    <div class="actions">
      <button class="btn btn--danger" id="do-eliminate">Éliminer</button>
      <button class="btn" data-close>Annuler</button>
    </div>`
  );

  document.getElementById("do-eliminate").onclick = () => {
    state.eliminated.push(seat);
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
        ? "Bien vu ! Il reste un undercover à trouver."
        : `Ce n'est pas l'undercover : ${esc(name)} est disculpé. Relisez les cartes et désignez un autre suspect${
            errors >= COOP_MAX_POINTS ? "." : ` (la manche vaut maintenant ${coopPoints(errors)} point${coopPoints(errors) > 1 ? "s" : ""}).`
          }`
      : "La manche continue : nouveau tour de parole !";
    // On débat des pratiques, pas des personnes : personne ne choisit sa carte.
    const reassure = !coop
      ? ""
      : player.role === "undercover"
        ? `${esc(name)} ne pouvait pas savoir que sa carte enfreignait la règle : c'est la pratique qu'on discute, pas la personne.`
        : `Ce n'est pas une erreur de sa part : sa carte décrit une bonne pratique, et l'application ne révèle à personne qui a la carte undercover.`;
    openModal(`
      <p class="label">${esc(name)} ${coop ? "avait…" : "était…"}</p>
      <p class="role-reveal role--${player.role}">${coop ? (player.role === "undercover" ? "La carte undercover" : "Une bonne pratique") : ROLE_LABELS[player.role]}</p>
      ${result ? resultBanner(result, "p", state.results[state.round]) : `<p>${next}</p>`}
      ${reassure ? `<p class="reassure">${reassure}</p>` : ""}
      <button class="btn btn--primary" data-close>Continuer</button>`);
  };
}

function showSeatQrs(code, game, state) {
  const seats = Array.from({ length: game.players }, (_, i) => i + 1);
  let index = 0;
  const show = () => {
    const seat = seats[index];
    openModal(`
      <p class="label">Au tour de</p>
      <h2>${esc(playerName(state, seat))}</h2>
      ${qrSlot(joinUrl(code, seat, state.names, game.players), `QR code de ${playerName(state, seat)} pour rejoindre la partie`, 8, "qr--big")}
      <p class="small">Scanne ce QR code : ta carte s'affiche directement.</p>
      <div class="actions">
        <button class="btn" id="qr-prev" ${index === 0 ? "disabled" : ""}>←</button>
        <button class="btn btn--primary" id="qr-next">${index === seats.length - 1 ? "Terminer" : "Joueur suivant →"}</button>
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

function viewDebrief(code) {
  const game = decodeCode(code);
  if (!game) return viewInvalid(code);
  const state = hostState(code);
  const deal = dealRound(game, state.round);
  const rule = deal.rule;
  const holders = (text) =>
    deal.roles
      .filter((r) => r.card === text)
      .map((r) => playerName(state, r.seat))
      .join(", ");
  const distributed = rule.civilians.filter((c) => holders(c.text));

  app.innerHTML = `
    <section>
      <div class="debrief-head">
        ${backImg(rule, "back back--round", { lazy: false, small: true })}
        <div>
          <p class="label">Manche ${state.round} / ${game.rounds} · débrief</p>
          <h1>Règle d'or ${rule.id} · ${esc(rule.theme)}</h1>
          <p class="rule-summary">${esc(rule.summary)}</p>
        </div>
      </div>

      <div class="debrief-uc">
      <h2>La carte undercover</h2>
      ${cardHtml({ ruleId: rule.id, card: deal.undercover, kind: "undercover", label: holders(deal.undercover.text) })}
      <p class="why"><strong>Pourquoi elle enfreint la règle :</strong> ${esc(deal.undercover.why)}</p>
      </div>

      <div class="debrief-civ">
      <h2>Les cartes des civils</h2>
      <div class="grid">
        ${distributed.map((c) => cardHtml({ ruleId: rule.id, card: c, label: holders(c.text) })).join("")}
      </div>

      <h2>Questions pour la discussion</h2>
      ${timerHtml(game.mode === "coop", "debrief")}
      <ul class="questions">
        <li><strong>${esc(rule.question)}</strong></li>
        <li>Quelle phrase précise de la carte undercover enfreint la règle ? Citez-la.</li>
        <li>Avez-vous déjà rencontré cette situation dans votre activité ?</li>
        <li>Comment la transformer pour qu'elle respecte la règle ${rule.id} ?</li>
        <li>Laquelle des bonnes pratiques est la plus facile / difficile à appliquer chez vous ?</li>
      </ul>
      </div>

      <div class="actions">
        <a class="btn btn--primary" href="#/host/${code}">Retour à la partie</a>
      </div>
    </section>`;
  mountTimer(`debrief:${code}:${state.round}`, "debrief");
}

// Classement et récapitulatif des manches, partagés par l'écran animateur et les téléphones.
function resultsHtml(game, names, results, mySeat) {
  const label = (seat) => names[seat] || `Joueur ${seat}`;
  const rounds = Object.keys(results).map(Number).sort((a, b) => a - b);

  return `
    ${teamScoreHtml(game, results, true)}
    ${
      rounds.length
        ? `<div class="results-rounds">
          <h2 class="section-title">Les manches</h2>
          <ol class="recap">
            ${rounds
              .map((round) => {
                const deal = dealRound(game, round);
                const undercovers = deal.roles.filter((r) => r.role === "undercover").map((r) => label(r.seat) + (r.seat === mySeat ? " (toi)" : ""));
                const res = results[round];
                return `
                <li>
                  ${backImg(deal.rule, "back back--thumb", { small: true })}
                  <div>
                    <p class="recap-title">Manche ${round} · ${esc(deal.rule.theme)}</p>
                    <p class="small">Undercover : <strong>${esc(undercovers.join(", "))}</strong></p>
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
  const results = Object.fromEntries(
    Array.from({ length: playedRounds(state) }, (_, i) => [i + 1, state.results[i + 1] || "s"])
  );
  const shareUrl = resultsUrl(code, game, state);

  app.innerHTML = `
    <section class="end">
      <p class="label center-text">Partie ${esc(prettyCode(code))}</p>
      <h1 class="center-text">Fin de partie</h1>
      ${resultsHtml(game, state.names, results, null)}

      <div class="share share--results">
        ${qrSlot(shareUrl, "QR code des résultats de la partie")}
        <div>
          <p class="label">Résultats sur les téléphones</p>
          <p>Les joueurs scannent ce QR code pour retrouver le score et le récapitulatif des manches.</p>
          <button class="btn btn--small" id="copy-results">Copier le lien des résultats</button>
        </div>
      </div>

      <div class="actions">
        <a class="btn btn--primary" href="#/host">Nouvelle partie</a>
        <a class="btn" href="#/host/${code}">Retour au tableau de bord</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">Supprimer la partie</button>
      </div>
    </section>`;
  document.getElementById("copy-results").onclick = async (e) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      e.target.textContent = "Lien copié";
      announce("Lien des résultats copié.");
    } catch {
      openModal(`
        <h2>Lien des résultats</h2>
        <input class="share-url" id="share-url" readonly value="${esc(shareUrl)}" aria-label="Lien des résultats">
        <button class="btn btn--primary" data-close>Fermer</button>`);
      document.getElementById("share-url").select();
    }
  };
  document.getElementById("forget").onclick = () => confirmForget(code, "cette partie");
}

function viewResults(code, token) {
  const game = decodeCode(code);
  const data = game && token && decodeResults(token, game.players);
  if (!game || !data) return viewInvalid(code);
  const me = store.get("lastPlayer", null);
  const mySeat = me?.code === game.code ? me.seat : null;

  app.innerHTML = `
    <section class="end">
      <p class="label center-text">Partie ${esc(prettyCode(game.code))}</p>
      <h1 class="center-text">Résultats</h1>
      ${resultsHtml(game, data.names, data.results, mySeat)}
      <div class="actions">
        <a class="btn btn--primary" href="#/">Accueil</a>
        <a class="btn" href="#/cards">Revoir toutes les cartes</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">Supprimer la partie de ce téléphone</button>
      </div>
    </section>`;
  document.getElementById("forget").onclick = () => confirmForget(game.code, "cette partie");
}

function viewJoin(prefill, seatPrefill, namesToken) {
  const game = prefill ? decodeCode(prefill) : null;
  if (game && namesToken) store.set(`names:${game.code}`, decodeNames(namesToken));
  if (game && seatPrefill && seatPrefill >= 1 && seatPrefill <= game.players) {
    return go(`#/play/${game.code}/${seatPrefill}`);
  }
  app.innerHTML = `
    <section>
      <h1>Rejoindre une partie</h1>
      <form id="join" class="form">
        <label>Code de la partie
          <input id="join-code" name="code" class="code-input" autocomplete="off" autocapitalize="characters" maxlength="${CODE_LENGTH + 1}" placeholder="ABCD 1234" value="${esc(game ? prettyCode(game.code) : prefill || "")}">
        </label>
        <div id="seats"></div>
        <p class="error" id="join-error" role="alert"></p>
      </form>
    </section>`;

  const form = document.getElementById("join");
  const seatsEl = document.getElementById("seats");
  const errorEl = document.getElementById("join-error");

  const update = () => {
    const raw = form.elements.code.value;
    const g = decodeCode(raw);
    errorEl.textContent = "";
    if (!g) {
      seatsEl.innerHTML = "";
      if (raw.replace(/\s/g, "").length >= CODE_LENGTH) errorEl.textContent = "Code invalide. Vérifiez auprès de l'animateur.";
      return;
    }
    const names = knownNames(g.code);
    const hasNames = Object.keys(names).length > 0;
    seatsEl.innerHTML = `
      <p class="label">${hasNames ? "Qui es-tu ?" : "Quel est ton numéro de joueur ?"}</p>
      <div class="seat-grid ${hasNames ? "seat-grid--names" : ""}">
        ${Array.from(
          { length: g.players },
          (_, i) => `
          <a class="seat-btn" href="#/play/${g.code}/${i + 1}">
            ${names[i + 1] ? `<span>${esc(names[i + 1])}</span><small>joueur ${i + 1}</small>` : i + 1}
          </a>`
        ).join("")}
      </div>
      <p class="hint">${
        hasNames
          ? "Touche ton prénom."
          : "Choisis le numéro affiché à côté de ton prénom sur l'écran de l'animateur."
      }</p>`;
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
        <h1>${myName ? `${esc(myName)} <small class="small">joueur ${seat}</small>` : `Joueur ${seat}`}</h1>
        <span class="small">${esc(prettyCode(game.code))}</span>
      </div>
      ${
        myName
          ? ""
          : `<p class="hint seat-check">Vérifie sur l'écran de l'animateur que le numéro ${seat} est bien à côté de ton prénom. <a href="#join-${game.code}">Changer de numéro</a></p>`
      }
      <div class="round-switch">
        <button class="btn btn--small" id="prev" ${round <= 1 ? "disabled" : ""} aria-label="Manche précédente">←</button>
        <strong>Manche ${round} <span class="of">/ ${game.rounds}</span></strong>
        ${
          last
            ? `<a class="btn btn--small btn--primary" href="#/over/${game.code}/${seat}">Fin de partie →</a>`
            : `<button class="btn btn--small" id="next">Manche suivante →</button>`
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
      <h1 class="center-text">Partie terminée${myName ? `, ${esc(myName)}` : ""} !</h1>
      <p class="center-text">Scanne le <strong>QR code des résultats</strong> affiché par l'animateur pour voir le score ${game.mode === "coop" ? "de l'équipe" : "des deux camps"} et l'undercover de chaque manche jouée.</p>
      <p class="hint center-text">La partie n'est pas finie ? Reviens à tes cartes : rien n'a été révélé.</p>

      <div class="actions">
        <a class="btn btn--primary" href="#/play/${game.code}/${seat}">Revoir mes cartes</a>
        <a class="btn" href="#/">Accueil</a>
      </div>
      <div class="actions actions--secondary">
        <button class="btn btn--ghost btn--ghost-danger" id="forget">Supprimer la partie de ce téléphone</button>
      </div>
    </section>`;
  document.getElementById("forget").onclick = () => confirmForget(game.code, "cette partie");
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
          <h1>Distribution terminée</h1>
          <p>Rendez le téléphone à l'animateur.</p>
          <a class="btn btn--primary" href="#/host/${code}">Aller au tableau de bord</a>
        </section>`;
      announceView();
      return;
    }
    const me = deal.roles[seat - 1];
    app.innerHTML = `
      <section class="center pass">
        <p class="label">Manche ${state.round} / ${game.rounds} · distribution</p>
        <h1>${esc(playerName(state, seat))}</h1>
        <p>Prends le téléphone, puis maintiens le doigt sur la carte pour la retourner.</p>
        ${secretHtml(deal.rule, playerCardHtml(game, deal, me))}
        <p class="hint">${playerHint(game)}</p>
        <button class="btn btn--primary" id="next-seat">J'ai vu ma carte → joueur suivant</button>
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
      <h1>Code introuvable</h1>
      <p>Le code « ${esc(code || "")} » n'est pas valide. S'il s'agit d'une partie créée avant la dernière mise à jour, demandez à l'animateur d'en créer une nouvelle.</p>
      <a class="btn btn--primary" href="#/join">Saisir un code</a>
    </section>`;
}

// --- Routeur --------------------------------------------------------------------------------

// Titre de l'onglet = titre de l'écran ; le focus va sur ce titre pour que le lecteur d'écran l'annonce.
let firstRender = true;
function announceView() {
  const h1 = app.querySelector("h1");
  const name = h1?.textContent.replace(/\s+/g, " ").trim();
  document.title = name ? `${name} – Undercover IA responsable` : "Undercover IA responsable";
  if (h1 && !firstRender) {
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }
  firstRender = false;
}

function render() {
  closeModal(false);
  const viewName = location.hash.replace(/^#\/?/, "").split(/[/~-]/)[0] || "home";
  app.dataset.view = viewName === "host" && !location.hash.split("/")[2] ? "setup" : viewName;
  clearInterval(timer.interval);
  const hash = location.hash.replace(/^#/, "");
  const join = hash.match(/^join-([A-Za-z0-9]+)(?:-(\d+))?(?:~([A-Za-z0-9_-]+))?$/);
  const results = hash.match(/^results-([A-Za-z0-9]+)~([A-Za-z0-9_-]+)$/);
  const [, route = "", a, b, c] = join
    ? ["", "join", join[1], join[2], join[3]]
    : results
      ? ["", "results", results[1], results[2]]
      : hash.split("/");
  switch (route) {
    case "host":
      a ? viewHost(a) : viewHostSetup();
      break;
    case "debrief":
      viewDebrief(a);
      break;
    case "end":
      viewEnd(a);
      break;
    case "results":
      viewResults(a, b);
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
      viewCards();
      break;
    case "lowtech":
      viewLowTech();
      break;
    default:
      viewHome();
  }
  hydrateQr(app);
  window.scrollTo(0, 0);
  announceView();
  paintWeight();
  setTimeout(paintWeight, 1500);
}

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
