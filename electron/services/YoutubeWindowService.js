import { resolve } from 'node:path'
import { readNowPlaying, clickPlayerButton, seekPlayerToFraction } from './YoutubeHandler.js'

export class YoutubeWindowService {
  constructor({ BrowserWindow, BrowserView, appSettings, rootDirPath, youtubeDebloatCss }) {
    this.BrowserWindow = BrowserWindow
    this.BrowserView = BrowserView
    this.appSettings = appSettings
    this.rootDirPath = rootDirPath
    this.youtubeDebloatCss = youtubeDebloatCss
    this.enableYoutubeDeveloperConsole = Boolean(appSettings.developer?.enableYoutubeDeveloperConsole)

    this.youtubeWindow = undefined
    this.youtubeView = undefined
    this.barView = undefined
    this.barHeight = 40
  }

  ensureWindow() {
    if (this.youtubeWindow) {
      this.youtubeWindow.show()
      this.youtubeWindow.focus()
      this.resizeView()
      return
    }

    this.youtubeWindow = new this.BrowserWindow({
      frame: false,
      transparent: true,
      resizable: true,
      roundedCorners: false,
      backgroundColor: '#00000000',
      backgroundMaterial: 'none',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    this.youtubeWindow.maximize()

    this.barView = new this.BrowserView({
      webPreferences: {
        preload: resolve(this.rootDirPath, 'electron', 'youtubeBarPreload.cjs'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    this.youtubeView = new this.BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    this.youtubeWindow.setBrowserView(this.barView)
    this.youtubeWindow.addBrowserView(this.youtubeView)
    this.resizeView()

    this.barView.webContents.loadFile(resolve(this.rootDirPath, 'electron', 'youtubeBar.html'))
    this.youtubeView.webContents.loadURL(this.appSettings.youtubeMusic.url)

    this.youtubeView.webContents.on('dom-ready', () => {
      this.injectDebloatCss()

      // swap "Sign in" label for a leaf
      this.youtubeView.webContents.executeJavaScript(`
        const signInLink = document.querySelector('.sign-in-link')
        if (signInLink) signInLink.innerText = '🍃'
      `).catch(() => {})

      if (this.enableYoutubeDeveloperConsole) this.youtubeView.webContents.openDevTools({ mode: 'detach' })
    })

    this.youtubeWindow.on('closed', () => {
      this.youtubeWindow = undefined
      this.youtubeView = undefined
      this.barView = undefined
    })
  }

  resizeView() {
    if (!this.youtubeWindow || !this.youtubeView || !this.barView) return

    const windowBounds = this.youtubeWindow.getBounds()

    this.barView.setBounds({
      x: 0,
      y: 0,
      width: windowBounds.width,
      height: this.barHeight
    })

    this.youtubeView.setBounds({
      x: 0,
      y: this.barHeight,
      width: windowBounds.width,
      height: windowBounds.height - this.barHeight
    })
  }

  destroyWindow() {
    if (!this.youtubeWindow) return
    this.youtubeWindow.close()
    this.youtubeWindow = undefined
    this.youtubeView = undefined
    this.barView = undefined
  }

  injectDebloatCss() {
    if (!this.youtubeView) return
    if (!this.youtubeDebloatCss) return

    this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss)
  }

  startNowPlayingPolling({ onNowPlaying, onPresence }) {
    const poll = async () => {
      if (!this.youtubeView) return

      try {
        const nowPlaying = await readNowPlaying(this.youtubeView)
        const watchUrl = this.youtubeView.webContents.getURL()

        if (typeof onPresence === 'function') onPresence(nowPlaying, watchUrl)
        if (typeof onNowPlaying === 'function' && nowPlaying) onNowPlaying(nowPlaying)
      } catch {
      }
    }

    setInterval(poll, 2000)
  }

  async clickPlayer(action) {
    if (!this.youtubeView) return
    await clickPlayerButton(this.youtubeView, action)
  }

  async seekToFraction(fraction) {
    if (!this.youtubeView) return
    await seekPlayerToFraction(this.youtubeView, fraction)
  }
}

