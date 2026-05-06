// ─── Rarities ─────────────────────────────────────────────────────────────────
window.RARITIES = {
  נחושת: { hex: 0x8B5A2B, css: '#8B5A2B', particle: 0xaa6633 },
  ברזל:  { hex: 0x888888, css: '#888888', particle: 0xaaaaaa },
  ארד:   { hex: 0xCD7F32, css: '#CD7F32', particle: 0xddaa44 },
  כסף:   { hex: 0xC0C0C0, css: '#C0C0C0', particle: 0xdddddd },
  זהב:   { hex: 0xFFD700, css: '#FFD700', particle: 0xffee44 },
  יהלום: { hex: 0x33BBEE, css: '#33BBEE', particle: 0x77ddff },
};

// ─── Characters ───────────────────────────────────────────────────────────────
window.PAWER_CHARS = [
  { key: 'nix',  name: 'ניקס', desc: '⚔️ לוחם חרב',  sub: 'מהיר ועוצמתי',   rarity: 'נחושת', cost: 0  },
  { key: 'fik',  name: 'פיק',  desc: '🗡️ לוחם מהיר', sub: 'חמקמק ומסוכן',   rarity: 'נחושת', cost: 10 },
  { key: 'bigo', name: 'ביגו', desc: '🪓 לוחם כבד',  sub: 'חזק ועמיד',       rarity: 'נחושת', cost: 20 },
  { key: 'dim',  name: 'דים',  desc: '🗡️ לוחם ברזל', sub: 'קשוח ומסוכן',     rarity: 'ברזל',  cost: 50 },
  { key: 'coch', name: "קוץ'", desc: '⚔️ לוחם זהב',  sub: 'אגרסיבי ועז',     rarity: 'זהב',   cost: 200 },
];

// ─── Save / progression ───────────────────────────────────────────────────────
window.PAWER_SAVE = {
  getTrophies()  { return parseInt(localStorage.getItem('pawer_trophies') || '0'); },
  addTrophies(n) { localStorage.setItem('pawer_trophies', this.getTrophies() + n); },

  getChar() {
    const c = localStorage.getItem('pawer_char') || 'nix';
    return this.isCollected(c) ? c : 'nix';
  },
  setChar(c) { localStorage.setItem('pawer_char', c); },

  getCharTrophies(key) { return parseInt(localStorage.getItem(`pawer_ct_${key}`) || '0'); },
  addCharTrophies(key, n) { localStorage.setItem(`pawer_ct_${key}`, this.getCharTrophies(key) + n); },

  getCharRank(trophies) {
    if (trophies >= 1000) return { label: 'סופי',  color: '#FFD700', next: null       };
    if (trophies >= 750)  return { label: 'מטורף', color: '#cc44ff', next: 1000       };
    if (trophies >= 500)  return { label: 'טוב',   color: '#44aaff', next: 750        };
    if (trophies >= 250)  return { label: 'נחמד',  color: '#44ff88', next: 500        };
    return                       { label: 'רגיל',  color: '#aaaaaa', next: 250        };
  },

  getName()     { return localStorage.getItem('pawer_name') || ''; },
  setName(name) { localStorage.setItem('pawer_name', name.trim().slice(0, 14)); },
  hasName()     { return this.getName().length >= 2; },

  reset() {
    ['pawer_trophies','pawer_char','pawer_collected','pawer_name']
      .forEach(k => localStorage.removeItem(k));
    window.PAWER_CHARS.forEach(c => localStorage.removeItem(`pawer_ct_${c.key}`));
  },

  getCollected() {
    return JSON.parse(localStorage.getItem('pawer_collected') || '["nix"]');
  },
  isCollected(key) { return this.getCollected().includes(key); },
  collect(key) {
    const list = this.getCollected();
    if (!list.includes(key)) { list.push(key); localStorage.setItem('pawer_collected', JSON.stringify(list)); }
  },

  canUnlock(charDef) { return this.getTrophies() >= charDef.cost && !this.isCollected(charDef.key); },
};

// ─── Device detection ─────────────────────────────────────────────────────────
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

window.PAWER_CONFIG = { isMobile, worldWidth: 1920, worldHeight: 1920, mode: 'battle' };

const gameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [PreloadScene, SetupScene, MenuScene, GameScene, SoccerScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
};

window.PAWER_GAME = new Phaser.Game(gameConfig);

// Initialize peer connection early so ID is ready by the time MenuScene loads
window.PAWER_NET.init(id => console.log('[NET] ready:', id));
