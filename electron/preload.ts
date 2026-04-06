import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('draftzero', {
  showVFX: () => ipcRenderer.invoke('show-vfx'),
  vfxDone: () => ipcRenderer.invoke('vfx-done'),
  writeAchievement: (data: {
    taskName: string
    duration: number
    completed: boolean
    feedback: string
    vaultPath: string
  }) => ipcRenderer.invoke('write-achievement', data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, string>) =>
    ipcRenderer.invoke('save-settings', settings),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  // 鼠标悬停跟踪 — 让主进程知道鼠标是否在窗口内
  mouseEnterWindow: () => ipcRenderer.invoke('mouse-enter-window'),
  mouseLeaveWindow: () => ipcRenderer.invoke('mouse-leave-window'),
  // 锁定窗口 — 用户开始交互后不自动收回
  pinWindow: () => ipcRenderer.invoke('pin-window'),
  unpinWindow: () => ipcRenderer.invoke('unpin-window'),
  // 倒计时结束通知
  timerDone: () => ipcRenderer.invoke('timer-done'),
})
