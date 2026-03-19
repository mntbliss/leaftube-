/**
 * build Discord Rich Presence activity url for deeplinking `leaf://`
 */
function buildLeafDeepLinkFromWatchUrl(watchUrl, positionSeconds) {
    try {
        if (typeof watchUrl !== 'string' || !watchUrl) return ''
        const parsedWatchUrl = new URL(watchUrl)
        const hostnameText = String(parsedWatchUrl.hostname || '').toLowerCase()
        if (hostnameText !== 'music.youtube.com' && hostnameText !== 'www.music.youtube.com') return ''

        const pathnameText = String(parsedWatchUrl.pathname || '').toLowerCase()
        const safeSeconds = Number.isFinite(positionSeconds) ? Math.max(0, Math.floor(positionSeconds)) : 0
        let deepLinkTarget = ''

        if (pathnameText === '/watch') {
            const videoIdentifier = String(parsedWatchUrl.searchParams.get('v') || '').trim()
            if (!/^[a-zA-Z0-9_-]{8,}$/.test(videoIdentifier)) return ''
            const safeQueryParams = new URLSearchParams()
            safeQueryParams.set('v', videoIdentifier)
            const playlistIdentifier = String(parsedWatchUrl.searchParams.get('list') || '').trim()
            if (/^[a-zA-Z0-9_-]{8,}$/.test(playlistIdentifier)) safeQueryParams.set('list', playlistIdentifier)
            const playlistIndex = String(parsedWatchUrl.searchParams.get('index') || '').trim()
            if (/^\d+$/.test(playlistIndex)) safeQueryParams.set('index', playlistIndex)
            deepLinkTarget = `watch?${safeQueryParams.toString()}`
        } else if (pathnameText === '/playlist') {
            const playlistIdentifier = String(parsedWatchUrl.searchParams.get('list') || '').trim()
            if (!/^[a-zA-Z0-9_-]{8,}$/.test(playlistIdentifier)) return ''
            deepLinkTarget = `playlist?list=${encodeURIComponent(playlistIdentifier)}`
        } else if (pathnameText === '/browse') {
            const browseIdentifier = String(parsedWatchUrl.searchParams.get('browseId') || '').trim()
            if (!/^[a-zA-Z0-9_-]{4,}$/.test(browseIdentifier)) return ''
            deepLinkTarget = `browse?browseId=${encodeURIComponent(browseIdentifier)}`
        } else {
            return ''
        }

        // use path style uRL to avoid path rewriting by external apps (e.g. fcking discord)
        return `leaf:///${deepLinkTarget}:${safeSeconds}`
    } catch {
        return ''
    }
}

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

    // Discord RPC: "state" must be at least 2 characters (empty / 1-char titles fail).
    const rawTitle = typeof title === 'string' ? title.trim() : ''
    let stateText = rawTitle.length >= 2 ? rawTitle : String(idleStateText ?? '').trim()
    if (stateText.length < 2) stateText = '♪ ♪'

    const activity = {
        details: '₊˚✧ ◡◠◡◜🌺◝◡◠◡ ✧˚₊',
        state: stateText,
        largeImageKey,
        largeImageText: channel || idleLargeImageText,
        startTimestamp: Math.max(0, nowSeconds - Math.floor(safePosition)),
    }

    const buttons = []
    const leafWatchUrl = buildLeafDeepLinkFromWatchUrl(safeWatchUrl, safePosition)
    if (leafWatchUrl) {
        buttons.push({
            label: isVideo ? String(watchButtonText) : String(listenButtonText),
            url: leafWatchUrl,
        })
    }
    if (customButtonText && customButtonUrl) {
        buttons.push({ label: String(customButtonText), url: String(customButtonUrl) })
    }
    if (buttons.length > 0) activity.buttons = buttons
    return activity
}
