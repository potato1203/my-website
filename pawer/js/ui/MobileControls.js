class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.maxRadius = 65;

    this.joystickPointerId = -1;
    this.attackPointerId = -1;

    this.joystickOrigin = { x: 0, y: 0 };
    this.joystickDelta = { x: 0, y: 0 };
    this.attacking = false;
    this.attackJustPressed = false;

    this._create();
  }

  _create() {
    const { width, height } = this.scene.scale;
    const jx = 110, jy = height - 130;

    // Joystick base
    this.baseGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(200).setAlpha(0.45);
    this.drawBase(jx, jy);

    // Joystick thumb
    this.thumbGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(201).setAlpha(0.7);
    this.drawThumb(jx, jy);

    // Attack button
    this.attackGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(200).setAlpha(0.55);
    this.attackTextObj = this.scene.add.text(
      width - 90, height - 130, '⚔️',
      { fontSize: '32px' }
    ).setScrollFactor(0).setDepth(202).setOrigin(0.5);

    this.drawAttackBtn(width - 90, height - 130, false);

    // Pointer events
    this.scene.input.on('pointerdown', this._onDown, this);
    this.scene.input.on('pointermove', this._onMove, this);
    this.scene.input.on('pointerup', this._onUp, this);
    this.scene.input.on('pointerupoutside', this._onUp, this);

    this._jx = jx; this._jy = jy;
    this._atx = width - 90; this._aty = height - 130;
  }

  drawBase(x, y) {
    this.baseGfx.clear();
    this.baseGfx.lineStyle(3, 0xffffff, 1);
    this.baseGfx.strokeCircle(x, y, this.maxRadius);
    this.baseGfx.fillStyle(0xffffff, 0.08);
    this.baseGfx.fillCircle(x, y, this.maxRadius);
  }

  drawThumb(x, y) {
    this.thumbGfx.clear();
    this.thumbGfx.fillStyle(0xffffff, 1);
    this.thumbGfx.fillCircle(x, y, 28);
  }

  drawAttackBtn(x, y, pressed) {
    this.attackGfx.clear();
    const color = pressed ? 0xff8800 : 0xff5500;
    this.attackGfx.fillStyle(color, 1);
    this.attackGfx.fillCircle(x, y, 55);
    this.attackGfx.lineStyle(3, 0xffddaa, 0.8);
    this.attackGfx.strokeCircle(x, y, 55);
  }

  _onDown(pointer) {
    const { width, height } = this.scene.scale;
    // Left half → joystick
    if (pointer.x < width / 2 && this.joystickPointerId === -1) {
      this.joystickPointerId = pointer.id;
      this.joystickOrigin.x = pointer.x;
      this.joystickOrigin.y = pointer.y;
      this._jx = pointer.x;
      this._jy = pointer.y;
      this.drawBase(pointer.x, pointer.y);
      this.drawThumb(pointer.x, pointer.y);
    }
    // Right half → attack
    if (pointer.x >= width / 2 && this.attackPointerId === -1) {
      this.attackPointerId = pointer.id;
      this.attacking = true;
      this.attackJustPressed = true;
      this.drawAttackBtn(this._atx, this._aty, true);
    }
  }

  _onMove(pointer) {
    if (pointer.id !== this.joystickPointerId) return;
    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);
    const tx = this.joystickOrigin.x + Math.cos(angle) * clamped;
    const ty = this.joystickOrigin.y + Math.sin(angle) * clamped;
    this.drawThumb(tx, ty);
    this.joystickDelta.x = (clamped / this.maxRadius) * Math.cos(angle);
    this.joystickDelta.y = (clamped / this.maxRadius) * Math.sin(angle);
  }

  _onUp(pointer) {
    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = -1;
      this.joystickDelta.x = 0;
      this.joystickDelta.y = 0;
      this.drawBase(this._jx, this._jy);
      this.drawThumb(this._jx, this._jy);
    }
    if (pointer.id === this.attackPointerId) {
      this.attackPointerId = -1;
      this.attacking = false;
      this.drawAttackBtn(this._atx, this._aty, false);
    }
  }

  consumeAttack() {
    const v = this.attackJustPressed;
    this.attackJustPressed = false;
    return v;
  }

  getMovement() { return this.joystickDelta; }
  isAttacking() { return this.attacking; }

  resize() {
    const { width, height } = this.scene.scale;
    this._atx = width - 90;
    this._aty = height - 130;
    this.attackTextObj.setPosition(this._atx, this._aty);
    this.drawAttackBtn(this._atx, this._aty, false);
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onDown, this);
    this.scene.input.off('pointermove', this._onMove, this);
    this.scene.input.off('pointerup', this._onUp, this);
    this.scene.input.off('pointerupoutside', this._onUp, this);
    this.baseGfx.destroy();
    this.thumbGfx.destroy();
    this.attackGfx.destroy();
    this.attackTextObj.destroy();
  }
}
