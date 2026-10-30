(function () {
  'use strict';

  const SAVE_KEY = 'kingdoms-of-ash-strategy-en';
  const PREVIOUS_SAVE_KEY = 'kingdoms-of-ash-v04';
  const LEGACY_SAVE_KEY = 'kingdoms-of-ash-v03';
  const PAGES_V03_SAVE_KEY = 'kingdoms-of-ash-v03-pages';
  const FIRST_SAVE_KEY = 'kingdoms-of-ash-v01';
  const VERSION = 3;
  const OWNER = 'Skinny-lfg/Kingdoms-of-Ash';
  const TERRAIN = {
    wood: { label: 'Woodlands', icon: '🌲', resource: 'wood' },
    clay: { label: 'Red Clay', icon: '🧱', resource: 'clay' },
    iron: { label: 'Iron Mountains', icon: '⛰️', resource: 'iron' },
    grain: { label: 'Fertile Plains', icon: '🌾', resource: 'grain' },
    balanced: { label: 'Mixed Lands', icon: '🌿', resource: null }
  };
  const RES = [
    { key: 'wood', label: 'Wood', icon: '🌲' },
    { key: 'clay', label: 'Clay', icon: '🧱' },
    { key: 'iron', label: 'Iron', icon: '⛏️' },
    { key: 'grain', label: 'Grain', icon: '🌾' }
  ];
  const UNITS = {
    spear: { label: 'Spearmen', icon: '🛡️', attack: 2, defense: 5, upkeep: 0.23, cost: { wood: 29, clay: 23, iron: 14, grain: 22 }, unlock: 1 },
    sword: { label: 'Swordsmen', icon: '⚔️', attack: 6, defense: 3, upkeep: 0.33, cost: { wood: 23, clay: 18, iron: 36, grain: 25 }, unlock: 1 },
    rider: { label: 'Cavalry', icon: '🐎', attack: 11, defense: 4, upkeep: 0.65, cost: { wood: 53, clay: 46, iron: 52, grain: 43 }, unlock: 2 },
    siege: { label: 'Catapults', icon: '💣', attack: 16, defense: 2, upkeep: 1.2, cost: { wood: 125, clay: 115, iron: 135, grain: 70 }, unlock: 3 }
  };
  const BUILDINGS = {
    wood: { label: 'Lumber Camp', desc: 'Increases wood production.', base: { wood: 55, clay: 75, iron: 40, grain: 45 } },
    clay: { label: 'Clay Pit', desc: 'Increases clay production.', base: { wood: 75, clay: 50, iron: 45, grain: 40 } },
    iron: { label: 'Iron Mine', desc: 'Increases iron production.', base: { wood: 85, clay: 65, iron: 45, grain: 40 } },
    grain: { label: 'Grain Farm', desc: 'Increases grain production.', base: { wood: 65, clay: 60, iron: 45, grain: 35 } },
    barracks: { icon: '⚔️', label: 'Barracks', desc: 'Level 2: cavalry. Level 3: catapults.', base: { wood: 105, clay: 115, iron: 100, grain: 65 } },
    wall: { icon: '🏰', label: 'Palisade', desc: 'Strengthens village defenses.', base: { wood: 95, clay: 85, iron: 65, grain: 60 } },
    market: { icon: '⚖️', label: 'Market', desc: 'Slightly improves all resource yields.', base: { wood: 85, clay: 95, iron: 80, grain: 70 } }
  };
  const FACTIONS = [
    { name: 'Ashen Crown', short: 'TU', color: '#e4bd78', style: 'player', capital: 19 },
    { name: 'Crimson Legion', short: 'LC', color: '#d77973', style: 'aggressive', capital: 0 },
    { name: 'Kingdom of Varyn', short: 'RV', color: '#73a9cf', style: 'economic', capital: 7 },
    { name: 'Merchant League', short: 'LM', color: '#b6a8d7', style: 'diplomatic', capital: 32 },
    { name: 'Ash Clan', short: 'CC', color: '#b5bf80', style: 'opportunist', capital: 39 },
    { name: 'Northern Sentinels', short: 'SN', color: '#82bfb4', style: 'defensive', capital: 4 }
  ];
  const NAMES = [
    'Karn Vell','Ardewyn','Black Sail','North Ash','Winter Tower','Crow Nest','Cold Meadow','Varyn',
    'Rockspire','Salt Wolves','Dark Iron','Watering Hole','Bone Village','Old Wall','Broken Ridge','East Bridge',
    'Forgotten Vale','Mistvale','High Road','Ashheart','Dryfield','Serpent Fang','Ancient Spring','Bell Tower',
    'Black River','Ancient Grove','Hollow Hill','Red Vein','Broken Arch','Stonehand','Crossroads','Gray Sands',
    'Tradeport','Longshadow','Hollow Forest','South Pass','Lantern Fields','Kings Tomb','Iron Lake','Ashen Mound'
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
function totalArmy(id) {
    const total = Object.assign(blankTroops(), game.factions[id].troops);
    ownTiles(id).forEach(function (v) {
      Object.keys(UNITS).forEach(function (k) { total[k] += v.garrison ? v.garrison[k] || 0 : 0; });
    });
    return total;
  }
  function terrainDefense(t) {
    return t.terrain === 'iron' ? 1.20 : t.terrain === 'wood' ? 1.12 : t.terrain === 'grain' ? 0.92 : 1;
  }
  function terrainAttack(t, army) {
    const riders = (army.rider || 0) * UNITS.rider.attack, total = Math.max(1, armyPower(army));
    if (t.terrain === 'grain') return 1 + riders / total * .17;
    if (t.terrain === 'wood') return 1 - riders / total * .12;
    return 1;
  }
  function logistics(id, target) {
    const d = nearestDistance(id,target);
    return d <= 3 ? 1 : Math.max(.75, 1 - (d - 3) * .045);
  }
  function lootCapacity(t) {
    return t.spear * 28 + t.sword * 22 + t.rider * 95 + t.siege * 12;
  }
  function sumResources(r) { return RES.reduce(function (n,x) { return n + (r[x.key]||0); },0); }
  function distributeLoot(source,cap) {
    const out = blankResources(0), total = sumResources(source);
    if(!total||!cap)return out;
    let remaining=Math.min(cap,total);
    RES.forEach(function(x) { const n=Math.min(source[x.key]||0,Math.floor(remaining * (source[x.key]||0)/total));out[x.key]=n; });
    remaining-=sumResources(out);
    while(remaining>0){const item=RES.find(function(x){return(out[x.key]||0)<(source[x.key]||0)});if(!item)break;out[item.key]++;remaining--;}
    return out;
  }
  function migrateStrategy() {
    game.siegeWarnings = Array.isArray(game.siegeWarnings) ? game.siegeWarnings : [];
    game.factions.forEach(function(f){ f.plan=f.plan||null; });
    game.tiles.forEach(function(t){
      t.garrison=t.garrison||blankTroops(); t.fortifyUntil=t.fortifyUntil||0;
      t.evacuateUntil=t.evacuateUntil||0; t.scoutUntil=t.scoutUntil||0; t.ambushUntil=t.ambushUntil||0;
      t.site=t.site||(t.id%11===0?'camp':t.id%7===0?'caravan':t.id%3===0?'farm':'wild');
      t.stock=t.stock||{wood:100,clay:100,iron:100,grain:120};
    });
    game.missions.forEach(function(m) { if (m.mode==='conquer') m.mode='siege'; });
  }
function score(id) {
    const f=game.factions[id];
    return Math.round(ownTiles(id).length*280+population(id)*1.4+armyPower(totalArmy(id))*1.2+
      RES.reduce(function(n,r){return n+f.resources[r.key];},0)*.06+
      ownTiles(id).filter(function(t){return t.terrain==='iron'||t.site==='caravan';}).length*30+ownTiles(id).filter(t=>CHOKEPOINTS.includes(t.id)).length*110);
  }

  function ranking() { return game.factions.slice().sort(function (a, b) { return score(b.id) - score(a.id); }); }
function upkeep(id) {
    const t = totalArmy(id);
    const traveling = game.missions.filter(function(m){return m.owner===id && m.troops;});
    traveling.forEach(function(m){Object.keys(UNITS).forEach(function(k){t[k]+=(m.troops[k]||0);});});
    return Math.ceil(Object.keys(UNITS).reduce(function(n,k){return n+t[k]*UNITS[k].upkeep;},0));
  }

  function income(id) {
    const out = blankResources(0);
    ownTiles(id).forEach(function (t) {
      RES.forEach(function (r) { out[r.key] += 8 + t.levels[r.key] * 7 + (t.terrain === r.key ? 8 : 0) + t.levels.market * 3; });
    });
    out.grain -= upkeep(id);
    const treaties=game.factions.filter(f=>f.id!==id&&relation(id,f.id).stance==='pact').length;
    const allies=game.factions.filter(f=>f.id!==id&&relation(id,f.id).stance==='alliance').length;
    RES.forEach(function(r){out[r.key]+=Math.floor(out[r.key]*(treaties*.025+allies*.06));});
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
      force: 75, villageMode: 'production', buildingFocus: 'wood', missionSeq: 0, reportSeq: 0, siegeWarnings: [], ended: false, endSummaryDismissed: false, event: null, lastEventDay: 0,
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
      game.tiles.push({ id: i, name: name, terrain: terrain, owner: -1, militia: i % 11 === 0 ? 17 + i * 5 % 9 : i % 7 === 0 ? 8 + i * 3 % 6 : 4 + i * 5 % 6,
        site: i % 11 === 0 ? 'camp' : i % 7 === 0 ? 'caravan' : i % 3 === 0 ? 'farm' : 'wild',
        stock: { wood: 120 + i % 7 * 29, clay: 110 + i % 5 * 25, iron: 90 + i % 4 * 22, grain: 140 + i % 6 * 34 },
        garrison: blankTroops(), fortifyUntil: 0, evacuateUntil: 0, scoutUntil: 0, ambushUntil: 0,
        levels: freshTileLevels(), construction: null });
    });
    FACTIONS.forEach(function (f, id) {
      const t = game.tiles[f.capital]; t.owner = id; t.militia = 0;
      t.levels = { wood: 2, clay: 2, iron: 2, grain: 2, barracks: 1, wall: 1, market: 0 };
      t.garrison = blankTroops();
    });
    migrateStrategy();
    // Starting troops are split between the capital garrison and the mobile reserve.
    FACTIONS.forEach(function(spec,id) {
      const tile=game.tiles[spec.capital];
      station(id,tile.id,'spear',id===0?8:7);
      station(id,tile.id,'sword',id===0?4:3);
    });
    message('The continent awakens', 'Six rulers claim their first villages. Only one may unite the Ashen Continent.');
    message('Your crown awaits', 'Build, recruit, expand and negotiate. End your turn to let rivals act.');
    save();
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (_) { /* Storage unavailable */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(PREVIOUS_SAVE_KEY) || localStorage.getItem(PAGES_V03_SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY) || localStorage.getItem(FIRST_SAVE_KEY) || 'null');
      if (data && (data.version === 1 || data.version === 2 || data.version === VERSION) && Array.isArray(data.tiles) && data.tiles.length === 40 && Array.isArray(data.factions) && data.factions.length === 6) {
        game = data;
        game.version = VERSION;
        game.speed = 0; // Legacy save: disable automatic progression.
        game.force = game.force || 75;
        game.villageMode = game.villageMode || 'production';
        game.buildingFocus = game.buildingFocus || (game.villageMode === 'production' ? 'wood' : 'barracks');
        game.reports = Array.isArray(game.reports) ? game.reports : [];
        game.endSummaryDismissed = !!game.endSummaryDismissed;
        migrateStrategy();
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
    if (!quiet) message('Obras em ' + t.name, BUILDINGS[key].label + ' under construction. Finishes in ' + days + ' turns.');
    return true;
  }
  function train(id, unitKey, qty, quiet) {
    if (!UNITS[unitKey] || !ownTiles(id).some(function (t) { return t.levels.barracks >= UNITS[unitKey].unlock; })) return false;
    const cost = Object.fromEntries(RES.map(function (r) { return [r.key, UNITS[unitKey].cost[r.key] * qty]; }));
    if (!spend(id, cost)) return false;
    game.factions[id].troops[unitKey] += qty;
    if (!quiet) message('Troops recruited', qty + ' ' + UNITS[unitKey].label.toLowerCase() + ' join the reserve.');
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
function station(id,tileId,key,qty) {
    const t=game.tiles[tileId],f=game.factions[id];if(!t||t.owner!==id||!UNITS[key])return false;
    const n=Math.min(Math.max(0,qty),f.troops[key]||0);if(!n)return false;
    f.troops[key]-=n;t.garrison[key]+=n;return true;
  }
  function withdraw(id,tileId,key,qty) {
    const t=game.tiles[tileId],f=game.factions[id];if(!t||t.owner!==id||!UNITS[key])return false;
    const n=Math.min(Math.max(0,qty),t.garrison[key]||0);if(!n)return false;
    t.garrison[key]-=n;f.troops[key]+=n;return true;
  }
  function sendReinforcement(id,from,to,percent) {
    const a=game.tiles[from],b=game.tiles[to];
    if(!a||!b||a.owner!==id||b.owner!==id||a.id===b.id)return false;
    const troops=blankTroops();
    Object.keys(UNITS).forEach(function(k){troops[k]=Math.floor(a.garrison[k]*(percent||50)/100);});
    if(!armyCount(troops))return false;
    Object.keys(UNITS).forEach(function(k){a.garrison[k]-=troops[k];});
    game.missions.push({id:++game.missionSeq,owner:id,origin:a.id,tile:b.id,mode:'reinforce',
      eta:Math.max(1,Math.ceil(distance(a.id,b.id)/3)),returnTrip:false,troops:troops,loot:blankResources(0)});
    if(id===0)message('Reinforcements sent',armyCount(troops)+' units moving to '+b.name+'.');
    return true;
  }
  function scout(id,tileId) {
    const t=game.tiles[tileId];if(!t||t.owner===id||nearestDistance(id,tileId)>7)return false;
    if(!spend(id,{wood:30,grain:40}))return false;
    t.scoutUntil=game.day+4;
    if(id===0)message('Scout report',t.name+': '+(t.owner<0?t.militia+' militia':armyCount(defendTroops(t.owner,t.id))+' stationed defenders')+
      ', resource stores ~'+sumResources(t.owner<0?t.stock:game.factions[t.owner].resources)+'.');
    return true;
  }
  function fortify(id,tileId) {
    const t=game.tiles[tileId];if(!t||t.owner!==id||t.fortifyUntil>game.day||!spend(id,{wood:45,clay:40,iron:25,grain:20}))return false;
    t.fortifyUntil=game.day+3;
    if(id===0)message('Defenses prepared',t.name+' gains a temporary defensive advantage for three turns.');
    return true;
  }

  function ambush(id,tileId){
    const t=game.tiles[tileId];if(!t||t.owner!==id||t.terrain!=='wood'||t.ambushUntil>=game.day||
      !spend(id,{wood:15,grain:40}))return false;
    t.ambushUntil=game.day+3;
    if(id===0)message('Ambush prepared',t.name+' can intercept enemy raids for three turns.');
    return true;
  }
  function evacuate(id,tileId) {
    const t=game.tiles[tileId];if(!t||t.owner!==id||!spend(id,{grain:20}))return false;
    Object.keys(UNITS).forEach(function(k){game.factions[id].troops[k]+=t.garrison[k];t.garrison[k]=0;});
    t.evacuateUntil=game.day+3;
    if(id===0)message('Evacuation ordered',t.name+' moves its garrison to the reserve and protects most of its stores for three turns.');
    return true;
  }
function launch(id,tileId,mode,percentage,quiet) {
    const t=game.tiles[tileId];
    if(!t||game.ended||!ownTiles(id).length||t.owner===id)return false;
    if(mode==='settle'){
      if(t.owner!==-1||nearestDistance(id,tileId)>3||!spend(id,settleCost(id)))return false;
      game.missions.push({id:++game.missionSeq,owner:id,tile:tileId,mode:'settle',eta:travelDays(id,tileId),
        returnTrip:false,troops:null,loot:null});
      if(!quiet)message('Settlers dispatched','Settlers are travelling to '+t.name+'.');
      return true;
    }
    if(!['raid','attack','siege'].includes(mode)||mode==='siege'&&t.owner===-1)return false;
    if(t.owner>=0&&['pact','alliance'].includes(relation(id,t.owner).stance))return false;
    const troops=extractArmy(id,percentage||75);
    if(armyCount(troops)<3||(mode==='siege'&&troops.siege<2))return false;
    Object.keys(UNITS).forEach(function(k){game.factions[id].troops[k]-=troops[k];});
    const origin=ownTiles(id).slice().sort(function(a,b){return distance(a.id,tileId)-distance(b.id,tileId);})[0].id;
    const eta=travelDays(id,tileId)+(mode==='siege'?1:0);
    game.missions.push({id:++game.missionSeq,owner:id,origin:origin,tile:tileId,mode:mode,eta:eta,
      returnTrip:false,troops:troops,loot:blankResources(0)});
    if(t.owner>=0&&relation(id,t.owner).stance!=='war'){
      setStance(id,t.owner,'war',-85);
      message('War declared',game.factions[id].name+' attacked '+game.factions[t.owner].name+'.','war');
    }
    if(t.owner===0&&id!==0)message('🚨 Incoming '+mode,game.factions[id].name+' sends '+armyCount(troops)+
      ' troops toward '+t.name+'. Arrival: '+eta+' turn(s).','incoming');
    if(!quiet)message('⚔️ '+mode+' ordered',armyCount(troops)+' troops heading to '+t.name+'. ETA '+eta+' turn(s).','outgoing');
    return true;
  }

  function casualty(source, ratio) {
    const result = blankTroops();
    Object.keys(UNITS).forEach(function (k) { const raw=(source[k]||0)*ratio; const lost=Math.floor(raw)+(rng()<(raw%1)?1:0);result[k]=Math.max(0,(source[k]||0)-lost); });
    return result;
  }
  function subtractLost(pool, before, after) {
    Object.keys(UNITS).forEach(function (k) { pool[k] = Math.max(0, pool[k] - (before[k] - after[k])); });
  }
function defendTroops(owner,tileId) {
    if(owner<0)return blankTroops();
    const tile=game.tiles[tileId];
    if(tile && tile.owner===owner)return Object.assign(blankTroops(),tile.garrison||blankTroops());
    return blankTroops();
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
      ? (success ? 'Defense victorious' : report.conquered ? 'Village conquered by an enemy' : 'Village raided')
      : (success ? (report.conquered ? 'Conquest victorious' : 'Attack victorious') : 'Attack repelled');
    const rival = defending ? report.attacker : report.defender;
    const enemyName = rival < 0 ? 'neutral militia' : game.factions[rival].name;
    const lost = defending ? report.defenders.lost : report.attackers.lost;
    const detail = (defending ? 'You defended ' : 'You attacked ') + game.tiles[report.tile].name +
      ' against ' + enemyName + '. Losses: ' + format(armyCount(lost)) +
      ' troops. Loot: ' + costText(report.loot) + '.';
    message(icon + ' ' + title, detail, defending ? 'incoming' : 'outgoing', report.id);
  }
function resolveMission(m) {
 const t=game.tiles[m.tile];
 if(m.mode==='reinforce'){
   if(t.owner===m.owner){Object.keys(UNITS).forEach(k=>t.garrison[k]+=(m.troops[k]||0));if(m.owner===0)message('Reinforcements arrived',armyCount(m.troops)+' units reached '+t.name+'.');}
   else{Object.keys(UNITS).forEach(k=>game.factions[m.owner].troops[k]+=(m.troops[k]||0));if(m.owner===0)message('Reinforcements returned','The destination changed ownership.');}
   return true;
 }
 if(m.returnTrip){
   Object.keys(UNITS).forEach(k=>game.factions[m.owner].troops[k]+=(m.troops[k]||0));
   give(m.owner,m.loot);
   if(m.owner===0)message('Army returned',armyCount(m.troops)+' troops brought '+costText(m.loot)+'.');
   return true;
 }
 if(m.mode==='settle'){
   if(t.owner===-1){t.owner=m.owner;t.militia=0;t.garrison=blankTroops();t.levels=freshTileLevels();t.construction=null;
     message('New settlement',game.factions[m.owner].name+' founded a village at '+t.name+'.');
   }else{give(m.owner,Object.fromEntries(RES.map(r=>[r.key,Math.floor(SETTLE_BASE[r.key]*.4)])));
     if(m.owner===0)message('Settlement blocked',t.name+' was occupied first. Part of the cost was refunded.','war');}
   return true;
 }
 const defender=t.owner,attackersBefore=clone(m.troops),defendersBefore=defendTroops(defender,t.id);
 if(defender>=0&&defender!==m.owner){const f=game.factions[defender];if(f.style==='opportunist'||f.style==='aggressive')f.plan={type:'retaliate',target:m.origin||t.id,ready:game.day+1};}
 const militiaBefore=defender<0?t.militia:0;
 const defenseBonus=terrainDefense(t)*(t.fortifyUntil>=game.day?1.28:1)*(t.ambushUntil>=game.day&&m.mode==='raid'?1.30:1)*(defender>=0?1+Math.min(.18,alliedCover(defender,t.id)*.06):1);
 const defense=(militiaBefore*2.3+armyPower(defendersBefore,true)+t.levels.wall*17+6)*defenseBonus;
 const supply=logistics(m.owner,t.id);
 const power=armyPower(m.troops)*(m.mode==='raid'?.92:m.mode==='siege'?.85:1.08)*
   terrainAttack(t,m.troops)*supply*(.91+rng()*.18);
 const win=power>=defense,ratio=defense/Math.max(1,power);
 const atkLoss=win?(m.mode==='raid'?Math.min(.17,.018+ratio*.085):Math.min(.4,.07+ratio*.23)):
   (m.mode==='raid'?Math.min(.34,.14+ratio*.07):Math.min(.85,.32+ratio*.18));
 const defLoss=win?(m.mode==='raid'?.25:.6)+(m.mode==='raid'?.22:.35)*rng():
   (m.mode==='raid'?.02:.08)+rng()*(m.mode==='raid'?.09:.22);
 m.troops=casualty(m.troops,atkLoss);
 const surviving=casualty(defendersBefore,defLoss);
 if(defender>=0)Object.keys(UNITS).forEach(k=>t.garrison[k]=surviving[k]);
 else t.militia=Math.floor(t.militia*(1-defLoss));
 let conquered=false;
 if(win&&m.mode==='siege'&&m.troops.siege>=2&&defender>=0&&power>=defense*1.1){
   conquered=true;Object.keys(UNITS).forEach(k=>game.factions[defender].troops[k]+=surviving[k]);
   t.owner=m.owner;t.militia=0;t.garrison=blankTroops();t.construction=null;t.fortifyUntil=0;t.evacuateUntil=0;
   Object.keys(t.levels).forEach(k=>t.levels[k]=Math.max(k==='wall'||k==='market'?0:1,t.levels[k]-1));
   message('Village conquered',game.factions[m.owner].name+' captured '+t.name+'.','war');
 }
 const cap=lootCapacity(m.troops);
 if(win&&!conquered&&m.mode==='raid'){
   const stores=defender>=0?game.factions[defender].resources:t.stock;
   const mult=t.evacuateUntil>=game.day?.18:1;
   const available=Object.fromEntries(RES.map(r=>[r.key,Math.floor(stores[r.key]*mult)]));
   const loot=distributeLoot(available,cap);
   RES.forEach(r=>{const n=Math.min(stores[r.key],loot[r.key]);stores[r.key]-=n;m.loot[r.key]=n;});
 }
 recordBattle({attacker:m.owner,defender,tile:m.tile,origin:m.origin,mode:m.mode,victory:win,conquered,
   terrain:t.terrain,supply,defensiveBonus:defenseBonus,carryCapacity:cap,
   attackers:{sent:attackersBefore,survived:clone(m.troops),lost:troopLoss(attackersBefore,m.troops)},
   defenders:{sent:defendersBefore,survived:surviving,lost:troopLoss(defendersBefore,surviving)},
   militia:{sent:militiaBefore,survived:defender<0?t.militia:0,lost:defender<0?militiaBefore-t.militia:0},
   loot:clone(m.loot)});
 m.returnTrip=true;m.eta=travelDays(m.owner,m.tile);
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

  const CHOKEPOINTS=[18,22,30];
  function strategicValue(t,id) {
    return (t.terrain==='grain'?35:0)+(t.terrain==='iron'?30:0)+(CHOKEPOINTS.includes(t.id)?75:0)+
      (t.site==='caravan'?40:0)-nearestDistance(id,t.id)*12;
  }
  function alliedCover(id,tileId) {
    return game.factions.filter(f=>f.id!==id&&relation(id,f.id).stance==='alliance'&&
      ownTiles(f.id).some(t=>distance(t.id,tileId)<=2)).length;
  }
  function planAI(id) {
    const f=game.factions[id],villages=ownTiles(id);
    if(!villages.length)return;
    if(villages.some(v=>game.missions.some(m=>m.owner!==id&&!m.returnTrip&&m.tile===v.id))){
      f.plan={type:'defensive',target:villages[0].id,ready:game.day};return;
    }
    const foes=game.tiles.filter(t=>t.owner>=0&&t.owner!==id&&nearestDistance(id,t.id)<=5&&
      relation(id,t.owner).stance==='war').sort((a,b)=>strategicValue(b,id)-strategicValue(a,id));
    if(foes.length&&(f.style==='aggressive'||f.style==='opportunist'||f.plan?.type==='retaliate')){
      f.plan={type:'offensive',target:foes[0].id,ready:game.day+1};return;
    }
    const plot=nearestFree(id);
    f.plan={type:plot?'expansion':'economy',target:plot?plot.id:villages[0].id,ready:game.day+1};
  }
  function executeAIPlan(id) {
    const f=game.factions[id],p=f.plan;
    if(!p)return false;
    const villages=ownTiles(id);if(!villages.length)return false;
    if(p.type==='defensive'){
      const threatened=villages.find(v=>game.missions.some(m=>m.owner!==id&&!m.returnTrip&&m.tile===v.id));
      if(!threatened)return false;
      const k=Object.keys(UNITS).find(k=>f.troops[k]>0);
      if(k)station(id,threatened.id,k,Math.min(9,f.troops[k]));
      if(canAfford(id,{wood:45,clay:40,iron:25,grain:20}))fortify(id,threatened.id);
      return true;
    }
    if(p.type==='offensive'&&game.day>=p.ready){
      const t=game.tiles[p.target];
      if(t.owner<0||t.owner===id||relation(id,t.owner).stance!=='war')return false;
      if(game.missions.some(m=>m.owner===id&&!m.returnTrip))return false;
      const our=armyPower(f.troops),their=armyPower(defendTroops(t.owner,t.id),true)+t.levels.wall*17;
      if(our>their*1.2&&armyCount(f.troops)>=8){
        const mode=f.troops.siege>=3&&our>their*1.7?'siege':'attack';
        if(launch(id,t.id,mode,80,true)){f.plan=null;return true;}
      }
      return false;
    }
    if(p.type==='expansion'&&game.day>=p.ready){
      const t=game.tiles[p.target];
      if(t.owner===-1&&canAfford(id,settleCost(id))&&
        !game.missions.some(m=>m.owner===id&&!m.returnTrip&&m.mode==='settle')){
        if(launch(id,t.id,'settle',0,true)){f.plan=null;return true;}
      }
    }
    return false;
  }
  function aiAct(id) {
    const f = game.factions[id]; const villages = ownTiles(id);
    if (!villages.length) return;
    if (!f.plan || game.day % 4 === id % 4) planAI(id);
    if (executeAIPlan(id)) return;
    const capitalGuard=villages[0];
    if(capitalGuard&&armyCount(capitalGuard.garrison)<12&&armyCount(f.troops)>12){
      const k=Object.keys(UNITS).find(k=>f.troops[k]>5);
      if(k)station(id,capitalGuard.id,k,Math.min(5,f.troops[k]-3));
    }
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
          message('New alliance', f.name + ' e ' + target.name + ' formed an alliance.');
        } else if (r.stance === 'neutral' && (f.style === 'aggressive' || f.style === 'opportunist') && armyPower(f.troops) > armyPower(target.troops) * 1.15) {
          setStance(id, target.id, 'war', -80);
          message('Border in flames', f.name + ' declared war on ' + target.name + '.', 'war');
        } else if (r.stance === 'neutral' && (f.style === 'diplomatic' || f.style === 'defensive') && r.opinion >= -4) {
          setStance(id, target.id, 'pact', 26);
          message('New treaty', f.name + ' signed a pact with ' + target.name + '.');
        }
      }
    }
    if (!pending && armyCount(f.troops) >= 28 && rng() < (f.style === 'aggressive' ? 0.36 : 0.18)) {
      const enemies = game.tiles.filter(function (t) { return t.owner >= 0 && t.owner !== id && relation(id, t.owner).stance === 'war' && nearestDistance(id, t.id) <= 4; });
      if (enemies.length) {
        enemies.sort(function (a, b) { return nearestDistance(id, a.id) - nearestDistance(id, b.id); });
        const t = enemies.sort(function(a,b){return strategicValue(b,id)-strategicValue(a,id);})[0]; const defense = armyPower(defendTroops(t.owner,t.id), true) + t.levels.wall * 16;
        if (armyPower(f.troops, false) * .7 > defense * .9) {
          const mode = f.troops.siege >= 3 ? 'siege' : 'attack';
          if (launch(id, t.id, mode, 80, true)) return;
        }
      }
    }
    // Territorial expansion consumes resources but does not block warfare or diplomacy.
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
 game.factions.forEach(f=>{
   if(!ownTiles(f.id).length)return;
   const rates=income(f.id);
   RES.forEach(r=>f.resources[r.key]=Math.max(0,f.resources[r.key]+rates[r.key]));
   if(rates.grain<0&&f.resources.grain===0&&armyCount(totalArmy(f.id))){
     const reserve=Object.keys(UNITS).find(k=>f.troops[k]>0),tile=ownTiles(f.id)[0];
     const k=reserve||Object.keys(UNITS).find(k=>tile.garrison[k]>0);
     if(k){if(reserve)f.troops[k]=Math.max(0,f.troops[k]-2);else tile.garrison[k]=Math.max(0,tile.garrison[k]-2);
       if(f.id===0)message('Starvation','Two troops deserted because grain ran out.','war');}
   }
 });
 game.tiles.forEach(t=>{
   if(t.owner<0){
     const factor=t.site==='farm'?1.5:t.site==='caravan'?1.8:t.site==='camp'?.55:1;
     RES.forEach(r=>{const max=400+(t.site==='caravan'?250:t.site==='farm'?120:0);
       t.stock[r.key]=Math.min(max,t.stock[r.key]+Math.ceil((8+(t.terrain===r.key?8:0))*factor));});
     if(t.site!=='camp'&&game.day%3===0)t.militia=Math.min(14,t.militia+1);
     if(t.site==='camp'&&game.day%5===0)t.militia=Math.min(30,t.militia+2);
   }
   if(t.construction){t.construction.left--;if(t.construction.left<=0){
     const k=t.construction.key;t.construction=null;t.levels[k]++;
     if(t.owner===0)message('Construction finished',BUILDINGS[k].label+' reached level '+t.levels[k]+' in '+t.name+'.');
   }}
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
    message('Diplomatic ultimatum', rival.name + ' demands tribute in exchange for peace.');
  }
  function checkEnd() {
    const leaders = ranking();
    game.factions.forEach(function (f) {
      game.dominance[f.id] = ownTiles(f.id).length >= 10 && leaders[0].id === f.id ? (game.dominance[f.id] || 0) + 1 : 0;
      if (game.dominance[f.id] >= 4 && !game.ended) {
        game.ended = { winner: f.id, reason: 'dominance' };
        message('A ruler controls the continent', f.name + ' controlled 10 provinces and led the rankings for four turns.');
      }
    });
    if (!ownTiles(0).length && !game.ended) {
      game.ended = { winner: -1, reason: 'defeat' };
      message('The crown has fallen', 'Your final village was conquered. The campaign is over.', 'war');
    }
  }
  function advanceDay() {
    if (game.ended || game.event) return;
    game.day++;
    produceAndBuild();
    const finished = [];
    game.missions.forEach(function (m) { m.eta--; if (m.eta <= 0 && resolveMission(m)) finished.push(m.id); });
    game.missions = game.missions.filter(function (m) { return !finished.includes(m.id); });
    if (game.day % 6 === 0) {
      const open=game.tiles.filter(t=>t.owner<0);
      const caravans=open.filter(t=>t.site==='caravan');
      caravans.forEach(t=>t.site='wild');
      const previous=new Set(caravans.map(t=>t.id));
      const roaming=open.filter(t=>t.site==='wild'&&t.militia>0&&!previous.has(t.id));
      roaming.sort((a,b)=>strategicValue(b,0)-strategicValue(a,0));
      caravans.forEach((_,i)=>{if(roaming[i])roaming[i].site='caravan';});
      if (caravans.length) message('💰 Trade routes shifted','Merchant caravans moved across the Ashen Continent.');
    }
    game.factions.slice(1).forEach(function (f) { aiAct(f.id); });
    createDiplomaticEvent(); checkEnd(); refresh();
  }
  function refresh() { save(); render(); }
  function resBar() {
    const rates = income(0);
    $('resources').innerHTML = RES.map(function (r) {
      const n = rates[r.key]; return '<div class="resource"><div class="resource-icon">' + r.icon + '</div><div class="resource-main"><div class="label">' + r.label + '</div><div class="value">' + format(player().resources[r.key]) + '</div></div><span class="income ' + (n < 0 ? 'negative' : '') + '">' + (n >= 0 ? '+' : '') + format(n) + '/turn</span></div>';
    }).join('');
  }
  function incomingMarches() {
    return game.missions.filter(function (m) { return m.owner !== 0 && !m.returnTrip && game.tiles[m.tile].owner === 0 && m.mode !== 'settle'; });
  }
  function renderMilitaryStrip() {
    const incoming = incomingMarches();
    const outgoing = game.missions.filter(function (m) { return m.owner === 0 && !m.returnTrip; });
    const unread = game.reports.filter(function (r) { return !r.read; }).length;
    let html = '<div class="military-label">🪖 <strong>Available reserves</strong></div><div class="military-units">';
    Object.keys(UNITS).forEach(function (k) {
      html += '<span class="military-unit" title="' + UNITS[k].label + '">' + UNITS[k].icon + ' <strong>' + format(player().troops[k]) + '</strong></span>';
    });
    html += '</div><div class="military-activity">';
    if (incoming.length) {
      const soonest = Math.min.apply(null, incoming.map(function (m) { return m.eta; }));
      html += '<span class="incoming-alert" role="status">🚨 ' + incoming.length + ' incoming attack(s) · ' + soonest + ' turn(s)</span>';
    } else html += '<span class="calm-alert">🛡️ No attacks incoming</span>';
    if (outgoing.length) html += '<span>⚔️ ' + outgoing.length + ' outgoing mission(s)</span>';
    html += '</div><div class="military-action">' + actionButton('📜 Reports' + (unread ? ' (' + unread + ')' : ''), 'open-reports', '', unread ? 'primary' : 'subtle small') + '</div>';
    $('military-strip').innerHTML = html;
    const badge = $('report-badge');
    badge.textContent = String(unread);
    badge.classList.toggle('hidden', !unread);
  }
  function renderMap() {
    $('world-map').innerHTML = game.tiles.map(function (t) {
      const f = t.owner < 0 ? null : game.factions[t.owner];
      const symbol = f ? (t.id === FACTIONS[f.id].capital ? '🏰' : '🏘️') : t.site==='caravan'?'💰':t.site==='camp'?'🏴':t.site==='farm'?'🌾':TERRAIN[t.terrain].icon;
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
    }).join('') + '<span class="legend-item">🌿 Neutral</span><span class="legend-item">⚔️ War</span><span class="legend-item">🤝 Alliance</span><span class="legend-item">🚨 Under attack</span>';
  }
  function fact(label, value) { return '<div class="fact-row"><span>' + label + '</span><strong>' + value + '</strong></div>'; }
  function actionButton(label, action, attrs, style, disabled) {
    return '<button class="button ' + (style || '') + '" type="button" data-action="' + action + '" ' + (attrs || '') + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  }
function renderSelected(){
 const t=game.tiles[game.selected],f=t.owner>=0?game.factions[t.owner]:null,own=t.owner===0;
 const dist=nearestDistance(0,t.id),known=t.scoutUntil>=game.day;
 const sites={farm:'🌾 Farmstead',caravan:'💰 Trade caravan',camp:'🏴 Bandit camp',wild:'🌿 Wilderness'};
 let body='<div class="province-body"><div class="province-name"><span class="province-emblem">'+(f?'🏰':TERRAIN[t.terrain].icon)+'</span><div><h3>'+t.name+'</h3><p>'+
   (f?f.name:sites[t.site])+'</p></div></div><p class="province-desc">'+TERRAIN[t.terrain].label+
   (CHOKEPOINTS.includes(t.id)?' · Strategic pass (+110 ranking points)':'')+'</p>';
 body+=fact('Terrain',TERRAIN[t.terrain].icon+' '+TERRAIN[t.terrain].label)+
   fact('Defensive terrain',Math.round((terrainDefense(t)-1)*100)+'%')+
   fact('Supply reach',Math.round(logistics(0,t.id)*100)+'%');
 if(!own)body+=fact('Distance',dist===999?'Out of range':dist+' tiles');
 if(f){
   body+='<div class="garrison"><strong>🛡️ '+(own?'Stationed garrison':known?'Scouted garrison':'Unknown defenders')+'</strong>';
   if(own||known)body+='<div class="garrison-units">'+Object.keys(UNITS).map(k=>'<span>'+UNITS[k].icon+' '+defendTroops(t.owner,t.id)[k]+'</span>').join('')+'</div>';
   else body+='<small>Scout to discover enemy strength.</small>';
   body+='</div>'+fact('Walls','Level '+t.levels.wall);
 }else{
   body+=fact('Local militia',known?t.militia+' guards':'Unknown (scout to reveal)')+
    fact('Supplies',known?costText(t.stock):'Unknown (scout to reveal)');
 }
 if(t.fortifyUntil>=game.day)body+=fact('Prepared defenses','Until turn '+t.fortifyUntil);
 if(t.ambushUntil>=game.day)body+=fact('Forest ambush','Until turn '+t.ambushUntil);
 if(t.construction)body+=fact('Construction',BUILDINGS[t.construction.key].label+' · '+t.construction.left+' turn(s)');
 body+='<div class="action-stack">';
 if(own){
   body+='<p class="context-label">Manage this village</p><div class="action-group">'+
      actionButton('🌾 Resource fields','open-production','','primary')+
      actionButton('🏘️ Town center','open-infrastructure','','subtle')+
      actionButton('🛡️ Garrison & reserves','open-army','','subtle')+'</div>';
   const incoming=game.missions.filter(m=>m.owner!==0&&!m.returnTrip&&m.tile===t.id);
   if(incoming.length)body+='<p class="incoming-alert">🚨 '+incoming.length+' incoming attack(s); next arrival in '+Math.min(...incoming.map(m=>m.eta))+' turn(s).</p>';
   body+='<div class="action-group">'+
     actionButton('🏰 Prepare defenses (3 turns)','fortify','data-tile="'+t.id+'"','small',t.fortifyUntil>game.day||!canAfford(0,{wood:45,clay:40,iron:25,grain:20}))+
     actionButton('🏃 Evacuate troops / stores','evacuate','data-tile="'+t.id+'"','small subtle',!canAfford(0,{grain:20}))+
     (t.terrain==='wood'?actionButton('🌲 Lay ambush','ambush','data-tile="'+t.id+'"','small',t.ambushUntil>=game.day||!canAfford(0,{wood:15,grain:40})):'')+'</div>';
   const attacker=game.missions.find(m=>m.owner!==0&&!m.returnTrip&&m.tile===t.id);
   if(attacker&&game.tiles[attacker.origin]?.owner===attacker.owner)body+='<div class="action-group">'+actionButton('🗡️ Counterattack origin','counterattack','data-target="'+attacker.origin+'"','small danger',armyCount(extractArmy(0,game.force))<3)+'</div>';
 }else if(!game.ended){
   if(t.owner<0){
     body+='<h4 class="action-subheading">Expansion</h4><div class="action-group">'+
       actionButton('🏡 Found settlement','settle','','primary',dist>3||!canAfford(0,settleCost(0)))+
       '</div><small>Settlement cost: '+costText(settleCost(0))+'</small>';
   }else{
     body+='<div class="action-group">'+actionButton('🤝 Diplomacy','open-diplomacy','','subtle')+'</div>';
   }
   if(known)body+='<small>🔎 Scout intelligence valid until turn '+t.scoutUntil+'.</small>';
   body+='<div class="action-group">'+actionButton('🔎 Scout (30 wood, 40 grain)','scout','','small',dist>7||!canAfford(0,{wood:30,grain:40}))+'</div>';
   body+='<h4 class="action-subheading">Military orders</h4><div class="force-label"><span>Reserve troops to send</span><strong id="force-number">'+game.force+'%</strong></div>'+
     '<input class="force-slider" type="range" id="force-slider" min="25" max="100" step="25" value="'+game.force+'" aria-label="Percentage of reserve troops to send">';
   const blocked=f&&['pact','alliance'].includes(relation(0,f.id).stance);
   const insufficient=armyCount(extractArmy(0,game.force))<3;
   body+='<div class="action-group">'+
     actionButton('⚔️ Raid: steal supplies','raid','','small',insufficient||blocked)+
     actionButton('🗡️ Attack: destroy army','attack','','small',insufficient||blocked);
   if(f)body+=actionButton('🏰 Siege: conquer','siege','','small danger',insufficient||blocked||extractArmy(0,game.force).siege<2);
   body+='</div><small>Raids minimise casualties and collect limited supplies. Attacks destroy armies; sieges conquer villages.</small>';
   if(blocked)body+='<p class="muted-note">Break your alliance or pact to attack this faction.</p>';
 }
 $('selected-province').innerHTML=body+'</div></div>';
}

  function renderVillage() {
    const villages = ownTiles(0);
    const focused = game.tiles[game.selected].owner === 0 ? game.tiles[game.selected] : villages[0];
    if (!focused) return '<div class="workspace-body"><p class="muted-note">Your empire has no villages.</p></div>';
    let out = '<div class="workspace-body"><p class="section-intro">Choose a field or building above to upgrade it. Each village has one build queue and empire resources are shared.</p>';
    out += '<div class="stat-grid"><div class="stat-card"><span>Villages</span><strong>' + villages.length + '</strong></div><div class="stat-card"><span>Population</span><strong>' + format(population(0)) + '</strong></div><div class="stat-card"><span>Total production</span><strong>' + format(RES.reduce(function (n, r) { return n + Math.max(0, income(0)[r.key]); }, 0)) + '</strong></div></div>';
    out += '<h3 class="subheading">Active village — ' + focused.name + '</h3>';
    out += '<div class="building-list">';
    Object.keys(BUILDINGS).filter(function (k) { return game.villageMode === 'infrastructure' ? !['wood','clay','iron','grain'].includes(k) : ['wood','clay','iron','grain'].includes(k); }).sort(function (a, b) { return (a === game.buildingFocus ? -1 : b === game.buildingFocus ? 1 : 0); }).forEach(function (k) {
      const lv = focused.levels[k]; const cost = buildingCost(focused, k);
      const can = !focused.construction && lv < 5 && canAfford(0, cost);
      const status = focused.construction && focused.construction.key === k ? 'Em obras · ' + focused.construction.left + 'd' : lv >= 5 ? 'Maximum' : 'Level ' + lv;
      out += '<div class="entry ' + (game.buildingFocus === k ? 'selected-building' : '') + '"><div><strong>' + BUILDINGS[k].icon + ' ' + BUILDINGS[k].label + '</strong> <span class="pill neutral">' + status + '</span><small>' + BUILDINGS[k].desc + '<br>' + (lv < 5 ? costText(cost) : 'Maximum level reached') + '</small></div>' + actionButton('Upgrade', 'build', 'data-key="' + k + '" data-village="' + focused.id + '"', 'small', !can) + '</div>';
    });
    out += '</div>';
    return out + '</div></div>';
  }

function renderArmy(){
 const f=player(),villages=ownTiles(0),active=game.tiles[game.selected].owner===0?game.tiles[game.selected]:villages[0];
 let out='<div class="workspace-body"><p class="section-intro">Reserve troops can raid and attack. Stationed troops defend their village. Reinforcements take turns to travel.</p>';
 out+='<div class="stat-grid"><div class="stat-card"><span>Reserve troops</span><strong>'+armyCount(f.troops)+'</strong></div>'+
  '<div class="stat-card"><span>Total armies</span><strong>'+armyCount(totalArmy(0))+'</strong></div>'+
  '<div class="stat-card"><span>Food upkeep / turn</span><strong>'+upkeep(0)+'</strong></div></div>';
 out+='<h3 class="subheading">Recruit to reserve</h3><div class="unit-list">';
 const barracks=Math.max(...villages.map(t=>t.levels.barracks),0);
 Object.keys(UNITS).forEach(k=>{
   const u=UNITS[k],cost=Object.fromEntries(RES.map(r=>[r.key,u.cost[r.key]*5]));
   out+='<div class="entry"><div><strong>'+u.icon+' '+u.label+' · '+f.troops[k]+' reserve</strong><small>'+
     'Attack '+u.attack+' · Defense '+u.defense+' · Barracks Lv. '+u.unlock+'<br>5 units: '+costText(cost)+
     '</small></div>'+actionButton('Recruit 5','train','data-unit="'+k+'"','small',barracks<u.unlock||!canAfford(0,cost))+'</div>';
 });
 out+='</div>';
 if(active){
  out+='<h3 class="subheading">🛡️ Garrison — '+active.name+'</h3><p class="section-intro">Station reserves to defend. Withdraw troops to use them in field operations.</p><div class="unit-list">';
  Object.keys(UNITS).forEach(k=>{
    out+='<div class="entry"><div><strong>'+UNITS[k].icon+' '+UNITS[k].label+'</strong><small>Stationed: '+active.garrison[k]+' · Reserve: '+f.troops[k]+'</small></div><div class="entry-actions">'+
       actionButton('Station 5','station','data-unit="'+k+'" data-tile="'+active.id+'"','small',f.troops[k]===0)+
       actionButton('Withdraw 5','withdraw','data-unit="'+k+'" data-tile="'+active.id+'"','small',active.garrison[k]===0)+'</div></div>';
  });
  out+='</div><div class="action-group">'+actionButton('🏰 Fortify','fortify','data-tile="'+active.id+'"','small',active.fortifyUntil>game.day||!canAfford(0,{wood:45,clay:40,iron:25,grain:20}))+
    actionButton('🏃 Evacuate','evacuate','data-tile="'+active.id+'"','small subtle',!canAfford(0,{grain:20}))+'</div>';
  if(villages.length>1){
   out+='<h3 class="subheading">Send reinforcements (50% of garrison)</h3><div class="action-group">';
   villages.filter(v=>v.id!==active.id).forEach(v=>out+=actionButton('🛡️ '+v.name,'reinforce',
     'data-from="'+active.id+'" data-to="'+v.id+'"','small',!armyCount(active.garrison)));
   out+='</div>';
  }
 }
 const farmLedger=game.reports.filter(r=>r.attacker===0&&r.mode==='raid').slice(0,12);
 if(farmLedger.length){
   out+='<h3 class="subheading">💰 Raid profitability (last 12)</h3><div class="unit-list">';
   farmLedger.forEach(r=>{
     const net=sumResources(r.loot)-replacementCost(r.attackers.lost);
     out+='<div class="entry"><div><strong>'+game.tiles[r.tile].name+'</strong><small>Turn '+r.day+' · Loot '+sumResources(r.loot)+' · Loss costs '+replacementCost(r.attackers.lost)+'</small></div><span class="pill '+(net>=0?'pact':'war')+'">'+(net>=0?'+':'')+net+'</span></div>';
   });
   out+='</div>';
 }
 out+='<h3 class="subheading">Troops in motion</h3><div class="mission-list">';
 const moving=game.missions.filter(m=>m.owner===0||(!m.returnTrip&&game.tiles[m.tile].owner===0));
 if(!moving.length)out+='<p class="muted-note">No marching armies. Select a target on the map or send reinforcements.</p>';
 moving.forEach(m=>out+='<div class="entry"><div><strong>'+((m.owner===0)?'⚔️ Outgoing':'🚨 Incoming')+' '+m.mode+' · '+game.tiles[m.tile].name+
   '</strong><small>'+(m.returnTrip?'Returning':'Arriving')+' in '+m.eta+' turn(s) · '+(m.troops?armyCount(m.troops)+' units':'Settlers')+
   '</small></div></div>');
 return out+'</div></div>';
}

  function stanceName(stance) { return { neutral: 'Neutral', pact: 'Non-aggression pact', alliance: 'Alliance', war: 'At war' }[stance] || stance; }
  function renderDiplomacy() {
    let out = '<div class="workspace-body"><p class="section-intro">Alliances help protect your borders and allow support. Gifts improve relations, but strong rivals can still threaten you.</p><div class="diplomacy-list">';
    game.factions.slice(1).forEach(function (f) {
      const r = relation(0, f.id);
      out += '<div class="entry"><div><strong><i class="faction-swatch" style="--swatch:' + f.color + '"></i>' + f.name + '</strong> <span class="pill ' + (r.stance === 'war' ? 'war' : r.stance === 'neutral' ? 'neutral' : 'pact') + '">' + stanceName(r.stance) + '</span><small>Opinion ' + r.opinion + ' · ' + ownTiles(f.id).length + ' villages · Power ' + format(armyPower(f.troops)) + '<br>Personality: ' + ({ aggressive: 'Aggressive', economic: 'Economic', diplomatic: 'Diplomatic', opportunist: 'Opportunist', defensive: 'Defensive' }[f.style]) + '</small>' + (f.plan && ownTiles(f.id).some(t=>t.scoutUntil>=game.day) ? '<small>📜 Scouted plan: '+f.plan.type+' near '+game.tiles[f.plan.target].name+'</small>' : '<small>🔎 Scout their villages to discover plans.</small>') + '</div><div class="entry-actions">';
      out += actionButton('Gift', 'gift', 'data-faction="' + f.id + '"', 'small', !canAfford(0, { wood: 70, grain: 70 }) || r.stance === 'war');
      if (r.stance === 'neutral') out += actionButton('Offer pact', 'pact', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'pact') out += actionButton('Offer alliance', 'alliance', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'alliance') out += actionButton('Request aid', 'aid', 'data-faction="' + f.id + '"', 'small');
      if (r.stance === 'war') out += actionButton('Offer peace', 'peace', 'data-faction="' + f.id + '"', 'small');
      else out += actionButton(r.stance === 'neutral' ? 'Declare war' : 'Romper acordo', r.stance === 'neutral' ? 'war' : 'break', 'data-faction="' + f.id + '"', 'small danger');
      out += '</div></div>';
    });
    return out + '</div></div>';
  }
  function renderRanking() {
    let out = '<div class="workspace-body"><p class="section-intro">Dynamic rankings reward villages, population, military strength, resources and strategic passes. Lead the table with at least 10 villages for four turns to win.</p><div class="rank-list"><div class="rank-row heading"><span>#</span><span>Empire</span><span class="num">Villages</span><span class="num">Score</span></div>';
    ranking().forEach(function (f, i) {
      out += '<div class="rank-row' + (f.id === 0 ? ' player' : '') + '"><strong>' + (i + 1) + '</strong><strong><i class="faction-swatch" style="--swatch:' + f.color + '"></i>' + f.name + '</strong><span class="num">' + ownTiles(f.id).length + '</span><strong class="num">' + format(score(f.id)) + '</strong></div>';
    });
    const leader = ranking()[0];
    out += '</div><h3 class="subheading">Corrida pela coroa</h3><p class="muted-note">' + leader.name + ' lidera o ranking com ' + ownTiles(leader.id).length + ' villages. Dominance held: ' + (game.dominance[leader.id] || 0) + '/4 turns. You need 10 villages to begin this countdown.</p>';
    return out + '</div>';
  }
  function reportUnits(units) {
    return Object.keys(UNITS).map(function (k) {
      return '<span title="' + UNITS[k].label + '">' + UNITS[k].icon + ' <strong>' + format(units[k] || 0) + '</strong></span>';
    }).join('');
  }
  function battleSide(title, values) {
    return '<div class="battle-side"><h4>' + title + '</h4><div class="battle-columns">' +
      '<div><small>Committed</small><div class="battle-units">' + reportUnits(values.sent) + '</div></div>' +
      '<div><small>Lost</small><div class="battle-units lost">' + reportUnits(values.lost) + '</div></div>' +
      '<div><small>Survivors</small><div class="battle-units">' + reportUnits(values.survived) + '</div></div>' +
      '</div></div>';
  }
  function replacementCost(lost) {
    return Object.keys(UNITS).reduce(function(total,k){
      return total+(lost[k]||0)*sumResources(UNITS[k].cost);
    },0);
  }
  function renderReports() {
    let out = '<div class="workspace-body"><p class="section-intro">📜 Your offensive and defensive battles: forces committed, survivors, losses, plunder and terrain effects.</p>';
    if (!game.reports.length) return out + '<p class="muted-note">No battles yet. Raid a nearby site or prepare to defend against enemy attacks.</p></div>';
    game.reports.forEach(function (r) {
      const defending = r.defender === 0;
      const success = defending ? !r.victory : r.victory;
      const status = success ? 'Victory' : 'Defeat';
      const side = defending ? '🚨 DEFENSE' : '⚔️ ATAQUE';
      const attacker = game.factions[r.attacker].name;
      const defender = r.defender < 0 ? 'Neutral militia' : game.factions[r.defender].name;
      out += '<article id="battle-report-' + r.id + '" class="battle-report ' + (success ? 'battle-win' : 'battle-loss') + '">';
      out += '<div class="battle-header"><div><span class="battle-type">' + side + ' · TURN ' + r.day + '</span><h3>' + game.tiles[r.tile].name + ' <span class="pill ' + (success ? 'pact' : 'war') + '">' + (r.conquered ? '🏰 Conquista' : status) + '</span></h3></div><span class="battle-direction">' + (defending ? '🛡️ Recebido' : '⚔️ Enviado') + '</span></div>';
      out += '<p class="battle-summary">' + attacker + ' ⚔️ ' + defender + ' · ' + (r.mode === 'conquer' ? 'Siege attempt' : 'Raid') + '</p>';
      out += battleSide('⚔️ Attacking army — ' + attacker, r.attackers);
      out += battleSide('🛡️ Defending army — ' + defender, r.defenders);
      if (r.militia.sent) out += '<div class="militia-row">🛡️ Local militia · Committed: <strong>' + r.militia.sent + '</strong> · Killed: <strong>' + r.militia.lost + '</strong> · Survivors: <strong>' + r.militia.survived + '</strong></div>';
      const total = RES.reduce(function (n, x) { return n + (r.loot[x.key] || 0); }, 0);
      out += '<div class="militia-row">'+(r.mode==='raid'?'💰 Raid':r.mode==='siege'?'🏰 Siege':'🗡️ Field attack')+' · '+(r.terrain?TERRAIN[r.terrain].label:'Unknown terrain')+' · Supply '+Math.round((r.supply||1)*100)+'% · Carry capacity '+(r.carryCapacity||0)+'</div>';
      const net=sumResources(r.loot)-replacementCost(r.attackers.lost);
      out += '<div class="militia-row">💰 Loot value: '+sumResources(r.loot)+' · Attacker losses: '+replacementCost(r.attackers.lost)+' · Net raid result: '+(net>=0?'+':'')+net+'</div>';
      out += '<div class="loot-row"><strong>' + (total ? '💰 Resources looted' : '📦 Resources looted: none') + '</strong>' +
        (total ? '<span>' + costText(r.loot) + '</span><small>' + (defending ? 'Taken from your treasury by the raiders.' : 'Carried by surviving raiders; delivered when they return.') + '</small>' : '') + '</div>';
      out += '</article>';
    });
    return out + '</div>';
  }
  function markReportsRead() {
    game.reports.forEach(function (r) { r.read = true; });
  }
  function renderChronicle() {
    return '<div class="workspace-body"><p class="section-intro">Rival kingdoms grow, negotiate and fight. Each entry reflects a simulated event.</p><div class="chronicle-list">' + game.logs.map(function (l) {
      return '<div class="chronicle-row"><strong class="chronicle-day">TURN ' + l.day + '</strong><div><strong>' + l.title + '</strong><p>' + l.detail + '</p></div></div>';
    }).join('') + '</div></div>';
  }
  function renderVillageList() {
    const villages = ownTiles(0);
    $('village-list').innerHTML = villages.length ? villages.map(function (t) {
      return '<button type="button" data-action="select" data-tile="' + t.id + '" class="' + (game.selected === t.id ? 'active' : '') + '" aria-label="Open village ' + t.name + '"><span>⌂ ' + t.name + '</span><small>' + (t.id === FACTIONS[0].capital ? 'Capital' : 'Village') + '</small></button>';
    }).join('') : '<p class="muted-note">You have no villages.</p>';
    const selectedVillage = game.tiles[game.selected] && game.tiles[game.selected].owner === 0 ? game.selected : villages.length ? villages[0].id : -1;
    const select = $('mobile-village-select');
    select.innerHTML = villages.map(function (t) { return '<option value="' + t.id + '"' + (t.id === selectedVillage ? ' selected' : '') + '>' + t.name + '</option>'; }).join('');
    select.value = String(selectedVillage);
  }
  function renderVillageScene() {
    const villages = ownTiles(0);
    const active = game.tiles[game.selected] && game.tiles[game.selected].owner === 0 ? game.tiles[game.selected] : villages[0];
    const isTown = game.villageMode === 'infrastructure';
    $('scene-kicker').textContent = isTown ? 'BUILDINGS & DEFENSE' : 'CAMPOS DE RECURSOS';
    $('scene-heading').textContent = (isTown ? 'Town center · ' : 'Terras de · ') + (active ? active.name : 'Reino perdido');
    if (!active) { $('scene-ground').innerHTML = '<p class="muted-note">You have no villages under your control.</p>'; return; }
    const positions = isTown ? [
      {key:'barracks',x:23,y:34},{key:'wall',x:78,y:34},{key:'market',x:50,y:80}
    ] : [
      {key:'wood',x:21,y:28},{key:'clay',x:78,y:28},{key:'iron',x:20,y:76},{key:'grain',x:79,y:76}
    ];
    const icons = { wood:'🌲',clay:'🧱',iron:'⛏️',grain:'🌾',barracks:'⚔️',wall:'🏰',market:'⚖️' };
    const short = {wood:'Wood',clay:'Clay',iron:'Iron',grain:'Grain',barracks:'Barracks',wall:'Palisade',market:'Market'};
    let out = '<div class="scene-ring ' + (isTown ? 'infrastructure' : 'production') + '">';
    out += '<div class="scene-heart"><span class="house">' + (isTown ? '🏛️' : '🏡') + '</span><strong>' + active.name + '</strong><small>' + (isTown ? 'Town center' : 'Fields and production') + '</small></div>';
    positions.forEach(function (p) {
      const lv = active.levels[p.key];
      const building = active.construction && active.construction.key === p.key;
      out += '<button type="button" class="scene-slot ' + (game.buildingFocus === p.key ? 'active' : '') + '" data-building="' + p.key + '" data-action="focus-building" data-key="' + p.key + '" style="--x:' + p.x + '%;--y:' + p.y + '%" aria-label="' + short[p.key] + ', level ' + lv + ', mostrar melhoria">';
      out += '<span class="slot-icon" aria-hidden="true">' + icons[p.key] + '</span><span class="slot-name">' + short[p.key] + '</span><span class="slot-level">Level ' + lv + '</span>';
      if (building) out += '<span class="slot-queue">Em obras · ' + active.construction.left + 'd</span>';
      out += '</button>';
    });
    out += '</div><div class="scene-note">Select a building to see upgrade costs ↓</div>';
    $('scene-ground').innerHTML = out;
  }
  function renderWorkspace() {
    const titles = { village: ['VILLAGE UPGRADES', game.villageMode === 'production' ? 'Resource fields' : 'Buildings and defense'], map: ['THE CONTINENT', 'Province map'], army: ['MILITARY STRATEGY', 'Army and marches'], diplomacy: ['O JOGO DOS TRONOS', 'Diplomacia'], ranking: ['DISPUTA PELTHE CONTINENT', 'Empire rankings'], reports: ['MILITARY REPORTS', '📜 Battle reports'], chronicle: ['LIVING HISTORY', 'World chronicle'] };
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
      return '<div class="dispatch-item"><span class="dispatch-bullet">' + symbol + '</span><div><span class="dispatch-time">TURN ' + l.day + '</span><strong>' + l.title + '</strong><p>' + l.detail + '</p>' +
        (l.reportId ? actionButton('📜 View report →', 'view-report', 'data-report-id="' + l.reportId + '"', 'small subtle') : '') +
        '</div></div>';
    }).join('');
  }
  function renderEvent() {
    const node = $('event-layer');
    if (game.ended) {
      if (game.endSummaryDismissed) { node.classList.add('hidden'); node.innerHTML = ''; return; }
      const victor = game.ended.winner >= 0 ? game.factions[game.ended.winner].name : 'Os reinos rivais';
      node.classList.remove('hidden');
      node.innerHTML = '<div class="event-card" role="dialog" aria-modal="true" aria-label="Campaign over"><p class="eyebrow">THE FINAL CHRONICLE</p><h2>' + (game.ended.winner === 0 ? 'Your crown awaits' : 'The empire has fallen') + '</h2><p>' + victor + ' venceu a campanha. ' + (game.ended.winner === 0 ? 'You earned the right to rule the continent.' : 'The kingdoms changed the map through conflict.') + ' The world reached its conclusion on turn ' + game.day + '.</p><div class="event-actions">' + actionButton('📜 View reports', 'review-end', '', 'subtle') + actionButton('Start new campaign', 'restart', '', 'primary') + '</div></div>';
      return;
    }
    if (!game.event) { node.classList.add('hidden'); node.innerHTML = ''; return; }
    const rival = game.factions[game.event.faction];
    node.classList.remove('hidden');
    node.innerHTML = '<div class="event-card" role="dialog" aria-modal="true" aria-label="Diplomatic ultimatum"><p class="eyebrow">A MESSENGER AT THE GATES</p><h2>Peace has a price</h2><p>An envoy of <strong>' + rival.name + '</strong> reached your court. They demand 70 wood and 70 grain for peace. Refusal may trigger war.</p><div class="event-actions">' + actionButton('Pay tribute', 'event-pay', '', 'primary', !canAfford(0, {wood:70,grain:70})) + actionButton('Reject demand', 'event-refuse', '', 'danger') + '</div></div>';
  }
  function renderGuidance() {
    const capital = game.tiles[19];
    const built = ownTiles(0).some(function (t) { return t.construction || ['wood','clay','iron','grain'].some(function (k) { return t.levels[k] > (t.id === 19 ? 2 : 1); }); });
    const trained = game.logs.some(function (l) { return l.title === 'Troops recruited'; });
    const settled = ownTiles(0).length > 1 || game.missions.some(function (m) { return m.owner === 0 && m.mode === 'settle'; });
    let title, detail, label, action;
    if (game.ended) {
      title = 'Campaign over'; detail = 'Review the outcome and start another campaign when ready.'; label = 'View rankings'; action = 'open-ranking';
    } else if (!built) {
      title = '1. Grow your village';
      detail = 'Upgrade a resource field, then end a couple of turns to complete construction.';
      label = 'View fields'; action = 'guide-production';
    } else if (!trained) {
      title = '2. Train your first army';
      detail = 'Recruit spearmen or swordsmen to defend or raid nearby land.';
      label = 'Open army'; action = 'open-army';
    } else if (!settled) {
      title = '3. Expand your kingdom';
      detail = 'Select nearby neutral land, gather resources and send settlers.';
      label = 'Find land'; action = 'guide-expand';
    } else {
      title = 'Your empire is growing';
      detail = 'Build, defend, raid and negotiate. End the turn whenever you are ready.';
      label = 'View rankings'; action = 'open-ranking';
    }
    $('guidance').innerHTML = '<div class="guidance-copy"><p class="eyebrow">YOUR NEXT MOVE</p><strong>' + title + '</strong><p>' + detail + '</p></div><div class="guidance-actions">' + actionButton(label + ' ↗', action, '', 'subtle small') + '</div>';
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
    $('day-label').textContent = 'Turn ' + game.day;
    $('phase-label').textContent = game.day < 20 ? 'Age of Small Kingdoms' : game.day < 60 ? 'Age of Conquest' : 'Contest for the Crown';
    $('next-day').disabled = !!game.ended || !!game.event;
    $('mobile-next-turn').disabled = !!game.ended || !!game.event;
    $('mobile-turn-label').textContent = 'Turn ' + game.day;
    $('mobile-next-turn').title = game.event ? 'Resolve the event before ending the turn' : game.ended ? 'Campaign over' : 'End turn ' + game.day;
    $('mobile-next-turn').setAttribute('aria-label', game.event ? 'Resolve the event before ending the turn' : game.ended ? 'Campaign over' : 'End turn ' + game.day + ' and advance to the next');
    $('empire-mini').innerHTML = '<span class="tiny-label">YOUR EMPIRE</span><div class="mini-stat"><span>Villages</span><strong>' + ownTiles(0).length + '</strong></div><div class="mini-stat"><span>Population</span><strong>' + format(population(0)) + '</strong></div><div class="mini-stat"><span>Position</span><strong>#' + (ranking().findIndex(function (f) { return f.id === 0; }) + 1) + '</strong></div><div class="mini-stat"><span>Missions</span><strong>' + game.missions.filter(function (m) { return m.owner === 0; }).length + '</strong></div>';
  }

  function diplomacyAction(action, id) {
    const f = game.factions[id]; const r = relation(0, id);
    if (!f || !r || game.ended) return;
    if (action === 'gift') {
      if (!spend(0, { wood: 70, grain: 70 }) || r.stance === 'war') return notice('Not enough resources or you are at war.', true);
      give(id, { wood: 70, grain: 70 }); r.opinion = Math.min(100, r.opinion + 22);
      message('Diplomatic gift', f.name + ' received your envoys and supplies. Relations improved.');
    } else if (action === 'pact' && r.stance === 'neutral') {
      if (r.opinion + (f.style === 'diplomatic' ? 20 : 0) >= 8) { setStance(0,id,'pact',r.opinion + 10); message('Pact signed', 'As fronteiras com ' + f.name + ' are protected by a non-aggression treaty.'); }
      else { r.opinion += 2; notice('Pact rejected. Improve relations first.', true); }
    } else if (action === 'alliance' && r.stance === 'pact') {
      if (r.opinion >= 45) { setStance(0,id,'alliance',r.opinion + 8); message('Alliance formada', f.name + ' joined your alliance. You can request military and economic aid.'); }
      else { notice('You need at least 45 opinion points.', true); }
    } else if (action === 'aid' && r.stance === 'alliance') {
      if (game.day - (r.lastAid || -100) < 8 || f.resources.wood < 130 || f.resources.grain < 130 || f.troops.spear < 7) return notice('The ally cannot send support yet.', true);
      r.lastAid = game.day; f.resources.wood -= 100; f.resources.grain -= 100; f.troops.spear -= 5;
      give(0, { wood: 100, grain: 100 }); player().troops.spear += 5;
      r.opinion = Math.max(-100, r.opinion - 5);
      message('Allied reinforcements', f.name + ' sent 5 spearmen, wood and grain to the crown.');
    } else if (action === 'war' && r.stance === 'neutral') {
      setStance(0,id,'war',-90); message('Declaration of war', 'A coroa declared war on ' + f.name + '.', 'war');
    } else if (action === 'peace' && r.stance === 'war') {
      if (armyPower(player().troops) > armyPower(f.troops) * 0.75 || r.opinion > -40) { setStance(0,id,'neutral',-20); message('Peace treaty', f.name + ' agreed to a ceasefire.'); }
      else notice('The rival considers you too weak to negotiate.', true);
    } else if (action === 'break' && ['pact','alliance'].includes(r.stance)) {
      setStance(0,id,'neutral',r.opinion - 40);
      message('Treaty broken', 'Your crown broke the treaty with ' + f.name + '. Trust declined.');
    }
  }
  function handleAction(btn) {
    const action = btn.dataset.action;
    const tileId = btn.dataset.tile !== undefined ? Number(btn.dataset.tile) : game.selected;
    const factionId = Number(btn.dataset.faction);
    if (action === 'end-turn') {
      if (game.ended || game.event) { notice(game.event ? 'Resolve the event before ending your turn.' : 'This campaign is over.', true); return; }
      advanceDay();
      notice('⏭️ Turn ' + game.day + ' started');
      return;
    }
    if (action === 'restart') { createGame(); refresh(); return; }
    if (action === 'review-end' && game.ended) {
      game.endSummaryDismissed = true;
      navigateTo('reports'); markReportsRead(); refresh(); focusWorkspace(); return;
    }
    if (game.ended && !['open-ranking','open-reports','view-report'].includes(action)) return;
    let scrollTo = '';
    let focusReportId = 0;
    if (action === 'select' || action === 'manage') { navigateTo('village', null, action === 'select' ? tileId : game.selected); scrollTo = 'scene'; }
    else if (action === 'village-mode') { game.villageMode = btn.dataset.mode === 'infrastructure' ? 'infrastructure' : 'production'; game.buildingFocus = game.villageMode === 'production' ? 'wood' : 'barracks'; scrollTo = 'scene'; }
    else if (action === 'focus-building') { if (BUILDINGS[btn.dataset.key]) { game.buildingFocus = btn.dataset.key; scrollTo = 'workspace'; } }
    else if (action === 'guide-production' || action === 'open-production') { navigateTo('village', 'production', ownTiles(0)[0] && game.tiles[game.selected].owner !== 0 ? ownTiles(0)[0].id : undefined); game.buildingFocus = 'wood'; scrollTo = 'scene'; }
    else if (action === 'open-infrastructure') { navigateTo('village', 'infrastructure', ownTiles(0)[0] && game.tiles[game.selected].owner !== 0 ? ownTiles(0)[0].id : undefined); game.buildingFocus = 'barracks'; scrollTo = 'scene'; }
    else if (action === 'station' || action === 'withdraw') {
      const targetId=Number(btn.dataset.tile),key=btn.dataset.unit;
      const ok=action==='station'?station(0,targetId,key,5):withdraw(0,targetId,key,5);
      if(!ok)notice('No units available.',true);
    }
    else if (action === 'reinforce') {
      if(!sendReinforcement(0,Number(btn.dataset.from),Number(btn.dataset.to),50))notice('No stationed troops available.',true);
    }
    else if (action === 'ambush') {
      if(!ambush(0,Number(btn.dataset.tile)))notice('Cannot lay an ambush here.',true);
    }
    else if (action === 'counterattack') {
      if(!launch(0,Number(btn.dataset.target),'attack',game.force))notice('Counterattack unavailable.',true);
    }
    else if (action === 'fortify') {
      if(!fortify(0,Number(btn.dataset.tile)))notice('Cannot fortify this village now.',true);
    }
    else if (action === 'evacuate') {
      if(!evacuate(0,Number(btn.dataset.tile)))notice('Evacuation unavailable.',true);
    }
    else if (action === 'scout') {
      if(!scout(0,game.selected))notice('Scouting unavailable or too expensive.',true);
    }
    else if (action === 'open-army') { navigateTo('army'); scrollTo = 'workspace'; }
    else if (action === 'open-diplomacy') { navigateTo('diplomacy'); scrollTo = 'workspace'; }
    else if (action === 'open-ranking') { navigateTo('ranking'); scrollTo = 'workspace'; }
    else if (action === 'open-reports' || action === 'view-report') {
      navigateTo('reports'); markReportsRead(); scrollTo = 'workspace';
      if (action === 'view-report') focusReportId = Number(btn.dataset.reportId) || 0;
    }
    else if (action === 'guide-expand') {
      const t = nearestFree(0);
      if (t) { game.selected = t.id; game.tab = 'map'; scrollTo = 'selection'; }
      else { notice('No nearby neutral site. Explore the frontier or capture a village.', true); }
    }
    else if (action === 'build') {
      if (!queueBuilding(0, Number(btn.dataset.village), btn.dataset.key)) notice('Construction unavailable or insufficient resources.', true);
    } else if (action === 'train') {
      if (!train(0, btn.dataset.unit, 5)) notice('Cannot recruit these units.', true);
    } else if (['settle','raid','attack','siege'].includes(action)) {
      if (!launch(0, game.selected, action, game.force)) notice('Mission unavailable: check supplies, troops, range and treaties.', true);
    } else if (['gift','pact','alliance','aid','war','peace','break'].includes(action)) {
      diplomacyAction(action, factionId);
    } else if (action === 'event-pay' && game.event) {
      if (spend(0, {wood:70,grain:70})) {
        const id = game.event.faction; give(id, {wood:70,grain:70});
        const r = relation(0,id); r.opinion = Math.min(100,r.opinion + 18);
        message('Peace purchased', 'Tribute delivered to ' + game.factions[id].name + '. Tensions eased.');
        game.event = null;
      }
    } else if (action === 'event-refuse' && game.event) {
      const id = game.event.faction; setStance(0,id,'war',-85);
      message('Ultimatum refused', 'Relations with ' + game.factions[id].name + ' have become war.', 'war');
      game.event = null;
    }
    refresh();
    if (scrollTo === 'workspace') focusWorkspace();
    if (scrollTo === 'selection') focusSelection();
    if (scrollTo === 'scene') focusActiveView();
    if (focusReportId) {
      const entry = $('battle-report-' + focusReportId);
      if (entry && typeof entry.scrollIntoView === 'function') entry.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  document.addEventListener('click', function (ev) {
    const btn = ev.target.closest('button'); if (!btn || btn.disabled) return;
    if (btn.id === 'mobile-more-toggle') { updateMobileMenu(!mobileMenuOpen); return; }
    if (btn.dataset.tile !== undefined && !btn.dataset.action) {
      game.selected = Number(btn.dataset.tile);
      game.tab = 'map';
      refresh(); focusSelection(); return;
    }
    if (btn.dataset.tab) {
      updateMobileMenu(false);
      game.tab = btn.dataset.tab;
      if (game.tab === 'village') {
        game.villageMode = btn.dataset.mode === 'infrastructure' ? 'infrastructure' : 'production';
        game.buildingFocus = game.villageMode === 'production' ? 'wood' : 'barracks';
        if (game.tiles[game.selected].owner !== 0 && ownTiles(0).length) game.selected = ownTiles(0)[0].id;
      }
      if (game.tab === 'reports') markReportsRead();
      refresh();
      if (typeof window.innerWidth === 'number' && window.innerWidth <= 800) focusActiveView();
      else if (game.tab !== 'map' && game.tab !== 'village') focusWorkspace();
      return;
    }
    if (btn.dataset.action) { handleAction(btn); return; }
    if (btn.id === 'next-day' || btn.id === 'mobile-next-turn') {
      if (game.ended || game.event) return;
      advanceDay();
      notice('⏭️ Turn ' + game.day + ' started');
      return;
    }
    if (btn.id === 'view-chronicle') { game.tab = 'chronicle'; refresh(); focusWorkspace(); return; }
    if (btn.id === 'back-to-map') { game.tab = 'map'; refresh(); focusActiveView(); return; }
    if (btn.id === 'new-game') {
      if (window.confirm('Start a new campaign? The current preview save will be replaced.')) {
        createGame(); refresh(); focusActiveView();
      }
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id !== 'mobile-village-select') return;
    const id = Number(ev.target.value);
    if (!game.tiles[id] || game.tiles[id].owner !== 0) return;
    game.selected = id; game.tab = 'village';
    updateMobileMenu(false); refresh(); focusActiveView();
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id !== 'force-slider') return;
    game.force = Number(ev.target.value);
    $('force-number').textContent = game.force + '%';
    save();
  });
  // Turns advance only by explicit player action.
  load(); render();
  // Minimal debug interface for repeatable tests; never writes to network.
  window.KingdomsOfAsh = {
    getState: function () { return clone(game); },
    advance: advanceDay,
    reset: function () { createGame(); render(); },
    rules: { resourceTypes: RES.map(function (r) { return r.key; }), victoryVillages: 10, victoryDays: 4 }
  };
})();
