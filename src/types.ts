// 类型声明：通过 preload 暴露到 window 上的 API
export interface DraftZeroAPI {
  showVFX: () => Promise<void>
  vfxDone: () => Promise<void>
  writeAchievement: (data: {
    taskName: string
    duration: number
    completed: boolean
    feedback: string
    vaultPath: string
  }) => Promise<{ success: boolean; error?: string }>
  getSettings: () => Promise<{
    vaultPath: string
    llmApiKey: string
    llmBaseUrl: string
  }>
  saveSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>
  hideWindow: () => Promise<void>
  showWindow: () => Promise<void>
  mouseEnterWindow: () => Promise<void>
  mouseLeaveWindow: () => Promise<void>
  pinWindow: () => Promise<void>
  unpinWindow: () => Promise<void>
  timerDone: () => Promise<void>
}

declare global {
  interface Window {
    draftzero: DraftZeroAPI
  }
}

export {}
