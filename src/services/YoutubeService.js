function invokePlayer(method, ...args) {
    const playerMethod = window.desktopBridge?.player?.[method]
    if (typeof playerMethod !== 'function') return undefined
    return playerMethod.apply(window.desktopBridge.player, args)
}

export function playPause() {
    return invokePlayer('playPause')
}

export function next() {
    return invokePlayer('next')
}

export function previous() {
    return invokePlayer('previous')
}

export function seekToFraction(fraction) {
    return invokePlayer('seek', fraction)
}

export function setVolume(fraction) {
    return invokePlayer('setVolume', fraction)
}

export function setMuted(isMuted) {
    return invokePlayer('setMuted', isMuted)
}

export function getVolume() {
    const result = invokePlayer('getVolume')
    return result != null ? result : Promise.resolve({ volumeLevel: 1, isMuted: false })
}

export function likeCurrentTrack() {
    return invokePlayer('likeCurrentTrack')
}

export function addCurrentTrackToPlaylist() {
    return invokePlayer('addCurrentTrackToPlaylist')
}

export function toggleLoop() {
    return invokePlayer('toggleLoop')
}
