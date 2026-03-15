import { runScriptInView } from './view-helpers.js'

// just in case yt is still reloading dom cause its kinda heavy
const WAIT_TWO_FRAMES_SCRIPT = 'new Promise(function(resolve){ requestAnimationFrame(function(){ requestAnimationFrame(resolve) }) })'

export function waitTwoFramesInView(view) {
    if (!view) return Promise.resolve()
    return runScriptInView(view, WAIT_TWO_FRAMES_SCRIPT)
}

export function showSmooth(service, isFirstLoad, options = {}) {
    const shouldWaitFrames = options.waitFrames !== false
    const doShow = () => {
        if (isFirstLoad && service.youtubeWindow && !service.youtubeWindow.isDestroyed()) {
            service.youtubeWindow.setOpacity(0)
            service.youtubeWindow.show()
            service.youtubeWindow.focus()
            service.resizeView()
            service.animateWindowOpacity(0, 1, 260, () => service.setContentVisible(true))
        } else {
            service.setContentVisible(true)
            service.setContentAreaOpacity(1)
        }
    }
    if (shouldWaitFrames && service.youtubeView) {
        return waitTwoFramesInView(service.youtubeView).then(doShow).catch(doShow)
    }
    doShow()
    return Promise.resolve()
}

export function hideSmooth(service) {
    if (!service.youtubeWindow) return
    service.setContentVisible(false)
    service.animateWindowOpacity(1, 0, 120, () => {
        try {
            if (service.youtubeWindow) service.youtubeWindow.hide()
            if (service.youtubeWindow && !service.youtubeWindow.isDestroyed()) {
                service.youtubeWindow.setOpacity(1)
            }
        } catch {}
    })
}
