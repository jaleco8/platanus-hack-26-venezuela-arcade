// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}


function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    return '';
  }

  if (key === ' ') {
    return 'space';
  }

  return key.toLowerCase();
}
(() => {
'use strict';

// Mundo: 5 carriles de 80 px entre x=200 y x=600, hombrillo a la derecha
const W = 800;
const H = 600;
const PYB = 460;
const TOPZ = 520;
const BOTZ = -260;
const LX = 200;
const LW = 80;
const NL = 5;
const SHX = 600;
const BAND = 12;
const GAPMIN = 60;
const DT = 1 / 60;
const SKEY = 'yummy-hora-pico-v1';
const COLS = { mint: 0x33c8a2, yel: 0xe1ff00, red: 0xff5a5a, white: 0xf7ffd8 };

const lineX = (k) => LX + LW * k;
const laneC = (i) => LX + LW * i + LW / 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const laneOf = (x) => clamp(Math.floor((x - LX) / LW), 0, NL - 1);
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Tamaños por tipo: [ancho, alto, media-ancho, media-alto, se mueve]
const KD = {
  car: [40, 72, 17, 32, 1],
  suv: [46, 80, 20, 36, 1],
  bus: [54, 130, 24, 60, 1],
  gan: [54, 150, 24, 70, 1],
  moto: [16, 34, 4, 11, 1],
  cone: [12, 12, 6, 6, 0],
  hole: [26, 14, 11, 6, 0],
  puddle: [44, 22, 22, 11, 0],
  guay: [14, 18, 7, 9, 0],
  pin: [36, 260, 18, 130, 0],
  deck: [436, 140, 218, 70, 0],
  sen: [18, 34, 9, 17, 0],
};
const NOSOLID = { deck: 1, sen: 1, pin: 1, puddle: 1, guay: 1 };
const LEADABLE = { car: 1, suv: 1, bus: 1, gan: 1, moto: 1, cone: 1 };

// Piernas de la ruta. Las distancias son px desde el inicio de la pierna
const LEGS = [
  { to: 'EL PULPO', food: 'TEQUEÑOS X50', len: 9000, ev: [
    { at: 1500, t: 'msg', s: '¡MÉTETE POR EL CANALITO!' },
    { at: 4000, t: 'msg', s: 'BOTÓN 2: ¡TURBO!' },
    { at: 6000, t: 'msg', s: '¡PÁSATE A LA DERECHA!' },
  ] },
  { to: 'CHACAÍTO', food: 'PABELLÓN', len: 12000, ev: [{ at: 6500, t: 'bridge', gap: 36, sen: 1 }] },
  { to: 'CHACAO', food: 'CACHAPA', len: 12000, ev: [{ at: 4000, t: 'obras', l: 2 }] },
  { to: 'LOS RUICES', food: 'TORTA TRES LECHES', len: 13000, ev: [{ at: 7000, t: 'bridge', gap: 30 }] },
  { to: 'LA CALIFORNIA', food: 'HAMBURGUESA DOBLE', len: 13000, ev: [
    { at: 3000, t: 'obras', l: 1 },
    { at: 8000, t: 'msg', s: '¡PILAS! GANDOLAS' },
  ] },
  { to: 'PETARE', food: 'ARROZ CHINO', len: 14000, ev: [
    { at: 3000, t: 'msg', s: '¡QUÉ COLA!' },
    { at: 9000, t: 'bridge', gap: 26 },
  ] },
];
const DEMO_LEG = { to: 'DEMO', food: '', len: 4000, ev: [{ at: 2600, t: 'bridge', gap: 36, sen: 1 }] };

// RNG determinista (mulberry32) para que la demo y las pruebas se repitan
let rs = 1;
const seedRng = (n) => { rs = (n >>> 0) || 1; };
const R = () => {
  rs = (rs + 0x6d2b79f5) | 0;
  let t = rs;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const RF = (a, b) => a + (b - a) * R();
const RI = (a, b) => a + Math.floor(R() * (b - a + 1));

// Estado de la partida
let state = 'attract';
let demo = true;
let D = 0;
let T = 0;
let S = 2;
let S2 = -1;
let sUntil = 0;
let nextMove = 0;
let lockS = false;
let approachS = false;
let approachRes = false;
let closed = [false, false, false, false, false];
let closeUntil = [0, 0, 0, 0, 0];
let nextTop = [0, 0, 0, 0, 0];
let nextBehind = [0, 0, 0, 0, 0];
let nextHole = 0;
let nextGuay = 0;
let noSpawnUntil = 0;
let rainT = 0, rainCur = 0, gripT = 1, grip = 1;
let darkT = 0, darkCur = 0, fogT = 0, fogCur = 0;
let jamK = 0, jamTarget = 0, jamT0 = 0, cloudT = 0, flashA = 0;
let lvl = 0, dl = 0, loops = 0, clock = 45, score = 0, meter = 100;
let combo = 0, comboM = 1, comboT = 0, lastNM = null, legCrashed = false, legIdx = 0;
let pinObj = null, overT = 0, HS = 0, SLOW = 0, BAN = null, POP = [];
let OPS = [], BR = [], FXQ = [];
let P = null;
let board = [], hiIdx = -1, nameBuf = [], curRow = 0, curCol = 0, idleT = 0, boardT = 0, ATT = 0;

// Pool de objetos del mundo: vehículos, motos, conos, baches, puentes, pines
const POOL = [];
for (let i = 0; i < 160; i++) POOL.push({ on: false });

function alloc(k, x, wd, v, mov) {
  const d = KD[k];
  for (const o of POOL) {
    if (o.on) continue;
    o.on = true; o.k = k; o.x = x; o.wd = wd; o.v = v || 0;
    o.mov = mov === undefined ? !!d[4] : mov;
    o.hw = d[2]; o.hh = d[3]; o.ex = 0; o.c = RI(0, 3);
    o.blink = 0; o.dir = 0; o.cool = 0; o.inLC = false; o.lcT = 0; o.lcFrom = x; o.lcTo = x;
    o.nm = false; o.hornd = false; o.gone = false;
    return o;
  }
  return null;
}

function newPlayer() {
  return { x: lineX(2), wd: 0, sy: PYB, v: 300, vx: 0, hw: 5, hh: 12, turbo: 0, inv: 0, puddle: 0, horn: 0, tilt: 0, crashT: -9 };
}

// Entrada: flancos sobre held (los eventos sintéticos llegan dos veces)
const held = Object.create(null);
const pressed = Object.create(null);
const take = (c) => {
  if (pressed[c]) { pressed[c] = false; return true; }
  return false;
};
const takeAny = (list) => {
  let r = false;
  for (const c of list) if (take(c)) r = true;
  return r;
};
const clearHeld = () => { for (const k in held) held[k] = false; };

window.addEventListener('keydown', (e) => {
  const code = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (!code) return;
  e.preventDefault();
  if (!held[code]) pressed[code] = true;
  held[code] = true;
  if (AC && AC.state === 'suspended') AC.resume();
});
window.addEventListener('keyup', (e) => {
  const code = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (code) held[code] = false;
});

// Marcador: plataforma si existe, si no localStorage. Todo con try/catch
const cleanBoard = (v) => (Array.isArray(v) ? v : [])
  .filter((r) => r && typeof r.n === 'string' && r.n.length >= 1 && r.n.length <= 3 &&
    typeof r.s === 'number' && typeof r.d === 'number' && typeof r.k === 'number' && typeof r.t === 'number')
  .sort((a, b) => b.s - a.s)
  .slice(0, 8);
function localGet(done) {
  try {
    const raw = window.localStorage.getItem(SKEY);
    if (raw) done(JSON.parse(raw));
  } catch (e) { /* sin almacenamiento local */ }
}
function loadBoard() {
  const done = (v) => { board = cleanBoard(v); };
  try {
    const st = window.platanusArcadeStorage;
    if (st) {
      st.get(SKEY).then((r) => { if (r && r.found) done(r.value); else localGet(done); }, () => localGet(done));
    } else {
      localGet(done);
    }
  } catch (e) { localGet(done); }
}
function saveBoard() {
  try {
    const st = window.platanusArcadeStorage;
    if (st) st.set(SKEY, board).catch(() => {});
  } catch (e) { /* ignora */ }
  try { window.localStorage.setItem(SKEY, JSON.stringify(board)); } catch (e) { /* ignora */ }
}

// Velocidad base de cada carril y cupo de tráfico según el nivel
const laneV = (i) => 230 - 22 * i - 6 * lvl;
const vmax = () => Math.min(520, 460 + 6 * lvl) * (rainCur > 1 ? 0.9 : 1);
const reserved = (k) => k === S || k === S2 || (approachRes && k === 5);
const bandHit = (x, hw, k) => x + hw > lineX(k) - BAND && x - hw < lineX(k) + BAND;
function resHit(x, hw) {
  for (let k = 1; k <= 5; k++) if (reserved(k) && bandHit(x, hw, k)) return true;
  return false;
}
function clearAt(x, hw, wd, hh, gap) {
  for (const c of POOL) {
    if (c.on && !NOSOLID[c.k] && Math.abs(c.x - x) < c.hw + hw && Math.abs(c.wd - wd) < c.hh + hh + gap) return false;
  }
  return !(Math.abs(P.x - x) < P.hw + hw && Math.abs(P.wd - wd) < P.hh + hh + gap);
}
function place(k, x, wd, gap, v) {
  const d = KD[k];
  if (resHit(x, d[2]) || !clearAt(x, d[2], wd, d[3], gap)) return null;
  return alloc(k, x, wd, v);
}

// Cambio de carril: intermitente, luego movimiento. Veto si cruza línea reservada,
// si el jugador está en la trayectoria con tiempo suficiente, o si no hay hueco
function tell(o) { return o.k === 'moto' ? 0.35 : 0.8 - 0.04 * lvl; }
function lcVeto(o, dir) {
  const L = laneOf(o.x);
  const L2 = L + dir;
  if (L2 < 0 || L2 >= NL || closed[L2] || reserved(dir > 0 ? L + 1 : L)) return true;
  const tx = laneC(L2);
  const lo = Math.min(o.x, tx) - o.hw - P.hw - 6;
  const hi = Math.max(o.x, tx) + o.hw + P.hw + 6;
  const dzP = P.wd - o.wd;
  if (P.x > lo && P.x < hi && dzP > -200 && dzP < 400 &&
    Math.abs(dzP) / Math.max(1, Math.abs(o.v - P.v)) < tell(o) + 0.9) return true;
  for (const c of POOL) {
    if (c.on && c !== o && LEADABLE[c.k] && Math.abs(c.x - tx) < c.hw + o.hw + 4 &&
      Math.abs(c.wd - o.wd) < o.hh + c.hh + GAPMIN + 40) return true;
  }
  return false;
}
function startLC(o, dir) {
  o.inLC = true;
  o.lcT = 0.6;
  o.lcFrom = o.x;
  o.lcTo = laneC(laneOf(o.x) + dir);
}
function lanes(dt) {
  for (const o of POOL) {
    if (!o.on || !o.mov) continue;
    if (o.inLC) {
      o.lcT -= dt;
      const u = 1 - clamp(o.lcT, 0, 0.6) / 0.6;
      o.x = o.lcFrom + (o.lcTo - o.lcFrom) * u * u * (3 - 2 * u);
      if (o.lcT <= 0) { o.inLC = false; o.x = o.lcTo; }
    } else if (o.blink > 0) {
      o.blink -= dt;
      if (o.blink <= 0 && !lcVeto(o, o.dir)) startLC(o, o.dir);
    } else if (o.cool > 0) {
      o.cool -= dt;
    } else {
      const L = laneOf(o.x);
      const forced = closed[L];
      const rate = forced ? 0.6 : o.k === 'moto' ? 0.25 + 0.02 * lvl : 0.02 + 0.008 * lvl;
      if (R() < rate * dt) {
        const dir = forced ? (L > 0 && !closed[L - 1] ? -1 : 1) : R() < 0.5 ? -1 : 1;
        if (!lcVeto(o, dir)) {
          o.dir = dir;
          o.blink = o.k === 'moto' ? 0.35 : R() < 0.025 * lvl ? 0.4 : tell(o);
        }
      }
    }
  }
}

// Seguimiento: cada vehículo frena detrás del líder que comparte su franja en x.
// El jugador también es líder: nadie te alcanza por detrás (invariante I4)
function follow(dt) {
  for (const o of POOL) {
    if (!o.on || !o.mov) continue;
    const gm = jamK > 0.5 ? 40 : GAPMIN;
    let ld = null;
    for (const c of POOL) {
      if (c.on && c !== o && LEADABLE[c.k] && c.wd > o.wd && Math.abs(c.x - o.x) < c.hw + o.hw && (!ld || c.wd < ld.wd)) ld = c;
    }
    if (P.wd > o.wd && Math.abs(P.x - o.x) < P.hw + o.hw && (!ld || P.wd < ld.wd)) ld = P;
    let tv = laneV(laneOf(o.x)) + o.ex;
    tv = tv * (1 - jamK) + 30 * jamK;
    tv *= 1 - (0.08 * rainCur) / 4;
    if (ld && ld.wd - ld.hh - (o.wd + o.hh) < gm + 60) tv = Math.min(tv, ld.v);
    o.v += clamp(tv - o.v, -600 * dt, 200 * dt);
    o.wd += o.v * dt;
    if (ld) {
      const mx = ld.wd - ld.hh - o.hh - gm;
      if (o.wd > mx) { o.wd = mx; if (o.v > ld.v) o.v = ld.v; }
    }
  }
}

// Canal Seguro: S es la línea libre garantizada. Solo cambia a una línea cuya banda esté libre
function bandFree(k) {
  for (const c of POOL) {
    if (c.on && !NOSOLID[c.k] && bandHit(c.x, c.hw, k) && Math.abs(c.wd - D) < 800) return false;
  }
  return true;
}
function moveS() {
  if (lockS) return;
  if (S2 >= 0) {
    if (D >= sUntil) { S = S2; S2 = -1; nextMove = D + (approachS ? 600 : RF(2500, 4000)); }
    return;
  }
  if (D < nextMove) return;
  const cands = [];
  if (approachS) { if (S < 4) cands.push(S + 1); }
  else { if (S > 1) cands.push(S - 1); if (S < 4) cands.push(S + 1); }
  const ok = cands.filter((c) => bandFree(c) && !closed[c - 1] && !closed[c]);
  if (ok.length) { S2 = ok[RI(0, ok.length - 1)]; sUntil = D + 1600; }
  else nextMove = D + 300;
}

// Tráfico: aparece por delante (y por detrás si el carril va más rápido que tú)
const headway = () => RF(180 - 12 * lvl, 480 - 29 * lvl);
function pickKind() {
  if (lvl >= 2 && R() < 0.02 * lvl) return 'moto';
  if (R() < 0.08 + 0.017 * lvl) return R() < 0.5 ? 'bus' : 'gan';
  return R() < 0.25 ? 'suv' : 'car';
}
function spawns() {
  if (D < noSpawnUntil) return;
  for (let L = 0; L < NL; L++) {
    if (closed[L]) continue;
    if (D >= nextTop[L]) {
      const k = pickKind();
      const ex = k === 'moto' ? RF(60, 120) : 0;
      const o = place(k, laneC(L) + RF(-3, 3), D + TOPZ, GAPMIN, laneV(L) + ex);
      if (o) o.ex = ex;
      nextTop[L] = D + (o ? headway() : 30);
    }
    if (D >= nextBehind[L]) {
      if (laneV(L) > P.v + 30) place(pickKind(), laneC(L), D + BOTZ, GAPMIN, laneV(L));
      nextBehind[L] = D + headway();
    }
  }
  if (D >= nextHole) {
    place('hole', laneC(RI(0, 4)) + RF(-14, 14), D + TOPZ, 0, 0);
    nextHole = D + RF(0.7, 1.3) * 1000 / (0.4 + 0.12 * lvl);
  }
  if (D >= nextGuay) {
    place('guay', laneC(RI(0, 4)), D + TOPZ, 0, 0);
    nextGuay = D + RF(2000, 3500);
  }
}

// Eventos: cola de operaciones ligadas a la distancia recorrida
function at(d, f) { OPS.push([d, f]); }
function runOps() {
  for (let i = 0; i < OPS.length;) {
    if (OPS[i][0] <= D) {
      const f = OPS[i][1];
      OPS.splice(i, 1);
      f();
    } else {
      i++;
    }
  }
}
function banner(s, c) { BAN = { s, c: c || COLS.yel, t: 2.4 }; }
function popup(s, x, y, c) { POP.push({ s, x, y, c: c || COLS.white, t: 1 }); }
function fx(n, x, y) { FXQ.push([n, x, y]); }

// Tapa de motos bajo el puente, con un hueco de gap px centrado en S
function cluster(Bw, gap) {
  const ln = lineX(S);
  for (let x = LX + 9; x < ln - gap / 2 - 8; x += 18) alloc('moto', x, Bw + 40, 0, false);
  for (let x = ln + gap / 2 + 8; x < SHX + 36 - 8; x += 18) alloc('moto', x, Bw + 40, 0, false);
}
function escampo() {
  rainT = 0; gripT = 1; darkT = 0; fogT = 0; lockS = false;
  banner('ESCAMPÓ', COLS.yel);
}
function evBridge(Bw, gap, K, sen) {
  const b = { Bw, K, esc: false, started: false };
  BR.push(b);
  at(Bw - 3600 * K, () => {
    lockS = true; S2 = -1; cloudT = 2.5;
    banner('¡MOSCA! SE VIENE EL PALO DE AGUA', COLS.yel);
    fx('warn', P.x, P.sy);
  });
  at(Bw - 2700 * K, () => {
    rainT = 1; gripT = 0.6;
    for (let n = 0; n < 6; n++) place('puddle', laneC(RI(0, 4)) + RF(-10, 10), D + TOPZ + RF(0, 900), 0, 0);
  });
  at(Bw - 1800 * K, () => {
    rainT = 4; gripT = 0.35; darkT = 0.45; fogT = 1; jamTarget = 1; jamT0 = T;
    banner('¡QUÉ TRANCA!', COLS.red);
    fx('thunder', P.x, P.sy);
  });
  at(Bw - 1500 * K, () => banner('PUENTE 500 M', COLS.white));
  at(Bw - 600 * K, () => {
    b.started = true;
    cluster(Bw, gap);
    alloc('deck', 418, Bw + 70, 0, false);
    if (sen) alloc('sen', lineX(S) - 30, Bw - 300 * K, 0, false);
  });
  at(Bw + 1800 * K, escampo);
}
function evObras(L) {
  closed[L] = true;
  closeUntil[L] = D + 1200;
  banner('¡CANAL CERRADO!', COLS.yel);
  for (let k = 0; k < 30; k++) place('cone', laneC(L), D + TOPZ + 40 * k, 0, 0);
}
function legBegin() {
  const Lg = demo ? DEMO_LEG : LEGS[legIdx % LEGS.length];
  const base = D;
  pinObj = alloc('pin', 618, base + Lg.len, 0, false);
  at(base + Lg.len - 3000, () => { approachS = true; });
  at(base + Lg.len - 1500, () => { approachRes = true; });
  for (const ev of Lg.ev) {
    if (ev.t === 'bridge') evBridge(base + ev.at, ev.gap, demo ? 0.35 : 1, ev.sen);
    else if (ev.t === 'obras') at(base + ev.at, () => evObras(ev.l));
    else if (ev.t === 'msg') at(base + ev.at, () => banner(ev.s, COLS.yel));
  }
}
function escapeBridge(b) {
  b.esc = true;
  const t = T - jamT0;
  score += Math.max(200, Math.round(2000 - 120 * t));
  if (t < 6) clock += 2;
  jamTarget = 0;
  noSpawnUntil = D + 1200;
  banner(t < 6 ? '¡SALISTE VOLANDO!' : '¡SALISTE DE LA TRANCA!', COLS.mint);
  fx('escape', P.x, P.sy);
}

// Control del jugador: velocidad, carril libre, turbo, corneta
function control(dt) {
  const ix = (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
  const vm = vmax() * (P.x > SHX ? 0.75 : 1);
  let tgt = 300;
  let rate = 160;
  if (P.turbo > 0) { tgt = 680; rate = 300; }
  else if (held.P1_U) { tgt = vm; rate = 300; }
  else if (held.P1_D) { tgt = 0; rate = 900; }
  P.v += clamp(tgt - P.v, -rate * dt, rate * dt);
  const g = P.puddle > 0 ? 0.12 : grip;
  let tx = ix * (P.turbo > 0 ? 340 : 300);
  if (P.v < 80) tx *= 0.6;
  P.vx += (tx - P.vx) * Math.min(1, 12 * g * dt);
  P.x = clamp(P.x + P.vx * dt, LX + 6, SHX + 36 - 6);
  P.tilt = P.vx * 0.04;
  if ((take('P1_2') || take('P1_5')) && P.turbo < 3 && meter >= 100) {
    meter -= 100;
    P.turbo = Math.min(3, P.turbo + 1.5);
    banner('¡DALE!', COLS.yel);
    fx('turbo', P.x, P.sy);
  }
  if ((take('P1_1') || take('P1_4')) && P.horn <= 0) {
    P.horn = 0.8;
    fx('horn', P.x, P.sy);
    cancelBlinks();
  }
}
function cancelBlinks() {
  for (const o of POOL) {
    if (o.on && o.mov && o.blink > 0 && o.wd > D && o.wd - D < 400) {
      o.blink = 0;
      o.cool = 3;
      if (!o.hornd) { o.hornd = true; addPts(25); }
    }
  }
}

// Puntaje, combo y turbo
const MN = ['', '', '¡FINO!', '¡CHÉVERE!', '¡BURDA DE RÁPIDO!', '¡NAGUARÁ!'];
function addPts(p) { score += Math.round(p * comboM * (P.turbo > 0 ? 2 : 1)); }
function meterAdd(x) { meter = Math.min(300, meter + x); }
function comboHit() {
  combo++;
  comboT = jamK > 0.5 ? 3.5 : 2.5;
  const m = Math.min(5, 1 + Math.floor(combo / 3));
  if (m > comboM) {
    comboM = m;
    if (m >= 3) clock += m - 2;
    banner(MN[m] + (m >= 3 ? ' +' + (m - 2) + ' s' : ''), COLS.yel);
  }
}
function comboBreak() { combo = 0; comboM = 1; comboT = 0; }
function nearMiss(o, c) {
  o.nm = true;
  const side = o.x > P.x ? 1 : -1;
  const close = c <= 6;
  comboHit();
  addPts(close ? 100 : 50);
  meterAdd(close ? 35 : 25);
  popup(close ? '¡AL RAS!' : '¡RASPAO!', P.x, P.sy - 40);
  fx('near', P.x, P.sy);
  if (lastNM && lastNM.side !== side && T - lastNM.t < 0.25) {
    addPts(150);
    meterAdd(50);
    popup('¡CANALITO!', P.x, P.sy - 60, COLS.yel);
  }
  lastNM = { side, t: T };
}

// Choques: vehículos = pierdes tiempo y reapareces en S; motos = roce; baches y conos frenan
function crash() {
  if (P.inv > 0) return;
  clock -= 3;
  HS = 0.08;
  P.x = lineX(S); P.vx = 0; P.v = 200; P.inv = 1.5; P.turbo = 0; P.crashT = T;
  legCrashed = true;
  comboBreak();
  banner('¡SE TE REGÓ EL PEDIDO!', COLS.red);
  popup('-3 s', P.x, P.sy - 40, COLS.red);
  fx('crash', P.x, P.sy);
}
function collide() {
  for (const o of POOL) {
    if (!o.on || o.k === 'deck' || o.k === 'sen' || o.k === 'pin') continue;
    const dz = o.wd - D;
    if (Math.abs(dz) >= o.hh + P.hh) continue;
    const dx = Math.abs(o.x - P.x);
    if (dx >= o.hw + P.hw) {
      const c = dx - o.hw - P.hw;
      if (o.mov && !o.nm && c <= 20 && T - P.crashT > 0.5 && Math.abs(o.v - P.v) > 60) nearMiss(o, c);
      continue;
    }
    if (o.k === 'car' || o.k === 'suv' || o.k === 'bus' || o.k === 'gan') {
      if (o.mov) crash();
    } else if (o.k === 'moto') {
      if (!o.gone) {
        o.gone = true;
        if (o.mov) {
          P.v *= 0.75;
          comboBreak();
          popup('¡ROCE!', P.x, P.sy - 40, COLS.white);
          fx('scrape', P.x, P.sy);
        } else {
          P.v = 0;
          clock -= 2;
          comboBreak();
          banner('¡PERMISO, PANA!', COLS.white);
          fx('scrape', P.x, P.sy);
        }
      }
    } else if (o.k === 'cone' && !o.gone) {
      o.gone = true;
      if (P.turbo > 0) { o.on = false; addPts(30); popup('+30', P.x, P.sy - 40, COLS.yel); }
      else { P.v *= 0.6; comboBreak(); }
    } else if (o.k === 'hole' && !o.gone) {
      o.gone = true;
      P.v *= 0.7;
      comboBreak();
      popup('¡HUECO!', P.x, P.sy - 40, COLS.red);
    } else if (o.k === 'puddle' && !o.gone) {
      o.gone = true;
      P.puddle = 0.4;
      P.vx += R() < 0.5 ? -80 : 80;
    } else if (o.k === 'guay') {
      o.on = false;
      clock += 3;
      addPts(100);
      popup('+3 s', P.x, P.sy - 40, COLS.yel);
      fx('pick', P.x, P.sy);
    }
  }
}

// Entrega: el pin está en el hombrillo. Si pasas de largo, reaparece 1.200 px más adelante
function deliver() {
  const i = legIdx % LEGS.length;
  const Lg = demo ? DEMO_LEG : LEGS[i];
  addPts(1000 + 250 * i + 20 * Math.max(0, Math.floor(clock)) + (legCrashed ? 0 : 500));
  clock += 30;
  meter = Math.min(300, meter + 100);
  dl++;
  legIdx++;
  pinObj.on = false;
  pinObj = null;
  approachS = false;
  approachRes = false;
  legCrashed = false;
  const full = legIdx % LEGS.length === 0;
  if (full) { loops++; addPts(5000); }
  lvl = Math.min(10, dl + 3 * loops);
  legBegin();
  banner(full ? '¡RUTA COMPLETA!' : '¡LLEGASTE A ' + Lg.to + '!', COLS.mint);
  popup('¡GRACIAS, PANA!', P.x, P.sy - 50, COLS.mint);
  fx('deliver', P.x, P.sy);
  SLOW = 0.3;
}
function delivery() {
  if (!pinObj || !pinObj.on) return;
  if (P.x > 595 && Math.abs(pinObj.wd - D) < 130 + P.hh) deliver();
  else if (pinObj.wd < D - 150) {
    pinObj.wd = D + 1200;
    banner('¡TE PASASTE!', COLS.red);
  }
}

// Rampas de clima, tranca y puntos
function ramps(dt) {
  rainCur += (rainT - rainCur) * Math.min(1, dt * 1.5);
  darkCur += (darkT - darkCur) * Math.min(1, dt * 1.5);
  fogCur += (fogT - fogCur) * Math.min(1, dt * 1.5);
  grip += (gripT - grip) * Math.min(1, dt * 2);
  jamK += (jamTarget - jamK) * Math.min(1, dt * (jamTarget > jamK ? 0.5 : 0.33));
  for (let L = 0; L < NL; L++) if (closed[L] && D >= closeUntil[L]) closed[L] = false;
  if (combo > 0) {
    comboT -= dt;
    if (comboT <= 0) comboBreak();
  }
}
function despawn() {
  for (const o of POOL) {
    if (o.on && o.k !== 'pin' && (o.wd < D + BOTZ - 300 || o.wd > D + 2200)) o.on = false;
  }
}
function timers(dt) {
  P.inv = Math.max(0, P.inv - dt);
  P.turbo = Math.max(0, P.turbo - dt);
  P.horn = Math.max(0, P.horn - dt);
  P.puddle = Math.max(0, P.puddle - dt);
  flashA = Math.max(0, flashA - dt);
  if (BAN) { BAN.t -= dt; if (BAN.t <= 0) BAN = null; }
  POP = POP.filter((p) => { p.t -= dt; return p.t > 0; });
  clock -= dt;
}

// Bot de la demo y de las pruebas: sigue S, va al hombrillo a entregar y frena si hay algo delante
function botInput() {
  const near = pinObj && pinObj.on && pinObj.wd - D < 900 && pinObj.wd - D > -100;
  const tgt = near ? 618 : lineX(S2 >= 0 ? S2 : S);
  const moving = tgt !== lineX(S);
  const x0 = Math.min(P.x, tgt) - 20;
  const x1 = Math.max(P.x, tgt) + 20;
  // Espera solo si algún vehículo en la franja de cruce llega a tocar tu posición durante el cambio
  const tc = Math.abs(tgt - P.x) / 300 + 0.25;
  const reach = (o) => o.hh + P.hh + 10;
  let wait = false;
  let brake = false;
  for (const o of POOL) {
    if (!o.on || !LEADABLE[o.k]) continue;
    const dz = o.wd - D;
    const rv = o.v - P.v;
    if (o.x + o.hw > x0 && o.x - o.hw < x1) {
      const lo = Math.min(dz, dz + rv * tc);
      const hi = Math.max(dz, dz + rv * tc);
      if (hi > -reach(o) && lo < reach(o)) wait = true;
    }
    if (Math.abs(o.x - P.x) < o.hw + P.hw + 6 && dz > 0 && dz < 200) brake = true;
  }
  const goX = wait && moving ? P.x : tgt;
  const dx = goX - P.x;
  held.P1_L = dx < -2;
  held.P1_R = dx > 2;
  held.P1_U = !brake;
  held.P1_D = brake;
}

// Un paso fijo de simulación (dt en segundos)
function simStep(dt) {
  if (demo) botInput();
  control(dt);
  D += P.v * dt;
  P.wd = D;
  P.sy += (PYB + clamp((P.v - 300) * 0.15, -30, 40) - P.sy) * Math.min(1, 4 * dt);
  T += dt;
  score += (P.v * dt) / 10;
  runOps();
  moveS();
  ramps(dt);
  follow(dt);
  lanes(dt);
  spawns();
  collide();
  for (const b of BR) if (!b.esc && b.started && P.wd > b.Bw + 140 * b.K) escapeBridge(b);
  delivery();
  timers(dt);
  despawn();
  if (state === 'play' && clock <= 0) endRun();
}
function endRun() {
  state = 'over';
  overT = 0;
  clock = 0;
  SLOW = 0.8;
}

// Reinicio: demo (attract) con semilla fija, o partida real con semilla aleatoria
function resetRun(isDemo, sd) {
  clearHeld();
  demo = isDemo;
  seedRng(sd !== undefined ? sd : isDemo ? 7 : (Math.random() * 1e9) | 1);
  state = isDemo ? 'attract' : 'play';
  D = 0; T = 0; S = 2; S2 = -1; sUntil = 0; nextMove = 900;
  lockS = false; approachS = false; approachRes = false;
  closed = [false, false, false, false, false];
  closeUntil = [0, 0, 0, 0, 0];
  nextTop = [0, 0, 0, 0, 0];
  nextBehind = [0, 0, 0, 0, 0];
  nextHole = 1200; nextGuay = 2600; noSpawnUntil = 0;
  rainT = 0; rainCur = 0; darkT = 0; darkCur = 0; fogT = 0; fogCur = 0;
  gripT = 1; grip = 1; jamK = 0; jamTarget = 0; cloudT = 0; flashA = 0;
  lvl = 0; dl = 0; loops = 0; clock = isDemo ? 999 : 45; score = 0; meter = 100;
  combo = 0; comboM = 1; comboT = 0; lastNM = null; legCrashed = false; legIdx = 0;
  overT = 0; SLOW = 0; HS = 0; BAN = null; POP = []; OPS = []; BR = []; FXQ = [];
  for (const o of POOL) o.on = false;
  P = newPlayer();
  ATT = 0;
  legBegin();
}

// Rejilla del nombre: 3 letras. Última fila: BORRAR y LISTO
const GRID = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZÑ-', ['BORRAR', 'LISTO']];
const qualifies = () => score >= 1 && (board.length < 8 || Math.floor(score) > board[board.length - 1].s);
const rankName = () => (dl >= 8 ? 'LEYENDA DE LA HORA PICO' : dl >= 6 ? 'REY DE LA AUTOPISTA' : dl >= 4 ? 'YUMMER PRO' : dl >= 2 ? 'YUMMER' : 'NOVATO');
function submitScore() {
  const n = nameBuf.length ? nameBuf.join('') : 'YUM';
  const row = { n, s: Math.floor(score), d: Math.round(D / 500) / 10, k: dl, t: Math.round(T) };
  board = board.concat([row]).sort((a, b) => b.s - a.s).slice(0, 8);
  hiIdx = board.indexOf(row);
  saveBoard();
  state = 'board';
  boardT = 0;
}

// Un cuadro: transiciones de estado y luego, si toca, pasos de simulación
let acc = 0;
let lastDt = 0;
function frame(ms) {
  const dt = Math.min(ms, 50) / 1000;
  lastDt = dt;
  ATT += state === 'attract' ? dt : 0;
  if (HS > 0) HS -= dt;
  if (SLOW > 0) SLOW -= dt;

  if (state === 'play') {
    if (take('START1')) state = 'pause';
  } else if (state === 'pause') {
    if (takeAny(['START1', 'P1_1', 'P1_4'])) state = 'play';
    else if (takeAny(['P1_2', 'P1_5'])) resetRun(true);
  } else if (state === 'attract') {
    if (takeAny(['START1', 'P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P1_6'])) resetRun(false);
    else if (T > 12) resetRun(true);
  } else if (state === 'over') {
    overT += dt;
    if (overT >= 1.2 && qualifies()) {
      state = 'name';
      nameBuf = []; curRow = 0; curCol = 0; idleT = 0;
    } else if (overT >= 1.2 && takeAny(['START1', 'P1_1', 'P1_4'])) {
      resetRun(false);
    } else if (overT > 12) {
      resetRun(true);
    }
  } else if (state === 'name') {
    idleT += dt;
    if (take('P1_U')) curRow = Math.max(0, curRow - 1);
    if (take('P1_D')) curRow = Math.min(GRID.length - 1, curRow + 1);
    if (take('P1_L')) curCol = Math.max(0, curCol - 1);
    if (take('P1_R')) curCol = Math.min(GRID[curRow].length - 1, curCol + 1);
    curCol = Math.min(curCol, GRID[curRow].length - 1);
    if (takeAny(['P1_1', 'P1_4', 'START1'])) {
      idleT = 0;
      const key = GRID[curRow][curCol];
      if (key === 'BORRAR') nameBuf.pop();
      else if (key === 'LISTO') submitScore();
      else if (nameBuf.length < 3) {
        nameBuf.push(key);
        if (nameBuf.length === 3) submitScore();
      }
    }
    if (takeAny(['P1_2', 'P1_5'])) nameBuf.pop();
    if (state === 'name' && idleT > 30) submitScore();
  } else if (state === 'board') {
    boardT += dt;
    if (takeAny(['P1_1', 'P1_4'])) resetRun(false);
    else if (takeAny(['START1']) || boardT > 8) resetRun(true);
  }

  const live = state === 'play' || state === 'attract' || (state === 'over' && overT < 1.2);
  if (live) {
    if (state === 'over') clearHeld();
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 4) {
      acc -= DT;
      n++;
      if (HS > 0) { acc = 0; break; }
      simStep(SLOW > 0 ? DT * 0.35 : DT);
      if (state !== 'play' && state !== 'attract' && state !== 'over') break;
    }
  } else {
    acc = 0;
  }

  while (FXQ.length) playFx(FXQ.shift());
  audioFrame(dt);
  for (const k in pressed) pressed[k] = false;
}

// Textos de pantallas (se pintan en render)
function boardText() {
  if (!board.length) return 'TODAVÍA NO HAY RÉCORDS';
  return board.map((r, i) => (i === hiIdx ? '> ' : '  ') + String(i + 1).padStart(2) + '. ' +
    r.n.padEnd(4) + fmt(r.s).padStart(9) + '  ' + r.d.toFixed(1) + ' KM  ' + r.k + ' PED').join('\n');
}
function nameText() {
  const rows = GRID.map((r, ri) => {
    let line = '';
    for (let ci = 0; ci < r.length; ci++) {
      const ch = r[ci];
      line += ri === curRow && ci === curCol ? '[' + ch + ']' : ' ' + ch + ' ';
    }
    return line;
  });
  const shown = nameBuf.join('') + '_'.repeat(3 - nameBuf.length);
  return 'ESCRIBE TU NOMBRE: ' + shown + '\n\n' + rows.join('\n');
}
function attractPage() {
  const p = ATT % 18;
  if (p < 7) return { t: 'HORA PICO', b: 'CARACAS ft. YUMMY\n\nEN CARACAS, EL TRÁFICO NO PERDONA.\n¿LLEGARÁS A TIEMPO?\n\nSTART: 1 JUGADOR' };
  if (p < 12) return { t: 'TOP YUMMERS', b: boardText() };
  return { t: 'CÓMO JUGAR', b: 'IZQ / DER: CAMBIA DE CANAL\nBOTÓN 1: CORNETA\nBOTÓN 2: TURBO (3 CARGAS)\nLOS CASI-CHOQUES LLENAN EL TURBO\nLLEGA AL PEDIDO ANTES DEL RELOJ\nLA LLUVIA TRANCA EL PUENTE' };
}

// Texturas dibujadas una vez al arrancar (sin imágenes externas)
function makeTextures(s) {
  const g = s.make.graphics({ x: 0, y: 0, add: false });
  const tex = (key, w, h, fn) => { g.clear(); fn(g); g.generateTexture(key, w, h); };
  const carCols = [0xe9e9e4, 0xd6453d, 0x3d7bd9, 0xf0c33b];
  carCols.forEach((c, i) => tex('car' + i, 40, 72, (q) => {
    q.fillStyle(c); q.fillRoundedRect(0, 0, 40, 72, 8);
    q.fillStyle(0x15190c); q.fillRect(6, 12, 28, 14); q.fillRect(6, 50, 28, 10);
    q.fillStyle(0xff3b30); q.fillRect(2, 66, 9, 4); q.fillRect(29, 66, 9, 4);
  }));
  tex('suv', 46, 80, (q) => {
    q.fillStyle(0x6f7a4a); q.fillRoundedRect(0, 0, 46, 80, 9);
    q.fillStyle(0x15190c); q.fillRect(7, 14, 32, 16); q.fillRect(7, 58, 32, 10);
    q.fillStyle(0xff3b30); q.fillRect(2, 74, 10, 4); q.fillRect(34, 74, 10, 4);
  });
  tex('bus', 54, 130, (q) => {
    q.fillStyle(0xf2efd6); q.fillRoundedRect(0, 0, 54, 130, 7);
    q.fillStyle(0x15190c);
    for (let y = 10; y < 110; y += 22) q.fillRect(6, y, 42, 14);
    q.fillStyle(0xe1ff00); q.fillRect(0, 60, 54, 4);
    q.fillStyle(0xff3b30); q.fillRect(3, 124, 10, 4); q.fillRect(41, 124, 10, 4);
  });
  tex('gan', 54, 150, (q) => {
    q.fillStyle(0x9aa0a6); q.fillRect(0, 0, 54, 110);
    q.fillStyle(0x3d7bd9); q.fillRoundedRect(0, 110, 54, 40, 6);
    q.fillStyle(0x15190c); q.fillRect(8, 116, 38, 12);
    q.fillStyle(0xff3b30); q.fillRect(3, 146, 10, 4); q.fillRect(41, 146, 10, 4);
  });
  tex('moto', 16, 34, (q) => {
    q.fillStyle(0x161616); q.fillRoundedRect(3, 6, 10, 26, 4);
    q.fillStyle(COLS.yel); q.fillCircle(8, 9, 6);
    q.fillStyle(0xff3b30); q.fillRect(6, 30, 4, 3);
  });
  tex('cone', 12, 12, (q) => {
    q.fillStyle(0xff7a1a); q.fillTriangle(6, 0, 12, 12, 0, 12);
    q.fillStyle(0xffffff); q.fillRect(2, 7, 8, 2);
  });
  tex('hole', 26, 14, (q) => {
    q.fillStyle(0x4a4b44); q.fillRoundedRect(0, 0, 26, 14, 7);
    q.fillStyle(0x050503); q.fillRoundedRect(3, 3, 20, 8, 4);
  });
  tex('puddle', 44, 22, (q) => {
    q.fillStyle(0x5aa9c9, 0.55); q.fillRoundedRect(0, 0, 44, 22, 11);
    q.fillStyle(0xbfe9ff, 0.4); q.fillRoundedRect(8, 5, 18, 5, 3);
  });
  tex('guay', 14, 18, (q) => {
    q.fillStyle(0xf7ffd8); q.fillRect(2, 5, 10, 13);
    q.fillStyle(COLS.yel); q.fillRect(1, 3, 12, 3);
    q.fillStyle(0xffffff, 0.8); q.fillRect(5, 0, 2, 3);
  });
  tex('pin', 36, 260, (q) => {
    q.fillStyle(COLS.mint, 0.3); q.fillRect(0, 0, 36, 260);
    q.lineStyle(3, COLS.mint, 0.9); q.strokeRect(1, 1, 34, 258);
  });
  tex('deck', 436, 140, (q) => {
    q.fillStyle(0x2b2e24); q.fillRect(0, 0, 436, 140);
    q.fillStyle(0x4b5040);
    for (let x = 0; x < 436; x += 60) q.fillRect(x, 0, 6, 140);
    q.fillStyle(COLS.yel, 0.5); q.fillRect(0, 0, 436, 3); q.fillRect(0, 137, 436, 3);
  });
  tex('sen', 18, 34, (q) => {
    q.fillStyle(0xff8a1a); q.fillRoundedRect(2, 12, 14, 20, 4);
    q.fillStyle(0xf2d2a9); q.fillCircle(9, 8, 6);
  });
  tex('rider', 18, 34, (q) => {
    q.fillStyle(0x161616); q.fillRoundedRect(4, 8, 10, 24, 4);
    q.fillStyle(COLS.mint); q.fillRoundedRect(0, 0, 18, 12, 3);
    q.fillStyle(0xffffff); q.fillRect(3, 4, 12, 2);
    q.fillStyle(COLS.yel); q.fillCircle(9, 22, 5);
  });
  tex('glow', 48, 48, (q) => {
    for (let r = 24; r > 0; r -= 2) { q.fillStyle(0xffffff, 0.06); q.fillCircle(24, 24, r); }
  });
  tex('spark', 6, 6, (q) => { q.fillStyle(0xffffff); q.fillCircle(3, 3, 3); });
  tex('drop', 2, 12, (q) => { q.fillStyle(0xbfe9ff); q.fillRect(0, 0, 2, 12); });
  tex('fog', 800, 200, (q) => {
    for (let i = 0; i < 20; i++) { q.fillStyle(0xa9b09a, 0.05 + i * 0.01); q.fillRect(0, i * 10, 800, 10); }
  });
  tex('cloud', 60, 30, (q) => {
    q.fillStyle(0xd9dccf); q.fillCircle(18, 18, 12); q.fillCircle(34, 14, 14); q.fillCircle(46, 20, 10);
  });
  tex('road', 436, 120, (q) => {
    q.fillStyle(0x1c2016); q.fillRect(0, 0, 436, 120);
    q.fillStyle(0x2a2d22); q.fillRect(400, 0, 36, 120);
    q.fillStyle(COLS.yel); q.fillRect(0, 0, 4, 120); q.fillRect(396, 0, 4, 120);
    q.fillStyle(0xf7ffd8, 0.7);
    for (const x of [80, 160, 240, 320]) for (let y = 0; y < 120; y += 60) q.fillRect(x - 2, y, 4, 30);
  });
  g.destroy();
}

// Objetos de escena. road, IMG, HUD y overlays se crean una vez
let S_ = null;
let road = null;
let IMG = [];
let GLOWS = [];
let SENG = null;
let riderImg = null;
let DROPS = [];
let SP = [];
let PT = [];
let FOG = null;
let DARK = null;
let FLASH = null;
let CLOUD = null;
let BANT = null;
let OVR = null;
let APAN = null;
let UIT = null;
let UIB = null;
let HUDV = [];
const hudT = {};

function txt(s, x, y, size, col) {
  return s.add.text(x, y, '', {
    fontFamily: 'monospace', fontSize: size + 'px', color: col, fontStyle: 'bold',
    stroke: '#000000', strokeThickness: 3, lineSpacing: 4,
  }).setOrigin(0, 0).setDepth(12);
}
function setT(o, str) {
  if (o.str !== str) { o.str = str; o.setText(str); }
}
function buildScene(s) {
  road = s.add.tileSprite(LX, 0, 436, H, 'road').setOrigin(0, 0).setDepth(0);
  s.add.rectangle(0, 0, LX, H, 0x070a02).setOrigin(0, 0).setDepth(0);
  s.add.rectangle(LX + 436, 0, W - LX - 436, H, 0x070a02).setOrigin(0, 0).setDepth(0);
  IMG = POOL.map(() => s.add.image(0, 0, 'car0').setVisible(false));
  for (let i = 0; i < 24; i++) GLOWS.push(s.add.image(0, 0, 'glow').setVisible(false).setDepth(8).setBlendMode('ADD'));
  SENG = s.add.image(0, 0, 'glow').setVisible(false).setDepth(8).setBlendMode('ADD').setTint(COLS.yel);
  riderImg = s.add.image(0, 0, 'rider').setDepth(4);
  for (let i = 0; i < 50; i++) DROPS.push(s.add.image(Math.random() * W, Math.random() * H, 'drop').setVisible(false).setDepth(9));
  for (let i = 0; i < 40; i++) SP.push({ im: s.add.image(0, 0, 'spark').setVisible(false).setDepth(11), t: 0, vx: 0, vy: 0 });
  FOG = s.add.image(0, 0, 'fog').setOrigin(0, 0).setAlpha(0).setDepth(6);
  DARK = s.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setAlpha(0).setDepth(7);
  FLASH = s.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0, 0).setAlpha(0).setDepth(9);
  CLOUD = s.add.image(400, 90, 'cloud').setVisible(false).setDepth(11);
  for (let i = 0; i < 10; i++) PT.push(txt(s, 0, 0, 15, '#ffffff').setOrigin(0.5, 0.5));

  // Paneles del HUD
  HUDV.push(s.add.rectangle(0, 0, 158, H, 0x0b0f03, 0.94).setOrigin(0, 0).setDepth(10));
  HUDV.push(s.add.rectangle(158, 0, 2, H, COLS.mint).setOrigin(0, 0).setDepth(10));
  HUDV.push(s.add.rectangle(642, 0, 158, H, 0x0b0f03, 0.94).setOrigin(0, 0).setDepth(10));
  HUDV.push(s.add.rectangle(640, 0, 2, H, COLS.mint).setOrigin(0, 0).setDepth(10));
  const labels = [
    ['tl', 14, 16, 12, '#33c8a2', 'TIEMPO'], ['pl', 14, 92, 12, '#33c8a2', 'PUNTOS'],
    ['cl', 14, 146, 12, '#33c8a2', 'COMBO'], ['tu', 14, 214, 12, '#33c8a2', 'TURBO (BOTON 2)'],
    ['pe', 14, 262, 12, '#33c8a2', 'PEDIDOS'], ['vl', 14, 326, 12, '#33c8a2', 'VELOCIDAD'],
    ['hl', 14, 388, 12, '#33c8a2', 'HORA'], ['nl', 652, 16, 12, '#33c8a2', 'PROXIMA ENTREGA'],
    ['ml', 652, 200, 12, '#33c8a2', 'RUTA'],
  ];
  for (const [k, x, y, sz, col, str] of labels) { hudT[k] = txt(s, x, y, sz, col); setT(hudT[k], str); HUDV.push(hudT[k]); }
  hudT.time = txt(s, 14, 30, 40, '#e1ff00'); HUDV.push(hudT.time);
  hudT.pts = txt(s, 14, 108, 20, '#f7ffd8'); HUDV.push(hudT.pts);
  hudT.combo = txt(s, 14, 164, 14, '#f7ffd8'); HUDV.push(hudT.combo);
  hudT.turbo = txt(s, 14, 232, 16, '#e1ff00'); HUDV.push(hudT.turbo);
  hudT.ped = txt(s, 14, 280, 26, '#f7ffd8'); HUDV.push(hudT.ped);
  hudT.kmh = txt(s, 14, 344, 18, '#f7ffd8'); HUDV.push(hudT.kmh);
  hudT.hora = txt(s, 14, 406, 16, '#f7ffd8'); HUDV.push(hudT.hora);
  hudT.next = txt(s, 652, 34, 14, '#f7ffd8'); HUDV.push(hudT.next);
  hudT.map = txt(s, 652, 218, 13, '#f7ffd8'); HUDV.push(hudT.map);

  // Banner, overlays y pantallas de inicio
  BANT = txt(s, 400, 60, 22, '#e1ff00').setOrigin(0.5, 0.5);
  OVR = s.add.rectangle(0, 0, W, H, 0x050703, 0.82).setOrigin(0, 0).setDepth(15).setVisible(false);
  APAN = s.add.rectangle(0, 420, W, 180, 0x050703, 0.85).setOrigin(0, 0).setDepth(14).setVisible(false);
  UIT = txt(s, 400, 150, 34, '#33c8a2').setOrigin(0.5, 0).setDepth(16);
  UIB = txt(s, 400, 220, 16, '#f7ffd8').setOrigin(0.5, 0).setDepth(16);
}

// Pinta el estado actual sobre la escena
function draw(dt) {
  road.tilePositionY = D;
  let gi = 0;
  for (let i = 0; i < POOL.length; i++) {
    const o = POOL[i];
    const im = IMG[i];
    if (!o.on) { im.setVisible(false); continue; }
    const y = P.sy - (o.wd - D);
    if (y < -140 || y > H + 140) { im.setVisible(false); continue; }
    const key = o.k === 'car' ? 'car' + o.c : o.k;
    if (im.texture.key !== key) im.setTexture(key);
    const blinkOn = o.blink > 0 && Math.floor(T * 6) % 2 === 0;
    im.setPosition(o.x, y).setVisible(true).setDepth(o.k === 'deck' ? 6 : 2);
    im.setTint(blinkOn ? 0xffcc33 : 0xffffff).setAlpha(o.k === 'deck' ? 0.85 : 1);
    if (o.k === 'sen') SENG.setPosition(o.x + 12, y - 6).setVisible(true).setAlpha(0.8);
    if (darkCur > 0.15 && o.mov && y < 330 && gi < GLOWS.length) {
      GLOWS[gi].setPosition(o.x, y + o.hh - 4).setVisible(true).setTint(0xff3b30).setAlpha(Math.min(1, darkCur * 2));
      gi++;
    }
  }
  for (let j = gi; j < GLOWS.length; j++) GLOWS[j].setVisible(false);
  if (!POOL.some((o) => o.on && o.k === 'sen')) SENG.setVisible(false);

  riderImg.setPosition(P.x, P.sy).setRotation((P.tilt * Math.PI) / 180);
  riderImg.setAlpha(P.inv > 0 && Math.floor(T * 16) % 2 ? 0.35 : 1);

  const rainOn = rainCur > 0.2;
  for (const d of DROPS) {
    if (!rainOn) { d.setVisible(false); continue; }
    d.y += 900 * dt;
    d.x -= 160 * dt;
    if (d.y > H) { d.y = -12; d.x = Math.random() * W; }
    d.setPosition(d.x, d.y).setVisible(true).setAlpha(Math.min(0.6, (rainCur / 4) * 0.6));
  }
  FOG.setAlpha(fogCur * 0.8);
  DARK.setAlpha(darkCur * 0.7);
  FLASH.setAlpha(flashA * 0.6);
  if (cloudT > 0) cloudT -= dt;
  CLOUD.setVisible(cloudT > 0).setAlpha(Math.floor(T * 4) % 2 ? 1 : 0.4);

  for (const sp of SP) {
    if (sp.t > 0) {
      sp.t -= dt;
      sp.im.x += sp.vx * dt;
      sp.im.y += sp.vy * dt;
      sp.vy += 500 * dt;
      sp.im.setAlpha(Math.max(0, sp.t * 2)).setVisible(true);
    } else {
      sp.im.setVisible(false);
    }
  }
  for (let i = 0; i < PT.length; i++) {
    const p = POP[i];
    const t = PT[i];
    if (!p || !(state === 'play' || state === 'attract' || state === 'over')) { t.setVisible(false); continue; }
    setT(t, p.s);
    t.setPosition(p.x, p.y - (1 - p.t) * 30).setColor(hex(p.c)).setAlpha(Math.min(1, p.t * 2)).setVisible(true);
  }

  const inGame = state === 'play' || state === 'pause' || state === 'over';
  for (const v of HUDV) v.setVisible(inGame);
  if (BAN && (state === 'play' || state === 'attract')) {
    setT(BANT, BAN.s);
    BANT.setColor(hex(BAN.c)).setAlpha(Math.min(1, BAN.t * 2)).setVisible(true);
  } else {
    BANT.setVisible(false);
  }
  if (inGame) updateHud();
  updateOverlay();
}
function updateHud() {
  setT(hudT.time, String(Math.max(0, Math.ceil(clock))));
  hudT.time.setColor(clock < 10 ? '#ff5a5a' : '#e1ff00');
  setT(hudT.pts, fmt(Math.floor(score)));
  setT(hudT.combo, comboM > 1 ? 'x' + comboM + ' ' + '='.repeat(clamp(Math.ceil(comboT * 2.5), 0, 9)) : 'x1');
  const pips = Math.floor(meter / 100);
  setT(hudT.turbo, '#'.repeat(pips) + '.'.repeat(3 - pips));
  setT(hudT.ped, String(dl));
  setT(hudT.kmh, Math.round(P.v / 4) + ' KM/H');
  const mins = 30 + Math.floor(T / 6);
  setT(hudT.hora, (5 + Math.floor(mins / 60)) + ':' + pad2(mins % 60) + ' PM');
  const Lg = demo ? DEMO_LEG : LEGS[legIdx % LEGS.length];
  const left = pinObj && pinObj.on ? Math.max(0, pinObj.wd - D) : 0;
  setT(hudT.next, Lg.to + '\n' + Lg.food + '\n' + (left / 5000).toFixed(1) + ' KM');
  setT(hudT.map, LEGS.map((L, i) => (i === legIdx % LEGS.length ? '>> ' : '   ') + L.to).join('\n'));
}
function updateOverlay() {
  const attract = state === 'attract';
  APAN.setVisible(attract);
  OVR.setVisible(state === 'pause' || state === 'over' || state === 'name' || state === 'board');
  UIT.setVisible(OVR.visible || attract);
  UIB.setVisible(OVR.visible || attract);
  if (attract) {
    const pg = attractPage();
    setT(UIT, pg.t);
    setT(UIB, pg.b);
    UIT.setPosition(400, 440).setFontSize(26);
    UIB.setPosition(400, 480).setFontSize(14);
    OVR.setVisible(false);
    return;
  }
  UIT.setPosition(400, 150).setFontSize(34);
  UIB.setPosition(400, 220).setFontSize(16);
  if (state === 'pause') {
    setT(UIT, 'PAUSA');
    setT(UIB, 'START o BOTÓN 1: SEGUIR\nBOTÓN 2: SALIR AL INICIO');
  } else if (state === 'over') {
    setT(UIT, '¡SE ENFRIÓ EL PEDIDO!');
    setT(UIB, 'ENTREGASTE ' + dl + ' PEDIDOS EN HORA PICO!\n\nPUNTOS: ' + fmt(Math.floor(score)) +
      '\nRANGO: ' + rankName() + (overT >= 1.2 ? '\n\nSTART o BOTÓN 1: OTRA VEZ' : ''));
  } else if (state === 'name') {
    setT(UIT, 'NUEVO RÉCORD');
    setT(UIB, nameText());
  } else if (state === 'board') {
    setT(UIT, 'TOP YUMMERS');
    setT(UIB, boardText() + '\n\nBOTÓN 1: OTRA VEZ · START: INICIO');
  }
}

// Efectos: chispas y temblor de cámara, en el mismo sitio donde ocurren
const BURST = {
  crash: [0xff5a5a, 18], near: [0xe1ff00, 6], pick: [0xe1ff00, 10],
  deliver: [0x33c8a2, 30], scrape: [0xf7ffd8, 8], escape: [0x33c8a2, 14],
};
function burstFx(n, x, y) {
  const b = BURST[n];
  if (!b) return;
  for (let i = 0; i < b[1]; i++) {
    const sp = SP.find((q) => q.t <= 0);
    if (!sp) return;
    sp.t = 0.5 + Math.random() * 0.3;
    sp.vx = (Math.random() - 0.5) * 300;
    sp.vy = -Math.random() * 300;
    sp.im.setPosition(x, y).setTint(b[0]).setVisible(true);
  }
}
function playFx(ev) {
  const n = ev[0];
  if (SFX[n]) SFX[n]();
  burstFx(n, ev[1], ev[2]);
  if (n === 'crash' && S_) S_.cameras.main.shake(160, 0.006);
  if (n === 'deliver' && S_) S_.cameras.main.flash(220, 51, 200, 162);
  if (n === 'thunder') flashA = 1;
}

// Audio sintetizado con Web Audio. Si no hay contexto, el juego sigue jugable
let AC = null;
let MASTER = null;
let NBUF = null;
let ENG = null;
let ENGG = null;
let RAING = null;
let mNext = 0;
let mStep = 0;
const BASS = [98, 98, 147, 147, 131, 165];
const MEL = [392, 0, 440, 494, 0, 392];

function audioInit(s) {
  try { AC = s.sound.context || null; } catch (e) { AC = null; }
  if (!AC) return;
  MASTER = AC.createGain();
  MASTER.gain.value = 0.5;
  MASTER.connect(AC.destination);
  NBUF = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const nd = NBUF.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  ENG = AC.createOscillator();
  ENG.type = 'sawtooth';
  ENG.frequency.value = 60;
  ENGG = AC.createGain();
  ENGG.gain.value = 0;
  ENG.connect(ENGG);
  ENGG.connect(MASTER);
  ENG.start();
  const rain = AC.createBufferSource();
  rain.buffer = NBUF;
  rain.loop = true;
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  RAING = AC.createGain();
  RAING.gain.value = 0;
  rain.connect(lp);
  lp.connect(RAING);
  RAING.connect(MASTER);
  rain.start();
}
function beep(f, d, type, v, f2) {
  if (!AC) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g);
  g.connect(MASTER);
  o.start(t);
  o.stop(t + d + 0.02);
}
function noise(d, v, f) {
  if (!AC) return;
  const t = AC.currentTime;
  const src = AC.createBufferSource();
  src.buffer = NBUF;
  const flt = AC.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = f || 1200;
  const g = AC.createGain();
  g.gain.setValueAtTime(v || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  src.connect(flt);
  flt.connect(g);
  g.connect(MASTER);
  src.start(t);
  src.stop(t + d + 0.05);
}
const SFX = {
  horn: () => { beep(392, 0.35, 'square', 0.06); beep(493, 0.35, 'square', 0.06); },
  crash: () => { noise(0.45, 0.35, 900); beep(180, 0.4, 'sawtooth', 0.12, 40); },
  near: () => beep(1200, 0.08, 'triangle', 0.04, 1800),
  pick: () => beep(660, 0.12, 'triangle', 0.08, 990),
  scrape: () => noise(0.12, 0.12, 2000),
  turbo: () => beep(220, 0.3, 'sawtooth', 0.07, 660),
  thunder: () => noise(1.4, 0.3, 300),
  warn: () => beep(880, 0.2, 'square', 0.05),
  escape: () => beep(440, 0.4, 'triangle', 0.09, 880),
  deliver: () => {
    beep(523, 0.18, 'triangle', 0.1);
    setTimeout(() => beep(659, 0.18, 'triangle', 0.1), 110);
    setTimeout(() => beep(784, 0.3, 'triangle', 0.1), 220);
  },
};

// Motor, lluvia y una base de joropo (3/4 en pasos cortos) mientras se juega
function audioFrame() {
  if (!AC || !P) return;
  ENG.frequency.value = 50 + P.v * 0.12;
  ENGG.gain.value = state === 'play' || state === 'over' ? 0.02 + (P.v / 300) * 0.02 : 0;
  RAING.gain.value = (rainCur / 4) * 0.12;
  if (state === 'play' || state === 'attract') {
    if (mNext < AC.currentTime) mNext = AC.currentTime;
    while (mNext < AC.currentTime + 0.1) {
      const st = mStep % 6;
      beep(BASS[st], 0.2, 'triangle', 0.05);
      if (st % 2 === 0 && MEL[st]) beep(MEL[st], 0.16, 'square', 0.015);
      mNext += rainCur > 1 ? 0.22 : 0.27;
      mStep++;
    }
  } else {
    mNext = AC.currentTime;
  }
}

function create() {
  S_ = this;
  makeTextures(this);
  buildScene(this);
  audioInit(this);
  loadBoard();
  resetRun(true);
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#0b0f03',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: {
    create,
    update: (time, delta) => {
      frame(delta);
      draw(lastDt);
    },
  },
});

})();
