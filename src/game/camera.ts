// Smooth horizontal camera with a dead-zone and exponential easing.

/**
 * Where the player sits across the view, as a fraction from the left edge.
 * Pinning the player left of centre is what a side-scrolling runner needs: it
 * throws most of the screen at whatever is coming, so hazards ahead are read
 * early enough to react to. With the player centred, only half the view ahead
 * is visible and fast sections become unreadable.
 */
const PLAYER_ANCHOR = 0.28

/**
 * How far the player may drift from the anchor before the camera starts
 * following, as a fraction of the view width. Scaling it to the view keeps the
 * feel identical on a phone and on a desktop: a fixed pixel dead zone would be
 * a large slice of a narrow phone view and almost none of a wide one, so the
 * player would drift much further off-anchor on the phone.
 */
const DEAD_ZONE_FRAC = 0.05

export class Camera {
  x = 0
  y = 0
  private viewW = 960
  private ease = 6.5
  private worldW = 0

  constructor(viewW: number, worldW: number) {
    this.viewW = viewW
    this.worldW = worldW
  }

  /** Design X that lands on the left edge of the view for a given target. */
  private idealFor(targetX: number): number {
    return targetX - this.viewW * PLAYER_ANCHOR
  }

  /** Dead zone follows the view width so the on-screen drift is consistent. */
  private deadZoneFor(viewW: number): number {
    return viewW * DEAD_ZONE_FRAC
  }

  /** Instantly place the camera (used on reset/respawn). */
  snap(targetX: number): void {
    this.x = this.clampX(this.idealFor(targetX))
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
    const anchorX = this.x + this.viewW * PLAYER_ANCHOR
    this.viewW = viewW
    this.x = this.clampX(this.idealFor(anchorX))
  }

  /**
   * Move the camera toward targetX, which holds the player at PLAYER_ANCHOR
   * across the view. The dead zone keeps the camera still while the player sits
   * inside the central band, preventing micro-jitter; beyond it the camera eases
   * exponentially (frame-rate independent).
   */
  update(dt: number, targetX: number): void {
    const ideal = this.idealFor(targetX)
    const diff = ideal - this.x
    const dz = this.deadZoneFor(this.viewW)
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
