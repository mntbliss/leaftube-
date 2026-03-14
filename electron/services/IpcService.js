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
    ipcMain.handle('config:get', async () => ({
        settings: appSettings,
        discordEnabled: DiscordService.isEnabled,
    }))

    ipcMain.handle('config:set', async (_event, updatedSettings) => {
        try {
            ConfigService.saveSettings(updatedSettings)
            return { ok: true }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[IpcService] config:set failed', error)
            throw error
        }
    })

    ipcMain.handle('config:reset', async () => {
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
    ipcMain.handle('discord:set-enabled', async (_event, requestedEnabled) => {
        return DiscordService.updateDiscordEnabled(requestedEnabled)
    })

    ipcMain.handle('ui:set-expanded', async (_event, expanded) => {
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

    ipcMain.handle('ui:resize-youtube-view', async () => {
        youtubeWindowService.resizeView()
        return {}
    })

    ipcMain.handle('ui:close-app', async () => {
        if (settingsWindowService) settingsWindowService.hideWindow()
        if (youtubeWindowService) youtubeWindowService.hideWindow()
        if (mainWindowService) mainWindowService.hideWindow()
        if (!app || typeof app.quit !== 'function') return {}
        app.quit()
        return {}
    })

    ipcMain.handle('ui:restart-app', async () => {
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

    ipcMain.handle('ui:open-settings', async () => {
        if (settingsWindowService) settingsWindowService.ensureWindow()
        return {}
    })
}

function registerPlayerHandlers(ipcMain, youtubeWindowService) {
    ipcMain.handle('player:play-pause', async () => {
        await youtubeWindowService.clickPlayer('playPause')
        return {}
    })

    ipcMain.handle('player:next', async () => {
        await youtubeWindowService.clickPlayer('next')
        return {}
    })

    ipcMain.handle('player:previous', async () => {
        await youtubeWindowService.clickPlayer('previous')
        return {}
    })

    ipcMain.handle('player:seek', async (_event, fraction) => {
        await youtubeWindowService.seekToFraction(fraction)
        return {}
    })

    ipcMain.handle('player:set-volume', async (_event, fraction) => {
        await youtubeWindowService.setVolume(fraction)
        persistYoutubeVolumeState(youtubeWindowService)
        return {}
    })

    ipcMain.handle('player:set-muted', async (_event, isMuted) => {
        await youtubeWindowService.setMuted(isMuted)
        persistYoutubeVolumeState(youtubeWindowService)
        return {}
    })

    ipcMain.handle('player:get-volume', async () => {
        return youtubeWindowService.getVolume()
    })
}

export function registerIpc({ ipcMain, app, appSettings, mainWindowService, youtubeWindowService, settingsWindowService }) {
    const expandedState = { isExpanded: false }
    registerConfigHandlers(ipcMain, appSettings)
    registerUiHandlers(ipcMain, expandedState, app, mainWindowService, youtubeWindowService, settingsWindowService)
    registerPlayerHandlers(ipcMain, youtubeWindowService)
}
