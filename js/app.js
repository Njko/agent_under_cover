import { RULES } from "./cards.js";
import {
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

// Format court « #join-CODE-3 » : uniquement lettres, chiffres et tirets, accepté partout.
function joinUrl(code, seat) {
  return `${baseUrl()}#join-${code}${seat ? `-${seat}` : ""}`;
}

function qrSvg(text, cell = 6) {
  if (typeof window.qrcode !== "function") return "";
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

function prettyCode(code) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
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

function cardHtml({ ruleId, text, kind = "civilian", label }) {
  return `
    <article class="card card--rule${ruleId} ${kind === "undercover" ? "card--undercover" : ""}">
      <header class="card-head"><span>RÈGLE ${ruleId}</span><i></i></header>
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
        <li>L'animateur crée une partie et affiche le <strong>QR code</strong> (ou le code à 6 caractères).</li>
        <li>Les joueurs se placent en cercle et se numérotent dans le sens des aiguilles d'une montre.</li>
        <li>Chacun scanne le QR code et choisit <strong>son numéro</strong>. Sa carte secrète s'affiche.</li>
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
        <li><strong>Débat</strong> : quelle est la règle commune ? Qui semble décalé ?</li>
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
  const prefs = store.get("hostPrefs", { players: 6, undercovers: 1, mrWhite: false });
  app.innerHTML = `
    <section>
      <h1>Nouvelle partie</h1>
      <form id="setup" class="form">
        <label>Nombre de joueurs
          <div class="stepper">
            <button type="button" data-step="-1" aria-label="Moins">−</button>
            <input name="players" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${prefs.players}">
            <button type="button" data-step="1" aria-label="Plus">+</button>
          </div>
        </label>
        <fieldset>
          <legend>Undercovers</legend>
          <label class="radio"><input type="radio" name="undercovers" value="1" ${prefs.undercovers === 1 ? "checked" : ""}> 1</label>
          <label class="radio"><input type="radio" name="undercovers" value="2" ${prefs.undercovers === 2 ? "checked" : ""}> 2 <small>(à partir de 7 joueurs)</small></label>
        </fieldset>
        <label class="check"><input type="checkbox" name="mrWhite" ${prefs.mrWhite ? "checked" : ""}> Ajouter un Mr White <small>(sans carte)</small></label>
        <p class="error" id="setup-error" role="alert"></p>
        <button class="btn btn--primary" type="submit">Générer la partie</button>
      </form>
    </section>`;

  const form = document.getElementById("setup");
  form.addEventListener("click", (e) => {
    const step = e.target.closest("[data-step]");
    if (!step) return;
    const input = form.elements.players;
    input.value = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(input.value) + Number(step.dataset.step)));
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      players: Number(form.elements.players.value),
      undercovers: Number(form.elements.undercovers.value),
      mrWhite: form.elements.mrWhite.checked,
    };
    const error = validateSettings(settings);
    if (error) {
      document.getElementById("setup-error").textContent = error;
      return;
    }
    store.set("hostPrefs", settings);
    const code = newCode(settings, () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
    saveHostState(code, hostState(code));
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
  const url = joinUrl(code);

  app.innerHTML = `
    <section class="host">
      <div class="share">
        <div class="qr">${qrSvg(url)}</div>
        <div>
          <p class="label">Code de la partie</p>
          <p class="code">${esc(prettyCode(code))}</p>
          <p class="small">${game.players} joueurs · ${game.undercovers} undercover${game.undercovers > 1 ? "s" : ""}${game.mrWhite ? " · Mr White" : ""}</p>
          <button class="btn btn--small" id="copy">Copier le lien</button>
          <button class="btn btn--small" id="seat-qrs">QR par joueur</button>
        </div>
      </div>

      <div class="round-bar">
        <h1>Manche ${state.round}</h1>
        <p>Les joueurs doivent afficher la <strong>manche ${state.round}</strong> sur leur téléphone.</p>
      </div>

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
              <input class="name" data-seat="${r.seat}" value="${esc(state.names[r.seat] || "")}" placeholder="Joueur ${r.seat}" aria-label="Nom du joueur ${r.seat}">
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
  document.getElementById("seat-qrs").onclick = () => showSeatQrs(code, game, state);

  app.querySelectorAll("input.name").forEach((input) =>
    input.addEventListener("change", () => {
      const s = hostState(code);
      s.names[input.dataset.seat] = input.value.trim();
      saveHostState(code, s);
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
      <div class="qr qr--big">${qrSvg(joinUrl(code, seat), 8)}</div>
      <p class="small">Scanne ce QR code : tu seras directement le joueur ${seat}.</p>
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

function viewJoin(prefill, seatPrefill) {
  const game = prefill ? decodeCode(prefill) : null;
  if (game && seatPrefill && seatPrefill >= 1 && seatPrefill <= game.players) {
    return go(`#/play/${game.code}/${seatPrefill}`);
  }
  app.innerHTML = `
    <section>
      <h1>Rejoindre une partie</h1>
      <form id="join" class="form">
        <label>Code de la partie
          <input name="code" class="code-input" autocomplete="off" autocapitalize="characters" maxlength="8" placeholder="ABC 123" value="${esc(game ? prettyCode(game.code) : prefill || "")}">
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
      if (raw.replace(/\s/g, "").length >= 6) errorEl.textContent = "Code invalide. Vérifiez auprès de l'animateur.";
      return;
    }
    seatsEl.innerHTML = `
      <p class="label">Quel est ton numéro de joueur ?</p>
      <div class="seat-grid">
        ${Array.from({ length: g.players }, (_, i) => `<a class="seat-btn" href="#/play/${g.code}/${i + 1}">${i + 1}</a>`).join("")}
      </div>
      <p class="hint">Les numéros suivent l'ordre du cercle, à partir de l'animateur. Deux joueurs ne doivent pas choisir le même numéro.</p>`;
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

  app.innerHTML = `
    <section class="play">
      <div class="play-head">
        <span>Joueur <strong>${seat}</strong></span>
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
          ${me.role === "mrwhite" ? mrWhiteCardHtml() : cardHtml({ ruleId: deal.rule.id, text: me.card })}
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
            ${me.role === "mrwhite" ? mrWhiteCardHtml() : cardHtml({ ruleId: deal.rule.id, text: me.card })}
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
  const hash = location.hash.replace(/^#/, "");
  const short = hash.match(/^join-([A-Za-z0-9]+)(?:-(\d+))?$/);
  const [, route = "", a, b] = short ? ["", "join", short[1], short[2]] : hash.split("/");
  switch (route) {
    case "host":
      a ? viewHost(a) : viewHostSetup();
      break;
    case "debrief":
      viewDebrief(a);
      break;
    case "join":
      viewJoin(a, Number(b));
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
