// Smooth horizontal camera with a center dead-zone and exponential easing.

export class Camera {
  x = 0
  y = 0
  private viewW = 960
  private deadZone = 130
  private ease = 6.5
  private worldW = 0

  constructor(viewW: number, worldW: number) {
    this.viewW = viewW
    this.worldW = worldW
  }

  /** Instantly place the camera (used on reset/respawn). */
  snap(targetX: number): void {
    this.x = this.clampX(targetX - this.viewW / 2)
  }

  reset(viewW?: number): void {
    if (viewW !== undefined) this.viewW = viewW
    this.x = 0
  }

  /** Returns the view width (used by particle systems). */
  getViewW(): number {
    return this.viewW
  }

  /**
   * Change the view width when the window aspect changes, keeping whatever was
   * in the middle of the screen in the middle, so a resize never jolts the view.
   */
  setViewW(viewW: number): void {
    if (viewW === this.viewW) return
    const center = this.x + this.viewW / 2
    this.viewW = viewW
    this.x = this.clampX(center - viewW / 2)
  }

  /**
   * Move the camera toward targetX. The dead zone keeps the camera still while
   * the target sits inside the central band, preventing micro-jitter; beyond it
   * the camera eases exponentially (frame-rate independent).
   */
  update(dt: number, targetX: number): void {
    const ideal = targetX - this.viewW / 2
    const diff = ideal - this.x
    const dz = this.deadZone
    if (Math.abs(diff) > dz) {
      const beyond = Math.abs(diff) - dz
      const sign = Math.sign(diff)
      const target = this.x + sign * beyond
      this.x += (target - this.x) * (1 - Math.exp(-dt * this.ease))
    }
    this.x = this.clampX(this.x)
  }

  private clampX(v: number): number {
    const max = Math.max(0, this.worldW - this.viewW)
    return Math.max(0, Math.min(max, v))
  }
}
