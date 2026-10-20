// Moteur du jeu, 100 % déterministe.
//
// Il n'y a pas de serveur : l'hôte génère un « code de partie » qui contient une graine
// aléatoire et les paramètres. Chaque téléphone recalcule localement la même distribution
// à partir de (code, numéro de manche, numéro de joueur). Tous les appareils obtiennent donc
// exactement le même résultat sans jamais communiquer entre eux.

import { RULES } from "./cards.js";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 symboles, sans 0/O/1/I
export const CODE_LENGTH = 6; // 6 × 5 bits = 30 bits
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
// Bits : graine (20) | joueurs-3 (4) | undercovers-1 (1) | Mr White (1) | contrôle (4)

function checksum(payload) {
  return hash32(payload, 0xa11ce) & 0xf;
}

export function validateSettings({ players, undercovers, mrWhite }) {
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
  return null;
}

export function encodeCode({ seed, players, undercovers, mrWhite }) {
  const error = validateSettings({ players, undercovers, mrWhite });
  if (error) throw new Error(error);
  const payload =
    ((seed & 0xfffff) << 6) | ((players - MIN_PLAYERS) << 2) | ((undercovers - 1) << 1) | (mrWhite ? 1 : 0);
  let value = payload * 16 + checksum(payload);
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
  const check = value % 16;
  const payload = Math.floor(value / 16);
  if (checksum(payload) !== check) return null;
  const settings = {
    seed: payload >>> 6,
    players: ((payload >>> 2) & 0xf) + MIN_PLAYERS,
    undercovers: ((payload >>> 1) & 1) + 1,
    mrWhite: (payload & 1) === 1,
  };
  if (validateSettings(settings)) return null;
  return { code, ...settings };
}

export function newCode(settings, random = Math.random) {
  const seed = Math.floor(random() * 0x100000);
  return encodeCode({ ...settings, seed });
}

// --- Distribution des cartes --------------------------------------------------------------

export function ruleForRound(seed, round) {
  // Les 7 règles sont jouées dans un ordre aléatoire avant de recommencer un nouveau cycle.
  const cycle = Math.floor((round - 1) / RULES.length);
  const order = shuffle(
    RULES.map((_, i) => i),
    mulberry32(hash32(seed, cycle, 0x52554c45))
  );
  return RULES[order[(round - 1) % RULES.length]];
}

/**
 * Calcule la manche complète : règle jouée, rôle et carte de chaque joueur, premier joueur.
 * Les joueurs sont numérotés à partir de 1.
 */
export function dealRound(game, round) {
  const { seed, players, undercovers, mrWhite } = game;
  const rand = mulberry32(hash32(seed, round, 0x6465616c));
  const rule = ruleForRound(seed, round);

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
