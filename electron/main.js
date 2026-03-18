import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { Launcher } from './Launcher.js'
import { errorWithBuffer } from './helpers/error-helper.js'
import { ConfigService } from '../src/services/ConfigService.js'

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
    await launcher.start()
    app.on('second-instance', () => {
        launcher.mainWindowService?.showWindow()
    })
})

app.on('window-all-closed', () => {
    app.quit()
    process.exit(0)
})
