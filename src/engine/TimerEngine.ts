/**
 * TimerEngine — 基于 Date.now() 差值的计时引擎
 *
 * 为什么不用 setInterval 计数？因为 setInterval 在长时间运行后
 * 会累积误差（浏览器 throttle、CPU 繁忙等），30分钟可能漂移数秒。
 * 用绝对时间差值计算，精度无关 interval 频率。
 */
export type TimerCallback = (remaining: number) => void
export type TimerFinishCallback = () => void

export class TimerEngine {
  private startTime: number = 0
  private durationMs: number = 0
  private intervalId: ReturnType<typeof setInterval> | null = null
  private onTick: TimerCallback
  private onFinish: TimerFinishCallback
  private _isRunning: boolean = false

  constructor(onTick: TimerCallback, onFinish: TimerFinishCallback) {
    this.onTick = onTick
    this.onFinish = onFinish
  }

  start(durationMinutes: number) {
    this.durationMs = durationMinutes * 60 * 1000
    this.startTime = Date.now()
    this._isRunning = true

    // 每 200ms 检查一次，比每秒检查更平滑
    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime
      const remaining = Math.max(0, this.durationMs - elapsed)

      this.onTick(remaining)

      if (remaining <= 0) {
        this.stop()
        this.onFinish()
      }
    }, 200)

    // 立即触发一次
    this.onTick(this.durationMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this._isRunning = false
  }

  get isRunning(): boolean {
    return this._isRunning
  }

  /** 获取当前剩余毫秒数 */
  getRemaining(): number {
    if (!this._isRunning) return 0
    return Math.max(0, this.durationMs - (Date.now() - this.startTime))
  }
}
