'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

function startGame(persistentStore, confirmReset) {
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
  const window = { confirm() { return confirmReset !== false; } };
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
  assert.equal(s.version, 3);
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
  assert.ok(g.state().logs.some(l => l.title.includes('Army returned')));
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
  assert.ok(g.state().logs.some(l => l.title.includes('New settlement')));
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
  assert.ok(g.html('military-strip').includes('Reports (1)'));
  g.click({ tab: 'reports' });
  assert.equal(g.state().reports[0].read, true);
  assert.ok(g.html('workspace-content').includes('Resources looted'));
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
  store.set('kingdoms-of-ash-strategy-en', JSON.stringify(s));
  const g = startGame(store);
  assert.ok(g.html('military-strip').includes('🚨'));
  assert.ok(g.html('military-strip').includes('2 turn(s)'));
  g.click({}, 'next-day');
  assert.equal(g.state().reports.length, 0);
  assert.ok(g.html('military-strip').includes('1 turn(s)'));
  g.click({}, 'next-day');
  const report = g.state().reports[0];
  assert.equal(report.attacker, 1);
  assert.equal(report.defender, 0);
  assert.equal(report.attackers.sent.spear, 25);
  assert.equal(report.defenders.sent.spear, 8);
  assert.equal(report.defenders.sent.sword, 4);
  assert.ok(report.victory);
  assert.ok(Object.values(report.loot).some(n => n > 0));
  assert.ok(g.state().logs.some(l => l.reportId === report.id && l.tone === 'incoming'));
  g.click({ action: 'open-reports' });
  assert.ok(g.html('workspace-content').includes('🚨 DEFENSE'));
  assert.ok(g.html('workspace-content').includes('Resources looted'));
});

test('relatórios mantêm o estado por ler no save e podem ser consultados', () => {
  const store = new Map(), g = startGame(store);
  g.click({ tile: '20' });
  g.click({ action: 'raid' });
  g.advance();
  assert.equal(g.state().reports[0].read, false);
  const a = startGame(store);
  assert.equal(a.state().reports[0].read, false);
  assert.ok(a.html('military-strip').includes('Reports (1)'));
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
  store.delete('kingdoms-of-ash-strategy-en');
  const restored = startGame(store);
  assert.equal(restored.state().version, 3);
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
  store.delete('kingdoms-of-ash-strategy-en');
  const before = store.get('kingdoms-of-ash-v01');
  const v3 = startGame(store);
  v3.click({}, 'next-day');
  assert.equal(v3.state().day, 2);
  assert.equal(store.get('kingdoms-of-ash-v01'), before);
  assert.ok(store.has('kingdoms-of-ash-strategy-en'));
  assert.equal(startGame(store).state().day, 2);
});


test('navegação Travian: campos, centro da aldeia e mapa sem passar turno', () => {
  const g = startGame();
  const initial = g.state().day;
  assert.ok(g.html('scene-ground').includes('🌲'));
  assert.ok(g.html('scene-ground').includes('Fields and production'));
  g.click({ tab: 'village', mode: 'infrastructure' });
  assert.equal(g.state().tab, 'village');
  assert.equal(g.state().villageMode, 'infrastructure');
  assert.ok(g.html('scene-ground').includes('Town center'));
  assert.ok(g.html('scene-ground').includes('🏰'));
  g.click({ action: 'focus-building', key: 'barracks' });
  assert.equal(g.state().buildingFocus, 'barracks');
  assert.ok(g.html('workspace-content').includes('selected-building'));
  g.click({ tab: 'map' });
  assert.equal(g.state().tab, 'map');
  g.click({ tab: 'village', mode: 'production' });
  assert.equal(g.state().villageMode, 'production');
  assert.ok(g.html('scene-ground').includes('Fields and production'));
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
  assert.ok(g.html('scene-ground').includes('Dryfield'));
  g.click({ tab: 'reports' });
  assert.equal(g.state().tab, 'reports');
  g.click({ tab: 'village', mode: 'infrastructure' });
  assert.ok(g.html('scene-ground').includes('Town center'));
});

test('importa save da v0.3 do GitHub Pages sem o alterar', () => {
  const store = new Map(), original = startGame(store);
  original.click({}, 'next-day');
  const snapshot = JSON.stringify(original.state());
  store.set('kingdoms-of-ash-v03-pages', snapshot);
  store.delete('kingdoms-of-ash-strategy-en');
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
  g.store.set('kingdoms-of-ash-strategy-en', JSON.stringify(state));
  const blocked = startGame(g.store);
  assert.equal(blocked.state().day, 2);
  assert.equal(blocked.html('military-strip').includes('Available reserves'), true);
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
  g.store.set('kingdoms-of-ash-strategy-en', JSON.stringify(event));
  const blocked = startGame(g.store);
  blocked.click({ action: 'end-turn' }, 'mobile-next-turn');
  assert.equal(blocked.state().day, 4);
});


const STRATEGY_KEY = 'kingdoms-of-ash-strategy-en';
function armySum(t) { return Object.values(t).reduce((a,b)=>a+b,0); }
function resourceSum(t) { return Object.values(t).reduce((a,b)=>a+b,0); }
function reloadWithState(state) {
  const store = new Map([[STRATEGY_KEY,JSON.stringify(state)]]);
  return startGame(store);
}

test('strategy: English map, initial garrison and reserve are distinct and conserved', () => {
  const g=startGame(),s=g.state();
  assert.equal(s.version,3);
  assert.equal(s.tiles[19].name,'Ashheart');
  assert.equal(s.factions[0].name,'Ashen Crown');
  assert.equal(s.tiles[19].garrison.spear,8);
  assert.equal(s.tiles[19].garrison.sword,4);
  assert.equal(s.factions[0].troops.spear+s.tiles[19].garrison.spear,16);
  assert.equal(s.factions[0].troops.sword+s.tiles[19].garrison.sword,10);
  assert.ok(g.html('scene-ground').includes('Fields and production'));
  assert.ok(g.html('military-strip').includes('Available reserves'));
  assert.equal(g.state().day,1);
});

test('strategy: station and withdraw troops without duplicating armies', () => {
  const g=startGame();
  const before=armySum(g.state().factions[0].troops)+armySum(g.state().tiles[19].garrison);
  g.click({ action:'station',tile:'19',unit:'spear' });
  assert.equal(g.state().tiles[19].garrison.spear,13);
  g.click({ action:'withdraw',tile:'19',unit:'spear' });
  assert.equal(g.state().tiles[19].garrison.spear,8);
  const after=armySum(g.state().factions[0].troops)+armySum(g.state().tiles[19].garrison);
  assert.equal(after,before);
  assert.equal(g.state().day,1);
});

test('strategy: fortification, forest ambush and evacuation cost resources', () => {
  const g=startGame(),before=g.state().factions[0].resources;
  g.click({ action:'fortify',tile:'19' });
  assert.ok(g.state().tiles[19].fortifyUntil>=3);
  assert.ok(g.state().factions[0].resources.wood<before.wood);
  g.click({ action:'ambush',tile:'19' });
  assert.ok(g.state().tiles[19].ambushUntil>=3);
  const guard=armySum(g.state().tiles[19].garrison);
  g.click({ action:'evacuate',tile:'19' });
  assert.equal(armySum(g.state().tiles[19].garrison),0);
  assert.ok(armySum(g.state().factions[0].troops)>=guard);
  assert.ok(g.state().tiles[19].evacuateUntil>=3);
  assert.equal(g.state().day,1);
});

test('strategy: farming raid yields replenishable finite loot, limited by carrying capacity', () => {
  const g=startGame(),stock=resourceSum(g.state().tiles[20].stock);
  g.click({ tile:'20' });g.click({ action:'raid' });
  assert.equal(g.state().missions[0].mode,'raid');
  g.advance();
  const s=g.state(),r=s.reports[0];
  assert.equal(r.mode,'raid');
  assert.equal(r.attacker,0);
  assert.ok(r.victory);
  assert.ok(resourceSum(r.loot)>0);
  assert.ok(resourceSum(r.loot)<=r.carryCapacity);
  assert.ok(resourceSum(s.tiles[20].stock)<stock+90);
  const before=s.tiles[20].stock.wood;
  g.advance();
  assert.ok(g.state().tiles[20].stock.wood>=before);
  g.click({ tab:'army' });
  assert.ok(g.html('workspace-content').includes('Raid profitability'));
});

test('strategy: station and reinforce a second village with travel time', () => {
  const g=startGame();g.click({tile:'20'});g.click({action:'settle'});g.advance();
  g.click({action:'select',tile:'19'});
  g.click({action:'reinforce',from:'19',to:'20'});
  const m=g.state().missions.find(x=>x.mode==='reinforce');
  assert.ok(m);assert.equal(m.origin,19);assert.equal(m.tile,20);
  const before=armySum(g.state().tiles[20].garrison);
  g.advance();
  assert.ok(armySum(g.state().tiles[20].garrison)>before);
  assert.equal(g.state().missions.filter(x=>x.mode==='reinforce').length,0);
});

test('strategy: reconnaissance reveals neutral resource stores, before hidden', () => {
  const g=startGame();
  g.click({tile:'20'});
  assert.ok(g.html('selected-province').includes('Unknown (scout to reveal)'));
  const before=g.state().factions[0].resources.wood;
  g.click({action:'scout'});
  assert.ok(g.state().tiles[20].scoutUntil>=4);
  assert.ok(g.html('selected-province').includes('Scout intelligence'));
  assert.ok(g.state().factions[0].resources.wood<before);
});

test('strategy: field attack targets defenders and does not mint raid loot', () => {
  const g=startGame();g.click({tile:'20'});g.click({action:'attack'});g.advance();
  const r=g.state().reports[0];
  assert.equal(r.mode,'attack');assert.equal(resourceSum(r.loot),0);
  for(const key of ['spear','sword','rider','siege'])
    assert.equal(r.attackers.sent[key],r.attackers.survived[key]+r.attackers.lost[key]);
});

test('strategy: successful siege transfers the province and retreats surviving defenders', () => {
  const base=startGame().state();base.tiles[20].owner=1;base.tiles[20].militia=0;
  base.tiles[20].garrison={spear:3,sword:0,rider:0,siege:0};
  base.factions[0].troops={spear:40,sword:90,rider:15,siege:5};
  const g=reloadWithState(base);g.click({tile:'20'});g.click({action:'siege'});
  assert.ok(g.state().missions.some(m=>m.mode==='siege'));
  g.advance();g.advance();
  assert.equal(g.state().tiles[20].owner,0);
  assert.ok(g.state().reports.some(r=>r.conquered&&r.mode==='siege'));
});

test('strategy: 80-turn simulation preserves non-negative stocks, armies and garrisons', () => {
  const g=startGame();
  for(let day=0;day<80;day++){
    clearEvent(g);g.advance();const s=g.state();
    assert.ok(s.factions.every(f=>Object.values(f.resources).every(n=>Number.isFinite(n)&&n>=0)));
    assert.ok(s.tiles.every(t=>Object.values(t.garrison).every(n=>Number.isInteger(n)&&n>=0)));
    assert.ok(s.tiles.every(t=>Object.values(t.stock).every(n=>Number.isFinite(n)&&n>=0)));
    assert.ok(s.missions.every(m=>!m.troops||Object.values(m.troops).every(n=>Number.isInteger(n)&&n>=0)));
    if(s.ended)break;
  }
});

test('strategy: caravan locations shift during the campaign', () => {
  const g=startGame();
  const original=g.state().tiles.filter(t=>t.owner<0&&t.site==='caravan').map(t=>t.id);
  for(let i=0;i<5;i++){clearEvent(g);g.advance();}
  const next=g.state().tiles.filter(t=>t.owner<0&&t.site==='caravan').map(t=>t.id);
  assert.ok(original.length>0);
  assert.ok(next.length>0);
  assert.ok(original.some(id=>!next.includes(id)));
});


test('fields: every resource and building slot has a defined icon and English label', () => {
  const g=startGame();
  const fieldHtml=g.html('workspace-content');
  assert.ok(fieldHtml.includes('🌲 Lumber Camp'));
  assert.ok(fieldHtml.includes('🧱 Clay Pit'));
  assert.ok(fieldHtml.includes('⛏️ Iron Mine'));
  assert.ok(fieldHtml.includes('🌾 Grain Farm'));
  assert.ok(!fieldHtml.includes('undefined'));
  assert.ok(g.html('scene-ground').includes('RESOURCE')===false || !g.html('scene-ground').includes('undefined'));
  g.click({tab:'village',mode:'infrastructure'});
  assert.ok(g.html('workspace-content').includes('Barracks'));
  assert.ok(!g.html('workspace-content').includes('undefined'));
});

test('save migration: translate existing Portuguese village names without losing the campaign', () => {
  const base=startGame().state();
  base.tiles[19].name='Coração de Cinza';
  base.tiles[20].name='Campina Seca';
  base.tiles[0].name='Karn Vell';
  base.day=12;
  base.factions[0].resources.wood=732;
  base.tiles[19].levels.wood=4;
  const g=startGame(new Map([['kingdoms-of-ash-strategy-en',JSON.stringify(base)]]));
  assert.equal(g.state().tiles[19].name,'Ashheart');
  assert.equal(g.state().tiles[20].name,'Dryfield');
  assert.equal(g.state().tiles[0].name,'Ashen Keep');
  assert.equal(g.state().day,12);
  assert.equal(g.state().factions[0].resources.wood,732);
  assert.equal(g.state().tiles[19].levels.wood,4);
  assert.ok(g.html('scene-ground').includes('Ashheart'));
});

test('Reset Campaign: confirmation cancels safely or replaces only strategy save', () => {
  const key='kingdoms-of-ash-strategy-en';
  const initial=startGame().state();
  initial.day=9;
  initial.factions[0].resources.wood=809;
  const store=new Map([[key,JSON.stringify(initial)],['kingdoms-of-ash-v04','legacy-campaign-safe']]);
  const no=startGame(store,false);
  no.click({},'new-game');
  assert.equal(no.state().day,9);
  assert.equal(no.state().factions[0].resources.wood,809);
  const yes=startGame(store,true);
  yes.click({},'new-game');
  assert.equal(yes.state().day,1);
  assert.equal(yes.state().tiles[19].name,'Ashheart');
  assert.equal(store.get('kingdoms-of-ash-v04'),'legacy-campaign-safe');
  assert.equal(JSON.parse(store.get(key)).day,1);
});
