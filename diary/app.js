const STORAGE_KEY = 'diary_entries';
const THEME_KEY = 'diary_theme';

const THEMES = [
  { id: 'classic',    label: 'קלאסי',        swA: '#c97d4a', swB: '#f5f0eb' },
  { id: 'night',      label: 'לילה',          swA: '#7c6fff', swB: '#0f1117' },
  { id: 'forest',     label: 'יער',           swA: '#4caf6e', swB: '#0e1a14' },
  { id: 'ocean',      label: 'אוקיינוס',      swA: '#0891b2', swB: '#e8f4f8' },
  { id: 'rose',       label: 'ורד',           swA: '#e0446a', swB: '#fff0f3' },
  { id: 'sunset',     label: 'שקיעה',         swA: '#f4734a', swB: '#1a0a1e' },
  { id: 'minimal',    label: 'מינימל',        swA: '#222222', swB: '#f8f8f8' },
  { id: 'soccer',     label: '⚽ כדורגל',     swA: '#4caf50', swB: '#0d2b0d' },
  { id: 'ninja',      label: '🥷 נינג\'ה',    swA: '#cc1111', swB: '#080808' },
  { id: 'unicorn',    label: '🦄 חד קרן',     swA: '#c040d8', swB: '#f5e0ff' },
  { id: 'princess',   label: '👑 נסיכות',     swA: '#d81e8c', swB: '#fff0f8' },
  { id: 'barcelona',  label: '🔵🔴 ברצלונה', swA: '#a50044', swB: '#00143a' },
  { id: 'realmadrid', label: '⚪ ריאל מדריד', swA: '#003087', swB: '#f0f4ff' },
  { id: 'psg',        label: '🗼 פריז',        swA: '#e30613', swB: '#001428' },
  { id: 'bayern',     label: '🔴 באיירן',      swA: '#dc052d', swB: '#1a0000' },
  { id: 'messi',      label: '🇦🇷 מסי',       swA: '#4a8ec8', swB: '#ddeeff' },
  { id: 'ronaldo',    label: '⭐ רונאלדו',     swA: '#c9a227', swB: '#080808' },
  { id: 'brawlstars', label: '💥 Brawl Stars', swA: '#ffcc00', swB: '#0a0a22' },
  { id: 'roblox',     label: '🟥 Roblox',      swA: '#e31c1c', swB: '#141414' },
];

let entries = [];
let currentId = null;
let currentMoodFilter = 'all';
let editingId = null;
let selectedMood = '';
let activeTheme = localStorage.getItem(THEME_KEY) || 'classic';

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  entries = raw ? JSON.parse(raw) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function filteredEntries() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  return entries
    .filter(e => currentMoodFilter === 'all' || e.mood === currentMoodFilter)
    .filter(e => !q || e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function updateStats() {
  document.getElementById('totalEntries').textContent = entries.length;
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const thisMonth = entries.filter(e => e.date.startsWith(month)).length;
  document.getElementById('thisMonth').textContent = thisMonth;

  const dates = [...new Set(entries.map(e => e.date))].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cur = todayStr();
  for (const d of dates) {
    if (d === cur) {
      streak++;
      const dt = new Date(cur);
      dt.setDate(dt.getDate() - 1);
      cur = dt.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  document.getElementById('streak').textContent = streak;
}

function renderList() {
  const list = document.getElementById('entriesList');
  const items = filteredEntries();
  list.innerHTML = '';
  items.forEach(e => {
    const card = document.createElement('div');
    card.className = 'entry-card' + (e.id === currentId ? ' active' : '');
    card.dataset.id = e.id;
    card.innerHTML = `
      <div class="entry-card-top">
        <span class="entry-card-mood">${e.mood || '📝'}</span>
        <span class="entry-card-date">${formatDate(e.date)}</span>
      </div>
      <div class="entry-card-title">${escHtml(e.title || 'ללא כותרת')}</div>
      <div class="entry-card-preview">${escHtml(e.body.slice(0, 60))}${e.body.length > 60 ? '...' : ''}</div>
    `;
    card.addEventListener('click', () => openEntry(e.id));
    list.appendChild(card);
  });
  updateStats();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openEntry(id) {
  currentId = id;
  const e = entries.find(x => x.id === id);
  if (!e) return;

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('entryView').style.display = 'block';
  document.getElementById('viewMood').textContent = e.mood || '📝';
  document.getElementById('viewDate').textContent = formatDate(e.date);
  document.getElementById('viewTitle').textContent = e.title || 'ללא כותרת';
  document.getElementById('viewBody').textContent = e.body;

  document.getElementById('editBtn').onclick = () => openEditModal(id);
  document.getElementById('deleteBtn').onclick = () => confirmDelete(id);

  renderList();
}

function openNewEntry() {
  editingId = null;
  selectedMood = '';
  document.getElementById('modalTitle').textContent = 'רשומה חדשה';
  document.getElementById('entryTitle').value = '';
  document.getElementById('entryDate').value = todayStr();
  document.getElementById('entryBody').value = '';
  document.getElementById('charCount').textContent = '0';
  document.querySelectorAll('.mood-pick').forEach(b => b.classList.remove('selected'));
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('entryTitle').focus();
}

function openEditModal(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  selectedMood = e.mood || '';
  document.getElementById('modalTitle').textContent = 'עריכת רשומה';
  document.getElementById('entryTitle').value = e.title;
  document.getElementById('entryDate').value = e.date;
  document.getElementById('entryBody').value = e.body;
  document.getElementById('charCount').textContent = e.body.length;
  document.querySelectorAll('.mood-pick').forEach(b => {
    b.classList.toggle('selected', b.dataset.mood === e.mood);
  });
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function saveEntry() {
  const title = document.getElementById('entryTitle').value.trim();
  const date = document.getElementById('entryDate').value;
  const body = document.getElementById('entryBody').value.trim();

  if (!date) { showToast('בחר תאריך'); return; }
  if (!body) { showToast('כתוב משהו ביומן 😊'); return; }

  if (editingId) {
    const e = entries.find(x => x.id === editingId);
    e.title = title || 'ללא כותרת';
    e.date = date;
    e.mood = selectedMood;
    e.body = body;
    e.updatedAt = Date.now();
    save();
    closeModal();
    showToast('הרשומה עודכנה ✓');
    renderList();
    openEntry(editingId);
  } else {
    const entry = {
      id: generateId(),
      title: title || 'ללא כותרת',
      date,
      mood: selectedMood,
      body,
      createdAt: Date.now(),
    };
    entries.push(entry);
    save();
    closeModal();
    showToast('הרשומה נשמרה ✓');
    renderList();
    openEntry(entry.id);
  }
}

function confirmDelete(id) {
  if (!confirm('למחוק את הרשומה? לא ניתן לשחזר.')) return;
  entries = entries.filter(e => e.id !== id);
  save();
  currentId = null;
  document.getElementById('entryView').style.display = 'none';
  document.getElementById('emptyState').style.display = '';
  renderList();
  showToast('הרשומה נמחקה');
}

function applyTheme(id) {
  activeTheme = id;
  if (id === 'classic') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = id;
  }
  localStorage.setItem(THEME_KEY, id);
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.themeId === id);
  });
}

function buildThemePanel() {
  const container = document.getElementById('themeOptions');
  THEMES.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'theme-option' + (t.id === activeTheme ? ' active' : '');
    btn.dataset.themeId = t.id;
    btn.innerHTML = `
      <span class="theme-swatch" style="--sw-a:${t.swA};--sw-b:${t.swB}"></span>
      ${t.label}
    `;
    btn.addEventListener('click', () => {
      applyTheme(t.id);
      showToast('ערכת נושא: ' + t.label);
    });
    container.appendChild(btn);
  });
}

function focusMoodSelector() {
  const selector = document.getElementById('moodSelector');
  selector.classList.add('mood-highlight');
  setTimeout(() => selector.classList.remove('mood-highlight'), 600);
  const first = selector.querySelector('.mood-pick');
  if (first) first.focus();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function init() {
  load();
  renderList();

  if (entries.length > 0) {
    const latest = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
    openEntry(latest.id);
  }

  buildThemePanel();
  applyTheme(activeTheme);

  const themeToggle = document.getElementById('themeToggleBtn');
  const themePanel = document.getElementById('themePanel');
  themeToggle.addEventListener('click', e => {
    e.stopPropagation();
    themePanel.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!themePanel.contains(e.target) && e.target !== themeToggle) {
      themePanel.classList.remove('open');
    }
  });

  document.getElementById('newEntryBtn').addEventListener('click', openNewEntry);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveEntry);

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  document.getElementById('entryBody').addEventListener('input', function() {
    document.getElementById('charCount').textContent = this.value.length;
  });

  document.getElementById('search').addEventListener('input', renderList);

  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMoodFilter = btn.dataset.mood;
      renderList();
    });
  });

  document.querySelectorAll('.mood-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-pick').forEach(b => b.classList.remove('selected'));
      if (selectedMood === btn.dataset.mood) {
        selectedMood = '';
      } else {
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
      }
    });

    btn.addEventListener('keydown', e => {
      const picks = [...document.querySelectorAll('.mood-pick')];
      const idx = picks.indexOf(btn);
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        picks[(idx + 1) % picks.length].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        picks[(idx - 1 + picks.length) % picks.length].focus();
      } else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('entryBody').focus();
      }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && document.getElementById('modalOverlay').classList.contains('open')) {
      e.preventDefault();
      saveEntry();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !document.getElementById('modalOverlay').classList.contains('open')) {
      e.preventDefault();
      openNewEntry();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '1' && document.getElementById('modalOverlay').classList.contains('open')) {
      e.preventDefault();
      focusMoodSelector();
    }
  });
}

window.openNewEntry = openNewEntry;
init();
