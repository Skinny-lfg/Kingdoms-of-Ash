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
    attributes: {}, setAttribute(name, value) { this.attributes[name] = String(value); },
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
    click(data, id) {
      handlers.click({ target: { closest() { return { id: id || '', dataset: data, disabled: false }; } } });
    },
    html(id) { return document.getElementById(id).innerHTML; },
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
  assert.equal(s.version, 2);
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
  assert.ok(g.state().logs.some(l => l.title.includes('Tropas regressaram')));
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
  assert.ok(g.state().logs.some(l => l.title.includes('Nova aldeia fundada')));
});

test('o progresso é recuperado do mesmo navegador, sempre por turnos', () => {
  const store = new Map();
  const a = startGame(store);
  a.click({ tile: '20' });
  a.click({ action: 'settle' });
  a.advance();
  a.click({ tab: 'ranking' });
  a.click({}, 'next-day');
  const b = startGame(store);
  assert.equal(b.state().day, 3);
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
  assert.equal(next.state().tab, 'map');
  assert.equal(next.state().villageMode, 'infrastructure');
  assert.equal(next.state().selected, 20);
});


test('turnos manuais: navegar e recrutar não avançam o mundo', () => {
  const g = startGame();
  g.click({ action: 'train', unit: 'spear' });
  g.click({ tab: 'diplomacy' });
  assert.equal(g.state().day, 1);
  g.click({}, 'next-day');
  assert.equal(g.state().day, 2);
  assert.ok(g.html('military-strip').includes('🛡️'));
  assert.ok(g.html('world-map').includes('🌾'));
  assert.ok(g.html('world-map').includes('🏰'));
});

test('ataque enviado: relatório de forças, baixas e saque com valores consistentes', () => {
  const g = startGame();
  g.click({ tile: '20' });
  g.click({ action: 'raid' });
  const mission = g.state().missions[0];
  assert.ok(mission);
  const before = { ...mission.troops };
  assert.equal(g.state().reports.length, 0);
  g.click({}, 'next-day');
  const s = g.state(), report = s.reports[0];
  assert.equal(report.attacker, 0);
  assert.equal(report.defender, -1);
  assert.equal(report.tile, 20);
  assert.equal(report.read, false);
  for (const key of ['spear','sword','rider','siege']) {
    assert.equal(report.attackers.sent[key], before[key]);
    assert.equal(report.attackers.survived[key] + report.attackers.lost[key], before[key]);
  }
  assert.ok(report.militia.sent > 0);
  const total = Object.values(report.loot).reduce((a,b)=>a+b,0);
  assert.ok(total > 0);
  assert.equal(total, Object.values(s.missions[0].loot).reduce((a,b)=>a+b,0));
  assert.ok(g.html('military-strip').includes('Relatórios (1)'));
  g.click({ tab: 'reports' });
  assert.equal(g.state().reports[0].read, true);
  assert.ok(g.html('workspace-content').includes('Recursos saqueados'));
  assert.equal(g.state().day, 2);
});

test('ataque recebido: aviso antes da chegada e relatório defensivo com saque', () => {
  const store = new Map(), initial = startGame(store), s = initial.state();
  s.missions.push({
    id: ++s.missionSeq, owner: 1, tile: 19, mode: 'raid', eta: 2,
    returnTrip: false,
    troops: { spear: 25, sword: 20, rider: 8, siege: 2 },
    loot: { wood: 0, clay: 0, iron: 0, grain: 0 }
  });
  store.set('kingdoms-of-ash-v04', JSON.stringify(s));
  const g = startGame(store);
  assert.ok(g.html('military-strip').includes('🚨'));
  assert.ok(g.html('military-strip').includes('2 turno(s)'));
  g.click({}, 'next-day');
  assert.equal(g.state().reports.length, 0);
  assert.ok(g.html('military-strip').includes('1 turno(s)'));
  g.click({}, 'next-day');
  const report = g.state().reports[0];
  assert.equal(report.attacker, 1);
  assert.equal(report.defender, 0);
  assert.equal(report.attackers.sent.spear, 25);
  assert.equal(report.defenders.sent.spear, 16);
  assert.equal(report.defenders.sent.sword, 10);
  assert.ok(report.victory);
  assert.ok(Object.values(report.loot).some(n => n > 0));
  assert.ok(g.state().logs.some(l => l.reportId === report.id && l.tone === 'incoming'));
  g.click({ action: 'open-reports' });
  assert.ok(g.html('workspace-content').includes('🚨 DEFESA'));
  assert.ok(g.html('workspace-content').includes('Recursos saqueados'));
});

test('relatórios mantêm o estado por ler no save e podem ser consultados', () => {
  const store = new Map(), g = startGame(store);
  g.click({ tile: '20' });
  g.click({ action: 'raid' });
  g.advance();
  assert.equal(g.state().reports[0].read, false);
  const a = startGame(store);
  assert.equal(a.state().reports[0].read, false);
  assert.ok(a.html('military-strip').includes('Relatórios (1)'));
  a.click({ action: 'open-reports' });
  assert.equal(startGame(store).state().reports[0].read, true);
});

test('save antigo v0.1 preserva províncias e migra para turnos sem temporizador', () => {
  const store = new Map(), g = startGame(store);
  g.click({ tile: '20' });
  g.click({ action: 'settle' });
  g.advance();
  const old = g.state();
  old.version = 1; old.speed = 20;
  delete old.reports; delete old.reportSeq;
  store.set('kingdoms-of-ash-v01', JSON.stringify(old));
  store.delete('kingdoms-of-ash-v04');
  const restored = startGame(store);
  assert.equal(restored.state().version, 2);
  assert.equal(restored.state().day, 2);
  assert.equal(restored.state().speed, 0);
  assert.equal(restored.state().tiles[20].owner, 0);
  assert.equal(restored.state().reports.length, 0);
  restored.click({}, 'next-day');
  assert.equal(restored.state().day, 3);
});


test('a v0.4 usa um save independente sem apagar as campanhas existentes', () => {
  const store = new Map();
  const legacy = startGame(store).state();
  legacy.version = 1;
  store.set('kingdoms-of-ash-v01', JSON.stringify(legacy));
  store.delete('kingdoms-of-ash-v04');
  const before = store.get('kingdoms-of-ash-v01');
  const v3 = startGame(store);
  v3.click({}, 'next-day');
  assert.equal(v3.state().day, 2);
  assert.equal(store.get('kingdoms-of-ash-v01'), before);
  assert.ok(store.has('kingdoms-of-ash-v04'));
  assert.equal(startGame(store).state().day, 2);
});


test('navegação Travian: campos, centro da aldeia e mapa sem passar turno', () => {
  const g = startGame();
  const initial = g.state().day;
  assert.ok(g.html('scene-ground').includes('🌲'));
  assert.ok(g.html('scene-ground').includes('Campos e produção'));
  g.click({ tab: 'village', mode: 'infrastructure' });
  assert.equal(g.state().tab, 'village');
  assert.equal(g.state().villageMode, 'infrastructure');
  assert.ok(g.html('scene-ground').includes('Centro da aldeia'));
  assert.ok(g.html('scene-ground').includes('🏰'));
  g.click({ action: 'focus-building', key: 'barracks' });
  assert.equal(g.state().buildingFocus, 'barracks');
  assert.ok(g.html('workspace-content').includes('selected-building'));
  g.click({ tab: 'map' });
  assert.equal(g.state().tab, 'map');
  g.click({ tab: 'village', mode: 'production' });
  assert.equal(g.state().villageMode, 'production');
  assert.ok(g.html('scene-ground').includes('Campos e produção'));
  assert.equal(g.state().day, initial);
});

test('selecionar aldeia no mapa regressa à cena e deixa consultar relatórios', () => {
  const g = startGame();
  g.click({ tile: '20' });
  assert.equal(g.state().tab, 'map');
  g.click({ action: 'settle' });
  g.advance();
  assert.equal(g.state().tiles[20].owner, 0);
  g.click({ action: 'select', tile: '20' });
  assert.equal(g.state().tab, 'village');
  assert.equal(g.state().selected, 20);
  assert.ok(g.html('scene-ground').includes('Campina Seca'));
  g.click({ tab: 'reports' });
  assert.equal(g.state().tab, 'reports');
  g.click({ tab: 'village', mode: 'infrastructure' });
  assert.ok(g.html('scene-ground').includes('Centro da aldeia'));
});

test('importa save da v0.3 do GitHub Pages sem o alterar', () => {
  const store = new Map(), original = startGame(store);
  original.click({}, 'next-day');
  const snapshot = JSON.stringify(original.state());
  store.set('kingdoms-of-ash-v03-pages', snapshot);
  store.delete('kingdoms-of-ash-v04');
  const newer = startGame(store);
  assert.equal(newer.state().day, 2);
  newer.click({}, 'next-day');
  assert.equal(newer.state().day, 3);
  assert.equal(store.get('kingdoms-of-ash-v03-pages'), snapshot);
});

test('mobile: botão fixo de turno avança exatamente um dia e respeita eventos', () => {
  const g = startGame();
  assert.equal(g.state().day, 1);
  g.click({}, 'mobile-next-turn');
  assert.equal(g.state().day, 2);
  const state = g.state();
  state.event = { faction: 1, type: 'ultimatum' };
  g.store.set('kingdoms-of-ash-v04', JSON.stringify(state));
  const blocked = startGame(g.store);
  assert.equal(blocked.state().day, 2);
  assert.equal(blocked.html('military-strip').includes('Exército'), true);
  blocked.click({}, 'mobile-next-turn');
  assert.equal(blocked.state().day, 2);
  blocked.click({ action: 'event-refuse' });
  blocked.click({}, 'mobile-next-turn');
  assert.equal(blocked.state().day, 3);
});

test('o botão mobile usa a ação explícita e mostra o turno atual', () => {
  const g = startGame();
  assert.equal(g.state().day, 1);
  g.click({ action: 'end-turn' }, 'mobile-next-turn');
  assert.equal(g.state().day, 2);
  g.click({ action: 'end-turn' }, 'mobile-next-turn');
  assert.equal(g.state().day, 3);
  g.click({}, 'next-day');
  assert.equal(g.state().day, 4);
  const event = g.state();
  event.event = { type: 'ultimatum', faction: 1 };
  g.store.set('kingdoms-of-ash-v04', JSON.stringify(event));
  const blocked = startGame(g.store);
  blocked.click({ action: 'end-turn' }, 'mobile-next-turn');
  assert.equal(blocked.state().day, 4);
});
