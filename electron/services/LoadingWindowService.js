import { resolve } from 'node:path'
import { getIconPath } from '../helpers/window-helpers.js'

export class LoadingWindowService {
    constructor({ app, BrowserWindow, rootDirPath }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.rootDirPath = rootDirPath
        this.loadingWindow = undefined
        this.activeLoadingReasons = new Set()
    }

    beginLoading(loadingReason, _loadingMessageText = 'Loading...') {
        const normalizedReason = String(loadingReason || '').trim()
        if (!normalizedReason) return
        this.activeLoadingReasons.add(normalizedReason)
        this.ensureWindow()
        this.updateHtml()
        this.showWindow()
    }

    endLoading(loadingReason) {
        const normalizedReason = String(loadingReason || '').trim()
        if (!normalizedReason) return
        this.activeLoadingReasons.delete(normalizedReason)
        if (this.activeLoadingReasons.size === 0) this.hideWindow()
    }

    ensureWindow() {
        if (this.loadingWindow && !this.loadingWindow.isDestroyed()) return

        this.loadingWindow = new this.BrowserWindow({
            width: 256,
            height: 256,
            resizable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            movable: false,
            show: false,
            center: true,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            icon: getIconPath(this.app, this.rootDirPath),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
            },
        })

        this.loadingWindow.on('closed', () => {
            this.loadingWindow = undefined
        })
    }

    updateHtml() {
        if (!this.loadingWindow || this.loadingWindow.isDestroyed()) return
        const loadingWindowHtmlPath = resolve(this.rootDirPath, 'electron', 'injections', 'loading-window.html')
        this.loadingWindow.loadFile(loadingWindowHtmlPath).catch(() => {})
    }

    showWindow() {
        if (!this.loadingWindow || this.loadingWindow.isDestroyed()) return
        if (!this.loadingWindow.isVisible()) this.loadingWindow.show()
        this.loadingWindow.focus()
    }

    hideWindow() {
        if (!this.loadingWindow || this.loadingWindow.isDestroyed()) return
        this.loadingWindow.hide()
    }
}
