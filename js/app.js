import { RULES } from "./cards.js";
import {
  CODE_LENGTH,
  MAX_ROUNDS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  decodeCode,
  dealRound,
  newCode,
  outcome,
  roundPoints,
  validateSettings,
} from "./game.js";

const app = document.getElementById("app");
const modal = document.getElementById("modal");

const ROLE_LABELS = { civilian: "Civil", undercover: "Undercover" };
// Issue de chaque manche, stockée en une lettre (elle voyage aussi dans le lien des résultats).
const RESULT_LABELS = { c: "Victoire des civils", i: "Victoire de l'undercover", r: "Rôles révélés", s: "Manche passée" };
const RESULT_CODES = { civilians: "c", impostors: "i", revealed: "r" };

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
  const scores = Array.from({ length: game.players }, (_, i) => state.scores[i + 1] || 0).join(",");
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

function qrSvg(text, cell = 6) {
  if (typeof window.qrcode !== "function") return "";
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

function prettyCode(code) {
  const half = code.length / 2;
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function openModal(html) {
  modal.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
  modal.hidden = false;
  modal.querySelector("button, a")?.focus();
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

function closeModal() {
  modal.hidden = true;
  modal.innerHTML = "";
}

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

function cardHtml({ ruleId, text, kind = "civilian", label, theme }) {
  return `
    <article class="card card--rule${ruleId} ${kind === "undercover" ? "card--undercover" : ""}">
      <header class="card-head"><span>RÈGLE ${ruleId}</span><i></i></header>
      ${theme ? `<p class="card-theme">${esc(theme)}</p>` : ""}
      <p class="card-text">${esc(text)}</p>
      ${kind === "undercover" ? `<footer class="card-foot">UNDERCOVER</footer>` : ""}
      ${label ? `<footer class="card-label">${esc(label)}</footer>` : ""}
    </article>`;
}

function backImg(rule, className = "back", lazy = true) {
  return `<img class="${className}" src="${rule.back}" width="640" height="893" draggable="false" ${lazy ? 'loading="lazy"' : ""}
    alt="Dos de carte, règle d'or ${rule.id} : ${esc(rule.theme)}">`;
}

// Carte secrète : le dos de la carte de la règle d'or la masque ; on la retourne en maintenant le doigt.
function secretHtml(rule, front) {
  return `
    <div class="secret" id="secret">
      <div class="secret-cover secret-cover--back">${backImg(rule, "back", false)}</div>
      <div class="secret-content">${front}</div>
    </div>
    <p class="secret-hint">👆 Maintiens le doigt sur la carte pour la retourner. Cache ton écran des autres joueurs.</p>`;
}

function bindSecret() {
  const secret = document.getElementById("secret");
  secret.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    secret.classList.add("revealed");
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
    secret.addEventListener(ev, () => secret.classList.remove("revealed"))
  );
  secret.addEventListener("contextmenu", (e) => e.preventDefault());
}

function ruleTag(rule) {
  return `<p class="round-theme round-theme--${rule.id}"><span>Règle d'or ${rule.id}</span> ${esc(rule.theme)}</p>`;
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

const TIMER_DURATIONS = [30, 60, 90];
const timer = { key: null, duration: store.get("timerDuration", 30), end: null, remaining: 0, interval: null, audio: null };

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

function timerHtml() {
  return `
    <section class="timer" id="timer" aria-label="Minuteur du débat">
      <div class="timer-main">
        <p class="label">Débat</p>
        <p class="timer-face" id="timer-face" role="timer" aria-live="off"></p>
      </div>
      <div class="timer-bar"><i id="timer-bar"></i></div>
      <div class="timer-controls">
        <div class="chips" role="group" aria-label="Durée">
          ${TIMER_DURATIONS.map((d) => `<button type="button" class="chip" data-duration="${d}">${d} s</button>`).join("")}
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
  }
  const running = Boolean(timer.end);
  const done = left === 0;
  el.classList.toggle("timer--running", running);
  el.classList.toggle("timer--done", done);
  el.classList.toggle("timer--urgent", running && left <= 10000);
  document.getElementById("timer-face").textContent = done ? "Temps écoulé !" : formatSeconds(left);
  document.getElementById("timer-bar").style.width = `${(left / (timer.duration * 1000)) * 100}%`;
  document.getElementById("timer-toggle").textContent = running ? "Pause" : done ? "Relancer" : left < timer.duration * 1000 ? "Reprendre" : "Lancer le débat";
  el.querySelectorAll("[data-duration]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.duration) === timer.duration)));
}

function mountTimer(key) {
  if (timer.key !== key) resetTimer(key);
  const el = document.getElementById("timer");
  el.addEventListener("click", (e) => {
    const duration = e.target.closest("[data-duration]");
    if (duration) {
      timer.duration = Number(duration.dataset.duration);
      store.set("timerDuration", timer.duration);
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
  timer.interval = setInterval(paintTimer, 250);
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
      <div class="fan" aria-hidden="true">
        ${RULES.map((r, i) => `<img src="${r.back}" alt="" width="640" height="893" draggable="false" style="--i:${i - (RULES.length - 1) / 2}">`).join("")}
      </div>
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
        <span><strong>Toutes les cartes</strong><small>Les 7 règles d'or et leurs 44 cartes</small></span>
      </a>
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
      <h2>Mise en place</h2>
      <ol>
        <li>L'animateur crée une partie : prénoms des joueurs, règles d'or à jouer, nombre de manches.</li>
        <li>Il affiche le <strong>QR code</strong> (ou le code de la partie).</li>
        <li>Chacun scanne le QR code et touche <strong>son prénom</strong>. Sa carte s'affiche face cachée : on la retourne en maintenant le doigt dessus.</li>
      </ol>
      <p class="hint">Aucune connexion entre téléphones n'est nécessaire : chaque téléphone calcule sa propre carte à partir du code.
      Pas assez de téléphones ? Utilisez le mode « Distribuer sur ce téléphone ».</p>
      <h2>Les rôles</h2>
      <ul>
        <li><strong>Civils</strong> : ils ont tous une bonne pratique liée à la règle d'or de la manche.</li>
        <li><strong>Undercover</strong> : sa carte parle du même sujet mais <em>enfreint</em> la règle. Il ne sait pas forcément qu'il est l'undercover !</li>
      </ul>
      <h2>Déroulement d'une manche</h2>
      <ol>
        <li><strong>Tour de parole</strong> : à partir du joueur désigné, chacun donne <em>un mot ou une phrase courte</em> qui évoque sa carte, sans la lire.</li>
        <li><strong>Débat</strong> chronométré (30 secondes par défaut) : qui semble enfreindre la règle d'or ?</li>
        <li><strong>Vote</strong> : on élimine un joueur à main levée. L'animateur le marque comme éliminé et son rôle est révélé.</li>
        <li>On recommence jusqu'à la victoire d'un camp, puis on débriefe.</li>
      </ol>
      <h2>Victoire et points</h2>
      <ul>
        <li>Les <strong>civils</strong> gagnent s'ils éliminent tous les undercovers : <strong>2 points</strong> pour chaque civil.</li>
        <li>L'<strong>undercover</strong> gagne s'il ne reste plus qu'un civil : <strong>10 points</strong> pour chaque undercover encore en jeu.</li>
      </ul>
      <h2>Fin de partie</h2>
      <p>Après la dernière manche, l'animateur affiche le classement et un QR code : en le scannant, chaque joueur retrouve les résultats sur son téléphone.</p>
      <h2>Débrief</h2>
      <p>À la fin de chaque manche, l'animateur affiche la règle, la carte undercover et pourquoi elle l'enfreint. C'est le moment d'échanger sur les pratiques réelles des équipes.</p>
      <p><button class="btn" id="back">Retour</button></p>
    </section>`;
  document.getElementById("back").onclick = () => (history.length > 1 ? history.back() : go("#/"));
}

function viewCards() {
  app.innerHTML = `
    <section>
      <h1>Toutes les cartes</h1>
      ${RULES.map(
        (r) => `
        <h2 class="rule-title">Règle d'or ${r.id} · ${esc(r.theme)}</h2>
        <div class="grid">
          ${backImg(r, "back back--grid")}
          ${r.civilians.map((t) => cardHtml({ ruleId: r.id, text: t })).join("")}
          ${cardHtml({ ruleId: r.id, text: r.undercover, kind: "undercover" })}
        </div>
        <p class="why"><strong>Pourquoi l'undercover enfreint la règle :</strong> ${esc(r.why)}</p>`
      ).join("")}
      <p><a class="btn" href="#/">Retour</a></p>
    </section>`;
}

function viewHostSetup() {
  const prefs = {
    players: 6,
    undercovers: 1,
    rules: RULES.map((r) => r.id),
    ordered: false,
    rounds: 5,
    names: {},
    ...store.get("hostPrefs", {}),
  };
  app.innerHTML = `
    <section>
      <h1>Nouvelle partie</h1>
      <form id="setup" class="form">
        <fieldset>
          <legend>Joueurs</legend>
          <div class="stepper" data-target="players">
            <button type="button" data-step="-1" aria-label="Un joueur de moins">−</button>
            <input id="players" name="players" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${prefs.players}" aria-label="Nombre de joueurs">
            <button type="button" data-step="1" aria-label="Un joueur de plus">+</button>
          </div>
          <p class="hint">Saisissez les prénoms dans l'ordre du cercle : chaque joueur retrouvera le sien en scannant le QR code.</p>
          <ol class="name-list" id="name-list"></ol>
        </fieldset>

        <fieldset>
          <legend>Manches</legend>
          <div class="stepper" data-target="rounds">
            <button type="button" data-step="-1" aria-label="Une manche de moins">−</button>
            <input id="rounds" name="rounds" type="number" inputmode="numeric" min="1" max="${MAX_ROUNDS}" value="${prefs.rounds}" aria-label="Nombre de manches">
            <button type="button" data-step="1" aria-label="Une manche de plus">+</button>
          </div>
          <p class="hint">À la fin de la dernière manche, l'application affiche le classement et les points.</p>
        </fieldset>

        <fieldset>
          <legend>Règles d'or jouées</legend>
          <div class="rule-picks">
            ${RULES.map(
              (r) => `
              <label class="check rule-pick">
                <input type="checkbox" name="rules" value="${r.id}" ${prefs.rules.includes(r.id) ? "checked" : ""}>
                ${backImg(r, "back back--thumb")}
                <span><strong>Règle d'or ${r.id}</strong><br>${esc(r.theme)}</span>
              </label>`
            ).join("")}
          </div>
          <div class="inline-actions">
            <button type="button" class="btn btn--small" data-rules="all">Toutes</button>
            <button type="button" class="btn btn--small" data-rules="none">Aucune</button>
          </div>
          <label class="radio"><input type="radio" name="ordered" value="0" ${!prefs.ordered ? "checked" : ""}> Ordre aléatoire</label>
          <label class="radio"><input type="radio" name="ordered" value="1" ${prefs.ordered ? "checked" : ""}> Dans l'ordre des règles (une règle par manche)</label>
        </fieldset>

        <fieldset>
          <legend>Undercovers</legend>
          <label class="radio"><input type="radio" name="undercovers" value="1" ${prefs.undercovers === 1 ? "checked" : ""}> 1 undercover</label>
          <label class="radio"><input type="radio" name="undercovers" value="2" ${prefs.undercovers === 2 ? "checked" : ""}> 2 undercovers <small>(à partir de 7 joueurs)</small></label>
        </fieldset>

        <p class="error" id="setup-error" role="alert"></p>
        <button class="btn btn--primary" type="submit">Générer la partie</button>
      </form>
    </section>`;

  const form = document.getElementById("setup");
  const nameListEl = document.getElementById("name-list");
  const typedNames = { ...prefs.names };

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
  });
  form.elements.players.addEventListener("change", renderNames);
  renderNames();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      players: Number(form.elements.players.value),
      undercovers: Number(form.elements.undercovers.value),
      rules: [...form.querySelectorAll('input[name="rules"]:checked')].map((c) => Number(c.value)),
      ordered: form.elements.ordered.value === "1",
      rounds: Number(form.elements.rounds.value),
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
  const result = state.finished || outcome(deal, state.eliminated);
  const lastRound = state.round >= game.rounds;
  const url = joinUrl(code, 0, state.names, game.players);
  const rulesSummary =
    game.rules.length === RULES.length ? "toutes les règles" : `règle${game.rules.length > 1 ? "s" : ""} ${game.rules.join(", ")}`;

  app.innerHTML = `
    <section class="host">
      <div class="share">
        <div class="qr">${qrSvg(url)}</div>
        <div>
          <p class="label">Code de la partie</p>
          <p class="code">${esc(prettyCode(code))}</p>
          <p class="small">${game.players} joueurs · ${game.undercovers} undercover${game.undercovers > 1 ? "s" : ""} · ${game.rounds} manche${game.rounds > 1 ? "s" : ""} · ${rulesSummary}</p>
          <button class="btn btn--small" id="copy">Copier le lien</button>
          <button class="btn btn--small" id="seat-qrs">QR par joueur</button>
        </div>
      </div>

      <div class="round-bar">
        ${backImg(deal.rule, "back back--round", false)}
        <div>
          <h1>Manche ${state.round} <span class="of">/ ${game.rounds}</span></h1>
          ${ruleTag(deal.rule)}
          <p>Les joueurs doivent afficher la <strong>manche ${state.round}</strong> sur leur téléphone.</p>
        </div>
      </div>

      ${result ? "" : timerHtml()}

      ${
        result
          ? `<div class="banner banner--${result === "civilians" ? "win" : "lose"}">${esc(resultText(result))}</div>`
          : `<p class="starter">🎙️ <strong>${esc(playerName(state, deal.starter))}</strong> commence le tour de parole.</p>`
      }

      <ul class="players">
        ${deal.roles
          .map((r) => {
            const out = state.eliminated.includes(r.seat);
            const revealed = out || result;
            return `
            <li class="${out ? "out" : ""}">
              <span class="seat">${r.seat}</span>
              <input class="name" id="host-name-${r.seat}" data-seat="${r.seat}" maxlength="${MAX_NAME_LENGTH}" value="${esc(state.names[r.seat] || "")}" placeholder="Joueur ${r.seat}" aria-label="Prénom du joueur ${r.seat}">
              <span class="score">${state.scores[r.seat] || 0} pt${(state.scores[r.seat] || 0) > 1 ? "s" : ""}</span>
              ${
                revealed
                  ? `<span class="role role--${r.role}">${ROLE_LABELS[r.role]}</span>`
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
            ? `<a class="btn ${result ? "btn--primary" : ""}" href="#/end/${code}" id="finish">Voir les résultats</a>`
            : `<button class="btn ${result ? "btn--primary" : ""}" id="next">Manche suivante</button>`
        }
        <a class="btn" href="#/pass/${code}">Distribuer sur ce téléphone</a>
        ${!result ? `<button class="btn btn--ghost" id="debrief">Révéler et débriefer</button>` : ""}
      </div>
      <div class="actions actions--secondary">
        ${!lastRound ? `<button class="btn btn--ghost" id="end-now">Terminer la partie maintenant</button>` : ""}
        <button class="btn btn--ghost btn--ghost-danger" id="forget">Supprimer la partie</button>
      </div>
    </section>`;

  document.getElementById("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      document.getElementById("copy").textContent = "Lien copié ✓";
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
      app.querySelector(".share .qr").innerHTML = qrSvg(joinUrl(code, 0, s.names, game.players));
    })
  );

  app.querySelectorAll("[data-eliminate]").forEach((btn) =>
    btn.addEventListener("click", () => eliminate(code, deal, Number(btn.dataset.eliminate)))
  );

  // Une manche interrompue sans vainqueur est marquée « révélée » (sans points).
  const closeRound = (s, mark) => {
    if (!s.results[s.round]) s.results[s.round] = mark;
    if (!s.finished) s.finished = "revealed";
  };

  document.getElementById("debrief").onclick = () => {
    const s = hostState(code);
    if (s.finished || outcome(deal, s.eliminated)) return go(`#/debrief/${code}`);
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

function resultText(result) {
  switch (result) {
    case "civilians":
      return "🎉 Les civils ont démasqué l'undercover !";
    case "impostors":
      return "🕵️ L'undercover l'emporte : il ne reste qu'un civil.";
    default:
      return "Rôles révélés.";
  }
}

function eliminate(code, deal, seat) {
  const state = hostState(code);
  const player = deal.roles[seat - 1];
  const name = playerName(state, seat);

  openModal(`
    <h2>Éliminer ${esc(name)} ?</h2>
    <p>Son rôle sera révélé à tout le groupe.</p>
    <div class="actions">
      <button class="btn btn--danger" id="do-eliminate">Éliminer</button>
      <button class="btn" data-close>Annuler</button>
    </div>`);

  document.getElementById("do-eliminate").onclick = () => {
    state.eliminated.push(seat);
    const result = outcome(deal, state.eliminated);
    if (result) {
      state.finished = result;
      state.results[state.round] = RESULT_CODES[result];
      for (const [s, pts] of Object.entries(roundPoints(deal, result, state.eliminated))) {
        state.scores[s] = (state.scores[s] || 0) + pts;
      }
    }
    saveHostState(code, state);
    render();
    openModal(`
      <p class="label">${esc(name)} était…</p>
      <p class="role-reveal role--${player.role}">${ROLE_LABELS[player.role]}</p>
      ${result ? `<p class="banner banner--${result === "civilians" ? "win" : "lose"}">${esc(resultText(result))}</p>` : `<p>La manche continue : nouveau tour de parole !</p>`}
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
      <div class="qr qr--big">${qrSvg(joinUrl(code, seat, state.names, game.players), 8)}</div>
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
  const distributed = rule.civilians.filter((t) => holders(t));

  app.innerHTML = `
    <section>
      <div class="debrief-head">
        ${backImg(rule, "back back--round", false)}
        <div>
          <p class="label">Manche ${state.round} / ${game.rounds} · débrief</p>
          <h1>Règle d'or ${rule.id} · ${esc(rule.theme)}</h1>
        </div>
      </div>

      <h2>La carte undercover</h2>
      ${cardHtml({ ruleId: rule.id, text: rule.undercover, kind: "undercover", label: holders(rule.undercover) })}
      <p class="why"><strong>Pourquoi elle enfreint la règle :</strong> ${esc(rule.why)}</p>

      <h2>Les cartes des civils</h2>
      <div class="grid">
        ${distributed.map((t) => cardHtml({ ruleId: rule.id, text: t, label: holders(t) })).join("")}
      </div>

      <h2>Questions pour la discussion</h2>
      <ul class="questions">
        <li>Quel indice vous a mis sur la piste de l'undercover ?</li>
        <li>Avez-vous déjà rencontré la situation de la carte undercover dans votre activité ?</li>
        <li>Comment la transformer pour qu'elle respecte la règle ${rule.id} ?</li>
        <li>Laquelle des bonnes pratiques est la plus facile / difficile à appliquer chez vous ?</li>
      </ul>

      <div class="actions">
        <a class="btn btn--primary" href="#/host/${code}">Retour à la partie</a>
      </div>
    </section>`;
}

// Classement et récapitulatif des manches, partagés par l'écran animateur et les téléphones.
function resultsHtml(game, names, scores, results, mySeat) {
  const label = (seat) => names[seat] || `Joueur ${seat}`;
  const ranking = Array.from({ length: game.players }, (_, i) => i + 1).sort((a, b) => (scores[b] || 0) - (scores[a] || 0) || a - b);
  // Rang partagé en cas d'égalité (1, 2, 2, 4…).
  const rankOf = (seat) => 1 + ranking.filter((s) => (scores[s] || 0) > (scores[seat] || 0)).length;
  const medals = ["🥇", "🥈", "🥉"];
  const podium = ranking.slice(0, Math.min(3, ranking.length));
  const rounds = Object.keys(results).map(Number).sort((a, b) => a - b);

  return `
    <ol class="podium" aria-label="Podium">
      ${podium
        .map(
          (seat) => `
          <li class="podium-step podium-step--${rankOf(seat)} ${seat === mySeat ? "is-me" : ""}">
            <span class="medal" aria-hidden="true">${medals[rankOf(seat) - 1] || ""}</span>
            <strong>${esc(label(seat))}</strong>
            <span>${scores[seat] || 0} pts</span>
          </li>`
        )
        .join("")}
    </ol>

    <h2 class="section-title">Classement</h2>
    <ol class="ranking">
      ${ranking
        .map(
          (seat) => `
          <li class="${seat === mySeat ? "is-me" : ""}">
            <span class="rank">${rankOf(seat)}</span>
            <span class="who">${esc(label(seat))}${seat === mySeat ? " <small>(toi)</small>" : ""}</span>
            <span class="pts">${scores[seat] || 0} pts</span>
          </li>`
        )
        .join("")}
    </ol>

    ${
      rounds.length
        ? `<h2 class="section-title">Les manches</h2>
          <ol class="recap">
            ${rounds
              .map((round) => {
                const deal = dealRound(game, round);
                const undercovers = deal.roles.filter((r) => r.role === "undercover").map((r) => label(r.seat));
                const res = results[round];
                return `
                <li>
                  ${backImg(deal.rule, "back back--thumb")}
                  <div>
                    <p class="recap-title">Manche ${round} · ${esc(deal.rule.theme)}</p>
                    <p class="small">Undercover : <strong>${esc(undercovers.join(", "))}</strong></p>
                  </div>
                  <span class="result result--${res}">${RESULT_LABELS[res] || ""}</span>
                </li>`;
              })
              .join("")}
          </ol>`
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
      ${resultsHtml(game, state.names, state.scores, results, null)}

      <div class="share share--results">
        <div class="qr">${qrSvg(shareUrl)}</div>
        <div>
          <p class="label">Résultats sur les téléphones</p>
          <p>Les joueurs scannent ce QR code pour retrouver le classement et le récapitulatif des manches.</p>
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
      e.target.textContent = "Lien copié ✓";
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
      ${resultsHtml(game, data.names, data.scores, data.results, mySeat)}
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
          ? "Touche ton prénom. Deux joueurs ne doivent pas choisir le même."
          : "Les numéros suivent l'ordre du cercle, à partir de l'animateur. Deux joueurs ne doivent pas choisir le même numéro."
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
        <span>${myName ? `<strong>${esc(myName)}</strong> <small class="small">joueur ${seat}</small>` : `Joueur <strong>${seat}</strong>`}</span>
        <span class="small">${esc(prettyCode(game.code))}</span>
      </div>
      <div class="round-switch">
        <button class="btn btn--small" id="prev" ${round <= 1 ? "disabled" : ""} aria-label="Manche précédente">←</button>
        <strong>Manche ${round} <span class="of">/ ${game.rounds}</span></strong>
        ${
          last
            ? `<a class="btn btn--small btn--primary" href="#/over/${game.code}/${seat}">Fin de partie →</a>`
            : `<button class="btn btn--small" id="next">Manche suivante →</button>`
        }
      </div>

      ${secretHtml(deal.rule, cardHtml({ ruleId: deal.rule.id, text: me.card, theme: deal.rule.theme }))}

      <p class="hint">À ton tour, évoque ta carte en <strong>un mot ou une phrase courte</strong>, sans la lire. Attention : tu es peut-être l'undercover sans le savoir !</p>
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

// Fin de partie côté joueur : ses rôles manche par manche, en attendant les résultats de l'animateur.
function viewOver(code, seat) {
  const game = decodeCode(code);
  if (!game || !(seat >= 1 && seat <= game.players)) return viewInvalid(code);
  const myName = knownNames(game.code)[seat];

  app.innerHTML = `
    <section class="end">
      <h1 class="center-text">Partie terminée${myName ? `, ${esc(myName)}` : ""} !</h1>
      <p class="center-text">Scanne le <strong>QR code des résultats</strong> affiché par l'animateur pour voir le classement et les points.</p>

      <h2 class="section-title">Tes cartes</h2>
      <ol class="recap">
        ${Array.from({ length: game.rounds }, (_, i) => {
          const deal = dealRound(game, i + 1);
          const role = deal.roles[seat - 1].role;
          return `
          <li>
            ${backImg(deal.rule, "back back--thumb")}
            <div>
              <p class="recap-title">Manche ${i + 1} · ${esc(deal.rule.theme)}</p>
            </div>
            <span class="role role--${role}">${ROLE_LABELS[role]}</span>
          </li>`;
        }).join("")}
      </ol>

      <div class="actions">
        <a class="btn" href="#/play/${game.code}/${seat}">Revoir mes cartes</a>
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
      return;
    }
    const me = deal.roles[seat - 1];
    app.innerHTML = `
      <section class="center pass">
        <p class="label">Manche ${state.round} / ${game.rounds} · distribution</p>
        <h1>${esc(playerName(state, seat))}</h1>
        <p>Prends le téléphone, puis maintiens le doigt sur la carte pour la retourner.</p>
        ${secretHtml(deal.rule, cardHtml({ ruleId: deal.rule.id, text: me.card, theme: deal.rule.theme }))}
        <button class="btn btn--primary" id="next-seat">J'ai vu ma carte → joueur suivant</button>
      </section>`;
    bindSecret();
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

function render() {
  closeModal();
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
    default:
      viewHome();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
