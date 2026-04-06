import { useState, useCallback, useRef, useEffect } from 'react'
import './types'
import { TimerEngine } from './engine/TimerEngine'
import { generateFeedback } from './engine/LLMFeedback'

type AppPhase = 'input' | 'running' | 'evaluate' | 'feedback' | 'settings'

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('input')
  const [taskName, setTaskName] = useState('')
  const [duration, setDuration] = useState(30)
  const [remaining, setRemaining] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  // 设置
  const [vaultPath, setVaultPath] = useState('')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [llmBaseUrl, setLlmBaseUrl] = useState('https://api.openai.com/v1')

  const timerRef = useRef<TimerEngine | null>(null)
  const taskNameRef = useRef('')

  useEffect(() => {
    window.draftzero?.getSettings().then((s) => {
      if (s.vaultPath) setVaultPath(s.vaultPath)
      if (s.llmApiKey) setLlmApiKey(s.llmApiKey)
      if (s.llmBaseUrl) setLlmBaseUrl(s.llmBaseUrl)
    })
  }, [])

  // 鼠标悬停追踪 — 告诉主进程鼠标在不在窗口内
  useEffect(() => {
    const onEnter = () => window.draftzero?.mouseEnterWindow()
    const onLeave = () => window.draftzero?.mouseLeaveWindow()
    document.addEventListener('mouseenter', onEnter)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      document.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const handleStart = useCallback(() => {
    if (!taskName.trim()) return
    taskNameRef.current = taskName.trim()
    // 开始计时后锁定窗口，不会因鼠标移出而收回
    window.draftzero?.pinWindow()

    const engine = new TimerEngine(
      (rem) => setRemaining(rem),
      () => {
        setPhase('evaluate')
      }
    )

    timerRef.current = engine
    engine.start(duration)
    setPhase('running')
  }, [taskName, duration])

  const handleEvaluate = useCallback(async (didComplete: boolean) => {
    setCompleted(didComplete)
    setFeedbackLoading(true)
    setPhase('feedback')

    const result = await generateFeedback(
      taskNameRef.current,
      didComplete,
      llmApiKey,
      llmBaseUrl
    )
    setFeedbackText(result.text)
    setFeedbackLoading(false)

    if (didComplete) {
      window.draftzero?.showVFX()
    }

    if (vaultPath) {
      window.draftzero?.writeAchievement({
        taskName: taskNameRef.current,
        duration,
        completed: didComplete,
        feedback: result.text,
        vaultPath,
      })
    }
  }, [llmApiKey, llmBaseUrl, vaultPath, duration])

  const handleReset = useCallback(() => {
    setPhase('input')
    setTaskName('')
    setRemaining(0)
    setFeedbackText('')
    timerRef.current = null
    // 任务结束，解锁窗口，恢复悬停自动收回
    window.draftzero?.unpinWindow()
  }, [])

  const handleSaveSettings = useCallback(async () => {
    await window.draftzero?.saveSettings({ vaultPath, llmApiKey, llmBaseUrl })
    setPhase('input')
  }, [vaultPath, llmApiKey, llmBaseUrl])

  const handleSubmitEarly = useCallback(() => {
    timerRef.current?.stop()
    setPhase('evaluate')
  }, [])

  const progress = duration > 0 ? 1 - remaining / (duration * 60 * 1000) : 0
  const circumference = 2 * Math.PI * 45

  return (
    <div className="app-container">
      {/* 背景点阵 */}
      <div className="bg-dots" />

      {/* ====== 标题栏 ====== */}
      <div className="drag-region" style={{ justifyContent: 'flex-end' }}>
        <button
          className="settings-btn"
          onClick={() => setPhase(phase === 'settings' ? 'input' : 'settings')}
          title="设置"
        >
          <span className="material-symbols-outlined">
            {phase === 'settings' ? 'close' : 'settings'}
          </span>
        </button>
      </div>

      {/* ====== 输入阶段 ====== */}
      {phase === 'input' && (
        <div className="phase-content fade-in">
          <div style={{ marginTop: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <input
                className="task-input"
                type="text"
                placeholder="捕捉灵感..."
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                onFocus={() => window.draftzero?.pinWindow()}
                autoFocus
              />
              {/* 手绘波浪下划线 */}
              <svg className="sketchy-underline" preserveAspectRatio="none" viewBox="0 0 100 10">
                <path d="M0,5 Q25,2 50,5 T100,5" />
              </svg>
            </div>
          </div>

          <div className="duration-section">
            <span className="label-meta">Time Block (mins)</span>
            <div className="duration-options">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  className={`duration-btn ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {duration === d && <div className="highlighter" />}
                  <div className="frame" />
                  <span>{d}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="start-btn"
            onClick={handleStart}
            disabled={!taskName.trim()}
          >
            <div className="start-btn-bg" />
            <span className="start-btn-label">
              🚀 <span style={{ paddingTop: 2 }}>开始冲刺</span>
            </span>
          </button>
        </div>
      )}

      {/* ====== 倒计时运行中 ====== */}
      {phase === 'running' && (
        <div className="phase-content fade-in">
          <div className="timer-section">
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              padding: '0 20px',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontFamily: 'var(--font-hand)',
                fontSize: '32px',
                lineHeight: '1.2',
                color: 'var(--on-surface)',
                wordBreak: 'break-word',
                marginBottom: '16px'
              }}>
                {taskNameRef.current}
              </h2>
              
              <div style={{ transform: 'scale(0.8)' }}>
                <span className="timer-digits" style={{ display: 'block' }}>{formatTime(remaining)}</span>
              </div>
            </div>

            {/* 提前交稿 */}
            <button className="submit-early-btn" onClick={handleSubmitEarly}>
              <div className="early-btn-highlight" />
              <div className="early-btn-frame">
                <span className="material-symbols-outlined">bolt</span>
                <span className="early-btn-label">提前交稿</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ====== 评估阶段 ====== */}
      {phase === 'evaluate' && (
        <div className="phase-content fade-in">
          <div className="evaluate-section">
            <h2 className="evaluate-title">完成了吗？</h2>
            <div className="evaluate-underline" />

            <div className="evaluate-buttons">
              <button className="eval-btn eval-yes" onClick={() => handleEvaluate(true)}>
                <div className="eval-highlight" />
                <div className="eval-icon-box">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="eval-btn-text">是的</span>
              </button>

              <button className="eval-btn eval-no" onClick={() => handleEvaluate(false)}>
                <div className="eval-highlight" />
                <div className="eval-icon-box">
                  <span className="material-symbols-outlined">close</span>
                </div>
                <span className="eval-btn-text">没完</span>
              </button>
            </div>

            {/* 手绘表情 */}
            <div className="mood-face">
              <div className="mood-glow" />
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" viewBox="0 0 100 100">
                <path d="M20,50 Q20,20 50,20 Q80,20 80,50 Q80,80 50,80 Q20,80 20,50" />
                <circle cx="35" cy="45" r="3" fill="currentColor" />
                <circle cx="65" cy="45" r="3" fill="currentColor" />
                <path d="M40,65 Q50,60 60,65" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ====== 反馈阶段 ====== */}
      {phase === 'feedback' && (
        <div className="phase-content fade-in">
          <div className="feedback-section">
            <div className="feedback-icon">
              {completed ? '🏆' : '💀'}
            </div>

            <p className="feedback-text">
              {feedbackLoading ? '...' : feedbackText}
            </p>

            <span className="feedback-meta">
              {completed ? 'DRAFT SUBMITTED' : 'MISSED DEADLINE'}
            </span>

            <button className="reset-btn" onClick={handleReset}>
              <div className="reset-btn-bg" />
              <span className="reset-btn-frame">继续下一轮 →</span>
            </button>
          </div>
        </div>
      )}

      {/* ====== 设置页 ====== */}
      {phase === 'settings' && (
        <div className="phase-content fade-in">
          <div className="settings-section">
            <label className="settings-label">Obsidian Vault Path</label>
            <input
              className="settings-input"
              type="text"
              placeholder="/Users/你/Documents/MyVault"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
            />

            <label className="settings-label" style={{ marginTop: 20 }}>LLM API Key (Optional)</label>
            <input
              className="settings-input"
              type="password"
              placeholder="sk-..."
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
            />

            <label className="settings-label" style={{ marginTop: 20 }}>LLM Base URL</label>
            <input
              className="settings-input"
              type="text"
              placeholder="https://api.openai.com/v1"
              value={llmBaseUrl}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
            />

            <button className="start-btn" onClick={handleSaveSettings} style={{ marginTop: 28 }}>
              <div className="start-btn-bg" />
              <span className="start-btn-label">保存设置</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
