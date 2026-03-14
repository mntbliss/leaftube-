import rpcLib from 'discord-rpc'
import * as LoggerService from '../src/services/LoggerService.js'

LoggerService.init()

const clientId = process.env.DISCORD_CLIENT_ID ? String(process.env.DISCORD_CLIENT_ID) : ''
const logName = '[discordRpcWorker]'

if (!clientId) {
    LoggerService.error(`${logName} missing DISCORD_CLIENT_ID, exiting`)
    process.exit(0)
}

LoggerService.log(`${logName} starting, clientId: `, clientId)

const rpc = new rpcLib.Client({ transport: 'ipc' })

rpc.on('ready', () => {
    LoggerService.log(`${logName} rpc ready`)
})

rpc.on('error', error => {
    LoggerService.error(`${logName} rpc error:\n`, error)
})

rpc.login({ clientId }).catch(error => {
    LoggerService.error(`${logName} login failed:\n`, error)
})

function buildDiscordActivity(payload) {
    const { title, channel, isVideo, watchUrl, thumbnailUrl, positionSeconds } = payload || {}
    const details = '₊˚✧ ◡◠◡◜🌺◝◡◠◡ ✧˚₊'
    const template = 'https://img.youtube.com/vi/<ID_HERE>/maxresdefault.jpg'
    const safeWatchUrl = typeof watchUrl === 'string' ? watchUrl : ''
    const videoIdMatch = safeWatchUrl.match(/[?&]v=([^&]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : null

    if (!videoId && !thumbnailUrl) return null

    let largeImageKey = 'leaf_listening'
    if (videoId) largeImageKey = template.replace('<ID_HERE>', videoId)
    else if (typeof thumbnailUrl === 'string' && thumbnailUrl) largeImageKey = thumbnailUrl

    const nowSeconds = Math.floor(Date.now() / 1000)
    const safePosition = typeof positionSeconds === 'number' && isFinite(positionSeconds) ? positionSeconds : 0
    const idleState = process.env.DISCORD_IDLE_STATE_TEXT || '🌸'
    const idleLargeImageText = process.env.DISCORD_IDLE_LARGE_IMAGE_TEXT || '🌺'
    const activity = {
        details,
        state: title || idleState,
        largeImageKey,
        largeImageText: channel || idleLargeImageText,
        startTimestamp: Math.max(0, nowSeconds - Math.floor(safePosition)),
    }

    const buttons = []
    if (safeWatchUrl && safeWatchUrl.includes('music.youtube.com')) {
        buttons.push({
            label: isVideo ? String(process.env.WATCH_BUTTON_TEXT) : String(process.env.LISTEN_BUTTON_TEXT),
            url: safeWatchUrl,
        })
    }

    if (process.env.CUSTOM_BUTTON_TEXT && process.env.CUSTOM_BUTTON_URL) {
        buttons.push({
            label: String(process.env.CUSTOM_BUTTON_TEXT),
            url: String(process.env.CUSTOM_BUTTON_URL),
        })
    }

    if (buttons.length > 0) activity.buttons = buttons
    return activity
}

process.on('message', message => {
    if (!message || message.type !== 'presence') return
    const activity = buildDiscordActivity(message.payload)
    if (!activity) return
    try {
        rpc.setActivity(activity)
    } catch (error) {
        LoggerService.error(`${logName} setActivity failed:\n`, error)
    }
})
