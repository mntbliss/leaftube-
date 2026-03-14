import { IpcChannel } from '../constants/ipc-channels.js'
import { PlayerAction } from '../constants/player-actions.js'
import * as DiscordService from './DiscordService.js'
import { ConfigService } from '../../src/services/ConfigService.js'

function persistYoutubeVolumeState(youtubeWindowService) {
    try {
        const settings = ConfigService.loadSettings()
        if (!settings.youtubeMusic) settings.youtubeMusic = {}
        settings.youtubeMusic.volumeLevel = youtubeWindowService.lastVolume
        settings.youtubeMusic.isMuted = youtubeWindowService.wasLastMuted
        ConfigService.saveSettings(settings)
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[IpcService] persist volume/muted failed', error)
    }
}

function registerConfigHandlers(ipcMain, appSettings) {
    ipcMain.handle(IpcChannel.CONFIG_GET, async () => ({
        settings: appSettings,
        discordEnabled: DiscordService.isEnabled,
    }))

    ipcMain.handle(IpcChannel.CONFIG_SET, async (_event, updatedSettings) => {
        try {
            ConfigService.saveSettings(updatedSettings)
            return { ok: true }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[IpcService] config:set failed', error)
            throw error
        }
    })

    ipcMain.handle(IpcChannel.CONFIG_RESET, async () => {
        try {
            const defaults = ConfigService.resetSettingsToDefaults()
            return { ok: true, settings: defaults }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[IpcService] config:reset failed', error)
            throw error
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

    ipcMain.handle(IpcChannel.UI_RESTART_APP, async () => {
        try {
            if (app && typeof app.relaunch === 'function') {
                app.relaunch()
                app.exit(0)
                return {}
            }
            if (app && typeof app.quit === 'function') app.quit()
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[IpcService] ui:restart-app failed', error)
            throw error
        }
        return {}
    })

    ipcMain.handle(IpcChannel.UI_OPEN_SETTINGS, async () => {
        if (settingsWindowService) settingsWindowService.ensureWindow()
        return {}
    })
}

function registerPlayerHandlers(ipcMain, youtubeWindowService) {
    function ensureYoutubeReady() {
        youtubeWindowService.ensureWindow(false)
    }

    ipcMain.handle('player:play-pause', async () => {
        ensureYoutubeReady()
        await youtubeWindowService.clickPlayer(PlayerAction.PLAY_PAUSE)
        return {}
    })

    ipcMain.handle('player:next', async () => {
        ensureYoutubeReady()
        await youtubeWindowService.clickPlayer(PlayerAction.NEXT)
        return {}
    })

    ipcMain.handle('player:previous', async () => {
        ensureYoutubeReady()
        await youtubeWindowService.clickPlayer(PlayerAction.PREVIOUS)
        return {}
    })

    ipcMain.handle('player:seek', async (_event, fraction) => {
        ensureYoutubeReady()
        await youtubeWindowService.seekToFraction(fraction)
        return {}
    })

    ipcMain.handle(IpcChannel.PLAYER_SET_VOLUME, async (_event, fraction) => {
        ensureYoutubeReady()
        await youtubeWindowService.setVolume(fraction)
        persistYoutubeVolumeState(youtubeWindowService)
        return {}
    })

    ipcMain.handle(IpcChannel.PLAYER_SET_MUTED, async (_event, isMuted) => {
        ensureYoutubeReady()
        await youtubeWindowService.setMuted(isMuted)
        persistYoutubeVolumeState(youtubeWindowService)
        return {}
    })

    ipcMain.handle(IpcChannel.PLAYER_GET_VOLUME, async () => {
        ensureYoutubeReady()
        return youtubeWindowService.getVolume()
    })
}

export function registerIpc({ ipcMain, app, appSettings, mainWindowService, youtubeWindowService, settingsWindowService }) {
    const expandedState = { isExpanded: false }
    registerConfigHandlers(ipcMain, appSettings)
    registerUiHandlers(ipcMain, expandedState, app, mainWindowService, youtubeWindowService, settingsWindowService)
    registerPlayerHandlers(ipcMain, youtubeWindowService)
}
