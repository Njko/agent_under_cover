// Moteur du jeu, 100 % déterministe.
//
// Il n'y a pas de serveur : l'hôte génère un « code de partie » qui contient une graine
// aléatoire et les paramètres. Chaque téléphone recalcule localement la même distribution
// à partir de (code, numéro de manche, numéro de joueur). Tous les appareils obtiennent donc
// exactement le même résultat sans jamais communiquer entre eux.

import { RULES } from "./cards.js";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 symboles, sans 0/O/1/I
export const CODE_LENGTH = 8; // 8 × 5 bits = 40 bits
const LEGACY_CODE_LENGTH = 6; // codes de la première version, toujours acceptés
const ALL_RULES_MASK = (1 << RULES.length) - 1;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 18;

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
// Bits : graine (20) | joueurs-3 (4) | undercovers-1 (1) | Mr White (1) | règles jouées (7)
//        | ordre des règles (1) | règle annoncée (1) | contrôle (5)
// Les valeurs dépassent 32 bits : on calcule avec des multiplications plutôt qu'avec << et |.

const FIELDS = [
  ["seed", 20],
  ["players", 4],
  ["undercovers", 1],
  ["mrWhite", 1],
  ["rulesMask", 7],
  ["ordered", 1],
  ["showTheme", 1],
];

function checksum(payload, bits) {
  return hash32(payload % 2 ** 32, Math.floor(payload / 2 ** 32), 0xa11ce) % 2 ** bits;
}

function toBase32(value, length) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code = ALPHABET[value % 32] + code;
    value = Math.floor(value / 32);
  }
  return code;
}

function fromBase32(code) {
  let value = 0;
  for (const ch of code) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    value = value * 32 + idx;
  }
  return value;
}

export function validateSettings({ players, undercovers, mrWhite, rules = [1], showTheme = false }) {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    return `Le nombre de joueurs doit être compris entre ${MIN_PLAYERS} et ${MAX_PLAYERS}.`;
  }
  if (undercovers !== 1 && undercovers !== 2) {
    return "Il faut 1 ou 2 undercovers.";
  }
  const civilians = players - undercovers - (mrWhite ? 1 : 0);
  if (civilians < 2) {
    return "Il faut au moins 2 civils : ajoutez des joueurs ou retirez un rôle spécial.";
  }
  if (!rules.length) {
    return "Choisissez au moins une règle d'or.";
  }
  if (mrWhite && showTheme) {
    return "Mr White doit deviner la règle d'or : il n'est pas compatible avec l'annonce de la règle.";
  }
  return null;
}

export function encodeCode({ seed, players, undercovers, mrWhite, rules, ordered = false, showTheme = false }) {
  rules = rules ?? RULES.map((r) => r.id);
  const error = validateSettings({ players, undercovers, mrWhite, rules, showTheme });
  if (error) throw new Error(error);
  const values = {
    seed: seed & 0xfffff,
    players: players - MIN_PLAYERS,
    undercovers: undercovers - 1,
    mrWhite: mrWhite ? 1 : 0,
    rulesMask: rules.reduce((mask, id) => mask | (1 << (id - 1)), 0),
    ordered: ordered ? 1 : 0,
    showTheme: showTheme ? 1 : 0,
  };
  const payload = FIELDS.reduce((acc, [name, bits]) => acc * 2 ** bits + values[name], 0);
  return toBase32(payload * 32 + checksum(payload, 5), CODE_LENGTH);
}

export function normalizeCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

function decodeLegacy(code) {
  const value = fromBase32(code);
  if (value === null) return null;
  const payload = Math.floor(value / 16);
  if ((hash32(payload, 0xa11ce) & 0xf) !== value % 16) return null;
  return {
    seed: payload >>> 6,
    players: ((payload >>> 2) & 0xf) + MIN_PLAYERS,
    undercovers: ((payload >>> 1) & 1) + 1,
    mrWhite: (payload & 1) === 1,
    rulesMask: ALL_RULES_MASK,
    ordered: false,
    showTheme: false,
  };
}

function decodeCurrent(code) {
  const value = fromBase32(code);
  if (value === null) return null;
  let payload = Math.floor(value / 32);
  if (checksum(payload, 5) !== value % 32) return null;
  const v = {};
  for (const [name, bits] of [...FIELDS].reverse()) {
    v[name] = payload % 2 ** bits;
    payload = Math.floor(payload / 2 ** bits);
  }
  return {
    seed: v.seed,
    players: v.players + MIN_PLAYERS,
    undercovers: v.undercovers + 1,
    mrWhite: v.mrWhite === 1,
    rulesMask: v.rulesMask,
    ordered: v.ordered === 1,
    showTheme: v.showTheme === 1,
  };
}

export function decodeCode(raw) {
  const code = normalizeCode(raw);
  const decoded =
    code.length === CODE_LENGTH ? decodeCurrent(code) : code.length === LEGACY_CODE_LENGTH ? decodeLegacy(code) : null;
  if (!decoded) return null;
  const { rulesMask, ...settings } = decoded;
  settings.rules = RULES.map((r) => r.id).filter((id) => rulesMask & (1 << (id - 1)));
  if (validateSettings(settings)) return null;
  return { code, ...settings };
}

export function newCode(settings, random = Math.random) {
  const seed = Math.floor(random() * 0x100000);
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

/**
 * Calcule la manche complète : règle jouée, rôle et carte de chaque joueur, premier joueur.
 * Les joueurs sont numérotés à partir de 1.
 */
export function dealRound(game, round) {
  const { seed, players, undercovers, mrWhite } = game;
  const rand = mulberry32(hash32(seed, round, 0x6465616c));
  const rule = ruleForRound(game, round);

  const seats = shuffle(
    Array.from({ length: players }, (_, i) => i + 1),
    rand
  );
  const civilianCards = shuffle(rule.civilians, rand);

  const roles = new Array(players + 1);
  let civilianIndex = 0;
  seats.forEach((seat, i) => {
    if (i < undercovers) {
      roles[seat] = { seat, role: "undercover", card: rule.undercover };
    } else if (mrWhite && i === undercovers) {
      roles[seat] = { seat, role: "mrwhite", card: null };
    } else {
      // S'il y a plus de civils que de cartes de la règle, les cartes sont réutilisées.
      const card = civilianCards[civilianIndex % civilianCards.length];
      civilianIndex++;
      roles[seat] = { seat, role: "civilian", card };
    }
  });

  // Mr White ne commence jamais (règle classique d'Undercover).
  const candidates = roles.filter((r) => r && r.role !== "mrwhite").map((r) => r.seat);
  const starter = candidates[Math.floor(rand() * candidates.length)];

  return { round, rule, roles: roles.slice(1), starter };
}

export function playerCard(game, round, seat) {
  return dealRound(game, round).roles[seat - 1];
}

/** Détermine si la partie est terminée à partir des joueurs encore en jeu. */
export function outcome(deal, eliminatedSeats) {
  const alive = deal.roles.filter((r) => !eliminatedSeats.includes(r.seat));
  const impostors = alive.filter((r) => r.role !== "civilian").length;
  const civilians = alive.length - impostors;
  if (impostors === 0) return "civilians";
  if (civilians <= 1) return "impostors";
  return null;
}
