class SoccerScene extends Phaser.Scene {
  constructor() { super({ key: 'SoccerScene' }); }

  create() {
    const W = 1920, H = 1920;
    this.W = W; this.H = H;
    this.score       = [0, 0];
    this.gameOver    = false;
    this.goalCooldown = 0;

    const GOAL_H  = 420;
    this.GOAL_Y1  = H / 2 - GOAL_H / 2;
    this.GOAL_Y2  = H / 2 + GOAL_H / 2;
    this.ball     = { x: W / 2, y: H / 2, vx: 60, vy: 40, r: 18, carrier: null };

    this.slimes   = [];
    this.swordGfx = this.add.graphics().setDepth(8);
    this.mouseWorld = { x: 0, y: 0 };

    this.physics.world.setBounds(0, 0, W, H);

    this._createField(W, H);
    this._createBumpers(W, H);
    this._createPlayer(W, H);
    this._createSoccerBots(W, H);
    this._createBallSprite();
    this._setupPhysics();
    this._setupControls();
    this._setupCamera(W, H);
    this._createSoccerHUD();

    this.cameras.main.fadeIn(400);
    this.time.delayedCall(300, () => this._flashText('⚽  GO!', '#ffdd00', 900));
  }

  // ─── FIELD ───────────────────────────────────────────────────────────────────

  _createField(W, H) {
    const bg = this.add.graphics().setDepth(0);
    const STRIPES = 12;
    for (let i = 0; i < STRIPES; i++) {
      bg.fillStyle(i % 2 === 0 ? 0x2e8c2e : 0x289028, 1);
      bg.fillRect(0, i * H / STRIPES, W, H / STRIPES);
    }

    const L = this.add.graphics().setDepth(1);
    L.lineStyle(5, 0xffffff, 0.85);
    L.strokeRect(128, 128, W - 256, H - 256);
    L.lineBetween(W / 2, 128, W / 2, H - 128);
    L.strokeCircle(W / 2, H / 2, 190);
    L.fillStyle(0xffffff, 0.85);
    L.fillCircle(W / 2, H / 2, 9);
    const PA_W = 240, PA_H = 720;
    L.strokeRect(128, H / 2 - PA_H / 2, PA_W, PA_H);
    L.strokeRect(W - 128 - PA_W, H / 2 - PA_H / 2, PA_W, PA_H);
    L.fillCircle(128 + 320, H / 2, 8);
    L.fillCircle(W - 128 - 320, H / 2, 8);

    const net = this.add.graphics().setDepth(1);
    net.fillStyle(0xffffff, 0.10);
    net.fillRect(0, this.GOAL_Y1, 128, this.GOAL_Y2 - this.GOAL_Y1);
    net.fillRect(W - 128, this.GOAL_Y1, 128, this.GOAL_Y2 - this.GOAL_Y1);

    L.lineStyle(11, 0xffffff, 1);
    L.lineBetween(128, this.GOAL_Y1, 128, this.GOAL_Y2);
    L.lineBetween(W - 128, this.GOAL_Y1, W - 128, this.GOAL_Y2);
    L.lineBetween(0, this.GOAL_Y1, 128, this.GOAL_Y1);
    L.lineBetween(0, this.GOAL_Y2, 128, this.GOAL_Y2);
    L.lineBetween(W - 128, this.GOAL_Y1, W, this.GOAL_Y1);
    L.lineBetween(W - 128, this.GOAL_Y2, W, this.GOAL_Y2);

    const half = this.add.graphics().setDepth(0);
    half.fillStyle(0x2244ff, 0.06);
    half.fillRect(0, 0, W / 2, H);
    half.fillStyle(0xff2244, 0.06);
    half.fillRect(W / 2, 0, W / 2, H);
  }

  // ─── BUMPERS ─────────────────────────────────────────────────────────────────

  _createBumpers(W, H) {
    const R   = 38;
    const OFF = 50; // distance from field corner (128)
    const positions = [
      { x: 128 + OFF, y: 128 + OFF },
      { x: W - 128 - OFF, y: 128 + OFF },
      { x: 128 + OFF, y: H - 128 - OFF },
      { x: W - 128 - OFF, y: H - 128 - OFF },
    ];

    this.bumpers = positions.map(pos => {
      const gfx = this.add.graphics().setDepth(3);
      this._drawBumperGfx(gfx, R);
      gfx.setPosition(pos.x, pos.y);

      // Spring coil icon
      const icon = this.add.text(pos.x, pos.y, '🌀', {
        fontSize: '22px',
      }).setOrigin(0.5).setDepth(4);

      return { x: pos.x, y: pos.y, r: R, gfx, icon, cooldown: 0 };
    });
  }

  _drawBumperGfx(gfx, r) {
    gfx.clear();
    // Outer glow ring
    gfx.lineStyle(6, 0xff9900, 0.45);
    gfx.strokeCircle(0, 0, r + 8);
    // Main circle fill
    gfx.fillStyle(0x221100, 0.88);
    gfx.fillCircle(0, 0, r);
    // Thick orange border
    gfx.lineStyle(5, 0xffcc00, 1);
    gfx.strokeCircle(0, 0, r);
    // Inner ring
    gfx.lineStyle(2, 0xff8800, 0.7);
    gfx.strokeCircle(0, 0, r * 0.58);
    // Center dot
    gfx.fillStyle(0xffcc00, 1);
    gfx.fillCircle(0, 0, 6);
  }

  _activateBumper(bumper) {
    bumper.cooldown = 280;

    // Spring-out animation: quick expand then snap back
    bumper.gfx.setScale(1);
    this.tweens.add({
      targets: bumper.gfx,
      scaleX: 1.7, scaleY: 1.7,
      duration: 55, ease: 'Expo.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: bumper.gfx,
          scaleX: 1, scaleY: 1,
          duration: 200, ease: 'Elastic.easeOut',
        });
      },
    });

    // Icon spin
    this.tweens.add({
      targets: bumper.icon, angle: bumper.icon.angle + 360,
      duration: 350, ease: 'Expo.easeOut',
    });

    // Particle burst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const c = this.add.circle(bumper.x, bumper.y, 5 + Math.random() * 4, 0xffcc00, 0.9).setDepth(8);
      this.tweens.add({
        targets: c,
        x: bumper.x + Math.cos(angle) * 65,
        y: bumper.y + Math.sin(angle) * 65,
        alpha: 0, scaleX: 0.15, scaleY: 0.15,
        duration: 320, ease: 'Expo.easeOut',
        onComplete: () => c.destroy(),
      });
    }

    this.cameras.main.flash(70, 255, 180, 0, true);
  }

  // ─── PLAYER ──────────────────────────────────────────────────────────────────

  _createPlayer(W, H) {
    const charKey = window.PAWER_SAVE.getChar();
    const sprite  = this.physics.add.sprite(370, H / 2, charKey).setDepth(5);
    sprite.setScale(80 / sprite.height);
    sprite.setCollideWorldBounds(true);
    const bw = sprite.displayWidth * 0.5, bh = sprite.displayHeight * 0.55;
    sprite.body.setSize(bw / sprite.scaleX, bh / sprite.scaleY)
      .setOffset((sprite.width - bw / sprite.scaleX) / 2,
                 (sprite.height - bh / sprite.scaleY) * 0.7);

    this.player = {
      sprite, charKey, speed: 245,
      hp: 3000, maxHp: 3000, atkCd: 0, facing: { x: 1, y: 0 },
      alive: true, noHitTime: 0,
      dashUntil: 0, dashVx: 0, dashVy: 0,
      pickupCd: 0,
    };

    const playerName = window.PAWER_SAVE.getName() || 'שחקן';
    this.playerNameText = this.add.text(0, 0, playerName, {
      fontSize: '13px', color: '#aaddff',
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000033', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(12);

    this.playerRing = this.add.circle(sprite.x, sprite.y, 35, 0x2266ff, 0.32).setDepth(4);
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  // ─── BOTS ────────────────────────────────────────────────────────────────────

  _createSoccerBots(W, H) {
    const charKeys = window.PAWER_CHARS.map(c => c.key);
    const shuffled = Phaser.Utils.Array.Shuffle([...charKeys]);

    const defs = [
      { x: 280,     y: H / 2 - 330, team: 0, color: 0x4488ff, name: 'עמית',  atkDmg: 260, atkCdBase: 1300 },
      { x: 280,     y: H / 2 + 330, team: 0, color: 0x44aaff, name: 'חבר',   atkDmg: 240, atkCdBase: 1200 },
      { x: W - 280, y: H / 2 - 330, team: 1, color: 0xff4444, name: 'אויב',  atkDmg: 270, atkCdBase: 1350 },
      { x: W - 280, y: H / 2,       team: 1, color: 0xff6644, name: 'יריב',  atkDmg: 250, atkCdBase: 1250 },
      { x: W - 280, y: H / 2 + 330, team: 1, color: 0xff2222, name: 'שומר',  atkDmg: 280, atkCdBase: 1400 },
    ];

    this.bots = defs.map((d, i) => {
      const charKey = shuffled[i % shuffled.length];
      const s = this.physics.add.sprite(d.x, d.y, charKey).setDepth(5);
      s.setScale(70 / s.height);
      s.setCollideWorldBounds(true);
      const bw = s.displayWidth * 0.5, bh = s.displayHeight * 0.55;
      s.body.setSize(bw / s.scaleX, bh / s.scaleY)
        .setOffset((s.width - bw / s.scaleX) / 2, (s.height - bh / s.scaleY) * 0.7);
      return {
        sprite: s, charKey, team: d.team, color: d.color, name: d.name,
        speed: 188, startX: d.x, startY: d.y,
        hp: 1600, maxHp: 1600, alive: true, noHitTime: 0,
        atkCd: 0, atkDmg: d.atkDmg, atkCdBase: d.atkCdBase,
        facing: { x: d.team === 0 ? 1 : -1, y: 0 },
        pickupCd: 0,
      };
    });

    this.botRings = this.bots.map(b =>
      this.add.circle(b.sprite.x, b.sprite.y, 30, b.color, 0.32).setDepth(4));
    this.botNameTxts = this.bots.map(b =>
      this.add.text(0, 0, b.name, {
        fontSize: '11px', color: b.team === 0 ? '#aaddff' : '#ffaaaa',
        fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(10));
    this.botBarGfxs = this.bots.map(() => this.add.graphics().setDepth(9));
  }

  // ─── BALL ────────────────────────────────────────────────────────────────────

  _createBallSprite() {
    const { x, y, r } = this.ball;
    this.ballShadow = this.add.circle(x + 5, y + 5, r, 0x000000, 0.28).setDepth(5);
    this.ballSprite = this.add.circle(x, y, r, 0xf5f5f5).setDepth(6);
    this.ballInner  = this.add.circle(x, y, r * 0.42, 0x222222, 0.65).setDepth(7);
    this.ballGfx    = this.add.graphics().setDepth(7);
  }

  // ─── PHYSICS ─────────────────────────────────────────────────────────────────

  _setupPhysics() {
    this.bots.forEach(b => {
      this.physics.add.collider(b.sprite, this.player.sprite);
      this.bots.forEach(b2 => { if (b !== b2) this.physics.add.collider(b.sprite, b2.sprite); });
    });
  }

  // ─── CONTROLS ────────────────────────────────────────────────────────────────

  _setupControls() {
    const { isMobile } = window.PAWER_CONFIG;
    if (isMobile) {
      this.mobileCtrl = new MobileControls(this);
    } else {
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.W,
        down:  Phaser.Input.Keyboard.KeyCodes.S,
        left:  Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up2:   Phaser.Input.Keyboard.KeyCodes.UP,
        down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right2:Phaser.Input.Keyboard.KeyCodes.RIGHT,
        atk:   Phaser.Input.Keyboard.KeyCodes.SPACE,
      });
      this.input.on('pointermove', p => { this.mouseWorld.x = p.worldX; this.mouseWorld.y = p.worldY; });
      this.input.on('pointerdown', p => { if (p.button === 0) this._doAttack(); });
    }
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────────

  _setupCamera(W, H) {
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  _createSoccerHUD() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 32, 280, 52, 0x000000, 0.55)
      .setScrollFactor(0).setDepth(100);
    this.add.text(width / 2 - 90, 32, '🔵', { fontSize: '20px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(width / 2 + 90, 32, '🔴', { fontSize: '20px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.scoreTxt = this.add.text(width / 2, 32, '0  –  0', {
      fontSize: '28px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    const charDef  = window.PAWER_CHARS.find(c => c.key === this.player.charKey);
    const icon     = { nix: '⚔️', fik: '💚', bigo: '🪓', dim: '🗡️', coch: '⚡', priti: '🌩️' }[this.player.charKey] || '⚔️';
    this.nixLabel  = this.add.text(0, 0, `${charDef?.name || ''} ${icon}`, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 1);
  }

  _updateHUD() {
    const { width, height } = this.scale;
    const BAR_W = Math.min(220, width * 0.4);
    const bx = width / 2, by = height - 30;

    this.hudGfx.clear();
    this.hudGfx.fillStyle(0x000000, 0.55);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2 - 2, by - 13, BAR_W + 4, 22, 6);
    const ratio = this.player.hp / this.player.maxHp;
    const col   = ratio > 0.55 ? 0x44ee44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hudGfx.fillStyle(col, 1);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2, by - 11, BAR_W * ratio, 18, 5);
    this.hudGfx.fillStyle(0xffffff, 0.15);
    this.hudGfx.fillRoundedRect(bx - BAR_W / 2, by - 11, BAR_W, 18, 5);
    this.nixLabel.setPosition(bx, by - 16);

    // Bot HP bars (world space)
    this.bots.forEach((bot, i) => {
      const gfx = this.botBarGfxs[i];
      const txt = this.botNameTxts[i];
      gfx.clear();
      if (!bot.alive) { txt.setVisible(false); return; }
      const bsx = bot.sprite.x, bsy = bot.sprite.y - 42;
      const BW  = 60;
      gfx.fillStyle(0x000000, 0.6);
      gfx.fillRoundedRect(bsx - BW / 2 - 1, bsy - 7, BW + 2, 14, 4);
      gfx.fillStyle(bot.color, 1);
      gfx.fillRoundedRect(bsx - BW / 2, bsy - 6, BW * (bot.hp / bot.maxHp), 12, 3);
      txt.setPosition(bsx, bsy - 8).setVisible(true);
    });
  }

  // ─── ATTACK ──────────────────────────────────────────────────────────────────

  _doAttack() {
    const p = this.player;
    if (!p.alive || p.atkCd > 0 || this.goalCooldown > 0) return;
    const ck = p.charKey;
    if      (ck === 'fik')   this._doSlimeAttack();
    else if (ck === 'bigo')  this._doHammerAttack();
    else if (ck === 'dim')   this._doDaggerAttack();
    else if (ck === 'coch')  this._doCochAttack();
    else if (ck === 'priti') this._doPritiAttack();
    else                     this._doSwordAttack();
  }

  _getAimDir() {
    const p = this.player.sprite;
    if (window.PAWER_CONFIG.isMobile) {
      const nb = this._nearestEnemy(0);
      if (nb) {
        const dx = nb.x - p.x, dy = nb.y - p.y, d = Math.hypot(dx, dy) || 1;
        return { ax: dx / d, ay: dy / d };
      }
      return { ax: this.player.facing.x, ay: this.player.facing.y };
    }
    const dx = this.mouseWorld.x - p.x, dy = this.mouseWorld.y - p.y;
    const d  = Math.hypot(dx, dy) || 1;
    return { ax: dx / d, ay: dy / d };
  }

  _doSwordAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 550;
    this._kickBallIfCarrying(ax, ay);
    const RANGE = 90, ARC = Math.PI * 0.72, aimAngle = Math.atan2(ay, ax);
    this.bots.forEach(bot => {
      if (!bot.alive || bot.team === 0) return;
      const dx = bot.sprite.x - p.x, dy = bot.sprite.y - p.y;
      if (Math.hypot(dx, dy) > RANGE) return;
      let diff = Math.abs(Math.atan2(dy, dx) - aimAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= ARC / 2) this._hitBot(bot, 420);
    });
    this._showSwing(p.x, p.y, ax, ay, RANGE, ARC);
  }

  _doSlimeAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 700;
    this._kickBallIfCarrying(ax, ay);
    this._spawnProjectile(p.x, p.y, ax, ay, 380, 0);
  }

  _doHammerAttack() {
    const p = this.player.sprite;
    this.player.atkCd = 850;
    const RANGE = 115;
    const { x: hax, y: hay } = this.player.facing;
    this._kickBallIfCarrying(hax, hay);
    this.bots.forEach(bot => {
      if (!bot.alive || bot.team === 0) return;
      if (Math.hypot(bot.sprite.x - p.x, bot.sprite.y - p.y) <= RANGE) this._hitBot(bot, 520);
    });
    this._showHammerSpin(p.x, p.y, RANGE);
  }

  _doDaggerAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 480;
    this._kickBallIfCarrying(ax, ay);
    this._spawnProjectile(p.x, p.y, ax, ay, 310, 0,
      { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc, hitRadius: 24 });
  }

  _doCochAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 620;
    this._kickBallIfCarrying(ax, ay);

    this.player.dashVx    = ax * 760;
    this.player.dashVy    = ay * 760;
    this.player.dashUntil = this.time.now + 190;

    const DASH_DIST = 220;
    const hitBots = new Set();
    for (let i = 1; i <= 12; i++) {
      const tx = p.x + ax * DASH_DIST * (i / 12);
      const ty = p.y + ay * DASH_DIST * (i / 12);
      this.bots.forEach(bot => {
        if (!bot.alive || bot.team === 0 || hitBots.has(bot)) return;
        if (Math.hypot(bot.sprite.x - tx, bot.sprite.y - ty) < 56) {
          hitBots.add(bot);
          this._hitBot(bot, 460, tx, ty);
        }
      });
      this._tryKickBall(tx, ty, ax * 560, ay * 560, 42);
    }
    if (hitBots.size > 0) this.cameras.main.shake(120, 0.007);

    this._showCochDash(p.x, p.y, ax, ay, DASH_DIST);
  }

  _doPritiAttack() {
    const p = this.player.sprite;
    const { ax, ay } = this._getAimDir();
    this.player.facing = { x: ax, y: ay };
    this.player.atkCd  = 580;
    this._kickBallIfCarrying(ax, ay);

    const RANGE = 300, CHAIN_R = 200, CHAIN_N = 2;
    let primary = null, bestDot = 0.4;
    this.bots.forEach(bot => {
      if (!bot.alive || bot.team === 0) return;
      const dx = bot.sprite.x - p.x, dy = bot.sprite.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > RANGE) return;
      const dot = (dx / dist) * ax + (dy / dist) * ay;
      if (dot > bestDot) { bestDot = dot; primary = bot; }
    });

    if (!primary) {
      this._showLightningBolt(p.x, p.y, p.x + ax * RANGE, p.y + ay * RANGE, false);
      return;
    }

    this._hitBot(primary, 360);
    this._showLightningBolt(p.x, p.y, primary.sprite.x, primary.sprite.y, true);

    const hit = new Set([primary]);
    let last = primary;
    for (let c = 0; c < CHAIN_N; c++) {
      let next = null, nearestD = CHAIN_R;
      this.bots.forEach(bot => {
        if (!bot.alive || bot.team === 0 || hit.has(bot)) return;
        const d = Math.hypot(bot.sprite.x - last.sprite.x, bot.sprite.y - last.sprite.y);
        if (d < nearestD) { nearestD = d; next = bot; }
      });
      if (!next) break;
      hit.add(next); this._hitBot(next, 220);
      this._showLightningBolt(last.sprite.x, last.sprite.y, next.sprite.x, next.sprite.y, true);
      last = next;
    }
    this.cameras.main.shake(70, 0.003);
  }

  _showLightningBolt(x1, y1, x2, y2, impact) {
    const g    = this.add.graphics().setDepth(9);
    const dx   = x2 - x1, dy = y2 - y1;
    const len  = Math.hypot(dx, dy) || 1;
    const jit  = Math.min(28, len * 0.18);
    const ppx  = -dy / len, ppy = dx / len;
    const SEGS = 10;
    const pts  = [{ x: x1, y: y1 }];
    for (let i = 1; i < SEGS; i++) {
      const t = i / SEGS, off = (Math.random() - 0.5) * 2 * jit;
      pts.push({ x: x1 + dx * t + ppx * off, y: y1 + dy * t + ppy * off });
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

  _showCochDash(px, py, ax, ay, dist) {
    const perp = { x: -ay, y: ax };

    const flash = this.add.rectangle(
      px + ax * dist * 0.5, py + ay * dist * 0.5,
      dist, 32, 0xff5500, 0.55
    ).setRotation(Math.atan2(ay, ax)).setDepth(8);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.6, duration: 280,
      onComplete: () => flash.destroy() });

    const g = this.add.graphics().setDepth(9);
    g.lineStyle(8, 0xff3300, 0.85);
    g.lineBetween(px, py, px + ax * dist, py + ay * dist);
    g.lineStyle(3, 0xffee88, 0.9);
    g.lineBetween(px, py, px + ax * dist, py + ay * dist);

    for (let i = 0; i < 7; i++) {
      const t  = (i + 0.5) / 7;
      const cx = px + ax * dist * t;
      const cy = py + ay * dist * t;
      const sl = 26 + (i % 2) * 14;
      const tx1 = cx + perp.x * sl, ty1 = cy + perp.y * sl;
      const tx2 = cx - perp.x * sl, ty2 = cy - perp.y * sl;
      g.lineStyle(5, 0xff6600, 1);
      g.lineBetween(tx1, ty1, tx2, ty2);
      g.lineStyle(3, 0xffcc00, 0.95);
      g.lineBetween(tx1, ty1, tx1 - perp.x * 10 + ax * 12, ty1 - perp.y * 10 + ay * 12);
      g.lineBetween(tx2, ty2, tx2 + perp.x * 10 + ax * 12, ty2 + perp.y * 10 + ay * 12);
      g.fillStyle(0xffee00, 1);
      g.fillCircle(tx1, ty1, 5);
      g.fillCircle(tx2, ty2, 5);
    }

    g.fillStyle(0xff2200, 0.7);
    g.fillCircle(px + ax * dist, py + ay * dist, 18);
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(px + ax * dist, py + ay * dist, 8);

    this.tweens.add({ targets: g, alpha: 0, duration: 420,
      onComplete: () => g.destroy() });

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

  // ownerTeam 0 = blue (hits team 1); ownerTeam 1 = red (hits player + team 0)
  _spawnProjectile(fromX, fromY, ax, ay, dmg, ownerTeam, opts = {}, ownerBot = null) {
    const speed      = opts.speed      || 430;
    const color      = opts.color      || (ownerTeam === 0 ? 0x33dd33 : 0xff4422);
    const gcolor     = opts.gcolor     || (ownerTeam === 0 ? 0xaaffaa : 0xffaa88);
    const radius     = opts.radius     || 9;
    const maxDist    = opts.maxDist    || 340;
    const splatColor = opts.splatColor || color;
    const hitRadius  = opts.hitRadius  || 32;
    const circle = this.add.circle(fromX, fromY, radius, color).setDepth(7);
    const glow   = this.add.circle(fromX, fromY, Math.max(2, radius - 4), gcolor, 0.75).setDepth(8);
    this.slimes.push({
      circle, glow, x: fromX, y: fromY,
      vx: ax * speed, vy: ay * speed,
      dmg, ownerTeam, ownerBot,
      travelDist: 0, maxDist, splatColor, hitRadius, dead: false,
    });
  }

  _updateSlimes(delta) {
    const dt = delta / 1000;
    const W  = this.W, H = this.H;
    for (let i = this.slimes.length - 1; i >= 0; i--) {
      const s = this.slimes[i];
      if (s.dead) { s.circle.destroy(); s.glow.destroy(); this.slimes.splice(i, 1); continue; }
      const mx = s.vx * dt, my = s.vy * dt;
      s.x += mx; s.y += my;
      s.travelDist += Math.hypot(mx, my);
      s.circle.setPosition(s.x, s.y);
      s.glow.setPosition(s.x, s.y);
      if (s.x < 0 || s.x > W || s.y < 0 || s.y > H || s.travelDist >= s.maxDist) {
        this._splatEffect(s.x, s.y, s.splatColor); s.dead = true; continue;
      }

      // Hits player (only red projectiles)
      if (s.ownerTeam === 1 && this.player.alive) {
        if (Math.hypot(this.player.sprite.x - s.x, this.player.sprite.y - s.y) < s.hitRadius) {
          this._hitPlayer(s.dmg); this._splatEffect(s.x, s.y, s.splatColor);
          s.dead = true; continue;
        }
      }

      // Hits bots of opposite team
      let hit = false;
      for (const bot of this.bots) {
        if (!bot.alive) continue;
        if (bot === s.ownerBot) continue;
        if (bot.team === s.ownerTeam) continue; // friendly fire off
        if (Math.hypot(bot.sprite.x - s.x, bot.sprite.y - s.y) < s.hitRadius) {
          this._hitBot(bot, s.dmg, s.x, s.y);
          this._splatEffect(s.x, s.y, s.splatColor);
          s.dead = true; hit = true; break;
        }
      }
      if (hit) continue;
    }
  }

  // ─── DAMAGE ──────────────────────────────────────────────────────────────────

  _hitBot(bot, dmg, fromX, fromY) {
    if (!bot.alive) return;
    bot.noHitTime = 0;
    bot.hp = Math.max(0, bot.hp - dmg);
    this._popNumber(bot.sprite.x, bot.sprite.y - 40, dmg, '#ff6666');
    const ox = fromX ?? this.player.sprite.x, oy = fromY ?? this.player.sprite.y;
    const dx = bot.sprite.x - ox, dy = bot.sprite.y - oy;
    const d  = Math.hypot(dx, dy) || 1;
    bot.sprite.body.setVelocity(dx / d * 300, dy / d * 300);
    this.tweens.add({ targets: bot.sprite, alpha: 0.3, duration: 80, yoyo: true });
    if (bot.hp <= 0) this._killBot(bot);
  }

  _hitPlayer(dmg) {
    const p = this.player;
    if (!p.alive) return;
    p.hp = Math.max(0, p.hp - dmg);
    p.noHitTime = 0;
    this._popNumber(p.sprite.x, p.sprite.y - 40, dmg, '#ffff44');
    this.cameras.main.shake(160, 0.007);
    this.tweens.add({ targets: p.sprite, alpha: 0.3, duration: 80, yoyo: true });
    if (p.hp <= 0) this._killPlayer();
  }

  _killBot(bot) {
    bot.alive = false;
    bot.hp    = 0;
    bot.sprite.setVisible(false);
    this.botRings[this.bots.indexOf(bot)]?.setVisible(false);
    if (this.ball.carrier?.type === 'bot' && this.ball.carrier.bot === bot) this.ball.carrier = null;
    this._burstEffect(bot.sprite.x, bot.sprite.y, bot.color);
    const idx = this.bots.indexOf(bot);
    this.time.delayedCall(3500, () => this._respawnBot(bot, idx));
  }

  _killPlayer() {
    const p = this.player;
    p.alive = false;
    p.sprite.setVisible(false);
    this.playerRing.setVisible(false);
    if (this.ball.carrier) this.ball.carrier = null;
    this._burstEffect(p.sprite.x, p.sprite.y, 0x4488ff);
    this._flashText('💀 מתחדש...', '#ff6666', 3200);
    this.time.delayedCall(3500, () => this._respawnPlayer());
  }

  _respawnBot(bot, idx) {
    if (this.gameOver) return;
    bot.hp       = bot.maxHp;
    bot.alive    = true;
    bot.atkCd    = 0;
    bot.noHitTime = 0;
    bot.sprite.setPosition(bot.startX, bot.startY).setVisible(true).setAlpha(0.3);
    this.botRings[idx]?.setVisible(true);
    this.tweens.add({ targets: bot.sprite, alpha: 1, duration: 600 });
  }

  _respawnPlayer() {
    if (this.gameOver) return;
    const p = this.player;
    p.hp = p.maxHp; p.alive = true; p.atkCd = 0; p.noHitTime = 0;
    p.sprite.setPosition(370, this.H / 2).setVisible(true).setAlpha(0.3);
    this.playerRing.setVisible(true);
    this.tweens.add({ targets: p.sprite, alpha: 1, duration: 600 });
  }

  // ─── VISUALS ─────────────────────────────────────────────────────────────────

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
    this.tweens.add({ targets: this.swordGfx, alpha: 0, duration: 300,
      onComplete: () => { this.swordGfx.clear(); this.swordGfx.setAlpha(1); } });
  }

  _showHammerSpin(px, py, range) {
    const g = this.add.graphics().setDepth(8);
    g.lineStyle(10, 0xffaa00, 0.9); g.strokeCircle(px, py, range);
    g.fillStyle(0xffaa00, 0.15);    g.fillCircle(px, py, range);
    this.tweens.add({ targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 380,
      ease: 'Expo.easeOut', onComplete: () => g.destroy() });
  }

  _splatEffect(x, y, color = 0x33dd33) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2, dist = 10 + Math.random() * 25;
      const c = this.add.circle(x, y, 3 + Math.random() * 5, color).setDepth(7).setAlpha(0.9);
      this.tweens.add({ targets: c,
        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 220 + Math.random() * 130,
        onComplete: () => c.destroy() });
    }
  }

  _burstEffect(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2, dist = 40 + Math.random() * 40;
      const c = this.add.circle(x, y, 5 + Math.random() * 4, color).setDepth(20);
      this.tweens.add({ targets: c,
        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 350 + Math.random() * 150,
        onComplete: () => c.destroy() });
    }
  }

  _popNumber(x, y, val, color) {
    const t = this.add.text(x, y, `-${val}`, {
      fontSize: '20px', color, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 55, alpha: 0, duration: 750, onComplete: () => t.destroy() });
  }

  // ─── BALL UPDATE ─────────────────────────────────────────────────────────────

  _updateBall(delta) {
    if (this.goalCooldown > 0) { this.goalCooldown -= delta; return; }
    const b = this.ball;
    const W = this.W, H = this.H;

    if (b.carrier) {
      const isPlayer = b.carrier.type === 'player';
      const alive    = isPlayer ? this.player.alive : b.carrier.bot.alive;
      if (!alive) {
        b.carrier = null;
      } else {
        const spr = isPlayer ? this.player.sprite : b.carrier.bot.sprite;
        const fac = isPlayer ? this.player.facing  : b.carrier.bot.facing;
        b.x = spr.x + (fac.x || 1) * 28;
        b.y = spr.y + (fac.y || 0) * 28;
        b.vx = 0; b.vy = 0;
        if (b.y > this.GOAL_Y1 && b.y < this.GOAL_Y2) {
          if (b.x < 128) { b.carrier = null; this._scoreGoal(1); return; }
          if (b.x > W - 128) { b.carrier = null; this._scoreGoal(0); return; }
        }
      }
    } else {
      const dt   = delta / 1000;
      const fric = Math.pow(0.984, delta / 16.67);
      b.vx *= fric; b.vy *= fric;
      b.x  += b.vx * dt; b.y += b.vy * dt;
      if (b.y < 128 + b.r)     { b.y = 128 + b.r;     b.vy =  Math.abs(b.vy) * 0.78; }
      if (b.y > H - 128 - b.r) { b.y = H - 128 - b.r; b.vy = -Math.abs(b.vy) * 0.78; }
      const inGoalY = b.y > this.GOAL_Y1 && b.y < this.GOAL_Y2;
      if (b.x < 128) {
        if (inGoalY) { this._scoreGoal(1); return; }
        else { b.x = 128; b.vx = Math.abs(b.vx) * 0.78; }
      }
      if (b.x > W - 128) {
        if (inGoalY) { this._scoreGoal(0); return; }
        else { b.x = W - 128; b.vx = -Math.abs(b.vx) * 0.78; }
      }

      // ── Bumper collisions ─────────────────────────────────────────────────────
      this.bumpers.forEach(bumper => {
        if (bumper.cooldown > 0) { bumper.cooldown -= delta; return; }
        const dist = Math.hypot(b.x - bumper.x, b.y - bumper.y);
        if (dist < bumper.r + b.r) {
          const nd = dist || 1;
          const nx = (b.x - bumper.x) / nd;
          const ny = (b.y - bumper.y) / nd;
          b.vx = nx * 560;
          b.vy = ny * 560;
          b.x = bumper.x + nx * (bumper.r + b.r + 3);
          b.y = bumper.y + ny * (bumper.r + b.r + 3);
          this._activateBumper(bumper);
        }
      });
    }

    this.ballShadow.setPosition(b.x + 5, b.y + 5);
    this.ballSprite.setPosition(b.x, b.y);
    this.ballInner.setPosition(b.x, b.y);
    const angle = (Date.now() / 300) % (Math.PI * 2);
    this.ballGfx.clear();
    this.ballGfx.lineStyle(2, 0x888888, 0.55);
    this.ballGfx.beginPath();
    this.ballGfx.arc(b.x, b.y, b.r * 0.75, angle, angle + Math.PI * 1.1);
    this.ballGfx.strokePath();
    this.ballGfx.beginPath();
    this.ballGfx.arc(b.x, b.y, b.r * 0.75, angle + Math.PI, angle + Math.PI * 2.1);
    this.ballGfx.strokePath();
  }

  _tryKickBall(px, py, pvx, pvy, kickR) {
    if (this.goalCooldown > 0) return;
    const b    = this.ball;
    const dist = Math.hypot(b.x - px, b.y - py);
    if (dist > kickR + b.r) return;
    const nx = dist > 0 ? (b.x - px) / dist : 1;
    const ny = dist > 0 ? (b.y - py) / dist : 0;
    const spd = Math.max(170, Math.hypot(pvx, pvy) * 1.45 + 110);
    b.vx = nx * spd; b.vy = ny * spd;
  }

  _kickBallIfCarrying(ax, ay) {
    const b = this.ball;
    if (!b.carrier) return;
    b.carrier = null;
    b.vx = ax * 820;
    b.vy = ay * 820;
    this.player.pickupCd = 550;
  }

  // ─── PLAYER UPDATE ───────────────────────────────────────────────────────────

  _updatePlayer(delta) {
    const p = this.player;
    p.atkCd     = Math.max(0, p.atkCd - delta);
    p.pickupCd  = Math.max(0, p.pickupCd - delta);
    p.noHitTime += delta;
    if (p.noHitTime > 3000 && p.hp < p.maxHp)
      p.hp = Math.min(p.maxHp, p.hp + 150 * delta / 1000);

    if (!p.alive || this.goalCooldown > 0) {
      if (p.sprite.body) p.sprite.body.setVelocity(0, 0);
      return;
    }

    let vx = 0, vy = 0;
    if (window.PAWER_CONFIG.isMobile && this.mobileCtrl) {
      const m = this.mobileCtrl.getMovement();
      vx = m.x * p.speed; vy = m.y * p.speed;
      if (this.mobileCtrl.consumeAttack()) this._doAttack();
      if (this.mobileCtrl.isAttacking() && p.atkCd <= 0) this._doAttack();
    } else {
      const k = this.keys;
      if (k.left.isDown  || k.left2.isDown)  vx -= p.speed;
      if (k.right.isDown || k.right2.isDown) vx += p.speed;
      if (k.up.isDown    || k.up2.isDown)    vy -= p.speed;
      if (k.down.isDown  || k.down2.isDown)  vy += p.speed;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      if (Phaser.Input.Keyboard.JustDown(k.atk) && p.atkCd <= 0) this._doAttack();
    }

    if (p.dashUntil > this.time.now) {
      p.sprite.body.setVelocity(p.dashVx, p.dashVy);
    } else {
      p.sprite.body.setVelocity(vx, vy);
      if (vx !== 0) { p.sprite.setFlipX(vx < 0); p.facing = { x: vx > 0 ? 1 : -1, y: 0 }; }
    }
    this.playerNameText.setPosition(p.sprite.x, p.sprite.y - p.sprite.displayHeight / 2 - 6);
    this.playerRing.setPosition(p.sprite.x, p.sprite.y);
    const pb = this.ball;
    if (!pb.carrier && p.pickupCd <= 0 && Math.hypot(pb.x - p.sprite.x, pb.y - p.sprite.y) < 38 + pb.r) {
      pb.carrier = { type: 'player' };
    }
  }

  // ─── BOT AI ──────────────────────────────────────────────────────────────────

  _nearestEnemy(myTeam) {
    // Returns {x, y} of nearest enemy for player (myTeam=0) to aim at
    let nearest = null, minD = Infinity;
    this.bots.forEach(b => {
      if (!b.alive || b.team === myTeam) return;
      const d = Math.hypot(b.sprite.x - this.player.sprite.x, b.sprite.y - this.player.sprite.y);
      if (d < minD) { minD = d; nearest = b.sprite; }
    });
    return nearest;
  }

  _updateBots(delta) {
    if (this.goalCooldown > 0) {
      this.bots.forEach(b => { if (b.sprite.body) b.sprite.body.setVelocity(0, 0); });
      return;
    }
    const ball = this.ball;
    const W = this.W, H = this.H;

    this.bots.forEach((bot, i) => {
      if (!bot.alive) return;
      bot.atkCd    = Math.max(0, bot.atkCd - delta);
      bot.pickupCd = Math.max(0, bot.pickupCd - delta);
      bot.noHitTime += delta;
      if (bot.noHitTime > 3000 && bot.hp < bot.maxHp)
        bot.hp = Math.min(bot.maxHp, bot.hp + 150 * delta / 1000);

      // Find nearest enemy
      const enemy = this._nearestEnemyForBot(bot);

      // Attack if in range
      if (enemy && bot.atkCd <= 0) {
        const ex = enemy.isPlayer ? this.player.sprite.x : enemy.bot.sprite.x;
        const ey = enemy.isPlayer ? this.player.sprite.y : enemy.bot.sprite.y;
        const dist = Math.hypot(ex - bot.sprite.x, ey - bot.sprite.y);
        const isRanged = bot.charKey === 'fik' || bot.charKey === 'dim' || bot.charKey === 'priti';
        const atkRange = isRanged ? 190 : bot.charKey === 'bigo' ? 100 : bot.charKey === 'coch' ? 200 : 65;

        if (dist < atkRange) {
          bot.atkCd = bot.atkCdBase;
          if (ball.carrier?.type === 'bot' && ball.carrier.bot === bot) {
            ball.carrier = null; bot.pickupCd = 550;
            const goalX0 = bot.team === 0 ? W - 160 : 160;
            const kx = goalX0 - ball.x, ky = H / 2 - ball.y;
            const kd = Math.hypot(kx, ky) || 1;
            ball.vx = (kx / kd) * 820; ball.vy = (ky / kd) * 820;
          }
          const dx = ex - bot.sprite.x, dy = ey - bot.sprite.y, nd = dist || 1;
          if (isRanged) {
            const opts = bot.charKey === 'dim'
              ? { speed: 640, color: 0xccccdd, gcolor: 0xffffff, radius: 5, maxDist: 270, splatColor: 0xaaaacc, hitRadius: 24 }
              : bot.charKey === 'priti'
              ? { speed: 480, color: 0x6655ff, gcolor: 0xddddff, radius: 6, maxDist: 300, splatColor: 0x9999ff }
              : {};
            this._spawnProjectile(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, bot.atkDmg, bot.team, opts, bot);
          } else if (bot.charKey === 'bigo') {
            if (enemy.isPlayer) this._hitPlayer(bot.atkDmg);
            else this._hitBot(enemy.bot, bot.atkDmg, bot.sprite.x, bot.sprite.y);
            this._showHammerSpin(bot.sprite.x, bot.sprite.y, 100);
          } else if (bot.charKey === 'coch') {
            if (enemy.isPlayer) this._hitPlayer(bot.atkDmg);
            else this._hitBot(enemy.bot, bot.atkDmg, bot.sprite.x, bot.sprite.y);
            this._showCochDash(bot.sprite.x, bot.sprite.y, dx / nd, dy / nd, Math.min(dist, 200));
          } else {
            if (enemy.isPlayer) this._hitPlayer(bot.atkDmg);
            else this._hitBot(enemy.bot, bot.atkDmg, bot.sprite.x, bot.sprite.y);
          }
        }
      }

      // Movement: carry toward goal, chase ball, or chase enemy
      const goalX = bot.team === 0 ? W - 160 : 160;
      let vx, vy;

      if (ball.carrier?.type === 'bot' && ball.carrier.bot === bot) {
        // Carrying — run toward goal, kick when close enough
        const dgx = goalX - bot.sprite.x, dgy = H / 2 - bot.sprite.y;
        const dg  = Math.hypot(dgx, dgy) || 1;
        vx = (dgx / dg) * bot.speed; vy = (dgy / dg) * bot.speed;
        if (Math.abs(bot.sprite.x - goalX) < 380) {
          ball.carrier = null; bot.pickupCd = 550;
          ball.vx = (dgx / dg) * 820; ball.vy = (dgy / dg) * 820;
        }
      } else {
        const dBx = ball.x - bot.sprite.x, dBy = ball.y - bot.sprite.y;
        const distB = Math.hypot(dBx, dBy);
        if (distB < 50 && !ball.carrier) {
          const dgx = goalX - bot.sprite.x, dgy = H / 2 - bot.sprite.y;
          const dg  = Math.hypot(dgx, dgy) || 1;
          vx = (dgx / dg) * bot.speed; vy = (dgy / dg) * bot.speed;
          this._tryKickBall(bot.sprite.x, bot.sprite.y, vx, vy, 50);
        } else {
          const nd = distB || 1;
          vx = (dBx / nd) * bot.speed; vy = (dBy / nd) * bot.speed;
        }
        if (!ball.carrier && bot.pickupCd <= 0 &&
            Math.hypot(ball.x - bot.sprite.x, ball.y - bot.sprite.y) < 40 + ball.r) {
          ball.carrier = { type: 'bot', bot };
        }
      }

      bot.sprite.body.setVelocity(vx, vy);
      if (vx !== 0 || vy !== 0) {
        const spd = Math.hypot(vx, vy) || 1;
        bot.facing = { x: vx / spd, y: vy / spd };
        bot.sprite.setFlipX(vx < 0);
      }

      this.botNameTxts[i].setPosition(bot.sprite.x, bot.sprite.y - bot.sprite.displayHeight / 2 - 6);
      this.botRings[i].setPosition(bot.sprite.x, bot.sprite.y);
    });
  }

  _nearestEnemyForBot(bot) {
    let nearest = null, minDist = Infinity;
    if (bot.team !== 0 && this.player.alive) {
      const d = Math.hypot(this.player.sprite.x - bot.sprite.x, this.player.sprite.y - bot.sprite.y);
      if (d < minDist) { minDist = d; nearest = { x: this.player.sprite.x, y: this.player.sprite.y, isPlayer: true }; }
    }
    this.bots.forEach(other => {
      if (other === bot || !other.alive || other.team === bot.team) return;
      const d = Math.hypot(other.sprite.x - bot.sprite.x, other.sprite.y - bot.sprite.y);
      if (d < minDist) { minDist = d; nearest = { x: other.sprite.x, y: other.sprite.y, isPlayer: false, bot: other }; }
    });
    return nearest;
  }

  // ─── GOAL ────────────────────────────────────────────────────────────────────

  _scoreGoal(scoringTeam) {
    if (this.gameOver) return;
    this.ball.carrier = null;
    this.goalCooldown = 2800;
    this.score[scoringTeam]++;
    this.scoreTxt.setText(`${this.score[0]}  –  ${this.score[1]}`);
    const msg = scoringTeam === 0 ? '⚽  גול! 🔵' : '⚽  גול! 🔴';
    this._flashText(msg, scoringTeam === 0 ? '#44aaff' : '#ff5555', 1800);
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(220, 255, 255, 100, true);
    this.slimes.forEach(s => s.dead = true); // clear projectiles on goal

    if (this.score[scoringTeam] >= 2) {
      this.time.delayedCall(1400, () => this._endGame(scoringTeam === 0));
      return;
    }
    this.time.delayedCall(2000, () => this._resetPositions());
  }

  _resetPositions() {
    const W = this.W, H = this.H;
    this.ball.x = W / 2; this.ball.y = H / 2;
    this.ball.vx = 60;   this.ball.vy = 0;
    this.ball.carrier = null;
    this.ballSprite.setPosition(W / 2, H / 2);
    this.ballShadow.setPosition(W / 2 + 5, H / 2 + 5);
    this.ballInner.setPosition(W / 2, H / 2);

    if (this.player.alive) {
      this.player.sprite.setPosition(370, H / 2);
      this.player.sprite.body.setVelocity(0, 0);
    }
    const starts = [
      { x: 280,     y: H / 2 - 330 }, { x: 280,     y: H / 2 + 330 },
      { x: W - 280, y: H / 2 - 330 }, { x: W - 280, y: H / 2       },
      { x: W - 280, y: H / 2 + 330 },
    ];
    this.bots.forEach((bot, i) => {
      if (bot.alive) { bot.sprite.setPosition(starts[i].x, starts[i].y); bot.sprite.body.setVelocity(0, 0); }
    });
    this.goalCooldown = 0;
  }

  // ─── GAME OVER ───────────────────────────────────────────────────────────────

  _endGame(win) {
    this.gameOver = true;
    const { width, height } = this.scale;
    const charKey  = window.PAWER_SAVE.getChar();
    const charDef  = window.PAWER_CHARS.find(c => c.key === charKey);
    const charName = charDef ? charDef.name : charKey;
    const oldCharT = window.PAWER_SAVE.getCharTrophies(charKey);
    const charChange = win ? 10 : -Math.min(2, oldCharT);
    if (win) window.PAWER_SAVE.addTrophies(10);
    window.PAWER_SAVE.addCharTrophies(charKey, charChange);

    this.time.delayedCall(400, () => {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65)
        .setScrollFactor(0).setDepth(200);
      this.add.text(width / 2, height / 2 - 85,
        win ? '🏆 ניצחון!' : '💀 הפסד!', {
          fontSize: '52px', color: win ? '#ffdd00' : '#ff4444',
          fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      this.add.text(width / 2, height / 2 - 18,
        `🔵  ${this.score[0]}  –  ${this.score[1]}  🔴`, {
          fontSize: '34px', color: '#ffffff',
          fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      const charLabel = charChange >= 0 ? `+${charChange}` : `${charChange}`;
      const charTotal = window.PAWER_SAVE.getCharTrophies(charKey);
      this.add.text(width / 2, height / 2 + 30,
        win
          ? `+10 🏆  ${charName}: ${charTotal}  |  סה"כ: ${window.PAWER_SAVE.getTrophies()}`
          : `${charLabel} 🏆  ${charName}: ${charTotal}`, {
          fontSize: '16px', color: win ? '#ffdd00' : '#ff9966', fontFamily: 'Arial', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      const retry = this.add.text(width / 2, height / 2 + 82, '🔄  שחק שוב', {
        fontSize: '26px', color: '#ffffff', fontFamily: 'Arial',
        backgroundColor: '#1155cc', padding: { x: 30, y: 12 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });
      retry.on('pointerdown', () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.restart());
      });

      const menu = this.add.text(width / 2, height / 2 + 150, '🏠  תפריט ראשי', {
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
      const hit = RANKS.filter(r => oldCharT < r.at && window.PAWER_SAVE.getCharTrophies(charKey) >= r.at);
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
    this.tweens.add({ targets: t, scaleX: 1.15, scaleY: 1.15, alpha: 0,
      duration: dur, onComplete: () => t.destroy() });
  }

  // ─── MAIN LOOP ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameOver) return;
    this._updatePlayer(delta);
    this._updateBots(delta);
    this._updateBall(delta);
    this._updateSlimes(delta);
    this._updateHUD();
  }
}
