import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { Launcher } from './Launcher.js'
import { errorWithBuffer } from './helpers/error-helper.js'

process.on('uncaughtException', (error) => errorWithBuffer(error))
process.on('unhandledRejection', (reason) => errorWithBuffer(reason))

const launcher = new Launcher({
    app,
    BrowserWindow,
    BrowserView,
    ipcMain,
    session,
})

app.whenReady().then(async () => {
    await launcher.start()
})

app.on('window-all-closed', () => {
    app.quit()
})
