function decodeLeafTarget(rawValue) {
    try {
        return decodeURIComponent(String(rawValue || '').trim())
    } catch {
        return String(rawValue || '').trim()
    }
}

function parseSecondsTail(input) {
    const text = String(input || '').trim()
    const match = text.match(/^(.*?)(?::(\d+))?$/)
    if (!match) return { head: text, seconds: 0 }
    const head = String(match[1] || '').trim()
    const rawSeconds = match[2]
    if (!rawSeconds) return { head, seconds: 0 }
    const parsed = Number.parseInt(rawSeconds, 10)
    return { head, seconds: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }
}

function normalizeYoutubeTarget(targetText) {
    const rawTargetText = String(targetText || '').trim()
    if (!rawTargetText) return null

    // security concern: never accept full external URLs via leaf://
    if (/^[a-zA-Z]+:\/\//.test(rawTargetText)) return null

    // short aliases
    const trackAlias = rawTargetText.match(/^\/?track\/([a-zA-Z0-9_-]{8,})$/i)
    if (trackAlias) return `https://music.youtube.com/watch?v=${trackAlias[1]}`
    const playlistAlias = rawTargetText.match(/^\/?playlist\/([a-zA-Z0-9_-]{8,})$/i)
    if (playlistAlias) return `https://music.youtube.com/playlist?list=${playlistAlias[1]}`

    if (/^[a-zA-Z0-9_-]{8,}$/.test(rawTargetText)) return `https://music.youtube.com/watch?v=${rawTargetText}`

    const normalizedTargetText = rawTargetText.startsWith('/') ? rawTargetText.slice(1) : rawTargetText
    const [routeNameRaw, queryStringRaw = ''] = normalizedTargetText.split('?', 2)
    const routeNameWithPotentialTrailingSlash = String(routeNameRaw || '').trim().toLowerCase()
    const routeName = routeNameWithPotentialTrailingSlash.replace(/\/+$/, '')
    const queryParams = new URLSearchParams(String(queryStringRaw || ''))

    if (routeName === 'watch') {
        const videoIdentifier = String(queryParams.get('v') || '').trim()
        if (!/^[a-zA-Z0-9_-]{8,}$/.test(videoIdentifier)) return null
        const safeQueryParams = new URLSearchParams()
        safeQueryParams.set('v', videoIdentifier)

        const playlistIdentifier = String(queryParams.get('list') || '').trim()
        if (/^[a-zA-Z0-9_-]{8,}$/.test(playlistIdentifier)) safeQueryParams.set('list', playlistIdentifier)

        const playlistIndex = String(queryParams.get('index') || '').trim()
        if (/^\d+$/.test(playlistIndex)) safeQueryParams.set('index', playlistIndex)

        const startSeconds = String(queryParams.get('start') || queryParams.get('t') || '').trim()
        if (/^\d+$/.test(startSeconds)) safeQueryParams.set('start', startSeconds)

        return `https://music.youtube.com/watch?${safeQueryParams.toString()}`
    }

    if (routeName === 'playlist') {
        const playlistIdentifier = String(queryParams.get('list') || '').trim()
        if (!/^[a-zA-Z0-9_-]{8,}$/.test(playlistIdentifier)) return null
        const safeQueryParams = new URLSearchParams()
        safeQueryParams.set('list', playlistIdentifier)
        return `https://music.youtube.com/playlist?${safeQueryParams.toString()}`
    }

    if (routeName === 'browse') {
        const browseIdentifier = String(queryParams.get('browseId') || '').trim()
        if (!/^[a-zA-Z0-9_-]{4,}$/.test(browseIdentifier)) return null
        const safeQueryParams = new URLSearchParams()
        safeQueryParams.set('browseId', browseIdentifier)
        return `https://music.youtube.com/browse?${safeQueryParams.toString()}`
    }

    return null
}

export function parseLeafProtocolUrl(urlText) {
    const rawUrl = String(urlText || '').trim()
    if (!rawUrl.toLowerCase().startsWith('leaf://')) return null

    const body = rawUrl.slice('leaf://'.length)
    if (!body) return null

    const { head, seconds } = parseSecondsTail(body)
    const targetText = decodeLeafTarget(head)
    const targetUrl = normalizeYoutubeTarget(targetText)
    if (!targetUrl) return null

    return { targetUrl, seconds }
}

