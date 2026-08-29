export class Input {
  private held = new Set<string>();
  private injected: Set<string> | null = null;
  stickX = 0;
  stickY = 0;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onBlur: () => void;
  pausePressed = false;
  pick: number | null = null;

  constructor() {
    this.onKeyDown = (e) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (e.repeat) return;
      this.held.add(e.code);
      if (e.code === "Escape") this.pausePressed = true;
      if (e.code === "Digit1" || e.code === "Numpad1") this.pick = 0;
      if (e.code === "Digit2" || e.code === "Numpad2") this.pick = 1;
      if (e.code === "Digit3" || e.code === "Numpad3") this.pick = 2;
      if (
        e.code.startsWith("Arrow") ||
        e.code === "Space" ||
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD"
      ) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e) => {
      this.held.delete(e.code);
    };
    this.onBlur = () => {
      this.held.clear();
      this.stickX = 0;
      this.stickY = 0;
    };
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
  }

  hasInjected() {
    return this.injected !== null;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  clearInjected() {
    this.injected = null;
  }

  setStick(x: number, y: number) {
    const len = Math.hypot(x, y);
    if (len < 0.18) {
      this.stickX = 0;
      this.stickY = 0;
      return;
    }
    const s = Math.min(1, len);
    this.stickX = (x / len) * s;
    this.stickY = (y / len) * s;
  }

  private has(code: string) {
    return (this.injected ?? this.held).has(code);
  }

  move(): { x: number; y: number } {
    let x = this.stickX;
    let y = this.stickY;
    if (this.has("KeyA") || this.has("ArrowLeft")) x -= 1;
    if (this.has("KeyD") || this.has("ArrowRight")) x += 1;
    if (this.has("KeyW") || this.has("ArrowUp")) y -= 1;
    if (this.has("KeyS") || this.has("ArrowDown")) y += 1;
    const len = Math.hypot(x, y);
    if (len < 0.01) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  consumePick() {
    const v = this.pick;
    this.pick = null;
    return v;
  }
}
