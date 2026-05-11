class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    const { width, height } = this.cameras.main;

    // Show logo while loading
    this.add.image(width / 2, height / 2 - 60, '__DEFAULT').setVisible(false);
    const logoTmp = this.add.text(width / 2, height / 2 - 60, '🔥 PAWER', {
      fontSize: '48px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#ff8800', strokeThickness: 4,
    }).setOrigin(0.5);

    const bar = this.add.graphics();
    const barBg = this.add.graphics();
    barBg.fillStyle(0x222244, 0.9);
    barBg.fillRoundedRect(width / 2 - 155, height / 2 + 10, 310, 24, 12);

    this.load.on('progress', (v) => {
      bar.clear();
      bar.fillStyle(0xff8800, 1);
      bar.fillRoundedRect(width / 2 - 153, height / 2 + 12, 306 * v, 20, 10);
    });

    // Load real assets
    this.load.image('logo', 'assets/logo.png');
    this.load.image('nix', 'assets/nix.png');
    this.load.image('fik',  'assets/pik.png');
    this.load.image('bigo', 'assets/bigo.png');
    this.load.image('dim',  'assets/dim.png');
    this.load.image('coch',  'assets/coch.png');
    this.load.image('priti',  'assets/priti.png');
    this.load.image('sliper', 'assets/sliper.png?v=1');
    this.load.image('bow',    'assets/bow.png');
  }

  create() {
    this._makeFloor();
    this._makeWall();
    this._makeBots();
    this._makeBullet();
    this.scene.start(window.PAWER_SAVE.hasName() ? 'MenuScene' : 'SetupScene');
  }

  _makeFloor() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2a5a2e); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x255228, 0.5); g.fillRect(4, 4, 56, 56);
    g.lineStyle(1, 0x1e4422, 0.6); g.strokeRect(0, 0, 64, 64);
    // Grass detail
    g.fillStyle(0x2f6232, 0.4);
    g.fillRect(8, 10, 14, 3); g.fillRect(38, 28, 18, 3);
    g.fillRect(12, 48, 10, 3); g.fillRect(44, 52, 12, 3);
    g.generateTexture('floor', 64, 64); g.destroy();
  }

  _makeWall() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a3a55); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x2e2e46); g.fillRect(0, 32, 64, 32);
    g.lineStyle(2, 0x5555aa, 0.5); g.strokeRect(0, 0, 64, 64);
    g.lineStyle(1, 0x4444aa, 0.3); g.lineBetween(0, 32, 64, 32);
    // Stone texture
    g.fillStyle(0x444466, 0.4);
    g.fillRect(4, 4, 26, 12); g.fillRect(34, 4, 26, 12);
    g.fillRect(4, 20, 56, 8); g.fillRect(4, 36, 26, 12); g.fillRect(34, 36, 26, 12);
    g.generateTexture('wall', 64, 64); g.destroy();
  }

  _makeBots() {
    this._makeBotTex('bot1', 0xaa2222, 0xcc3333, 0xff6666, '🗡');  // Red
    this._makeBotTex('bot2', 0x662299, 0x8833bb, 0xbb66ff, '🔮'); // Purple
    this._makeBotTex('bot3', 0x1144aa, 0x2255cc, 0x4488ff, '⚡'); // Blue
  }

  _makeBotTex(key, bodyCol, headCol, glowCol) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = 32, cy = 32;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, cy + 18, 36, 10);

    // Legs (darker shade of body color)
    const r = ((bodyCol >> 16) & 0xff) * 0.6 | 0;
    const gg2 = ((bodyCol >> 8) & 0xff) * 0.6 | 0;
    const b2 = (bodyCol & 0xff) * 0.6 | 0;
    g.fillStyle((r << 16) | (gg2 << 8) | b2);
    g.fillRoundedRect(cx - 10, cy + 8, 8, 18, 3);
    g.fillRoundedRect(cx + 2, cy + 8, 8, 18, 3);

    // Body
    g.fillStyle(bodyCol);
    g.fillRoundedRect(cx - 14, cy - 4, 28, 16, 5);

    // Head
    g.fillStyle(headCol);
    g.fillCircle(cx, cy - 14, 13);

    // Glow eyes
    g.fillStyle(glowCol);
    g.fillCircle(cx - 5, cy - 14, 4);
    g.fillCircle(cx + 5, cy - 14, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(cx - 5, cy - 14, 2);
    g.fillCircle(cx + 5, cy - 14, 2);

    // Weapon stub
    g.fillStyle(0xdddddd);
    g.fillRect(cx + 14, cy - 14, 3, 22);
    g.fillStyle(0xcc8800);
    g.fillRect(cx + 11, cy + 6, 9, 4);

    g.generateTexture(key, 64, 64); g.destroy();
  }

  _makeBullet() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffdd00);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(6, 6, 3);
    g.generateTexture('bullet', 16, 16); g.destroy();
  }
}
