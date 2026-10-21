import { RULES } from "./cards.js";
import {
  CODE_LENGTH,
  MIN_PLAYERS,
  MAX_PLAYERS,
  decodeCode,
  dealRound,
  newCode,
  outcome,
  validateSettings,
} from "./game.js";

const app = document.getElementById("app");
const modal = document.getElementById("modal");

const ROLE_LABELS = { civilian: "Civil", undercover: "Undercover", mrwhite: "Mr White" };
const POINTS = { civilian: 2, undercover: 10, mrwhite: 6 };

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
};

// Une page peut imposer son adresse publique (ex. quand elle est intégrée dans une iframe).
function baseUrl() {
  return window.UNDERCOVER_SHARE_URL || location.href.split("#")[0];
}

// Les prénoms voyagent dans le lien (il n'y a pas de serveur pour les partager), encodés en
// base64url pour rester dans le format court « #join-CODE-3~xxxx » : lettres, chiffres, - _ ~.
const MAX_NAME_LENGTH = 20;

function cleanName(name) {
  return String(name || "").replace(/[|\n]/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function encodeNames(names, players) {
  const list = Array.from({ length: players }, (_, i) => cleanName(names[i + 1]));
  if (!list.some(Boolean)) return "";
  const bytes = new TextEncoder().encode(list.join("|"));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeNames(token) {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const names = {};
    new TextDecoder().decode(bytes).split("|").forEach((n, i) => {
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

function confirmModal(message, okLabel, onConfirm) {
  openModal(`
    <p>${esc(message)}</p>
    <div class="actions">
      <button class="btn btn--primary" id="confirm-ok">${esc(okLabel)}</button>
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

function mrWhiteCardHtml() {
  return `
    <article class="card card--white">
      <header class="card-head"><span>MR WHITE</span><i></i></header>
      <p class="card-text">Tu n'as pas de carte.<br><br>Écoute les autres, devine la règle dont ils parlent et fonds-toi dans la masse.</p>
    </article>`;
}

// --- État de l'hôte (persisté par code de partie) -------------------------------------------

function hostState(code) {
  return store.get(`host:${code}`, { round: 1, eliminated: [], names: {}, scores: {}, finished: null });
}

function saveHostState(code, state) {
  store.set(`host:${code}`, state);
  store.set("lastHost", code);
}

function playerName(state, seat) {
  return state.names[seat] || `Joueur ${seat}`;
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
  app.innerHTML = `
    <section class="hero">
      <h1>Qui enfreint la règle ?</h1>
      <p>Chaque joueur reçoit une pratique liée à une même règle d'IA responsable.
      Un <strong>undercover</strong> a reçu une pratique qui l'enfreint. Démasquez-le !</p>
    </section>
    <div class="actions">
      <a class="btn btn--primary" href="#/host">Créer une partie <small>animateur</small></a>
      <a class="btn" href="#/join">Rejoindre une partie <small>joueur</small></a>
    </div>
    ${
      lastHost || lastPlayer
        ? `<div class="resume">
            ${lastHost ? `<a href="#/host/${lastHost}">Reprendre l'animation ${esc(prettyCode(lastHost))}</a>` : ""}
            ${lastPlayer ? `<a href="#/play/${lastPlayer.code}/${lastPlayer.seat}">Revoir ma carte (${esc(prettyCode(lastPlayer.code))}, joueur ${lastPlayer.seat})</a>` : ""}
          </div>`
        : ""
    }
    <div class="links">
      <a href="#/rules">Comment jouer ?</a>
      <a href="#/cards">Toutes les cartes</a>
    </div>`;
}

function viewRules() {
  app.innerHTML = `
    <section class="prose">
      <h1>Comment jouer ?</h1>
      <h2>Mise en place</h2>
      <ol>
        <li>L'animateur crée une partie : prénoms des joueurs, règles d'or à jouer, rôles.</li>
        <li>Il affiche le <strong>QR code</strong> (ou le code de la partie).</li>
        <li>Chacun scanne le QR code et touche <strong>son prénom</strong>. Sa carte secrète s'affiche.</li>
      </ol>
      <p class="hint">Aucune connexion entre téléphones n'est nécessaire : chaque téléphone calcule sa propre carte à partir du code.
      Pas assez de téléphones ? Utilisez le mode « passer le téléphone ».</p>
      <h2>Les rôles</h2>
      <ul>
        <li><strong>Civils</strong> : ils ont tous une bonne pratique liée à la même règle.</li>
        <li><strong>Undercover</strong> : sa carte parle du même sujet mais <em>enfreint</em> la règle. Il ne sait pas forcément qu'il est l'undercover !</li>
        <li><strong>Mr White</strong> (option) : il n'a aucune carte et doit bluffer.</li>
      </ul>
      <h2>Déroulement d'une manche</h2>
      <ol>
        <li><strong>Tour de parole</strong> : à partir du joueur désigné, chacun donne <em>un mot ou une phrase courte</em> qui évoque sa carte, sans la lire.</li>
        <li><strong>Débat</strong> chronométré (30 secondes par défaut) : quelle est la règle commune ? Qui semble décalé ?</li>
        <li><strong>Vote</strong> : on élimine un joueur à main levée. L'animateur le marque comme éliminé et son rôle est révélé.</li>
        <li>On recommence jusqu'à la victoire d'un camp.</li>
      </ol>
      <h2>Fin de manche</h2>
      <ul>
        <li>Les <strong>civils</strong> gagnent s'ils éliminent tous les undercovers et Mr White.</li>
        <li>Les <strong>imposteurs</strong> gagnent s'il ne reste plus qu'un civil.</li>
        <li><strong>Mr White</strong> éliminé peut deviner la règle : s'il trouve, il gagne seul.</li>
      </ul>
      <h2>Débrief</h2>
      <p>À la fin de chaque manche, l'animateur affiche la règle, la carte undercover et pourquoi elle l'enfreint. C'est le moment d'échanger sur les pratiques réelles des équipes.</p>
      <p><a class="btn" href="#/">Retour</a></p>
    </section>`;
}

function viewCards() {
  app.innerHTML = `
    <section>
      <h1>Toutes les cartes</h1>
      ${RULES.map(
        (r) => `
        <h2 class="rule-title">Règle ${r.id} · ${esc(r.theme)}</h2>
        <div class="grid">
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
    mrWhite: false,
    rules: RULES.map((r) => r.id),
    ordered: false,
    showTheme: true,
    names: {},
    ...store.get("hostPrefs", {}),
  };
  app.innerHTML = `
    <section>
      <h1>Nouvelle partie</h1>
      <form id="setup" class="form">
        <fieldset>
          <legend>Joueurs</legend>
          <div class="stepper">
            <button type="button" data-step="-1" aria-label="Moins">−</button>
            <input id="players" name="players" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${prefs.players}" aria-label="Nombre de joueurs">
            <button type="button" data-step="1" aria-label="Plus">+</button>
          </div>
          <p class="hint">Saisissez les prénoms dans l'ordre du cercle : chaque joueur retrouvera le sien en scannant le QR code.</p>
          <ol class="name-list" id="name-list"></ol>
        </fieldset>

        <fieldset>
          <legend>Règles d'or jouées</legend>
          <div class="rule-picks">
            ${RULES.map(
              (r) => `
              <label class="check rule-pick rule-pick--${r.id}">
                <input type="checkbox" name="rules" value="${r.id}" ${prefs.rules.includes(r.id) ? "checked" : ""}>
                <span><strong>Règle ${r.id}</strong> · ${esc(r.theme)}</span>
              </label>`
            ).join("")}
          </div>
          <div class="inline-actions">
            <button type="button" class="btn btn--small" data-rules="all">Toutes</button>
            <button type="button" class="btn btn--small" data-rules="none">Aucune</button>
          </div>
          <label class="radio"><input type="radio" name="ordered" value="0" ${!prefs.ordered ? "checked" : ""}> Ordre aléatoire</label>
          <label class="radio"><input type="radio" name="ordered" value="1" ${prefs.ordered ? "checked" : ""}> Dans l'ordre des règles (une règle par manche)</label>
          <label class="check"><input type="checkbox" name="showTheme" ${prefs.showTheme ? "checked" : ""}> <span>Annoncer la règle d'or de chaque manche <small>(affichée sur l'écran de l'animateur et sur les cartes)</small></span></label>
        </fieldset>

        <fieldset>
          <legend>Rôles</legend>
          <label class="radio"><input type="radio" name="undercovers" value="1" ${prefs.undercovers === 1 ? "checked" : ""}> 1 undercover</label>
          <label class="radio"><input type="radio" name="undercovers" value="2" ${prefs.undercovers === 2 ? "checked" : ""}> 2 undercovers <small>(à partir de 7 joueurs)</small></label>
          <label class="check"><input type="checkbox" name="mrWhite" ${prefs.mrWhite ? "checked" : ""}> <span>Ajouter un Mr White <small id="mrwhite-hint">(sans carte, doit deviner la règle)</small></span></label>
        </fieldset>

        <p class="error" id="setup-error" role="alert"></p>
        <button class="btn btn--primary" type="submit">Générer la partie</button>
      </form>
    </section>`;

  const form = document.getElementById("setup");
  const nameList = document.getElementById("name-list");
  const typedNames = { ...prefs.names };

  const renderNames = () => {
    const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(form.elements.players.value) || MIN_PLAYERS));
    nameList.innerHTML = Array.from(
      { length: count },
      (_, i) => `
        <li><input id="name-${i + 1}" class="name-input" data-seat="${i + 1}" maxlength="${MAX_NAME_LENGTH}" autocomplete="off"
          placeholder="Joueur ${i + 1}" value="${esc(typedNames[i + 1] || "")}" aria-label="Prénom du joueur ${i + 1}"></li>`
    ).join("");
  };
  nameList.addEventListener("input", (e) => {
    if (e.target.dataset.seat) typedNames[e.target.dataset.seat] = e.target.value;
  });

  // Mr White doit deviner la règle : il n'a pas de sens si la règle est annoncée.
  const syncMrWhite = () => {
    const announced = form.elements.showTheme.checked;
    form.elements.mrWhite.disabled = announced;
    if (announced) form.elements.mrWhite.checked = false;
    document.getElementById("mrwhite-hint").textContent = announced
      ? "(indisponible quand la règle est annoncée)"
      : "(sans carte, doit deviner la règle)";
  };
  form.elements.showTheme.addEventListener("change", syncMrWhite);
  syncMrWhite();

  form.addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (step) {
      const input = form.elements.players;
      input.value = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(input.value) + Number(step.dataset.step)));
      renderNames();
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
      mrWhite: form.elements.mrWhite.checked,
      rules: [...form.querySelectorAll('input[name="rules"]:checked')].map((c) => Number(c.value)),
      ordered: form.elements.ordered.value === "1",
      showTheme: form.elements.showTheme.checked,
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
          <p class="small">${game.players} joueurs · ${game.undercovers} undercover${game.undercovers > 1 ? "s" : ""}${game.mrWhite ? " · Mr White" : ""} · ${rulesSummary}</p>
          <button class="btn btn--small" id="copy">Copier le lien</button>
          <button class="btn btn--small" id="seat-qrs">QR par joueur</button>
        </div>
      </div>

      <div class="round-bar">
        <h1>Manche ${state.round}</h1>
        ${
          game.showTheme
            ? `<p class="round-theme round-theme--${deal.rule.id}"><span>Règle d'or ${deal.rule.id}</span> ${esc(deal.rule.theme)}</p>`
            : ""
        }
        <p>Les joueurs doivent afficher la <strong>manche ${state.round}</strong> sur leur téléphone.</p>
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
              ${state.scores[r.seat] ? `<span class="score">${state.scores[r.seat]} pts</span>` : ""}
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
        <button class="btn ${result ? "btn--primary" : ""}" id="next">Manche suivante</button>
        <a class="btn" href="#/pass/${code}">Distribuer sur ce téléphone</a>
        ${!result ? `<button class="btn btn--ghost" id="debrief">Révéler et débriefer</button>` : ""}
        <a class="btn btn--ghost" href="#/host">Nouvelle partie</a>
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

  document.getElementById("debrief").onclick = () => {
    const s = hostState(code);
    if (s.finished || outcome(deal, s.eliminated)) return go(`#/debrief/${code}`);
    confirmModal("La manche n'est pas terminée. Révéler tous les rôles ?", "Révéler", () => {
      s.finished = "revealed";
      saveHostState(code, s);
      go(`#/debrief/${code}`);
    });
  };

  const nextRound = () => {
    const s = hostState(code);
    s.round += 1;
    s.eliminated = [];
    s.finished = null;
    saveHostState(code, s);
    render();
    openModal(`
      <h2>Manche ${s.round}</h2>
      <p>Demandez à chaque joueur d'appuyer sur <strong>« Manche suivante »</strong> sur son téléphone pour découvrir sa nouvelle carte.</p>
      <button class="btn btn--primary" data-close>OK</button>`);
  };
  document.getElementById("next").onclick = () =>
    result ? nextRound() : confirmModal("La manche en cours n'est pas terminée. Passer à la suivante ?", "Passer", nextRound);
}

function resultText(result) {
  switch (result) {
    case "civilians":
      return "🎉 Les civils ont démasqué tous les imposteurs !";
    case "impostors":
      return "🕵️ Les imposteurs l'emportent : il ne reste qu'un civil.";
    case "mrwhite":
      return "🎩 Mr White a deviné la règle et gagne la manche !";
    default:
      return "Rôles révélés.";
  }
}

function awardPoints(state, deal, result) {
  const winners =
    result === "civilians"
      ? deal.roles.filter((r) => r.role === "civilian")
      : result === "mrwhite"
        ? deal.roles.filter((r) => r.role === "mrwhite")
        : result === "impostors"
          ? deal.roles.filter((r) => r.role !== "civilian" && !state.eliminated.includes(r.seat))
          : [];
  for (const r of winners) state.scores[r.seat] = (state.scores[r.seat] || 0) + POINTS[r.role];
}

function eliminate(code, deal, seat) {
  const state = hostState(code);
  const player = deal.roles[seat - 1];
  const name = playerName(state, seat);

  const confirmHtml = `
    <h2>Éliminer ${esc(name)} ?</h2>
    <p>Son rôle sera révélé à tout le groupe.</p>
    <div class="actions">
      <button class="btn btn--danger" id="do-eliminate">Éliminer</button>
      <button class="btn" data-close>Annuler</button>
    </div>`;
  openModal(confirmHtml);

  document.getElementById("do-eliminate").onclick = () => {
    state.eliminated.push(seat);
    const result = outcome(deal, state.eliminated);

    const finish = (final) => {
      if (final) {
        state.finished = final;
        awardPoints(state, deal, final);
      }
      saveHostState(code, state);
      render();
    };

    const roleHtml = `
      <p class="label">${esc(name)} était…</p>
      <p class="role-reveal role--${player.role}">${ROLE_LABELS[player.role]}</p>`;

    if (player.role === "mrwhite") {
      openModal(`
        ${roleHtml}
        <p>Mr White peut tenter de deviner la <strong>règle</strong> dont parlent les civils.</p>
        <p class="hint">Réponse : Règle ${deal.rule.id} · ${esc(deal.rule.theme)}</p>
        <div class="actions">
          <button class="btn btn--primary" id="mw-yes">Il a trouvé</button>
          <button class="btn" id="mw-no">Il s'est trompé</button>
        </div>`);
      document.getElementById("mw-yes").onclick = () => {
        closeModal();
        finish("mrwhite");
      };
      document.getElementById("mw-no").onclick = () => {
        closeModal();
        finish(result);
      };
      return;
    }

    finish(result);
    openModal(`
      ${roleHtml}
      ${result ? `<p class="banner banner--${result === "civilians" ? "win" : "lose"}">${esc(resultText(result))}</p>` : `<p>La partie continue : nouveau tour de parole !</p>`}
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
  const mrWhite = deal.roles.find((r) => r.role === "mrwhite");

  app.innerHTML = `
    <section>
      <p class="label">Manche ${state.round} · débrief</p>
      <h1>Règle ${rule.id} · ${esc(rule.theme)}</h1>

      <h2>La carte undercover</h2>
      ${cardHtml({ ruleId: rule.id, text: rule.undercover, kind: "undercover", label: holders(rule.undercover) })}
      <p class="why"><strong>Pourquoi elle enfreint la règle :</strong> ${esc(rule.why)}</p>

      <h2>Les cartes des civils</h2>
      <div class="grid">
        ${distributed.map((t) => cardHtml({ ruleId: rule.id, text: t, label: holders(t) })).join("")}
      </div>
      ${mrWhite ? `<p>🎩 Mr White : <strong>${esc(playerName(state, mrWhite.seat))}</strong></p>` : ""}

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
  const round = store.get(key, 1);
  store.set("lastPlayer", { code: game.code, seat });
  const deal = dealRound(game, round);
  const me = deal.roles[seat - 1];
  const myName = knownNames(game.code)[seat];
  const theme = game.showTheme ? deal.rule.theme : null;

  app.innerHTML = `
    <section class="play">
      <div class="play-head">
        <span>${myName ? `<strong>${esc(myName)}</strong> <small class="small">joueur ${seat}</small>` : `Joueur <strong>${seat}</strong>`}</span>
        <span class="small">${esc(prettyCode(game.code))}</span>
      </div>
      <div class="round-switch">
        <button class="btn btn--small" id="prev" ${round <= 1 ? "disabled" : ""} aria-label="Manche précédente">←</button>
        <strong>Manche ${round}</strong>
        <button class="btn btn--small" id="next" aria-label="Manche suivante">Manche suivante →</button>
      </div>

      <div class="secret" id="secret">
        <div class="secret-cover">
          <p>👆 Maintiens appuyé pour voir ta carte</p>
          <p class="small">Cache ton écran des autres joueurs.</p>
        </div>
        <div class="secret-content">
          ${me.role === "mrwhite" ? mrWhiteCardHtml() : cardHtml({ ruleId: deal.rule.id, text: me.card, theme })}
        </div>
      </div>

      <p class="hint">À ton tour, évoque ta carte en <strong>un mot ou une phrase courte</strong>, sans la lire. Attention : tu es peut-être l'undercover sans le savoir !</p>
    </section>`;

  const secret = document.getElementById("secret");
  const show = (e) => {
    e.preventDefault();
    secret.classList.add("revealed");
  };
  const hide = () => secret.classList.remove("revealed");
  secret.addEventListener("pointerdown", show);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => secret.addEventListener(ev, hide));
  secret.addEventListener("contextmenu", (e) => e.preventDefault());

  document.getElementById("prev").onclick = () => {
    store.set(key, Math.max(1, round - 1));
    render();
  };
  document.getElementById("next").onclick = () => {
    store.set(key, round + 1);
    render();
  };
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
        <p class="label">Manche ${state.round} · distribution</p>
        <h1>${esc(playerName(state, seat))}</h1>
        <p>Prends le téléphone, puis maintiens appuyé pour voir ta carte.</p>
        <div class="secret" id="secret">
          <div class="secret-cover"><p>👆 Maintiens appuyé</p></div>
          <div class="secret-content">
            ${me.role === "mrwhite" ? mrWhiteCardHtml() : cardHtml({ ruleId: deal.rule.id, text: me.card, theme: game.showTheme ? deal.rule.theme : null })}
          </div>
        </div>
        <button class="btn btn--primary" id="next-seat">J'ai vu ma carte → joueur suivant</button>
      </section>`;
    const secret = document.getElementById("secret");
    secret.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      secret.classList.add("revealed");
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      secret.addEventListener(ev, () => secret.classList.remove("revealed"))
    );
    secret.addEventListener("contextmenu", (e) => e.preventDefault());
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
      <p>Le code « ${esc(code || "")} » n'est pas valide.</p>
      <a class="btn btn--primary" href="#/join">Saisir un code</a>
    </section>`;
}

// --- Routeur --------------------------------------------------------------------------------

function render() {
  closeModal();
  clearInterval(timer.interval);
  const hash = location.hash.replace(/^#/, "");
  const short = hash.match(/^join-([A-Za-z0-9]+)(?:-(\d+))?(?:~([A-Za-z0-9_-]+))?$/);
  const [, route = "", a, b, c] = short ? ["", "join", short[1], short[2], short[3]] : hash.split("/");
  switch (route) {
    case "host":
      a ? viewHost(a) : viewHostSetup();
      break;
    case "debrief":
      viewDebrief(a);
      break;
    case "join":
      viewJoin(a, Number(b), c);
      break;
    case "play":
      viewPlay(a, Number(b));
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
