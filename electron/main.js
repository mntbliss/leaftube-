import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { resolve as resolvePath } from 'node:path'
import { Launcher } from './Launcher.js'
import { errorWithBuffer } from './helpers/error-helper.js'
import { ConfigService } from '../src/services/ConfigService.js'
import { parseLeafProtocolUrl } from './helpers/deep-link.js'

process.on('uncaughtException', error => errorWithBuffer(error))
process.on('unhandledRejection', error => errorWithBuffer(error))

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
    process.exit(0)
}

const launcher = new Launcher({
    app,
    BrowserWindow,
    BrowserView,
    ipcMain,
    session,
})

let pendingLeafUrl = null

function findLeafProtocolArg(argvList) {
    const argumentList = Array.isArray(argvList) ? argvList : []
    for (const argumentToken of argumentList) {
        const normalizedToken = String(argumentToken || '')
        if (normalizedToken.toLowerCase().startsWith('leaf://')) return normalizedToken
    }
    return null
}

function handleLeafUrl(rawUrl) {
    try {
        const parsed = parseLeafProtocolUrl(rawUrl)
        if (!parsed) return false
        launcher.mainWindowService?.showWindow()
        launcher.youtubeWindowService?.openDeepLink(parsed.targetUrl, parsed.seconds)
        return true
    } catch (error) {
        errorWithBuffer(error)
        return false
    }
}

// Optional GPU disable: useful for broken rendering on some PCs.
try {
    if (app.isPackaged) ConfigService.setConfigDir(app.getPath('userData'))
    const startupSettings = ConfigService.loadSettings() || {}
    const shouldDisable = Boolean(startupSettings?.window?.disableHardwareAcceleration)
    if (shouldDisable) {
        try {
            app.disableHardwareAcceleration()
        } catch {}
        try {
            app.commandLine.appendSwitch('disable-gpu')
        } catch {}
    }
} catch {}

app.whenReady().then(async () => {
    try {
        if (process.defaultApp && process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('leaf', process.execPath, [resolvePath(process.argv[1])])
        } else {
            app.setAsDefaultProtocolClient('leaf')
        }
    } catch {}

    await launcher.start()
    app.on('second-instance', (_event, argv) => {
        const leafArg = findLeafProtocolArg(argv)
        if (leafArg && handleLeafUrl(leafArg)) return
        launcher.mainWindowService?.showWindow()
    })

    if (pendingLeafUrl) {
        handleLeafUrl(pendingLeafUrl)
        pendingLeafUrl = null
    }
})

app.on('open-url', (event, urlText) => {
    try {
        if (event && typeof event.preventDefault === 'function') event.preventDefault()
    } catch {}
    if (!app.isReady()) {
        pendingLeafUrl = String(urlText || '')
        return
    }
    handleLeafUrl(urlText)
})

if (process.platform === 'win32') {
    const fromArgv = findLeafProtocolArg(process.argv)
    if (fromArgv) pendingLeafUrl = fromArgv
}

app.on('window-all-closed', () => {
    app.quit()
    process.exit(0)
})
