import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { ConfigService } from '../src/services/ConfigService.js'
import * as LoggerService from '../src/services/LoggerService.js'
import { MainWindowService } from './services/MainWindowService.js'
import { YoutubeWindowService } from './services/YoutubeWindowService.js'
import { SettingsWindowService } from './services/SettingsWindowService.js'
import * as DiscordService from './services/DiscordService.js'
import { Path } from './constants/path.js'
import { registerIpc } from './services/IpcService.js'

export class Launcher {
    constructor({ app, BrowserWindow, BrowserView, ipcMain, session }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.BrowserView = BrowserView
        this.ipcMain = ipcMain
        this.session = session

        const currentFilePath = fileURLToPath(import.meta.url)
        this.rootDirPath = resolve(currentFilePath, '..', '..')

        this.appSettings = ConfigService.loadSettings()

        this.isAcrylic = Boolean(this.appSettings.window?.isAcrylic)
        this.isDeveloperConsoleEnabled = Boolean(this.appSettings.developer?.isDeveloperConsoleEnabled)

        LoggerService.init(this.appSettings, this.app.isPackaged)

        this.youtubeDebloatCss = ''

        try {
            const debloatPath = resolve(this.rootDirPath, 'configs', 'debloat.css')
            this.youtubeDebloatCss = readFileSync(debloatPath, 'utf8')
        } catch {
            LoggerService.log('[Launcher] debloat.css not found or unreadable, skipping YouTube debloat CSS')
        }

        this.mainWindowService = new MainWindowService({
            app: this.app,
            BrowserWindow: this.BrowserWindow,
            session: this.session,
            appSettings: this.appSettings,
            rootDirPath: this.rootDirPath,
            isAcrylic: this.isAcrylic,
            isDeveloperConsoleEnabled: this.isDeveloperConsoleEnabled,
        })

        this.youtubeWindowService = new YoutubeWindowService({
            BrowserWindow: this.BrowserWindow,
            BrowserView: this.BrowserView,
            appSettings: this.appSettings,
            rootDirPath: this.rootDirPath,
            youtubeDebloatCss: this.youtubeDebloatCss,
        })

        this.settingsWindowService = new SettingsWindowService({
            app: this.app,
            BrowserWindow: this.BrowserWindow,
            rootDirPath: this.rootDirPath,
            appSettings: this.appSettings,
        })

        DiscordService.initDiscordService({
            app: this.app,
            settings: this.appSettings,
            rootPath: this.rootDirPath,
        })

    }

    async start() {
        // Ads + tracking (fromPrebuiltAdsOnly = ads only)
        const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
        // Only enable on YouTube partition; enabling on both sessions would register IPC handlers twice
        blocker.enableBlockingInSession(this.session.fromPartition(Path.YOUTUBE_PARTITION))

        this.youtubeWindowService.ensureWindow(false)

        this.mainWindowService.createMainWindow()
        DiscordService.scheduleDiscordConnect()

        this.youtubeWindowService.startNowPlayingPolling({
            onNowPlaying: nowPlaying => this.mainWindowService.sendNowPlaying(nowPlaying),
            onPresence: (nowPlaying, watchUrl) => DiscordService.sendPresenceToRpc(nowPlaying, watchUrl),
        })

        registerIpc({
            ipcMain: this.ipcMain,
            app: this.app,
            appSettings: this.appSettings,
            mainWindowService: this.mainWindowService,
            youtubeWindowService: this.youtubeWindowService,
            settingsWindowService: this.settingsWindowService,
        })

        this.app.on('activate', () => {
            if (this.BrowserWindow.getAllWindows().length === 0) this.mainWindowService.createMainWindow()
        })
    }
}
