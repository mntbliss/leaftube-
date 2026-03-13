import * as DiscordService from './DiscordService.js'

export function registerIpc({ ipcMain, appSettings, appProfile, mainWindowService, youtubeWindowService }) {
    let isExpanded = false

    ipcMain.handle('config:get', async () => {
        return {
            settings: appSettings,
            profile: appProfile,
            discordEnabled: DiscordService.isEnabled,
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
