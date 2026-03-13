import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { Launcher } from './Launcher.js'

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
