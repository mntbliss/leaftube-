import { resolve } from 'node:path'
import { Path } from '../constants/path.js'
import { getIconPath, getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'

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

        const isAcrylic = Boolean(this.appSettings?.window?.isAcrylic)
        const preloadPath = resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.PRELOADERS_DIR, Path.PRELOAD_FILENAME)
        const iconPath = getIconPath(this.app, this.rootDirPath)
        this.settingsWindow = new this.BrowserWindow({
            width,
            height,
            minWidth,
            minHeight,
            resizable: false,
            icon: iconPath,
            ...getTransparentFrameOptions(isAcrylic),
            webPreferences: getWebPreferences({ preloadPath }),
        })

        this.settingsWindow.loadFile(resolve(this.rootDirPath, Path.DIST_DIR, Path.INDEX_HTML_FILENAME), {
            search: '?view=settings',
        })

        if (this.appSettings?.developer?.isSettingsDeveloperConsoleEnabled) {
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
