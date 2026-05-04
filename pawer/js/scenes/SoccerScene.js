class SoccerScene extends Phaser.Scene {
  constructor() { super({ key: 'SoccerScene' }); }

  create() {
    const W = 1920, H = 1920;
    this.W = W; this.H = H;
    this.score    = [0, 0];   // [blue (player), red (opponent)]
    this.gameOver = false;
    this.goalCooldown = 0;    // ms, freeze during goal celebration

    const GOAL_H   = 420;
    this.GOAL_Y1   = H / 2 - GOAL_H / 2;
    this.GOAL_Y2   = H / 2 + GOAL_H / 2;
    this.ball      = { x: W / 2, y: H / 2, vx: 60, vy: 40, r: 18 };

    this.physics.world.setBounds(0, 0, W, H);

    this._createField(W, H);
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
    // Alternating grass stripes
    const bg = this.add.graphics().setDepth(0);
    const STRIPES = 12;
    for (let i = 0; i < STRIPES; i++) {
      bg.fillStyle(i % 2 === 0 ? 0x2e8c2e : 0x289028, 1);
      bg.fillRect(0, i * H / STRIPES, W, H / STRIPES);
    }

    // White markings
    const L = this.add.graphics().setDepth(1);
    L.lineStyle(5, 0xffffff, 0.85);

    // Outer boundary
    L.strokeRect(128, 128, W - 256, H - 256);

    // Centre line (vertical, since goals on left/right)
    L.lineBetween(W / 2, 128, W / 2, H - 128);

    // Centre circle + dot
    L.strokeCircle(W / 2, H / 2, 190);
    L.fillStyle(0xffffff, 0.85);
    L.fillCircle(W / 2, H / 2, 9);

    // Penalty areas
    const PA_W = 240, PA_H = 720;
    L.strokeRect(128, H / 2 - PA_H / 2, PA_W, PA_H);
    L.strokeRect(W - 128 - PA_W, H / 2 - PA_H / 2, PA_W, PA_H);

    // Penalty spots
    L.fillCircle(128 + 320, H / 2, 8);
    L.fillCircle(W - 128 - 320, H / 2, 8);

    // Goal net fill (faint)
    const net = this.add.graphics().setDepth(1);
    net.fillStyle(0xffffff, 0.10);
    net.fillRect(0, this.GOAL_Y1, 128, this.GOAL_Y2 - this.GOAL_Y1);
    net.fillRect(W - 128, this.GOAL_Y1, 128, this.GOAL_Y2 - this.GOAL_Y1);

    // Goal posts + crossbars
    L.lineStyle(11, 0xffffff, 1);
    L.lineBetween(128, this.GOAL_Y1, 128, this.GOAL_Y2);
    L.lineBetween(W - 128, this.GOAL_Y1, W - 128, this.GOAL_Y2);
    L.lineBetween(0, this.GOAL_Y1, 128, this.GOAL_Y1);
    L.lineBetween(0, this.GOAL_Y2, 128, this.GOAL_Y2);
    L.lineBetween(W - 128, this.GOAL_Y1, W, this.GOAL_Y1);
    L.lineBetween(W - 128, this.GOAL_Y2, W, this.GOAL_Y2);

    // Faint team-half tints
    const half = this.add.graphics().setDepth(0);
    half.fillStyle(0x2244ff, 0.06);
    half.fillRect(0, 0, W / 2, H);
    half.fillStyle(0xff2244, 0.06);
    half.fillRect(W / 2, 0, W / 2, H);
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

    this.player = { sprite, speed: 245, charKey };
    this.mouseWorld = { x: 0, y: 0 };

    const playerName = window.PAWER_SAVE.getName() || 'שחקן';
    this.playerNameText = this.add.text(0, 0, playerName, {
      fontSize: '13px', color: '#aaddff',
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000033', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(12);

    this.playerRing = this.add.circle(sprite.x, sprite.y, 35, 0x2266ff, 0.32).setDepth(4);
  }

  // ─── BOTS ────────────────────────────────────────────────────────────────────

  _createSoccerBots(W, H) {
    const charKeys  = window.PAWER_CHARS.map(c => c.key);
    const shuffled  = Phaser.Utils.Array.Shuffle([...charKeys]);

    const defs = [
      { x: 280,     y: H / 2 - 330, team: 0, color: 0x4488ff, name: 'עמית'  },
      { x: 280,     y: H / 2 + 330, team: 0, color: 0x44aaff, name: 'חבר'   },
      { x: W - 280, y: H / 2 - 330, team: 1, color: 0xff4444, name: 'אויב'  },
      { x: W - 280, y: H / 2,       team: 1, color: 0xff6644, name: 'יריב'  },
      { x: W - 280, y: H / 2 + 330, team: 1, color: 0xff2222, name: 'שומר'  },
    ];

    this.bots = defs.map((d, i) => {
      const key = shuffled[i % shuffled.length];
      const s   = this.physics.add.sprite(d.x, d.y, key).setDepth(5);
      s.setScale(70 / s.height);
      s.setCollideWorldBounds(true);
      const bw = s.displayWidth * 0.5, bh = s.displayHeight * 0.55;
      s.body.setSize(bw / s.scaleX, bh / s.scaleY)
        .setOffset((s.width - bw / s.scaleX) / 2, (s.height - bh / s.scaleY) * 0.7);
      return { sprite: s, team: d.team, color: d.color, name: d.name,
               speed: 188, startX: d.x, startY: d.y };
    });

    this.botRings = this.bots.map(b =>
      this.add.circle(b.sprite.x, b.sprite.y, 30, b.color, 0.32).setDepth(4));
    this.botNameTxts = this.bots.map(b =>
      this.add.text(0, 0, b.name, {
        fontSize: '11px', color: b.team === 0 ? '#aaddff' : '#ffaaaa',
        fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(10));
  }

  // ─── BALL ────────────────────────────────────────────────────────────────────

  _createBallSprite() {
    const { x, y, r } = this.ball;
    this.ballShadow = this.add.circle(x + 5, y + 5, r, 0x000000, 0.28).setDepth(5);
    this.ballSprite = this.add.circle(x, y, r, 0xf5f5f5).setDepth(6);
    this.ballInner  = this.add.circle(x, y, r * 0.42, 0x222222, 0.65).setDepth(7);
    // Decorative patches (static — ball isn't an image so no real rotation)
    this.ballGfx = this.add.graphics().setDepth(7);
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
      });
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
  }

  // ─── BALL UPDATE ─────────────────────────────────────────────────────────────

  _updateBall(delta) {
    if (this.goalCooldown > 0) { this.goalCooldown -= delta; return; }

    const dt   = delta / 1000;
    const b    = this.ball;
    const W    = this.W, H = this.H;
    const fric = Math.pow(0.984, delta / 16.67);

    b.vx *= fric;
    b.vy *= fric;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;

    // Top / bottom field walls
    if (b.y < 128 + b.r)         { b.y = 128 + b.r;         b.vy =  Math.abs(b.vy) * 0.78; }
    if (b.y > H - 128 - b.r)     { b.y = H - 128 - b.r;     b.vy = -Math.abs(b.vy) * 0.78; }

    const inGoalY = b.y > this.GOAL_Y1 && b.y < this.GOAL_Y2;

    // Left wall / left goal
    if (b.x < 128) {
      if (inGoalY) {
        if (b.x < 30) { this._scoreGoal(1); return; }
        b.vx *= 0.94; // slow down in net
      } else {
        b.x = 128; b.vx = Math.abs(b.vx) * 0.78;
      }
    }

    // Right wall / right goal
    if (b.x > W - 128) {
      if (inGoalY) {
        if (b.x > W - 30) { this._scoreGoal(0); return; }
        b.vx *= 0.94;
      } else {
        b.x = W - 128; b.vx = -Math.abs(b.vx) * 0.78;
      }
    }

    this.ballShadow.setPosition(b.x + 5, b.y + 5);
    this.ballSprite.setPosition(b.x, b.y);
    this.ballInner.setPosition(b.x, b.y);

    // Draw seam lines for rotation feel
    const angle = (Date.now() / 300) % (Math.PI * 2);
    this.ballGfx.clear();
    this.ballGfx.lineStyle(2, 0x888888, 0.55);
    this.ballGfx.beginPath();
    this.ballGfx.arc(b.x, b.y, b.r * 0.75,
      angle, angle + Math.PI * 1.1);
    this.ballGfx.strokePath();
    this.ballGfx.beginPath();
    this.ballGfx.arc(b.x, b.y, b.r * 0.75,
      angle + Math.PI, angle + Math.PI * 2.1);
    this.ballGfx.strokePath();
  }

  // ─── KICK ────────────────────────────────────────────────────────────────────

  _tryKickBall(px, py, pvx, pvy, kickR) {
    if (this.goalCooldown > 0) return;
    const b    = this.ball;
    const dist = Math.hypot(b.x - px, b.y - py);
    if (dist > kickR + b.r) return;
    const nx = dist > 0 ? (b.x - px) / dist : 1;
    const ny = dist > 0 ? (b.y - py) / dist : 0;
    const spd = Math.max(170, Math.hypot(pvx, pvy) * 1.45 + 110);
    b.vx = nx * spd;
    b.vy = ny * spd;
  }

  // ─── PLAYER UPDATE ───────────────────────────────────────────────────────────

  _updatePlayer(delta) {
    const p = this.player;
    let vx = 0, vy = 0;

    if (this.goalCooldown > 0) {
      p.sprite.body.setVelocity(0, 0);
    } else if (window.PAWER_CONFIG.isMobile && this.mobileCtrl) {
      const m = this.mobileCtrl.getMovement();
      vx = m.x * p.speed; vy = m.y * p.speed;
      p.sprite.body.setVelocity(vx, vy);
    } else {
      const k = this.keys;
      if (k.left.isDown  || k.left2.isDown)  vx -= p.speed;
      if (k.right.isDown || k.right2.isDown) vx += p.speed;
      if (k.up.isDown    || k.up2.isDown)    vy -= p.speed;
      if (k.down.isDown  || k.down2.isDown)  vy += p.speed;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      p.sprite.body.setVelocity(vx, vy);
    }

    if (vx !== 0) p.sprite.setFlipX(vx < 0);
    this.playerNameText.setPosition(
      p.sprite.x, p.sprite.y - p.sprite.displayHeight / 2 - 6);
    this.playerRing.setPosition(p.sprite.x, p.sprite.y);
    this._tryKickBall(p.sprite.x, p.sprite.y, vx, vy, 38);
  }

  // ─── BOT AI ──────────────────────────────────────────────────────────────────

  _updateBots(delta) {
    if (this.goalCooldown > 0) {
      this.bots.forEach(b => b.sprite.body.setVelocity(0, 0));
      return;
    }
    const ball = this.ball;
    const W = this.W, H = this.H;

    this.bots.forEach((bot, i) => {
      const goalX = bot.team === 0 ? W - 160 : 160;
      const dBx   = ball.x - bot.sprite.x;
      const dBy   = ball.y - bot.sprite.y;
      const distB = Math.hypot(dBx, dBy);
      let vx, vy;

      if (distB < 50) {
        // Push ball toward own goal
        const dgx = goalX - bot.sprite.x;
        const dgy = H / 2 - bot.sprite.y;
        const dg  = Math.hypot(dgx, dgy) || 1;
        vx = (dgx / dg) * bot.speed;
        vy = (dgy / dg) * bot.speed;
        this._tryKickBall(bot.sprite.x, bot.sprite.y, vx, vy, 50);
      } else {
        const nd = distB || 1;
        vx = (dBx / nd) * bot.speed;
        vy = (dBy / nd) * bot.speed;
      }

      bot.sprite.body.setVelocity(vx, vy);
      if (vx !== 0) bot.sprite.setFlipX(vx < 0);

      this.botNameTxts[i].setPosition(
        bot.sprite.x, bot.sprite.y - bot.sprite.displayHeight / 2 - 6);
      this.botRings[i].setPosition(bot.sprite.x, bot.sprite.y);
    });
  }

  // ─── GOAL ────────────────────────────────────────────────────────────────────

  _scoreGoal(scoringTeam) {
    if (this.gameOver) return;
    this.goalCooldown = 2800;
    this.score[scoringTeam]++;
    this.scoreTxt.setText(`${this.score[0]}  –  ${this.score[1]}`);

    const msg = scoringTeam === 0 ? '⚽  גול! 🔵' : '⚽  גול! 🔴';
    this._flashText(msg, scoringTeam === 0 ? '#44aaff' : '#ff5555', 1800);
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(220, 255, 255, 100, true);

    if (this.score[scoringTeam] >= 2) {
      this.time.delayedCall(1400, () => this._endGame(scoringTeam === 0));
      return;
    }
    this.time.delayedCall(2000, () => this._resetPositions());
  }

  _resetPositions() {
    const W = this.W, H = this.H;
    this.ball.x = W / 2; this.ball.y = H / 2;
    this.ball.vx = 60; this.ball.vy = 0;
    this.ballSprite.setPosition(W / 2, H / 2);
    this.ballShadow.setPosition(W / 2 + 5, H / 2 + 5);
    this.ballInner.setPosition(W / 2, H / 2);

    this.player.sprite.setPosition(370, H / 2);
    this.player.sprite.body.setVelocity(0, 0);

    const starts = [
      { x: 280,     y: H / 2 - 330 }, { x: 280,     y: H / 2 + 330 },
      { x: W - 280, y: H / 2 - 330 }, { x: W - 280, y: H / 2       },
      { x: W - 280, y: H / 2 + 330 },
    ];
    this.bots.forEach((bot, i) => {
      bot.sprite.setPosition(starts[i].x, starts[i].y);
      bot.sprite.body.setVelocity(0, 0);
    });
    this.goalCooldown = 0;
  }

  // ─── GAME OVER ───────────────────────────────────────────────────────────────

  _endGame(win) {
    this.gameOver = true;
    const { width, height } = this.scale;
    const earned  = win ? 10 : 1;
    const charKey = window.PAWER_SAVE.getChar();
    window.PAWER_SAVE.addTrophies(earned);
    window.PAWER_SAVE.addCharTrophies(charKey, earned);

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

      this.add.text(width / 2, height / 2 + 30,
        `+${earned} 🏆  סה"כ: ${window.PAWER_SAVE.getTrophies()}`, {
          fontSize: '16px', color: '#ffdd00',
          fontFamily: 'Arial', fontStyle: 'bold',
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

  update(time, delta) {
    if (this.gameOver) return;
    this._updatePlayer(delta);
    this._updateBots(delta);
    this._updateBall(delta);
  }
}
