class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const { width: w, height: h } = this.scale;
    this._addBackground(w, h);
    this._addSkulls(w, h);
    this._addLogo(w, h);
    this._addCharacter(w, h);
    this._addTrophyCounter(w, h);
    this._addPlayButton(w, h);
    const settingsBtn = this._addSettingsButton(w, h);
    this._addMultiplayerButton(w, h, settingsBtn);
    this.cameras.main.fadeIn(500);

    if (window.PAWER_CONFIG.pendingRankUp) {
      const { rank, charName } = window.PAWER_CONFIG.pendingRankUp;
      window.PAWER_CONFIG.pendingRankUp = null;
      this.time.delayedCall(700, () => this._showRankUp(rank, charName));
    }
  }

  // ─── BACKGROUND ──────────────────────────────────────────────────────────────

  _addBackground(w, h) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x55aadd, 0x55aadd, 0x2277bb, 0x2277bb, 1);
    bg.fillRect(0, 0, w, h);
  }

  // ─── SKULLS ──────────────────────────────────────────────────────────────────

  _addSkulls(w, h) {
    for (let i = 0; i < 28; i++) {
      const skull = this.add.text(
        Math.random() * w, Math.random() * h,
        '💀', { fontSize: (18 + Math.random() * 32) + 'px' }
      ).setOrigin(0.5).setAlpha(0.08 + Math.random() * 0.15);
      this.tweens.add({
        targets: skull, alpha: skull.alpha * 0.15, y: skull.y - 14,
        duration: 1800 + Math.random() * 2400,
        yoyo: true, repeat: -1, delay: Math.random() * 2000,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── LOGO ────────────────────────────────────────────────────────────────────

  _addLogo(w, h) {
    const logo = this.add.image(w / 2, h * 0.13, 'logo');
    const maxW = Math.min(260, w * 0.5);
    logo.setScale(maxW / logo.width);
    this.tweens.add({
      targets: logo, y: h * 0.13 - 7,
      scaleX: logo.scaleX * 1.02, scaleY: logo.scaleY * 1.02,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ─── SELECTED CHARACTER (center) ─────────────────────────────────────────────

  _addCharacter(w, h) {
    const key = window.PAWER_SAVE.getChar();
    const charDef = window.PAWER_CHARS.find(c => c.key === key);
    const rar = window.RARITIES[charDef.rarity];

    const img = this.add.image(w / 2, h * 0.51, key);
    img.setScale(Math.min(h * 0.5, 340) / img.height);
    this.tweens.add({
      targets: img, y: h * 0.51 - 12,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Rarity glow ring behind character
    const ring = this.add.graphics().setDepth(-1);
    ring.fillStyle(rar.hex, 0.18);
    ring.fillCircle(w / 2, h * 0.51, img.displayWidth * 0.7);

    // Name + rarity badge + character trophies
    const nameY = h * 0.51 + img.displayHeight / 2 + 16;
    this.add.text(w / 2, nameY, charDef.name, {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#003366', strokeThickness: 4,
    }).setOrigin(0.5);

    this._rarityBadge(w / 2, nameY + 28, charDef.rarity, rar);

    // Character personal trophies + rank
    const charT = window.PAWER_SAVE.getCharTrophies(key);
    const rank  = window.PAWER_SAVE.getCharRank(charT);
    this.add.text(w / 2, nameY + 50, `🏆 ${charT} עם ${charDef.name}`, {
      fontSize: '14px', color: '#ffdd99',
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    const rankRow = rank.next !== null
      ? `★ ${rank.label}  (${charT}/${rank.next})`
      : `★ ${rank.label}  ✔`;
    const rankBadge = this.add.text(w / 2, nameY + 68, rankRow, {
      fontSize: '13px', color: rank.color,
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: rankBadge, alpha: 0.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    rankBadge.on('pointerover', () => { rankBadge.setAlpha(1); this.tweens.killTweensOf(rankBadge); });
    rankBadge.on('pointerout',  () => this.tweens.add({ targets: rankBadge, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 }));
    rankBadge.on('pointerdown', () => this._openRankProgress(w, h, charDef, charT));

    // Hint
    const hint = this.add.text(w / 2, nameY + 88, '👆 לחץ לבחירת דמות', {
      fontSize: '13px', color: '#ddeeff', fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });

    // Click zone
    this.add.zone(w / 2, h * 0.51, img.displayWidth, img.displayHeight)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._openCharSelect(w, h));
  }

  _rarityBadge(x, y, label, rar, depth = 0, size = 13) {
    const badge = this.add.text(x, y, `✦ ${label} ✦`, {
      fontSize: size + 'px',
      color: rar.css,
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(depth);
    return badge;
  }

  // ─── TROPHY COUNTER ──────────────────────────────────────────────────────────

  _addTrophyCounter(w, h) {
    const t = window.PAWER_SAVE.getTrophies();
    this.add.rectangle(14, 14, 120, 36, 0x003366, 0.75).setOrigin(0, 0);
    this.add.text(20, 32, `🏆  ${t}`, {
      fontSize: '18px', color: '#ffdd00',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 1);
  }

  // ─── PLAY BUTTON ─────────────────────────────────────────────────────────────

  _addPlayButton(w, h) {
    if (!window.PAWER_CONFIG.mode) window.PAWER_CONFIG.mode = 'battle';

    const MODES = [
      { key: 'battle', label: '⚔️  קרב פאוור', bg: '#883300' },
      { key: 'soccer', label: '⚽  כדור פאוור', bg: '#115522' },
    ];
    let modeIdx = MODES.findIndex(m => m.key === window.PAWER_CONFIG.mode);
    if (modeIdx < 0) modeIdx = 0;

    const modeBtn = this.add.text(w - 24, h - 70, MODES[modeIdx].label, {
      fontSize: '14px', color: '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: MODES[modeIdx].bg, padding: { x: 13, y: 7 },
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    modeBtn.on('pointerdown', () => {
      modeIdx = (modeIdx + 1) % MODES.length;
      const m = MODES[modeIdx];
      modeBtn.setText(m.label).setStyle({ backgroundColor: m.bg });
      window.PAWER_CONFIG.mode = m.key;
    });
    modeBtn.on('pointerover', () => modeBtn.setAlpha(0.8));
    modeBtn.on('pointerout',  () => modeBtn.setAlpha(1));

    const btn = this.add.text(w - 24, h - 24, '▶  שחק', {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      backgroundColor: '#cc4400', padding: { x: 28, y: 12 },
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#ee5500' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#cc4400' }));
    btn.on('pointerdown', () => {
      const scene = window.PAWER_CONFIG.mode === 'soccer' ? 'SoccerScene' : 'GameScene';
      this.cameras.main.fade(350, 0, 0, 0);
      this.time.delayedCall(350, () => this.scene.start(scene));
    });
  }

  // ─── CHARACTER SELECTION OVERLAY ─────────────────────────────────────────────

  _openCharSelect(w, h) {
    const trophies   = window.PAWER_SAVE.getTrophies();
    const currentKey = window.PAWER_SAVE.getChar();
    const pool = [];

    // Backdrop
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.85).setDepth(80).setInteractive();
    pool.push(backdrop);

    // Panel
    const panelW = Math.min(w * 0.92, 700);
    const panelH = Math.min(h * 0.85, 540);
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x09172a, 1).setDepth(81).setStrokeStyle(2, 0x3366aa));

    // Title
    pool.push(this.add.text(w / 2, h / 2 - panelH / 2 + 28, '🧑‍🤝‍🧑  בחר דמות', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82));
    pool.push(this.add.rectangle(w / 2, h / 2 - panelH / 2 + 50, panelW - 40, 1, 0x334466).setDepth(82));

    // Close
    const closeBtn = this.add.text(w / 2 + panelW / 2 - 14, h / 2 - panelH / 2 + 20, '✕', {
      fontSize: '22px', color: '#aabbcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(83).setInteractive({ useHandCursor: true });
    pool.push(closeBtn);
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#aabbcc' }));

    // ── Search input ─────────────────────────────────────────────────────────
    const searchY = h / 2 - panelH / 2 + 78;
    pool.push(this.add.text(w / 2 - panelW / 2 + 22, searchY, '🔍', { fontSize: '15px' })
      .setOrigin(0, 0.5).setDepth(83));
    const searchInput = this._makeHTMLInput(w, h, searchY);
    searchInput.maxLength = 14;
    searchInput.placeholder = 'חפש דמות...';
    pool.push({ destroy: () => {
      if (document.body.contains(searchInput)) document.body.removeChild(searchInput);
    }});

    // ── Grid setup ───────────────────────────────────────────────────────────
    const HEADER       = 108;
    const PAD          = 18;
    const COL_GAP      = 14;
    const ROW_GAP      = 10;
    const ROWS_PER_COL = 3;
    const COLS         = Math.ceil(window.PAWER_CHARS.length / ROWS_PER_COL);
    const scrollTop    = h / 2 - panelH / 2 + HEADER;
    const scrollH      = panelH - HEADER - 8;
    const pLeft        = w / 2 - panelW / 2;
    const cardH        = 200;
    const cardW        = Math.floor((panelW - PAD * 2 - (COLS - 1) * COL_GAP) / COLS);

    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(pLeft, scrollTop, panelW, scrollH);
    const mask = maskGfx.createGeometryMask();
    const cnt  = this.add.container(0, 0).setDepth(82);
    cnt.setMask(mask);
    pool.push(cnt);

    let closed = false, maxScroll = 0, scrollY = 0;
    let dragY0 = null, scroll0 = 0, isDragging = false;

    const closeAll = () => {
      if (closed) return; closed = true;
      this.input.off('pointerdown', onDragStart);
      this.input.off('pointermove', onDragMove);
      this.input.off('pointerup',   onDragEnd);
      pool.forEach(o => o.destroy());
      maskGfx.destroy();
    };
    closeBtn.on('pointerdown', closeAll);

    // ── Build / rebuild cards for a given filter ──────────────────────────────
    const buildCards = (filter) => {
      cnt.list.slice().forEach(o => o.destroy());

      const chars = filter
        ? window.PAWER_CHARS.filter(ch => ch.name.includes(filter))
        : window.PAWER_CHARS;

      chars.forEach((ch, i) => {
        const col = Math.floor(i / ROWS_PER_COL);
        const row = i % ROWS_PER_COL;
        const cx  = pLeft + PAD + col * (cardW + COL_GAP) + cardW / 2;
        const cy  = scrollTop + ROW_GAP + row * (cardH + ROW_GAP) + cardH / 2;

        const collected  = window.PAWER_SAVE.isCollected(ch.key);
        const affordable = trophies >= ch.cost;
        const selected   = ch.key === currentKey;
        const rar        = window.RARITIES[ch.rarity];

        const { zone, objs } = this._makeCard(cx, cy, cardW, cardH, ch, rar, collected, affordable, selected, trophies, pool);
        objs.forEach(o => cnt.add(o));

        zone.on('pointerup', (ptr) => {
          if (closed || isDragging) return;
          if (ptr.y < scrollTop || ptr.y > scrollTop + scrollH) return;
          if (!collected && affordable) {
            closeAll(); this._playUnlockAnim(ch, rar, w, h);
          } else if (collected && !selected) {
            window.PAWER_SAVE.setChar(ch.key);
            closeAll(); this._refreshScene();
          } else if (!affordable) {
            this._showMsg(w / 2, h / 2 + panelH / 2 - 20,
              `צריך עוד ${ch.cost - trophies} 🏆 לפתיחת ${ch.name}`, '#ff6666');
          }
        });
      });

      const rows    = Math.min(chars.length, ROWS_PER_COL);
      const contentH = rows * (cardH + ROW_GAP) + ROW_GAP;
      maxScroll = Math.max(0, contentH - scrollH);
      scrollY   = 0;
      cnt.setY(0);
    };

    buildCards('');
    searchInput.addEventListener('input', () => { if (!closed) buildCards(searchInput.value.trim()); });

    // ── Scroll ────────────────────────────────────────────────────────────────
    const onDragStart = (ptr) => {
      if (closed) return;
      if (ptr.y >= scrollTop && ptr.y <= h / 2 + panelH / 2 &&
          ptr.x >= pLeft && ptr.x <= pLeft + panelW) {
        dragY0 = ptr.y; scroll0 = scrollY; isDragging = false;
      }
    };
    const onDragMove = (ptr) => {
      if (closed || dragY0 === null) return;
      const dy = ptr.y - dragY0;
      if (Math.abs(dy) > 6) isDragging = true;
      if (!isDragging) return;
      scrollY = Phaser.Math.Clamp(scroll0 - dy, 0, maxScroll);
      cnt.setY(-scrollY);
    };
    const onDragEnd = () => {
      if (closed) return;
      dragY0 = null;
      this.time.delayedCall(50, () => { isDragging = false; });
    };

    this.input.on('pointerdown', onDragStart);
    this.input.on('pointermove', onDragMove);
    this.input.on('pointerup',   onDragEnd);
  }

  _makeCard(cx, cy, cw, ch, charDef, rar, collected, affordable, selected, trophies, pool) {
    const D = 82;
    const objs = [];

    const borderCol = selected ? 0xffdd00 : (collected ? rar.hex : 0x334466);
    const bgCol     = selected ? 0x112255 : 0x0d1a33;

    const bg = this.add.rectangle(cx, cy, cw, ch, bgCol, 1)
      .setDepth(D).setStrokeStyle(selected ? 3 : 2, borderCol);
    objs.push(bg);

    // Rarity strip at top
    const strip = this.add.rectangle(cx, cy - ch / 2 + 8, cw, 16, rar.hex, collected ? 0.75 : 0.25).setDepth(D + 1);
    objs.push(strip);

    // Status label on strip
    if (selected) {
      objs.push(this.add.text(cx, cy - ch / 2 + 8, '👑 נבחר', {
        fontSize: '11px', color: '#ffdd00', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D + 2));
    } else if (collected) {
      objs.push(this.add.text(cx, cy - ch / 2 + 8, '✔ נאסף', {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(D + 2));
    }

    // Character image (upper half)
    const img = this.add.image(cx, cy - ch * 0.14, charDef.key);
    img.setScale(Math.min(cw * 0.65, ch * 0.42) / img.height).setDepth(D + 1);
    objs.push(img);

    // Name
    objs.push(this.add.text(cx, cy + ch * 0.20, charDef.name, {
      fontSize: '17px', color: selected ? '#ffdd00' : '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D + 1));

    // Rarity badge
    objs.push(this._rarityBadge(cx, cy + ch * 0.30, charDef.rarity, rar, D + 1, 12));

    // Description
    objs.push(this.add.text(cx, cy + ch * 0.38, charDef.desc, {
      fontSize: '12px', color: '#8899cc', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(D + 1));

    if (collected) {
      const charT = window.PAWER_SAVE.getCharTrophies(charDef.key);
      const rank  = window.PAWER_SAVE.getCharRank(charT);
      objs.push(this.add.text(cx, cy + ch * 0.42, `🏆 ${charT}  ★ ${rank.label}`, {
        fontSize: '12px', color: '#ffdd77', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(D + 1));
    }

    // Lock overlay
    if (!collected) {
      objs.push(this.add.rectangle(cx, cy, cw, ch, 0x000000, 0.6).setDepth(D + 2));
      objs.push(this.add.text(cx, cy - 22, affordable ? '🔓' : '🔒', { fontSize: '30px' })
        .setOrigin(0.5).setDepth(D + 3));
      objs.push(this.add.text(cx, cy + 16, `${charDef.cost} 🏆`, {
        fontSize: '16px', color: affordable ? '#88ff88' : '#ffdd00',
        fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D + 3));

      const bw = cw * 0.7;
      const prog = Math.min(trophies / charDef.cost, 1);
      objs.push(this.add.rectangle(cx, cy + 38, bw, 8, 0x223355).setDepth(D + 3));
      if (prog > 0) objs.push(this.add.rectangle(cx - bw / 2 + (bw * prog) / 2, cy + 38, bw * prog, 8, affordable ? 0x44ff88 : 0xffaa00).setDepth(D + 3));
      objs.push(this.add.text(cx, cy + 52, `${trophies} / ${charDef.cost}`, {
        fontSize: '11px', color: '#aabbcc', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(D + 3));
      if (affordable) {
        objs.push(this.add.text(cx, cy + 66, '👆 לחץ לפתיחה!', {
          fontSize: '12px', color: '#aaffaa', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(D + 3));
      }
    }

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => { if (!selected) bg.setFillStyle(0x152040); });
    bg.on('pointerout',  () => { bg.setFillStyle(selected ? 0x112255 : 0x0d1a33); });

    return { zone: bg, objs };
  }

  // ─── UNLOCK ANIMATION (EPIC) ─────────────────────────────────────────────────

  _playUnlockAnim(charDef, rar, w, h) {
    const pool = [];
    const D = 100;
    const cx = w / 2, cy = h / 2;

    // ── Phase 0: flash white ──────────────────────────────────────────────────
    const flash = this.add.rectangle(cx, cy, w, h, 0xffffff, 0).setDepth(D + 10);
    pool.push(flash);
    this.tweens.add({
      targets: flash, alpha: 0.9, duration: 80, yoyo: true,
      onComplete: () => this.tweens.add({ targets: flash, alpha: 0, duration: 250 }),
    });

    // ── Phase 0: dark backdrop ────────────────────────────────────────────────
    const backdrop = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setDepth(D);
    pool.push(backdrop);
    this.tweens.add({ targets: backdrop, alpha: 0.94, duration: 400 });

    // ── Phase 1: shockwave rings ──────────────────────────────────────────────
    const spawnRing = (delay, size, color, thick) => {
      this.time.delayedCall(delay, () => {
        const ring = this.add.graphics().setDepth(D + 3);
        pool.push(ring);
        ring.lineStyle(thick, color, 1);
        ring.strokeCircle(cx, cy, size);
        this.tweens.add({
          targets: ring,
          scaleX: 4.5, scaleY: 4.5, alpha: 0,
          duration: 700, ease: 'Expo.easeOut',
          onComplete: () => ring.destroy(),
        });
      });
    };
    spawnRing(50,  30, rar.hex,      8);
    spawnRing(150, 30, 0xffffff,     5);
    spawnRing(280, 30, rar.particle, 6);
    spawnRing(420, 30, rar.hex,      4);

    // ── Phase 1: rarity BG circle ─────────────────────────────────────────────
    this.time.delayedCall(80, () => {
      const bg = this.add.circle(cx, cy, 8, rar.hex, 0.9).setDepth(D + 1);
      pool.push(bg);
      this.tweens.add({
        targets: bg,
        scaleX: Math.max(w, h) / 4, scaleY: Math.max(w, h) / 4,
        duration: 600, ease: 'Expo.easeOut',
      });
    });

    // ── Phase 1: star burst particles (wave 1) ────────────────────────────────
    this._spawnParticles(pool, cx, cy, 40, rar, 0, 60, 280, D + 4);

    // ── Phase 1: star burst particles (wave 2 - slower, bigger) ──────────────
    this._spawnParticles(pool, cx, cy, 25, rar, 200, 100, 400, D + 4);

    // ── Phase 1: sparks (thin long streaks) ──────────────────────────────────
    this.time.delayedCall(100, () => {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const len = 80 + Math.random() * 160;
        const spark = this.add.graphics().setDepth(D + 5);
        pool.push(spark);
        spark.lineStyle(2, rar.particle, 1);
        spark.lineBetween(cx, cy, cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10);
        this.tweens.add({
          targets: spark,
          x: Math.cos(angle) * len, y: Math.sin(angle) * len,
          alpha: 0, duration: 500 + Math.random() * 200,
          ease: 'Expo.easeOut',
        });
      }
    });

    // ── Phase 2: rarity label slams down ─────────────────────────────────────
    this.time.delayedCall(380, () => {
      const lbl = this.add.text(cx, cy - h * 0.32, `✦  ${charDef.rarity}  ✦`, {
        fontSize: '32px', color: rar.css,
        fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setScale(3).setAlpha(0).setDepth(D + 6);
      pool.push(lbl);
      this.tweens.add({
        targets: lbl, scale: 1, alpha: 1,
        duration: 350, ease: 'Back.easeOut',
      });
      // Shimmer
      this.tweens.add({
        targets: lbl, alpha: 0.6, duration: 400,
        yoyo: true, repeat: -1, delay: 400, ease: 'Sine.easeInOut',
      });
    });

    // ── Phase 2: character SLAMS in ───────────────────────────────────────────
    this.time.delayedCall(500, () => {
      const img = this.add.image(cx, cy - 20, charDef.key)
        .setDepth(D + 7).setScale(0).setAlpha(0);
      const targetScale = Math.min(h * 0.46, 310) / img.height;
      pool.push(img);
      this.tweens.add({
        targets: img, scale: targetScale * 1.15, alpha: 1,
        duration: 280, ease: 'Back.easeOut',
        onComplete: () => {
          // Settle back slightly
          this.tweens.add({ targets: img, scale: targetScale, duration: 180, ease: 'Sine.easeOut' });
          // Impact shockwave
          spawnRing(0, 40, 0xffffff, 10);
          this._spawnParticles(pool, cx, cy, 20, rar, 0, 40, 160, D + 8);
          // Screen shake simulation
          this.tweens.add({ targets: img, x: cx + 6, duration: 40, yoyo: true, repeat: 5, ease: 'Linear' });
        },
      });

      // Glow halo behind character
      const halo = this.add.circle(cx, cy - 20, 10, rar.hex, 0.5).setDepth(D + 6).setScale(0);
      pool.push(halo);
      this.tweens.add({ targets: halo, scale: targetScale * 2.8, duration: 400, ease: 'Expo.easeOut' });
      this.tweens.add({ targets: halo, alpha: 0.15, duration: 800, delay: 400, yoyo: true, repeat: -1 });
    });

    // ── Phase 3: name text ────────────────────────────────────────────────────
    this.time.delayedCall(820, () => {
      const nameT = this.add.text(cx, cy + h * 0.28, `🎉  ${charDef.name} נפתח!  🎉`, {
        fontSize: '28px', color: '#ffffff',
        fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setAlpha(0).setScale(0.4).setDepth(D + 8);
      pool.push(nameT);
      this.tweens.add({ targets: nameT, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
    });

    // ── Phase 3: continuous sparkles ─────────────────────────────────────────
    this.time.delayedCall(600, () => {
      const sparkTimer = this.time.addEvent({
        delay: 80, repeat: 30,
        callback: () => {
          const angle = Math.random() * Math.PI * 2;
          const r = 40 + Math.random() * Math.min(w, h) * 0.28;
          const sp = this.add.star(
            cx + Math.cos(angle) * r,
            cy + Math.sin(angle) * r,
            5, 3, 7, rar.particle, 1
          ).setDepth(D + 9).setRotation(Math.random() * Math.PI);
          pool.push(sp);
          this.tweens.add({
            targets: sp, alpha: 0, scaleX: 0, scaleY: 0,
            duration: 500, delay: 100,
            onComplete: () => sp.destroy(),
          });
        },
      });
    });

    // ── Phase 4: collect button ───────────────────────────────────────────────
    this.time.delayedCall(1200, () => {
      const btn = this.add.text(cx, cy + h * 0.40, '🏆  אסוף!', {
        fontSize: '28px', color: '#ffffff',
        fontFamily: 'Arial', fontStyle: 'bold',
        backgroundColor: '#7a3a00',
        padding: { x: 34, y: 14 },
      }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(D + 9)
        .setInteractive({ useHandCursor: true });
      pool.push(btn);
      this.tweens.add({ targets: btn, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
      this.tweens.add({ targets: btn, scaleX: 1.06, scaleY: 1.06, duration: 550, yoyo: true, repeat: -1, delay: 400, ease: 'Sine.easeInOut' });

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#aa5500' }));
      btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#7a3a00' }));
      btn.on('pointerdown', () => {
        window.PAWER_SAVE.collect(charDef.key);
        window.PAWER_SAVE.setChar(charDef.key);
        pool.forEach(o => { try { o.destroy(); } catch(e){} });
        this._refreshScene();
      });
    });
  }

  _spawnParticles(pool, cx, cy, count, rar, delay, minDist, maxDist, depth) {
    this.time.delayedCall(delay, () => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = minDist + Math.random() * (maxDist - minDist);
        const size  = 4 + Math.random() * 10;
        const col   = Math.random() > 0.5 ? rar.hex : rar.particle;
        const p = this.add.circle(cx, cy, size, col, 1).setDepth(depth);
        pool.push(p);
        this.tweens.add({
          targets: p,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: 500 + Math.random() * 500,
          ease: 'Expo.easeOut',
          onComplete: () => p.destroy(),
        });
      }
    });
  }

  // ─── MULTIPLAYER ─────────────────────────────────────────────────────────────

  _addMultiplayerButton(w, h, settingsBtn) {
    const x = 16 + settingsBtn.width + 10;
    const btn = this.add.text(x, h - 16, '👥', { fontSize: '28px' })
      .setOrigin(0, 1).setInteractive({ useHandCursor: true }).setAlpha(0.7);
    btn.on('pointerover', () => btn.setAlpha(1));
    btn.on('pointerout',  () => btn.setAlpha(0.7));
    btn.on('pointerdown', () => this._openMultiplayerPanel(w, h));

    // Green dot when already connected
    if (window.PAWER_NET.connected) {
      this.add.circle(x + btn.width - 4, h - 16 - btn.height + 4, 6, 0x44ff44).setOrigin(0.5);
    }
  }

  _openMultiplayerPanel(w, h) {
    const net = window.PAWER_NET;
    const pool = [];
    let codeInput = null;

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.82)
      .setDepth(80).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.92, 460);
    const panelH = 370;
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x080f1e, 1)
      .setDepth(81).setStrokeStyle(2, 0x3366aa));

    pool.push(this.add.text(w / 2, h / 2 - panelH / 2 + 28, '👥  שחק עם חבר', {
      fontSize: '21px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82));

    pool.push(this.add.rectangle(w / 2, h / 2 - panelH / 2 + 50, panelW - 40, 1, 0x334466).setDepth(82));

    const closeBtn = this.add.text(w / 2 + panelW / 2 - 14, h / 2 - panelH / 2 + 20, '✕', {
      fontSize: '20px', color: '#aabbcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(83).setInteractive({ useHandCursor: true });
    pool.push(closeBtn);

    const closeAll = () => {
      net.off('connect');
      net.off('ready');
      pool.forEach(o => o.destroy());
      if (codeInput && document.body.contains(codeInput)) document.body.removeChild(codeInput);
      codeInput = null;
    };
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#aabbcc' }));
    closeBtn.on('pointerdown', closeAll);
    backdrop.on('pointerdown', closeAll);

    // ── My ID ──
    pool.push(this.add.text(w / 2, h / 2 - 128, 'הקוד שלך:', {
      fontSize: '13px', color: '#aaccee', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(82));

    const myIdTxt = this.add.text(w / 2, h / 2 - 102, net.myId || '...', {
      fontSize: '30px', color: '#ffdd00',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(82);
    pool.push(myIdTxt);

    if (!net.myId) {
      const poll = this.time.addEvent({ delay: 300, repeat: 20, callback: () => {
        if (net.myId) { myIdTxt.setText(net.myId); poll.remove(); }
      }});
      pool.push({ destroy: () => poll.remove() });
    }

    const copyBtn = this._settingsBtn(w / 2, h / 2 - 68, '📋 העתק קוד', '#113366', 82);
    pool.push(copyBtn);
    copyBtn.on('pointerdown', () => {
      if (!net.myId) return;
      navigator.clipboard?.writeText(net.myId).catch(() => {});
      copyBtn.setText('✅ הועתק!');
      this.time.delayedCall(1600, () => { if (copyBtn.active) copyBtn.setText('📋 העתק קוד'); });
    });

    // ── Friend code input ──
    pool.push(this.add.text(w / 2, h / 2 - 20, 'קוד של חבר:', {
      fontSize: '13px', color: '#aaccee', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(82));

    codeInput = this._makeHTMLInput(w, h, h / 2 + 10);
    codeInput.maxLength = 6;
    codeInput.placeholder = 'PXXXXX';
    Object.assign(codeInput.style, {
      textTransform: 'uppercase',
      letterSpacing: '6px',
      fontSize: '22px',
    });

    // Status
    const statusTxt = this.add.text(w / 2, h / 2 + 70, '', {
      fontSize: '15px', color: '#88ff88', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(82);
    pool.push(statusTxt);

    // ── Ready state ──
    let myReady = false, peerReady = false;

    const myStatusTxt = this.add.text(w / 2 - 70, h / 2 + 108, 'אתה: ⏳', {
      fontSize: '15px', color: '#aaaaaa', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82).setVisible(false);
    pool.push(myStatusTxt);

    const peerStatusTxt = this.add.text(w / 2 + 70, h / 2 + 108, 'חבר: ⏳', {
      fontSize: '15px', color: '#aaaaaa', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82).setVisible(false);
    pool.push(peerStatusTxt);

    const checkBothReady = () => {
      if (!myReady || !peerReady) return;
      statusTxt.setText('🚀 מתחיל...').setStyle({ color: '#ffdd00' });
      this.time.delayedCall(900, () => {
        closeAll();
        this.cameras.main.fade(350, 0, 0, 0);
        this.time.delayedCall(350, () => this.scene.start('GameScene'));
      });
    };

    const readyBtn = this._settingsBtn(w / 2, h / 2 + 140, '✅  מוכן!', '#116611', 82);
    pool.push(readyBtn);
    readyBtn.setVisible(false);
    readyBtn.on('pointerdown', () => {
      if (myReady) return;
      myReady = true;
      readyBtn.setAlpha(0.5).disableInteractive();
      myStatusTxt.setText('אתה: ✅').setStyle({ color: '#44ff88' });
      net.send({ t: 'ready' });
      checkBothReady();
    });

    // Connect button
    const connectBtn = this._settingsBtn(w / 2, h / 2 + 115, '🔗 התחבר', '#225599', 82);
    pool.push(connectBtn);

    const onConnected = () => {
      statusTxt.setText('✅ מחובר! — לחץ מוכן כשמוכן').setStyle({ color: '#44ff88' });
      connectBtn.setVisible(false);
      myStatusTxt.setVisible(true);
      peerStatusTxt.setVisible(true);
      readyBtn.setVisible(true);
      if (codeInput && document.body.contains(codeInput)) document.body.removeChild(codeInput);
      codeInput = null;
    };

    net.on('ready', () => {
      peerReady = true;
      peerStatusTxt.setText('חבר: ✅').setStyle({ color: '#44ff88' });
      checkBothReady();
    });

    connectBtn.on('pointerdown', () => {
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      if (code.length < 6) {
        statusTxt.setText('⚠️ הזן קוד בן 6 תווים').setStyle({ color: '#ff6666' });
        return;
      }
      statusTxt.setText('🔄 מתחבר...').setStyle({ color: '#ffdd00' });
      connectBtn.setAlpha(0.4).disableInteractive();
      net.connect(code,
        () => onConnected(),
        () => {
          statusTxt.setText('❌ לא ניתן להתחבר — בדוק את הקוד').setStyle({ color: '#ff6666' });
          connectBtn.setAlpha(1).setInteractive({ useHandCursor: true });
        }
      );
    });

    // Someone connected to us while panel is open
    net.on('connect', onConnected);

    // If already connected, skip to connected state immediately
    if (net.connected) onConnected();
  }

  // ─── RANK PROGRESS OVERLAY ───────────────────────────────────────────────────

  _openRankProgress(w, h, charDef, charT) {
    const pool = [];

    const RANKS = [
      { label: 'רגיל',  color: '#aaaaaa', from: 0,    to: 250  },
      { label: 'נחמד',  color: '#44ff88', from: 250,  to: 500  },
      { label: 'טוב',   color: '#44aaff', from: 500,  to: 750  },
      { label: 'מטורף', color: '#cc44ff', from: 750,  to: 1000 },
      { label: 'סופי',  color: '#FFD700', from: 1000, to: null  },
    ];

    const currentIdx = RANKS.findIndex(r => r.to === null || charT < r.to);

    // Backdrop
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.82).setDepth(88).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.88, 420);
    const rowH   = 52;
    const panelH = 60 + RANKS.length * rowH + 60;
    const panelX = w / 2, panelY = h / 2;

    pool.push(this.add.rectangle(panelX, panelY, panelW, panelH, 0x080f1e, 1)
      .setDepth(89).setStrokeStyle(2, 0x3366aa));

    // Title
    pool.push(this.add.text(panelX, panelY - panelH / 2 + 26, `★  דרגות - ${charDef.name}`, {
      fontSize: '19px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(90));

    pool.push(this.add.rectangle(panelX, panelY - panelH / 2 + 46, panelW - 30, 1, 0x334466).setDepth(90));

    // Close button
    const closeBtn = this.add.text(panelX + panelW / 2 - 14, panelY - panelH / 2 + 18, '✕', {
      fontSize: '20px', color: '#aabbcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(91).setInteractive({ useHandCursor: true });
    pool.push(closeBtn);
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#aabbcc' }));
    closeBtn.on('pointerdown', () => pool.forEach(o => o.destroy()));
    backdrop.on('pointerdown', () => pool.forEach(o => o.destroy()));

    // Rank rows
    const listTop = panelY - panelH / 2 + 62;
    const barW    = panelW * 0.55;

    RANKS.forEach((rank, i) => {
      const ry       = listTop + i * rowH + rowH / 2;
      const isCurrent = i === currentIdx;
      const isDone    = i < currentIdx;

      // Row highlight for current rank
      if (isCurrent) {
        pool.push(this.add.rectangle(panelX, ry, panelW - 20, rowH - 4, 0x112244, 1)
          .setDepth(89).setStrokeStyle(1, parseInt(rank.color.replace('#', ''), 16)));
      }

      // Rank name
      pool.push(this.add.text(panelX - panelW * 0.28, ry, `${isDone ? '✔' : isCurrent ? '▶' : '○'} ${rank.label}`, {
        fontSize: isCurrent ? '16px' : '14px',
        color: isDone ? '#448844' : rank.color,
        fontFamily: 'Arial', fontStyle: isCurrent ? 'bold' : 'normal',
      }).setOrigin(0, 0.5).setDepth(90));

      // Progress bar area
      if (rank.to !== null) {
        const from    = rank.from;
        const to      = rank.to;
        const current = Math.min(Math.max(charT, from), to);
        const prog    = isDone ? 1 : isCurrent ? (current - from) / (to - from) : 0;

        // Bar bg
        pool.push(this.add.rectangle(panelX + panelW * 0.08, ry, barW, 12, 0x1a2a44).setDepth(90));

        // Bar fill
        if (prog > 0) {
          const fillW = barW * prog;
          pool.push(this.add.rectangle(
            panelX + panelW * 0.08 - barW / 2 + fillW / 2, ry,
            fillW, 12,
            isDone ? 0x44aa44 : parseInt(rank.color.replace('#', ''), 16)
          ).setDepth(91));
        }

        // Label on bar
        const barLabel = isDone
          ? `${to} / ${to}`
          : isCurrent
            ? `${charT} / ${to}`
            : `0 / ${to}`;
        pool.push(this.add.text(panelX + panelW * 0.08, ry, barLabel, {
          fontSize: '10px', color: '#ccddf0', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(92));
      } else {
        // סופי — max rank
        const reachedText = charT >= 1000 ? '🏆 הושג!' : `${charT} / 1000`;
        pool.push(this.add.text(panelX + panelW * 0.08, ry, reachedText, {
          fontSize: '13px', color: charT >= 1000 ? '#FFD700' : '#555577',
          fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(90));
      }
    });

    // Bottom: current trophy count
    pool.push(this.add.text(panelX, panelY + panelH / 2 - 26, `סה"כ עם ${charDef.name}: 🏆 ${charT}`, {
      fontSize: '13px', color: '#ffdd99', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(90));
  }

  // ─── SETTINGS BUTTON ─────────────────────────────────────────────────────────

  _addSettingsButton(w, h) {
    const btn = this.add.text(16, h - 16, '⚙️', {
      fontSize: '30px',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true }).setAlpha(0.7);

    btn.on('pointerover', () => btn.setAlpha(1));
    btn.on('pointerout',  () => btn.setAlpha(0.7));
    btn.on('pointerdown', () => this._openSettings(w, h));
    return btn;
  }

  _openSettings(w, h) {
    const pool = [];

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.8)
      .setDepth(80).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.85, 460);
    const panelH = 370;
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x0a1a33, 1)
      .setDepth(81).setStrokeStyle(2, 0x3366aa));

    pool.push(this.add.text(w / 2, h / 2 - panelH / 2 + 28, '⚙️  הגדרות', {
      fontSize: '22px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82));

    pool.push(this.add.rectangle(w / 2, h / 2 - panelH / 2 + 50, panelW - 40, 1, 0x334466).setDepth(82));

    // Close
    const closeBtn = this.add.text(w / 2 + panelW / 2 - 14, h / 2 - panelH / 2 + 20, '✕', {
      fontSize: '22px', color: '#aabbcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(83).setInteractive({ useHandCursor: true });
    pool.push(closeBtn);
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#aabbcc' }));
    closeBtn.on('pointerdown', () => pool.forEach(o => o.destroy()));

    // Current name
    const currentName = window.PAWER_SAVE.getName();
    pool.push(this.add.text(w / 2, h / 2 - 70, `שם נוכחי: ${currentName}`, {
      fontSize: '16px', color: '#aaccee', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(82));

    // Change name button
    const changeBtn = this._settingsBtn(w / 2, h / 2 - 20, '✏️  שנה שם', '#1144aa', 82);
    pool.push(changeBtn);
    changeBtn.on('pointerdown', () => {
      pool.forEach(o => o.destroy());
      this._openChangeName(w, h);
    });

    // Reset game button
    const resetBtn = this._settingsBtn(w / 2, h / 2 + 55, '🗑️  אפס משחק', '#881111', 82);
    pool.push(resetBtn);
    resetBtn.on('pointerdown', () => {
      pool.forEach(o => o.destroy());
      this._openResetConfirm(w, h);
    });

    // Language button
    const langBtn = this._settingsBtn(w / 2, h / 2 + 130, '🌐  שינוי שפה', '#114433', 82);
    pool.push(langBtn);
    langBtn.on('pointerdown', () => {
      pool.forEach(o => o.destroy());
      this._openLanguageSelect(w, h);
    });
  }

  _settingsBtn(x, y, label, bgColor, depth) {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px', color: '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: bgColor, padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setDepth(depth).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout',  () => btn.setAlpha(1));
    return btn;
  }

  _openChangeName(w, h) {
    const pool = [];

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.8)
      .setDepth(85).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.85, 420);
    const panelH = 230;
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x0a1a33, 1)
      .setDepth(86).setStrokeStyle(2, 0x3366aa));

    pool.push(this.add.text(w / 2, h / 2 - 80, '✏️  שנה שם', {
      fontSize: '20px', color: '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(87));

    const errT = this.add.text(w / 2, h / 2 + 20, '', {
      fontSize: '13px', color: '#ff6666', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(87);
    pool.push(errT);

    // HTML input
    const input = this._makeHTMLInput(w, h, h / 2 - 30);
    input.value = window.PAWER_SAVE.getName();
    input.select();

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
      pool.forEach(o => o.destroy());
    };

    const confirm = () => {
      const name = input.value.trim();
      if (name.length < 2) { errT.setText('⚠️ לפחות 2 תווים'); return; }
      window.PAWER_SAVE.setName(name);
      cleanup();
      this._refreshScene();
    };

    const cancelBtn = this._settingsBtn(w / 2 - 70, h / 2 + 70, 'ביטול', '#444455', 87);
    const saveBtn   = this._settingsBtn(w / 2 + 70, h / 2 + 70, '💾 שמור', '#225500', 87);
    pool.push(cancelBtn, saveBtn);

    cancelBtn.on('pointerdown', cleanup);
    saveBtn.on('pointerdown', confirm);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cleanup(); });

    this.events.once('shutdown', () => { if (document.body.contains(input)) document.body.removeChild(input); });
  }

  _openResetConfirm(w, h) {
    const pool = [];

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.8)
      .setDepth(85).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.85, 420);
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, 220, 0x1a0808, 1)
      .setDepth(86).setStrokeStyle(2, 0xaa2222));

    pool.push(this.add.text(w / 2, h / 2 - 70, '⚠️  אפס משחק', {
      fontSize: '22px', color: '#ff6666',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(87));

    pool.push(this.add.text(w / 2, h / 2 - 20, 'כל הגביעים, הדמויות והשם\nיימחקו לתמיד!', {
      fontSize: '15px', color: '#ffaaaa', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5).setDepth(87));

    const cancelBtn = this._settingsBtn(w / 2 - 75, h / 2 + 65, '❌ ביטול', '#224422', 87);
    const resetBtn  = this._settingsBtn(w / 2 + 75, h / 2 + 65, '🗑️ אפס!', '#881111', 87);
    pool.push(cancelBtn, resetBtn);

    cancelBtn.on('pointerdown', () => pool.forEach(o => o.destroy()));
    resetBtn.on('pointerdown', () => {
      pool.forEach(o => o.destroy());
      window.PAWER_SAVE.reset();
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('SetupScene'));
    });
  }

  _openLanguageSelect(w, h) {
    const LANGS = [
      { code: 'af', name: 'Afrikaans' },       { code: 'sq', name: 'Albanian' },
      { code: 'am', name: 'Amharic' },          { code: 'ar', name: 'Arabic' },
      { code: 'hy', name: 'Armenian' },         { code: 'az', name: 'Azerbaijani' },
      { code: 'eu', name: 'Basque' },           { code: 'be', name: 'Belarusian' },
      { code: 'bn', name: 'Bengali' },          { code: 'bs', name: 'Bosnian' },
      { code: 'bg', name: 'Bulgarian' },        { code: 'ca', name: 'Catalan' },
      { code: 'ceb', name: 'Cebuano' },         { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' }, { code: 'co', name: 'Corsican' },
      { code: 'hr', name: 'Croatian' },         { code: 'cs', name: 'Czech' },
      { code: 'da', name: 'Danish' },           { code: 'nl', name: 'Dutch' },
      { code: 'en', name: 'English' },          { code: 'eo', name: 'Esperanto' },
      { code: 'et', name: 'Estonian' },         { code: 'tl', name: 'Filipino' },
      { code: 'fi', name: 'Finnish' },          { code: 'fr', name: 'French' },
      { code: 'fy', name: 'Frisian' },          { code: 'gl', name: 'Galician' },
      { code: 'ka', name: 'Georgian' },         { code: 'de', name: 'German' },
      { code: 'el', name: 'Greek' },            { code: 'gu', name: 'Gujarati' },
      { code: 'ht', name: 'Haitian Creole' },   { code: 'ha', name: 'Hausa' },
      { code: 'haw', name: 'Hawaiian' },        { code: 'iw', name: 'Hebrew' },
      { code: 'hi', name: 'Hindi' },            { code: 'hmn', name: 'Hmong' },
      { code: 'hu', name: 'Hungarian' },        { code: 'is', name: 'Icelandic' },
      { code: 'ig', name: 'Igbo' },             { code: 'id', name: 'Indonesian' },
      { code: 'ga', name: 'Irish' },            { code: 'it', name: 'Italian' },
      { code: 'ja', name: 'Japanese' },         { code: 'jw', name: 'Javanese' },
      { code: 'kn', name: 'Kannada' },          { code: 'kk', name: 'Kazakh' },
      { code: 'km', name: 'Khmer' },            { code: 'rw', name: 'Kinyarwanda' },
      { code: 'ko', name: 'Korean' },           { code: 'ku', name: 'Kurdish' },
      { code: 'ky', name: 'Kyrgyz' },           { code: 'lo', name: 'Lao' },
      { code: 'la', name: 'Latin' },            { code: 'lv', name: 'Latvian' },
      { code: 'lt', name: 'Lithuanian' },       { code: 'lb', name: 'Luxembourgish' },
      { code: 'mk', name: 'Macedonian' },       { code: 'mg', name: 'Malagasy' },
      { code: 'ms', name: 'Malay' },            { code: 'ml', name: 'Malayalam' },
      { code: 'mt', name: 'Maltese' },          { code: 'mi', name: 'Maori' },
      { code: 'mr', name: 'Marathi' },          { code: 'mn', name: 'Mongolian' },
      { code: 'my', name: 'Myanmar (Burmese)' }, { code: 'ne', name: 'Nepali' },
      { code: 'no', name: 'Norwegian' },        { code: 'ny', name: 'Nyanja' },
      { code: 'or', name: 'Odia (Oriya)' },     { code: 'ps', name: 'Pashto' },
      { code: 'fa', name: 'Persian' },          { code: 'pl', name: 'Polish' },
      { code: 'pt', name: 'Portuguese' },       { code: 'pa', name: 'Punjabi' },
      { code: 'ro', name: 'Romanian' },         { code: 'ru', name: 'Russian' },
      { code: 'sm', name: 'Samoan' },           { code: 'gd', name: 'Scots Gaelic' },
      { code: 'sr', name: 'Serbian' },          { code: 'st', name: 'Sesotho' },
      { code: 'sn', name: 'Shona' },            { code: 'sd', name: 'Sindhi' },
      { code: 'si', name: 'Sinhala' },          { code: 'sk', name: 'Slovak' },
      { code: 'sl', name: 'Slovenian' },        { code: 'so', name: 'Somali' },
      { code: 'es', name: 'Spanish' },          { code: 'su', name: 'Sundanese' },
      { code: 'sw', name: 'Swahili' },          { code: 'sv', name: 'Swedish' },
      { code: 'tg', name: 'Tajik' },            { code: 'ta', name: 'Tamil' },
      { code: 'tt', name: 'Tatar' },            { code: 'te', name: 'Telugu' },
      { code: 'th', name: 'Thai' },             { code: 'tr', name: 'Turkish' },
      { code: 'tk', name: 'Turkmen' },          { code: 'uk', name: 'Ukrainian' },
      { code: 'ur', name: 'Urdu' },             { code: 'ug', name: 'Uyghur' },
      { code: 'uz', name: 'Uzbek' },            { code: 'vi', name: 'Vietnamese' },
      { code: 'cy', name: 'Welsh' },            { code: 'xh', name: 'Xhosa' },
      { code: 'yi', name: 'Yiddish' },          { code: 'yo', name: 'Yoruba' },
      { code: 'zu', name: 'Zulu' },
    ];

    const pool = [];
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.88).setDepth(83).setInteractive();
    pool.push(backdrop);

    const panelW = Math.min(w * 0.95, 720);
    const panelH = Math.min(h * 0.88, 520);
    pool.push(this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x07111f, 1).setDepth(84).setStrokeStyle(2, 0x227744));

    pool.push(this.add.text(w / 2, h / 2 - panelH / 2 + 26, '🌐  שינוי שפה', {
      fontSize: '21px', color: '#ffffff', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(85));
    pool.push(this.add.rectangle(w / 2, h / 2 - panelH / 2 + 48, panelW - 40, 1, 0x224433).setDepth(85));

    const closeBtn = this.add.text(w / 2 + panelW / 2 - 14, h / 2 - panelH / 2 + 18, '✕', {
      fontSize: '20px', color: '#aabbcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(86).setInteractive({ useHandCursor: true });
    pool.push(closeBtn);
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }));
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#aabbcc' }));

    // Search input
    const searchY = h / 2 - panelH / 2 + 74;
    pool.push(this.add.text(w / 2 - panelW / 2 + 20, searchY, '🔍', { fontSize: '14px' })
      .setOrigin(0, 0.5).setDepth(86));
    const searchInput = this._makeHTMLInput(w, h, searchY);
    searchInput.placeholder = 'Search language...';
    searchInput.dir = 'ltr';
    pool.push({ destroy: () => { if (document.body.contains(searchInput)) document.body.removeChild(searchInput); } });

    // Scrollable grid
    const HEADER   = 100;
    const COLS     = 3;
    const PAD      = 14;
    const COL_GAP  = 8;
    const ROW_H    = 36;
    const ROW_GAP  = 5;
    const pLeft    = w / 2 - panelW / 2;
    const scrollTop = h / 2 - panelH / 2 + HEADER;
    const scrollH   = panelH - HEADER - 8;
    const colW      = Math.floor((panelW - PAD * 2 - (COLS - 1) * COL_GAP) / COLS);

    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(pLeft, scrollTop, panelW, scrollH);
    const mask = maskGfx.createGeometryMask();
    const cnt  = this.add.container(0, 0).setDepth(85);
    cnt.setMask(mask);
    pool.push(cnt);

    let closed = false, maxScroll = 0, scrollY = 0;
    let dragY0 = null, scroll0 = 0, isDragging = false;

    const closeAll = () => {
      if (closed) return; closed = true;
      this.input.off('pointerdown', onDragStart);
      this.input.off('pointermove', onDragMove);
      this.input.off('pointerup',   onDragEnd);
      pool.forEach(o => o.destroy());
      maskGfx.destroy();
    };
    closeBtn.on('pointerdown', closeAll);
    backdrop.on('pointerdown', closeAll);

    const buildList = (filter) => {
      cnt.list.slice().forEach(o => o.destroy());
      const list = filter
        ? LANGS.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()))
        : LANGS;

      list.forEach((lang, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx  = pLeft + PAD + col * (colW + COL_GAP) + colW / 2;
        const cy  = scrollTop + ROW_GAP + row * (ROW_H + ROW_GAP) + ROW_H / 2;

        const saved = localStorage.getItem('pawer_lang');
        const isActive = saved === lang.code;

        const bg = this.add.rectangle(cx, cy, colW, ROW_H, isActive ? 0x1a4a2a : 0x0e1e30, 1)
          .setDepth(85).setStrokeStyle(1, isActive ? 0x44cc66 : 0x223344);
        cnt.add(bg);

        const txt = this.add.text(cx, cy, lang.name, {
          fontSize: '12px', color: isActive ? '#88ffaa' : '#ccddee',
          fontFamily: 'Arial', fontStyle: isActive ? 'bold' : 'normal',
        }).setOrigin(0.5).setDepth(86);
        cnt.add(txt);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { if (!isActive) bg.setFillStyle(0x152a40); });
        bg.on('pointerout',  () => { bg.setFillStyle(isActive ? 0x1a4a2a : 0x0e1e30); });
        bg.on('pointerup', () => {
          if (closed || isDragging) return;
          closeAll();
          if (lang.code === 'iw') {
            localStorage.setItem('pawer_lang', 'iw');
            location.reload();
          } else {
            this._fetchAndApplyLang(w, h, lang.code, lang.name);
          }
        });
      });

      const rows = Math.ceil(list.length / COLS);
      const contentH = rows * (ROW_H + ROW_GAP) + ROW_GAP;
      maxScroll = Math.max(0, contentH - scrollH);
      scrollY = 0;
      cnt.setY(0);
    };

    buildList('');
    searchInput.addEventListener('input', () => { if (!closed) buildList(searchInput.value); });

    const onDragStart = (ptr) => {
      if (closed) return;
      if (ptr.y >= scrollTop && ptr.y <= h / 2 + panelH / 2 && ptr.x >= pLeft && ptr.x <= pLeft + panelW)
        { dragY0 = ptr.y; scroll0 = scrollY; isDragging = false; }
    };
    const onDragMove = (ptr) => {
      if (closed || dragY0 === null) return;
      const dy = ptr.y - dragY0;
      if (Math.abs(dy) > 6) isDragging = true;
      if (!isDragging) return;
      scrollY = Phaser.Math.Clamp(scroll0 - dy, 0, maxScroll);
      cnt.setY(-scrollY);
    };
    const onDragEnd = () => { if (!closed) { dragY0 = null; this.time.delayedCall(50, () => { isDragging = false; }); } };

    this.input.on('pointerdown', onDragStart);
    this.input.on('pointermove', onDragMove);
    this.input.on('pointerup',   onDragEnd);
  }

  _fetchAndApplyLang(w, h, code, name) {
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000011, 0.92)
      .setDepth(90).setInteractive();
    const barW = Math.min(w * 0.65, 380);
    const barBg = this.add.rectangle(w / 2, h / 2, barW + 4, 20, 0x112244).setDepth(91);
    const barGfx = this.add.graphics().setDepth(92);
    const lbl = this.add.text(w / 2, h / 2 - 48, `🌐 מוריד ${name}...`, {
      fontSize: '19px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(91);
    const pctTxt = this.add.text(w / 2, h / 2 + 26, '0%', {
      fontSize: '15px', color: '#88ccff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(91);
    const pool = [backdrop, barBg, barGfx, lbl, pctTxt];

    window.PAWER_fetchTranslations(code, (prog) => {
      barGfx.clear();
      barGfx.fillStyle(0x44aaff, 1);
      barGfx.fillRect(w / 2 - barW / 2, h / 2 - 8, barW * prog, 16);
      pctTxt.setText(Math.round(prog * 100) + '%');
    }).then(() => {
      localStorage.setItem('pawer_lang', code);
      location.reload();
    }).catch(() => {
      pool.forEach(o => { try { o.destroy(); } catch(e){} });
      this._showMsg(w / 2, h / 2, '❌ שגיאה בהורדת תרגום', '#ff6666');
    });
  }

  _makeHTMLInput(w, h, canvasY) {
    const canvas = this.game.canvas;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = rect.width  / this.scale.width;
    const scaleY = rect.height / this.scale.height;
    const inputW = Math.min(240, w * 0.5);

    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = 14;
    el.dir = 'rtl';
    el.autocomplete = 'off';

    Object.assign(el.style, {
      position:    'fixed',
      left:        `${rect.left + (w / 2 - inputW / 2) * scaleX}px`,
      top:         `${rect.top  + canvasY * scaleY}px`,
      width:       `${inputW * scaleX}px`,
      height:      `${42 * scaleY}px`,
      fontSize:    `${Math.round(18 * scaleY)}px`,
      fontFamily:  'Arial',
      textAlign:   'center',
      border:      '3px solid #3366aa',
      borderRadius:'8px',
      background:  'rgba(8,22,50,0.97)',
      color:       '#ffffff',
      outline:     'none',
      zIndex:      '1000',
      padding:     '0 8px',
    });

    document.body.appendChild(el);
    setTimeout(() => el.focus(), 80);
    return el;
  }

  // ─── RANK-UP ANIMATION ───────────────────────────────────────────────────────

  _showRankUp(rank, charName) {
    const W = this.scale.width, H = this.scale.height;
    const ov = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(50).setInteractive();
    this.tweens.add({ targets: ov, alpha: 0.82, duration: 280 });
    const hdr = this.add.text(W / 2, H * 0.22, '⬆️  עלית דרגה!', {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: hdr, alpha: 1, duration: 320 });
    const dismiss = (extra) => {
      this.tweens.add({
        targets: [ov, hdr, ...extra], alpha: 0, duration: 400,
        onComplete: () => { ov.destroy(); hdr.destroy(); extra.forEach(o => o.destroy?.() || o.remove?.()); },
      });
    };
    if (rank.tier === 4) this._rankUpFinal(W, H, dismiss, charName);
    else                 this._rankUpNormal(rank, W, H, dismiss, charName);
  }

  _rankUpNormal(rank, W, H, dismiss, charName) {
    const ring = this.add.graphics().setDepth(52);
    ring.lineStyle(rank.tier * 2 + 2, rank.hex, 0.85);
    ring.strokeCircle(W / 2, H / 2, 5);
    this.tweens.add({ targets: ring, scaleX: 60, scaleY: 60, alpha: 0,
      duration: 580, ease: 'Expo.easeOut', onComplete: () => ring.destroy() });

    for (let i = 0; i < rank.tier * 4 + 4; i++) {
      const a = Math.random() * Math.PI * 2, d = 65 + Math.random() * 140;
      const c = this.add.circle(W / 2, H / 2, 4 + Math.random() * 5, rank.hex, 0.9).setDepth(52);
      this.tweens.add({ targets: c, x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d,
        alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 420 + Math.random() * 200,
        onComplete: () => c.destroy() });
    }

    const txt = this.add.text(W / 2, H + 80, rank.label, {
      fontSize: '76px', color: rank.css,
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);

    const charTxt = this.add.text(W / 2, H + 140, charName, {
      fontSize: '28px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);

    this.tweens.add({ targets: txt, y: H / 2 - 30, alpha: 1, duration: 340, ease: 'Expo.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: charTxt, y: H / 2 + 48, alpha: 1, duration: 280, ease: 'Expo.easeOut' });
        this.time.delayedCall(1800, () => dismiss([txt, charTxt]));
      }
    });
  }

  _rankUpFinal(W, H, dismiss, charName) {
    for (let i = 0; i < 45; i++) {
      const px = Math.random() * W;
      const c = this.add.circle(px, -20, 3 + Math.random() * 6, 0xFFD700, 0.9).setDepth(52);
      this.tweens.add({ targets: c, y: H + 30, x: px + (Math.random() - 0.5) * 240,
        alpha: 0.25, delay: Math.random() * 700, duration: 1300 + Math.random() * 700,
        onComplete: () => c.destroy() });
    }
    this.cameras.main.flash(480, 220, 160, 0, true);
    this.cameras.main.shake(600, 0.015);

    const ring = this.add.graphics().setDepth(52);
    ring.lineStyle(9, 0xFFD700, 1);
    ring.strokeCircle(W / 2, H / 2, 5);
    this.tweens.add({ targets: ring, scaleX: Math.max(W, H) / 5 * 2, scaleY: Math.max(W, H) / 5 * 2,
      alpha: 0, duration: 700, ease: 'Expo.easeOut', onComplete: () => ring.destroy() });

    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * Math.min(W, H) * 0.36;
      const c = this.add.circle(W / 2, H / 2, 7 + Math.random() * 9, 0xFFD700).setDepth(53);
      this.tweens.add({ targets: c, x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d,
        alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 560 + Math.random() * 300,
        onComplete: () => c.destroy() });
    }

    const orbitR = Math.min(W, H) * 0.22;
    const stars  = [];
    for (let i = 0; i < 8; i++) {
      const star = this.add.text(W / 2, H / 2, '✦', { fontSize: '18px', color: '#FFD700' })
        .setOrigin(0.5).setDepth(54).setAlpha(0);
      this.tweens.add({ targets: star, alpha: 0.95, delay: 260 + i * 50, duration: 200 });
      stars.push({ obj: star, base: (i / 8) * Math.PI * 2 });
    }
    let elapsed = 0;
    const starTimer = this.time.addEvent({ delay: 16, repeat: 200, callback: () => {
      elapsed += 0.022;
      stars.forEach(s => s.obj.setPosition(W / 2 + Math.cos(s.base + elapsed) * orbitR,
                                            H / 2 + Math.sin(s.base + elapsed) * orbitR));
    }});

    const glows = [120, 108].map(sz =>
      this.add.text(W / 2, H + 120, 'סופי', { fontSize: `${sz}px`, color: '#FFD700',
        fontFamily: 'Arial Black, Arial', fontStyle: 'bold' })
        .setOrigin(0.5).setDepth(53).setAlpha(0));
    glows.forEach((gl, g) => this.tweens.add({
      targets: gl, y: H / 2, alpha: 0.14 - g * 0.04, duration: 480, ease: 'Back.easeOut', delay: g * 25 }));

    const txt = this.add.text(W / 2, H + 120, 'סופי', {
      fontSize: '96px', color: '#FFD700',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(55).setAlpha(0);

    const charTxt = this.add.text(W / 2, H + 160, charName, {
      fontSize: '32px', color: '#FFD700',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(55).setAlpha(0);

    this.tweens.add({ targets: txt, y: H / 2 - 36, alpha: 1, duration: 480, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: charTxt, y: H / 2 + 56, alpha: 1, duration: 320, ease: 'Back.easeOut' });
        this.tweens.add({ targets: txt, scaleX: 1.10, scaleY: 1.10,
          duration: 320, yoyo: true, repeat: 2,
          onComplete: () => this.time.delayedCall(900, () => {
            starTimer.remove();
            dismiss([...glows, txt, charTxt, ...stars.map(s => s.obj)]);
          })
        });
      }
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  _refreshScene() {
    this.cameras.main.fade(220, 0, 0, 0);
    this.time.delayedCall(220, () => this.scene.restart());
  }

  _showMsg(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontSize: '15px', color, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: t, y: y - 35, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }
}
