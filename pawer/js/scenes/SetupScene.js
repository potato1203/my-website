class SetupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SetupScene' });
    this._input = null;
  }

  create() {
    const { width: w, height: h } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x55aadd, 0x55aadd, 0x2277bb, 0x2277bb, 1);
    bg.fillRect(0, 0, w, h);

    // Skulls
    for (let i = 0; i < 22; i++) {
      const sk = this.add.text(Math.random() * w, Math.random() * h, '💀',
        { fontSize: (16 + Math.random() * 28) + 'px' }
      ).setOrigin(0.5).setAlpha(0.07 + Math.random() * 0.13);
      this.tweens.add({
        targets: sk, alpha: sk.alpha * 0.15, y: sk.y - 12,
        duration: 1800 + Math.random() * 2000,
        yoyo: true, repeat: -1, delay: Math.random() * 2000,
        ease: 'Sine.easeInOut',
      });
    }

    // Logo
    const logo = this.add.image(w / 2, h * 0.2, 'logo');
    logo.setScale(Math.min(240, w * 0.45) / logo.width);
    this.tweens.add({
      targets: logo, y: h * 0.2 - 6, duration: 1600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Welcome text
    this.add.text(w / 2, h * 0.42, '👋 ברוך הבא ל-PAWER!', {
      fontSize: Math.min(26, w / 18) + 'px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#003366', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.50, 'בחר שם משתמש:', {
      fontSize: '17px', color: '#ddeeff', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // HTML input
    this._input = this._createInput(w, h);

    // Confirm button
    const btn = this.add.text(w / 2, h * 0.72, '✅  התחל לשחק!', {
      fontSize: '24px', color: '#ffffff',
      fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: '#cc4400', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn, scaleX: 1.04, scaleY: 1.04,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Error text (hidden)
    this._errText = this.add.text(w / 2, h * 0.64, '', {
      fontSize: '14px', color: '#ff6666', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#ee5500' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#cc4400' }));
    btn.on('pointerdown', () => this._confirm());

    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirm();
    });

    // Cleanup input on scene shutdown
    this.events.once('shutdown', () => this._removeInput());
    this.events.once('destroy',  () => this._removeInput());

    this.cameras.main.fadeIn(500);
  }

  _createInput(w, h) {
    const canvas = this.game.canvas;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = rect.width  / this.scale.width;
    const scaleY = rect.height / this.scale.height;

    const inputW  = Math.min(260, w * 0.55);
    const inputH  = 46;
    const canvasY = h * 0.58;

    const el = document.createElement('input');
    el.type        = 'text';
    el.maxLength   = 14;
    el.placeholder = window.T('שמך כאן...');
    el.dir         = 'rtl';
    el.autocomplete = 'off';

    Object.assign(el.style, {
      position:    'fixed',
      left:        `${rect.left + (w / 2 - inputW / 2) * scaleX}px`,
      top:         `${rect.top  + canvasY * scaleY}px`,
      width:       `${inputW * scaleX}px`,
      height:      `${inputH * scaleY}px`,
      fontSize:    `${Math.round(20 * scaleY)}px`,
      fontFamily:  'Arial',
      textAlign:   'center',
      border:      `3px solid #8B5A2B`,
      borderRadius:'10px',
      background:  'rgba(8, 22, 50, 0.96)',
      color:       '#ffffff',
      outline:     'none',
      zIndex:      '1000',
      padding:     '0 10px',
      boxShadow:   '0 0 18px #8B5A2B88',
    });

    document.body.appendChild(el);
    setTimeout(() => el.focus(), 100);
    return el;
  }

  _removeInput() {
    if (this._input && document.body.contains(this._input)) {
      document.body.removeChild(this._input);
      this._input = null;
    }
  }

  _confirm() {
    const name = (this._input ? this._input.value : '').trim();
    if (name.length < 2) {
      this._errText.setText('⚠️ השם צריך להיות לפחות 2 תווים');
      this.tweens.add({
        targets: this._errText, x: this.scale.width / 2 + 6,
        duration: 40, yoyo: true, repeat: 5,
        onComplete: () => this._errText.setX(this.scale.width / 2),
      });
      return;
    }
    window.PAWER_SAVE.setName(name);
    this._removeInput();
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('MenuScene'));
  }
}
