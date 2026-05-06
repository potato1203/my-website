class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const { worldWidth, worldHeight, isMobile } = window.PAWER_CONFIG;
    this.gameOver = false;
    this.mouseWorld = { x: 0, y: 0 };

    // Set physics world to match the full map size
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this._createMap(worldWidth, worldHeight);
    this._createPlayer(worldWidth, worldHeight);
    this._createBots();
    this._setupPhysics();
    this._setupControls(isMobile);
    this._setupCamera(worldWidth, worldHeight);
    this._createHUD();

    this.swordGfx = this.add.graphics().setDepth(8);
    this.slimes   = [];   // active slime projectiles
    this._mpTick  = 0;
    this.remote   = null; // remote player state

    if (window.PAWER_NET?.connected) this._initMultiplayer();

    // Username label above player (world-space)
    const playerName = window.PAWER_SAVE.getName() || 'שחקן';
    this.playerNameText = this.add.text(0, 0, playerName, {
      fontSize: '13px', color: '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000033', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(12);

    this.cameras.main.fadeIn(400);

    this.time.delayedCall(300, () => this._flashText('GO!', '#ffdd00', 900));
  }

  // ─── MAP ────────────────────────────────────────────────────────────────────

  _createMap(W, H) {
    const T = 64;
    // Floor tiles
    for (let x = 0; x < W; x += T)
      for (let y = 0; y < H; y += T)
        this.add.image(x + T / 2, y + T / 2, 'floor').setDepth(0);

    this.walls = this.physics.add.staticGroup();

    // Border (2 tiles thick)
    for (let x = 0; x < W; x += T) {
      this._wall(x + T / 2, T / 2);
      this._wall(x + T / 2, T + T / 2);
      this._wall(x + T / 2, H - T / 2);
      this._wall(x + T / 2, H - T - T / 2);
    }
    for (let y = T * 2; y < H - T * 2; y += T) {
      this._wall(T / 2, y + T / 2);
      this._wall(T + T / 2, y + T / 2);
      this._wall(W - T / 2, y + T / 2);
      this._wall(W - T - T / 2, y + T / 2);
    }

    // Obstacles in tile coordinates (T=64px). World is 30x30 tiles, border=2 tiles.
    const obs = [
      [5, 5, 3, 1],  [20, 5, 3, 1],
      [5, 20, 1, 3],  [23, 20, 1, 3],
      [11, 10, 2, 2], [18, 10, 2, 2],
      [11, 18, 2, 2], [18, 18, 2, 2],
      [8, 14, 3, 1],  [17, 14, 3, 1],
      [14, 5, 1, 4],  [14, 21, 1, 4],
      [4, 13, 1, 2],  [24, 13, 1, 2],
    ];
    obs.forEach(([c, r, w, h]) => {
      for (let i = 0; i < w; i++)
        for (let j = 0; j < h; j++)
          this._wall((c + i) * T + T / 2, (r + j) * T + T / 2);
    });
  }

  _wall(x, y) {
    this.walls.create(x, y, 'wall').setDepth(2).refreshBody();
  }

  // ─── PLAYER ─────────────────────────────────────────────────────────────────

  _createPlayer(W, H) {
    const charKey = window.PAWER_SAVE.getChar();
    const nixSprite = this.physics.add.sprite(W / 2, H / 2, charKey).setDepth(5);
    nixSprite.setScale(80 / nixSprite.height);
    this.player = {
      sprite: nixSprite,
      hp: 3000, maxHp: 3000,
      speed: 230,
      atkCd: 0,
      atkDuration: 0,
      facing: { x: 1, y: 0 },
      alive: true,
      noHitTime: 0,
      dashUntil: 0, dashVx: 0, dashVy: 0,
    };
    // Physics body centered on character
    const bw = nixSprite.displayWidth * 0.5;
    const bh = nixSprite.displayHeight * 0.55;
    nixSprite.body.setSize(bw / nixSprite.scaleX, bh / nixSprite.scaleY)
      .setOffset(
        (nixSprite.width - bw / nixSprite.scaleX) / 2,
        (nixSprite.height - bh / nixSprite.scaleY) * 0.7
      );
    this.player.sprite.setCollideWorldBounds(true);
  }

  // ─── BOTS ────────────────────────────────────────────────────────────────────

  _createBots() {
    const POSITIONS = [
      { x: 300,  y: 300  },
      { x: 1600, y: 300  },
      { x: 960,  y: 1600 },
      { x: 300,  y: 1600 },
      { x: 1600, y: 1600 },
      { x: 960,  y: 300  },
      { x: 300,  y: 960  },
      { x: 1600, y: 960  },
      { x: 650,  y: 650  },
      { x: 1270, y: 1270 },
    ];
    const STATS = [
      { hp: 1800, speed: 130, atkDmg: 280, atkCd: 1400, color: 0xff5555 },
      { hp: 2000, speed: 120, atkDmg: 320, atkCd: 1600, color: 0xaa55ff },
      { hp: 1600, speed: 150, atkDmg: 240, atkCd: 1200, color: 0x55aaff },
      { hp: 1700, speed: 140, atkDmg: 260, atkCd: 1300, color: 0xff9900 },
      { hp: 1900, speed: 125, atkDmg: 300, atkCd: 1500, color: 0x44ffaa },
      { hp: 1500, speed: 160, atkDmg: 220, atkCd: 1100, color: 0xff44cc },
      { hp: 2100, speed: 110, atkDmg: 340, atkCd: 1700, color: 0xffdd00 },
      { hp: 1650, speed: 145, atkDmg: 250, atkCd: 1250, color: 0x00ddff },
      { hp: 1750, speed: 135, atkDmg: 270, atkCd: 1350, color: 0xff6644 },
      { hp: 1850, speed: 128, atkDmg: 290, atkCd: 1450, color: 0xaa44ff },
    ];
    // Neutral name pool – shuffle each game
    const NAME_POOL = ['צל', 'רוח', 'לוחם', 'אש', 'קרח', 'ברק', 'סערה', 'חושך', 'ריק', 'עשן'];
    const shuffledNames = Phaser.Utils.Array.Shuffle([...NAME_POOL]);

    // Available char sprites – shuffle so every game looks different
    const charKeys = window.PAWER_CHARS.map(c => c.key);
    const shuffledKeys = Phaser.Utils.Array.Shuffle([...charKeys]);

    this.bots = POSITIONS.map((pos, i) => {
      // Cycle through shuffled keys so bots vary
      const key  = shuffledKeys[i % shuffledKeys.length];
      const stat = STATS[i];
      const name = shuffledNames[i];

      const s = this.physics.add.sprite(pos.x, pos.y, key).setDepth(5);
      s.setScale(70 / s.height);
      const bw = s.displayWidth * 0.5;
      const bh = s.displayHeight * 0.55;
      s.body.setSize(bw / s.scaleX, bh / s.scaleY)
        .setOffset((s.width - bw / s.scaleX) / 2, (s.height - bh / s.scaleY) * 0.7);

      return {
        sprite: s, hp: stat.hp, maxHp: stat.hp,
        speed: stat.speed, name, color: stat.color, charKey: key,
        atkDmg: stat.atkDmg, atkCdBase: stat.atkCd,
        atkCd: 0, wanderVel: { x: 0, y: 0 }, wanderTimer: 0, alive: true, noHitTime: 0,
        dashUntil: 0, dashVx: 0, dashVy: 0,
      };
    });
  }

  // ─── PHYSICS ─────────────────────────────────────────────────────────────────

  _setupPhysics() {
    this.physics.add.collider(this.player.sprite, this.walls);
    this.bots.forEach(b => {
      this.physics.add.collider(b.sprite, this.walls);
      this.physics.add.collider(b.sprite, this.player.sprite);
      this.bots.forEach(b2 => {
        if (b !== b2) this.physics.add.collider(b.sprite, b2.sprite);
      });
    });
  }

  // ─── CONTROLS ────────────────────────────────────────────────────────────────

  _setupControls(isMobile) {
    if (isMobile) {
      this.mobileCtrl = new MobileControls(this);
    } else {
      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up2: Phaser.Input.Keyboard.KeyCodes.UP,
        down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        atk: Phaser.Input.Keyboard.KeyCodes.SPACE,
      });
      this.input.on('pointermove', p => {
        this.mouseWorld.x = p.worldX;
        this.mouseWorld.y = p.worldY;
      });
      this.input.on('pointerdown', p => {
        if (p.button === 0) this._doAttack();
      });
    }
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────────

  _setupCamera(W, H) {
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  _createHUD() {
    // Player bar (fixed)
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
    const charKey = window.PAWER_SAVE.getChar();
    const charDef = window.PAWER_CHARS.find(c => c.key === charKey);
    const weaponIcon = { nix: '⚔️', fik: '💚', bigo: '🪓', dim: '🗡️', coch: '⚡', priti: '🌩️' }[charKey] || '⚔️';
    const hudLabel = charDef ? `${charDef.name}  ${weaponIcon}` : `${charKey.toUpperCase()}  ${weaponIcon}`;
    this.nixLabel = this.add.text(0, 0, hudLabel, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 1);

    // Enemy counter (top-left)
    this.enemyCountTxt = this.add.text(16, 16, '', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(101);

    // Bot bars (world-space, above each bot)
    this.botBarGfxs = this.bots.map(() => this.add.graphics().setDepth(9));
    this.botNameTxts = this.bots.map((b, i) =>
      this.add.text(0, 0, b.name, {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Arial',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(10)
    );
  }

  // ─── ATTACK ──────────────────────────────────────────────────────────────────

  _doAttack() {
    if (!this.player.alive || this.player.atkCd > 0) return;
    const charKey = window.PAWER_SAVE.getChar();
    if      (charKey === 'fik')   this._doSlimeAttack();
    else if (charKey === 'bigo')  this._doHammerAttack();
    else if (charKey === 'dim')   this._doDaggerAttack();
    else if (charKey === 'coch')  this._doCochAttack();
    else if (charKey === 'priti') this._doPritiAttack();
    else                          this._doSwordAttack();
  }

  _getAimDir() {
    const p = this.player.sprite;
    if (window.PAWER_CONFIG.isMobile) {
      const nb = this._nearestBot();
      if (nb) {
        const dx = nb.sprite.x - p.x, dy = nb.sprite.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        return { ax: dx / d, ay: dy / d };
      }
      return { ax: this.player.facing.x, ay: this.player.facing.y };
    }
    const dx = this.mouseWorld.x - p.x;
    const dy = this.mouseWorld.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    return { ax: dx / d, ay: dy / d };
  }

  _doSwordAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd = 550;

    const RANGE = 90, ARC = Math.PI * 0.72;
    const aimAngle = Math.atan2(ay, ax);

    this.bots.forEach(bot => {
      if (!bot.alive) return;
      const dx = bot.sprite.x - p.x, dy = bot.sprite.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > RANGE) return;
      let diff = Math.abs(Math.atan2(dy, dx) - aimAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= ARC / 2) this._hitBot(bot, 420);
    });

    this._showSwing(p.x, p.y, ax, ay, RANGE, ARC);
    if (window.PAWER_NET?.connected) this._mpSendAtk('sword', ax, ay);
  }

  _doSlimeAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd = 700;
    this._spawnProjectile(p.x, p.y, ax, ay, 380, true, null);
    if (window.PAWER_NET?.connected) this._mpSendAtk('slime', ax, ay);
  }

  _doHammerAttack() {
    const p = this.player.sprite;
    this.player.atkCd = 850;
    const RANGE = 115;
    this.bots.forEach(bot => {
      if (!bot.alive) return;
      if (Math.hypot(bot.sprite.x - p.x, bot.sprite.y - p.y) <= RANGE)
        this._hitBot(bot, 520);
    });
    this._showHammerSpin(p.x, p.y, RANGE);
    if (window.PAWER_NET?.connected) this._mpSendAtk('hammer', 0, 0);
  }

  _showHammerSpin(px, py, range) {
    const g = this.add.graphics().setDepth(8);
    g.lineStyle(10, 0xffaa00, 0.9);
    g.strokeCircle(px, py, range);
    g.fillStyle(0xffaa00, 0.15);
    g.fillCircle(px, py, range);
    this.tweens.add({
      targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0,
      duration: 380, ease: 'Expo.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  _doDaggerAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd = 480;
    this._spawnProjectile(p.x, p.y, ax, ay, 310, true, null,
      { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc });
    if (window.PAWER_NET?.connected) this._mpSendAtk('dagger', ax, ay);
  }

  _doCochAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd = 620;

    // Actual dash movement – overrides input for 190ms
    this.player.dashVx   = ax * 760;
    this.player.dashVy   = ay * 760;
    this.player.dashUntil = this.time.now + 190;

    const DASH_DIST = 220;
    const hitBots = new Set();
    for (let i = 1; i <= 12; i++) {
      const tx = p.x + ax * DASH_DIST * (i / 12);
      const ty = p.y + ay * DASH_DIST * (i / 12);
      this.bots.forEach(bot => {
        if (!bot.alive || hitBots.has(bot)) return;
        if (Math.hypot(bot.sprite.x - tx, bot.sprite.y - ty) < 56) {
          hitBots.add(bot);
          this._hitBot(bot, 460, tx, ty);
        }
      });
    }
    if (hitBots.size > 0) this.cameras.main.shake(120, 0.007);

    this._showCochDash(p.x, p.y, ax, ay, DASH_DIST);
    if (window.PAWER_NET?.connected) this._mpSendAtk('coch', ax, ay);
  }

  _showCochDash(px, py, ax, ay, dist) {
    const perp = { x: -ay, y: ax };

    // Bright directional flash rectangle
    const flash = this.add.rectangle(
      px + ax * dist * 0.5, py + ay * dist * 0.5,
      dist, 32, 0xff5500, 0.55
    ).setRotation(Math.atan2(ay, ax)).setDepth(8);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.6, duration: 280,
      onComplete: () => flash.destroy() });

    // Spike lines + tips
    const g = this.add.graphics().setDepth(9);

    // Thick center trail: dark core + bright highlight
    g.lineStyle(8, 0xff3300, 0.85);
    g.lineBetween(px, py, px + ax * dist, py + ay * dist);
    g.lineStyle(3, 0xffee88, 0.9);
    g.lineBetween(px, py, px + ax * dist, py + ay * dist);

    // 7 crossbar spikes
    for (let i = 0; i < 7; i++) {
      const t  = (i + 0.5) / 7;
      const cx = px + ax * dist * t;
      const cy = py + ay * dist * t;
      const sl = 26 + (i % 2) * 14;
      const tx1 = cx + perp.x * sl,  ty1 = cy + perp.y * sl;
      const tx2 = cx - perp.x * sl,  ty2 = cy - perp.y * sl;

      g.lineStyle(5, 0xff6600, 1);
      g.lineBetween(tx1, ty1, tx2, ty2);

      // Arrow tips pointing forward
      g.lineStyle(3, 0xffcc00, 0.95);
      g.lineBetween(tx1, ty1, tx1 - perp.x * 10 + ax * 12, ty1 - perp.y * 10 + ay * 12);
      g.lineBetween(tx2, ty2, tx2 + perp.x * 10 + ax * 12, ty2 + perp.y * 10 + ay * 12);

      // Bright tip dots
      g.fillStyle(0xffee00, 1);
      g.fillCircle(tx1, ty1, 5);
      g.fillCircle(tx2, ty2, 5);
    }

    // Impact burst at far end
    g.fillStyle(0xff2200, 0.7);
    g.fillCircle(px + ax * dist, py + ay * dist, 18);
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(px + ax * dist, py + ay * dist, 8);

    this.tweens.add({ targets: g, alpha: 0, duration: 420,
      onComplete: () => g.destroy() });

    // Particle scatter at impact
    for (let i = 0; i < 10; i++) {
      const angle = Math.atan2(ay, ax) + (Math.random() - 0.5) * Math.PI * 0.9;
      const c = this.add.circle(px + ax * dist, py + ay * dist,
        3 + Math.random() * 5, Math.random() > 0.5 ? 0xff6600 : 0xffcc00).setDepth(9);
      this.tweens.add({
        targets: c,
        x: px + ax * dist + Math.cos(angle) * (35 + Math.random() * 45),
        y: py + ay * dist + Math.sin(angle) * (35 + Math.random() * 45),
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 280 + Math.random() * 160,
        onComplete: () => c.destroy(),
      });
    }
  }

  _doPritiAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 580;

    const RANGE = 300, CHAIN_R = 200, CHAIN_N = 2;
    let primary = null, bestDot = 0.4;
    this.bots.forEach(bot => {
      if (!bot.alive) return;
      const dx = bot.sprite.x - p.x, dy = bot.sprite.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > RANGE) return;
      const dot = (dx / dist) * ax + (dy / dist) * ay;
      if (dot > bestDot) { bestDot = dot; primary = bot; }
    });

    if (!primary) {
      this._showLightningBolt(p.x, p.y, p.x + ax * RANGE, p.y + ay * RANGE, false);
      if (window.PAWER_NET?.connected) this._mpSendAtk('priti', ax, ay);
      return;
    }

    this._hitBot(primary, 360);
    this._showLightningBolt(p.x, p.y, primary.sprite.x, primary.sprite.y, true);

    const hit = new Set([primary]);
    let last = primary;
    for (let c = 0; c < CHAIN_N; c++) {
      let next = null, nearestD = CHAIN_R;
      this.bots.forEach(bot => {
        if (!bot.alive || hit.has(bot)) return;
        const d = Math.hypot(bot.sprite.x - last.sprite.x, bot.sprite.y - last.sprite.y);
        if (d < nearestD) { nearestD = d; next = bot; }
      });
      if (!next) break;
      hit.add(next); this._hitBot(next, 220);
      this._showLightningBolt(last.sprite.x, last.sprite.y, next.sprite.x, next.sprite.y, true);
      last = next;
    }
    this.cameras.main.shake(70, 0.003);
    if (window.PAWER_NET?.connected) this._mpSendAtk('priti', ax, ay);
  }

  _showLightningBolt(x1, y1, x2, y2, impact) {
    const g    = this.add.graphics().setDepth(9);
    const dx   = x2 - x1, dy = y2 - y1;
    const len  = Math.hypot(dx, dy) || 1;
    const jit  = Math.min(28, len * 0.18);
    const px   = -dy / len, py = dx / len;
    const SEGS = 10;
    const pts  = [{ x: x1, y: y1 }];
    for (let i = 1; i < SEGS; i++) {
      const t = i / SEGS, off = (Math.random() - 0.5) * 2 * jit;
      pts.push({ x: x1 + dx * t + px * off, y: y1 + dy * t + py * off });
    }
    pts.push({ x: x2, y: y2 });

    g.lineStyle(5, 0x6655ff, 0.6);
    for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    g.lineStyle(2, 0xeeeeff, 1);
    for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);

    if (impact) {
      g.fillStyle(0xaaaaff, 0.8); g.fillCircle(x2, y2, 13);
      g.fillStyle(0xffffff, 1);   g.fillCircle(x2, y2, 5);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const c = this.add.circle(x2, y2, 3 + Math.random() * 3, 0x8888ff).setDepth(9);
        this.tweens.add({
          targets: c,
          x: x2 + Math.cos(angle) * (18 + Math.random() * 18),
          y: y2 + Math.sin(angle) * (18 + Math.random() * 18),
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: 200 + Math.random() * 100,
          onComplete: () => c.destroy(),
        });
      }
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 320, onComplete: () => g.destroy() });
  }

  _spawnProjectile(fromX, fromY, ax, ay, dmg, isPlayerSlime, ownerBot, opts = {}) {
    const speed      = opts.speed      || 430;
    const color      = opts.color      || 0x33dd33;
    const gcolor     = opts.gcolor     || 0xaaffaa;
    const radius     = opts.radius     || 9;
    const maxDist    = opts.maxDist    || 340;
    const splatColor = opts.splatColor || color;
    const hitRadius  = opts.hitRadius  || 32;
    const circle = this.add.circle(fromX, fromY, radius, color).setDepth(7);
    const glow   = this.add.circle(fromX, fromY, Math.max(2, radius - 4), gcolor, 0.75).setDepth(8);
    this.slimes.push({
      circle, glow,
      x: fromX, y: fromY,
      vx: ax * speed, vy: ay * speed,
      dmg, isPlayerSlime, ownerBot,
      travelDist: 0, maxDist, splatColor, hitRadius, dead: false,
    });
  }

  // keep old name as alias so bot code still works
  _spawnSlime(fromX, fromY, ax, ay, dmg, isPlayerSlime, ownerBot, opts) {
    this._spawnProjectile(fromX, fromY, ax, ay, dmg, isPlayerSlime, ownerBot, opts);
  }

  _updateSlimes(delta) {
    const dt = delta / 1000;
    const { worldWidth, worldHeight } = window.PAWER_CONFIG;

    for (let i = this.slimes.length - 1; i >= 0; i--) {
      const s = this.slimes[i];

      if (s.dead) {
        s.circle.destroy();
        s.glow.destroy();
        this.slimes.splice(i, 1);
        continue;
      }

      const mx = s.vx * dt, my = s.vy * dt;
      s.x += mx; s.y += my;
      s.travelDist += Math.hypot(mx, my);
      s.circle.setPosition(s.x, s.y);
      s.glow.setPosition(s.x, s.y);

      // Out of bounds or max range
      if (s.x < 0 || s.x > worldWidth || s.y < 0 || s.y > worldHeight ||
          s.travelDist >= s.maxDist) {
        this._splatEffect(s.x, s.y, s.splatColor);
        s.dead = true;
        continue;
      }

      // Hit player (bot projectiles only)
      if (!s.isPlayerSlime && this.player.alive) {
        if (Math.hypot(this.player.sprite.x - s.x, this.player.sprite.y - s.y) < s.hitRadius) {
          this._hitPlayer(s.dmg);
          this._splatEffect(s.x, s.y, s.splatColor);
          s.dead = true;
          continue;
        }
      }

      // Hit bots
      let hit = false;
      for (const bot of this.bots) {
        if (!bot.alive) continue;
        if (!s.isPlayerSlime && bot === s.ownerBot) continue;
        if (Math.hypot(bot.sprite.x - s.x, bot.sprite.y - s.y) < s.hitRadius) {
          if (s.isPlayerSlime) {
            this._hitBot(bot, s.dmg, s.x, s.y);
          } else {
            this._botHitBot(bot, s.ownerBot, s.dmg);
          }
          this._splatEffect(s.x, s.y, s.splatColor);
          s.dead = true;
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  _splatEffect(x, y, color = 0x33dd33) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 10 + Math.random() * 25;
      const r     = 3 + Math.random() * 5;
      const c = this.add.circle(x, y, r, color).setDepth(7).setAlpha(0.9);
      this.tweens.add({
        targets: c,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 220 + Math.random() * 130,
        onComplete: () => c.destroy(),
      });
    }
  }

  _showSwing(px, py, ax, ay, range, arc) {
    const angle = Math.atan2(ay, ax);
    this.swordGfx.clear();
    this.swordGfx.lineStyle(5, 0xddddff, 0.9);
    this.swordGfx.beginPath();
    this.swordGfx.arc(px, py, range, angle - arc / 2, angle + arc / 2);
    this.swordGfx.strokePath();
    this.swordGfx.lineStyle(2, 0xffffff, 0.5);
    this.swordGfx.lineBetween(px, py, px + ax * range, py + ay * range);
    this.swordGfx.setAlpha(1);
    this.tweens.add({
      targets: this.swordGfx, alpha: 0, duration: 300,
      onComplete: () => { this.swordGfx.clear(); this.swordGfx.setAlpha(1); },
    });
  }

  // ─── DAMAGE ──────────────────────────────────────────────────────────────────

  _hitBot(bot, dmg, fromX, fromY) {
    bot.noHitTime = 0;
    // CLIENT: forward hit to HOST who is authoritative for bot HP
    if (window.PAWER_NET?.connected && !window.PAWER_NET.isHost) {
      const i = this.bots.indexOf(bot);
      if (i >= 0) window.PAWER_NET.send({ t: 'bot_hit', i, dmg, fx: fromX, fy: fromY });
      // Show visual only
      this._popNumber(bot.sprite.x, bot.sprite.y - 40, dmg, '#ff6666');
      this.tweens.add({ targets: bot.sprite, alpha: 0.3, duration: 80, yoyo: true });
      return;
    }
    bot.hp = Math.max(0, bot.hp - dmg);
    this._popNumber(bot.sprite.x, bot.sprite.y - 40, dmg, '#ff6666');

    // Knockback away from hit source
    const ox = fromX !== undefined ? fromX : this.player.sprite.x;
    const oy = fromY !== undefined ? fromY : this.player.sprite.y;
    const dx = bot.sprite.x - ox;
    const dy = bot.sprite.y - oy;
    const d = Math.hypot(dx, dy) || 1;
    bot.sprite.body.setVelocity(dx / d * 320, dy / d * 320);

    // Flash
    this.tweens.add({ targets: bot.sprite, alpha: 0.3, duration: 80, yoyo: true });

    if (bot.hp <= 0) this._killBot(bot);
  }

  _hitPlayer(dmg) {
    if (!this.player.alive) return;
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.player.noHitTime = 0;
    this._popNumber(this.player.sprite.x, this.player.sprite.y - 40, dmg, '#ffff44');
    this.cameras.main.shake(180, 0.008);
    this.tweens.add({ targets: this.player.sprite, alpha: 0.3, duration: 80, yoyo: true });
    if (this.player.hp <= 0) {
      this.player.alive = false;
      this._endGame(false);
    }
  }

  _killBot(bot) {
    bot.alive = false;
    bot.sprite.setActive(false).setVisible(false);
    this._burstEffect(bot.sprite.x, bot.sprite.y, bot.color);
    this._flashText(`${bot.name} הובס!`, '#ffdd00', 800);
    // Sync kill to peer
    if (window.PAWER_NET?.connected) {
      const i = this.bots.indexOf(bot);
      if (i >= 0) window.PAWER_NET.send({ t: 'bot_die', i });
    }
    if (this.bots.every(b => !b.alive)) this._endGame(true);
  }

  _burstEffect(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      const c = this.add.circle(x, y, 5 + Math.random() * 4, color).setDepth(20);
      this.tweens.add({
        targets: c,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 350 + Math.random() * 150,
        onComplete: () => c.destroy(),
      });
    }
  }

  _popNumber(x, y, val, color) {
    const t = this.add.text(x, y, `-${val}`, {
      fontSize: '20px', color, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 55, alpha: 0, duration: 750,
      onComplete: () => t.destroy(),
    });
  }

  // ─── AI ──────────────────────────────────────────────────────────────────────

  _updateBots(delta) {
    // CLIENT: no pathfinding — positions come from HOST; only check attacks on local player
    if (window.PAWER_NET?.connected && !window.PAWER_NET.isHost) {
      this.bots.forEach(bot => {
        if (!bot.alive) return;
        bot.atkCd = Math.max(0, bot.atkCd - delta);
        bot.noHitTime += delta;
        if (bot.noHitTime > 3000 && bot.hp < bot.maxHp)
          bot.hp = Math.min(bot.maxHp, bot.hp + 150 * delta / 1000);
        if (bot.atkCd > 0) return;
        const dx   = this.player.sprite.x - bot.sprite.x;
        const dy   = this.player.sprite.y - bot.sprite.y;
        const dist = Math.hypot(dx, dy);
        const isRanged  = bot.charKey === 'fik' || bot.charKey === 'dim' || bot.charKey === 'priti';
        const atkRange  = isRanged ? 190 : bot.charKey === 'bigo' ? 100 : bot.charKey === 'coch' ? 200 : 65;
        if (dist < atkRange) {
          bot.atkCd = bot.atkCdBase;
          const nd = dist || 1;
          if (isRanged) {
            const opts = bot.charKey === 'dim'
              ? { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc, hitRadius: 24 }
              : bot.charKey === 'priti'
              ? { speed: 480, color: 0x6655ff, gcolor: 0xddddff, radius: 6, maxDist: 300, splatColor: 0x9999ff }
              : {};
            this._spawnProjectile(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, bot.atkDmg, false, bot, opts);
          } else if (bot.charKey === 'bigo') {
            this._hitPlayer(bot.atkDmg);
            this._showHammerSpin(bot.sprite.x, bot.sprite.y, 100);
          } else if (bot.charKey === 'coch') {
            this._hitPlayer(bot.atkDmg);
            this._showCochDash(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, Math.min(dist, 200));
          } else {
            this._hitPlayer(bot.atkDmg);
            this._showBotAtk(bot, this.player.sprite.x, this.player.sprite.y);
          }
        }
      });
      return;
    }

    this.bots.forEach(bot => {
      if (!bot.alive) return;
      bot.atkCd    = Math.max(0, bot.atkCd - delta);
      bot.wanderTimer = Math.max(0, bot.wanderTimer - delta);
      bot.noHitTime += delta;
      if (bot.noHitTime > 3000 && bot.hp < bot.maxHp)
        bot.hp = Math.min(bot.maxHp, bot.hp + 150 * delta / 1000);

      const target = this._nearestTargetForBot(bot);

      if (!target) {
        // No targets – wander
        if (bot.wanderTimer <= 0) {
          const a = Math.random() * Math.PI * 2;
          bot.wanderVel = { x: Math.cos(a) * 55, y: Math.sin(a) * 55 };
          bot.wanderTimer = 1200 + Math.random() * 1800;
        }
        bot.sprite.body.setVelocity(bot.wanderVel.x, bot.wanderVel.y);
        bot.sprite.setDepth(5 + bot.sprite.y * 0.00001);
        return;
      }

      const dx   = target.x - bot.sprite.x;
      const dy   = target.y - bot.sprite.y;
      const dist = Math.hypot(dx, dy);

      const isRanged  = bot.charKey === 'fik' || bot.charKey === 'dim' || bot.charKey === 'priti';
      const isAoE     = bot.charKey === 'bigo';
      const isCoch    = bot.charKey === 'coch';
      const atkRange  = isRanged ? 190 : isAoE ? 100 : isCoch ? 200 : 65;
      const stopRange = isRanged ? 110 : atkRange;

      if (dist < atkRange) {
        if (dist < stopRange) bot.sprite.body.setVelocity(0, 0);
        if (bot.atkCd <= 0) {
          bot.atkCd = bot.atkCdBase;
          const nd = dist || 1;
          if (isRanged) {
            const opts = bot.charKey === 'dim'
              ? { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc, hitRadius: 24 }
              : bot.charKey === 'priti'
              ? { speed: 480, color: 0x6655ff, gcolor: 0xddddff, radius: 6, maxDist: 300, splatColor: 0x9999ff }
              : {};
            this._spawnProjectile(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, bot.atkDmg, false, bot, opts);
          } else if (isAoE) {
            // Bigo: AoE hit all in range
            if (target.isPlayer) this._hitPlayer(bot.atkDmg);
            this.bots.forEach(other => {
              if (other === bot || !other.alive) return;
              if (Math.hypot(other.sprite.x - bot.sprite.x, other.sprite.y - bot.sprite.y) <= atkRange)
                this._botHitBot(other, bot, bot.atkDmg);
            });
            this._showHammerSpin(bot.sprite.x, bot.sprite.y, atkRange);
          } else if (isCoch) {
            bot.dashVx    = dx / nd * 680;
            bot.dashVy    = dy / nd * 680;
            bot.dashUntil = this.time.now + 190;
            if (target.isPlayer) this._hitPlayer(bot.atkDmg);
            else this._botHitBot(target.bot, bot, bot.atkDmg);
            this._showCochDash(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, Math.min(dist, 200));
          } else if (target.isPlayer) {
            this._hitPlayer(bot.atkDmg);
            this._showBotAtk(bot, target.x, target.y);
          } else {
            this._botHitBot(target.bot, bot, bot.atkDmg);
            this._showBotAtk(bot, target.x, target.y);
          }
        }
      } else if (dist < 340) {
        bot.sprite.body.setVelocity(dx / dist * bot.speed, dy / dist * bot.speed);
      } else {
        if (bot.wanderTimer <= 0) {
          const a = Math.random() * Math.PI * 2;
          bot.wanderVel = { x: Math.cos(a) * 55, y: Math.sin(a) * 55 };
          bot.wanderTimer = 1200 + Math.random() * 1800;
        }
        bot.sprite.body.setVelocity(bot.wanderVel.x, bot.wanderVel.y);
      }

      if (bot.dashUntil > this.time.now) bot.sprite.body.setVelocity(bot.dashVx, bot.dashVy);
      if (dx < 0) bot.sprite.setFlipX(true);
      else bot.sprite.setFlipX(false);
      bot.sprite.setDepth(5 + bot.sprite.y * 0.00001);
    });
  }

  // Returns nearest living target for a bot (player OR other bot)
  _nearestTargetForBot(bot) {
    let nearest = null;
    let minDist = Infinity;

    // Player
    if (this.player.alive) {
      const d = Math.hypot(
        this.player.sprite.x - bot.sprite.x,
        this.player.sprite.y - bot.sprite.y
      );
      if (d < minDist) {
        minDist = d;
        nearest = { x: this.player.sprite.x, y: this.player.sprite.y, isPlayer: true };
      }
    }

    // Other bots
    this.bots.forEach(other => {
      if (other === bot || !other.alive) return;
      const d = Math.hypot(other.sprite.x - bot.sprite.x, other.sprite.y - bot.sprite.y);
      if (d < minDist) {
        minDist = d;
        nearest = { x: other.sprite.x, y: other.sprite.y, isPlayer: false, bot: other };
      }
    });

    return nearest;
  }

  _botHitBot(victim, attacker, dmg) {
    victim.hp = Math.max(0, victim.hp - dmg);
    this._popNumber(victim.sprite.x, victim.sprite.y - 40, dmg, '#ffaa44');

    // Knockback away from attacker
    const dx = victim.sprite.x - attacker.sprite.x;
    const dy = victim.sprite.y - attacker.sprite.y;
    const d  = Math.hypot(dx, dy) || 1;
    victim.sprite.body.setVelocity(dx / d * 280, dy / d * 280);

    this.tweens.add({ targets: victim.sprite, alpha: 0.3, duration: 80, yoyo: true });

    if (victim.hp <= 0) this._killBot(victim);
  }

  _showBotAtk(bot, tx, ty) {
    const line = this.add.graphics().setDepth(8);
    line.lineStyle(3, bot.color, 0.7);
    line.lineBetween(bot.sprite.x, bot.sprite.y, tx, ty);
    this.tweens.add({ targets: line, alpha: 0, duration: 200, onComplete: () => line.destroy() });
  }

  _nearestBot() {
    let nearest = null, minD = Infinity;
    this.bots.forEach(b => {
      if (!b.alive) return;
      const d = Math.hypot(b.sprite.x - this.player.sprite.x, b.sprite.y - this.player.sprite.y);
      if (d < minD) { minD = d; nearest = b; }
    });
    return nearest;
  }

  // ─── PLAYER UPDATE ───────────────────────────────────────────────────────────

  _updatePlayer(delta) {
    if (!this.player.alive) return;
    const p = this.player;
    p.atkCd     = Math.max(0, p.atkCd - delta);
    p.noHitTime += delta;

    // Regen: after 3s without damage, heal 150 HP/sec
    if (p.noHitTime > 3000 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 150 * delta / 1000);
    }

    let vx = 0, vy = 0;

    if (window.PAWER_CONFIG.isMobile && this.mobileCtrl) {
      const m = this.mobileCtrl.getMovement();
      vx = m.x * p.speed;
      vy = m.y * p.speed;
      if (this.mobileCtrl.consumeAttack()) this._doAttack();
      // Hold attack = repeat
      if (this.mobileCtrl.isAttacking() && p.atkCd <= 0) this._doAttack();
    } else {
      const k = this.keys;
      if (k.left.isDown || k.left2.isDown)  vx -= p.speed;
      if (k.right.isDown || k.right2.isDown) vx += p.speed;
      if (k.up.isDown || k.up2.isDown)    vy -= p.speed;
      if (k.down.isDown || k.down2.isDown)  vy += p.speed;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      if (Phaser.Input.Keyboard.JustDown(k.atk) && p.atkCd <= 0) this._doAttack();
    }

    if (p.dashUntil > this.time.now) {
      p.sprite.body.setVelocity(p.dashVx, p.dashVy);
    } else {
      p.sprite.body.setVelocity(vx, vy);
      if (vx !== 0 || vy !== 0) {
        const d = Math.hypot(vx, vy);
        p.facing = { x: vx / d, y: vy / d };
        p.sprite.setFlipX(vx < 0);
      }
    }
    p.sprite.setDepth(5 + p.sprite.y * 0.00001);

    // Keep username above player
    this.playerNameText.setPosition(
      p.sprite.x,
      p.sprite.y - p.sprite.displayHeight / 2 - 6
    );

    // Multiplayer position sync (~20fps)
    if (window.PAWER_NET?.connected) {
      this._mpTick += delta;
      if (this._mpTick >= 50) { this._mpTick = 0; this._mpSendPos(); }
    }
  }

  // ─── HUD UPDATE ──────────────────────────────────────────────────────────────

  _updateHUD() {
    const { width, height } = this.scale;
    const BAR_W = Math.min(220, width * 0.4);
    const bx = width / 2, by = height - 30;

    this.hudGfx.clear();

    // Player health background
    this.hudGfx.fillStyle(0x000000, 0.55);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2 - 2, by - 13, BAR_W + 4, 22, 6);

    // Health fill
    const ratio = this.player.hp / this.player.maxHp;
    const col = ratio > 0.55 ? 0x44ee44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hudGfx.fillStyle(col, 1);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2, by - 11, BAR_W * ratio, 18, 5);

    // HP text inside bar
    this.hudGfx.fillStyle(0xffffff, 0.15);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2, by - 11, BAR_W, 18, 5);

    this.nixLabel.setPosition(bx, by - 16);

    // Enemy counter
    const alive = this.bots.filter(b => b.alive).length;
    this.enemyCountTxt.setText(`👾 ${alive} / ${this.bots.length}`);

    // Remote player HP bar (world space)
    if (this.remote) {
      const r = this.remote;
      r.hpGfx.clear();
      const BW = 70, bsx = r.x, bsy = r.y - 50;
      r.hpGfx.fillStyle(0x000000, 0.6);
      r.hpGfx.fillRoundedRect(bsx - BW / 2 - 1, bsy - 7, BW + 2, 14, 4);
      r.hpGfx.fillStyle(0x44ff44, 1);
      r.hpGfx.fillRoundedRect(bsx - BW / 2, bsy - 6, BW * Math.max(0, r.hp / r.maxHp), 12, 3);
    }

    // Bot bars (world space, above their sprites)
    this.bots.forEach((bot, i) => {
      const gfx = this.botBarGfxs[i];
      const txt = this.botNameTxts[i];
      gfx.clear();
      if (!bot.alive) { txt.setVisible(false); return; }

      const bsx = bot.sprite.x, bsy = bot.sprite.y - 42;
      const BW = 70;
      gfx.fillStyle(0x000000, 0.6);
      gfx.fillRoundedRect(bsx - BW / 2 - 1, bsy - 7, BW + 2, 14, 4);
      const br = bot.hp / bot.maxHp;
      gfx.fillStyle(bot.color, 1);
      gfx.fillRoundedRect(bsx - BW / 2, bsy - 6, BW * br, 12, 3);

      txt.setPosition(bsx, bsy - 8).setVisible(true);
    });
  }

  // ─── GAME OVER ───────────────────────────────────────────────────────────────

  _endGame(win) {
    this.gameOver = true;
    this._clearSlimes();
    const { width, height } = this.scale;

    // Award trophies: win → +10 global + char; loss → -2 char only (min 0)
    const charKey  = window.PAWER_SAVE.getChar();
    const charDef  = window.PAWER_CHARS.find(c => c.key === charKey);
    const charName = charDef ? charDef.name : charKey;
    const oldCharT = window.PAWER_SAVE.getCharTrophies(charKey);
    const charChange = win ? 10 : -Math.min(2, oldCharT);
    if (win) window.PAWER_SAVE.addTrophies(10);
    window.PAWER_SAVE.addCharTrophies(charKey, charChange);
    const totalGlobal = window.PAWER_SAVE.getTrophies();
    const totalChar   = window.PAWER_SAVE.getCharTrophies(charKey);

    this.time.delayedCall(600, () => {
      // Dim overlay
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65)
        .setScrollFactor(0).setDepth(200);

      // Global trophies (win only)
      if (win) this.add.text(width / 2, height / 2 - 118,
        `+10 🏆  סה"כ כללי: ${totalGlobal}`, {
          fontSize: '18px', color: '#ffdd00',
          fontFamily: 'Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      // Character trophies
      const charLabel = charChange >= 0 ? `+${charChange}` : `${charChange}`;
      this.add.text(width / 2, win ? height / 2 - 90 : height / 2 - 104,
        `${charLabel} 🏆  ${charName}: ${totalChar}`, {
          fontSize: win ? '16px' : '18px', color: win ? '#ffcc77' : '#ff9966',
          fontFamily: 'Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      // Title
      this.add.text(width / 2, height / 2 - 70,
        win ? '🏆 ניצחון!' : '💀 הובסת!', {
          fontSize: '52px', color: win ? '#ffdd00' : '#ff4444',
          fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      // Retry button
      const retry = this.add.text(width / 2, height / 2 + 20, '🔄  שחק שוב', {
        fontSize: '26px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        backgroundColor: '#1155cc', padding: { x: 30, y: 12 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

      retry.on('pointerover', () => retry.setStyle({ backgroundColor: '#2266dd' }));
      retry.on('pointerout',  () => retry.setStyle({ backgroundColor: '#1155cc' }));
      retry.on('pointerdown', () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.restart());
      });

      // Menu button
      const menu = this.add.text(width / 2, height / 2 + 90, '🏠  תפריט ראשי', {
        fontSize: '20px', color: '#aaaacc', fontFamily: 'Arial',
        backgroundColor: '#222244', padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

      menu.on('pointerdown', () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('MenuScene'));
      });

      // Store rank-up so MenuScene shows it after returning home
      const RANKS = [
        { at: 250,  label: 'נחמד',  hex: 0x44ff88, css: '#44ff88', tier: 1 },
        { at: 500,  label: 'טוב',   hex: 0x44aaff, css: '#44aaff', tier: 2 },
        { at: 750,  label: 'מטורף', hex: 0xcc44ff, css: '#cc44ff', tier: 3 },
        { at: 1000, label: 'סופי',  hex: 0xFFD700, css: '#FFD700', tier: 4 },
      ];
      const hit = RANKS.filter(r => oldCharT < r.at && totalChar >= r.at);
      if (hit.length > 0)
        window.PAWER_CONFIG.pendingRankUp = { rank: hit[hit.length - 1], charName };
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  _flashText(msg, color, dur) {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2, msg, {
      fontSize: '44px', color, fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);
    this.tweens.add({
      targets: t, scaleX: 1.15, scaleY: 1.15, alpha: 0,
      duration: dur, onComplete: () => t.destroy(),
    });
  }

  // ─── MAIN LOOP ───────────────────────────────────────────────────────────────

  // ─── MULTIPLAYER ─────────────────────────────────────────────────────────────

  _initMultiplayer() {
    const net = window.PAWER_NET;
    const myName = window.PAWER_SAVE.getName() || 'שחקן';
    const myCk   = window.PAWER_SAVE.getChar();
    let helloSent = false;

    const sendHello = () => {
      if (helloSent) return;
      helloSent = true;
      const msg = { t: 'hello', name: myName, ck: myCk };
      // HOST includes bot configuration so client mirrors same bots
      if (net.isHost) {
        msg.bots_cfg = this.bots.map(b => ({
          ck: b.charKey, name: b.name, color: b.color,
          atkDmg: b.atkDmg, atkCdBase: b.atkCdBase,
        }));
      }
      net.send(msg);
    };
    sendHello();

    net.on('hello', msg => {
      sendHello();
      if (!this.remote) {
        const ck = msg.ck || 'nix';
        const sprite = this.add.image(400, 400, ck).setDepth(5).setAlpha(0.88);
        sprite.setScale(80 / sprite.height);
        const nameText = this.add.text(0, 0, msg.name || 'חבר', {
          fontSize: '13px', color: '#aaffaa',
          fontFamily: 'Arial', fontStyle: 'bold',
          stroke: '#000033', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(12);
        const hpGfx = this.add.graphics().setDepth(11);
        this.remote = { sprite, nameText, hpGfx, hp: 3000, maxHp: 3000, x: 400, y: 400 };
      }
      // CLIENT: sync bot appearance to match host
      if (!net.isHost && msg.bots_cfg) this._syncBotConfig(msg.bots_cfg);
    });

    // CLIENT receives bot positions/HP from HOST every tick
    net.on('bots_state', msg => {
      if (net.isHost) return;
      msg.d.forEach((d, i) => {
        const bot = this.bots[i];
        if (!bot) return;
        bot.sprite.setPosition(d.x, d.y).setFlipX(d.fx);
        bot.hp = d.hp;
        if (!d.alive && bot.alive) this._killBot(bot);
      });
    });

    // Both sides: receive kill event and kill locally if still alive
    net.on('bot_die', msg => {
      const bot = this.bots[msg.i];
      if (bot && bot.alive) this._killBot(bot);
    });

    // HOST: apply damage sent by CLIENT
    net.on('bot_hit', msg => {
      if (!net.isHost) return;
      const bot = this.bots[msg.i];
      if (bot && bot.alive) this._hitBot(bot, msg.dmg, msg.fx, msg.fy);
    });

    net.on('pos', msg => {
      if (!this.remote) return;
      this.remote.x  = msg.x;
      this.remote.y  = msg.y;
      this.remote.hp = msg.hp ?? this.remote.hp;
      this.remote.sprite.setPosition(msg.x, msg.y).setFlipX(!!msg.fx);
      this.remote.nameText.setPosition(msg.x, msg.y - this.remote.sprite.displayHeight / 2 - 6);
    });

    net.on('atk', msg => {
      if (msg.kind === 'sword') this._showSwing(msg.x, msg.y, msg.ax, msg.ay, 90, Math.PI * 0.72);
      else if (msg.kind === 'hammer') this._showHammerSpin(msg.x, msg.y, 115);
      else if (msg.kind === 'slime') this._spawnProjectile(msg.x, msg.y, msg.ax, msg.ay, 0, true, null);
      else if (msg.kind === 'dagger') this._spawnProjectile(msg.x, msg.y, msg.ax, msg.ay, 0, true, null,
        { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc, hitRadius: 24 });
      else if (msg.kind === 'coch')  this._showCochDash(msg.x, msg.y, msg.ax, msg.ay, 200);
      else if (msg.kind === 'priti') this._showLightningBolt(msg.x, msg.y, msg.x + msg.ax * 300, msg.y + msg.ay * 300, false);
    });

    net.on('disconnect', () => {
      this._flashText('החבר התנתק 😢', '#ff6666', 2200);
      this._destroyRemote();
    });

    this.events.once('shutdown', () => {
      ['hello', 'pos', 'atk', 'bots_state', 'bot_die', 'bot_hit', 'disconnect', 'connect'].forEach(t => net.off(t));
      this._destroyRemote();
    });
  }

  // Sync bot charKeys/names/colors on CLIENT to match HOST
  _syncBotConfig(cfg) {
    cfg.forEach((c, i) => {
      const bot = this.bots[i];
      if (!bot) return;
      bot.charKey   = c.ck;
      bot.name      = c.name;
      bot.color     = c.color;
      bot.atkDmg    = c.atkDmg;
      bot.atkCdBase = c.atkCdBase;
      bot.atkCd     = 0;
      bot.sprite.setTexture(c.ck).setScale(70 / bot.sprite.height);
      if (this.botNameTxts[i]) this.botNameTxts[i].setText(c.name);
    });
  }

  _destroyRemote() {
    if (!this.remote) return;
    this.remote.sprite.destroy();
    this.remote.nameText.destroy();
    this.remote.hpGfx.destroy();
    this.remote = null;
  }

  _mpSendPos() {
    const net = window.PAWER_NET;
    const p = this.player.sprite;
    net.send({ t: 'pos', x: p.x, y: p.y, fx: p.flipX, hp: this.player.hp });
    // HOST also syncs all bot state so CLIENT sees same positions/HP
    if (net.isHost) {
      net.send({ t: 'bots_state', d: this.bots.map(b => ({
        x: b.sprite.x, y: b.sprite.y, fx: b.sprite.flipX,
        hp: b.hp, alive: b.alive,
      }))});
    }
  }

  _mpSendAtk(kind, ax, ay) {
    const p = this.player.sprite;
    window.PAWER_NET.send({ t: 'atk', kind, x: p.x, y: p.y, ax, ay });
  }

  _clearSlimes() {
    this.slimes.forEach(s => { s.circle.destroy(); s.glow.destroy(); });
    this.slimes = [];
  }

  update(time, delta) {
    if (this.gameOver) return;
    this._updatePlayer(delta);
    this._updateBots(delta);
    this._updateSlimes(delta);
    this._updateHUD();
  }
}
