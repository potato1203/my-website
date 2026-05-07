// ─── Translation system ───────────────────────────────────────────────────────
const _TRANS_KEY = 'pawer_trans2_'; // bump suffix to invalidate old caches
window.PAWER_LANG = localStorage.getItem('pawer_lang') || 'iw';
window.PAWER_TRANSLATIONS = {};
try {
  const _s = localStorage.getItem(_TRANS_KEY + window.PAWER_LANG);
  if (_s) window.PAWER_TRANSLATIONS = JSON.parse(_s);
} catch(e) {}
// If a non-Hebrew language is set but the cache is empty (stale), fall back to Hebrew
if (window.PAWER_LANG !== 'iw' && Object.keys(window.PAWER_TRANSLATIONS).length === 0) {
  localStorage.setItem('pawer_lang', 'iw');
  window.PAWER_LANG = 'iw';
}
window.T = function(text) {
  if (!text || window.PAWER_LANG === 'iw') return text;
  return window.PAWER_TRANSLATIONS[text] || text;
};


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
  { key: 'nix',    name: 'ניקס',   nameRom: 'Nix',    desc: '⚔️ לוחם חרב',         sub: 'מהיר ועוצמתי',      rarity: 'נחושת', cost: 0   },
  { key: 'fik',    name: 'פיק',    nameRom: 'Fik',    desc: '🗡️ לוחם מהיר',        sub: 'חמקמק ומסוכן',      rarity: 'נחושת', cost: 10  },
  { key: 'bigo',   name: 'ביגו',   nameRom: 'Bigo',   desc: '🪓 לוחם כבד',          sub: 'חזק ועמיד',         rarity: 'נחושת', cost: 20  },
  { key: 'dim',    name: 'דים',    nameRom: 'Dim',    desc: '🗡️ לוחם ברזל',        sub: 'קשוח ומסוכן',       rarity: 'ברזל',  cost: 50  },
  { key: 'priti',  name: 'פריטי',  nameRom: 'Priti',  desc: '🌩️ לוחמת ברקים',     sub: 'מכה מתפשטת',        rarity: 'ברזל',  cost: 60  },
  { key: 'sliper', name: 'סליפר',  nameRom: 'Sliper', desc: '🔱 שלישיית כדורים',   sub: 'מכה שלוש כיוונים',  rarity: 'ברזל',  cost: 80  },
  { key: 'coch',   name: "קוץ'",   nameRom: 'Coch',   desc: '⚔️ לוחם זהב',         sub: 'אגרסיבי ועז',       rarity: 'זהב',   cost: 200 },
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

// ─── All translatable strings ──────────────────────────────────────────────────
window.PAWER_ALL_STRINGS = [
  // SetupScene
  '👋 ברוך הבא ל-PAWER!', 'בחר שם משתמש:', '✅  התחל לשחק!',
  '⚠️ השם צריך להיות לפחות 2 תווים',
  // MenuScene
  '👆 לחץ לבחירת דמות', '⚔️  קרב פאוור', '⚽  כדור פאוור', '▶  שחק',
  '🧑‍🤝‍🧑  בחר דמות', '👑 נבחר', '✔ נאסף', '👆 לחץ לפתיחה!',
  '👥  שחק עם חבר', 'הקוד שלך:', '📋 העתק קוד', '✅ הועתק!',
  'קוד של חבר:', '✅ מחובר! — לחץ מוכן כשמוכן',
  'אתה: ⏳', 'חבר: ⏳', '🚀 מתחיל...', 'אתה: ✅', 'חבר: ✅',
  '✅  מוכן!', '🔗 התחבר', '⚠️ הזן קוד בן 6 תווים',
  '🔄 מתחבר...', '❌ לא ניתן להתחבר — בדוק את הקוד',
  '⚙️  הגדרות', '✏️  שנה שם', '🗑️  אפס משחק', '🌐  שינוי שפה',
  '⚠️ לפחות 2 תווים', 'ביטול', '💾 שמור',
  '⚠️  אפס משחק', 'כל הגביעים, הדמויות והשם\nיימחקו לתמיד!',
  '❌ ביטול', '🗑️ אפס!', '⬆️  עלית דרגה!', '🏆 הושג!',
  // Rank & rarity labels
  'סופי', 'מטורף', 'טוב', 'נחמד', 'רגיל',
  'נחושת', 'ברזל', 'ארד', 'כסף', 'זהב', 'יהלום',
  // Character descriptions (names are proper nouns — not translated)
  '⚔️ לוחם חרב', 'מהיר ועוצמתי',
  '🗡️ לוחם מהיר', 'חמקמק ומסוכן',
  '🪓 לוחם כבד', 'חזק ועמיד',
  '🗡️ לוחם ברזל', 'קשוח ומסוכן',
  '🌩️ לוחמת ברקים', 'מכה מתפשטת',
  '🔱 שלישיית כדורים', 'מכה שלוש כיוונים',
  '⚔️ לוחם זהב', 'אגרסיבי ועז',
  // Template literal fragments
  'עם', 'שם נוכחי:', 'דרגות', 'סה"כ עם', 'נפתח!', 'הובס!',
  'לפתיחת', 'צריך עוד', 'סה"כ:', 'סה"כ כללי:',
  // Input placeholders
  'שמך כאן...', 'חפש דמות...',
  // Game messages
  'GO!', 'שחקן', '🔄  שחק שוב', '🏠  תפריט ראשי',
  '🏆 ניצחון!', '💀 הובסת!', '💀 הפסד!', 'החבר התנתק 😢',
  '💀 מתחדש...', '⚽  גול! 🔵', '⚽  גול! 🔴',
];

// ─── Translation fetcher ───────────────────────────────────────────────────────
window.PAWER_fetchTranslations = async function(langCode, onProgress) {
  const BATCH = 5;
  const strings = window.PAWER_ALL_STRINGS;
  const total = strings.length + window.PAWER_CHARS.length;
  const dict = {};

  // Translate regular UI strings from Hebrew
  for (let i = 0; i < strings.length; i += BATCH) {
    const batch = strings.slice(i, i + BATCH);
    await Promise.all(batch.map(async (s) => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=${langCode}&dt=t&q=${encodeURIComponent(s)}`;
        const r = await fetch(url);
        const data = await r.json();
        dict[s] = data[0].map(seg => seg[0]).join('');
      } catch(e) { dict[s] = s; }
    }));
    if (onProgress) onProgress(Math.min((i + BATCH) / total, 0.9));
  }

  // Transliterate character names from their Latin form (sl=en) so GT adapts
  // the pronunciation to the target script instead of translating the meaning
  await Promise.all(window.PAWER_CHARS.map(async (c) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${langCode}&dt=t&q=${encodeURIComponent(c.nameRom)}`;
      const r = await fetch(url);
      const data = await r.json();
      dict[c.name] = data[0].map(seg => seg[0]).join('');
    } catch(e) { dict[c.name] = c.nameRom; }
  }));

  if (onProgress) onProgress(1);
  localStorage.setItem(_TRANS_KEY + langCode, JSON.stringify(dict));
  return dict;
};

// ─── Phaser text monkey-patch (auto-translate all canvas text) ────────────────
if (window.PAWER_LANG !== 'iw') {
  const _origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  Phaser.GameObjects.GameObjectFactory.prototype.text = function(x, y, t, s) {
    return _origText.call(this, x, y, typeof t === 'string' ? window.T(t) : t, s);
  };
  const _origSetText = Phaser.GameObjects.Text.prototype.setText;
  Phaser.GameObjects.Text.prototype.setText = function(v) {
    return _origSetText.call(this, typeof v === 'string' ? window.T(v) : v);
  };
}
