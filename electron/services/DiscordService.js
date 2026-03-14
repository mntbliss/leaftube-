import discordRpc from 'discord-rpc'
import * as LoggerService from '../../src/services/LoggerService.js'
import { errorWithBuffer } from '../helpers/error-helper.js'
import { buildDiscordActivity } from '../helpers/discord-activity.js'

export let isEnabled = false

let appSettings
let electronApp
let rpcClient
let rpcReady = false

export function initDiscordService({ app, settings, rootPath }) {
    electronApp = app
    appSettings = settings

    isEnabled = Boolean(appSettings.discordRichPresence?.isEnabledByDefault)
}

export function scheduleDiscordConnect() {
    if (!isEnabled || !appSettings?.discordRichPresence?.applicationId) return
    setTimeout(() => {
        if (isEnabled && appSettings.discordRichPresence.applicationId) startRpcClient()
    }, 1500)
}

function startRpcClient() {
    if (rpcClient) return
    if (!isEnabled || !appSettings.discordRichPresence.applicationId) return

    const clientId = String(appSettings.discordRichPresence.applicationId)
    rpcReady = false
    rpcClient = new discordRpc.Client({ transport: 'ipc' })

    rpcClient.on('ready', () => {
        rpcReady = true
        LoggerService.log('[DiscordService] RPC ready')
    })

    rpcClient.on('error', (err) => {
        errorWithBuffer('[DiscordService] RPC error', err?.message ?? err)
        rpcClient = undefined
        rpcReady = false
    })

    rpcClient.login({ clientId }).catch((err) => {
        errorWithBuffer('[DiscordService] RPC login failed', err?.message ?? err)
        rpcClient = undefined
        rpcReady = false
    })
}

function clearPresence() {
    if (!rpcClient) return
    const client = rpcClient
    const wasReady = rpcReady
    rpcClient = undefined
    rpcReady = false
    Promise.resolve()
        .then(() => (wasReady ? client.clearActivity() : undefined))
        .then(() => client.destroy())
        .catch(() => {})
}

export function updateDiscordEnabled(requestedEnabled) {
    isEnabled = Boolean(requestedEnabled)
    LoggerService.log('[DiscordService] updateDiscordEnabled', isEnabled, 'appId:', appSettings?.discordRichPresence?.applicationId || '(empty)')
    if (!isEnabled) clearPresence()
    scheduleDiscordConnect()
    const result = { discordEnabled: isEnabled }
    LoggerService.log('[DiscordService] updateDiscordEnabled result', result)
    return result
}

export function sendPresenceToRpc(nowPlaying, watchUrl) {
    if (!rpcClient || !rpcReady || !isEnabled || !nowPlaying) return
    const opts = appSettings?.discordRichPresence ?? {}
    const activity = buildDiscordActivity(
        {
            title: nowPlaying.title,
            channel: nowPlaying.channel,
            isVideo: nowPlaying.isVideo,
            positionSeconds: nowPlaying.positionSeconds,
            watchUrl,
            thumbnailUrl: nowPlaying.thumbnailUrl,
        },
        {
            watchButtonText: opts.watchButtonText,
            listenButtonText: opts.listenButtonText,
            customButtonText: opts.customButtonText,
            customButtonUrl: opts.customButtonUrl,
            idleStateText: opts.idleStateText ?? '🌸',
            idleLargeImageText: opts.idleLargeImageText ?? '🌺',
        }
    )
    if (!activity) return
    try {
        rpcClient.setActivity(activity)
    } catch {
        rpcClient = undefined
        rpcReady = false
    }
}
