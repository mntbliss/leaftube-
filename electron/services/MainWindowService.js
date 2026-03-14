import { resolve } from 'node:path'
import { getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'

export class MainWindowService {
    constructor({ app, BrowserWindow, session, appSettings, rootDirPath, isAcrylic, isDeveloperConsoleEnabled }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.session = session
        this.appSettings = appSettings
        this.rootDirPath = rootDirPath
        this.isAcrylic = isAcrylic
        this.isDeveloperConsoleEnabled = isDeveloperConsoleEnabled

        this.mainWindow = undefined
    }

    createMainWindow() {
        if (this.mainWindow) return

        const innerWidth = this.appSettings.window?.width ?? 600
        const innerHeight = this.appSettings.window?.height ?? 220
        const padding = Number(this.appSettings.window?.electronPaddingForAnimation) || 10
        const windowWidth = innerWidth + padding * 2
        const windowHeight = innerHeight + padding * 2

        const preloadPath = resolve(this.rootDirPath, 'electron', 'preload.cjs')
        this.mainWindow = new this.BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            minWidth: (this.appSettings.window.minWidth || innerWidth) + padding * 2,
            minHeight: (this.appSettings.window.minHeight || innerHeight) + padding * 2,
            resizable: true,
            ...getTransparentFrameOptions(this.isAcrylic),
            webPreferences: getWebPreferences({ preloadPath }),
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.mainWindow.webContents.setMaxListeners(20)

        const session = this.mainWindow.webContents.session
        session.setPermissionRequestHandler((_webContents, _permission, callback) => {
            callback(false)
        })

        this.mainWindow.loadFile(resolve(this.rootDirPath, 'dist', 'index.html'))

        if (this.isDeveloperConsoleEnabled) this.mainWindow.webContents.openDevTools({ mode: 'detach' })

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
        try {
            this.mainWindow.webContents.send('ui:mini-pop')
        } catch {
            // ignore if renderer is a crybaby
        }
    }
}
