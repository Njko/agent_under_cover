import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES } from "../js/cards.js";
import { decodeCode, dealRound, encodeCode, newCode, outcome, ruleForRound } from "../js/game.js";

test("chaque règle a au moins 4 cartes civiles et une carte undercover", () => {
  assert.equal(RULES.length, 7);
  for (const r of RULES) {
    assert.ok(r.civilians.length >= 4, `règle ${r.id}`);
    assert.ok(r.undercover && r.why && r.theme);
  }
  const total = RULES.reduce((n, r) => n + r.civilians.length + 1, 0);
  assert.equal(total, 44, "le PDF contient 44 cartes");
});

test("le code encode et décode les paramètres", () => {
  for (let players = 3; players <= 18; players++) {
    for (const undercovers of [1, 2]) {
      for (const mrWhite of [false, true]) {
        if (players - undercovers - (mrWhite ? 1 : 0) < 2) continue;
        const seed = (players * 7919 + undercovers * 31) & 0xfffff;
        const code = encodeCode({ seed, players, undercovers, mrWhite });
        assert.match(code, /^[2-9A-HJ-NP-Z]{6}$/);
        assert.deepEqual(decodeCode(code), { code, seed, players, undercovers, mrWhite });
        assert.deepEqual(decodeCode(code.toLowerCase().replace(/(...)/, "$1 ")).code, code);
      }
    }
  }
});

test("un code mal saisi est rejeté", () => {
  const code = encodeCode({ seed: 12345, players: 6, undercovers: 1, mrWhite: false });
  let rejected = 0;
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (const ch of alphabet) {
    const typo = ch + code.slice(1);
    if (typo !== code && decodeCode(typo) === null) rejected++;
  }
  assert.ok(rejected >= 25, `seulement ${rejected} fautes de frappe détectées`);
  assert.equal(decodeCode("ABC"), null);
  assert.equal(decodeCode("0OI1!!"), null);
});

test("la distribution est identique sur tous les appareils et respecte les rôles", () => {
  const code = newCode({ players: 8, undercovers: 2, mrWhite: true });
  const game = decodeCode(code);
  for (let round = 1; round <= 10; round++) {
    const a = dealRound(game, round);
    const b = dealRound(decodeCode(code), round);
    assert.deepEqual(a, b);
    const count = (role) => a.roles.filter((r) => r.role === role).length;
    assert.equal(count("undercover"), 2);
    assert.equal(count("mrwhite"), 1);
    assert.equal(count("civilian"), 5);
    for (const r of a.roles) {
      if (r.role === "undercover") assert.equal(r.card, a.rule.undercover);
      if (r.role === "civilian") assert.ok(a.rule.civilians.includes(r.card));
      if (r.role === "mrwhite") assert.equal(r.card, null);
    }
    assert.notEqual(a.roles[a.starter - 1].role, "mrwhite");
  }
});

test("les civils reçoivent des cartes différentes tant que possible", () => {
  const game = decodeCode(encodeCode({ seed: 42, players: 5, undercovers: 1, mrWhite: false }));
  for (let round = 1; round <= 7; round++) {
    const cards = dealRound(game, round).roles.filter((r) => r.role === "civilian").map((r) => r.card);
    assert.equal(new Set(cards).size, cards.length);
  }
});

test("les 7 règles sont jouées une fois chacune avant de se répéter", () => {
  const ids = Array.from({ length: 7 }, (_, i) => ruleForRound(999, i + 1).id);
  assert.deepEqual([...ids].sort(), [1, 2, 3, 4, 5, 6, 7]);
});

test("conditions de victoire", () => {
  const game = decodeCode(encodeCode({ seed: 7, players: 4, undercovers: 1, mrWhite: false }));
  const deal = dealRound(game, 1);
  const uc = deal.roles.find((r) => r.role === "undercover").seat;
  const civ = deal.roles.filter((r) => r.role === "civilian").map((r) => r.seat);
  assert.equal(outcome(deal, []), null);
  assert.equal(outcome(deal, [uc]), "civilians");
  assert.equal(outcome(deal, [civ[0]]), null);
  assert.equal(outcome(deal, [civ[0], civ[1]]), "impostors");
});
