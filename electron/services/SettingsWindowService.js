import { resolve } from 'node:path'

export class SettingsWindowService {
    constructor({ app, BrowserWindow, rootDirPath, appSettings }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.rootDirPath = rootDirPath
        this.appSettings = appSettings
        this.settingsWindow = undefined
    }

    ensureWindow() {
        if (this.settingsWindow) {
            this.settingsWindow.show()
            this.settingsWindow.focus()
            return
        }

        const windowSettings = this.appSettings?.settingsWindow || {}
        const width = Number(windowSettings.width) || 540
        const height = Number(windowSettings.height) || 520
        const minWidth = Number(windowSettings.minWidth) || 420
        const minHeight = Number(windowSettings.minHeight) || 360

        this.settingsWindow = new this.BrowserWindow({
            width,
            height,
            minWidth,
            minHeight,
            frame: false,
            transparent: true,
            resizable: false,
            roundedCorners: this.appSettings?.window?.useAcrylic ? false : true,
            backgroundColor: '#00000000',
            backgroundMaterial: this.appSettings?.window?.useAcrylic ? 'acrylic' : 'none',
            webPreferences: {
                preload: resolve(this.rootDirPath, 'electron', 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        })

        this.settingsWindow.loadFile(resolve(this.rootDirPath, 'dist', 'index.html'), {
            search: '?view=settings',
        })

        if (this.appSettings?.developer?.enableSettingsDeveloperConsole) {
            this.settingsWindow.webContents.openDevTools({ mode: 'detach' })
        }

        this.settingsWindow.on('closed', () => {
            this.settingsWindow = undefined
        })
    }

    hideWindow() {
        if (!this.settingsWindow) return
        this.settingsWindow.close()
        this.settingsWindow = undefined
    }
}

