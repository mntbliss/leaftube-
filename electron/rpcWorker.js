import rpcLib from 'discord-rpc'

const clientId = process.env.DISCORD_CLIENT_ID ? String(process.env.DISCORD_CLIENT_ID) : ''
const logName = '[discordRpcWorker]'

if (!clientId) {
    // eslint-disable-next-line no-console
    console.error(`${logName} missing DISCORD_CLIENT_ID, exiting`)
    process.exit(0)
}

// eslint-disable-next-line no-console
console.log(`${logName} starting, clientId: `, clientId)

const rpc = new rpcLib.Client({ transport: 'ipc' })

rpc.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log(`${logName} rpc ready`)
})

rpc.on('error', error => {
    // eslint-disable-next-line no-console
    console.error(`${logName} rpc error:\n`, error)
})

rpc.login({ clientId }).catch(error => {
    // eslint-disable-next-line no-console
    console.error(`${logName} login failed:\n`, error)
})

process.on('message', message => {
    if (!message || message.type !== 'presence') return

    const { title, channel, isVideo, watchUrl, thumbnailUrl, positionSeconds } = message.payload || {}
    const details = '₊˚✧ ◡◠◡◜🌺◝◡◠◡ ✧˚₊'
    const template = 'https://img.youtube.com/vi/<ID_HERE>/maxresdefault.jpg'

    const safeWatchUrl = typeof watchUrl === 'string' ? watchUrl : ''
    const videoIdMatch = safeWatchUrl.match(/[?&]v=([^&]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : null

    // if we dont have real vid id (yet) AND no thumbnail (ads pretty much)
    if (!videoId && !thumbnailUrl) return

    let largeImageKey = 'leaf_listening'
    if (videoId) {
        largeImageKey = template.replace('<ID_HERE>', videoId)
    } else if (typeof thumbnailUrl === 'string' && thumbnailUrl) {
        largeImageKey = thumbnailUrl
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const safePosition = typeof positionSeconds === 'number' && isFinite(positionSeconds) ? positionSeconds : 0

    const activity = {
        details,
        state: title || 'YouTube Music',
        largeImageKey,
        largeImageText: channel || 'YouTube Music',
        startTimestamp: Math.max(0, nowSeconds - Math.floor(safePosition)),
    }

    if (safeWatchUrl && safeWatchUrl.includes('music.youtube.com')) {
        let buttons = [
            {
                label: isVideo ? String(process.env.WATCH_BUTTON_TEXT) : String(process.env.LISTEN_BUTTON_TEXT),
                url: safeWatchUrl,
            },
        ]

        // add only if button actually set
        if (process.env.CUSTOM_BUTTON_TEXT && process.env.CUSTOM_BUTTON_URL && process.env.CUSTOM_BUTTON_URL.startsWith('https://')) {
            buttons.push({
                label: String(process.env.CUSTOM_BUTTON_TEXT),
                url: String(process.env.CUSTOM_BUTTON_URL),
            })
        }

        activity.buttons = buttons
    }

    try {
        rpc.setActivity(activity)
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`${logName} setActivity failed:\n`, error)
    }
})
