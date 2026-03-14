function invokePlayer(method, ...args) {
    const fn = window.desktopBridge?.player?.[method]
    if (typeof fn !== 'function') return undefined
    return fn.apply(window.desktopBridge.player, args)
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
