/**
 * build Discord Rich Presence activity from now-playing payload and settings
 * shared (no worker)
 */
export function buildDiscordActivity(payload, options = {}) {
    const { title, channel, isVideo, watchUrl, thumbnailUrl, positionSeconds } = payload || {}
    const {
        watchButtonText = 'Watch',
        listenButtonText = 'Listen',
        customButtonText = '',
        customButtonUrl = '',
        idleStateText = '🌸',
        idleLargeImageText = '🌺',
    } = options

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
    const activity = {
        details: '₊˚✧ ◡◠◡◜🌺◝◡◠◡ ✧˚₊',
        state: title || idleStateText,
        largeImageKey,
        largeImageText: channel || idleLargeImageText,
        startTimestamp: Math.max(0, nowSeconds - Math.floor(safePosition)),
    }

    const buttons = []
    if (safeWatchUrl && safeWatchUrl.includes('music.youtube.com')) {
        buttons.push({
            label: isVideo ? String(watchButtonText) : String(listenButtonText),
            url: safeWatchUrl,
        })
    }
    if (customButtonText && customButtonUrl) {
        buttons.push({ label: String(customButtonText), url: String(customButtonUrl) })
    }
    if (buttons.length > 0) activity.buttons = buttons
    return activity
}
