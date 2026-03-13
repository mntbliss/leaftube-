import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import * as LoggerService from '../../src/services/LoggerService.js'

export let isEnabled = false

let appSettings
let appProfile
let rootDirPath
let electronApp
let rpcProcess

export function initDiscordService({ app, settings, profile, rootPath }) {
    electronApp = app
    appSettings = settings
    appProfile = profile
    rootDirPath = rootPath

    isEnabled = Boolean(appSettings.discordRichPresence.enabledByDefault && appProfile.allowDiscordRichPresence)
}

export function scheduleDiscordConnect() {
    if (!isEnabled || !appSettings?.discordRichPresence?.applicationId) return
    setTimeout(() => {
        if (isEnabled && appSettings.discordRichPresence.applicationId) startRpcProcess()
    }, 1500)
}

function startRpcProcess() {
    if (rpcProcess) return
    if (!isEnabled || !appSettings.discordRichPresence.applicationId) return

    const rpcPath = resolve(rootDirPath, 'electron', 'rpcWorker.js')
    rpcProcess = spawn(electronApp.getPath('exe'), [rpcPath], {
        cwd: rootDirPath,
        env: {
            ...process.env,
            DISCORD_CLIENT_ID: String(appSettings.discordRichPresence.applicationId),
            WATCH_BUTTON_TEXT: String(appSettings.discordRichPresence.watchButtonText),
            LISTEN_BUTTON_TEXT: String(appSettings.discordRichPresence.listenButtonText),
            CUSTOM_BUTTON_TEXT: String(appSettings.discordRichPresence.customButtonText),
            CUSTOM_BUTTON_URL: String(appSettings.discordRichPresence.customButtonUrl),
        },
        stdio: ['pipe', 'inherit', 'inherit', 'ipc'],
    })
    rpcProcess.on('exit', () => {
        rpcProcess = undefined
    })
}

export function updateDiscordEnabled(requestedEnabled) {
    isEnabled = Boolean(requestedEnabled)
    LoggerService.log('[DiscordService] updateDiscordEnabled', isEnabled, 'appId:', appSettings?.discordRichPresence?.applicationId || '(empty)')
    scheduleDiscordConnect()
    const result = { discordEnabled: isEnabled }
    LoggerService.log('[DiscordService] updateDiscordEnabled result', result)
    return result
}

export function sendPresenceToRpc(nowPlaying, watchUrl) {
    if (!rpcProcess) return
    if (!isEnabled || !nowPlaying) return

    rpcProcess.send({
        type: 'presence',
        payload: {
            title: nowPlaying.title,
            channel: nowPlaying.channel,
            isVideo: nowPlaying.isVideo,
            positionSeconds: nowPlaying.positionSeconds,
            watchUrl,
            thumbnailUrl: nowPlaying.thumbnailUrl,
        },
    })
}
