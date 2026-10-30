(function () {
  'use strict';

  const SAVE_KEY = 'kingdoms-of-ash-v04';
  const LEGACY_SAVE_KEY = 'kingdoms-of-ash-v03';
  const FIRST_SAVE_KEY = 'kingdoms-of-ash-v01';
  const VERSION = 2;
  const OWNER = 'Skinny-lfg/Kingdoms-of-Ash';
  const TERRAIN = {
    wood: { icon: '🌲', label: 'Bosques', icon: '🌲', resource: 'wood' },
    clay: { icon: '🧱', label: 'Barro vermelho', icon: '🧱', resource: 'clay' },
    iron: { icon: '⛏️', label: 'Montanhas de ferro', icon: '⛰️', resource: 'iron' },
    grain: { icon: '🌾', label: 'Planícies férteis', icon: '🌾', resource: 'grain' },
    balanced: { label: 'Terras mistas', icon: '🌿', resource: null }
  };
  const RES = [
    { key: 'wood', label: 'Madeira', icon: '🌲' },
    { key: 'clay', label: 'Barro', icon: '🧱' },
    { key: 'iron', label: 'Ferro', icon: '⛏️' },
    { key: 'grain', label: 'Cereais', icon: '🌾' }
  ];
  const UNITS = {
    spear: { label: 'Lanceiros', icon: '🛡️', attack: 2, defense: 5, upkeep: 0.23, cost: { wood: 29, clay: 23, iron: 14, grain: 22 }, unlock: 1 },
    sword: { label: 'Espadachins', icon: '⚔️', attack: 6, defense: 3, upkeep: 0.33, cost: { wood: 23, clay: 18, iron: 36, grain: 25 }, unlock: 1 },
    rider: { label: 'Cavaleiros', icon: '🐎', attack: 11, defense: 4, upkeep: 0.65, cost: { wood: 53, clay: 46, iron: 52, grain: 43 }, unlock: 2 },
    siege: { label: 'Catapultas', icon: '💣', attack: 16, defense: 2, upkeep: 1.2, cost: { wood: 125, clay: 115, iron: 135, grain: 70 }, unlock: 3 }
  };
  const BUILDINGS = {
    wood: { label: 'Bosques de corte', desc: 'Aumenta a produção de madeira.', base: { wood: 55, clay: 75, iron: 40, grain: 45 } },
    clay: { label: 'Barreiros', desc: 'Aumenta a produção de barro.', base: { wood: 75, clay: 50, iron: 45, grain: 40 } },
    iron: { label: 'Minas de ferro', desc: 'Aumenta a produção de ferro.', base: { wood: 85, clay: 65, iron: 45, grain: 40 } },
    grain: { label: 'Campos de cereais', desc: 'Aumenta a produção de cereais.', base: { wood: 65, clay: 60, iron: 45, grain: 35 } },
    barracks: { icon: '⚔️', label: 'Quartel', desc: 'Nível 2: cavalaria. Nível 3: catapultas.', base: { wood: 105, clay: 115, iron: 100, grain: 65 } },
    wall: { icon: '🏰', label: 'Paliçada', desc: 'Fortalece a defesa desta aldeia.', base: { wood: 95, clay: 85, iron: 65, grain: 60 } },
    market: { icon: '⚖️', label: 'Mercado', desc: 'Aumenta ligeiramente todos os rendimentos.', base: { wood: 85, clay: 95, iron: 80, grain: 70 } }
  };
  const FACTIONS = [
    { name: 'Coroa de Cinza', short: 'TU', color: '#e4bd78', style: 'player', capital: 19 },
    { name: 'Legião Carmesim', short: 'LC', color: '#d77973', style: 'aggressive', capital: 0 },
    { name: 'Reino de Varyn', short: 'RV', color: '#73a9cf', style: 'economic', capital: 7 },
    { name: 'Liga Mercante', short: 'LM', color: '#b6a8d7', style: 'diplomatic', capital: 32 },
    { name: 'Clã das Cinzas', short: 'CC', color: '#b5bf80', style: 'opportunist', capital: 39 },
    { name: 'Sentinelas do Norte', short: 'SN', color: '#82bfb4', style: 'defensive', capital: 4 }
  ];
  const NAMES = [
    'Karn Vell','Ardewyn','Vela Negra','Cinza Norte','Torre do Inverno','Ninho do Corvo','Prado Frio','Varyn',
    'Rochedo','Lobos de Sal','Ferro Escuro','Aguadouro','Vila dos Ossos','Muralha Velha','Serra Partida','Ponte Leste',
    'Vale Esquecido','Brumavale','Estrada Alta','Coração de Cinza','Campina Seca','Dente da Serpente','Fonte Antiga','Torre dos Sinos',
    'Rio Negro','Mata Antiga','Monte Oco','Veio Rubro','Arco Partido','Mão de Pedra','Cruzamento','Areal Cinzento',
    'Porto Mercante','Sombra Longa','Floresta Oca','Passagem Sul','Campo das Lanternas','Túmulo do Rei','Lago de Ferro','Morro das Cinzas'
  ];
  const SETTLE_BASE = { wood: 330, clay: 330, iron: 260, grain: 360 };
  const $ = function (id) { return document.getElementById(id); };
  let game, toastTimeout = null;

  function blankTroops() { return { spear: 0, sword: 0, rider: 0, siege: 0 }; }
  function blankResources(n) { return { wood: n || 0, clay: n || 0, iron: n || 0, grain: n || 0 }; }
  function freshTileLevels() { return { wood: 1, clay: 1, iron: 1, grain: 1, barracks: 1, wall: 0, market: 0 }; }
  function ownTiles(id) { return game.tiles.filter(function (t) { return t.owner === id; }); }
  function armyCount(t) { return Object.keys(UNITS).reduce(function (n, k) { return n + (t[k] || 0); }, 0); }
  function armyPower(t, defensive) {
    return Object.keys(UNITS).reduce(function (n, k) { return n + (t[k] || 0) * UNITS[k][defensive ? 'defense' : 'attack']; }, 0);
  }
  function costText(cost) { return RES.map(function (r) { return r.icon + ' ' + format(cost[r.key] || 0); }).join(' · '); }
  function format(n) { return Math.floor(n || 0).toLocaleString('pt-PT'); }
  function e(n) { return Math.max(0, Math.floor(n || 0)); }
  function rng() {
    let x = game.seed | 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    game.seed = x | 0;
    return (x >>> 0) / 4294967296;
  }
  function rand(n) { return Math.floor(rng() * n); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pair(a, b) { return [Math.min(a, b), Math.max(a, b)].join(':'); }
  function relation(a, b) { return game.relations[pair(a, b)]; }
  function setStance(a, b, stance, opinion) {
    const r = relation(a, b);
    if (!r) return;
    r.stance = stance;
    if (typeof opinion === 'number') r.opinion = Math.max(-100, Math.min(100, opinion));
  }
  function distance(a, b) { return Math.abs(a % 8 - b % 8) + Math.abs(Math.floor(a / 8) - Math.floor(b / 8)); }
  function nearestDistance(id, target) {
    const tiles = ownTiles(id);
    return tiles.length ? Math.min.apply(null, tiles.map(function (t) { return distance(t.id, target); })) : 999;
  }
  function player() { return game.factions[0]; }
  function canAfford(id, cost) { return RES.every(function (r) { return game.factions[id].resources[r.key] >= (cost[r.key] || 0); }); }
  function spend(id, cost) {
    if (!canAfford(id, cost)) return false;
    RES.forEach(function (r) { game.factions[id].resources[r.key] -= (cost[r.key] || 0); });
    return true;
  }
  function give(id, bundle) { RES.forEach(function (r) { game.factions[id].resources[r.key] += (bundle[r.key] || 0); }); }
  function population(id) {
    return ownTiles(id).reduce(function (n, t) {
      return n + 55 + Object.keys(t.levels).reduce(function (sum, k) { return sum + t.levels[k] * (k === 'wall' || k === 'market' ? 12 : 18); }, 0);
    }, 0);
  }
  function score(id) {
    const f = game.factions[id];
    return Math.round(ownTiles(id).length * 280 + population(id) * 1.4 + armyPower(f.troops, false) * 1.2 + RES.reduce(function (n, r) { return n + f.resources[r.key]; }, 0) * 0.06);
  }
  function ranking() { return game.factions.slice().sort(function (a, b) { return score(b.id) - score(a.id); }); }
  function upkeep(id) {
    const t = game.factions[id].troops;
    return Math.ceil(Object.keys(UNITS).reduce(function (n, k) { return n + t[k] * UNITS[k].upkeep; }, 0));
  }
  function income(id) {
    const out = blankResources(0);
    ownTiles(id).forEach(function (t) {
      RES.forEach(function (r) { out[r.key] += 8 + t.levels[r.key] * 7 + (t.terrain === r.key ? 8 : 0) + t.levels.market * 3; });
    });
    out.grain -= upkeep(id);
    return out;
  }
  function settleCost(id) {
    const count = ownTiles(id).length;
    return Object.fromEntries(RES.map(function (r) { return [r.key, SETTLE_BASE[r.key] + Math.max(0, count - 1) * 95]; }));
  }
  function buildingCost(t, key) {
    return Object.fromEntries(RES.map(function (r) { return [r.key, Math.round(BUILDINGS[key].base[r.key] * Math.pow(1.48, t.levels[key] || 0))]; }));
  }
  function message(title, detail, tone, reportId) {
    game.logs.unshift({ day: game.day, title: title, detail: detail || '', tone: tone || 'normal', reportId: reportId || null });
    if (game.logs.length > 150) game.logs.length = 150;
  }
  function notice(text, bad) {
    const node = $('toast');
    node.textContent = text;
    node.className = 'toast' + (bad ? ' bad' : '');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () { node.classList.add('hidden'); }, 3200);
  }
  function createGame() {
    game = {
      version: VERSION, seed: 1837659, day: 1, speed: 0, selected: 19, tab: 'village',
      force: 75, villageMode: 'production', buildingFocus: 'wood', missionSeq: 0, reportSeq: 0, ended: false, endSummaryDismissed: false, event: null, lastEventDay: 0,
      relations: {}, missions: [], reports: [], dominance: {}, logs: [], factions: [], tiles: []
    };
    FACTIONS.forEach(function (spec, id) {
      game.factions.push({
        id: id, name: spec.name, short: spec.short, color: spec.color, style: spec.style,
        resources: { wood: 490, clay: 470, iron: 420, grain: 520 },
        troops: { spear: 16, sword: 10, rider: 0, siege: 0 }
      });
      game.dominance[id] = 0;
    });
    for (let a = 0; a < FACTIONS.length; a++) {
      for (let b = a + 1; b < FACTIONS.length; b++) {
        game.relations[pair(a, b)] = { stance: 'neutral', opinion: rand(49) - 24, lastAid: -100 };
      }
    }
    NAMES.forEach(function (name, i) {
      const terrain = ['wood','clay','iron','grain','balanced'][(i * 7 + Math.floor(i / 8)) % 5];
      game.tiles.push({ id: i, name: name, terrain: terrain, owner: -1, militia: 13 + (i * 7) % 15, levels: freshTileLevels(), construction: null });
    });
    FACTIONS.forEach(function (f, id) {
      const t = game.tiles[f.capital]; t.owner = id; t.militia = 0;
      t.levels = { wood: 2, clay: 2, iron: 2, grain: 2, barracks: 1, wall: 1, market: 0 };
    });
    message('O continente desperta', 'Seis governantes reclamam as suas primeiras aldeias. Apenas um poderá unificar as Terras de Cinza.');
    message('A coroa é tua', 'Constrói, recruta, expande, negoceia e disputa o primeiro lugar. Termina o turno para os rivais agirem.');
    save();
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (_) { /* armazenamento indisponível */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY) || localStorage.getItem(FIRST_SAVE_KEY) || 'null');
      if (data && (data.version === 1 || data.version === VERSION) && Array.isArray(data.tiles) && data.tiles.length === 40 && Array.isArray(data.factions) && data.factions.length === 6) {
        game = data;
        game.version = VERSION;
        game.speed = 0; // Save antigo: desativa a progressão automática.
        game.force = game.force || 75;
        game.villageMode = game.villageMode || 'production';
        game.buildingFocus = game.buildingFocus || (game.villageMode === 'production' ? 'wood' : 'barracks');
        game.reports = Array.isArray(game.reports) ? game.reports : [];
        game.endSummaryDismissed = !!game.endSummaryDismissed;
        game.reportSeq = Number.isInteger(game.reportSeq) ? game.reportSeq : game.reports.reduce(function (n, r) { return Math.max(n, r.id || 0); }, 0);
        return true;
      }
    } catch (_) { /* guardar jogo novo */ }
    createGame(); return false;
  }
  function queueBuilding(id, tileId, key, quiet) {
    const t = game.tiles[tileId];
    if (!t || t.owner !== id || !BUILDINGS[key] || t.construction) return false;
    if (t.levels[key] >= 5) return false;
    const price = buildingCost(t, key);
    if (!spend(id, price)) return false;
    const days = key === 'barracks' ? 3 : 2;
    t.construction = { key: key, left: days };
    if (!quiet) message('Obras em ' + t.name, BUILDINGS[key].label + ' em construção. Conclusão em ' + days + ' dias.');
    return true;
  }
  function train(id, unitKey, qty, quiet) {
    if (!UNITS[unitKey] || !ownTiles(id).some(function (t) { return t.levels.barracks >= UNITS[unitKey].unlock; })) return false;
    const cost = Object.fromEntries(RES.map(function (r) { return [r.key, UNITS[unitKey].cost[r.key] * qty]; }));
    if (!spend(id, cost)) return false;
    game.factions[id].troops[unitKey] += qty;
    if (!quiet) message('Tropas recrutadas', qty + ' ' + UNITS[unitKey].label.toLowerCase() + ' juntam-se ao exército.');
    return true;
  }
  function travelDays(id, target) { return Math.max(1, Math.ceil(nearestDistance(id, target) / 3)); }
  function extractArmy(id, percentage) {
    const pool = game.factions[id].troops;
    const units = blankTroops();
    Object.keys(UNITS).forEach(function (k) {
      units[k] = Math.floor(pool[k] * percentage / 100);
      if (units[k] === 0 && pool[k] > 0 && percentage >= 75) units[k] = 1;
    });
    return units;
  }
  function launch(id, tileId, mode, percentage, quiet) {
    const t = game.tiles[tileId];
    if (!t || game.ended || !ownTiles(id).length || t.owner === id) return false;
    if (mode === 'settle') {
      if (t.owner !== -1 || nearestDistance(id, tileId) > 3 || !spend(id, settleCost(id))) return false;
      game.missions.push({ id: ++game.missionSeq, owner: id, tile: tileId, mode: mode, eta: travelDays(id, tileId), returnTrip: false, troops: null, loot: null });
      if (!quiet) message('Colonos enviados', 'Uma caravana parte para ' + t.name + '.');
      return true;
    }
    if (mode !== 'raid' && mode !== 'conquer') return false;
    if (mode === 'conquer' && t.owner === -1) return false;
    if (t.owner >= 0 && ['pact','alliance'].includes(relation(id, t.owner).stance)) return false;
    const troops = extractArmy(id, percentage || 75);
    if (armyCount(troops) < 3 || (mode === 'conquer' && troops.siege < 2)) return false;
    Object.keys(UNITS).forEach(function (k) { game.factions[id].troops[k] -= troops[k]; });
    game.missions.push({ id: ++game.missionSeq, owner: id, tile: tileId, mode: mode, eta: travelDays(id, tileId), returnTrip: false, troops: troops, loot: blankResources(0) });
    if (t.owner >= 0 && relation(id, t.owner).stance !== 'war') {
      setStance(id, t.owner, 'war', -85);
      message('Guerra declarada', game.factions[id].name + ' atacou o domínio de ' + game.factions[t.owner].name + '.', 'war');
    }
    if (t.owner === 0 && id !== 0) {
      message('🚨 Ataque inimigo a caminho', game.factions[id].name + ' enviou ' + format(armyCount(troops)) + ' tropas para ' + t.name + '. Chegam em ' + travelDays(id, tileId) + ' turno(s).', 'incoming');
    }
    if (!quiet) message(id === 0 ? '⚔️ Exército enviado' : 'Exército em marcha', format(armyCount(troops)) + ' soldados seguem para ' + t.name + ' (' + mode + ').', id === 0 ? 'outgoing' : 'normal');
    return true;
  }
  function casualty(source, ratio) {
    const result = blankTroops();
    Object.keys(UNITS).forEach(function (k) { result[k] = Math.max(0, Math.floor(source[k] * (1 - ratio))); });
    return result;
  }
  function subtractLost(pool, before, after) {
    Object.keys(UNITS).forEach(function (k) { pool[k] = Math.max(0, pool[k] - (before[k] - after[k])); });
  }
  function defendTroops(owner) {
    if (owner < 0) return blankTroops();
    const pool = game.factions[owner].troops;
    const sites = Math.max(1, ownTiles(owner).length);
    const result = blankTroops();
    Object.keys(UNITS).forEach(function (k) { result[k] = Math.ceil(pool[k] / sites); });
    return result;
  }
  function troopLoss(before, after) {
    const lost = blankTroops();
    Object.keys(UNITS).forEach(function (k) { lost[k] = Math.max(0, (before[k] || 0) - (after[k] || 0)); });
    return lost;
  }
  function recordBattle(battle) {
    if (battle.attacker !== 0 && battle.defender !== 0) return;
    const report = Object.assign({ id: ++game.reportSeq, day: game.day, read: false }, battle);
    game.reports.unshift(report);
    if (game.reports.length > 120) game.reports.length = 120;
    const defending = report.defender === 0;
    const success = defending ? !report.victory : report.victory;
    const icon = defending ? (success ? '🛡️' : '🚨') : '⚔️';
    const title = defending
      ? (success ? 'Defesa vitoriosa' : report.conquered ? 'Aldeia conquistada pelo inimigo' : 'Aldeia saqueada')
      : (success ? (report.conquered ? 'Conquista vitoriosa' : 'Ataque vitorioso') : 'Ataque repelido');
    const rival = defending ? report.attacker : report.defender;
    const enemyName = rival < 0 ? 'milícias neutras' : game.factions[rival].name;
    const lost = defending ? report.defenders.lost : report.attackers.lost;
    const detail = (defending ? 'Defendeste ' : 'Atacaste ') + game.tiles[report.tile].name +
      ' contra ' + enemyName + '. Perdas: ' + format(armyCount(lost)) +
      ' soldados. Saque: ' + costText(report.loot) + '.';
    message(icon + ' ' + title, detail, defending ? 'incoming' : 'outgoing', report.id);
  }
  function resolveMission(m) {
    const target = game.tiles[m.tile];
    if (m.returnTrip) {
      Object.keys(UNITS).forEach(function (k) { game.factions[m.owner].troops[k] += m.troops[k]; });
      give(m.owner, m.loot);
      if (m.owner === 0) message('🏠 Tropas regressaram', 'Os sobreviventes voltaram de ' + target.name + ' com ' + costText(m.loot) + '.');
      return true;
    }
    if (m.mode === 'settle') {
      if (target.owner === -1) {
        target.owner = m.owner; target.militia = 0; target.levels = freshTileLevels();
        message('🏡 Nova aldeia fundada', game.factions[m.owner].name + ' estabeleceu uma aldeia em ' + target.name + '.');
      } else {
        const refund = Object.fromEntries(RES.map(function (r) { return [r.key, Math.floor(SETTLE_BASE[r.key] * 0.4)]; }));
        give(m.owner, refund);
        if (m.owner === 0) message('Corrida perdida', 'Outro império ocupou ' + target.name + ' antes dos teus colonos. Parte dos recursos foi recuperada.', 'war');
      }
      return true;
    }
    const defender = target.owner;
    const attackersBefore = clone(m.troops);
    const defendersBefore = defendTroops(defender);
    const militiaBefore = defender === -1 ? target.militia : 0;
    const baseDefense = target.militia * 2.4 + armyPower(defendersBefore, true) + target.levels.wall * 16 + 8;
    const attack = armyPower(m.troops, false) * (0.88 + rng() * 0.28);
    const victory = attack >= baseDefense;
    const atkLoss = victory ? Math.min(0.38, 0.09 + baseDefense / (attack + 1) * 0.19) : Math.min(0.92, 0.44 + baseDefense / (attack + baseDefense + 1) * 0.35);
    const defLoss = victory ? 0.68 + rng() * 0.31 : 0.08 + rng() * 0.22;
    m.troops = casualty(m.troops, atkLoss);
    const defendersAfter = casualty(defendersBefore, defLoss);
    if (defender >= 0) subtractLost(game.factions[defender].troops, defendersBefore, defendersAfter);
    else target.militia = Math.floor(target.militia * (1 - defLoss));
    let conquered = false;
    if (victory) {
      conquered = m.mode === 'conquer' && m.troops.siege >= 2 && defender >= 0 && attack >= baseDefense * 1.15;
      if (conquered) {
        target.owner = m.owner; target.militia = 0; target.construction = null;
        Object.keys(target.levels).forEach(function (k) { target.levels[k] = Math.max(k === 'wall' || k === 'market' ? 0 : 1, target.levels[k] - 1); });
        message('🏰 Província conquistada', game.factions[m.owner].name + ' tomou ' + target.name + ' a ' + game.factions[defender].name + '!', 'war');
      } else {
        const victim = defender >= 0 ? game.factions[defender] : null;
        RES.forEach(function (r) {
          const n = victim ? Math.min(victim.resources[r.key], 35 + rand(65)) : 28 + rand(60);
          m.loot[r.key] += n;
          if (victim) victim.resources[r.key] -= n;
        });
        if (defender !== 0 && m.owner !== 0) message('Incursão vitoriosa', game.factions[m.owner].name + ' saqueou ' + target.name + '.', 'war');
      }
    } else {
      if (defender !== 0 && m.owner !== 0) message('Exército repelido', 'Os defensores de ' + target.name + ' travaram o ataque de ' + game.factions[m.owner].name + '.', 'war');
    }
    recordBattle({
      attacker: m.owner, defender: defender, tile: m.tile, mode: m.mode,
      victory: victory, conquered: conquered,
      attackers: { sent: attackersBefore, survived: clone(m.troops), lost: troopLoss(attackersBefore, m.troops) },
      defenders: { sent: defendersBefore, survived: defendersAfter, lost: troopLoss(defendersBefore, defendersAfter) },
      militia: { sent: militiaBefore, survived: defender === -1 ? target.militia : 0, lost: defender === -1 ? militiaBefore - target.militia : 0 },
      loot: clone(m.loot)
    });
    m.returnTrip = true; m.eta = travelDays(m.owner, m.tile);
    return false;
  }
  function nearestFree(id) {
    return game.tiles.filter(function (t) { return t.owner === -1 && nearestDistance(id, t.id) <= 3 && !game.missions.some(function (m) { return m.mode === 'settle' && m.tile === t.id; }); })
      .sort(function (a, b) {
        const av = (a.terrain === 'grain' ? 25 : 0) + (a.terrain === 'iron' ? 15 : 0) - nearestDistance(id, a.id) * 6 + (a.id * 7 % 13);
        const bv = (b.terrain === 'grain' ? 25 : 0) + (b.terrain === 'iron' ? 15 : 0) - nearestDistance(id, b.id) * 6 + (b.id * 7 % 13);
        return bv - av;
      })[0];
  }
  function aiAct(id) {
    const f = game.factions[id]; const villages = ownTiles(id);
    if (!villages.length) return;
    const pending = game.missions.some(function (m) { return m.owner === id && !m.returnTrip; });
    const plot = !pending ? nearestFree(id) : null;
    if (plot && canAfford(id, settleCost(id)) && (game.day > 2 || f.style === 'economic')) {
      if (launch(id, plot.id, 'settle', 0, true)) return;
    }
    if (game.day > 8 && rng() < 0.12) {
      const possible = game.factions.filter(function (other) {
        return other.id !== id && ownTiles(other.id).some(function (t) { return nearestDistance(id, t.id) <= 3; }) && ['neutral','pact'].includes(relation(id, other.id).stance);
      });
      if (possible.length) {
        const target = possible[rand(possible.length)];
        const r = relation(id, target.id);
        if (r.stance === 'pact' && (f.style === 'diplomatic' || f.style === 'defensive') && r.opinion >= 20) {
          setStance(id, target.id, 'alliance', r.opinion + 12);
          message('Nova aliança', f.name + ' e ' + target.name + ' uniram as suas forças.');
        } else if (r.stance === 'neutral' && (f.style === 'aggressive' || f.style === 'opportunist') && armyPower(f.troops) > armyPower(target.troops) * 1.15) {
          setStance(id, target.id, 'war', -80);
          message('Fronteira em chamas', f.name + ' declarou guerra a ' + target.name + '.', 'war');
        } else if (r.stance === 'neutral' && (f.style === 'diplomatic' || f.style === 'defensive') && r.opinion >= -4) {
          setStance(id, target.id, 'pact', 26);
          message('Novo acordo', f.name + ' assinou um pacto com ' + target.name + '.');
        }
      }
    }
    if (!pending && armyCount(f.troops) >= 28 && rng() < (f.style === 'aggressive' ? 0.36 : 0.18)) {
      const enemies = game.tiles.filter(function (t) { return t.owner >= 0 && t.owner !== id && relation(id, t.owner).stance === 'war' && nearestDistance(id, t.id) <= 4; });
      if (enemies.length) {
        enemies.sort(function (a, b) { return nearestDistance(id, a.id) - nearestDistance(id, b.id); });
        const t = enemies[0]; const defense = armyPower(defendTroops(t.owner), true) + t.levels.wall * 16;
        if (armyPower(f.troops, false) * .7 > defense * .9) {
          const mode = f.troops.siege >= 3 ? 'conquer' : 'raid';
          if (launch(id, t.id, mode, 80, true)) return;
        }
      }
    }
    // A corrida territorial consome recursos, mas não bloqueia decisões de guerra e diplomacia.
    if (plot && (f.style === 'aggressive' ? game.day % 3 !== id % 3 : game.day % 6 !== id % 6)) return;
    const capital = villages[0];
    if (!capital.construction && rng() < 0.48) {
      let key;
      if (game.day > 17 && capital.levels.barracks < 3 && (f.style === 'aggressive' || f.style === 'opportunist')) key = 'barracks';
      else key = ['wood','clay','iron','grain','grain','barracks','market'][rand(7)];
      if (queueBuilding(id, capital.id, key, true)) return;
    }
    if (rng() < 0.75) {
      const barracks = Math.max.apply(null, villages.map(function (t) { return t.levels.barracks; }));
      const options = ['spear', 'sword'];
      if (barracks >= 2) options.push('rider');
      if (barracks >= 3 && game.day > 20) options.push('siege');
      const k = options[rand(options.length)];
      train(id, k, k === 'siege' ? 2 : 4, true);
    }
  }
  function produceAndBuild() {
    game.factions.forEach(function (f) {
      if (!ownTiles(f.id).length) return;
      const rates = income(f.id);
      RES.forEach(function (r) { f.resources[r.key] = Math.max(0, f.resources[r.key] + rates[r.key]); });
      if (rates.grain < 0 && f.resources.grain === 0 && armyCount(f.troops)) {
        const k = ['spear','sword','rider','siege'].find(function (u) { return f.troops[u] > 0; });
        if (k) { f.troops[k] = Math.max(0, f.troops[k] - 2); if (f.id === 0) message('Deserções por fome', 'A falta de cereais obrigou soldados a abandonar o exército.', 'war'); }
      }
    });
    game.tiles.forEach(function (t) {
      if (!t.construction) return;
      t.construction.left--;
      if (t.construction.left <= 0) {
        const key = t.construction.key; t.construction = null; t.levels[key]++;
        if (t.owner === 0) message('Construção concluída', BUILDINGS[key].label + ' em ' + t.name + ' atingiu nível ' + t.levels[key] + '.');
      }
    });
  }
  function createDiplomaticEvent() {
    if (game.event || game.day < 11 || game.day - game.lastEventDay < 16 || game.day % 16 !== 0 || !ownTiles(0).length) return;
    const nearby = game.factions.filter(function (f) {
      return f.id !== 0 && ownTiles(f.id).length && relation(0, f.id).stance === 'neutral' && ownTiles(f.id).some(function (t) { return nearestDistance(0, t.id) <= 4; });
    });
    if (!nearby.length) return;
    const rival = nearby[rand(nearby.length)];
    game.event = { faction: rival.id, type: 'ultimatum' }; game.lastEventDay = game.day;
    message('Ultimato diplomático', rival.name + ' exige um tributo para manter a paz.');
  }
  function checkEnd() {
    const leaders = ranking();
    game.factions.forEach(function (f) {
      game.dominance[f.id] = ownTiles(f.id).length >= 10 && leaders[0].id === f.id ? (game.dominance[f.id] || 0) + 1 : 0;
      if (game.dominance[f.id] >= 4 && !game.ended) {
        game.ended = { winner: f.id, reason: 'dominance' };
        message('O continente tem um soberano', f.name + ' dominou pelo menos 10 províncias e liderou o ranking durante quatro dias.');
      }
    });
    if (!ownTiles(0).length && !game.ended) {
      game.ended = { winner: -1, reason: 'defeat' };
      message('A coroa caiu', 'A tua última aldeia foi conquistada. A campanha terminou.', 'war');
    }
  }
  function advanceDay() {
    if (game.ended || game.event) return;
    game.day++;
    produceAndBuild();
    const finished = [];
    game.missions.forEach(function (m) { m.eta--; if (m.eta <= 0 && resolveMission(m)) finished.push(m.id); });
    game.missions = game.missions.filter(function (m) { return !finished.includes(m.id); });
    game.factions.slice(1).forEach(function (f) { aiAct(f.id); });
    createDiplomaticEvent(); checkEnd(); refresh();
  }
  function refresh() { save(); render(); }
  function resBar() {
    const rates = income(0);
    $('resources').innerHTML = RES.map(function (r) {
      const n = rates[r.key]; return '<div class="resource"><div class="resource-icon">' + r.icon + '</div><div class="resource-main"><div class="label">' + r.label + '</div><div class="value">' + format(player().resources[r.key]) + '</div></div><span class="income ' + (n < 0 ? 'negative' : '') + '">' + (n >= 0 ? '+' : '') + format(n) + '/d</span></div>';
    }).join('');
  }
  function incomingMarches() {
    return game.missions.filter(function (m) { return m.owner !== 0 && !m.returnTrip && game.tiles[m.tile].owner === 0 && m.mode !== 'settle'; });
  }
  function renderMilitaryStrip() {
    const incoming = incomingMarches();
    const outgoing = game.missions.filter(function (m) { return m.owner === 0 && !m.returnTrip; });
    const unread = game.reports.filter(function (r) { return !r.read; }).length;
    let html = '<div class="military-label">🪖 <strong>Exército disponível</strong></div><div class="military-units">';
    Object.keys(UNITS).forEach(function (k) {
      html += '<span class="military-unit" title="' + UNITS[k].label + '">' + UNITS[k].icon + ' <strong>' + format(player().troops[k]) + '</strong></span>';
    });
    html += '</div><div class="military-activity">';
    if (incoming.length) {
      const soonest = Math.min.apply(null, incoming.map(function (m) { return m.eta; }));
      html += '<span class="incoming-alert" role="status">🚨 ' + incoming.length + ' ataque(s) a caminho · ' + soonest + ' turno(s)</span>';
    } else html += '<span class="calm-alert">🛡️ Sem ataques a caminho</span>';
    if (outgoing.length) html += '<span>⚔️ ' + outgoing.length + ' missão(ões) enviadas</span>';
    html += '</div><div class="military-action">' + actionButton('📜 Relatórios' + (unread ? ' (' + unread + ')' : ''), 'open-reports', '', unread ? 'primary' : 'subtle small') + '</div>';
    $('military-strip').innerHTML = html;
    const badge = $('report-badge');
    badge.textContent = String(unread);
    badge.classList.toggle('hidden', !unread);
  }
  function renderMap() {
    $('world-map').innerHTML = game.tiles.map(function (t) {
      const f = t.owner < 0 ? null : game.factions[t.owner];
      const symbol = f ? (t.id === FACTIONS[f.id].capital ? '🏰' : '🏘️') : TERRAIN[t.terrain].icon;
      const stance = f && f.id !== 0 ? relation(0, f.id).stance : null;
      const danger = incomingMarches().some(function (m) { return m.tile === t.id; });
      const status = danger ? '🚨' : stance === 'war' ? '⚔️' : stance === 'alliance' ? '🤝' : stance === 'pact' ? '🕊️' : '';
      const style = f ? ' style="--owner:' + f.color + '"' : '';
      return '<button class="tile terrain-' + t.terrain + (f ? ' owned' : '') + (t.id === game.selected ? ' selected' : '') +
        (danger ? ' tile-threat' : '') + '"' + style + ' type="button" data-tile="' + t.id +
        '" aria-pressed="' + (t.id === game.selected) + '" title="' + t.name + ' — ' + (f ? f.name : 'Terras neutras') +
        '"><span class="tile-symbol">' + symbol + '</span><span class="tile-terrain" title="' + TERRAIN[t.terrain].label + '">' + TERRAIN[t.terrain].icon +
        '</span><span class="tile-name">' + t.name + '</span><span class="tile-level">' + (f ? 'Nv. ' + (t.levels.wood + t.levels.clay + t.levels.iron + t.levels.grain) : '•') +
        '</span>' + (f ? '<span class="tile-marker">' + f.short + '</span>' : '') +
        (status ? '<span class="tile-status">' + status + '</span>' : '') + '</button>';
    }).join('');
    $('map-legend').innerHTML = game.factions.map(function (f) {
      return '<span class="legend-item"><i class="legend-dot" style="--dot:' + f.color + '"></i>' + f.name + '</span>';
    }).join('') + '<span class="legend-item">🌿 Neutro</span><span class="legend-item">⚔️ Guerra</span><span class="legend-item">🤝 Aliança</span><span class="legend-item">🚨 Sob ataque</span>';
  }
  function fact(label, value) { return '<div class="fact-row"><span>' + label + '</span><strong>' + value + '</strong></div>'; }
  function actionButton(label, action, attrs, style, disabled) {
    return '<button class="button ' + (style || '') + '" type="button" data-action="' + action + '" ' + (attrs || '') + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  }
  function renderSelected() {
    const t = game.tiles[game.selected];
    const f = t.owner >= 0 ? game.factions[t.owner] : null;
    const own = t.owner === 0;
    const dist = nearestDistance(0, t.id);
    const desc = own ? 'Esta aldeia produz para a tua coroa.' : f ? 'Esta aldeia pertence a outro império.' : 'Podes colonizar este território ou atacá-lo para obter recursos.';
    let body = '<div class="province-body"><div class="province-name"><span class="province-emblem">' + (f ? '♜' : TERRAIN[t.terrain].icon) + '</span><div><h3>' + t.name + '</h3><p>' + (f ? f.name : 'Terras neutras') + '</p></div></div>';
    body += '<p class="province-desc">' + TERRAIN[t.terrain].label + '. ' + desc + '</p>';
    body += fact('Terreno', TERRAIN[t.terrain].icon + ' ' + TERRAIN[t.terrain].label);
    if (t.owner >= 0) {
      body += '<div class="garrison"><strong>🛡️ Guarnição ' + (own ? 'disponível para defesa' : '(estimada)') + '</strong><div class="garrison-units">' +
        Object.keys(UNITS).map(function (k) { return '<span>' + UNITS[k].icon + ' ' + format(defendTroops(t.owner)[k]) + '</span>'; }).join('') +
        '</div></div>';
    } else body += fact('Defensores neutros', '🛡️ ' + t.militia + ' milicianos');
    if (!own) body += fact('Distância', dist === 999 ? 'Sem acesso' : dist + ' espaços');
    body += fact('Fortificação', f ? '🏰 Paliçada nível ' + t.levels.wall : 'Sem muralha');
    if (t.construction) body += fact('Em construção', BUILDINGS[t.construction.key].label + ' · ' + t.construction.left + 'd');
    body += '<div class="action-stack">';
    if (own) {
      body += '<p class="context-label">O que queres fazer?</p><div class="action-group">';
      body += actionButton('🌾 Melhorar produção', 'open-production', '', 'primary');
      body += actionButton('🏰 Edifícios e defesas', 'open-infrastructure', '', 'subtle');
      body += actionButton('⚔️ Recrutar tropas', 'open-army', '', 'subtle');
      body += '</div><p class="context-tip">Escolhe uma opção. Os campos aumentam os recursos por dia; o quartel desbloqueia novas unidades.</p>';
    } else if (!game.ended) {
      if (t.owner === -1) {
        const cost = settleCost(0);
        body += '<p class="context-label">Expansão</p><div class="action-group">';
        body += actionButton('🏡 Fundar aldeia', 'settle', '', 'primary', dist > 3 || !canAfford(0, cost));
        body += '</div><span class="action-hint">Custo: ' + costText(cost) + '. Alcance: até 3 espaços.</span>';
      } else {
        const stance = relation(0, t.owner).stance;
        body += '<p class="context-label">Reino rival</p>';
        body += '<div class="action-group">' + actionButton('♧ Ver diplomacia', 'open-diplomacy', '', 'primary') + '</div>';
        if (stance === 'pact' || stance === 'alliance') body += '<p class="muted-note">Tens um acordo com este reino. Terás de o romper antes de atacar.</p>';
      }
      body += '<h4 class="action-subheading">Ações militares</h4>';
      body += '<div class="force-label"><span>Tropas a enviar</span><strong id="force-number">' + game.force + '%</strong></div>';
      body += '<input class="force-slider" type="range" id="force-slider" min="25" max="100" step="25" value="' + game.force + '" aria-label="Percentagem de tropas enviadas">';
      const protectedTarget = f && ['pact','alliance'].includes(relation(0, f.id).stance);
      body += '<div class="action-group">';
      body += actionButton('⚔️ Saquear recursos', 'raid', '', 'subtle', armyCount(extractArmy(0, game.force)) < 3 || protectedTarget);
      if (f) body += actionButton('♜ Conquistar aldeia', 'conquer', '', 'danger', player().troops.siege < 2 || protectedTarget);
      body += '</div><span class="action-hint">Os ataques demoram dias. Para conquistar são precisas catapultas e uma vitória decisiva.</span>';
    }
    body += '</div></div>'; $('selected-province').innerHTML = body;
  }
  function renderVillage() {
    const villages = ownTiles(0);
    const focused = game.tiles[game.selected].owner === 0 ? game.tiles[game.selected] : villages[0];
    if (!focused) return '<div class="workspace-body"><p class="muted-note">O teu império não tem aldeias.</p></div>';
    let out = '<div class="workspace-body"><p class="section-intro">Clica num campo ou edifício acima para escolher a melhoria. Cada aldeia tem uma obra de cada vez; os recursos pertencem ao tesouro do teu império.</p>';
    out += '<div class="stat-grid"><div class="stat-card"><span>Aldeias</span><strong>' + villages.length + '</strong></div><div class="stat-card"><span>População</span><strong>' + format(population(0)) + '</strong></div><div class="stat-card"><span>Produção total</span><strong>' + format(RES.reduce(function (n, r) { return n + Math.max(0, income(0)[r.key]); }, 0)) + '</strong></div></div>';
    out += '<h3 class="subheading">Aldeia ativa — ' + focused.name + '</h3>';
    out += '<div class="building-list">';
    Object.keys(BUILDINGS).filter(function (k) { return game.villageMode === 'infrastructure' ? !['wood','clay','iron','grain'].includes(k) : ['wood','clay','iron','grain'].includes(k); }).sort(function (a, b) { return (a === game.buildingFocus ? -1 : b === game.buildingFocus ? 1 : 0); }).forEach(function (k) {
      const lv = focused.levels[k]; const cost = buildingCost(focused, k);
      const can = !focused.construction && lv < 5 && canAfford(0, cost);
      const status = focused.construction && focused.construction.key === k ? 'Em obras · ' + focused.construction.left + 'd' : lv >= 5 ? 'Máximo' : 'Nível ' + lv;
      out += '<div class="entry ' + (game.buildingFocus === k ? 'selected-building' : '') + '"><div><strong>' + BUILDINGS[k].icon + ' ' + BUILDINGS[k].label + '</strong> <span class="pill neutral">' + status + '</span><small>' + BUILDINGS[k].desc + '<br>' + (lv < 5 ? costText(cost) : 'Nível máximo atingido') + '</small></div>' + actionButton('Melhorar', 'build', 'data-key="' + k + '" data-village="' + focused.id + '"', 'small', !can) + '</div>';
    });
    out += '</div>';
    return out + '</div></div>';
  }

  function renderArmy() {
    const f = player();
    let out = '<div class="workspace-body"><p class="section-intro">Recruta unidades e envia forças a partir do mapa. Os soldados enviados deixam temporariamente o exército disponível.</p><div class="stat-grid">';
    out += '<div class="stat-card"><span>Soldados disponíveis</span><strong>' + format(armyCount(f.troops)) + '</strong></div><div class="stat-card"><span>Poder ofensivo</span><strong>' + format(armyPower(f.troops)) + '</strong></div><div class="stat-card"><span>Consumo / dia</span><strong>' + format(upkeep(0)) + '</strong></div></div><h3 class="subheading">Recrutamento</h3><div class="unit-list">';
    const barracks = Math.max.apply(null, ownTiles(0).map(function (t) { return t.levels.barracks; }).concat([0]));
    Object.keys(UNITS).forEach(function (k) {
      const u = UNITS[k]; const cost = Object.fromEntries(RES.map(function (r) { return [r.key, u.cost[r.key] * 5]; }));
      out += '<div class="entry"><div><strong>' + u.icon + ' ' + u.label + ' · ' + format(f.troops[k]) + '</strong><small>Ataque ' + u.attack + ' · Defesa ' + u.defense + ' · Quartel Nv. ' + u.unlock + '<br>5 unidades: ' + costText(cost) + '</small></div>' + actionButton('Recrutar 5', 'train', 'data-unit="' + k + '"', 'small', barracks < u.unlock || !canAfford(0, cost)) + '</div>';
    });
    out += '</div><h3 class="subheading">Exércitos em marcha</h3><div class="mission-list">';
    const moving = game.missions.filter(function (m) { return m.owner === 0; });
    if (!moving.length) out += '<p class="muted-note">Nenhuma missão em curso. Seleciona uma província no mapa para enviar colonos ou tropas.</p>';
    moving.forEach(function (m) { out += '<div class="entry"><div><strong>' + (m.mode === 'settle' ? 'Colonos' : m.mode === 'raid' ? 'Incursão' : 'Conquista') + ' · ' + game.tiles[m.tile].name + '</strong><small>' + (m.returnTrip ? 'A regressar' : 'A caminho') + ' · ' + m.eta + ' dia(s)' + (m.troops ? ' · ' + armyCount(m.troops) + ' soldados' : '') + '</small></div><span class="pill">' + (m.returnTrip ? 'Regresso' : 'Em marcha') + '</span></div>'; });
    return out + '</div></div>';
  }
  function stanceName(stance) { return { neutral: 'Neutro', pact: 'Não agressão', alliance: 'Aliança', war: 'Em guerra' }[stance] || stance; }
  function renderDiplomacy() {
    let out = '<div class="workspace-body"><p class="section-intro">Uma aliança protege fronteiras e permite pedir apoio. Presentes melhoram relações, mas rivais poderosos também podem ameaçar-te.</p><div class="diplomacy-list">';
    game.factions.slice(1).forEach(function (f) {
      const r = relation(0, f.id);
      out += '<div class="entry"><div><strong><i class="faction-swatch" style="--swatch:' + f.color + '"></i>' + f.name + '</strong> <span class="pill ' + (r.stance === 'war' ? 'war' : r.stance === 'neutral' ? 'neutral' : 'pact') + '">' + stanceName(r.stance) + '</span><small>Opinião ' + r.opinion + ' · ' + ownTiles(f.id).length + ' aldeias · Poder ' + format(armyPower(f.troops)) + '<br>Perfil: ' + ({ aggressive: 'Agressivo', economic: 'Economista', diplomatic: 'Diplomata', opportunist: 'Oportunista', defensive: 'Defensivo' }[f.style]) + '</small></div><div class="entry-actions">';
      out += actionButton('Presente', 'gift', 'data-faction="' + f.id + '"', 'small', !canAfford(0, { wood: 70, grain: 70 }) || r.stance === 'war');
      if (r.stance === 'neutral') out += actionButton('Propor pacto', 'pact', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'pact') out += actionButton('Propor aliança', 'alliance', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'alliance') out += actionButton('Pedir apoio', 'aid', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'war') out += actionButton('Propor paz', 'peace', 'data-faction="' + f.id + '"', 'small');
      else out += actionButton(r.stance === 'neutral' ? 'Declarar guerra' : 'Romper acordo', r.stance === 'neutral' ? 'war' : 'break', 'data-faction="' + f.id + '"', 'small danger');
      out += '</div></div>';
    });
    return out + '</div></div>';
  }
  function renderRanking() {
    let out = '<div class="workspace-body"><p class="section-intro">Classificação dinâmica: aldeias, população, força militar e economia. Para vencer, lidera com pelo menos 10 aldeias durante quatro dias consecutivos.</p><div class="rank-list"><div class="rank-row heading"><span>#</span><span>Império</span><span class="num">Aldeias</span><span class="num">Pontos</span></div>';
    ranking().forEach(function (f, i) {
      out += '<div class="rank-row' + (f.id === 0 ? ' player' : '') + '"><strong>' + (i + 1) + '</strong><strong><i class="faction-swatch" style="--swatch:' + f.color + '"></i>' + f.name + '</strong><span class="num">' + ownTiles(f.id).length + '</span><strong class="num">' + format(score(f.id)) + '</strong></div>';
    });
    const leader = ranking()[0];
    out += '</div><h3 class="subheading">Corrida pela coroa</h3><p class="muted-note">' + leader.name + ' lidera o ranking com ' + ownTiles(leader.id).length + ' aldeias. Domínio consolidado: ' + (game.dominance[leader.id] || 0) + '/4 dias. É necessário possuir 10 aldeias para iniciar esta contagem.</p>';
    return out + '</div>';
  }
  function reportUnits(units) {
    return Object.keys(UNITS).map(function (k) {
      return '<span title="' + UNITS[k].label + '">' + UNITS[k].icon + ' <strong>' + format(units[k] || 0) + '</strong></span>';
    }).join('');
  }
  function battleSide(title, values) {
    return '<div class="battle-side"><h4>' + title + '</h4><div class="battle-columns">' +
      '<div><small>Envolvidas</small><div class="battle-units">' + reportUnits(values.sent) + '</div></div>' +
      '<div><small>Perdidas</small><div class="battle-units lost">' + reportUnits(values.lost) + '</div></div>' +
      '<div><small>Sobreviventes</small><div class="battle-units">' + reportUnits(values.survived) + '</div></div>' +
      '</div></div>';
  }
  function renderReports() {
    let out = '<div class="workspace-body"><p class="section-intro">📜 Histórico das tuas ofensivas e defesas. Os números mostram tropas efetivamente envolvidas, baixas e recursos levados após o combate. As marchas ainda a caminho não aparecem aqui.</p>';
    if (!game.reports.length) return out + '<p class="muted-note">Ainda não ocorreram batalhas contra a tua coroa. Envia um ataque ou espera por uma ofensiva rival.</p></div>';
    game.reports.forEach(function (r) {
      const defending = r.defender === 0;
      const success = defending ? !r.victory : r.victory;
      const status = success ? 'Vitória' : 'Derrota';
      const side = defending ? '🚨 DEFESA' : '⚔️ ATAQUE';
      const attacker = game.factions[r.attacker].name;
      const defender = r.defender < 0 ? 'Milícias neutras' : game.factions[r.defender].name;
      out += '<article id="battle-report-' + r.id + '" class="battle-report ' + (success ? 'battle-win' : 'battle-loss') + '">';
      out += '<div class="battle-header"><div><span class="battle-type">' + side + ' · TURNO ' + r.day + '</span><h3>' + game.tiles[r.tile].name + ' <span class="pill ' + (success ? 'pact' : 'war') + '">' + (r.conquered ? '🏰 Conquista' : status) + '</span></h3></div><span class="battle-direction">' + (defending ? '🛡️ Recebido' : '⚔️ Enviado') + '</span></div>';
      out += '<p class="battle-summary">' + attacker + ' ⚔️ ' + defender + ' · ' + (r.mode === 'conquer' ? 'Tentativa de conquista' : 'Incursão') + '</p>';
      out += battleSide('⚔️ Força atacante — ' + attacker, r.attackers);
      out += battleSide('🛡️ Força defensora — ' + defender, r.defenders);
      if (r.militia.sent) out += '<div class="militia-row">🛡️ Milícias locais · Envolvidas: <strong>' + r.militia.sent + '</strong> · Mortas: <strong>' + r.militia.lost + '</strong> · Sobreviventes: <strong>' + r.militia.survived + '</strong></div>';
      const total = RES.reduce(function (n, x) { return n + (r.loot[x.key] || 0); }, 0);
      out += '<div class="loot-row"><strong>' + (total ? '💰 Recursos saqueados' : '📦 Recursos saqueados: nenhum') + '</strong>' +
        (total ? '<span>' + costText(r.loot) + '</span><small>' + (defending ? 'Saíram do teu tesouro e foram levados pelo atacante.' : 'Transportados pelos sobreviventes; entram no tesouro quando regressarem.') + '</small>' : '') + '</div>';
      out += '</article>';
    });
    return out + '</div>';
  }
  function markReportsRead() {
    game.reports.forEach(function (r) { r.read = true; });
  }
  function renderChronicle() {
    return '<div class="workspace-body"><p class="section-intro">Os adversários crescem, negociam e entram em guerra entre si. Cada notícia corresponde a um acontecimento da simulação.</p><div class="chronicle-list">' + game.logs.map(function (l) {
      return '<div class="chronicle-row"><strong class="chronicle-day">DIA ' + l.day + '</strong><div><strong>' + l.title + '</strong><p>' + l.detail + '</p></div></div>';
    }).join('') + '</div></div>';
  }
  function renderVillageList() {
    const villages = ownTiles(0);
    $('village-list').innerHTML = villages.length ? villages.map(function (t) {
      return '<button type="button" data-action="select" data-tile="' + t.id + '" class="' + (game.selected === t.id ? 'active' : '') + '" aria-label="Abrir aldeia ' + t.name + '"><span>⌂ ' + t.name + '</span><small>' + (t.id === FACTIONS[0].capital ? 'Capital' : 'Aldeia') + '</small></button>';
    }).join('') : '<p class="muted-note">Não tens aldeias.</p>';
    const selectedVillage = game.tiles[game.selected] && game.tiles[game.selected].owner === 0 ? game.selected : villages.length ? villages[0].id : -1;
    const select = $('mobile-village-select');
    select.innerHTML = villages.map(function (t) { return '<option value="' + t.id + '"' + (t.id === selectedVillage ? ' selected' : '') + '>' + t.name + '</option>'; }).join('');
    select.value = String(selectedVillage);
  }
  function renderVillageScene() {
    const villages = ownTiles(0);
    const active = game.tiles[game.selected] && game.tiles[game.selected].owner === 0 ? game.tiles[game.selected] : villages[0];
    const isTown = game.villageMode === 'infrastructure';
    $('scene-kicker').textContent = isTown ? 'EDIFÍCIOS E DEFESA' : 'CAMPOS DE RECURSOS';
    $('scene-heading').textContent = (isTown ? 'Centro da aldeia · ' : 'Terras de · ') + (active ? active.name : 'Reino perdido');
    if (!active) { $('scene-ground').innerHTML = '<p class="muted-note">Não existem aldeias sob o teu domínio.</p>'; return; }
    const positions = isTown ? [
      {key:'barracks',x:23,y:34},{key:'wall',x:78,y:34},{key:'market',x:50,y:80}
    ] : [
      {key:'wood',x:21,y:28},{key:'clay',x:78,y:28},{key:'iron',x:20,y:76},{key:'grain',x:79,y:76}
    ];
    const icons = { wood:'🌲',clay:'🧱',iron:'⛏️',grain:'🌾',barracks:'⚔️',wall:'🏰',market:'⚖️' };
    const short = {wood:'Madeira',clay:'Barro',iron:'Ferro',grain:'Cereais',barracks:'Quartel',wall:'Paliçada',market:'Mercado'};
    let out = '<div class="scene-ring ' + (isTown ? 'infrastructure' : 'production') + '">';
    out += '<div class="scene-heart"><span class="house">' + (isTown ? '🏛️' : '🏡') + '</span><strong>' + active.name + '</strong><small>' + (isTown ? 'Centro da aldeia' : 'Campos e produção') + '</small></div>';
    positions.forEach(function (p) {
      const lv = active.levels[p.key];
      const building = active.construction && active.construction.key === p.key;
      out += '<button type="button" class="scene-slot ' + (game.buildingFocus === p.key ? 'active' : '') + '" data-building="' + p.key + '" data-action="focus-building" data-key="' + p.key + '" style="--x:' + p.x + '%;--y:' + p.y + '%" aria-label="' + short[p.key] + ', nível ' + lv + ', mostrar melhoria">';
      out += '<span class="slot-icon" aria-hidden="true">' + icons[p.key] + '</span><span class="slot-name">' + short[p.key] + '</span><span class="slot-level">Nível ' + lv + '</span>';
      if (building) out += '<span class="slot-queue">Em obras · ' + active.construction.left + 'd</span>';
      out += '</button>';
    });
    out += '</div><div class="scene-note">Clica num edifício para ver os custos de melhoria ↓</div>';
    $('scene-ground').innerHTML = out;
  }
  function renderWorkspace() {
    const titles = { village: ['MELHORIAS DA ALDEIA', game.villageMode === 'production' ? 'Campos de produção' : 'Edifícios e defesa'], map: ['O CONTINENTE', 'Mapa das províncias'], army: ['ESTRATÉGIA MILITAR', 'Exército e marchas'], diplomacy: ['O JOGO DOS TRONOS', 'Diplomacia'], ranking: ['DISPUTA PELO CONTINENTE', 'Ranking dos impérios'], reports: ['HISTÓRICO MILITAR', '📜 Relatórios de batalha'], chronicle: ['HISTÓRIA EM MOVIMENTO', 'Crónicas do mundo'] };
    const item = titles[game.tab] || titles.village;
    $('workspace-kicker').textContent = item[0]; $('workspace-title').textContent = item[1];
    const layouts = { village: renderVillage, map: function () { return ''; }, army: renderArmy, diplomacy: renderDiplomacy, ranking: renderRanking, reports: renderReports, chronicle: renderChronicle };
    $('workspace-content').innerHTML = (layouts[game.tab] || renderVillage)();
    document.querySelectorAll('.nav-button').forEach(function (btn) {
      const selected = btn.dataset.tab === game.tab && (game.tab !== 'village' || btn.dataset.mode === game.villageMode);
      btn.classList.toggle('active', selected);
      if (typeof btn.setAttribute === 'function') btn.setAttribute('aria-current', selected ? 'page' : 'false');
    });
  }

  function renderDispatches() {
    $('dispatch-list').innerHTML = game.logs.slice(0, 5).map(function (l) {
      const symbol = l.tone === 'incoming' ? '🚨' : l.tone === 'outgoing' ? '⚔️' : l.tone === 'war' ? '🛡️' : '✦';
      return '<div class="dispatch-item"><span class="dispatch-bullet">' + symbol + '</span><div><span class="dispatch-time">TURNO ' + l.day + '</span><strong>' + l.title + '</strong><p>' + l.detail + '</p>' +
        (l.reportId ? actionButton('📜 Ver relatório →', 'view-report', 'data-report-id="' + l.reportId + '"', 'small subtle') : '') +
        '</div></div>';
    }).join('');
  }
  function renderEvent() {
    const node = $('event-layer');
    if (game.ended) {
      if (game.endSummaryDismissed) { node.classList.add('hidden'); node.innerHTML = ''; return; }
      const victor = game.ended.winner >= 0 ? game.factions[game.ended.winner].name : 'Os reinos rivais';
      node.classList.remove('hidden');
      node.innerHTML = '<div class="event-card" role="dialog" aria-modal="true" aria-label="Fim da campanha"><p class="eyebrow">A ÚLTIMA CRÓNICA</p><h2>' + (game.ended.winner === 0 ? 'A coroa é tua' : 'O império caiu') + '</h2><p>' + victor + ' venceu a campanha. ' + (game.ended.winner === 0 ? 'Conquistaste o direito de governar o continente.' : 'As escolhas dos reinos transformaram o mapa sem piedade.') + ' O mundo chegou ao seu desfecho no dia ' + game.day + '.</p><div class="event-actions">' + actionButton('📜 Ver relatórios', 'review-end', '', 'subtle') + actionButton('Começar nova campanha', 'restart', '', 'primary') + '</div></div>';
      return;
    }
    if (!game.event) { node.classList.add('hidden'); node.innerHTML = ''; return; }
    const rival = game.factions[game.event.faction];
    node.classList.remove('hidden');
    node.innerHTML = '<div class="event-card" role="dialog" aria-modal="true" aria-label="Ultimato diplomático"><p class="eyebrow">MENSAGEIRO À PORTA DO SALÃO</p><h2>A fronteira tem um preço</h2><p>Um emissário de <strong>' + rival.name + '</strong> chegou à tua corte. Exige 70 de madeira e 70 de cereais como garantia de paz. Recusar a proposta poderá desencadear uma guerra.</p><div class="event-actions">' + actionButton('Pagar tributo', 'event-pay', '', 'primary', !canAfford(0, {wood:70,grain:70})) + actionButton('Recusar exigência', 'event-refuse', '', 'danger') + '</div></div>';
  }
  function renderGuidance() {
    const capital = game.tiles[19];
    const built = ownTiles(0).some(function (t) { return t.construction || ['wood','clay','iron','grain'].some(function (k) { return t.levels[k] > (t.id === 19 ? 2 : 1); }); });
    const trained = game.logs.some(function (l) { return l.title === 'Tropas recrutadas'; });
    const settled = ownTiles(0).length > 1 || game.missions.some(function (m) { return m.owner === 0 && m.mode === 'settle'; });
    let title, detail, label, action;
    if (game.ended) {
      title = 'A campanha terminou'; detail = 'Consulta os resultados e começa uma nova campanha quando quiseres.'; label = 'Ver ranking'; action = 'open-ranking';
    } else if (!built) {
      title = '1. Faz a tua aldeia crescer';
      detail = 'Começa por melhorar um campo de produção. Depois termina um ou dois turnos para concluir a obra.';
      label = 'Ver campos'; action = 'guide-production';
    } else if (!trained) {
      title = '2. Prepara as primeiras tropas';
      detail = 'Recruta lanceiros ou espadachins para defender ou saquear províncias vizinhas.';
      label = 'Abrir exército'; action = 'open-army';
    } else if (!settled) {
      title = '3. Expande o teu reino';
      detail = 'Seleciona um território neutro próximo. Junta recursos suficientes e envia colonos.';
      label = 'Encontrar terreno'; action = 'guide-expand';
    } else {
      title = 'O teu reino está em movimento';
      detail = 'Constrói, prepara o exército, negoceia e observa o ranking. Termina o turno quando quiseres que os rivais ajam.';
      label = 'Ver ranking'; action = 'open-ranking';
    }
    $('guidance').innerHTML = '<div class="guidance-copy"><p class="eyebrow">O QUE FAZER A SEGUIR</p><strong>' + title + '</strong><p>' + detail + '</p></div><div class="guidance-actions">' + actionButton(label + ' ↗', action, '', 'subtle small') + '</div>';
  }
  function focusWorkspace() {
    const node = typeof document.querySelector === 'function' ? document.querySelector('.workspace') : null;
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function focusSelection() {
    if (typeof window.innerWidth !== 'number' || window.innerWidth > 900) return;
    const node = typeof document.querySelector === 'function' ? document.querySelector('.intelligence') : null;
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function navigateTo(tab, mode, target) {
    game.tab = tab;
    if (mode) game.villageMode = mode;
    if (typeof target === 'number') game.selected = target;
  }
  let mobileMenuOpen = false;
  function updateMobileMenu(open) {
    mobileMenuOpen = Boolean(open);
    $('mobile-extra-nav').classList.toggle('mobile-open', mobileMenuOpen);
    const more = $('mobile-more-toggle');
    if (typeof more.setAttribute === 'function') more.setAttribute('aria-expanded', String(mobileMenuOpen));
  }
  function focusActiveView() {
    if (typeof window.innerWidth !== 'number' || window.innerWidth > 800) return;
    const selector = game.tab === 'village' ? '#village-scene' : game.tab === 'map' ? '#map-panel' : '#workspace';
    const node = typeof document.querySelector === 'function' ? document.querySelector(selector) : null;
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function render() {
    resBar(); renderMilitaryStrip(); renderGuidance(); renderMap(); renderSelected(); renderVillageList(); renderVillageScene(); renderWorkspace(); renderDispatches(); renderEvent();
    $('village-scene').classList.toggle('hidden-pane', game.tab !== 'village');
    $('map-panel').classList.toggle('hidden-pane', game.tab !== 'map');
    $('workspace').classList.toggle('hidden-pane', game.tab === 'map');
    $('game-layout').classList.toggle('map-mode', game.tab === 'map');
    $('game-layout').classList.toggle('village-mode', game.tab === 'village');
    $('day-label').textContent = 'Turno ' + game.day;
    $('phase-label').textContent = game.day < 20 ? 'A era dos pequenos reinos' : game.day < 60 ? 'A era das conquistas' : 'A disputa pela coroa';
    $('next-day').disabled = !!game.ended || !!game.event;
    $('empire-mini').innerHTML = '<span class="tiny-label">O TEU IMPÉRIO</span><div class="mini-stat"><span>Aldeias</span><strong>' + ownTiles(0).length + '</strong></div><div class="mini-stat"><span>População</span><strong>' + format(population(0)) + '</strong></div><div class="mini-stat"><span>Posição</span><strong>#' + (ranking().findIndex(function (f) { return f.id === 0; }) + 1) + '</strong></div><div class="mini-stat"><span>Missões</span><strong>' + game.missions.filter(function (m) { return m.owner === 0; }).length + '</strong></div>';
  }

  function diplomacyAction(action, id) {
    const f = game.factions[id]; const r = relation(0, id);
    if (!f || !r || game.ended) return;
    if (action === 'gift') {
      if (!spend(0, { wood: 70, grain: 70 }) || r.stance === 'war') return notice('Faltam recursos ou estás em guerra.', true);
      give(id, { wood: 70, grain: 70 }); r.opinion = Math.min(100, r.opinion + 22);
      message('Oferta diplomática', f.name + ' recebeu os teus emissários com provisões. Relação melhorada.');
    } else if (action === 'pact' && r.stance === 'neutral') {
      if (r.opinion + (f.style === 'diplomatic' ? 20 : 0) >= 8) { setStance(0,id,'pact',r.opinion + 10); message('Pacto assinado', 'As fronteiras com ' + f.name + ' estão protegidas por um acordo de não agressão.'); }
      else { r.opinion += 2; notice('Pacto recusado. Melhora as relações primeiro.', true); }
    } else if (action === 'alliance' && r.stance === 'pact') {
      if (r.opinion >= 45) { setStance(0,id,'alliance',r.opinion + 8); message('Aliança formada', f.name + ' juntou-se à tua aliança. Podes pedir ajuda militar e económica.'); }
      else { notice('É preciso ter pelo menos 45 de opinião.', true); }
    } else if (action === 'aid' && r.stance === 'alliance') {
      if (game.day - (r.lastAid || -100) < 8 || f.resources.wood < 130 || f.resources.grain < 130 || f.troops.spear < 7) return notice('O aliado não consegue enviar apoio. Tenta mais tarde.', true);
      r.lastAid = game.day; f.resources.wood -= 100; f.resources.grain -= 100; f.troops.spear -= 5;
      give(0, { wood: 100, grain: 100 }); player().troops.spear += 5;
      r.opinion = Math.max(-100, r.opinion - 5);
      message('Reforços aliados', f.name + ' enviou 5 lanceiros, madeira e cereais em auxílio da coroa.');
    } else if (action === 'war' && r.stance === 'neutral') {
      setStance(0,id,'war',-90); message('Declaração de guerra', 'A coroa declarou guerra a ' + f.name + '.', 'war');
    } else if (action === 'peace' && r.stance === 'war') {
      if (armyPower(player().troops) > armyPower(f.troops) * 0.75 || r.opinion > -40) { setStance(0,id,'neutral',-20); message('Tratado de paz', f.name + ' aceitou cessar as hostilidades.'); }
      else notice('O rival considera a tua posição demasiado fraca para negociar.', true);
    } else if (action === 'break' && ['pact','alliance'].includes(r.stance)) {
      setStance(0,id,'neutral',r.opinion - 40);
      message('Acordo desfeito', 'A tua coroa rompeu o acordo com ' + f.name + '. A confiança ficou abalada.');
    }
  }
  function handleAction(btn) {
    const action = btn.dataset.action;
    const tileId = btn.dataset.tile !== undefined ? Number(btn.dataset.tile) : game.selected;
    const factionId = Number(btn.dataset.faction);
    if (action === 'restart') { createGame(); refresh(); return; }
    if (action === 'review-end' && game.ended) {
      game.endSummaryDismissed = true;
      navigateTo('reports'); markReportsRead(); refresh(); focusWorkspace(); return;
    }
    if (game.ended && !['open-ranking','open-reports','view-report'].includes(action)) return;
    let scrollTo = '';
    let focusReportId = 0;
    if (action === 'select' || action === 'manage') { navigateTo('village', null, action === 'select' ? tileId : game.selected); scrollTo = 'workspace'; }
    else if (action === 'village-mode') { game.villageMode = btn.dataset.mode === 'infrastructure' ? 'infrastructure' : 'production'; }
    else if (action === 'guide-production' || action === 'open-production') { navigateTo('village', 'production', ownTiles(0)[0] && game.tiles[game.selected].owner !== 0 ? ownTiles(0)[0].id : undefined); scrollTo = 'workspace'; }
    else if (action === 'open-infrastructure') { navigateTo('village', 'infrastructure', ownTiles(0)[0] && game.tiles[game.selected].owner !== 0 ? ownTiles(0)[0].id : undefined); scrollTo = 'workspace'; }
    else if (action === 'open-army') { navigateTo('army'); scrollTo = 'workspace'; }
    else if (action === 'open-diplomacy') { navigateTo('diplomacy'); scrollTo = 'workspace'; }
    else if (action === 'open-ranking') { navigateTo('ranking'); scrollTo = 'workspace'; }
    else if (action === 'open-reports' || action === 'view-report') {
      navigateTo('reports'); markReportsRead(); scrollTo = 'workspace';
      if (action === 'view-report') focusReportId = Number(btn.dataset.reportId) || 0;
    }
    else if (action === 'guide-expand') {
      const t = nearestFree(0);
      if (t) { game.selected = t.id; scrollTo = 'selection'; }
      else { notice('Não existe terreno neutro próximo. Explora outras fronteiras ou conquista uma aldeia.', true); }
    }
    else if (action === 'build') {
      if (!queueBuilding(0, Number(btn.dataset.village), btn.dataset.key)) notice('Construção indisponível ou recursos insuficientes.', true);
    } else if (action === 'train') {
      if (!train(0, btn.dataset.unit, 5)) notice('Não é possível recrutar estas unidades.', true);
    } else if (['settle','raid','conquer'].includes(action)) {
      if (!launch(0, game.selected, action, game.force)) notice('Missão indisponível: verifica custos, tropas, alcance e acordos.', true);
    } else if (['gift','pact','alliance','aid','war','peace','break'].includes(action)) {
      diplomacyAction(action, factionId);
    } else if (action === 'event-pay' && game.event) {
      if (spend(0, {wood:70,grain:70})) {
        const id = game.event.faction; give(id, {wood:70,grain:70});
        const r = relation(0,id); r.opinion = Math.min(100,r.opinion + 18);
        message('Paz comprada', 'O tributo foi entregue a ' + game.factions[id].name + '. A tensão diminuiu.');
        game.event = null;
      }
    } else if (action === 'event-refuse' && game.event) {
      const id = game.event.faction; setStance(0,id,'war',-85);
      message('O ultimato foi recusado', 'As relações com ' + game.factions[id].name + ' transformaram-se em guerra.', 'war');
      game.event = null;
    }
    refresh();
    if (scrollTo === 'workspace') focusWorkspace();
    if (scrollTo === 'selection') focusSelection();
    if (focusReportId) {
      const entry = $('battle-report-' + focusReportId);
      if (entry && typeof entry.scrollIntoView === 'function') entry.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  document.addEventListener('click', function (ev) {
    const btn = ev.target.closest('button'); if (!btn || btn.disabled) return;
    if (btn.dataset.tile !== undefined && !btn.dataset.action) { game.selected = Number(btn.dataset.tile); refresh(); focusSelection(); return; }
    if (btn.dataset.tab) { game.tab = btn.dataset.tab; if (game.tab === 'reports') markReportsRead(); refresh(); focusWorkspace(); return; }
    if (btn.dataset.action) { handleAction(btn); return; }
    if (btn.id === 'next-day') { advanceDay(); }
    if (btn.id === 'view-chronicle') { game.tab = 'chronicle'; refresh(); focusWorkspace(); }
    if (btn.id === 'back-to-map') { const map = typeof document.querySelector === 'function' ? document.querySelector('.map-panel') : null; if (map && typeof map.scrollIntoView === 'function') map.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (btn.id === 'new-game') {
      if (window.confirm('Iniciar uma nova campanha? O progresso guardado será substituído.')) { createGame(); refresh(); }
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id !== 'force-slider') return;
    game.force = Number(ev.target.value);
    $('force-number').textContent = game.force + '%';
    save();
  });
  // Os turnos só avançam por decisão explícita do jogador.
  load(); render();
  // Minimal debug interface for repeatable tests; never writes to network.
  window.KingdomsOfAsh = {
    getState: function () { return clone(game); },
    advance: advanceDay,
    reset: function () { createGame(); render(); },
    rules: { resourceTypes: RES.map(function (r) { return r.key; }), victoryVillages: 10, victoryDays: 4 }
  };
})();
