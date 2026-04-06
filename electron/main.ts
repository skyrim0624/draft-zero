import { app, BrowserWindow, Tray, ipcMain, screen, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let vfxWindow: BrowserWindow | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let mouseInWindow = false   // renderer 报告鼠标在窗口内
let windowPinned = false    // 用户主动交互过（输入、点击），在任务完成前不自动隐藏

const isDev = !app.isPackaged

function createTrayIcon(): Electron.NativeImage {
  const iconPath = isDev 
    ? path.join(__dirname, '..', 'public', 'icon.png')
    : path.join(__dirname, '..', 'dist', 'icon.png')
  
  let image = nativeImage.createFromPath(iconPath)
  // Scale down to max 22px for mac tray area nicely
  image = image.resize({ width: 22, height: 22 })
  return image
}

// ====== 悬停自动展开/收回 ======
// 核心原则：宁可多停留，也不要在用户操作时突然消失。
// 只有在鼠标既不在 tray 上、也不在窗口内、且窗口没被锁定时才收回。
const HIDE_DELAY_MS = 800

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    // 安全检查：鼠标还在窗口里 或 窗口被锁定 → 不收
    if (mouseInWindow || windowPinned) {
      hideTimer = null
      return
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.hide()
    }
    hideTimer = null
  }, HIDE_DELAY_MS)
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#f9f9f9',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // 不再用 blur 自动隐藏，改由鼠标悬停驱动
}

function showMainWindow() {
  if (!mainWindow) return

  if (tray) {
    const trayBounds = tray.getBounds()
    const windowBounds = mainWindow.getBounds()
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
    const y = Math.round(trayBounds.y + trayBounds.height + 4)
    mainWindow.setPosition(x, y, false)
  }

  mainWindow.show()
  mainWindow.focus()
}

function createVFXWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  vfxWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    // 让覆盖层忽略鼠标事件，用户可以继续操作底层应用
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    vfxWindow.loadFile(path.join(__dirname, '..', 'electron', 'vfx-overlay.html'))
  } else {
    vfxWindow.loadFile(path.join(__dirname, 'vfx-overlay.html'))
  }
}

// ====== IPC Handlers ======

ipcMain.handle('show-vfx', async () => {
  if (vfxWindow && !vfxWindow.isDestroyed()) {
    vfxWindow.destroy()
  }
  createVFXWindow()
  vfxWindow!.show()
})

ipcMain.handle('vfx-done', async () => {
  if (vfxWindow && !vfxWindow.isDestroyed()) {
    vfxWindow.destroy()
    vfxWindow = null
  }
})

// 鼠标悬停管理 — renderer 通过 IPC 报告鼠标进出
ipcMain.handle('mouse-enter-window', () => {
  mouseInWindow = true
  cancelHide()
})

ipcMain.handle('mouse-leave-window', () => {
  mouseInWindow = false
  if (!windowPinned) {
    scheduleHide()
  }
})

// 当用户开始交互（聚焦输入框、开始计时等），锁定窗口
ipcMain.handle('pin-window', () => {
  windowPinned = true
  cancelHide()
})

ipcMain.handle('unpin-window', () => {
  windowPinned = false
})

ipcMain.handle('write-achievement', async (_event, data: {
  taskName: string
  duration: number
  completed: boolean
  feedback: string
  vaultPath: string
}) => {
  const filePath = path.join(data.vaultPath, 'DraftZero.md')
  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
  const emoji = data.completed ? '✅' : '⚡'
  const status = data.completed ? '击碎拖延' : '尝试了但未达成'
  const line = `- ${emoji} ${dateStr} | ${status}：**${data.taskName}** (${data.duration}分钟)\n  > ${data.feedback}\n\n`

  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `# 🏆 Draft Zero 成就墙\n\n${line}`, 'utf-8')
    } else {
      fs.appendFileSync(filePath, line, 'utf-8')
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

const settingsPath = path.join(app.getPath('userData'), 'settings.json')

ipcMain.handle('get-settings', async () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch {}
  return { vaultPath: '', llmApiKey: '', llmBaseUrl: 'https://api.openai.com/v1' }
})

ipcMain.handle('save-settings', async (_event, settings: Record<string, string>) => {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  return { success: true }
})

ipcMain.handle('hide-window', () => {
  mainWindow?.hide()
})

ipcMain.handle('show-window', () => {
  showMainWindow()
})

// ====== App Lifecycle ======

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = isDev 
      ? path.join(__dirname, '..', 'public', 'icon.png')
      : path.join(__dirname, '..', 'dist', 'icon.png')
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }

  const trayIcon = createTrayIcon()

  tray = new Tray(trayIcon)
  tray.setToolTip('Draft Zero — 零号草稿')

  // 鼠标悬停展开 — 跟 Floating Todo 一致的交互
  tray.on('mouse-enter', () => {
    cancelHide()
    showMainWindow()
  })

  tray.on('mouse-leave', () => {
    scheduleHide()
  })

  // 保留点击作为备选：双重触发更稳
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      cancelHide()
      showMainWindow()
    }
  })

  createMainWindow()
})

app.on('window-all-closed', () => {
  // 菜单栏应用不应该在关闭窗口时退出
})
