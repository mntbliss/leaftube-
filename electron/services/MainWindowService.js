import { resolve } from 'node:path'
import * as LoggerService from '../../src/services/LoggerService.js'

export class MainWindowService {
  constructor({ app, BrowserWindow, session, appSettings, rootDirPath, useAcrylic, enableDeveloperConsole }) {
    this.app = app
    this.BrowserWindow = BrowserWindow
    this.session = session
    this.appSettings = appSettings
    this.rootDirPath = rootDirPath
    this.useAcrylic = useAcrylic
    this.enableDeveloperConsole = enableDeveloperConsole

    this.mainWindow = undefined
  }

  createMainWindow() {
    if (this.mainWindow) return

    const windowWidth = this.appSettings.window?.width ?? 600
    const windowHeight = this.appSettings.window?.height ?? 220

    this.mainWindow = new this.BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: this.appSettings.window.minWidth,
      minHeight: this.appSettings.window.minHeight,
      frame: false,
      transparent: true,
      resizable: true,
      roundedCorners: this.useAcrylic ? false : true,
      backgroundColor: '#00000000',
      backgroundMaterial: this.useAcrylic ? 'acrylic' : 'none',
      webPreferences: {
        preload: resolve(this.rootDirPath, 'electron', 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    const session = this.mainWindow.webContents.session

    const adBlockExtensionPath = this.appSettings.youtubeMusic?.adBlockExtensionPath
    if (adBlockExtensionPath && typeof session.loadExtension === 'function') {
      const absoluteExtensionPath = resolve(this.rootDirPath, adBlockExtensionPath)
      session
        .loadExtension(absoluteExtensionPath)
        .catch(() => {
          LoggerService.log('[MainWindowService] failed to load ad-block extension from', absoluteExtensionPath)
        })
    }

    session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false)
    })

    this.mainWindow.loadFile(resolve(this.rootDirPath, 'dist', 'index.html'))

    if (!this.app.isPackaged || this.enableDeveloperConsole) this.mainWindow.webContents.openDevTools({ mode: 'detach' })

    this.mainWindow.on('closed', () => {
      this.mainWindow = undefined
    })
  }

  getMainWindow() {
    return this.mainWindow
  }

  sendNowPlaying(nowPlaying) {
    if (!this.mainWindow || !nowPlaying) return
    this.mainWindow.webContents.send('player:now-playing', nowPlaying)
  }

  hideWindow() {
    if (!this.mainWindow) return
    this.mainWindow.hide()
  }

  showWindow() {
    if (!this.mainWindow) return
    this.mainWindow.show()
    this.mainWindow.focus()
  }
}

