import { resolve, dirname } from 'node:path'
import { IpcChannel } from '../constants/ipc-channels.js'
import { Path } from '../constants/path.js'
import { getIconPath, getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'
import * as LogBufferService from './LogBufferService.js'

export class MainWindowService {
    constructor({ app, BrowserWindow, appSettings, rootDirPath, isAcrylic, isDeveloperConsoleEnabled }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.appSettings = appSettings
        this.rootDirPath = rootDirPath
        this.isAcrylic = isAcrylic
        this.isDeveloperConsoleEnabled = isDeveloperConsoleEnabled

        this.mainWindow = undefined
        this.closeToTrayCallback = null
        this.hasOpenedDeveloperTools = false
        const pinnedSetting = appSettings?.window?.isPinned
        this.isPinned = pinnedSetting === undefined ? true : Boolean(pinnedSetting)
    }

    setCloseToTrayCallback(callback) {
        this.closeToTrayCallback = callback
    }

    createMainWindow() {
        if (this.mainWindow) return

        const innerWidth = this.appSettings.window?.width ?? 600
        const innerHeight = this.appSettings.window?.height ?? 220
        const padding = Number(this.appSettings.window?.electronPaddingForAnimation) || 10
        const windowWidth = innerWidth + padding * 2
        const windowHeight = innerHeight + padding * 2

        const preloadPath = resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.PRELOADERS_DIR, Path.PRELOAD_FILENAME)
        const iconPath = getIconPath(this.app, this.rootDirPath)
        this.mainWindow = new this.BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            minWidth: (this.appSettings.window.minWidth || innerWidth) + padding * 2,
            minHeight: (this.appSettings.window.minHeight || innerHeight) + padding * 2,
            resizable: true,
            icon: iconPath,
            ...getTransparentFrameOptions(this.isAcrylic),
            webPreferences: getWebPreferences({ preloadPath }),
            alwaysOnTop: this.isPinned,
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.mainWindow.webContents.setMaxListeners(50)

        // Helps debug “window stays transparent/empty” cases on specific PCs
        this.mainWindow.webContents.on('did-start-loading', () => {
            try {
                LogBufferService.addError(new Error('[MainWindow] did-start-loading'))
            } catch {}
        })

        this.mainWindow.webContents.on('did-finish-load', () => {
            try {
                LogBufferService.addError(new Error('[MainWindow] did-finish-load'))
            } catch {}
        })

        this.mainWindow.webContents.on('dom-ready', () => {
            try {
                LogBufferService.addError(new Error('[MainWindow] dom-ready'))
            } catch {}
        })

        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            try {
                // Also prints to devtools/console for faster triage
                console.log('[MainWindow] did-fail-load', errorCode, errorDescription)
                LogBufferService.addError(new Error(
                    `[MainWindow] did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}`
                ))
                try {
                    const appDir = this.app.isPackaged ? dirname(this.app.getPath('exe')) : this.app.getAppPath()
                    LogBufferService.saveToFile(appDir)
                } catch {}
            } catch {
                // ignore logger failures
            }
        })

        // These events often explain “blank/transparent” states
        this.mainWindow.webContents.on('render-process-gone', (event, details) => {
            try {
                const reason = details?.reason ?? 'unknown'
                LogBufferService.addError(new Error(`[MainWindow] render-process-gone: reason=${reason}`))
            } catch {
                // ignore logger failures
            }
        })

        this.mainWindow.webContents.on('crashed', (event) => {
            try {
                LogBufferService.addError(new Error('[MainWindow] webContents crashed'))
                try {
                    const appDir = this.app.isPackaged ? dirname(this.app.getPath('exe')) : this.app.getAppPath()
                    LogBufferService.saveToFile(appDir)
                } catch {}
            } catch {
                // ignore logger failures
            }
        })

        this.mainWindow.webContents.on('unresponsive', (event) => {
            try {
                LogBufferService.addError(new Error('[MainWindow] webContents became unresponsive'))
                try {
                    const appDir = this.app.isPackaged ? dirname(this.app.getPath('exe')) : this.app.getAppPath()
                    LogBufferService.saveToFile(appDir)
                } catch {}
            } catch {
                // ignore logger failures
            }
        })

        this.mainWindow.webContents.on('console-message', (_event, params) => {
            try {
                const lvlStr = String(params?.level || '').toLowerCase()
                const msg = params?.message
                const ln = params?.line
                const src = params?.sourceId
                if (lvlStr.includes('error')) {
                    LogBufferService.addError(new Error(
                        `[MainWindow] console.error: ${String(msg)} (${src}:${ln})`
                    ))
                }
            } catch {
                // ignore logger failures
            }
        })

        const session = this.mainWindow.webContents.session
        session.setPermissionRequestHandler((_webContents, _permission, callback) => {
            callback(false)
        })

        // When packaged, prefer Electron's app path (portable vs installer layouts differ).
        const rendererBaseDir = this.app?.isPackaged ? this.app.getAppPath?.() : this.rootDirPath
        const rendererIndexPath = resolve(rendererBaseDir || this.rootDirPath, Path.DIST_DIR, Path.INDEX_HTML_FILENAME)
        this.mainWindow.loadFile(rendererIndexPath)

        this.mainWindow.on('close', (event) => {
            if (this.app.leafQuitting) return
            if (this.closeToTrayCallback) {
                event.preventDefault()
                this.closeToTrayCallback()
            }
        })
        this.mainWindow.on('show', () => {
            this.openDeveloperToolsIfEnabled()
        })
        this.mainWindow.on('closed', () => {
            this.mainWindow = undefined
            this.hasOpenedDeveloperTools = false
        })

        this.applyPinnedState()
    }

    getMainWindow() {
        return this.mainWindow
    }

    sendNowPlaying(nowPlaying) {
        if (!this.mainWindow || !nowPlaying) return
        this.mainWindow.webContents.send(IpcChannel.PLAYER_NOW_PLAYING, nowPlaying)
    }

    hideWindow() {
        if (!this.mainWindow) return
        this.mainWindow.hide()
    }

    showWindow() {
        if (!this.mainWindow) return
        this.openDeveloperToolsIfEnabled()
        this.mainWindow.show()
        this.mainWindow.focus()
        try {
            this.mainWindow.webContents.send(IpcChannel.UI_MINI_POP)
        } catch {
            // ignore if renderer is a crybaby
        }
    }

    openDeveloperToolsIfEnabled() {
        if (!this.mainWindow) return
        if (!this.isDeveloperConsoleEnabled) return
        if (this.hasOpenedDeveloperTools) return
        try {
            this.mainWindow.webContents.openDevTools({ mode: 'detach' })
            this.hasOpenedDeveloperTools = true
        } catch {}
    }

    waitForFirstRendererLoad(timeoutMs = 15000) {
        return new Promise(resolve => {
            if (!this.mainWindow || this.mainWindow.isDestroyed()) {
                resolve(false)
                return
            }
            const webContents = this.mainWindow.webContents
            if (!webContents || webContents.isDestroyed()) {
                resolve(false)
                return
            }
            if (!webContents.isLoadingMainFrame()) {
                resolve(true)
                return
            }

            let finished = false
            const timeoutHandle = setTimeout(() => {
                done(false)
            }, Math.max(500, Number(timeoutMs) || 15000))

            const cleanup = () => {
                clearTimeout(timeoutHandle)
                webContents.removeListener('did-finish-load', onDidFinishLoad)
                webContents.removeListener('did-fail-load', onDidFailLoad)
                this.mainWindow?.removeListener('closed', onWindowClosed)
            }

            const done = result => {
                if (finished) return
                finished = true
                cleanup()
                resolve(Boolean(result))
            }

            const onDidFinishLoad = () => done(true)
            const onDidFailLoad = () => done(false)
            const onWindowClosed = () => done(false)

            webContents.once('did-finish-load', onDidFinishLoad)
            webContents.once('did-fail-load', onDidFailLoad)
            this.mainWindow.once('closed', onWindowClosed)
        })
    }

    applyPinnedState() {
        if (!this.mainWindow) return
        this.mainWindow.setAlwaysOnTop(this.isPinned, 'screen-saver')
        this.mainWindow.setVisibleOnAllWorkspaces(this.isPinned, { visibleOnFullScreen: true })
    }

    setPinned(isPinned) {
        this.isPinned = Boolean(isPinned)
        this.applyPinnedState()
    }
}
