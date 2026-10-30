'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

function startGame(persistentStore) {
  const handlers = {};
  const elements = {};
  const store = persistentStore || new Map();
  const fakeElement = () => ({
    innerHTML: '', textContent: '', className: '', dataset: {}, disabled: false,
    classList: { toggle() {}, add() {}, remove() {} }
  });
  const document = {
    getElementById(id) { return elements[id] || (elements[id] = fakeElement()); },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { handlers[type] = handler; },
    activeElement: { tagName: 'BODY' }
  };
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, value); }
  };
  const window = { confirm() { return true; } };
  vm.runInNewContext(source, {
    document, localStorage, window, setInterval() {}, setTimeout() { return 1; }, clearTimeout() {}
  }, { filename: 'game.js' });
  return {
    state() { return window.KingdomsOfAsh.getState(); },
    advance() { window.KingdomsOfAsh.advance(); },
    click(data) {
      handlers.click({ target: { closest() { return { dataset: data, disabled: false }; } } });
    },
    store
  };
}

function ownerCount(s, owner) { return s.tiles.filter(t => t.owner === owner).length; }
function totals(s, owner) { return Object.values(s.factions[owner].troops).reduce((sum, n) => sum + n, 0); }
function clearEvent(game) {
  if (!game.state().event) return;
  game.click({ action: 'event-pay' });
  if (game.state().event) game.click({ action: 'event-refuse' });
}

test('mapa, fações e campanha começam corretamente', () => {
  const g = startGame();
  const s = g.state();
  assert.equal(s.version, 1);
  assert.equal(s.day, 1);
  assert.equal(s.speed, 0);
  assert.equal(s.tiles.length, 40);
  assert.equal(s.factions.length, 6);
  assert.equal(s.tiles.filter(t => t.owner >= 0).length, 6);
  assert.equal(ownerCount(s, 0), 1);
});

test('fundar aldeia consome recursos, demora tempo e aumenta o território', () => {
  const g = startGame();
  const before = g.state().factions[0].resources.wood;
  g.click({ tile: '20' });
  g.click({ action: 'settle' });
  assert.equal(g.state().missions.length, 1);
  assert.ok(g.state().factions[0].resources.wood < before);
  g.advance();
  assert.equal(g.state().tiles[20].owner, 0);
  assert.equal(ownerCount(g.state(), 0), 2);
});

test('as construções demoram dois dias a melhorar a produção', () => {
  const g = startGame();
  assert.equal(g.state().tiles[19].levels.wood, 2);
  g.click({ action: 'build', key: 'wood', village: '19' });
  assert.equal(g.state().tiles[19].levels.wood, 2);
  assert.equal(g.state().tiles[19].construction.left, 2);
  g.advance(); g.advance();
  assert.equal(g.state().tiles[19].levels.wood, 3);
  assert.equal(g.state().tiles[19].construction, null);
});

test('recrutamento, incursão e regresso das tropas', () => {
  const g = startGame();
  const initial = totals(g.state(), 0);
  g.click({ action: 'train', unit: 'spear' });
  assert.equal(totals(g.state(), 0), initial + 5);
  g.click({ tile: '20' });
  g.click({ action: 'raid' });
  assert.equal(g.state().missions.length, 1);
  assert.ok(totals(g.state(), 0) < initial + 5);
  g.advance(); g.advance();
  assert.equal(g.state().missions.filter(m => m.owner === 0).length, 0);
  assert.ok(g.state().logs.some(l => l.title === 'Tropas regressaram'));
});

test('diplomacia: presente, pacto, aliança e apoio', () => {
  const g = startGame();
  const id = 3;
  g.click({ action: 'gift', faction: String(id) });
  g.click({ action: 'gift', faction: String(id) });
  g.click({ action: 'pact', faction: String(id) });
  assert.equal(g.state().relations['0:3'].stance, 'pact');
  g.click({ action: 'gift', faction: String(id) });
  g.click({ action: 'alliance', faction: String(id) });
  assert.equal(g.state().relations['0:3'].stance, 'alliance');
  const before = totals(g.state(), 0);
  g.click({ action: 'aid', faction: String(id) });
  assert.equal(totals(g.state(), 0), before + 5);
});

test('a simulação avança, os rivais expandem e ninguém fica com recursos negativos', () => {
  const g = startGame();
  for (let i = 0; i < 100; i++) {
    clearEvent(g);
    g.advance();
    const s = g.state();
    assert.ok(s.factions.every(f => Object.values(f.resources).every(n => Number.isFinite(n) && n >= 0)));
    assert.ok(s.factions.every(f => Object.values(f.troops).every(n => Number.isInteger(n) && n >= 0)));
    assert.ok(s.tiles.every(t => t.owner >= -1 && t.owner < 6));
    if (s.ended) break;
  }
  assert.ok(g.state().tiles.filter(t => t.owner >= 0).length >= 15);
  assert.ok(g.state().logs.some(l => l.title === 'Nova aldeia fundada'));
});

test('o progresso é recuperado do mesmo navegador, mas o tempo reabre pausado', () => {
  const store = new Map();
  const a = startGame(store);
  a.click({ tile: '20' });
  a.click({ action: 'settle' });
  a.advance();
  a.click({ tab: 'ranking' });
  a.click({ speed: '20' });
  const b = startGame(store);
  assert.equal(b.state().day, 2);
  assert.equal(b.state().tiles[20].owner, 0);
  assert.equal(b.state().speed, 0);
  assert.equal(b.state().tab, 'ranking');
});


test('atalhos contextuais abrem a gestão correta sem gastar recursos', () => {
  const g = startGame();
  const before = { ...g.state().factions[0].resources };
  g.click({ tile: '20' });
  g.click({ action: 'guide-production' });
  assert.equal(g.state().tab, 'village');
  assert.equal(g.state().villageMode, 'production');
  assert.equal(g.state().selected, 19);
  g.click({ action: 'open-infrastructure' });
  assert.equal(g.state().villageMode, 'infrastructure');
  g.click({ action: 'open-army' });
  assert.equal(g.state().tab, 'army');
  g.click({ action: 'open-diplomacy' });
  assert.equal(g.state().tab, 'diplomacy');
  assert.equal(JSON.stringify(g.state().factions[0].resources), JSON.stringify(before));
});

test('guia de expansão seleciona um território válido sem criar missões', () => {
  const g = startGame();
  g.click({ action: 'guide-expand' });
  const s = g.state();
  assert.notEqual(s.selected, 19);
  assert.equal(s.tiles[s.selected].owner, -1);
  assert.ok(Math.abs(s.selected % 8 - 19 % 8) + Math.abs(Math.floor(s.selected / 8) - Math.floor(19 / 8)) <= 3);
  assert.equal(s.missions.length, 0);
});

test('as preferências de navegação sobrevivem à recuperação do save', () => {
  const store = new Map();
  const g = startGame(store);
  g.click({ action: 'open-infrastructure' });
  g.click({ tile: '20' });
  const next = startGame(store);
  assert.equal(next.state().tab, 'village');
  assert.equal(next.state().villageMode, 'infrastructure');
  assert.equal(next.state().selected, 20);
});
