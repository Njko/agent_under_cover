// Moteur du jeu, 100 % déterministe.
//
// Il n'y a pas de serveur : l'hôte génère un « code de partie » qui contient une graine
// aléatoire et les paramètres. Chaque téléphone recalcule localement la même distribution
// à partir de (code, numéro de manche, numéro de joueur). Tous les appareils obtiennent donc
// exactement le même résultat sans jamais communiquer entre eux.

import { RULES } from "./cards.js";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 symboles, sans 0/O/1/I
export const CODE_LENGTH = 8; // 8 × 5 bits = 40 bits
export const MAX_ROUNDS = 16;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 18;
export const MIN_COMPET_PLAYERS = 4;

// --- Aléatoire reproductible ------------------------------------------------------------

function hash32(...values) {
  let h = 0x811c9dc5;
  for (const v of values) {
    h ^= v >>> 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rand) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Code de partie -----------------------------------------------------------------------
// Bits : graine (15) | jeu de cartes (1) | mode (1) | joueurs-3 (4) | undercovers-1 (1)
//        | règles jouées (7) | ordre des règles (1) | manches-1 (4) | contrôle (6)
// Les valeurs dépassent 32 bits : on calcule avec des multiplications plutôt qu'avec << et |.

export const MODES = ["coop", "compet"]; // coopératif (par défaut) ou compétitif
// Jeu de cartes : "base" (cartes validées) ou "ext" (jeu de base + extension à valider).
export const DECK_CHOICES = ["base", "ext"];

const FIELDS = [
  ["seed", 15],
  ["deck", 1],
  ["mode", 1],
  ["players", 4],
  ["undercovers", 1],
  ["rulesMask", 7],
  ["ordered", 1],
  ["rounds", 4],
];
const CHECK_BITS = 6;

function checksum(payload) {
  // Le sel change avec le format du code : les codes de l'ancien format sont refusés.
  return hash32(payload % 2 ** 32, Math.floor(payload / 2 ** 32), 0xc0de7) % 2 ** CHECK_BITS;
}

export function validateSettings({ players, undercovers, rules = [1], rounds = 1, mode = "coop" }) {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    return `Le nombre de joueurs doit être compris entre ${MIN_PLAYERS} et ${MAX_PLAYERS}.`;
  }
  if (undercovers !== 1 && undercovers !== 2) {
    return "Il faut 1 ou 2 undercovers.";
  }
  if (players - undercovers < 2) {
    return "Il faut au moins 2 civils : ajoutez des joueurs ou retirez un undercover.";
  }
  if (mode === "compet" && players < MIN_COMPET_PLAYERS) {
    return `En compétitif, il faut au moins ${MIN_COMPET_PLAYERS} joueurs : à 3, un seul civil éliminé à tort fait perdre la manche. Choisissez le mode coopératif.`;
  }
  if (!rules.length) {
    return "Choisissez au moins une règle d'or.";
  }
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) {
    return `Le nombre de manches doit être compris entre 1 et ${MAX_ROUNDS}.`;
  }
  return null;
}

export function encodeCode({ seed, players, undercovers, rules, ordered = false, rounds = 7, mode = "coop", deck = "base" }) {
  rules = rules ?? RULES.map((r) => r.id);
  const error = validateSettings({ players, undercovers, rules, rounds, mode });
  if (error) throw new Error(error);
  const values = {
    seed: seed % 2 ** 15,
    deck: Math.max(0, DECK_CHOICES.indexOf(deck)),
    mode: Math.max(0, MODES.indexOf(mode)),
    players: players - MIN_PLAYERS,
    undercovers: undercovers - 1,
    rulesMask: rules.reduce((mask, id) => mask | (1 << (id - 1)), 0),
    ordered: ordered ? 1 : 0,
    rounds: rounds - 1,
  };
  const payload = FIELDS.reduce((acc, [name, bits]) => acc * 2 ** bits + values[name], 0);
  let value = payload * 2 ** CHECK_BITS + checksum(payload);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = ALPHABET[value % 32] + code;
    value = Math.floor(value / 32);
  }
  return code;
}

export function normalizeCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

export function decodeCode(raw) {
  const code = normalizeCode(raw);
  if (code.length !== CODE_LENGTH) return null;
  let value = 0;
  for (const ch of code) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    value = value * 32 + idx;
  }
  let payload = Math.floor(value / 2 ** CHECK_BITS);
  if (checksum(payload) !== value % 2 ** CHECK_BITS) return null;
  const v = {};
  for (const [name, bits] of [...FIELDS].reverse()) {
    v[name] = payload % 2 ** bits;
    payload = Math.floor(payload / 2 ** bits);
  }
  const settings = {
    seed: v.seed,
    players: v.players + MIN_PLAYERS,
    undercovers: v.undercovers + 1,
    rules: RULES.map((r) => r.id).filter((id) => v.rulesMask & (1 << (id - 1))),
    ordered: v.ordered === 1,
    rounds: v.rounds + 1,
    mode: MODES[v.mode],
    deck: DECK_CHOICES[v.deck],
  };
  if (validateSettings(settings)) return null;
  return { code, ...settings };
}

export function newCode(settings, random = Math.random) {
  const seed = Math.floor(random() * 2 ** 15);
  return encodeCode({ ...settings, seed });
}

// --- Distribution des cartes --------------------------------------------------------------

export function ruleForRound(game, round) {
  // Les règles choisies sont toutes jouées une fois (dans l'ordre ou au hasard) avant de recommencer.
  const rules = RULES.filter((r) => game.rules.includes(r.id));
  if (game.ordered) return rules[(round - 1) % rules.length];
  const cycle = Math.floor((round - 1) / rules.length);
  const order = shuffle(rules, mulberry32(hash32(game.seed, cycle, 0x52554c45)));
  return order[(round - 1) % rules.length];
}

// Tirage pondéré, sans remise : chaque joueur a un poids divisé par 4 à chaque fois qu'il a déjà
// eu le rôle. Un même joueur peut encore l'avoir deux fois de suite (personne ne peut en déduire
// son rôle), mais c'est rare : le rôle tourne au fil des manches.
const REPEAT_PENALTY = 4;

function weightedPick(candidates, counts, rand) {
  const weights = candidates.map((seat) => REPEAT_PENALTY ** -counts[seat]);
  let x = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    x -= weights[i];
    if (x < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** Cartes d'une règle pour le jeu choisi : jeu de base seul, ou jeu de base et extension. */
export function rulePool(rule, deck = "base") {
  const keep = (card) => deck === "ext" || card.deck === "base";
  return { civilians: rule.civilians.filter(keep), undercovers: rule.undercovers.filter(keep) };
}

// Mélange, puis place en tête les cartes les moins distribuées dans les manches précédentes.
function freshFirst(cards, usage, rand) {
  return shuffle(cards, rand).sort((a, b) => (usage.get(a.text) || 0) - (usage.get(b.text) || 0));
}

function dealOne(game, round, ucCounts, starterCounts, usage) {
  const { seed, players, undercovers } = game;
  const rand = mulberry32(hash32(seed, round, 0x6465616c));
  const rule = ruleForRound(game, round);

  // Ordre de départ aléatoire, puis undercovers tirés en tenant compte des manches précédentes.
  let seats = shuffle(
    Array.from({ length: players }, (_, i) => i + 1),
    rand
  );
  const impostors = [];
  for (let k = 0; k < undercovers; k++) {
    const seat = weightedPick(
      seats.filter((s) => !impostors.includes(s)),
      ucCounts,
      rand
    );
    impostors.push(seat);
  }
  seats = [...impostors, ...seats.filter((s) => !impostors.includes(s))];
  const pool = rulePool(rule, game.deck);
  const undercover = freshFirst(pool.undercovers, usage, rand)[0];
  const civilianCards = freshFirst(pool.civilians, usage, rand);

  const roles = new Array(players + 1);
  let civilianIndex = 0;
  seats.forEach((seat, i) => {
    if (i < undercovers) {
      roles[seat] = { seat, role: "undercover", card: undercover.text };
    } else {
      // S'il y a plus de civils que de cartes de la règle, les cartes sont réutilisées.
      const card = civilianCards[civilianIndex % civilianCards.length].text;
      civilianIndex++;
      roles[seat] = { seat, role: "civilian", card };
    }
  });

  // Le premier joueur tourne lui aussi : on évite d'exposer toujours la même personne.
  const starter = weightedPick(
    Array.from({ length: players }, (_, i) => i + 1),
    starterCounts,
    rand
  );

  return { round, rule, roles: roles.slice(1), starter, undercover };
}

/**
 * Calcule la manche complète : règle jouée, rôle et carte de chaque joueur, carte undercover
 * (avec son explication), premier joueur.
 * Les joueurs sont numérotés à partir de 1. Les manches précédentes sont recalculées pour
 * répartir le rôle d'undercover et la prise de parole.
 */
export function dealRound(game, round) {
  const ucCounts = new Array(game.players + 1).fill(0);
  const starterCounts = new Array(game.players + 1).fill(0);
  const usage = new Map(); // nombre de distributions de chaque carte (par texte)
  let deal;
  for (let r = 1; r <= round; r++) {
    deal = dealOne(game, r, ucCounts, starterCounts, usage);
    for (const role of deal.roles) if (role.role === "undercover") ucCounts[role.seat]++;
    for (const text of new Set(deal.roles.map((role) => role.card))) usage.set(text, (usage.get(text) || 0) + 1);
    starterCounts[deal.starter]++;
  }
  return deal;
}

// --- Mode coopératif ------------------------------------------------------------------------
// L'équipe désigne des suspects jusqu'à trouver l'undercover : 3 points au premier essai, 2 au
// deuxième, 1 au troisième, 0 ensuite.
export const COOP_MAX_POINTS = 3;

export function coopPoints(wrongGuesses) {
  return Math.max(0, COOP_MAX_POINTS - wrongGuesses);
}

/** Mode coopératif : la manche est gagnée quand tous les undercovers ont été désignés. */
export function coopFound(deal, designatedSeats) {
  return deal.roles.filter((r) => r.role === "undercover").every((r) => designatedSeats.includes(r.seat));
}

export function wrongGuesses(deal, designatedSeats) {
  return designatedSeats.filter((seat) => deal.roles[seat - 1].role !== "undercover").length;
}

// --- Mode compétitif -------------------------------------------------------------------------
export const POINTS = { civilian: 2, undercover: 10 };

/**
 * Points gagnés sur une manche terminée : 2 points par civil si les civils gagnent,
 * 10 points par undercover encore en jeu si les undercovers gagnent.
 */
export function roundPoints(deal, result, eliminatedSeats) {
  const points = {};
  for (const r of deal.roles) {
    const wins =
      (result === "civilians" && r.role === "civilian") ||
      (result === "impostors" && r.role === "undercover" && !eliminatedSeats.includes(r.seat));
    if (wins) points[r.seat] = POINTS[r.role];
  }
  return points;
}

/** Détermine si la manche est terminée à partir des joueurs encore en jeu. */
export function outcome(deal, eliminatedSeats) {
  const alive = deal.roles.filter((r) => !eliminatedSeats.includes(r.seat));
  const impostors = alive.filter((r) => r.role === "undercover").length;
  const civilians = alive.length - impostors;
  if (impostors === 0) return "civilians";
  if (civilians <= 1) return "impostors";
  return null;
}
