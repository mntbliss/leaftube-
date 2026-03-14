import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { Launcher } from './Launcher.js'
import { errorWithBuffer } from './helpers/error-helper.js'

process.on('uncaughtException', (error) => errorWithBuffer(error))
process.on('unhandledRejection', (reason) => errorWithBuffer(reason))

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
