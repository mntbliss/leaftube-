import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { errorWithBuffer, errorWithBufferWithoutTrace } from './helpers/error-helper.js'
import { readFileSync } from 'node:fs'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { ConfigService } from '../src/services/ConfigService.js'
import * as LoggerService from '../src/services/LoggerService.js'
import { MainWindowService } from './services/MainWindowService.js'
import { YoutubeWindowService } from './services/YoutubeWindowService.js'
import { SettingsWindowService } from './services/SettingsWindowService.js'
import { LoadingWindowService } from './services/LoadingWindowService.js'
import * as DiscordService from './services/DiscordService.js'
import { TrayService } from './services/TrayService.js'
import { Path } from './constants/path.js'
import { getIconPath } from './helpers/window-helpers.js'
import { registerIpc, persistYoutubeVolumeState } from './services/IpcService.js'

export class Launcher {
    constructor({ app, BrowserWindow, BrowserView, ipcMain, session }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.BrowserView = BrowserView
        this.ipcMain = ipcMain
        this.session = session

        const currentFilePath = fileURLToPath(import.meta.url)
        this.rootDirPath = resolve(currentFilePath, '..', '..')

        if (this.app.isPackaged) ConfigService.setConfigDir(this.app.getPath('userData'))
        this.appSettings = ConfigService.loadSettings()

        this.isAcrylic = Boolean(this.appSettings.window?.isAcrylic)
        this.isDeveloperConsoleEnabled = Boolean(this.appSettings.developer?.isDeveloperConsoleEnabled)

        LoggerService.init(this.appSettings, this.app.isPackaged)

        this.youtubeDebloatCss = ''

        try {
            const debloatPath = resolve(this.rootDirPath, 'electron', 'injections', 'debloat.css')
            this.youtubeDebloatCss = readFileSync(debloatPath, 'utf8')
        } catch {
            LoggerService.log('[Launcher] electron/injections/debloat.css not found or unreadable, skipping YT debloat CSS')
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

        this.loadingWindowService = new LoadingWindowService({
            app: this.app,
            BrowserWindow: this.BrowserWindow,
            rootDirPath: this.rootDirPath,
        })

        this.youtubeWindowService = new YoutubeWindowService({
            app: this.app,
            BrowserWindow: this.BrowserWindow,
            BrowserView: this.BrowserView,
            appSettings: this.appSettings,
            rootDirPath: this.rootDirPath,
            youtubeDebloatCss: this.youtubeDebloatCss,
            onWaitingForShowStateChanged: isWaitingForShow => {
                if (isWaitingForShow) {
                    this.loadingWindowService.beginLoading('youtube_expand_pending_ready', 'Loading YouTube...')
                } else {
                    this.loadingWindowService.endLoading('youtube_expand_pending_ready')
                }
            },
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

        this.trayService = null
    }

    async start() {
        this.loadingWindowService.beginLoading('app_startup', 'Loading LeafTube...')

        // Ads + tracking (fromPrebuiltAdsOnly = ads only)
        const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
        // Only enable on YouTube partition; enabling on both sessions would register IPC handlers twice
        blocker.enableBlockingInSession(this.session.fromPartition(Path.YOUTUBE_PARTITION))

        this.youtubeWindowService.ensureWindow(false)

        this.mainWindowService.createMainWindow()
        this.mainWindowService.waitForFirstRendererLoad().finally(() => {
            this.loadingWindowService.endLoading('app_startup')
        })

        const iconPath = getIconPath(this.app, this.rootDirPath)
        const settingsPath = resolve(ConfigService.getConfigRoot(), 'configs', 'settings.json')
        errorWithBufferWithoutTrace('[ 🍃 startup diagnostics ] iconPath = ', iconPath)
        errorWithBufferWithoutTrace('[ 🍃 startup diagnostics ] resourcesPath = ', process.resourcesPath)
        errorWithBufferWithoutTrace('[ 🍃 startup diagnostics ] exePath = ', this.app.getPath('exe'))
        errorWithBufferWithoutTrace('[ 🍃 startup diagnostics ] settingsPath = ', settingsPath)
        errorWithBufferWithoutTrace('[ 🍃 startup diagnostics ] settings = ', JSON.stringify(ConfigService.loadSettings(), null, 2))

        this.trayService = new TrayService({
            app: this.app,
            iconPath,
            mainWindowService: this.mainWindowService,
        })

        this.trayService.create()

        this.mainWindowService.setCloseToTrayCallback(() => {
            this.mainWindowService.hideWindow()
            this.youtubeWindowService.hideWindow()
        })

        DiscordService.scheduleDiscordConnect()

        this.youtubeWindowService.startNowPlayingPolling({
            onNowPlaying: nowPlaying => this.mainWindowService.sendNowPlaying(nowPlaying),
            onPresence: (nowPlaying, watchUrl) => DiscordService.sendPresenceToRpc(nowPlaying, watchUrl),
            onVolumeChangedFromView: () => persistYoutubeVolumeState(this.youtubeWindowService),
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
