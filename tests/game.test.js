import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES } from "../js/cards.js";
import { MIN_COMPET_PLAYERS, coopFound, coopPoints, decodeCode, dealRound, encodeCode, newCode, outcome, roundPoints, ruleForRound, wrongGuesses } from "../js/game.js";

const base = { seed: 4242, players: 5, undercovers: 1 };

test("chaque règle a au moins 4 cartes civiles, une carte undercover et un dos", () => {
  assert.equal(RULES.length, 7);
  for (const r of RULES) {
    assert.ok(r.civilians.length >= 4, `règle ${r.id}`);
    assert.ok(r.undercover && r.why && r.theme && r.back && r.summary);
  }
  const total = RULES.reduce((n, r) => n + r.civilians.length + 1, 0);
  assert.equal(total, 44, "le PDF contient 44 cartes");
});

test("le code encode et décode les paramètres", () => {
  for (let players = 3; players <= 18; players++) {
    for (const undercovers of [1, 2]) {
      if (players - undercovers < 2) continue;
      for (const rounds of [1, 5, 16]) {
        for (const mode of players < 4 ? ["coop"] : ["coop", "compet"]) {
          const seed = (players * 7919 + undercovers * 31 + rounds) % 2 ** 16;
          const rules = [1, 3, 7];
          const code = encodeCode({ seed, players, undercovers, rules, ordered: true, rounds, mode });
          assert.match(code, /^[2-9A-HJ-NP-Z]{8}$/);
          assert.deepEqual(decodeCode(code), { code, seed, players, undercovers, rules, ordered: true, rounds, mode });
        }
        const code = encodeCode({ seed: 1, players, undercovers, rounds });
        assert.equal(decodeCode(code).mode, "coop", "coopératif par défaut");
        assert.equal(decodeCode(code.toLowerCase().replace(/(....)/, "$1 ")).code, code);
      }
    }
  }
});

test("les paramètres invalides sont refusés", () => {
  assert.throws(() => encodeCode({ ...base, rules: [] }));
  assert.throws(() => encodeCode({ ...base, rounds: 0 }));
  assert.throws(() => encodeCode({ ...base, rounds: 17 }));
  assert.throws(() => encodeCode({ ...base, players: 3, undercovers: 2 }));
});

test("un code mal saisi est rejeté", () => {
  const code = encodeCode(base);
  let rejected = 0;
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (const ch of alphabet) {
    const typo = ch + code.slice(1);
    if (typo !== code && decodeCode(typo) === null) rejected++;
  }
  assert.ok(rejected >= 29, `seulement ${rejected} fautes de frappe détectées`);
  assert.equal(decodeCode("ABC"), null);
  assert.equal(decodeCode("0OI1!!0O"), null);
});

test("la distribution est identique sur tous les appareils et respecte les rôles", () => {
  const code = newCode({ players: 8, undercovers: 2, rounds: 10 });
  const game = decodeCode(code);
  for (let round = 1; round <= 10; round++) {
    const a = dealRound(game, round);
    assert.deepEqual(a, dealRound(decodeCode(code), round));
    assert.equal(a.roles.filter((r) => r.role === "undercover").length, 2);
    assert.equal(a.roles.filter((r) => r.role === "civilian").length, 6);
    for (const r of a.roles) {
      if (r.role === "undercover") assert.equal(r.card, a.rule.undercover);
      else assert.ok(a.rule.civilians.includes(r.card));
    }
    assert.ok(a.starter >= 1 && a.starter <= 8);
  }
});

test("les civils reçoivent des cartes différentes tant que possible", () => {
  const game = decodeCode(encodeCode({ ...base, seed: 42 }));
  for (let round = 1; round <= 7; round++) {
    const cards = dealRound(game, round).roles.filter((r) => r.role === "civilian").map((r) => r.card);
    assert.equal(new Set(cards).size, cards.length);
  }
});

test("les 7 règles sont jouées une fois chacune avant de se répéter", () => {
  const game = decodeCode(encodeCode({ ...base, seed: 999 }));
  const ids = Array.from({ length: 7 }, (_, i) => ruleForRound(game, i + 1).id);
  assert.deepEqual([...ids].sort(), [1, 2, 3, 4, 5, 6, 7]);
});

test("seules les règles choisies sont jouées, dans l'ordre si demandé", () => {
  const random = decodeCode(encodeCode({ ...base, rules: [2, 4, 6] }));
  const ids = Array.from({ length: 9 }, (_, i) => ruleForRound(random, i + 1).id);
  assert.ok(ids.every((id) => [2, 4, 6].includes(id)));
  assert.deepEqual([...ids.slice(0, 3)].sort(), [2, 4, 6]);

  const ordered = decodeCode(encodeCode({ ...base, rules: [6, 2, 4], ordered: true }));
  assert.deepEqual(Array.from({ length: 4 }, (_, i) => ruleForRound(ordered, i + 1).id), [2, 4, 6, 2]);

  const single = decodeCode(encodeCode({ ...base, rules: [3] }));
  for (let round = 1; round <= 3; round++) assert.equal(dealRound(single, round).rule.id, 3);
});

test("conditions de victoire et points", () => {
  const game = decodeCode(encodeCode({ ...base, players: 4 }));
  const deal = dealRound(game, 1);
  const uc = deal.roles.find((r) => r.role === "undercover").seat;
  const civ = deal.roles.filter((r) => r.role === "civilian").map((r) => r.seat);
  assert.equal(outcome(deal, []), null);
  assert.equal(outcome(deal, [uc]), "civilians");
  assert.equal(outcome(deal, [civ[0]]), null);
  assert.equal(outcome(deal, [civ[0], civ[1]]), "impostors");

  assert.deepEqual(roundPoints(deal, "civilians", [uc]), Object.fromEntries(civ.map((s) => [s, 2])));
  assert.deepEqual(roundPoints(deal, "impostors", [civ[0], civ[1]]), { [uc]: 10 });
  assert.deepEqual(roundPoints(deal, "revealed", []), {});
});

test("mode coopératif : barème 3/2/1/0 selon les erreurs de désignation", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(coopPoints), [3, 2, 1, 0, 0]);
  const game = decodeCode(encodeCode({ ...base, players: 6, undercovers: 2 }));
  const deal = dealRound(game, 1);
  const ucs = deal.roles.filter((r) => r.role === "undercover").map((r) => r.seat);
  const civ = deal.roles.find((r) => r.role === "civilian").seat;
  assert.equal(coopFound(deal, [ucs[0]]), false);
  assert.equal(coopFound(deal, [ucs[0], civ, ucs[1]]), true);
  assert.equal(wrongGuesses(deal, [ucs[0], civ, ucs[1]]), 1);
});

test("le compétitif demande au moins 4 joueurs", () => {
  assert.equal(MIN_COMPET_PLAYERS, 4);
  assert.throws(() => encodeCode({ ...base, players: 3, mode: "compet" }));
  assert.ok(encodeCode({ ...base, players: 3, mode: "coop" }));
  assert.ok(encodeCode({ ...base, players: 4, mode: "compet" }));
});

test("le rôle d'undercover et la prise de parole tournent d'une manche à l'autre", () => {
  // Sur de nombreuses parties de 4 joueurs en 5 manches, compare au tirage uniforme.
  let repeats = 0, transitions = 0, sameStarter = 0, heavy = 0, games = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const game = decodeCode(encodeCode({ seed, players: 4, undercovers: 1, rounds: 5, mode: "compet" }));
    const counts = [0, 0, 0, 0, 0];
    let prevUc = null, prevStarter = null;
    for (let round = 1; round <= 5; round++) {
      const deal = dealRound(game, round);
      const uc = deal.roles.find((r) => r.role === "undercover").seat;
      counts[uc]++;
      if (prevUc !== null) {
        transitions++;
        if (uc === prevUc) repeats++;
        if (deal.starter === prevStarter) sameStarter++;
      }
      prevUc = uc;
      prevStarter = deal.starter;
    }
    games++;
    if (Math.max(...counts) >= 4) heavy++;
  }
  // Tirage uniforme : 25 % de répétitions. Ici, rares mais possibles (pas de déduction certaine).
  assert.ok(repeats / transitions < 0.12, `répétitions undercover : ${repeats / transitions}`);
  assert.ok(repeats > 0, "un joueur peut encore être undercover deux fois de suite");
  assert.ok(sameStarter / transitions < 0.12, `répétitions premier joueur : ${sameStarter / transitions}`);
  assert.ok(heavy / games < 0.005, `undercover 4 fois sur 5 : ${heavy / games}`);
});

test("la distribution tient compte des manches précédentes de façon déterministe", () => {
  const game = decodeCode(encodeCode({ seed: 99, players: 6, undercovers: 2, rounds: 8 }));
  for (let round = 1; round <= 8; round++) {
    const deal = dealRound(game, round);
    assert.deepEqual(deal, dealRound(game, round));
    assert.equal(deal.roles.filter((r) => r.role === "undercover").length, 2);
  }
});
