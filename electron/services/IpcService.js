import * as DiscordService from './DiscordService.js'
import { ConfigService } from '../../src/services/ConfigService.js'

export function registerIpc({ ipcMain, app, appSettings, appProfile, mainWindowService, youtubeWindowService, settingsWindowService }) {
    let isExpanded = false

    ipcMain.handle('config:get', async () => {
        return {
            settings: appSettings,
            profile: appProfile,
            discordEnabled: DiscordService.isEnabled,
        }
    })

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

    ipcMain.handle('discord:set-enabled', async (_event, requestedEnabled) => {
        return DiscordService.updateDiscordEnabled(requestedEnabled)
    })

    ipcMain.handle('ui:set-expanded', async (_event, expanded) => {
        isExpanded = Boolean(expanded)

        if (isExpanded) {
            if (mainWindowService) mainWindowService.hideWindow()
            youtubeWindowService.ensureWindow()
        } else {
            youtubeWindowService.hideWindow()
            if (mainWindowService) mainWindowService.showWindow()
        }

        return { isExpanded }
    })

    ipcMain.handle('ui:resize-youtube-view', async () => {
        youtubeWindowService.resizeView()
        return {}
    })

    ipcMain.handle('ui:close-app', async () => {
        if (settingsWindowService) settingsWindowService.hideWindow()
        if (youtubeWindowService) youtubeWindowService.hideWindow()
        if (mainWindowService) mainWindowService.hideWindow()
        if (app && typeof app.quit === 'function') app.quit()
        return {}
    })

    ipcMain.handle('ui:open-settings', async () => {
        if (settingsWindowService) settingsWindowService.ensureWindow()
        return {}
    })

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
}
