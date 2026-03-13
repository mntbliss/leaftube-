import { resolve } from 'node:path'

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

        const innerWidth = this.appSettings.window?.width ?? 600
        const innerHeight = this.appSettings.window?.height ?? 220
        const padding = Number(this.appSettings.window?.electronPaddingForAnimation) || 10
        const windowWidth = innerWidth + padding * 2
        const windowHeight = innerHeight + padding * 2

        this.mainWindow = new this.BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            minWidth: (this.appSettings.window.minWidth || innerWidth) + padding * 2,
            minHeight: (this.appSettings.window.minHeight || innerHeight) + padding * 2,
            frame: false,
            transparent: true,
            resizable: true,
            roundedCorners: this.useAcrylic ? false : true,
            backgroundColor: '#00000000',
            backgroundMaterial: this.useAcrylic ? 'acrylic' : 'none',
            webPreferences: {
                preload: resolve(this.rootDirPath, 'electron', 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.mainWindow.webContents.setMaxListeners(20)

        const session = this.mainWindow.webContents.session
        session.setPermissionRequestHandler((_webContents, _permission, callback) => {
            callback(false)
        })

        this.mainWindow.loadFile(resolve(this.rootDirPath, 'dist', 'index.html'))

        if (this.enableDeveloperConsole) this.mainWindow.webContents.openDevTools({ mode: 'detach' })

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
