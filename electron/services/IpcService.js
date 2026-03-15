import { dirname } from 'node:path'
import { clipboard } from 'electron'
import { IpcChannel } from '../constants/ipc-channels.js'
import { PlayerAction } from '../constants/player-actions.js'
import * as DiscordService from './DiscordService.js'
import * as LogBufferService from './LogBufferService.js'
import { errorWithBuffer } from '../helpers/error-helper.js'
import { ConfigService } from '../../src/services/ConfigService.js'

export function persistYoutubeVolumeState(youtubeWindowService) {
    try {
        const settings = ConfigService.loadSettings()
        if (!settings.youtubeMusic) settings.youtubeMusic = {}
        settings.youtubeMusic.volumeLevel = youtubeWindowService.lastVolume
        settings.youtubeMusic.isMuted = youtubeWindowService.wasLastMuted
        ConfigService.saveSettings(settings)
    } catch (error) {
        errorWithBuffer('[IpcService] persist volume/muted failed', error)
    }
}

function registerConfigHandlers(ipcMain, appSettings, app) {
    ipcMain.handle(IpcChannel.CONFIG_GET, async () => ({
        settings: appSettings,
        discordEnabled: DiscordService.isEnabled,
        version: app?.getVersion?.() ?? '0.0.0',
    }))

    ipcMain.handle(IpcChannel.CONFIG_SET, async (_event, updatedSettings) => {
        try {
            ConfigService.saveSettings(updatedSettings)
            return { ok: true }
        } catch (error) {
            errorWithBuffer('[IpcService] config:set failed', error)
            return { ok: false, error: error?.message ?? String(error) }
        }
    })

    ipcMain.handle(IpcChannel.CONFIG_RESET, async () => {
        try {
            const defaults = ConfigService.resetSettingsToDefaults()
            return { ok: true, settings: defaults }
        } catch (error) {
            errorWithBuffer('[IpcService] config:reset failed', error)
            return { ok: false, error: error?.message ?? String(error), settings: null }
        }
    })
}

function registerUiHandlers(ipcMain, expandedState, app, mainWindowService, youtubeWindowService, settingsWindowService) {
    ipcMain.handle(IpcChannel.DISCORD_SET_ENABLED, async (_event, requestedEnabled) => {
        return DiscordService.updateDiscordEnabled(requestedEnabled)
    })

    ipcMain.handle(IpcChannel.UI_SET_EXPANDED, async (_event, expanded) => {
        expandedState.isExpanded = Boolean(expanded)
        if (!expandedState.isExpanded) {
            youtubeWindowService.hideWindow()
            if (mainWindowService) mainWindowService.showWindow()
            return { isExpanded: expandedState.isExpanded }
        }
        if (mainWindowService) mainWindowService.hideWindow()
        youtubeWindowService.ensureWindow()
        return { isExpanded: expandedState.isExpanded }
    })

    ipcMain.handle(IpcChannel.UI_RESIZE_YOUTUBE_VIEW, async () => {
        youtubeWindowService.resizeView()
        return {}
    })

    ipcMain.handle(IpcChannel.UI_CLOSE_APP, async () => {
        if (settingsWindowService) settingsWindowService.hideWindow()
        if (youtubeWindowService) youtubeWindowService.hideWindow()
        if (mainWindowService) mainWindowService.hideWindow()
        if (!app || typeof app.quit !== 'function') return {}
        app.quit()
        return {}
    })

    ipcMain.handle(IpcChannel.UI_FORCE_QUIT, async () => {
        errorWithBuffer('[User] force quit 🍂')
        if (app) app.leafQuitting = true
        if (app && typeof app.quit === 'function') app.quit()
        process.exit(0)
        return {}
    })

    ipcMain.handle(IpcChannel.UI_RESTART_APP, async () => {
        try {
            if (app && typeof app.relaunch === 'function') {
                app.relaunch()
                app.exit(0)
                return {}
            }
            if (app && typeof app.quit === 'function') app.quit()
        } catch (error) {
            errorWithBuffer('[IpcService] ui:restart-app failed', error)
            return { ok: false, error: error?.message ?? String(error) }
        }
        return {}
    })

    ipcMain.handle(IpcChannel.UI_OPEN_SETTINGS, async () => {
        if (settingsWindowService) settingsWindowService.ensureWindow()
        return {}
    })

    ipcMain.handle(IpcChannel.UI_YOUTUBE_NAVIGATE, async (_event, path) => {
        if (youtubeWindowService) youtubeWindowService.navigateTo(path)
        return {}
    })

    ipcMain.handle(IpcChannel.UI_YOUTUBE_SEARCH, async (_event, query) => {
        if (youtubeWindowService) youtubeWindowService.runSearch(query)
        return {}
    })

    ipcMain.handle(IpcChannel.UI_YOUTUBE_OPEN_SIGN_IN, async () => {
        if (youtubeWindowService) youtubeWindowService.openSignInInView()
        return {}
    })

    ipcMain.handle(IpcChannel.UI_YOUTUBE_OPEN_APP_MENU, async () => {
        if (youtubeWindowService) youtubeWindowService.openAppMenuInView()
        return {}
    })
}

function registerPlayerHandlers(ipcMain, youtubeWindowService) {
    function ensureYoutubeReady() {
        youtubeWindowService.ensureWindow(false)
    }

    async function safePlayerInvoke(awaitedFunction) {
        try {
            await awaitedFunction()
            return {}
        } catch (error) {
            errorWithBuffer('[IpcService] player action failed', error)
            return {}
        }
    }

    ipcMain.handle('player:play-pause', async () => {
        ensureYoutubeReady()
        return safePlayerInvoke(() => youtubeWindowService.clickPlayer(PlayerAction.PLAY_PAUSE))
    })

    ipcMain.handle('player:next', async () => {
        ensureYoutubeReady()
        return safePlayerInvoke(() => youtubeWindowService.clickPlayer(PlayerAction.NEXT))
    })

    ipcMain.handle('player:previous', async () => {
        ensureYoutubeReady()
        return safePlayerInvoke(() => youtubeWindowService.clickPlayer(PlayerAction.PREVIOUS))
    })

    ipcMain.handle('player:seek', async (_event, fraction) => {
        ensureYoutubeReady()
        return safePlayerInvoke(() => youtubeWindowService.seekToFraction(fraction))
    })

    ipcMain.handle(IpcChannel.PLAYER_SET_VOLUME, async (_event, fraction) => {
        ensureYoutubeReady()
        return safePlayerInvoke(async () => {
            await youtubeWindowService.setVolume(fraction)
            persistYoutubeVolumeState(youtubeWindowService)
        })
    })

    ipcMain.handle(IpcChannel.PLAYER_SET_MUTED, async (_event, isMuted) => {
        ensureYoutubeReady()
        return safePlayerInvoke(async () => {
            await youtubeWindowService.setMuted(isMuted)
            persistYoutubeVolumeState(youtubeWindowService)
        })
    })

    ipcMain.handle(IpcChannel.PLAYER_GET_VOLUME, async () => {
        try {
            ensureYoutubeReady()
            return await youtubeWindowService.getVolume()
        } catch (error) {
            errorWithBuffer('[IpcService] player getVolume failed', error)
            return 0
        }
    })
}

function registerLogsHandlers(ipcMain, app) {
    ipcMain.handle(IpcChannel.LOGS_ADD_RENDERER_ERROR, async (_event, message) => {
        errorWithBuffer(new Error(String(message)))
    })

    ipcMain.handle(IpcChannel.LOGS_SAVE, async () => {
        try {
            const appDir = app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath()
            return LogBufferService.saveToFile(appDir)
        } catch (error) {
            errorWithBuffer('[IpcService] logs:save failed', error)
            return { ok: false, error: error?.message ?? String(error), path: null }
        }
    })

    ipcMain.handle(IpcChannel.LOGS_COPY, async () => {
        try {
            const text = LogBufferService.getContentAsText()
            clipboard.writeText(text || '(no logs yet)')
            return { ok: true }
        } catch (error) {
            errorWithBuffer('[IpcService] logs:copy failed', error)
            return { ok: false, error: error?.message ?? String(error) }
        }
    })
}

export function registerIpc({ ipcMain, app, appSettings, mainWindowService, youtubeWindowService, settingsWindowService }) {
    const expandedState = { isExpanded: false }
    registerConfigHandlers(ipcMain, appSettings, app)
    registerUiHandlers(ipcMain, expandedState, app, mainWindowService, youtubeWindowService, settingsWindowService)
    registerPlayerHandlers(ipcMain, youtubeWindowService)
    registerLogsHandlers(ipcMain, app)
}
