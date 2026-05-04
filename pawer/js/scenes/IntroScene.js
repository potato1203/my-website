class IntroScene extends Phaser.Scene {
  constructor() { super({ key: 'IntroScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this._done = false;

    // Deep-space background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000008, 0x000008, 0x000c22, 0x000c22, 1);
    bg.fillRect(0, 0, W, H);

    // Skip hint
    this.add.text(W - 16, H - 16, 'לחץ לדילוג', {
      fontSize: '12px', color: '#334455', fontFamily: 'Arial',
    }).setOrigin(1, 1);

    this.input.once('pointerdown', () => this._finish());
    this.input.keyboard.once('keydown', () => this._finish());

    const RANKS = [
      { label: 'רגיל',  hex: 0xaaaaaa, css: '#aaaaaa', tier: 0 },
      { label: 'נחמד',  hex: 0x44ff88, css: '#44ff88', tier: 1 },
      { label: 'טוב',   hex: 0x44aaff, css: '#44aaff', tier: 2 },
      { label: 'מטורף', hex: 0xcc44ff, css: '#cc44ff', tier: 3 },
      { label: 'סופי',  hex: 0xFFD700, css: '#FFD700', tier: 4 },
    ];

    // Opening PAWER flash
    const logo = this.add.text(W / 2, H / 2, 'PAWER', {
      fontSize: '62px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#ff8800', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(20);
    this.tweens.add({
      targets: logo, alpha: 1, scaleX: 1.08, scaleY: 1.08,
      duration: 280, yoyo: true, hold: 180,
      onComplete: () => logo.destroy(),
    });

    // "דרגות" label — fades in after logo
    this.time.delayedCall(580, () => {
      if (this._done) return;
      const lbl = this.add.text(W / 2, H * 0.20, 'דרגות', {
        fontSize: '22px', color: '#8899bb',
        fontFamily: 'Arial', fontStyle: 'bold',
        letterSpacing: 8,
      }).setOrigin(0.5).setAlpha(0).setDepth(5);
      this.tweens.add({ targets: lbl, alpha: 0.7, duration: 300 });
      this.time.delayedCall(4800, () =>
        this.tweens.add({ targets: lbl, alpha: 0, duration: 400, onComplete: () => lbl.destroy() })
      );
    });

    // Schedule each rank
    const DELAYS = [700, 1600, 2500, 3400, 4750]; // extra gap before סופי
    RANKS.forEach((rank, i) => {
      this.time.delayedCall(DELAYS[i], () => {
        if (this._done) return;
        if (rank.tier < 4) this._showRankNormal(rank, W, H);
        else               this._showRankFinal(W, H);
      });
    });

    // Auto-advance
    this.time.delayedCall(7800, () => this._finish());
  }

  // ─── NORMAL RANKS ────────────────────────────────────────────────────────────

  _showRankNormal(rank, W, H) {
    // Ring burst — intensity scales with tier
    if (rank.tier > 0) {
      const ring = this.add.graphics().setDepth(4);
      ring.lineStyle(rank.tier * 2 + 1, rank.hex, 0.75);
      ring.strokeCircle(W / 2, H / 2, 4);
      this.tweens.add({
        targets: ring, scaleX: 55, scaleY: 55, alpha: 0,
        duration: 550, ease: 'Expo.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    // Particle burst
    const count = rank.tier * 4 + 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 55 + Math.random() * 130;
      const c = this.add.circle(W / 2, H / 2, 3 + Math.random() * 5, rank.hex, 0.85).setDepth(5);
      this.tweens.add({
        targets: c,
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 380 + Math.random() * 220, ease: 'Expo.easeOut',
        onComplete: () => c.destroy(),
      });
    }

    // Main text — slides up from below
    const txt = this.add.text(W / 2, H + 80, rank.label, {
      fontSize: '68px', color: rank.css,
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: txt, y: H / 2, alpha: 1,
      duration: 320, ease: 'Expo.easeOut',
      onComplete: () => {
        this.time.delayedCall(520, () => {
          this.tweens.add({
            targets: txt, y: -80, alpha: 0,
            duration: 260, ease: 'Expo.easeIn',
            onComplete: () => txt.destroy(),
          });
        });
      },
    });
  }

  // ─── FINAL RANK: סופי ────────────────────────────────────────────────────────

  _showRankFinal(W, H) {
    // ── Gold confetti rain ────────────────────────────────────────────────────
    for (let i = 0; i < 50; i++) {
      const px = Math.random() * W;
      const sz = 3 + Math.random() * 7;
      const col = [0xFFD700, 0xffee55, 0xffc200][Math.floor(Math.random() * 3)];
      const c = this.add.circle(px, -20, sz, col, 0.9).setDepth(3);
      this.tweens.add({
        targets: c, y: H + 30,
        x: px + (Math.random() - 0.5) * 260,
        alpha: 0.25,
        delay: Math.random() * 900,
        duration: 1400 + Math.random() * 800,
        ease: 'Sine.easeIn',
        onComplete: () => c.destroy(),
      });
    }

    // ── Expanding gold ring ───────────────────────────────────────────────────
    const ring = this.add.graphics().setDepth(6);
    ring.lineStyle(9, 0xFFD700, 1);
    ring.strokeCircle(W / 2, H / 2, 5);
    this.tweens.add({
      targets: ring, scaleX: Math.max(W, H) / 4, scaleY: Math.max(W, H) / 4, alpha: 0,
      duration: 700, ease: 'Expo.easeOut',
      onComplete: () => ring.destroy(),
    });

    // ── Screen gold flash ─────────────────────────────────────────────────────
    this.cameras.main.flash(500, 220, 160, 0, true);
    this.cameras.main.shake(650, 0.016);

    const tint = this.add.rectangle(W / 2, H / 2, W, H, 0xFFD700, 0).setDepth(2);
    this.tweens.add({
      targets: tint, alpha: 0.2, duration: 250,
      yoyo: true, hold: 80,
      onComplete: () => tint.destroy(),
    });

    // ── Burst particles ───────────────────────────────────────────────────────
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 90 + Math.random() * Math.min(W, H) * 0.38;
      const r     = 7 + Math.random() * 10;
      const c = this.add.circle(W / 2, H / 2, r, 0xFFD700).setDepth(5);
      this.tweens.add({
        targets: c,
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 550 + Math.random() * 300, ease: 'Expo.easeOut',
        onComplete: () => c.destroy(),
      });
    }

    // ── 8 orbiting stars ─────────────────────────────────────────────────────
    const orbitR = Math.min(W, H) * 0.24;
    const stars  = [];
    for (let i = 0; i < 8; i++) {
      const star = this.add.text(W / 2, H / 2, '✦', {
        fontSize: '18px', color: '#FFD700',
      }).setOrigin(0.5).setAlpha(0).setDepth(7);
      this.tweens.add({ targets: star, alpha: 0.95, delay: 280 + i * 55, duration: 220 });
      stars.push({ obj: star, baseAngle: (i / 8) * Math.PI * 2 });
    }
    let elapsed = 0;
    const starTimer = this.time.addEvent({
      delay: 16, repeat: 200, callback: () => {
        elapsed += 0.022;
        stars.forEach(s => {
          const a = s.baseAngle + elapsed;
          s.obj.setPosition(W / 2 + Math.cos(a) * orbitR, H / 2 + Math.sin(a) * orbitR);
        });
      },
    });

    // ── Glow layers (fake blur) ────────────────────────────────────────────────
    const GLOW_SIZES = [120, 108, 96];
    const GLOW_ALPHA = [0.11, 0.16, 0.22];
    const glows = GLOW_SIZES.map((sz, g) =>
      this.add.text(W / 2, H + 120, 'סופי', {
        fontSize: `${sz}px`, color: '#FFD700',
        fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(8).setAlpha(0)
    );
    glows.forEach((gl, g) => {
      this.tweens.add({
        targets: gl, y: H / 2, alpha: GLOW_ALPHA[g],
        duration: 480, ease: 'Back.easeOut', delay: g * 25,
      });
    });

    // ── Main "סופי" text ──────────────────────────────────────────────────────
    const txt = this.add.text(W / 2, H + 120, 'סופי', {
      fontSize: '96px', color: '#FFD700',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: txt, y: H / 2, alpha: 1,
      duration: 480, ease: 'Back.easeOut',
      onComplete: () => {
        // 3× pulse
        this.tweens.add({
          targets: txt, scaleX: 1.10, scaleY: 1.10,
          duration: 320, yoyo: true, repeat: 2,
          onComplete: () => {
            // Hold, then zoom-explode out
            this.time.delayedCall(1000, () => {
              this.tweens.add({
                targets: [...glows, txt],
                alpha: 0, scaleX: 1.7, scaleY: 1.7,
                duration: 700, ease: 'Expo.easeIn',
                onComplete: () => {
                  starTimer.remove();
                  stars.forEach(s => s.obj.destroy());
                  glows.forEach(gl => gl.destroy());
                  txt.destroy();
                },
              });
            });
          },
        });
      },
    });
  }

  // ─── FINISH ──────────────────────────────────────────────────────────────────

  _finish() {
    if (this._done) return;
    this._done = true;
    this.cameras.main.fade(380, 0, 0, 0);
    this.time.delayedCall(380, () => {
      this.scene.start(window.PAWER_SAVE.hasName() ? 'MenuScene' : 'SetupScene');
    });
  }
}
